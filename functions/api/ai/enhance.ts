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

const REVE_EDIT_URL = 'https://api.reve.com/v1/image/edit';
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
  if (!env.REVE_API_KEY) {
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

  // --- Call Reve Edit API ---
  // Abort before CF's function timeout (30s) so we can return a proper JSON error
  // instead of CF killing the function and returning an HTML 502 page.
  let reveResponse: Response;
  try {
    reveResponse = await fetch(REVE_EDIT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.REVE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        edit_instruction: constrainedPrompt,
        reference_image: imageBase64,
        aspect_ratio: '1:1',
        version: 'latest',
        test_time_scaling: 2,
      }),
      signal: AbortSignal.timeout(25_000), // 25s — leave 5s headroom for DB writes
    });
  } catch (err) {
    console.error('Reve API error:', err);
    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    if (isTimeout) {
      return errorResponse('AI enhancement is taking longer than usual. Please try again — it often works on retry.', 504);
    }
    return errorResponse('AI service is unavailable. Try again.', 502);
  }

  if (reveResponse.status === 429) {
    return errorResponse('Too many requests. Wait a moment and try again.', 429);
  }

  if (!reveResponse.ok) {
    const errText = await reveResponse.text().catch(() => 'Unknown error');
    console.error(`Reve API error ${reveResponse.status}:`, errText);
    return errorResponse('AI enhancement failed. Try again.', 502);
  }

  let reveData: {
    image?: string;
    content_violation?: boolean;
    request_id?: string;
    version?: string;
    credits_used?: number;
    credits_remaining?: number;
  };
  try {
    reveData = await reveResponse.json();
  } catch {
    return errorResponse('Invalid response from AI service.', 502);
  }

  // --- Content violation check ---
  if (reveData.content_violation) {
    return errorResponse('This edit was blocked by content policy. Try a different prompt.', 422);
  }

  if (!reveData.image) {
    return errorResponse('AI service returned no image. Try again.', 502);
  }

  // Log actual Reve credit usage for cost tracking
  if (reveData.credits_used) {
    console.log(`Reve credits used: ${reveData.credits_used}, remaining: ${reveData.credits_remaining}, version: ${reveData.version}`);
  }

  // --- Save to R2 ---
  const enhancementId = Date.now(); // Temporary; will be replaced by DB insert ID
  const r2Key = `ai-edits/${walletAddress}/${enhancementId}.png`;

  try {
    const imageBuffer = Uint8Array.from(atob(reveData.image), (c) => c.charCodeAt(0));
    await env.AI_EDITS_BUCKET.put(r2Key, imageBuffer, {
      httpMetadata: { contentType: 'image/png' },
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
        reveData.request_id ?? null,
        reveData.version ?? null,
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
    // Image is saved to R2 but credit not deducted — acceptable state
    // User got the image, we just failed to track it
    return errorResponse('Edit succeeded but failed to record. Contact support.', 500);
  }

  // --- Return result ---
  const newBalance = await getAICreditBalance(env.DB, walletAddress);

  return jsonResponse({
    imageBase64: reveData.image,
    r2Key,
    enhancementId: r2Key,
    category: cat,
    prompt: trimmedPrompt,
    creditsRemaining: newBalance,
    reveRequestId: reveData.request_id,
    aiTraitOverrides: mergedOverrides,
  });
};
