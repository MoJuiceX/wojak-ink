import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  getAICreditBalance,
  buildConstrainedPrompt,
  AI_CATEGORIES,
  requireAuth,
} from './_shared';
import type { AIEnv, AICategory, AIMode } from './_shared';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/models/prunaai/p-image-edit/predictions';
const MAX_PROMPT_LENGTH = 500;

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;

  // --- Parse body ---
  let body: {
    imageBase64?: string;
    category?: string;
    prompt?: string;
    mode?: string;
    parentEnhancementId?: number;
    baseLayersJson?: string;
    traitLabel?: string;
    parentTraitOverrides?: Record<string, string>;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { imageBase64, category, prompt, mode, parentEnhancementId, baseLayersJson, traitLabel, parentTraitOverrides } = body;

  // --- Validate ---
  const walletAddress = auth.walletAddress;
  if (!imageBase64 || imageBase64.length < 100) {
    return errorResponse('Missing or invalid imageBase64', 400);
  }
  if (!category || !AI_CATEGORIES[category as AICategory]) {
    return errorResponse('Invalid category. Must be: clothes, head, facewear, background', 400);
  }
  if (!prompt || prompt.trim().length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(`Prompt is required (max ${MAX_PROMPT_LENGTH} characters)`, 400);
  }
  if (!env.REPLICATE_API_TOKEN) {
    return errorResponse('AI enhancement is not configured', 503);
  }
  if (!env.AI_EDITS_BUCKET) {
    return errorResponse('Image storage is not configured', 503);
  }

  const cat = category as AICategory;
  const trimmedPrompt = prompt.trim();

  // --- Check balance ---
  const balance = await getAICreditBalance(env.DB, walletAddress);
  if (balance < 1) {
    return errorResponse('Not enough AI credits. Buy more to continue.', 402);
  }

  // --- Build constrained prompt ---
  const validMode: AIMode = (mode === 'enhance' || mode === 'create_new') ? mode : 'enhance';
  const constrainedPrompt = buildConstrainedPrompt(cat, trimmedPrompt, validMode);

  // --- Call Replicate API (Pruna AI p-image-edit) ---
  // Uses `Prefer: wait` for synchronous response (model runs in <1s).
  let replicateResponse: Response;
  try {
    replicateResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=25',
      },
      body: JSON.stringify({
        input: {
          prompt: constrainedPrompt,
          images: [`data:image/png;base64,${imageBase64}`],
          aspect_ratio: '1:1',
        },
      }),
    });
  } catch (err) {
    console.error('Replicate API network error:', err);
    return errorResponse('AI service is unavailable. Try again.', 502);
  }

  if (replicateResponse.status === 429) {
    return errorResponse('Too many requests. Wait a moment and try again.', 429);
  }

  if (!replicateResponse.ok) {
    const errText = await replicateResponse.text().catch(() => 'Unknown error');
    console.error(`Replicate API error ${replicateResponse.status}:`, errText);
    return errorResponse('AI enhancement failed. Try again.', 502);
  }

  let replicateData: {
    id?: string;
    status?: string;
    output?: string;
    error?: string;
    model?: string;
    version?: string;
  };
  try {
    replicateData = await replicateResponse.json();
  } catch {
    return errorResponse('Invalid response from AI service.', 502);
  }

  // Check for failed prediction
  if (replicateData.status === 'failed' || replicateData.error) {
    console.error('Replicate prediction failed:', replicateData.error);
    return errorResponse('AI enhancement failed. Try a different option.', 502);
  }

  if (!replicateData.output) {
    return errorResponse('AI service returned no image. Try again.', 502);
  }

  // --- Download the output image from Replicate's URL ---
  // Replicate returns a temporary URL to the generated image (JPEG).
  console.log(`Replicate output URL: ${replicateData.output}, status: ${replicateData.status}, id: ${replicateData.id}`);
  let imageBase64Result: string;
  let imageBuffer: Uint8Array;
  try {
    const imageResponse = await fetch(replicateData.output);
    if (!imageResponse.ok) {
      console.error('Failed to download Replicate output image:', imageResponse.status);
      return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
    }
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    imageBuffer = new Uint8Array(imageArrayBuffer);
    // Convert to base64 — chunked to avoid stack overflow on large images
    // (spread operator `...bytes` crashes with >100K elements)
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < imageBuffer.length; i += CHUNK) {
      binary += String.fromCharCode(...imageBuffer.subarray(i, i + CHUNK));
    }
    imageBase64Result = btoa(binary);
    console.log(`Downloaded image: ${imageBuffer.length} bytes, base64: ${imageBase64Result.length} chars`);
  } catch (err) {
    console.error('Image download error:', err);
    return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
  }

  // Log prediction ID for debugging
  console.log(`Replicate prediction: ${replicateData.id}, model: ${replicateData.model}, status: ${replicateData.status}`);

  // --- Save to R2 ---
  const enhancementId = Date.now();
  // Replicate returns JPEG; detect format from the output URL
  const isJpeg = replicateData.output.includes('.jpeg') || replicateData.output.includes('.jpg');
  const ext = isJpeg ? 'jpg' : 'png';
  const contentType = isJpeg ? 'image/jpeg' : 'image/png';
  const r2Key = `ai-edits/${walletAddress}/${enhancementId}.${ext}`;

  try {
    // imageBuffer already has the raw bytes from the Replicate download
    await env.AI_EDITS_BUCKET.put(r2Key, imageBuffer, {
      httpMetadata: { contentType },
    });
  } catch (err) {
    console.error('R2 upload error:', err);
    return errorResponse('Failed to save your edit. Try again.', 500);
  }

  // --- Build cumulative trait overrides ---
  const prevOverrides: Record<string, string> =
    (parentTraitOverrides && typeof parentTraitOverrides === 'object') ? parentTraitOverrides : {};
  const mergedOverrides: Record<string, string> = { ...prevOverrides };
  if (traitLabel && typeof traitLabel === 'string' && traitLabel.trim()) {
    mergedOverrides[cat] = traitLabel.trim();
  }
  const overridesJson = Object.keys(mergedOverrides).length > 0
    ? JSON.stringify(mergedOverrides)
    : null;

  // --- Record in D1 (enhancement + credit usage) ---
  try {
    const insertResult = await env.DB
      .prepare(
        `INSERT INTO ai_enhancements
          (wallet_address, r2_key, category, prompt, constrained_prompt, reve_request_id, reve_version, parent_enhancement_id, base_layers_json, ai_trait_overrides)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        walletAddress,
        r2Key,
        cat,
        trimmedPrompt,
        constrainedPrompt,
        replicateData.id ?? null,       // reuse reve_request_id column for Replicate prediction ID
        replicateData.model ?? null,     // reuse reve_version column for model name
        parentEnhancementId ?? null,
        baseLayersJson ?? null,
        overridesJson,
      )
      .run();

    const dbEnhancementId = insertResult.meta?.last_row_id;

    await env.DB
      .prepare('INSERT INTO ai_credit_usage (wallet_address, enhancement_id, credits_spent) VALUES (?, ?, 1)')
      .bind(walletAddress, dbEnhancementId)
      .run();
  } catch (err) {
    console.error('D1 insert error:', err);
    return errorResponse('Edit succeeded but failed to record. Contact support.', 500);
  }

  // --- Return result ---
  const newBalance = await getAICreditBalance(env.DB, walletAddress);

  return jsonResponse({
    imageBase64: imageBase64Result,
    r2Key,
    enhancementId: r2Key,
    category: cat,
    prompt: trimmedPrompt,
    creditsRemaining: newBalance,
    reveRequestId: replicateData.id,   // kept for frontend compatibility
    aiTraitOverrides: mergedOverrides,
  });
};
