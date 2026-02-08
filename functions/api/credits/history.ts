/**
 * Credit History API — /api/credits/history
 *
 * GET ?wallet=xch1...&limit=50&offset=0
 *
 * Returns paginated credit events (earned and spent) for a wallet.
 * No Clerk auth required — wallet-based system.
 *
 * Response: {
 *   wallet: string,
 *   events: Array<{
 *     type: 'earned' | 'spent',
 *     credits: number,
 *     priceXch?: number,
 *     nftId?: string,
 *     whaleMultiplier?: number,
 *     mintNumber?: number,
 *     timestamp: string
 *   }>,
 *   total: number,
 *   limit: number,
 *   offset: number
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

interface CreditEventRow {
  credits_earned: number;
  price_xch: number;
  nft_id: string;
  whale_multiplier: number;
  event_timestamp: string;
}

interface CreditSpendRow {
  credits_spent: number;
  mint_id: number;
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

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  if (!wallet || !wallet.startsWith('xch1')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid wallet parameter.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Fetch earned events
    const earnedEvents = await env.DB
      .prepare(
        `SELECT credits_earned, price_xch, nft_id, whale_multiplier, event_timestamp
         FROM credit_events
         WHERE wallet_address = ?
         ORDER BY event_timestamp DESC
         LIMIT ? OFFSET ?`
      )
      .bind(wallet, limit, offset)
      .all<CreditEventRow>();

    // Fetch spent events
    const spentEvents = await env.DB
      .prepare(
        `SELECT credits_spent, mint_id, created_at
         FROM credit_spends
         WHERE wallet_address = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(wallet, limit, offset)
      .all<CreditSpendRow>();

    // Get total count
    const totalResult = await env.DB
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM credit_events WHERE wallet_address = ?) +
           (SELECT COUNT(*) FROM credit_spends WHERE wallet_address = ?) as total`
      )
      .bind(wallet, wallet)
      .first<{ total: number }>();

    // Merge and sort by timestamp
    const events = [
      ...(earnedEvents.results || []).map((e) => ({
        type: 'earned' as const,
        credits: e.credits_earned / 100, // x100 → display
        priceXch: Math.round(e.price_xch * 1000) / 1000,
        nftId: e.nft_id,
        whaleMultiplier: Math.round((e.whale_multiplier / 10000) * 100) / 100,
        timestamp: e.event_timestamp,
      })),
      ...(spentEvents.results || []).map((s) => ({
        type: 'spent' as const,
        credits: s.credits_spent / 100, // x100 → display
        mintId: s.mint_id,
        timestamp: s.created_at,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return new Response(
      JSON.stringify({
        wallet,
        events: events.slice(0, limit),
        total: totalResult?.total || 0,
        limit,
        offset,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Credits History] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
