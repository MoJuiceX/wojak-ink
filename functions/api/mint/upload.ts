/**
 * IPFS Upload API — /api/mint/upload
 *
 * POST body: { imageBase64: string, metadata: object }
 *
 * HTTP wrapper around uploadToIPFS() — kept for manual testing/triggering.
 * The prepare.ts endpoint now calls uploadToIPFS() directly (no self-fetch).
 *
 * Requires: PINATA_JWT secret
 * Protected: Requires X-Internal-Mint-Request header
 */

import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  INTERNAL_API_HEADER,
} from './_shared';
import { uploadToIPFS } from './uploadToIPFS';

interface Env {
  PINATA_JWT?: string;
  INTERNAL_MINT_SECRET?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Guard: only allow internal calls
  const internalSecret = env.INTERNAL_MINT_SECRET;
  if (!internalSecret || request.headers.get(INTERNAL_API_HEADER) !== internalSecret) {
    return errorResponse('Unauthorized', 401);
  }

  const jwt = env.PINATA_JWT;
  if (!jwt) {
    return errorResponse('IPFS upload not configured', 503);
  }

  let body: { imageBase64?: string; metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const imageBase64 = body.imageBase64;
  const metadata = body.metadata;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return errorResponse('Missing imageBase64', 400);
  }
  if (!metadata || typeof metadata !== 'object') {
    return errorResponse('Missing metadata object', 400);
  }

  try {
    const result = await uploadToIPFS(imageBase64, metadata as Record<string, unknown>, jwt);
    return jsonResponse(result);
  } catch (error) {
    console.error('[Mint Upload] Error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      502
    );
  }
};
