/**
 * GET /api/sales/stats
 *
 * Aggregate sales statistics from D1 sales_history table.
 *
 * Query params:
 *   (none)                              - Overall collection stats
 *   ?trait_category=Base                 - Stats for all values in a category
 *   ?trait_category=Base&trait_value=Wojak - Stats for a specific trait
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
    const url = new URL(context.request.url);
    const traitCategory = url.searchParams.get('trait_category');
    const traitValue = url.searchParams.get('trait_value');

    // Overall stats (no trait filter)
    if (!traitCategory) {
      const result = await context.env.DB.prepare(`
        SELECT
          COUNT(*) as total_sales,
          COALESCE(SUM(xch_equivalent), 0) as total_volume_xch,
          COALESCE(AVG(xch_equivalent), 0) as avg_price_xch,
          COALESCE(MIN(xch_equivalent), 0) as min_price_xch,
          COALESCE(MAX(xch_equivalent), 0) as max_price_xch,
          COUNT(DISTINCT nft_edition) as unique_nfts_sold
        FROM sales_history
      `).first();

      return new Response(
        JSON.stringify({
          totalSales: result?.total_sales ?? 0,
          totalVolumeXch: result?.total_volume_xch ?? 0,
          avgPriceXch: result?.avg_price_xch ?? 0,
          minPriceXch: result?.min_price_xch ?? 0,
          maxPriceXch: result?.max_price_xch ?? 0,
          uniqueNftsSold: result?.unique_nfts_sold ?? 0,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=120',
            ...CORS_HEADERS,
          },
        }
      );
    }

    // Trait-filtered stats — use JSON extraction on traits_json
    // SQLite json_extract: json_extract(traits_json, '$.Base') = 'Wojak'
    const jsonPath = `$.${traitCategory}`;

    if (traitValue) {
      // Stats for a specific trait value
      const result = await context.env.DB.prepare(`
        SELECT
          COUNT(*) as total_sales,
          COALESCE(SUM(xch_equivalent), 0) as total_volume_xch,
          COALESCE(AVG(xch_equivalent), 0) as avg_price_xch,
          COALESCE(MIN(xch_equivalent), 0) as min_price_xch,
          COALESCE(MAX(xch_equivalent), 0) as max_price_xch
        FROM sales_history
        WHERE json_extract(traits_json, ?) = ?
      `).bind(jsonPath, traitValue).first();

      return new Response(
        JSON.stringify({
          traitCategory,
          traitValue,
          totalSales: result?.total_sales ?? 0,
          totalVolumeXch: result?.total_volume_xch ?? 0,
          avgPriceXch: result?.avg_price_xch ?? 0,
          minPriceXch: result?.min_price_xch ?? 0,
          maxPriceXch: result?.max_price_xch ?? 0,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=120',
            ...CORS_HEADERS,
          },
        }
      );
    }

    // Stats for all values in a category
    const result = await context.env.DB.prepare(`
      SELECT
        json_extract(traits_json, ?) as trait_value,
        COUNT(*) as total_sales,
        COALESCE(SUM(xch_equivalent), 0) as total_volume_xch,
        COALESCE(AVG(xch_equivalent), 0) as avg_price_xch,
        COALESCE(MIN(xch_equivalent), 0) as min_price_xch,
        COALESCE(MAX(xch_equivalent), 0) as max_price_xch
      FROM sales_history
      WHERE json_extract(traits_json, ?) IS NOT NULL
      GROUP BY trait_value
      ORDER BY avg_price_xch DESC
    `).bind(jsonPath, jsonPath).all();

    const stats = result.results.map((row: Record<string, unknown>) => ({
      traitCategory,
      traitValue: row.trait_value,
      totalSales: row.total_sales,
      totalVolumeXch: row.total_volume_xch,
      avgPriceXch: row.avg_price_xch,
      minPriceXch: row.min_price_xch,
      maxPriceXch: row.max_price_xch,
    }));

    return new Response(
      JSON.stringify({ traitCategory, stats }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=120',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error) {
    console.error('[Sales Stats API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
};
