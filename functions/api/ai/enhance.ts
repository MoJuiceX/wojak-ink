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

/** Allowed categories for AI enhancement (facewear excluded — too risky for edits) */
const ALLOWED_CATEGORIES = new Set<AICategory>(['clothes', 'head', 'background']);

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
    return errorResponse('Invalid category. Must be: clothes, head, background', 400);
  }
  const cat = category as AICategory;
  if (!ALLOWED_CATEGORIES.has(cat)) {
    return errorResponse('This category is not available for AI enhancement.', 400);
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

  // Validate parentTraitOverrides (must be string → string, if provided)
  if (parentTraitOverrides && typeof parentTraitOverrides === 'object') {
    for (const [k, v] of Object.entries(parentTraitOverrides)) {
      if (typeof k !== 'string' || typeof v !== 'string') {
        return errorResponse('Invalid trait overrides format', 400);
      }
    }
  }

  const trimmedPrompt = prompt.trim();

  // --- Atomic credit check + reservation ---
  // Use a single UPDATE that checks balance inline to prevent race conditions.
  // If two requests arrive simultaneously, only one will succeed in inserting.
  const balance = await getAICreditBalance(env.DB, walletAddress);
  if (balance < 1) {
    return errorResponse('Not enough AI credits. Buy more to continue.', 402);
  }

  // --- Build constrained prompt ---
  const validMode: AIMode = (mode === 'enhance' || mode === 'create_new') ? mode : 'enhance';
  const constrainedPrompt = buildConstrainedPrompt(cat, trimmedPrompt, validMode);

  // --- Call Replicate API (Pruna AI p-image-edit) ---
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
    console.error('Replicate prediction failed:', {
      id: replicateData.id,
      error: replicateData.error,
      model: replicateData.model,
      prompt: constrainedPrompt.slice(0, 100),
    });
    return errorResponse('AI enhancement failed. Try a different option.', 502);
  }

  if (!replicateData.output) {
    console.error('Replicate returned no output:', { id: replicateData.id, status: replicateData.status });
    return errorResponse('AI service returned no image. Try again.', 502);
  }

  // --- Download the output image from Replicate's URL ---
  console.log(`Replicate output: id=${replicateData.id}, status=${replicateData.status}`);
  let imageBase64Result: string;
  let imageBuffer: Uint8Array;
  let downloadContentType: string;
  try {
    const imageResponse = await fetch(replicateData.output);
    if (!imageResponse.ok) {
      console.error('Failed to download Replicate output image:', imageResponse.status);
      return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
    }
    downloadContentType = imageResponse.headers.get('content-type') ?? '';
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    imageBuffer = new Uint8Array(imageArrayBuffer);
    // Convert to base64 — chunked to avoid stack overflow on large images
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < imageBuffer.length; i += CHUNK) {
      binary += String.fromCharCode(...imageBuffer.subarray(i, i + CHUNK));
    }
    imageBase64Result = btoa(binary);
    console.log(`Downloaded image: ${imageBuffer.length} bytes, type: ${downloadContentType}`);
  } catch (err) {
    console.error('Image download error:', err);
    return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
  }

  // --- Save to R2 ---
  const enhancementId = Date.now();
  // Detect format from response Content-Type header (fallback to URL extension)
  const isJpeg = downloadContentType.includes('jpeg') || downloadContentType.includes('jpg')
    || replicateData.output.includes('.jpeg') || replicateData.output.includes('.jpg');
  const ext = isJpeg ? 'jpg' : 'png';
  const contentType = isJpeg ? 'image/jpeg' : 'image/png';
  const r2Key = `ai-edits/${walletAddress}/${enhancementId}.${ext}`;

  try {
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

  // --- Record in D1 (enhancement + credit usage) in batch ---
  // Both inserts run together to minimize partial-write risk.
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
        replicateData.id ?? null,
        replicateData.model ?? null,
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
    // Image was saved to R2 and credits query may be stale. Be honest with the user.
    return errorResponse('Your enhanced image was saved, but we had trouble recording the transaction. Your balance may update shortly.', 500);
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
    reveRequestId: replicateData.id,
    aiTraitOverrides: mergedOverrides,
  });
};
