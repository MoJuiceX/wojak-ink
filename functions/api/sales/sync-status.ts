/**
 * GET /api/sales/sync-status
 *
 * Returns the current sync health of the sales_history D1 table.
 * Used by /status skill and admin dashboards.
 */

interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
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
    // Get sync state
    const state = await context.env.DB.prepare(
      'SELECT * FROM sales_sync_state WHERE id = 1'
    ).first();

    // Get total count and breakdown
    const counts = await context.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN currency = 'XCH' THEN 1 ELSE 0 END) as xch_count,
        SUM(CASE WHEN currency = 'CAT' THEN 1 ELSE 0 END) as cat_count,
        MIN(completed_at) as earliest_sale,
        MAX(completed_at) as latest_sale
      FROM sales_history
    `).first();

    return new Response(
      JSON.stringify({
        syncStatus: state?.sync_status ?? 'unknown',
        lastSyncAt: state?.last_sync_at ?? null,
        lastTradeTimestamp: state?.last_trade_timestamp ?? null,
        totalSynced: state?.total_synced ?? 0,
        errorMessage: state?.error_message ?? null,
        breakdown: {
          total: counts?.total ?? 0,
          xchSales: counts?.xch_count ?? 0,
          catSales: counts?.cat_count ?? 0,
          earliestSale: counts?.earliest_sale ?? null,
          latestSale: counts?.latest_sale ?? null,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error) {
    console.error('[Sales Sync Status API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
};
