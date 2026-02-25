// Power calculation helpers for the DID power system
// DID Power = Plot Power + Wojak Power + Collection Bonus

import {
  PLOT_POWER_VALUE,
  COLLECTION_BONUS_PER_WOJAK,
  COLLECTION_BONUS_MAX,
} from '../game/_shared';

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
 * Calculate collection bonus for bought Wojaks from other creators
 * Simple formula: 10 power per bought Wojak, max 42 total
 */
export async function calculateCollectionBonus(
  db: D1Database,
  didId: string,
  walletAddress: string
): Promise<{
  bonus: number;
  collectedCount: number;
  uniqueCreators: number;
  bonusPerWojak: number;
}> {
  // Find Wojaks that:
  // 1. Are in the holder's DID
  // 2. Were BOUGHT (exist in sales_history with buyer = holder's wallet)
  // 3. Are from OTHER creators (creator_wallet != holder's wallet)
  const result = await db.prepare(`
    SELECT
      dh.nft_id,
      pm.wallet_address as creator_wallet,
      ws.net_score
    FROM did_holdings dh
    JOIN phase2_mints pm ON pm.mintgarden_launcher_id = dh.nft_id
    JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    JOIN sales_history sh ON sh.nft_id = dh.nft_id
      AND sh.buyer_address = ?
      AND sh.collection = 'phase2'
    WHERE dh.did_id = ?
      AND dh.collection = 'phase2'
      AND pm.wallet_address != ?
    ORDER BY ws.net_score DESC
  `).bind(walletAddress, didId, walletAddress).all();

  const collected = result.results || [];
  const collectedCount = collected.length;

  // Count unique creators (for display/stats only)
  const uniqueCreators = new Set(collected.map(w => w.creator_wallet as string)).size;

  // Simple formula: 10 per Wojak, capped at 42 total
  const rawBonus = collectedCount * COLLECTION_BONUS_PER_WOJAK;
  const bonus = Math.min(rawBonus, COLLECTION_BONUS_MAX);

  return { bonus, collectedCount, uniqueCreators, bonusPerWojak: COLLECTION_BONUS_PER_WOJAK };
}

/**
 * Calculate full power breakdown for a DID
 */
export async function calculateFullPower(
  db: D1Database,
  didId: string,
  walletAddress: string
): Promise<PowerBreakdown> {
  const [plotResult, wojakResult, collectionResult] = await Promise.all([
    calculatePlotPower(db, didId),
    calculateWojakPower(db, didId),
    calculateCollectionBonus(db, didId, walletAddress),
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
