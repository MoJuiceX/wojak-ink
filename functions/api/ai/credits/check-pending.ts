// functions/api/ai/credits/check-pending.ts
//
// Called when the credits shop opens. Finds any pending purchase for the
// authenticated wallet, checks if payment arrived on its dedicated address,
// and auto-confirms if paid. Returns the result so the client can update
// the balance without the user having to do anything.

import { jsonResponse, errorResponse, optionsResponse, requireAuth, getAddressBalance, expireAndReleasePurchase } from '../_shared';
import type { AIEnv } from '../_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const walletAddress = auth.walletAddress;

  // Find the most recent pending purchase for this wallet
  const row = await env.DB
    .prepare(
      `SELECT id, credits_purchased, xch_paid_mojos, payment_address, expires_at
       FROM ai_credit_purchases
       WHERE wallet_address = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(walletAddress)
    .first<{
      id: number;
      credits_purchased: number;
      xch_paid_mojos: number;
      payment_address: string | null;
      expires_at: string;
    }>();

  if (!row) {
    return jsonResponse({ hasPending: false });
  }

  // Expire if past deadline
  if (new Date(row.expires_at) < new Date()) {
    await expireAndReleasePurchase(env.DB, row.id, row.payment_address);
    return jsonResponse({ hasPending: false });
  }

  // No payment address — can't verify
  if (!row.payment_address) {
    return jsonResponse({ hasPending: true, purchaseId: row.id, confirmed: false });
  }

  // Check on-chain balance
  const addrBalance = await getAddressBalance(row.payment_address, env.SPACESCAN_API_KEY);

  if (addrBalance === null || addrBalance < row.xch_paid_mojos) {
    return jsonResponse({ hasPending: true, purchaseId: row.id, confirmed: false });
  }

  // Payment detected — confirm
  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'confirmed', confirmed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(row.id)
    .run();

  return jsonResponse({
    hasPending: true,
    purchaseId: row.id,
    confirmed: true,
    creditsAdded: row.credits_purchased,
  });
};
