/**
 * Serve AI-enhanced images from R2.
 * Route: /api/ai/image/<r2Key>
 * Example: /api/ai/image/ai-edits/xch1abc.../1234567890.png
 *
 * Security: Requires auth. Users can only access their own images
 * (wallet address in the R2 key must match the authenticated session).
 */

import { optionsResponse, errorResponse, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  if (!env.AI_EDITS_BUCKET) {
    return errorResponse('Image storage is not configured', 503);
  }

  // Authenticate — users can only access their own images
  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;

  // Reconstruct the R2 key from path segments
  const pathSegments = params.path;
  if (!pathSegments || (Array.isArray(pathSegments) && pathSegments.length === 0)) {
    return errorResponse('Missing image path', 400);
  }

  const r2Key = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

  // Must start with 'ai-edits/'
  if (!r2Key.startsWith('ai-edits/')) {
    return errorResponse('Invalid image path', 400);
  }

  // Ownership check: R2 key format is ai-edits/{walletAddress}/{id}.{ext}
  // The wallet address in the path must match the authenticated user
  const keyParts = r2Key.split('/');
  if (keyParts.length < 3) {
    return errorResponse('Invalid image path', 400);
  }
  const keyWallet = keyParts[1]; // ai-edits/{walletAddress}/...
  if (keyWallet !== auth.walletAddress) {
    return errorResponse('Access denied', 403);
  }

  try {
    const object = await env.AI_EDITS_BUCKET.get(r2Key);

    if (!object) {
      return errorResponse('Image not found', 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'private, max-age=86400');
    headers.set('Access-Control-Allow-Origin', 'https://wojak.ink');

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('R2 image fetch error:', err);
    return errorResponse('Failed to fetch image', 500);
  }
};
