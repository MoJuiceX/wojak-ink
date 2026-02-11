/**
 * Mint Pricing API — /api/mint/pricing
 *
 * GET (no params)
 *
 * Returns trait surcharges (from trait_usage), supply count, and floor price.
 * Used by Generator for dynamic pricing display.
 *
 * Response: {
 *   traits: { [traitKey]: { usageCount, surchargeXch } },
 *   supply: { minted: number, total: 4200 },
 *   floorPrice: number
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

const SUPPLY_TOTAL = 4200;
const SURCHARGE_BASE = 0.2;
const SURCHARGE_USES_DIVISOR = 20;

function surchargeXch(usageCount: number): number {
  return SURCHARGE_BASE * Math.log(1 + usageCount / SURCHARGE_USES_DIVISOR);
}

interface TraitUsageRow {
  trait_category: string;
  trait_name: string;
  usage_count: number;
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
    const traitRows = await env.DB.prepare(
      'SELECT trait_category, trait_name, usage_count FROM trait_usage'
    ).all<TraitUsageRow>();

    const traits: Record<string, { usageCount: number; surchargeXch: number }> = {};
    for (const r of traitRows.results || []) {
      const key = `${r.trait_category}_${r.trait_name}`;
      traits[key] = {
        usageCount: r.usage_count,
        surchargeXch: Math.round(surchargeXch(r.usage_count) * 1000) / 1000,
      };
    }

    const supplyRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
    ).first<{ count: number }>();
    const minted = supplyRow?.count ?? 0;

    const floorRow = await env.DB.prepare(
      'SELECT floor_xch FROM floor_price_snapshots ORDER BY snapshot_date DESC LIMIT 1'
    ).first<{ floor_xch: number }>();
    const floorPrice = floorRow ? floorRow.floor_xch / 100 : 1.0;

    return new Response(
      JSON.stringify({
        traits,
        supply: { minted, total: SUPPLY_TOTAL },
        floorPrice: Math.round(floorPrice * 1000) / 1000,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Pricing] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
