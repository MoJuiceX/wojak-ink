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
  'Access-Control-Allow-Origin': '*',
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
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const sort = url.searchParams.get('sort') || 'earned';

  try {
    const earnedMap = new Map<string, number>();
    const spentMap = new Map<string, number>();
    const boughtMap = new Map<string, number>();

    const earnedRows = await env.DB.prepare(
      'SELECT wallet_address, SUM(credits_earned) AS total FROM credit_events GROUP BY wallet_address'
    ).all<{ wallet_address: string; total: number }>();
    for (const r of earnedRows.results || []) {
      earnedMap.set(r.wallet_address, r.total);
    }

    const spentRows = await env.DB.prepare(
      'SELECT wallet_address, SUM(credits_spent) AS total FROM credit_spends GROUP BY wallet_address'
    ).all<{ wallet_address: string; total: number }>();
    for (const r of spentRows.results || []) {
      spentMap.set(r.wallet_address, r.total);
    }

    let boughtRows: { results?: { wallet_address: string; count: number }[] } = { results: [] };
    try {
      boughtRows = await env.DB.prepare(
        `SELECT wallet_address, COUNT(*) AS count FROM phase2_mints
         WHERE mint_type = 'paid' AND status = 'minted'
         GROUP BY wallet_address`
      ).all<{ wallet_address: string; count: number }>();
    } catch {
      // phase2_mints may not exist or be empty
    }
    for (const r of boughtRows.results || []) {
      boughtMap.set(r.wallet_address, r.count);
    }

    const allWallets = new Set([
      ...earnedMap.keys(),
      ...spentMap.keys(),
      ...boughtMap.keys(),
    ]);
    const entries = [...allWallets].map((wallet) => {
      const earned = earnedMap.get(wallet) || 0;
      const spent = spentMap.get(wallet) || 0;
      const balance = earned - spent;
      const mintsUsed = Math.floor(spent / 10000);
      const yourWojakBought = boughtMap.get(wallet) || 0;
      return {
        wallet,
        earned,
        spent,
        balance,
        mintsUsed,
        yourWojakBought,
        freeMints: Math.floor(balance / 10000),
      };
    });

    if (sort === 'available') {
      entries.sort((a, b) => b.freeMints - a.freeMints || b.earned - a.earned);
    } else if (sort === 'bought') {
      entries.sort((a, b) => b.yourWojakBought - a.yourWojakBought || b.earned - a.earned);
    } else {
      entries.sort((a, b) => b.earned - a.earned);
    }

    const top = entries.slice(offset, offset + limit).map((e, i) => ({
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
