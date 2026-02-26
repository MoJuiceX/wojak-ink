// POST /api/combat/burn-assign-power
// Body: { did: string, nftId: string }
// Assigns one unassigned +50 burn power bonus to an NFT the DID owns.

import { jsonResponse, errorResponse, isValidDid } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { did?: string; nftId?: string };
    const { did, nftId } = body;

    if (!did || !nftId) {
      return errorResponse('Missing did or nftId', 400);
    }

    if (!isValidDid(did)) {
      return errorResponse('Invalid DID format', 400);
    }

    const db = context.env.DB;

    // Find one unassigned grant for this DID
    const grant = await db.prepare(`
      SELECT id FROM burn_power_grants
      WHERE did_id = ? AND nft_id IS NULL
      ORDER BY id ASC LIMIT 1
    `).bind(did).first<{ id: number }>();

    if (!grant) {
      return errorResponse('No unassigned +50 power bonus. Burn a Wojak to earn one.', 400);
    }

    // Verify DID owns this NFT
    const held = await db.prepare(
      'SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ? AND collection = \'phase2\''
    ).bind(did, nftId).first();

    if (!held) {
      return errorResponse('You do not own this Wojak', 403);
    }

    await db.prepare(
      'UPDATE burn_power_grants SET nft_id = ? WHERE id = ?'
    ).bind(nftId, grant.id).run();

    return jsonResponse({
      success: true,
      nftId,
      message: '+50 power assigned.',
    });
  } catch (error) {
    console.error('[api/combat/burn-assign-power] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
