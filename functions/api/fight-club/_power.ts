// Power calculation helpers for the DID power system
// DID Power = Plot Power + Wojak Power + Collection Bonus
// Single source of truth — used by my-score, vote-leaderboard, recalc-power-levels.

import { PLOT_POWER_VALUE } from '../game/_shared';

interface PowerBreakdown {
  plotPower: number;
  plotCount: number;
  wojakPower: number;
  wojakCount: number;
  collectionBonus: number;
  collectedWojakCount: number;
  uniqueCreatorsCount: number;
  totalPower: number;
}

/**
 * Calculate Farmer's Plot power (Phase 1 NFTs)
 */
export async function calculatePlotPower(
  db: D1Database,
  didId: string
): Promise<{ power: number; count: number }> {
  const result = await db.prepare(
    `SELECT COUNT(*) as cnt FROM did_holdings WHERE did_id = ? AND collection = 'phase1'`
  ).bind(didId).first<{ cnt: number }>();

  const count = result?.cnt || 0;
  return { power: count * PLOT_POWER_VALUE, count };
}

/**
 * Calculate Your Wojak power from vote scores (all Wojaks count)
 */
export async function calculateWojakPower(
  db: D1Database,
  didId: string
): Promise<{ power: number; count: number; wojaks: Array<{ nftId: string; score: number }> }> {
  const result = await db.prepare(`
    SELECT ws.nft_id, ws.net_score
    FROM did_holdings dh
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    WHERE dh.did_id = ? AND dh.collection = 'phase2'
    ORDER BY ws.net_score DESC, ws.total_votes DESC, ws.edition_number ASC
  `).bind(didId).all();

  const wojaks = (result.results || []).map(w => ({
    nftId: w.nft_id as string,
    score: (w.net_score as number) || 0,
  }));

  const power = wojaks.reduce((sum, w) => sum + w.score, 0);
  return { power, count: wojaks.length, wojaks };
}

/**
 * Calculate collection bonus for holding top-ranked Wojaks from other creators.
 * Formula: 10% of net_score for each qualifying Wojak.
 * Qualifying = in top 42% by net_score AND creator DID != holder DID.
 */
export async function calculateCollectionBonus(
  db: D1Database,
  didId: string,
): Promise<{
  bonus: number;
  collectedCount: number;
  uniqueCreators: number;
}> {
  // 1. Compute top 42% threshold across ALL Your Wojaks
  const thresholdResult = await db.prepare(`
    SELECT net_score as threshold FROM wojak_scores
    ORDER BY net_score DESC
    LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.42 AS INTEGER) FROM wojak_scores)
  `).first<{ threshold: number }>();
  const threshold = thresholdResult?.threshold ?? 0;

  // 2. Find qualifying Wojaks:
  //    - Held by this DID (phase2)
  //    - In top 42% by net_score
  //    - Creator's DID != holder DID (or creator has no registered DID)
  const result = await db.prepare(`
    SELECT
      dh.nft_id,
      ws.net_score,
      pm.wallet_address as creator_wallet,
      creator_gp.did_id as creator_did
    FROM did_holdings dh
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
    LEFT JOIN game_players creator_gp ON creator_gp.wallet_address = pm.wallet_address
    WHERE dh.did_id = ?
      AND dh.collection = 'phase2'
      AND ws.net_score >= ?
      AND (creator_gp.did_id IS NULL OR creator_gp.did_id != ?)
    ORDER BY ws.net_score DESC
  `).bind(didId, threshold, didId).all();

  const collected = result.results || [];
  const uniqueCreators = new Set(collected.map(w => w.creator_wallet as string)).size;

  // 3. Sum bonus: 10% of net_score per qualifying Wojak, floored at 0
  const bonus = collected.reduce((sum, w) => {
    const score = (w.net_score as number) || 0;
    return sum + Math.max(0, Math.floor(score * 0.10));
  }, 0);

  return { bonus, collectedCount: collected.length, uniqueCreators };
}

/**
 * Calculate full power breakdown for a DID
 */
export async function calculateFullPower(
  db: D1Database,
  didId: string,
): Promise<PowerBreakdown> {
  const [plotResult, wojakResult, collectionResult] = await Promise.all([
    calculatePlotPower(db, didId),
    calculateWojakPower(db, didId),
    calculateCollectionBonus(db, didId),
  ]);

  return {
    plotPower: plotResult.power,
    plotCount: plotResult.count,
    wojakPower: wojakResult.power,
    wojakCount: wojakResult.count,
    collectionBonus: collectionResult.bonus,
    collectedWojakCount: collectionResult.collectedCount,
    uniqueCreatorsCount: collectionResult.uniqueCreators,
    totalPower: plotResult.power + wojakResult.power + collectionResult.bonus,
  };
}
