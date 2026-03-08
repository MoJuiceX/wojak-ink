// functions/api/ai/credits/buy.ts
import { jsonResponse, errorResponse, optionsResponse, AI_CREDIT_BUNDLES } from '../_shared';
import type { AIEnv } from '../_shared';

const OFFER_EXPIRY_MINUTES = 15;

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { walletAddress?: string; tier?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { walletAddress, tier } = body;

  if (!walletAddress || walletAddress.length < 10) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }

  const bundle = AI_CREDIT_BUNDLES.find((b) => b.tier === tier);
  if (!bundle) {
    return errorResponse(`Invalid tier. Valid tiers: ${AI_CREDIT_BUNDLES.map((b) => b.tier).join(', ')}`, 400);
  }

  // Expire stale pending purchases for this wallet
  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'expired'
       WHERE wallet_address = ? AND status = 'pending' AND expires_at < datetime('now')`
    )
    .bind(walletAddress)
    .run();

  // Check for existing pending purchase
  const existing = await env.DB
    .prepare(
      `SELECT id, bundle_tier, offer_file, expires_at FROM ai_credit_purchases
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
      offerFile: existing.offer_file,
      expiresAt: existing.expires_at,
    });
  }

  // TODO: Create MintGarden offer for XCH payment
  // For now, insert pending row. The MintGarden integration
  // follows the same pattern as functions/api/mint/request.ts.
  const expiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const result = await env.DB
    .prepare(
      `INSERT INTO ai_credit_purchases
        (wallet_address, credits_purchased, xch_paid_mojos, bundle_tier, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    )
    .bind(walletAddress, bundle.credits, Number(bundle.mojos), bundle.tier, expiresAt)
    .run();

  return jsonResponse({
    pending: true,
    purchaseId: result.meta?.last_row_id,
    tier: bundle.tier,
    credits: bundle.credits,
    priceXch: bundle.priceXch,
    expiresAt,
  }, 201);
};
