/**
 * Credit Balance API — /api/credits/balance
 *
 * GET ?wallet=xch1...
 *
 * Returns the credit balance for a wallet address.
 * No Clerk auth required — wallet-based system.
 *
 * Side effect: expires stale pending mints (>20 min old) for accurate supply.
 *
 * Response: {
 *   wallet: string,
 *   earned: number,        // total credits earned (display units)
 *   spent: number,         // total credits spent (display units)
 *   balance: number,       // available credits (display units)
 *   freeMints: number,     // number of free mints available
 *   totalPurchases: number // total XCH purchases that earned credits
 * }
 */

import { isValidChiaAddress } from '../../lib/validation';

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const FREE_MINT_COST = 10000; // 100 credits = 10000 stored units

/**
 * Expire stale pending mints older than 20 minutes.
 * Called on balance/supply queries to keep data accurate.
 */
async function expireStalePendingMints(db: D1Database): Promise<number> {
  try {
    const result = await db
      .prepare(
        `UPDATE phase2_mints
         SET status = 'expired'
         WHERE status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at < datetime('now')`
      )
      .run();
    return result.meta?.changes || 0;
  } catch (error) {
    console.error('[Credits Balance] Error expiring stale mints:', error);
    return 0;
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Get wallet from query string
  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');

  if (!wallet || !isValidChiaAddress(wallet)) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid wallet parameter. Expected xch1... address.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Expire stale pending mints for accurate supply
    const expired = await expireStalePendingMints(env.DB);
    if (expired > 0) {
      console.warn(`[Credits Balance] Expired ${expired} stale pending mints`);
    }

    // Get total earned credits
    const earnedResult = await env.DB
      .prepare(
        'SELECT COALESCE(SUM(credits_earned), 0) as total FROM credit_events WHERE wallet_address = ?'
      )
      .bind(wallet)
      .first<{ total: number }>();

    // Get total spent credits
    const spentResult = await env.DB
      .prepare(
        'SELECT COALESCE(SUM(credits_spent), 0) as total FROM credit_spends WHERE wallet_address = ?'
      )
      .bind(wallet)
      .first<{ total: number }>();

    // Get total purchases count
    const purchaseResult = await env.DB
      .prepare(
        'SELECT COUNT(*) as count, COALESCE(SUM(price_xch), 0) as total_xch FROM credit_events WHERE wallet_address = ?'
      )
      .bind(wallet)
      .first<{ count: number; total_xch: number }>();

    // Get mint counts (free and paid)
    let freeMintsUsed = 0;
    let paidMints = 0;
    try {
      const freeRow = await env.DB
        .prepare(
          "SELECT COUNT(*) as count FROM phase2_mints WHERE wallet_address = ? AND mint_type = 'free' AND status = 'minted'"
        )
        .bind(wallet)
        .first<{ count: number }>();
      freeMintsUsed = freeRow?.count || 0;

      const paidRow = await env.DB
        .prepare(
          "SELECT COUNT(*) as count FROM phase2_mints WHERE wallet_address = ? AND mint_type = 'paid' AND status = 'minted'"
        )
        .bind(wallet)
        .first<{ count: number }>();
      paidMints = paidRow?.count || 0;
    } catch {
      // phase2_mints table may not exist yet — ignore
    }

    const earnedUnits = earnedResult?.total || 0;
    const spentUnits = spentResult?.total || 0;
    const balanceUnits = earnedUnits - spentUnits;

    // Convert from x100 storage to display units
    const earned = earnedUnits / 100;
    const spent = spentUnits / 100;
    const balance = balanceUnits / 100;
    const freeMints = Math.floor(balanceUnits / FREE_MINT_COST);

    return new Response(
      JSON.stringify({
        wallet,
        earned: Math.round(earned * 100) / 100,
        spent: Math.round(spent * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        freeMints,
        freeMintsUsed,
        paidMints,
        totalPurchases: purchaseResult?.count || 0,
        totalXchSpent: Math.round((purchaseResult?.total_xch || 0) * 1000) / 1000,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Credits Balance] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
