/**
 * Credit Leaderboard API — /api/credits/leaderboard
 *
 * GET ?limit=20
 *
 * Returns top credit holders. Public endpoint, no auth.
 * Wallet addresses are returned in full — frontend truncates for display.
 *
 * Response: {
 *   leaderboard: Array<{
 *     rank: number,
 *     wallet: string,
 *     earned: number,
 *     spent: number,
 *     balance: number,
 *     freeMints: number,
 *     totalPurchases: number,
 *     totalXchSpent: number
 *   }>,
 *   totalWallets: number
 * }
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const FREE_MINT_COST = 10000; // 100 credits = 10000 stored units

interface LeaderboardRow {
  wallet_address: string;
  total_earned: number;
  total_spent: number;
  purchase_count: number;
  total_xch: number;
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

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

  try {
    // Aggregate credits per wallet, join with spends
    const results = await env.DB
      .prepare(
        `SELECT
           ce.wallet_address,
           SUM(ce.credits_earned) as total_earned,
           COALESCE(cs_agg.total_spent, 0) as total_spent,
           COUNT(ce.id) as purchase_count,
           SUM(ce.price_xch) as total_xch
         FROM credit_events ce
         LEFT JOIN (
           SELECT wallet_address, SUM(credits_spent) as total_spent
           FROM credit_spends
           GROUP BY wallet_address
         ) cs_agg ON ce.wallet_address = cs_agg.wallet_address
         GROUP BY ce.wallet_address
         ORDER BY (SUM(ce.credits_earned) - COALESCE(cs_agg.total_spent, 0)) DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<LeaderboardRow>();

    // Total unique wallets
    const totalResult = await env.DB
      .prepare('SELECT COUNT(DISTINCT wallet_address) as count FROM credit_events')
      .first<{ count: number }>();

    const leaderboard = (results.results || []).map((row, index) => {
      const balanceUnits = row.total_earned - row.total_spent;
      return {
        rank: index + 1,
        wallet: row.wallet_address,
        earned: Math.round((row.total_earned / 100) * 100) / 100,
        spent: Math.round((row.total_spent / 100) * 100) / 100,
        balance: Math.round((balanceUnits / 100) * 100) / 100,
        freeMints: Math.floor(balanceUnits / FREE_MINT_COST),
        totalPurchases: row.purchase_count,
        totalXchSpent: Math.round(row.total_xch * 1000) / 1000,
      };
    });

    return new Response(
      JSON.stringify({
        leaderboard,
        totalWallets: totalResult?.count || 0,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Credits Leaderboard] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
