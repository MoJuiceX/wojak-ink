// functions/api/ai/credits/confirm.ts
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance } from '../_shared';
import type { AIEnv } from '../_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { purchaseId?: number; walletAddress?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { purchaseId, walletAddress } = body;

  if (!purchaseId || !walletAddress) {
    return errorResponse('Missing purchaseId or walletAddress', 400);
  }

  const row = await env.DB
    .prepare(
      `SELECT id, wallet_address, credits_purchased, status
       FROM ai_credit_purchases WHERE id = ? AND wallet_address = ?`
    )
    .bind(purchaseId, walletAddress)
    .first();

  if (!row) {
    return errorResponse('Purchase not found', 404);
  }
  if (row.status === 'confirmed') {
    const balance = await getAICreditBalance(env.DB, walletAddress);
    return jsonResponse({ alreadyConfirmed: true, balance });
  }
  if (row.status !== 'pending') {
    return errorResponse(`Purchase is ${row.status}`, 400);
  }

  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'confirmed', confirmed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(purchaseId)
    .run();

  const balance = await getAICreditBalance(env.DB, walletAddress);

  return jsonResponse({
    confirmed: true,
    creditsAdded: row.credits_purchased,
    balance,
  });
};
