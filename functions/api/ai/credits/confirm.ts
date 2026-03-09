// functions/api/ai/credits/confirm.ts
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

const TREASURY_ADDRESS = 'xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd';
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 6000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch the current treasury balance (mojos) from Spacescan.
 * Uses the /address/xch-balance endpoint — the only reliable free endpoint.
 */
async function getTreasuryBalance(apiKey?: string): Promise<number | null> {
  try {
    const url = `https://api.spacescan.io/address/xch-balance/${TREASURY_ADDRESS}`;
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

/**
 * Detect payment by comparing current treasury balance against the snapshot
 * stored when the purchase was created. If balance grew by at least the
 * expected mojos, the payment arrived.
 */
function paymentDetected(
  currentBalance: number,
  snapshotBalance: number,
  expectedMojos: number
): boolean {
  return currentBalance >= snapshotBalance + expectedMojos;
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
      `SELECT id, wallet_address, credits_purchased, xch_paid_mojos, status, created_at, expires_at, treasury_mojo_snapshot
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
      treasury_mojo_snapshot: number | null;
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

  // No snapshot means buy.ts didn't record one (legacy purchase or API was down).
  // We can't do balance-based detection without a baseline.
  if (row.treasury_mojo_snapshot == null) {
    return jsonResponse({
      confirmed: false,
      message: 'Balance snapshot missing. Please contact support or try a new purchase.',
      purchaseId: row.id,
    }, 202);
  }

  const apiKey = (env as Record<string, unknown>).SPACESCAN_API_KEY as string | undefined;
  let found = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const currentBalance = await getTreasuryBalance(apiKey);
    if (currentBalance !== null && paymentDetected(currentBalance, row.treasury_mojo_snapshot, row.xch_paid_mojos)) {
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
