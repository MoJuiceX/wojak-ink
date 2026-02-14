/**
 * GET/POST /api/sales/token-rates
 *
 * GET: List all CAT token conversion rates
 * POST: Add/update a token rate (admin, password-protected)
 *       Also re-converts historical sales with that token.
 */

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
}

const DEFAULT_ADMIN_PASSWORD = 'wojak-admin-2026';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(context.request.url);

  // GET: List all token rates
  if (context.request.method === 'GET') {
    try {
      const result = await context.env.DB.prepare(
        'SELECT token_code, token_id, xch_rate, source, updated_at, asset_id FROM cat_token_rates ORDER BY token_code'
      ).all();

      return new Response(
        JSON.stringify({ rates: result.results }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
            ...CORS_HEADERS,
          },
        }
      );
    } catch (error) {
      console.error('[Token Rates API] GET Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
  }

  // POST: Add/update a token rate
  if (context.request.method === 'POST') {
    // Auth check
    const password = url.searchParams.get('password');
    const adminPassword = context.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

    if (password !== adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    try {
      const body = await context.request.json() as {
        token_code: string;
        xch_rate: number;
        token_id?: string;
        asset_id?: string;
        source?: string;
      };

      if (!body.token_code || typeof body.xch_rate !== 'number' || body.xch_rate <= 0) {
        return new Response(
          JSON.stringify({ error: 'token_code (string) and xch_rate (positive number) are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      // Upsert token rate (with optional asset_id)
      await context.env.DB.prepare(`
        INSERT INTO cat_token_rates (token_code, token_id, xch_rate, source, asset_id, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(token_code) DO UPDATE SET
          xch_rate = excluded.xch_rate,
          token_id = COALESCE(excluded.token_id, cat_token_rates.token_id),
          asset_id = COALESCE(excluded.asset_id, cat_token_rates.asset_id),
          source = excluded.source,
          updated_at = datetime('now')
      `).bind(
        body.token_code,
        body.token_id ?? null,
        body.xch_rate,
        body.source ?? 'manual',
        body.asset_id ?? null
      ).run();

      // Re-convert historical sales with this token code
      const updateByCode = await context.env.DB.prepare(`
        UPDATE sales_history
        SET xch_equivalent = original_amount * ?,
            cat_xch_rate = ?
        WHERE token_code = ?
      `).bind(body.xch_rate, body.xch_rate, body.token_code).run();

      let updatedSales = updateByCode.meta?.changes ?? 0;

      // Also re-convert MintGarden sales that used this asset_id but have UNKNOWN token_code
      if (body.asset_id) {
        const updateByAssetId = await context.env.DB.prepare(`
          UPDATE sales_history
          SET xch_equivalent = original_amount * ?,
              cat_xch_rate = ?,
              token_code = ?
          WHERE token_id = ? AND token_code = 'UNKNOWN'
        `).bind(body.xch_rate, body.xch_rate, body.token_code, body.asset_id).run();

        updatedSales += updateByAssetId.meta?.changes ?? 0;
      }

      return new Response(
        JSON.stringify({
          success: true,
          tokenCode: body.token_code,
          xchRate: body.xch_rate,
          assetId: body.asset_id ?? null,
          historicalSalesUpdated: updatedSales,
        }),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    } catch (error) {
      console.error('[Token Rates API] POST Error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  );
};
