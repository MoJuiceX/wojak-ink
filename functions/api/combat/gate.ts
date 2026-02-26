// GET /api/combat/gate?wallet=xxx
// Returns: { hasAccess: boolean, farmersPlotCount: number, wojakCount: number }
// Check if the wallet holds Farmers Plot NFT and count Wojaks

import { jsonResponse, errorResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const wallet = url.searchParams.get('wallet');

    if (!wallet) {
      return errorResponse('Missing wallet parameter', 400);
    }

    const db = context.env.DB;

    // Check game_players for phase1 verification by wallet
    const player = await db.prepare(
      'SELECT did_id, phase1_verified, phase1_nft_count FROM game_players WHERE wallet_address = ?'
    ).bind(wallet).first<{ did_id: string; phase1_verified: number; phase1_nft_count: number }>();

    if (player) {
      // Player is registered, check phase1 verification
      const hasAccess = player.phase1_verified === 1 || (player.phase1_nft_count ?? 0) > 0;

      // Count Wojaks (phase2 NFTs) — column is `collection`, not `collection_id`
      const wojakRow = await db.prepare(
        "SELECT COUNT(*) as cnt FROM did_holdings WHERE did_id = ? AND collection = 'phase2'"
      ).bind(player.did_id).first<{ cnt: number }>();

      return jsonResponse({
        hasAccess,
        farmersPlotCount: player.phase1_nft_count ?? (player.phase1_verified ? 1 : 0),
        wojakCount: wojakRow?.cnt ?? 0,
      });
    }

    // Player not registered - check did_holdings by wallet's DID
    // First find the DID for this wallet
    const didRow = await db.prepare(
      'SELECT did_id FROM game_players WHERE wallet_address = ? LIMIT 1'
    ).bind(wallet).first<{ did_id: string }>();

    if (!didRow) {
      // No player record, assume no access
      return jsonResponse({
        hasAccess: false,
        farmersPlotCount: 0,
        wojakCount: 0,
      });
    }

    // Check did_holdings for Farmers Plot NFTs
    const holdings = await db.prepare(
      "SELECT COUNT(*) as cnt FROM did_holdings WHERE did_id = ? AND collection = 'phase1'"
    ).bind(didRow.did_id).first<{ cnt: number }>();

    // Count Wojaks (phase2 NFTs)
    const wojakRow = await db.prepare(
      "SELECT COUNT(*) as cnt FROM did_holdings WHERE did_id = ? AND collection = 'phase2'"
    ).bind(didRow.did_id).first<{ cnt: number }>();

    const count = holdings?.cnt ?? 0;
    return jsonResponse({
      hasAccess: count > 0,
      farmersPlotCount: count,
      wojakCount: wojakRow?.cnt ?? 0,
    });
  } catch (error) {
    console.error('[api/combat/gate] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
