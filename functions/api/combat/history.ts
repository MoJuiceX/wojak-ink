// functions/api/combat/history.ts
// GET /api/combat/history?nftId=xxx&limit=20

import { jsonResponse, errorResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const nftId = url.searchParams.get('nftId');
    const limitParam = url.searchParams.get('limit') ?? '20';

    if (!nftId) return errorResponse('Missing nftId parameter');

    const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 50);

    const db = context.env.DB;

    const results = await db.prepare(
      `SELECT * FROM combat_battles
       WHERE (fighter_a_nft = ? OR fighter_b_nft = ?)
         AND status = 'completed'
       ORDER BY ended_at DESC
       LIMIT ?`
    ).bind(nftId, nftId, limit).all();

    const battles = (results.results ?? []).map((row: Record<string, unknown>) => {
      const side = row.fighter_a_nft === nftId ? 'a' : 'b';
      const isWinner = row.winner_nft === nftId;
      const isDraw = !row.winner_nft;
      const result = isDraw ? 'draw' : isWinner ? 'win' : 'loss';

      return {
        id: row.id,
        result,
        opponent: side === 'a' ? row.fighter_b_nft : row.fighter_a_nft,
        eloChange: side === 'a' ? row.elo_change_a : row.elo_change_b,
        xpAwarded: side === 'a' ? row.xp_awarded_a : row.xp_awarded_b,
        turns: row.current_turn - 1,
        endedAt: row.ended_at,
      };
    });

    return jsonResponse({ nftId, battles });
  } catch (error) {
    console.error('[api/combat/history] Unhandled error:', error);
    return Response.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
};
