/**
 * Shared utilities for mint API endpoints.
 * Centralizes CORS headers and common helpers to eliminate duplication.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

/**
 * Validate Chia bech32m wallet address format.
 * xch1 prefix + 58 bech32 characters = 62 total.
 */
export function isValidChiaAddress(address: string): boolean {
  return /^xch1[a-z0-9]{58}$/.test(address);
}

/**
 * Surcharge formula (used by prepare.ts and pricing.ts).
 * Centralised here as single source of truth.
 */
export const SURCHARGE_BASE = 0.2;
export const SURCHARGE_USES_DIVISOR = 20;
export function surchargeXch(usageCount: number): number {
  return SURCHARGE_BASE * Math.log(1 + usageCount / SURCHARGE_USES_DIVISOR);
}

/**
 * Internal API header for server-to-server calls (e.g. prepare → upload).
 * Prevents public abuse of the upload endpoint.
 */
export const INTERNAL_API_HEADER = 'X-Internal-Mint-Request';
