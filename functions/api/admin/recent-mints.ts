/**
 * Admin: Recent Mints — /api/admin/recent-mints
 *
 * GET ?limit=20
 *
 * Returns the most recent minted NFTs with wallet, traits, price, and timestamp.
 * Internal admin endpoint — not linked in navigation.
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

interface MintRow {
  mint_number: number;
  wallet_address: string;
  layers_json: string | null;
  mint_type: string;
  total_price_xch: number | null;
  trait_surcharge_xch: number | null;
  highest_surcharge_trait: string | null;
  minted_at: string | null;
  created_at: string;
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

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    const rows = await env.DB.prepare(
      `SELECT mint_number, wallet_address, layers_json, mint_type,
              total_price_xch, trait_surcharge_xch, highest_surcharge_trait,
              minted_at, created_at
       FROM phase2_mints
       WHERE status = 'minted'
       ORDER BY minted_at DESC, created_at DESC
       LIMIT ?`
    )
      .bind(limit)
      .all<MintRow>();

    const mints = (rows.results || []).map((r) => ({
      mintNumber: r.mint_number,
      wallet: r.wallet_address,
      mintType: r.mint_type,
      totalPriceXch: r.total_price_xch ? r.total_price_xch / 100000 : null,
      surchargeXch: r.trait_surcharge_xch ? r.trait_surcharge_xch / 100000 : null,
      highestSurchargeTrait: r.highest_surcharge_trait,
      mintedAt: r.minted_at || r.created_at,
      layers: r.layers_json ? JSON.parse(r.layers_json) : null,
    }));

    return new Response(JSON.stringify({ mints }), { headers: corsHeaders });
  } catch (error) {
    console.error('[Admin Recent Mints] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
