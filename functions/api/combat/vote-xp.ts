// POST /api/combat/vote-xp — Award XP from net upvotes (admin only)
// Delta-based: awards max(0, current_score - snapshot) * 2 XP

import { jsonResponse, errorResponse } from './_shared';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const XP_PER_NET_LIKE = 2;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization');
    if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    const db = context.env.DB;

    const fighters = await db.prepare(`
      SELECT cf.nft_id, cf.xp, cf.level, cf.vote_xp_net_snapshot, ws.net_score
      FROM combat_fighters cf
      INNER JOIN wojak_scores ws ON cf.nft_id = ws.nft_id
      WHERE ws.net_score > cf.vote_xp_net_snapshot
    `).all();

    if (!fighters.results || fighters.results.length === 0) {
      return jsonResponse({ success: true, updated: 0, totalXpAwarded: 0 });
    }

    let updated = 0;
    let totalXpAwarded = 0;

    for (const row of fighters.results) {
      const nftId = row.nft_id as string;
      const currentXp = row.xp as number;
      const currentLevel = row.level as number;
      const snapshot = row.vote_xp_net_snapshot as number;
      const netScore = row.net_score as number;

      const delta = netScore - snapshot;
      const voteXp = Math.max(0, delta) * XP_PER_NET_LIKE;
      if (voteXp <= 0) continue;

      const newXp = currentXp + voteXp;

      const levelRow = await db.prepare(
        'SELECT MAX(level) as new_level FROM combat_level_thresholds WHERE xp_required <= ?'
      ).bind(newXp).first<{ new_level: number }>();
      const newLevel = levelRow?.new_level ?? currentLevel;

      await db.prepare(`
        UPDATE combat_fighters
        SET xp = ?, level = ?, vote_xp_last_updated = datetime('now'), vote_xp_net_snapshot = ?, updated_at = datetime('now')
        WHERE nft_id = ?
      `).bind(newXp, newLevel, netScore, nftId).run();

      updated++;
      totalXpAwarded += voteXp;
    }

    return jsonResponse({ success: true, updated, totalXpAwarded });
  } catch (error) {
    console.error('[api/combat/vote-xp] Unhandled error:', error);
    return Response.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
};
