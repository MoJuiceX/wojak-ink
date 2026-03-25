import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  getAICreditBalance,
  buildConstrainedPrompt,
  hashPrompt,
  AI_CATEGORIES,
  requireAuth,
} from './_shared';
import type { AIEnv, AICategory, AIMode } from './_shared';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/models/prunaai/p-image-edit/predictions';
const MAX_PROMPT_LENGTH = 500;

/** Allowed categories for AI enhancement (facewear excluded — too risky for edits) */
const ALLOWED_CATEGORIES = new Set<AICategory>(['clothes', 'head', 'background']);

/**
 * Minimal 64x64 solid dark grey PNG as a placeholder for background generation.
 * p-image-edit requires at least one input image — this gives it a blank canvas
 * to "edit" into a full scene based on the prompt.
 */
const PLACEHOLDER_IMAGE_DATA_URI = (() => {
  // Generate a tiny 4x4 PNG programmatically (smallest valid PNG)
  // Using a pre-encoded base64 of a 4x4 dark grey PNG
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAADklEQVQI12NggIJhygAABDABATLhMa8AAAAASUVORK5CYII=';
})();

/** Convert Uint8Array to base64 string in chunks (avoids stack overflow) */
function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < buffer.length; i += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

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
  const cat = category as AICategory;

  // Background category doesn't require an image (we generate scene-only)
  if (cat !== 'background' && (!imageBase64 || imageBase64.length < 100)) {
    return errorResponse('Missing or invalid imageBase64', 400);
  }
  if (!category || !AI_CATEGORIES[category as AICategory]) {
    return errorResponse('Invalid category. Must be: clothes, head, background', 400);
  }
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

  // Validate parentTraitOverrides
  if (parentTraitOverrides && typeof parentTraitOverrides === 'object') {
    for (const [k, v] of Object.entries(parentTraitOverrides)) {
      if (typeof k !== 'string' || typeof v !== 'string') {
        return errorResponse('Invalid trait overrides format', 400);
      }
    }
  }

  const trimmedPrompt = prompt.trim();

  // --- Credit check ---
  const balance = await getAICreditBalance(env.DB, walletAddress);
  if (balance < 1) {
    return errorResponse('Not enough AI credits. Buy more to continue.', 402);
  }

  // --- Build constrained prompt ---
  const validMode: AIMode = (mode === 'enhance' || mode === 'create_new') ? mode : 'enhance';
  const constrainedPrompt = buildConstrainedPrompt(cat, trimmedPrompt, validMode);

  let imageBase64Result: string;
  let imageBuffer: Uint8Array;
  let contentType: string;
  let replicateId: string | null = null;
  let replicateModel: string | null = null;
  let fromCache = false;

  // === BACKGROUND: Scene-only generation with R2 caching ===
  if (cat === 'background') {
    const promptHash = await hashPrompt(constrainedPrompt);
    const cacheKey = `ai-backgrounds/${promptHash}.jpg`;

    // Check R2 cache first
    try {
      const cached = await env.AI_EDITS_BUCKET.get(cacheKey);
      if (cached) {
        const cachedBuffer = new Uint8Array(await cached.arrayBuffer());
        imageBase64Result = bufferToBase64(cachedBuffer);
        imageBuffer = cachedBuffer;
        contentType = cached.httpMetadata?.contentType ?? 'image/jpeg';
        fromCache = true;
        console.log(`Background cache HIT: ${cacheKey}`);
      }
    } catch {
      // Cache miss or error — proceed to generate
    }

    if (!fromCache) {
      // Generate scene-only background via Pruna (no character image sent)
      console.log(`Background cache MISS: ${cacheKey} — generating via Pruna`);
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
              images: [PLACEHOLDER_IMAGE_DATA_URI],
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

      let replicateData: { id?: string; status?: string; output?: string; error?: string; model?: string };
      try {
        replicateData = await replicateResponse.json();
      } catch {
        return errorResponse('Invalid response from AI service.', 502);
      }

      if (replicateData.status === 'failed' || replicateData.error) {
        console.error('Replicate prediction failed:', { id: replicateData.id, error: replicateData.error });
        return errorResponse('AI enhancement failed. Try a different option.', 502);
      }
      if (!replicateData.output) {
        return errorResponse('AI service returned no image. Try again.', 502);
      }

      replicateId = replicateData.id ?? null;
      replicateModel = replicateData.model ?? null;

      // Download output image
      try {
        const imageResponse = await fetch(replicateData.output);
        if (!imageResponse.ok) {
          return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
        }
        const downloadCT = imageResponse.headers.get('content-type') ?? '';
        const arrayBuf = await imageResponse.arrayBuffer();
        imageBuffer = new Uint8Array(arrayBuf);
        imageBase64Result = bufferToBase64(imageBuffer);
        const isJpeg = downloadCT.includes('jpeg') || downloadCT.includes('jpg');
        contentType = isJpeg ? 'image/jpeg' : 'image/png';
      } catch (err) {
        console.error('Image download error:', err);
        return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
      }

      // Save to background cache for future reuse
      try {
        await env.AI_EDITS_BUCKET.put(cacheKey, imageBuffer, {
          httpMetadata: { contentType },
        });
        console.log(`Background cached: ${cacheKey}`);
      } catch (err) {
        console.error('Background cache write error:', err);
        // Non-fatal — the image was generated, just not cached
      }
    }

  // === CLOTHES / HEAD: Standard image editing ===
  } else {
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

    let replicateData: { id?: string; status?: string; output?: string; error?: string; model?: string };
    try {
      replicateData = await replicateResponse.json();
    } catch {
      return errorResponse('Invalid response from AI service.', 502);
    }

    if (replicateData.status === 'failed' || replicateData.error) {
      console.error('Replicate prediction failed:', { id: replicateData.id, error: replicateData.error });
      return errorResponse('AI enhancement failed. Try a different option.', 502);
    }
    if (!replicateData.output) {
      return errorResponse('AI service returned no image. Try again.', 502);
    }

    replicateId = replicateData.id ?? null;
    replicateModel = replicateData.model ?? null;

    // Download output image
    try {
      const imageResponse = await fetch(replicateData.output);
      if (!imageResponse.ok) {
        return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
      }
      const downloadCT = imageResponse.headers.get('content-type') ?? '';
      const arrayBuf = await imageResponse.arrayBuffer();
      imageBuffer = new Uint8Array(arrayBuf);
      imageBase64Result = bufferToBase64(imageBuffer);
      const isJpeg = downloadCT.includes('jpeg') || downloadCT.includes('jpg');
      contentType = isJpeg ? 'image/jpeg' : 'image/png';
    } catch (err) {
      console.error('Image download error:', err);
      return errorResponse('Failed to retrieve enhanced image. Try again.', 502);
    }
  }

  // --- Save user's enhancement to R2 ---
  const enhancementId = Date.now();
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
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

  // --- Record in D1 (always charge 1 credit, cached or not) ---
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
        replicateId,
        fromCache ? 'cached' : (replicateModel ?? null),
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
    reveRequestId: replicateId,
    aiTraitOverrides: mergedOverrides,
    isBgOnly: cat === 'background',
  });
};
