import { jsonResponse, errorResponse, optionsResponse, requireAuth } from './_shared';
import type { AIEnv } from './_shared';

function dataUrlToImageBytes(dataUrl: string): { contentType: string; bytes: Uint8Array; ext: 'png' | 'jpg' | 'webp' } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;

  const [, contentType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const lowered = contentType.toLowerCase();
  const ext: 'png' | 'jpg' | 'webp' =
    lowered.includes('webp') ? 'webp' :
    lowered.includes('jpeg') || lowered.includes('jpg') ? 'jpg' :
    'png';

  return { contentType, bytes, ext };
}

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  if (!env.AI_EDITS_BUCKET) {
    return errorResponse('Image storage is not configured', 503);
  }

  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const walletAddress = auth.walletAddress;

  let body: { sourceR2Key?: string; imageDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const sourceR2Key = body.sourceR2Key;
  const imageDataUrl = body.imageDataUrl;
  if (!sourceR2Key || typeof sourceR2Key !== 'string') {
    return errorResponse('Missing sourceR2Key', 400);
  }
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return errorResponse('Missing imageDataUrl', 400);
  }

  const parsed = dataUrlToImageBytes(imageDataUrl);
  if (!parsed) {
    return errorResponse('Invalid image data', 400);
  }

  const enhancement = await env.DB
    .prepare(
      `SELECT id, r2_key
       FROM ai_enhancements
       WHERE wallet_address = ? AND r2_key = ?
       LIMIT 1`
    )
    .bind(walletAddress, sourceR2Key)
    .first<{ id: number; r2_key: string }>();

  if (!enhancement) {
    return errorResponse('Enhancement not found', 404);
  }

  const acceptedR2Key = `ai-creations/${walletAddress}/${enhancement.id}.${parsed.ext}`;

  try {
    await env.AI_EDITS_BUCKET.put(acceptedR2Key, parsed.bytes, {
      httpMetadata: { contentType: parsed.contentType },
    });
    await env.DB
      .prepare('UPDATE ai_enhancements SET r2_key = ? WHERE id = ?')
      .bind(acceptedR2Key, enhancement.id)
      .run();

    if (enhancement.r2_key !== acceptedR2Key) {
      await env.AI_EDITS_BUCKET.delete(enhancement.r2_key).catch(() => {});
    }
  } catch (err) {
    console.error('AI accept save error:', err);
    return errorResponse('Failed to save accepted creation', 500);
  }

  return jsonResponse({
    success: true,
    r2Key: acceptedR2Key,
  });
};
