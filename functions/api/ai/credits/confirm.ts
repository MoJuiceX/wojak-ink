// functions/api/ai/credits/confirm.ts
//
// Lightweight single-check endpoint. The CLIENT handles polling because
// Cloudflare Workers have a ~30s wall-clock timeout which kills long
// server-side polling loops. Each call checks Spacescan once and returns.
import { jsonResponse, errorResponse, optionsResponse, requireAuth, getAddressBalance, expireAndReleasePurchase } from '../_shared';
import type { AIEnv } from '../_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const walletAddress = auth.walletAddress;

  let body: { purchaseId?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { purchaseId } = body;

  if (!purchaseId) {
    return errorResponse('Missing purchaseId', 400);
  }

  const row = await env.DB
    .prepare(
      `SELECT id, wallet_address, credits_purchased, xch_paid_mojos, status, created_at, expires_at, payment_address
       FROM ai_credit_purchases WHERE id = ? AND wallet_address = ?`
    )
    .bind(purchaseId, walletAddress)
    .first<{
      id: number;
      wallet_address: string;
      credits_purchased: number;
      xch_paid_mojos: number;
      status: string;
      created_at: string;
      expires_at: string;
      payment_address: string | null;
    }>();

  if (!row) {
    return errorResponse('Purchase not found', 404);
  }
  if (row.status === 'confirmed') {
    return jsonResponse({ alreadyConfirmed: true, creditsAdded: row.credits_purchased });
  }
  if (row.status !== 'pending') {
    return errorResponse(`Purchase is ${row.status}`, 400);
  }

  if (new Date(row.expires_at) < new Date()) {
    await expireAndReleasePurchase(env.DB, row.id, row.payment_address);
    return errorResponse('Purchase expired. Please start a new purchase.', 410);
  }

  if (!row.payment_address) {
    return jsonResponse({
      confirmed: false,
      message: 'No payment address assigned. Please start a new purchase.',
      purchaseId: row.id,
    }, 202);
  }

  // Single check — no polling loop. Client handles retry timing.
  const addrBalance = await getAddressBalance(row.payment_address, env.SPACESCAN_API_KEY);

  if (addrBalance === null || addrBalance < row.xch_paid_mojos) {
    return jsonResponse({
      confirmed: false,
      message: 'Payment not yet detected on-chain.',
      purchaseId: row.id,
    }, 202);
  }

  // Payment detected — confirm the purchase
  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'confirmed', confirmed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(purchaseId)
    .run();

  return jsonResponse({
    confirmed: true,
    creditsAdded: row.credits_purchased,
  });
};
