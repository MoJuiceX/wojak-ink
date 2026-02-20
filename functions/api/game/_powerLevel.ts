// Shared power level calculation logic
// Used by: vote.ts, battle-resolve.ts, did-indexer, power-level.ts

import { POWER_LEVEL_MAX } from './_shared';

// Scoring weights
const QUALITY_WEIGHT = 1.0;
const VALUE_BASE = 50;
const VALUE_LOG_SCALE = 30;
const BREADTH_BONUS = 15;
const CREATOR_QUALITY_WEIGHT = 0.5;
const CREATOR_SPREAD_BONUS = 10;
const BURN_POWER_BONUS = 50;

/**
 * Recalculate and update power level for a single player.
 * Returns the new power level, or null if player not found.
 */
export async function recalcPowerLevel(db: D1Database, did: string): Promise<number | null> {
  const player = await db.prepare(
    'SELECT wallet_address, phase1_verified FROM game_players WHERE did_id = ?'
  ).bind(did).first<{ wallet_address: string; phase1_verified: number }>();

  if (!player) return null;

  // Only calculate for verified holders
  if (!player.phase1_verified) {
    return 0;
  }

  const walletAddress = player.wallet_address;

  // Burn power bonuses: +50 per assigned grant for each NFT the DID holds
  const burnBonusByNft = new Map<string, number>();
  try {
    const burnBonusRows = await db.prepare(`
      SELECT nft_id, COUNT(*) as cnt FROM burn_power_grants
      WHERE did_id = ? AND nft_id IS NOT NULL
      GROUP BY nft_id
    `).bind(did).all<{ nft_id: string; cnt: number }>();
    for (const row of burnBonusRows.results ?? []) {
      burnBonusByNft.set(row.nft_id, row.cnt);
    }
  } catch {
    // Table may not exist before migration 076
  }

  // Calculate holdings score
  const holdings = await db.prepare(`
    SELECT
      dh.nft_id,
      dh.creator_wallet,
      COALESCE(ws.net_score, 0) as net_score,
      COALESCE(pm.trait_surcharge_xch, 0) as surcharge
    FROM did_holdings dh
    LEFT JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
    LEFT JOIN phase2_mints pm ON pm.mint_number = dh.edition_number
    WHERE dh.did_id = ? AND dh.collection = 'phase2'
  `).bind(did).all();

  let holdingsScore = 0;
  const seenCreators = new Set<string>();

  for (const nft of holdings.results) {
    const quality = (nft.net_score as number) * QUALITY_WEIGHT;
    const surchargeXch = (nft.surcharge as number) / 100000;
    const value = VALUE_BASE + VALUE_LOG_SCALE * Math.log(1 + surchargeXch);

    let breadth = 0;
    const creator = nft.creator_wallet as string;
    if (creator && creator !== walletAddress && !seenCreators.has(creator)) {
      seenCreators.add(creator);
      breadth = BREADTH_BONUS;
    }

    const burnBonus = (burnBonusByNft.get(nft.nft_id as string) ?? 0) * BURN_POWER_BONUS;
    holdingsScore += quality + value + breadth + burnBonus;
  }

  // Calculate creations score
  const creationStats = await db.prepare(`
    SELECT
      COALESCE(SUM(ws.net_score), 0) as total_net_score,
      COUNT(DISTINCT dh.did_id) as unique_collectors
    FROM wojak_scores ws
    LEFT JOIN did_holdings dh ON dh.nft_id = ws.nft_id AND dh.did_id != ?
    WHERE ws.creator_wallet = ?
  `).bind(did, walletAddress).first();

  const creatorQuality = ((creationStats?.total_net_score as number) || 0) * CREATOR_QUALITY_WEIGHT;
  const creatorSpread = ((creationStats?.unique_collectors as number) || 0) * CREATOR_SPREAD_BONUS;
  const creationsScore = creatorQuality + creatorSpread;

  // Total power level
  const rawTotal = holdingsScore + creationsScore;
  const powerLevel = Math.max(0, Math.min(POWER_LEVEL_MAX, Math.round(rawTotal)));

  // Update the database
  await db.prepare(`
    UPDATE game_players
    SET power_level = ?, power_level_updated_at = datetime('now'), updated_at = datetime('now')
    WHERE did_id = ?
  `).bind(powerLevel, did).run();

  return powerLevel;
}

/**
 * Get the DID that holds a specific NFT.
 * Returns null if not held by any registered player.
 */
export async function getNftHolderDid(db: D1Database, nftId: string): Promise<string | null> {
  const holder = await db.prepare(
    'SELECT did_id FROM did_holdings WHERE nft_id = ?'
  ).bind(nftId).first<{ did_id: string }>();
  return holder?.did_id ?? null;
}

/**
 * Get the DID of the creator of an NFT (by wallet address).
 * Returns null if creator is not a registered player.
 */
export async function getNftCreatorDid(db: D1Database, nftId: string): Promise<string | null> {
  // Get creator wallet from wojak_scores or phase2_mints
  const creatorRow = await db.prepare(`
    SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?
    UNION ALL
    SELECT wallet_address AS creator_wallet FROM phase2_mints WHERE mintgarden_launcher_id = ?
    LIMIT 1
  `).bind(nftId, nftId).first<{ creator_wallet: string }>();

  if (!creatorRow?.creator_wallet) return null;

  // Find the DID for this wallet
  const player = await db.prepare(
    'SELECT did_id FROM game_players WHERE wallet_address = ?'
  ).bind(creatorRow.creator_wallet).first<{ did_id: string }>();

  return player?.did_id ?? null;
}
