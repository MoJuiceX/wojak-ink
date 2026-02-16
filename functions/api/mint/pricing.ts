/**
 * Mint Pricing API — /api/mint/pricing
 *
 * GET (no params)
 *
 * Returns trait surcharges (universal power curve with decay), supply count,
 * floor price, and top-3 most popular traits per surcharge category.
 *
 * Response: {
 *   traits: { [traitKey]: { usageCount, effectiveUsage, surchargeXch } },
 *   top3: { [category]: string[] },
 *   supply: { minted: number, total: 4200 },
 *   floorPrice: number
 * }
 */

import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  surchargeXch,
  applyDecay,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
} from './_shared';

interface Env {
  DB: D1Database;
}

const SUPPLY_TOTAL = 4200;

interface TraitUsageRow {
  trait_category: string;
  trait_name: string;
  usage_count: number;
  effective_usage: number;
  last_decay_at: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  if (!env.DB) {
    return errorResponse('Service not configured', 500);
  }

  try {
    const traitRows = await env.DB.prepare(
      'SELECT trait_category, trait_name, usage_count, effective_usage, last_decay_at FROM trait_usage'
    ).all<TraitUsageRow>();

    interface TraitPricing {
      usageCount: number;
      effectiveUsage: number;
      surchargeXch: number;
    }

    const traits: Record<string, TraitPricing> = {};

    // Build per-category lists for top-3 calculation
    const byCat: Record<string, { name: string; decayed: number }[]> = {};
    for (const cat of SURCHARGE_CATEGORIES) {
      byCat[cat] = [];
    }

    for (const r of traitRows.results || []) {
      const decayed = applyDecay(r.effective_usage, r.last_decay_at);
      const sc = surchargeXch(decayed, r.trait_category, r.trait_name);

      const key = `${r.trait_category}_${r.trait_name}`;
      traits[key] = {
        usageCount: r.usage_count,
        effectiveUsage: Math.round(decayed * 100) / 100,
        surchargeXch: Math.round(sc * 1000) / 1000,
      };

      // Track surchargeable traits for top-3
      if (SURCHARGE_CATEGORIES.has(r.trait_category) && !SURCHARGE_EXEMPT_TRAITS.has(r.trait_name)) {
        byCat[r.trait_category]?.push({ name: r.trait_name, decayed });
      }
    }

    // Top 3 most popular (by effective usage) per category
    const top3: Record<string, string[]> = {};
    for (const [cat, items] of Object.entries(byCat)) {
      items.sort((a, b) => b.decayed - a.decayed);
      top3[cat] = items.slice(0, 3).filter(t => t.decayed > 0).map(t => t.name);
    }

    const supplyRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
    ).first<{ count: number }>();
    const minted = supplyRow?.count ?? 0;

    const floorRow = await env.DB.prepare(
      'SELECT floor_xch FROM floor_price_snapshots ORDER BY snapshot_date DESC LIMIT 1'
    ).first<{ floor_xch: number }>();
    const floorPrice = floorRow ? floorRow.floor_xch / 100 : 1.0;

    const pausedRow = await env.DB.prepare(
      "SELECT value FROM server_state WHERE key = 'minting_paused'"
    ).first<{ value: string }>();
    const mintingPaused = pausedRow?.value === 'true';

    return jsonResponse({
      traits,
      top3,
      supply: { minted, total: SUPPLY_TOTAL },
      floorPrice: Math.round(floorPrice * 1000) / 1000,
      mintingPaused,
    });
  } catch (error) {
    console.error('[Mint Pricing] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
