// functions/api/ai/credits/confirm.ts
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 6000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check the balance of a specific payment address via Spacescan.
 * Each purchase has its own dedicated address, so any balance > 0
 * means the user paid. We also verify the amount is at least what's expected.
 */
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
    const balance = await getAICreditBalance(env.DB, walletAddress);
    return jsonResponse({ alreadyConfirmed: true, creditsAdded: row.credits_purchased, balance });
  }
  if (row.status !== 'pending') {
    return errorResponse(`Purchase is ${row.status}`, 400);
  }

  if (new Date(row.expires_at) < new Date()) {
    await env.DB
      .prepare(`UPDATE ai_credit_purchases SET status = 'expired' WHERE id = ?`)
      .bind(purchaseId)
      .run();
    // Release the address back to the pool
    if (row.payment_address) {
      await env.DB
        .prepare(`UPDATE ai_payment_addresses SET purchase_id = NULL WHERE address = ?`)
        .bind(row.payment_address)
        .run();
    }
    return errorResponse('Purchase expired. Please start a new purchase.', 410);
  }

  // Must have a dedicated payment address to verify
  if (!row.payment_address) {
    return jsonResponse({
      confirmed: false,
      message: 'No payment address assigned. Please start a new purchase.',
      purchaseId: row.id,
    }, 202);
  }

  const apiKey = (env as Record<string, unknown>).SPACESCAN_API_KEY as string | undefined;
  let found = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const addrBalance = await getAddressBalance(row.payment_address, apiKey);
    // Any balance on this dedicated address means payment arrived.
    // Also verify it's at least the expected amount.
    if (addrBalance !== null && addrBalance >= row.xch_paid_mojos) {
      found = true;
      break;
    }
    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  if (!found) {
    return jsonResponse({
      confirmed: false,
      message: 'Payment not yet detected on-chain. Try again in a minute.',
      purchaseId: row.id,
    }, 202);
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
