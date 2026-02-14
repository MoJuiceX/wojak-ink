/**
 * Admin: Credit Stats — /api/admin/credit-stats
 *
 * GET (no params)
 *
 * Returns aggregate credit system health metrics.
 * Internal admin endpoint — not linked in navigation.
 */

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;  // Set via wrangler secret
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

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

  // Admin authentication (required — blocks access if ADMIN_SECRET not configured)
  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const [earnedRow, spentRow, freeMintsRow, walletsRow, airdropRow] = await Promise.all([
      env.DB.prepare(
        'SELECT COALESCE(SUM(credits_earned), 0) AS total FROM credit_events'
      ).first<{ total: number }>(),

      env.DB.prepare(
        'SELECT COALESCE(SUM(credits_spent), 0) AS total FROM credit_spends'
      ).first<{ total: number }>(),

      env.DB.prepare(
        "SELECT COUNT(*) AS count FROM phase2_mints WHERE mint_type = 'free' AND status = 'minted'"
      ).first<{ count: number }>(),

      env.DB.prepare(
        'SELECT COUNT(DISTINCT wallet_address) AS count FROM credit_events'
      ).first<{ count: number }>(),

      env.DB.prepare(
        "SELECT COUNT(*) AS wallets, COALESCE(SUM(credits_earned), 0) AS total FROM credit_events WHERE event_type = 'holder_airdrop'"
      ).first<{ wallets: number; total: number }>().catch(() => null),
    ]);

    const totalEarned = (earnedRow?.total ?? 0) / 100; // display units
    const totalSpent = (spentRow?.total ?? 0) / 100;
    const freeMints = freeMintsRow?.count ?? 0;
    const walletCount = walletsRow?.count ?? 0;
    const avgPerWallet = walletCount > 0 ? Math.round(totalEarned / walletCount) : 0;

    return new Response(
      JSON.stringify({
        totalEarned,
        totalSpent,
        freeMints,
        walletCount,
        avgPerWallet,
        airdropWallets: airdropRow?.wallets ?? 0,
        airdropCredits: (airdropRow?.total ?? 0) / 100,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Admin Credit Stats] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
