// functions/api/ai/auth/challenge.ts
import { jsonResponse, errorResponse, optionsResponse, generateNonce } from '../_shared';
import type { AIEnv } from '../_shared';
import { isValidChiaAddress } from '../../../lib/validation';

const NONCE_EXPIRY_MINUTES = 5;

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { walletAddress?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { walletAddress } = body;
  if (!walletAddress || !isValidChiaAddress(walletAddress)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }

  // Clean up expired sessions for this wallet
  await env.DB
    .prepare(`DELETE FROM ai_auth_sessions WHERE wallet_address = ? AND expires_at < datetime('now')`)
    .bind(walletAddress)
    .run();

  // Also clean up stale nonces (uncompleted challenges)
  await env.DB
    .prepare(
      `DELETE FROM ai_auth_sessions
       WHERE wallet_address = ? AND session_token IS NULL AND nonce_expires_at < datetime('now')`
    )
    .bind(walletAddress)
    .run();

  const nonce = generateNonce();
  const nonceExpiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000).toISOString();
  await env.DB
    .prepare(
      `INSERT INTO ai_auth_sessions (wallet_address, nonce, nonce_expires_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(walletAddress, nonce, nonceExpiresAt, nonceExpiresAt)
    .run();

  return jsonResponse({ nonce, expiresAt: nonceExpiresAt });
};
