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

import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  surchargeXch,
} from './_shared';

interface Env {
  DB: D1Database;
}

const SUPPLY_TOTAL = 4200;

interface TraitUsageRow {
  trait_category: string;
  trait_name: string;
  usage_count: number;
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
