/**
 * Serve AI-enhanced images from R2.
 * Route: /api/ai/image/<r2Key>
 * Example: /api/ai/image/ai-edits/xch1abc.../1234567890.png
 */

import { optionsResponse, errorResponse } from '../_shared';
import type { AIEnv } from '../_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  if (!env.AI_EDITS_BUCKET) {
    return errorResponse('Image storage is not configured', 503);
  }

  // Reconstruct the R2 key from path segments
  const pathSegments = params.path;
  if (!pathSegments || (Array.isArray(pathSegments) && pathSegments.length === 0)) {
    return errorResponse('Missing image path', 400);
  }

  const r2Key = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

  // Basic validation — must start with 'ai-edits/'
  if (!r2Key.startsWith('ai-edits/')) {
    return errorResponse('Invalid image path', 400);
  }

  try {
    const object = await env.AI_EDITS_BUCKET.get(r2Key);

    if (!object) {
      return errorResponse('Image not found', 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('R2 image fetch error:', err);
    return errorResponse('Failed to fetch image', 500);
  }
};
