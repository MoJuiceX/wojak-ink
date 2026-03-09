// functions/api/ai/credits/buy.ts
import { jsonResponse, errorResponse, optionsResponse, AI_CREDIT_BUNDLES, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

const PURCHASE_EXPIRY_MINUTES = 30;
const TREASURY_ADDRESS = 'xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd';

/**
 * Snapshot the current treasury balance (mojos) from Spacescan.
 * Used later by confirm.ts to detect balance increase.
 */
async function getTreasurySnapshot(apiKey?: string): Promise<number | null> {
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

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const walletAddress = auth.walletAddress;

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { tier } = body;

  const bundle = AI_CREDIT_BUNDLES.find((b) => b.tier === tier);
  if (!bundle) {
    return errorResponse(
      `Invalid tier. Valid tiers: ${AI_CREDIT_BUNDLES.map((b) => b.tier).join(', ')}`,
      400
    );
  }

  // Expire stale pending purchases for this wallet
  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'expired'
       WHERE wallet_address = ? AND status = 'pending' AND expires_at < datetime('now')`
    )
    .bind(walletAddress)
    .run();

  // Check for existing pending purchase — return it so user can retry payment
  const existing = await env.DB
    .prepare(
      `SELECT id, bundle_tier, xch_paid_mojos, expires_at FROM ai_credit_purchases
       WHERE wallet_address = ? AND status = 'pending' AND expires_at > datetime('now')
       LIMIT 1`
    )
    .bind(walletAddress)
    .first<{ id: number; bundle_tier: string; xch_paid_mojos: number; expires_at: string }>();

  if (existing) {
    // If user switched tiers, expire the old pending purchase and create fresh
    if (existing.bundle_tier !== bundle.tier) {
      await env.DB
        .prepare(`UPDATE ai_credit_purchases SET status = 'expired' WHERE id = ?`)
        .bind(existing.id)
        .run();
    } else {
      return jsonResponse({
        pending: true,
        purchaseId: existing.id,
        tier: existing.bundle_tier,
        amountMojos: String(existing.xch_paid_mojos),
        treasuryAddress: TREASURY_ADDRESS,
        expiresAt: existing.expires_at,
      });
    }
  }

  // Generate unique mojo amount: base + random offset (1–9999)
  // This ensures each payment is uniquely identifiable on-chain
  const baseMojos = Number(bundle.mojos);
  const offset = Math.floor(Math.random() * 9999) + 1;
  const uniqueMojos = baseMojos + offset;

  const expiresAt = new Date(Date.now() + PURCHASE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Snapshot treasury balance BEFORE user pays — confirm.ts compares with this
  const apiKey = (env as Record<string, unknown>).SPACESCAN_API_KEY as string | undefined;
  const snapshot = await getTreasurySnapshot(apiKey);

  const result = await env.DB
    .prepare(
      `INSERT INTO ai_credit_purchases
        (wallet_address, credits_purchased, xch_paid_mojos, bundle_tier, status, expires_at, treasury_mojo_snapshot)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`
    )
    .bind(walletAddress, bundle.credits, uniqueMojos, bundle.tier, expiresAt, snapshot)
    .run();

  return jsonResponse({
    purchaseId: result.meta?.last_row_id,
    amountMojos: String(uniqueMojos),
    treasuryAddress: TREASURY_ADDRESS,
    tier: bundle.tier,
    credits: bundle.credits,
    priceXch: bundle.priceXch,
    expiresAt,
  }, 201);
};
