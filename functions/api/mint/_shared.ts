/**
 * Shared utilities for mint API endpoints.
 * Centralizes CORS headers and common helpers to eliminate duplication.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

export function optionsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

export { isValidChiaAddress } from '../../lib/validation';

// ─── Core mint constants ───

export const TOTAL_SUPPLY = 4200;
export const FREE_MINT_CREDITS = 10000; // 100 credits in x100 units
export const BASE_PRICE_XCH = 0.2;
export const OFFER_EXPIRY_MINUTES = 15;

// ─── Surcharge: Fair-Share Pricing ───
export const SURCHARGE_RAMP_RATE = 1.0;
export const SURCHARGE_PENALTY_SCALE = 8.0;
export const SURCHARGE_PENALTY_EXPONENT = 2.0;
export const DECAY_HALF_LIFE_DAYS = 30;

/** Fair share = ideal usage per trait if all traits used equally */
export const SURCHARGE_FAIR_SHARES: Record<string, number> = {
  'Head': Math.round(TOTAL_SUPPLY / 40),       // 105
  'Clothes': Math.round(TOTAL_SUPPLY / 36),     // 117
  'Face Wear': Math.round(TOTAL_SUPPLY / 18),   // 233
};

/** Only these categories have surcharges */
export const SURCHARGE_CATEGORIES = new Set(Object.keys(SURCHARGE_FAIR_SHARES));

/** Free mint premium tier: top N most popular traits per category cost extra credits */
export const PREMIUM_TOP_N = 3;

/** Trait values within surcharge categories that are exempt (none/default) */
export const SURCHARGE_EXEMPT_TRAITS = new Set([
  'No Headgear',
  'No Face Wear',
]);

/**
 * Calculate surcharge for a trait based on its effective (decayed) usage
 * and the fair share for its category.
 *
 * Formula: RAMP_RATE × r + PENALTY_SCALE × max(0, r - 1)²
 * where r = effectiveUsage / fairShare
 *
 * Returns 0 if the category has no surcharge or the trait is exempt.
 */
export function surchargeXch(
  effectiveUsage: number,
  traitCategory: string,
  traitDisplayName?: string
): number {
  const fairShare = SURCHARGE_FAIR_SHARES[traitCategory];
  if (!fairShare) return 0; // Category not surcharge-eligible

  if (traitDisplayName && SURCHARGE_EXEMPT_TRAITS.has(traitDisplayName)) return 0;

  const ratio = effectiveUsage / fairShare;
  const ramp = SURCHARGE_RAMP_RATE * ratio;
  const overshoot = Math.max(0, ratio - 1);
  const penalty = SURCHARGE_PENALTY_SCALE * Math.pow(overshoot, SURCHARGE_PENALTY_EXPONENT);
  return ramp + penalty;
}

/**
 * Apply time decay to an effective usage score.
 * Returns the decayed score based on time elapsed since last decay.
 */
export function applyDecay(effectiveUsage: number, lastDecayAt: string): number {
  const now = Date.now();
  const lastDecay = new Date(lastDecayAt).getTime();
  const daysSinceDecay = (now - lastDecay) / (1000 * 60 * 60 * 24);
  if (daysSinceDecay <= 0) return effectiveUsage;

  const decayFactor = Math.pow(0.5, daysSinceDecay / DECAY_HALF_LIFE_DAYS);
  return effectiveUsage * decayFactor;
}

/**
 * Internal API header for server-to-server calls (e.g. prepare → upload).
 * Prevents public abuse of the upload endpoint.
 */
export const INTERNAL_API_HEADER = 'X-Internal-Mint-Request';
