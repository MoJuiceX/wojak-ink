// GET /api/combat/burn-power-bonus?did=xxx
// Returns unassigned +50 power bonus count for the DID.

import { jsonResponse, errorResponse, isValidDid } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did');

    if (!did) {
      return errorResponse('Missing did parameter', 400);
    }

    if (!isValidDid(did)) {
      return errorResponse('Invalid DID format', 400);
    }

    const db = context.env.DB;

    const row = await db.prepare(`
      SELECT COUNT(*) as cnt FROM burn_power_grants
      WHERE did_id = ? AND nft_id IS NULL
    `).bind(did).first<{ cnt: number }>();

    return jsonResponse({
      success: true,
      unassignedCount: row?.cnt ?? 0,
    });
  } catch (error) {
    console.error('[api/combat/burn-power-bonus] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
