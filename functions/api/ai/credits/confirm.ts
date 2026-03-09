// functions/api/ai/credits/confirm.ts
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

const TREASURY_PUZZLE_HASH = '8f53b331e60904f8ae324b7781ad94ce1d9a4e8a2fbcc33622518a5a24a0e727';
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 6000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SpacescanCoin {
  amount: number;
  timestamp: number;
  confirmed_block_index?: number;
}

/**
 * Call Spacescan API directly (server-to-server) instead of going through
 * our own /api/spacescan proxy. The proxy has a 5-minute edge cache which
 * prevents newly confirmed coins from appearing during the polling window.
 */
async function findMatchingCoin(
  expectedMojos: number,
  purchaseCreatedAt: string,
  apiKey?: string
): Promise<boolean> {
  try {
    const url = `https://api.spacescan.io/coin/address/${TREASURY_PUZZLE_HASH}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'wojak.ink/1.0',
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return false;

    const data = await res.json() as { coins?: SpacescanCoin[] };
    if (!Array.isArray(data.coins)) return false;

    const purchaseTime = new Date(purchaseCreatedAt).getTime() / 1000;

    return data.coins.some(
      (coin) => coin.amount === expectedMojos && coin.timestamp >= purchaseTime - 60
    );
  } catch {
    return false;
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
      `SELECT id, wallet_address, credits_purchased, xch_paid_mojos, status, created_at, expires_at
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
    return errorResponse('Purchase expired. Please start a new purchase.', 410);
  }

  const apiKey = (env as Record<string, unknown>).SPACESCAN_API_KEY as string | undefined;
  let found = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    found = await findMatchingCoin(row.xch_paid_mojos, row.created_at, apiKey);
    if (found) break;
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
