// NFT ownership utilities
// Used by: vote.ts, battle-resolve.ts

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
  const creatorRow = await db.prepare(`
    SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?
    UNION ALL
    SELECT wallet_address AS creator_wallet FROM phase2_mints WHERE mintgarden_launcher_id = ?
    LIMIT 1
  `).bind(nftId, nftId).first<{ creator_wallet: string }>();

  if (!creatorRow?.creator_wallet) return null;

  const player = await db.prepare(
    'SELECT did_id FROM game_players WHERE wallet_address = ?'
  ).bind(creatorRow.creator_wallet).first<{ did_id: string }>();

  return player?.did_id ?? null;
}
