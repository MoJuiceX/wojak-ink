// GET /api/game/leaderboard?limit=50&offset=0
// Returns ranked players by Power Level.

import { resolveImageUri } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const results = await context.env.DB.prepare(`
      SELECT
        gp.did_id,
        gp.wallet_address,
        gp.power_level,
        gp.total_votes_cast,
        gp.created_at,
        dp.display_name,
        topnft.nft_id AS top_nft_id,
        topnft.edition_number AS top_edition,
        topnft.ipfs_image_uri AS top_image_uri
      FROM game_players gp
      LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
      LEFT JOIN (
        SELECT dh.did_id, dh.nft_id, dh.edition_number, pm.ipfs_image_uri,
               ROW_NUMBER() OVER (PARTITION BY dh.did_id ORDER BY COALESCE(ws.net_score, 0) DESC) AS rn
        FROM did_holdings dh
        LEFT JOIN wojak_scores ws ON dh.nft_id = ws.nft_id
        LEFT JOIN phase2_mints pm ON dh.edition_number = pm.mint_number
      ) topnft ON topnft.did_id = gp.did_id AND topnft.rn = 1
      WHERE gp.phase1_verified = 1 AND gp.power_level > 0
      ORDER BY gp.power_level DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const total = await context.env.DB.prepare(
      'SELECT COUNT(*) as count FROM game_players WHERE phase1_verified = 1 AND power_level > 0'
    ).first();

    return Response.json({
      success: true,
      entries: results.results.map((row: Record<string, unknown>, i: number) => ({
        rank: offset + i + 1,
        did: row.did_id,
        walletAddress: row.wallet_address,
        displayName: row.display_name || null,
        powerLevel: row.power_level,
        totalVotesCast: row.total_votes_cast,
        topNft: row.top_nft_id ? {
          nftId: row.top_nft_id,
          editionNumber: row.top_edition,
          imageUri: resolveImageUri(row.top_image_uri as string | null),
        } : null,
      })),
      pagination: {
        limit,
        offset,
        total: (total?.count as number) || 0,
        hasMore: offset + limit < ((total?.count as number) || 0),
      },
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
