/**
 * Mint Pricing API — /api/mint/pricing
 *
 * GET (no params)
 *
 * Returns trait surcharges (fair-share pricing with decay), supply count,
 * and floor price. Used by Generator for dynamic pricing display.
 *
 * Response: {
 *   traits: { [traitKey]: { usageCount, effectiveUsage, surchargeXch, fairShare, percentOfFairShare } },
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
  SURCHARGE_FAIR_SHARES,
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
      fairShare: number;
      percentOfFairShare: number;
    }

    const traits: Record<string, TraitPricing> = {};
    for (const r of traitRows.results || []) {
      const decayed = applyDecay(r.effective_usage, r.last_decay_at);
      const fairShare = SURCHARGE_FAIR_SHARES[r.trait_category] || 0;
      const sc = surchargeXch(decayed, r.trait_category, r.trait_name);

      const key = `${r.trait_category}_${r.trait_name}`;
      traits[key] = {
        usageCount: r.usage_count,
        effectiveUsage: Math.round(decayed * 100) / 100,
        surchargeXch: Math.round(sc * 1000) / 1000,
        fairShare,
        percentOfFairShare: fairShare > 0 ? Math.round(decayed / fairShare * 100) : 0,
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

    return jsonResponse({
      traits,
      supply: { minted, total: SUPPLY_TOTAL },
      floorPrice: Math.round(floorPrice * 1000) / 1000,
    });
  } catch (error) {
    console.error('[Mint Pricing] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
