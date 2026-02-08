/**
 * Mint Status API — /api/mint/status
 *
 * GET ?wallet=xch1...
 *
 * Checks for any active pending mints for a wallet.
 * Used by the Generator to resume countdown after page reload.
 *
 * Response: {
 *   pending: null | {
 *     mintId: number,
 *     offerFile: string | null,
 *     mintType: 'paid' | 'free',
 *     totalPriceXch: number | null,
 *     expiresAt: string | null,
 *     createdAt: string,
 *     layers: object,
 *     colors: object
 *   }
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

interface PendingMintRow {
  id: number;
  offer_file: string | null;
  mint_type: string;
  total_price_xch: number | null;
  expires_at: string | null;
  created_at: string;
  layers_json: string;
  colors_json: string;
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
  const wallet = url.searchParams.get('wallet');

  if (!wallet || !wallet.startsWith('xch1')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid wallet parameter.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // First, expire stale pending mints
    await env.DB
      .prepare(
        `UPDATE phase2_mints
         SET status = 'expired'
         WHERE status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at < datetime('now')`
      )
      .run();

    // Check for active pending mints
    const pending = await env.DB
      .prepare(
        `SELECT id, offer_file, mint_type, total_price_xch, expires_at, created_at,
                layers_json, colors_json
         FROM phase2_mints
         WHERE wallet_address = ?
         AND status = 'pending'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(wallet)
      .first<PendingMintRow>();

    if (!pending) {
      return new Response(
        JSON.stringify({ pending: null }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Parse JSON fields safely
    let layers = {};
    let colors = {};
    try {
      layers = JSON.parse(pending.layers_json);
      colors = JSON.parse(pending.colors_json);
    } catch {
      // If JSON is malformed, return empty objects
    }

    return new Response(
      JSON.stringify({
        pending: {
          mintId: pending.id,
          offerFile: pending.offer_file,
          mintType: pending.mint_type,
          totalPriceXch: pending.total_price_xch ? pending.total_price_xch / 100000 : null,
          expiresAt: pending.expires_at,
          createdAt: pending.created_at,
          layers,
          colors,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Status] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
