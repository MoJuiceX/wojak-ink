// functions/api/combat/vote-xp.ts
// POST /api/combat/vote-xp — Award XP to combat fighters from net upvotes
// Called by DID indexer worker or admin. Requires ADMIN_SECRET.
//
// For each fighter with a matching wojak_scores entry:
// 1. Calculate net votes received since last calculation
// 2. Award XP_PER_NET_LIKE (2) XP per net positive vote
// 3. Update tracking timestamp

import { jsonResponse, errorResponse } from './_shared';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const XP_PER_NET_LIKE = 2;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Admin auth
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  const db = context.env.DB;

  // Find all fighters that have a matching wojak_scores entry (joined by nft_id).
  // For fighters that have never had vote XP calculated (vote_xp_last_updated IS NULL),
  // use all net_score. For others, use the delta since last calculation.
  const fighters = await db.prepare(`
    SELECT
      cf.nft_id,
      cf.xp,
      cf.level,
      cf.vote_xp_last_updated,
      ws.net_score,
      ws.last_voted_at
    FROM combat_fighters cf
    INNER JOIN wojak_scores ws ON cf.nft_id = ws.nft_id
    WHERE ws.net_score > 0
      AND (cf.vote_xp_last_updated IS NULL OR ws.last_voted_at > cf.vote_xp_last_updated)
  `).all();

  if (!fighters.results || fighters.results.length === 0) {
    return jsonResponse({ success: true, updated: 0, message: 'No fighters with new votes' });
  }

  let updated = 0;
  let totalXpAwarded = 0;

  for (const row of fighters.results) {
    const nftId = row.nft_id as string;
    const currentXp = row.xp as number;
    const currentLevel = row.level as number;
    const netScore = row.net_score as number;
    const lastUpdated = row.vote_xp_last_updated as string | null;

    // For first-time calculation, award XP = max(0, netScore) * XP_PER_NET_LIKE.
    // For subsequent runs, skip until we have delta tracking (Task 11).
    if (lastUpdated !== null) {
      continue;
    }

    const voteXp = Math.max(0, netScore) * XP_PER_NET_LIKE;
    if (voteXp <= 0) continue;

    const newXp = currentXp + voteXp;

    // Calculate new level from XP thresholds
    const levelRow = await db.prepare(
      'SELECT MAX(level) as new_level FROM combat_level_thresholds WHERE xp_required <= ?'
    ).bind(newXp).first<{ new_level: number }>();
    const newLevel = levelRow?.new_level ?? currentLevel;

    await db.prepare(`
      UPDATE combat_fighters
      SET xp = ?, level = ?, vote_xp_last_updated = datetime('now'), updated_at = datetime('now')
      WHERE nft_id = ?
    `).bind(newXp, newLevel, nftId).run();

    updated++;
    totalXpAwarded += voteXp;
  }

  return jsonResponse({ success: true, updated, totalXpAwarded });
};
