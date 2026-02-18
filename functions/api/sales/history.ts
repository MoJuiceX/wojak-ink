/**
 * GET /api/sales/history
 *
 * Paginated sales history from D1 sales_history table.
 * Replaces client-side Dexie fetching as the source of truth.
 *
 * Query params:
 *   ?nft_id=2006       - Filter by edition number
 *   ?limit=50          - Page size (default 50, max 5000)
 *   ?offset=0          - Pagination offset
 *   ?since=1700000000  - Only sales after this unix timestamp (ms)
 *   ?sort=newest       - Sort order: newest, oldest, price_high, price_low
 *   ?currency=CAT      - Filter by currency: XCH or CAT
 */

interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (context.request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const url = new URL(context.request.url);
    const nftId = url.searchParams.get('nft_id');
    const since = url.searchParams.get('since');
    const currency = url.searchParams.get('currency');
    const sort = url.searchParams.get('sort') || 'newest';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 5000);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Build query dynamically
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (nftId) {
      conditions.push('nft_edition = ?');
      params.push(parseInt(nftId, 10));
    }

    if (since) {
      conditions.push('completed_at_unix > ?');
      params.push(parseInt(since, 10));
    }

    if (currency && (currency === 'XCH' || currency === 'CAT')) {
      conditions.push('currency = ?');
      params.push(currency);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort order
    let orderClause: string;
    switch (sort) {
      case 'oldest':
        orderClause = 'ORDER BY completed_at_unix ASC';
        break;
      case 'price_high':
        orderClause = 'ORDER BY xch_equivalent DESC';
        break;
      case 'price_low':
        orderClause = 'ORDER BY xch_equivalent ASC';
        break;
      case 'newest':
      default:
        orderClause = 'ORDER BY completed_at_unix DESC';
        break;
    }

    // Count total matching records
    const countQuery = `SELECT COUNT(*) as total FROM sales_history ${whereClause}`;
    const countResult = await context.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total ?? 0;

    // Fetch paginated results
    const dataQuery = `SELECT
      trade_id, nft_edition, nft_name, currency, original_amount,
      token_code, token_id, xch_equivalent, usd_value, xch_usd_rate,
      cat_xch_rate, traits_json, completed_at, completed_at_unix, source
    FROM sales_history ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;

    const dataParams = [...params, limit, offset];
    const result = await context.env.DB.prepare(dataQuery).bind(...dataParams).all();

    // Transform rows for frontend consumption
    const items = result.results.map((row: Record<string, unknown>) => ({
      tradeId: row.trade_id,
      nftId: row.nft_edition,
      nftName: row.nft_name,
      currency: row.currency,
      amount: row.original_amount,
      tokenCode: row.token_code,
      tokenId: row.token_id,
      xchEquivalent: row.xch_equivalent,
      usdValue: row.usd_value,
      xchUsdRate: row.xch_usd_rate,
      catXchRate: row.cat_xch_rate,
      traits: row.traits_json ? JSON.parse(row.traits_json as string) : {},
      timestamp: row.completed_at_unix,
      completedAt: row.completed_at,
      source: row.source,
    }));

    return new Response(
      JSON.stringify({
        items,
        total,
        hasMore: offset + limit < total,
        limit,
        offset,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error) {
    console.error('[Sales History API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
};
