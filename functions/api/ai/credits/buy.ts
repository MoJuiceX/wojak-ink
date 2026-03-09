// functions/api/ai/credits/buy.ts
import { jsonResponse, errorResponse, optionsResponse, AI_CREDIT_BUNDLES, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

const PURCHASE_EXPIRY_MINUTES = 30;
const TREASURY_ADDRESS = 'xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd';

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
    .first();

  if (existing) {
    return jsonResponse({
      pending: true,
      purchaseId: existing.id,
      tier: existing.bundle_tier,
      amountMojos: String(existing.xch_paid_mojos),
      treasuryAddress: TREASURY_ADDRESS,
      expiresAt: existing.expires_at,
    });
  }

  // Generate unique mojo amount: base + random offset (1–9999)
  // This ensures each payment is uniquely identifiable on-chain
  const baseMojos = Number(bundle.mojos);
  const offset = Math.floor(Math.random() * 9999) + 1;
  const uniqueMojos = baseMojos + offset;

  const expiresAt = new Date(Date.now() + PURCHASE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const result = await env.DB
    .prepare(
      `INSERT INTO ai_credit_purchases
        (wallet_address, credits_purchased, xch_paid_mojos, bundle_tier, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    )
    .bind(walletAddress, bundle.credits, uniqueMojos, bundle.tier, expiresAt)
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
