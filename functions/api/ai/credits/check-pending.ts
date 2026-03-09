// functions/api/ai/credits/check-pending.ts
//
// Called when the credits shop opens. Finds any pending purchase for the
// authenticated wallet, checks if payment arrived on its dedicated address,
// and auto-confirms if paid. Returns the result so the client can update
// the balance without the user having to do anything.

import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

async function getAddressBalance(address: string, apiKey?: string): Promise<number | null> {
  try {
    const url = `https://api.spacescan.io/address/xch-balance/${address}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'wojak.ink/1.0',
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return null;

    const data = await res.json() as { status?: string; mojo?: number };
    if (data.status !== 'success' || typeof data.mojo !== 'number') return null;
    return data.mojo;
  } catch {
    return null;
  }
}

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
    await env.DB
      .prepare(`UPDATE ai_credit_purchases SET status = 'expired' WHERE id = ?`)
      .bind(row.id)
      .run();
    if (row.payment_address) {
      await env.DB
        .prepare(`UPDATE ai_payment_addresses SET purchase_id = NULL WHERE address = ?`)
        .bind(row.payment_address)
        .run();
    }
    return jsonResponse({ hasPending: false });
  }

  // No payment address — can't verify
  if (!row.payment_address) {
    return jsonResponse({ hasPending: true, purchaseId: row.id, confirmed: false });
  }

  // Check on-chain balance
  const apiKey = (env as Record<string, unknown>).SPACESCAN_API_KEY as string | undefined;
  const addrBalance = await getAddressBalance(row.payment_address, apiKey);

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

  const balance = await getAICreditBalance(env.DB, walletAddress);

  return jsonResponse({
    hasPending: true,
    purchaseId: row.id,
    confirmed: true,
    creditsAdded: row.credits_purchased,
    balance,
  });
};
