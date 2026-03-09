// functions/api/ai/credits/buy.ts
import { jsonResponse, errorResponse, optionsResponse, AI_CREDIT_BUNDLES, requireAuth } from '../_shared';
import type { AIEnv } from '../_shared';

const PURCHASE_EXPIRY_MINUTES = 30;

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

  // Expire stale pending purchases for this wallet and release their addresses
  const staleRows = await env.DB
    .prepare(
      `SELECT id, payment_address FROM ai_credit_purchases
       WHERE wallet_address = ? AND status = 'pending' AND expires_at < datetime('now')`
    )
    .bind(walletAddress)
    .all<{ id: number; payment_address: string | null }>();

  if (staleRows.results?.length) {
    for (const stale of staleRows.results) {
      await env.DB
        .prepare(`UPDATE ai_credit_purchases SET status = 'expired' WHERE id = ?`)
        .bind(stale.id)
        .run();
      // Release the address back to the pool
      if (stale.payment_address) {
        await env.DB
          .prepare(`UPDATE ai_payment_addresses SET purchase_id = NULL WHERE address = ?`)
          .bind(stale.payment_address)
          .run();
      }
    }
  }

  // Check for existing pending purchase — return it so user can retry payment
  const existing = await env.DB
    .prepare(
      `SELECT id, bundle_tier, xch_paid_mojos, expires_at, payment_address FROM ai_credit_purchases
       WHERE wallet_address = ? AND status = 'pending' AND expires_at > datetime('now')
       LIMIT 1`
    )
    .bind(walletAddress)
    .first<{ id: number; bundle_tier: string; xch_paid_mojos: number; expires_at: string; payment_address: string | null }>();

  if (existing) {
    // If user switched tiers, expire the old pending purchase and release its address
    if (existing.bundle_tier !== bundle.tier) {
      await env.DB
        .prepare(`UPDATE ai_credit_purchases SET status = 'expired' WHERE id = ?`)
        .bind(existing.id)
        .run();
      if (existing.payment_address) {
        await env.DB
          .prepare(`UPDATE ai_payment_addresses SET purchase_id = NULL WHERE address = ?`)
          .bind(existing.payment_address)
          .run();
      }
    } else {
      return jsonResponse({
        pending: true,
        purchaseId: existing.id,
        tier: existing.bundle_tier,
        amountMojos: String(existing.xch_paid_mojos),
        treasuryAddress: existing.payment_address || '',
        expiresAt: existing.expires_at,
      });
    }
  }

  // Claim the next available payment address from the pool
  const addrRow = await env.DB
    .prepare(
      `SELECT id, address FROM ai_payment_addresses
       WHERE purchase_id IS NULL
       ORDER BY id ASC
       LIMIT 1`
    )
    .first<{ id: number; address: string }>();

  if (!addrRow) {
    return errorResponse('No payment addresses available. Please try again later.', 503);
  }

  // Generate unique mojo amount: base + random offset (1–9999)
  const baseMojos = Number(bundle.mojos);
  const offset = Math.floor(Math.random() * 9999) + 1;
  const uniqueMojos = baseMojos + offset;

  const expiresAt = new Date(Date.now() + PURCHASE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const result = await env.DB
    .prepare(
      `INSERT INTO ai_credit_purchases
        (wallet_address, credits_purchased, xch_paid_mojos, bundle_tier, status, expires_at, payment_address)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`
    )
    .bind(walletAddress, bundle.credits, uniqueMojos, bundle.tier, expiresAt, addrRow.address)
    .run();

  const purchaseId = result.meta?.last_row_id;

  // Mark the address as assigned to this purchase
  await env.DB
    .prepare(`UPDATE ai_payment_addresses SET purchase_id = ? WHERE id = ?`)
    .bind(purchaseId, addrRow.id)
    .run();

  return jsonResponse({
    purchaseId,
    amountMojos: String(uniqueMojos),
    treasuryAddress: addrRow.address,
    tier: bundle.tier,
    credits: bundle.credits,
    priceXch: bundle.priceXch,
    expiresAt,
  }, 201);
};
