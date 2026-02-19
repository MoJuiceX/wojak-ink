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
export const BASE_PRICE_XCH = 0.1;
export const OFFER_EXPIRY_MINUTES = 15;

// ─── Surcharge: Universal Power Curve ───
// Formula: surcharge = SURCHARGE_SCALE × (effectiveUsage - 1) ^ SURCHARGE_EXPONENT
// Scale is auto-derived: targetSurcharge / (targetUses - 1) ^ exponent
export const SURCHARGE_TARGET_XCH = 1.275;
export const SURCHARGE_TARGET_USES = 200;
export const SURCHARGE_EXPONENT = 0.90;
export const SURCHARGE_SCALE = SURCHARGE_TARGET_XCH / Math.pow(SURCHARGE_TARGET_USES - 1, SURCHARGE_EXPONENT);
export const DECAY_HALF_LIFE_DAYS = 14;

/** Only these categories have surcharges */
export const SURCHARGE_CATEGORIES = new Set(['Head', 'Clothes', 'Face Wear']);

/** Free mint premium tier: top N most popular traits per category cost extra credits */
export const PREMIUM_TOP_N = 3;

/** Trait values within surcharge categories that are exempt (none/default) */
export const SURCHARGE_EXEMPT_TRAITS = new Set([
  'No Headgear',
  'No Face Wear',
]);

/**
 * Calculate surcharge for a trait based on its effective (decayed) usage.
 * Formula: SCALE × (effectiveUsage - 1) ^ EXPONENT
 * First use is free (surcharge = 0 when effectiveUsage <= 1).
 */
export function surchargeXch(
  effectiveUsage: number,
  traitCategory: string,
  traitDisplayName?: string
): number {
  if (!SURCHARGE_CATEGORIES.has(traitCategory)) return 0;
  if (traitDisplayName && SURCHARGE_EXEMPT_TRAITS.has(traitDisplayName)) return 0;
  if (effectiveUsage <= 1) return 0;

  return SURCHARGE_SCALE * Math.pow(effectiveUsage - 1, SURCHARGE_EXPONENT);
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
