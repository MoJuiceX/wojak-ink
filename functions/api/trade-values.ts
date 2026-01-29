/**
 * Cloudflare Pages Function - Trade Values API
 * Serves cached trade data from KV to the frontend
 */

interface Env {
  SALES_INDEX_KV: KVNamespace;
}

interface TraitStats {
  trait_name: string;
  trait_category: string;
  total_sales: number;
  outliers_excluded: number;
  average_xch: number;
  min_xch: number;
  max_xch: number;
  last_trade: string | null;
}

interface Sale {
  edition: number;
  price_xch: number;
  timestamp: string;
  traits: Record<string, string>;
}

interface StoredData {
  trait_stats: TraitStats[];
  all_sales: Sale[];
  total_sales_count: number;
  last_updated: string;
  fetch_duration_ms: number;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Get data from KV
    const data = await env.SALES_INDEX_KV.get('trade_values_data', 'json') as StoredData | null;

    if (!data) {
      return new Response(
        JSON.stringify({
          error: 'No data available yet. Data is being fetched.',
          trait_stats: [],
          all_sales: [],
          total_sales_count: 0,
          last_updated: null,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Parse query params for filtering
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const includeSales = url.searchParams.get('include_sales') === 'true';
    const traitName = url.searchParams.get('trait');

    // If requesting specific trait's sales
    if (traitName) {
      const decodedTrait = decodeURIComponent(traitName);
      const traitSales = data.all_sales.filter((sale) =>
        Object.values(sale.traits).some(
          (t) => t.toLowerCase() === decodedTrait.toLowerCase()
        )
      );

      // Sort by timestamp descending
      traitSales.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return new Response(
        JSON.stringify({
          trait_name: decodedTrait,
          sales: traitSales.slice(0, 20),
          total_sales: traitSales.length,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Build response
    const responseData: Partial<StoredData> & { trait_stats: TraitStats[] } = {
      trait_stats: data.trait_stats,
      total_sales_count: data.total_sales_count,
      last_updated: data.last_updated,
    };

    // Filter by category if specified
    if (category && category !== 'all') {
      responseData.trait_stats = data.trait_stats.filter(
        t => t.trait_category.toLowerCase() === category.toLowerCase()
      );
    }

    // Include full sales data only if requested
    if (includeSales) {
      responseData.all_sales = data.all_sales;
    }

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=60',
        },
      }
    );

  } catch (error) {
    console.error('Error fetching trade values:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
