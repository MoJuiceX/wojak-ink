/**
 * Credit Leaderboard API — /api/credits/leaderboard
 *
 * GET ?limit=20&sort=earned|available|bought
 *
 * Returns wallets ranked by all-time credits earned. Includes available mints,
 * mints used, and YourWojak NFTs bought (paid). Default sort: earned desc.
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500);
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const sort = url.searchParams.get('sort') || 'earned';

  const orderByMap: Record<string, string> = {
    earned: 'COALESCE(e.total, 0) DESC',
    available: '(COALESCE(e.total, 0) - COALESCE(s.total, 0)) DESC, COALESCE(e.total, 0) DESC',
    bought: 'COALESCE(b.cnt, 0) DESC, COALESCE(e.total, 0) DESC',
  };
  const orderBy = orderByMap[sort] || orderByMap.earned;

  try {
    const query = `
      WITH wallets AS (
        SELECT wallet_address FROM credit_events
        UNION
        SELECT wallet_address FROM credit_spends
        UNION
        SELECT wallet_address FROM phase2_mints WHERE mint_type = 'paid' AND status = 'minted'
      ),
      earned AS (
        SELECT wallet_address, SUM(credits_earned) AS total FROM credit_events GROUP BY wallet_address
      ),
      spent AS (
        SELECT wallet_address, SUM(credits_spent) AS total FROM credit_spends GROUP BY wallet_address
      ),
      bought AS (
        SELECT wallet_address, COUNT(*) AS cnt FROM phase2_mints
        WHERE mint_type = 'paid' AND status = 'minted'
        GROUP BY wallet_address
      )
      SELECT
        w.wallet_address AS wallet,
        COALESCE(e.total, 0) AS earned,
        COALESCE(s.total, 0) AS spent,
        COALESCE(b.cnt, 0) AS yourWojakBought
      FROM wallets w
      LEFT JOIN earned e ON w.wallet_address = e.wallet_address
      LEFT JOIN spent s ON w.wallet_address = s.wallet_address
      LEFT JOIN bought b ON w.wallet_address = b.wallet_address
    `;
    let rows: { results?: { wallet: string; earned: number; spent: number; yourWojakBought: number }[] };
    try {
      rows = await env.DB.prepare(`${query} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(limit, offset).all<
        { wallet: string; earned: number; spent: number; yourWojakBought: number }
      >();
    } catch (e) {
      const err = String(e);
      if (err.includes('phase2_mints') || err.includes('no such table')) {
        rows = await env.DB.prepare(
          `WITH wallets AS (
            SELECT wallet_address FROM credit_events
            UNION
            SELECT wallet_address FROM credit_spends
          ),
          earned AS (SELECT wallet_address, SUM(credits_earned) AS total FROM credit_events GROUP BY wallet_address),
          spent AS (SELECT wallet_address, SUM(credits_spent) AS total FROM credit_spends GROUP BY wallet_address)
          SELECT w.wallet_address AS wallet, COALESCE(e.total, 0) AS earned, COALESCE(s.total, 0) AS spent, 0 AS yourWojakBought
          FROM wallets w
          LEFT JOIN earned e ON w.wallet_address = e.wallet_address
          LEFT JOIN spent s ON w.wallet_address = s.wallet_address
          ORDER BY ${orderBy}
          LIMIT ? OFFSET ?`
        ).bind(limit, offset).all<{ wallet: string; earned: number; spent: number; yourWojakBought: number }>();
      } else {
        throw e;
      }
    }

    const entries = (rows.results || []).map((r) => {
      const balance = r.earned - r.spent;
      return {
        wallet: r.wallet,
        earned: r.earned,
        spent: r.spent,
        balance,
        mintsUsed: Math.floor(r.spent / 10000),
        yourWojakBought: r.yourWojakBought,
        freeMints: Math.floor(balance / 10000),
      };
    });

    const top = entries.map((e, i) => ({
      rank: offset + i + 1,
      wallet: e.wallet,
      earned: Math.floor(e.earned / 100),
      spent: Math.floor(e.spent / 100),
      balance: Math.floor(e.balance / 100),
      freeMints: e.freeMints,
      mintsUsed: e.mintsUsed,
      yourWojakBought: e.yourWojakBought,
    }));

    return new Response(JSON.stringify({ items: top }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Credits Leaderboard] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
