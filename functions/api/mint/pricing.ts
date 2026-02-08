/**
 * Mint Pricing API — /api/mint/pricing
 *
 * GET
 *
 * Returns current trait surcharges, supply count, and floor price.
 * Public endpoint, no auth.
 *
 * Surcharge formula: 0.2 * ln(1 + usage_count / 20)
 * Only the highest surcharge applies per mint.
 *
 * Response: {
 *   basePriceXch: number,
 *   traits: Record<string, { usage: number, surcharge: number }>,
 *   supply: { minted: number, total: number, remaining: number },
 *   floorPrice: number | null
 * }
 */

interface Env {
  DB: D1Database;
  TRADE_VALUES_KV: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const BASE_PRICE_XCH = 0.2;
const MAX_SUPPLY = 4200;

// Dynamic pricing categories (Base and Background are exempt)
const DYNAMIC_PRICING_CATEGORIES = ['Head', 'Eyes', 'Clothes', 'Mouth'];

interface TraitUsageRow {
  trait_category: string;
  trait_name: string;
  usage_count: number;
}

/**
 * Calculate surcharge using logarithmic formula.
 * Starts near-linear (~0.01/use), slows after ~20 uses, uncapped.
 */
function calculateSurcharge(usageCount: number): number {
  if (usageCount <= 0) return 0;
  const surcharge = 0.2 * Math.log(1 + usageCount / 20);
  return Math.round(surcharge * 100000) / 100000; // 5 decimal places
}

/**
 * Expire stale pending mints for accurate supply count.
 */
async function expireStalePendingMints(db: D1Database): Promise<void> {
  try {
    await db
      .prepare(
        `UPDATE phase2_mints
         SET status = 'expired'
         WHERE status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at < datetime('now')`
      )
      .run();
  } catch (error) {
    console.error('[Mint Pricing] Error expiring stale mints:', error);
  }
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
    // Expire stale pending mints
    await expireStalePendingMints(env.DB);

    // Fetch all trait usage counts
    const traitResults = await env.DB
      .prepare(
        `SELECT trait_category, trait_name, usage_count
         FROM trait_usage
         WHERE trait_category IN ('Head', 'Eyes', 'Clothes', 'Mouth')
         ORDER BY trait_category, trait_name`
      )
      .all<TraitUsageRow>();

    // Build traits map with surcharges
    const traits: Record<string, { usage: number; surcharge: number; category: string }> = {};
    for (const row of traitResults.results || []) {
      const key = `${row.trait_category}:${row.trait_name}`;
      traits[key] = {
        usage: row.usage_count,
        surcharge: calculateSurcharge(row.usage_count),
        category: row.trait_category,
      };
    }

    // Get supply count (only confirmed mints)
    const supplyResult = await env.DB
      .prepare(
        `SELECT COUNT(*) as minted FROM phase2_mints WHERE status = 'minted'`
      )
      .first<{ minted: number }>();

    const minted = supplyResult?.minted || 0;

    // Get floor price from KV
    let floorPrice: number | null = null;
    try {
      const kvFloor = await env.TRADE_VALUES_KV.get('current_floor_price');
      if (kvFloor) {
        floorPrice = parseFloat(kvFloor);
      }
    } catch {
      // KV might not be available
    }

    return new Response(
      JSON.stringify({
        basePriceXch: BASE_PRICE_XCH,
        traits,
        supply: {
          minted,
          total: MAX_SUPPLY,
          remaining: MAX_SUPPLY - minted,
        },
        floorPrice,
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
