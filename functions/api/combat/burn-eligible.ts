// GET /api/combat/burn-eligible
// Returns Wojaks in the bottom 25% by power_score (eligible for burn rewards)
// Query params: ownerDid (optional), limit (default 100), offset (default 0)

import { jsonResponse, errorResponse, isValidDid } from './_shared';

interface Env {
  DB: D1Database;
}

interface BurnEligibleRow {
  nft_id: string;
  edition_number: number;
  owner_did: string;
  power_score: number;
  vote_power: number;
  battle_power: number;
  combat_type: string;
  total_combat_wins: number;
  total_combat_losses: number;
  owner_name: string | null;
  minter_wallet: string | null;
  minter_did: string | null;
  ipfs_image_uri: string | null;
  custom_name: string | null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const ownerDid = url.searchParams.get('ownerDid');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (ownerDid && !isValidDid(ownerDid)) {
      return errorResponse('Invalid DID format', 400);
    }

    const db = context.env.DB;

    // Calculate 25th percentile threshold
    // NTILE(4) divides into 4 quartiles; quartile 1 is bottom 25%
    const thresholdRow = await db.prepare(`
      WITH ranked AS (
        SELECT power_score,
          NTILE(4) OVER (ORDER BY power_score ASC) as quartile
        FROM combat_fighters
        WHERE burned_at IS NULL
      )
      SELECT MAX(power_score) as threshold FROM ranked WHERE quartile = 1
    `).first<{ threshold: number }>();

    const threshold = thresholdRow?.threshold ?? 0;

    // When listing "your" burnable, exclude self-minted (only show Wojaks you bought)
    let ownerWallet: string | null = null;
    if (ownerDid) {
      const ownerRow = await db.prepare(
        'SELECT wallet_address FROM game_players WHERE did_id = ?'
      ).bind(ownerDid).first<{ wallet_address: string }>();
      ownerWallet = ownerRow?.wallet_address ?? null;
    }

    // Build query for eligible fighters
    let query = `
      SELECT
        cf.nft_id, cf.edition_number, cf.owner_did, cf.power_score,
        cf.vote_power, cf.battle_power, cf.combat_type,
        cf.total_combat_wins, cf.total_combat_losses,
        dp.display_name as owner_name,
        pm.wallet_address as minter_wallet,
        gp.did_id as minter_did,
        pm.ipfs_image_uri,
        nn.custom_name
      FROM combat_fighters cf
      LEFT JOIN did_profiles dp ON cf.owner_did = dp.did_id
      LEFT JOIN phase2_mints pm ON cf.nft_id = pm.mintgarden_launcher_id
      LEFT JOIN game_players gp ON pm.wallet_address = gp.wallet_address
      LEFT JOIN nft_names nn ON cf.edition_number = nn.edition_number
      WHERE cf.power_score <= ?
        AND cf.burned_at IS NULL
    `;
    const params: (string | number)[] = [threshold];

    if (ownerDid) {
      query += ' AND cf.owner_did = ?';
      params.push(ownerDid);
    }
    if (ownerWallet != null) {
      query += ' AND (pm.wallet_address IS NULL OR pm.wallet_address != ?)';
      params.push(ownerWallet);
    }

    query += ' ORDER BY cf.power_score ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all<BurnEligibleRow>();

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM combat_fighters cf
      LEFT JOIN phase2_mints pm ON cf.nft_id = pm.mintgarden_launcher_id
      WHERE cf.power_score <= ?
        AND cf.burned_at IS NULL
    `;
    const countParams: (string | number)[] = [threshold];

    if (ownerDid) {
      countQuery += ' AND cf.owner_did = ?';
      countParams.push(ownerDid);
    }
    if (ownerWallet != null) {
      countQuery += ' AND (pm.wallet_address IS NULL OR pm.wallet_address != ?)';
      countParams.push(ownerWallet);
    }

    const countRow = await db.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    return jsonResponse({
      success: true,
      threshold,
      total: countRow?.total ?? 0,
      fighters: (result.results ?? []).map(row => ({
        nftId: row.nft_id,
        editionNumber: row.edition_number,
        ownerDid: row.owner_did,
        ownerName: row.owner_name,
        powerScore: row.power_score,
        votePower: row.vote_power,
        battlePower: row.battle_power,
        combatType: row.combat_type,
        wins: row.total_combat_wins,
        losses: row.total_combat_losses,
        minterWallet: row.minter_wallet,
        minterDid: row.minter_did,
        imageUri: `https://assets.mainnet.mintgarden.io/thumbnails/medium/${row.nft_id}.png`,
        customName: row.custom_name,
      })),
    });
  } catch (error) {
    console.error('[api/combat/burn-eligible] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
