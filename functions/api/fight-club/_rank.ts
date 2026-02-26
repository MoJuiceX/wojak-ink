// Shared player rank calculation for Fight Club.
// Single source of truth — eliminates CTE duplication in vote-leaderboard.ts and my-score.ts.

import { PLOT_POWER_VALUE, COLLECTION_BONUS_TOP_PERCENT, COLLECTION_BONUS_RATE } from '../game/_shared';

/**
 * Shared CTE that computes total power for every verified player.
 * Used by both rank functions below.
 */
const PLAYER_SCORES_CTE = `
  WITH top_threshold AS (
    SELECT COALESCE(
      (SELECT net_score FROM wojak_scores
       ORDER BY net_score DESC
       LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * ${COLLECTION_BONUS_TOP_PERCENT} AS INTEGER) FROM wojak_scores)),
      0
    ) as threshold
  ),
  wojak_power_by_did AS (
    SELECT dh.did_id, COALESCE(SUM(ws.net_score), 0) AS wojak_power
    FROM did_holdings dh
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    WHERE dh.collection = 'phase2'
    GROUP BY dh.did_id
  ),
  plot_counts AS (
    SELECT did_id, COUNT(*) as plot_count
    FROM did_holdings WHERE collection = 'phase1'
    GROUP BY did_id
  ),
  collection_bonus AS (
    SELECT dh.did_id,
      SUM(CASE
        WHEN ws.net_score >= (SELECT threshold FROM top_threshold)
             AND (creator_gp.did_id IS NULL OR creator_gp.did_id != dh.did_id)
             AND CAST(ws.net_score * ${COLLECTION_BONUS_RATE} AS INTEGER) > 0
        THEN CAST(ws.net_score * ${COLLECTION_BONUS_RATE} AS INTEGER)
        ELSE 0
      END) as bonus
    FROM did_holdings dh
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
    LEFT JOIN game_players creator_gp ON creator_gp.wallet_address = pm.wallet_address
    WHERE dh.collection = 'phase2'
    GROUP BY dh.did_id
  ),
  player_scores AS (
    SELECT gp.did_id,
      COALESCE(pc.plot_count, 0) * ${PLOT_POWER_VALUE} as plot_power,
      COALESCE(wpd.wojak_power, 0) AS wojak_power,
      COALESCE(cb.bonus, 0) AS collection_bonus
    FROM game_players gp
    LEFT JOIN wojak_power_by_did wpd ON wpd.did_id = gp.did_id
    LEFT JOIN plot_counts pc ON pc.did_id = gp.did_id
    LEFT JOIN collection_bonus cb ON cb.did_id = gp.did_id
    WHERE gp.phase1_verified = 1
      AND gp.did_id IS NOT NULL AND gp.did_id != ''
  )
`;

/**
 * Get rank for a player given their pre-computed total power score.
 * Used by my-score.ts where calculateFullPower() already has the score.
 */
export async function getPlayerRankByScore(db: D1Database, playerScore: number): Promise<number | null> {
  // Only rank among players with non-zero power (excludes verified-but-inactive players)
  const query = `${PLAYER_SCORES_CTE}
    SELECT COUNT(*) + 1 AS rank
    FROM player_scores
    WHERE (plot_power + wojak_power + collection_bonus) > ?
      AND (plot_power + wojak_power + collection_bonus) > 0
  `;
  const result = await db.prepare(query).bind(playerScore).first<{ rank: number }>();
  return result?.rank ?? null;
}

/**
 * Get rank for a player by their DID.
 * Used by vote-leaderboard.ts where we only have the caller's DID.
 */
export async function getPlayerRankByDid(db: D1Database, did: string): Promise<number | null> {
  // Only rank among players with non-zero power (excludes verified-but-inactive players)
  const query = `${PLAYER_SCORES_CTE}
    SELECT COUNT(*) + 1 AS rank
    FROM player_scores
    WHERE (plot_power + wojak_power + collection_bonus) > (
      SELECT COALESCE(plot_power + wojak_power + collection_bonus, 0)
      FROM player_scores WHERE did_id = ?
    )
    AND (plot_power + wojak_power + collection_bonus) > 0
  `;
  const result = await db.prepare(query).bind(did).first<{ rank: number }>();
  return result?.rank ?? null;
}
