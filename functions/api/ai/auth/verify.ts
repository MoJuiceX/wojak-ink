// functions/api/ai/auth/verify.ts
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  verifyChiaSignature,
  generateSessionToken,
} from '../_shared';
import type { AIEnv } from '../_shared';
import { isValidChiaAddress } from '../../../lib/validation';

const SESSION_TTL_HOURS = 24;

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { walletAddress?: string; nonce?: string; signature?: string; publicKey?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { walletAddress, nonce, signature, publicKey } = body;

  if (!walletAddress || !isValidChiaAddress(walletAddress)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }
  if (!nonce || nonce.length < 32) {
    return errorResponse('Missing or invalid nonce', 400);
  }
  if (!signature || signature.length < 96) {
    return errorResponse('Missing or invalid signature', 400);
  }
  if (!publicKey || publicKey.length < 48) {
    return errorResponse('Missing or invalid publicKey', 400);
  }

  // Look up the pending challenge (include expiry check in SQL for consistency)
  const row = await env.DB
    .prepare(
      `SELECT id, nonce FROM ai_auth_sessions
       WHERE wallet_address = ? AND nonce = ? AND session_token IS NULL
       AND nonce_expires_at > datetime('now')`
    )
    .bind(walletAddress, nonce)
    .first<{ id: number; nonce: string }>();

  if (!row) {
    return errorResponse('Invalid or expired nonce. Request a new challenge.', 400);
  }

  // Verify BLS signature (CHIP-0002)
  const isValid = await verifyChiaSignature(nonce, signature, publicKey);
  if (!isValid) {
    return errorResponse('Signature verification failed.', 403);
  }

  // Create session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await env.DB
    .prepare(
      `UPDATE ai_auth_sessions
       SET session_token = ?, public_key = ?, nonce = NULL, nonce_expires_at = NULL, expires_at = ?
       WHERE id = ?`
    )
    .bind(sessionToken, publicKey, expiresAt, row.id)
    .run();

  return jsonResponse({ sessionToken, expiresAt });
};
