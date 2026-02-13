/**
 * Mint Status API — /api/mint/status
 *
 * GET ?wallet=xch1...
 *
 * Checks for any active pending mints for a wallet.
 * Used by the Generator to resume countdown after page reload.
 *
 * Response: {
 *   pending: null | {
 *     mintId: number,
 *     offerFile: string | null,
 *     mintType: 'paid' | 'free',
 *     totalPriceXch: number | null,
 *     expiresAt: string | null,
 *     createdAt: string,
 *     layers: object,
 *     colors: object
 *   }
 * }
 */

import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
} from './_shared';

interface Env {
  DB: D1Database;
}

interface PendingMintRow {
  id: number;
  offer_file: string | null;
  mint_type: string;
  total_price_xch: number | null;
  expires_at: string | null;
  created_at: string;
  layers_json: string;
  colors_json: string;
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

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');

  if (!wallet || !isValidChiaAddress(wallet)) {
    return errorResponse('Missing or invalid wallet parameter.', 400);
  }

  try {
    // First, expire stale pending mints
    await env.DB
      .prepare(
        `UPDATE phase2_mints
         SET status = 'expired'
         WHERE status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at < datetime('now')`
      )
      .run();

    // Check for active pending mints
    const pending = await env.DB
      .prepare(
        `SELECT id, offer_file, mint_type, total_price_xch, expires_at, created_at,
                layers_json, colors_json
         FROM phase2_mints
         WHERE wallet_address = ?
         AND status = 'pending'
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .bind(wallet)
      .first<PendingMintRow>();

    if (!pending) {
      return jsonResponse({ pending: null });
    }

    // Parse JSON fields safely
    let layers = {};
    let colors = {};
    try {
      layers = JSON.parse(pending.layers_json);
      colors = JSON.parse(pending.colors_json);
    } catch {
      // If JSON is malformed, return empty objects
    }

    return jsonResponse({
      pending: {
        mintId: pending.id,
        offerFile: pending.offer_file,
        mintType: pending.mint_type,
        totalPriceXch: pending.total_price_xch ? pending.total_price_xch / 100000 : null,
        expiresAt: pending.expires_at,
        createdAt: pending.created_at,
        layers,
        colors,
      },
    });
  } catch (error) {
    console.error('[Mint Status] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
