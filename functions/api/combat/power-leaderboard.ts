// GET /api/combat/power-leaderboard
// Query params:
// - type: 'players' (default) or 'wojaks'
// - limit: number (default 50)
// - offset: number (default 0)

import { jsonResponse, errorResponse } from './_shared';
import { resolveImageUri } from '../game/_shared';
import { authenticateRequest } from '../../lib/auth';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

interface PlayerRanking {
  rank: number;
  did: string;            // Identity: DID if present, wallet address otherwise (backward compat)
  identity: string;       // Same as did (explicit naming)
  isDid: boolean;         // true if identity is a DID, false if wallet address
  displayName: string;
  wojakCount: number;
  totalPower: number;
  bestWojakPower: number;
  bestWojakImage: string; // Resolved IPFS image URL of their highest-power Wojak
}

interface WojakRanking {
  rank: number;
  nftId: string;
  edition: number;
  imageUrl: string;
  combatType: string;
  powerScore: number;
  votePower: number;
  battlePower: number;
  likes: number;
  dislikes: number;
  wins: number;
  losses: number;
  draws: number;
  ownerName: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const type = url.searchParams.get('type') || 'players';
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
    const sort = url.searchParams.get('sort') || 'power';

    // Get caller's DID if authenticated (for "your rank" indicator)
    let callerDid: string | null = null;
    if (context.env.CLERK_DOMAIN) {
      const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
      callerDid = (auth?.payload?.did as string) || null;
    }

    const db = context.env.DB;

    if (type === 'players') {
      // Players: connected DID; show if they hold ≥1 Farmers Plot OR have power (so existing data shows).
      // Power = sum of their Wojaks' power only (from combat_fighters), not Farmers Plot.
      const playersQuery = `
        SELECT
          gp.did_id AS did,
          dp.display_name,
          COUNT(cf.nft_id) as wojak_count,
          COALESCE(SUM(COALESCE(cf.power_score, 0)), 0) as total_power,
          COALESCE(MAX(cf.power_score), 0) as best_wojak_power,
          (
            SELECT pm2.ipfs_image_uri
            FROM combat_fighters cf2
            JOIN phase2_mints pm2 ON pm2.mintgarden_launcher_id = cf2.nft_id AND pm2.status = 'minted'
            WHERE cf2.owner_did = gp.did_id AND (cf2.burned_at IS NULL OR cf2.burned_at = '')
            ORDER BY cf2.power_score DESC
            LIMIT 1
          ) as best_wojak_image
        FROM game_players gp
        LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
        LEFT JOIN combat_fighters cf ON cf.owner_did = gp.did_id
          AND (cf.burned_at IS NULL OR cf.burned_at = '')
        WHERE gp.did_id IS NOT NULL AND gp.did_id != ''
          AND (gp.phase1_verified = 1 OR gp.power_level > 0 OR EXISTS (
            SELECT 1 FROM combat_fighters c2 WHERE c2.owner_did = gp.did_id AND (c2.burned_at IS NULL OR c2.burned_at = '')
          ))
        GROUP BY gp.did_id
        ORDER BY total_power DESC
        LIMIT ? OFFSET ?
      `;

      const results = await db.prepare(playersQuery).bind(limit, offset).all();

      const players: PlayerRanking[] = (results.results || []).map((row: Record<string, unknown>, idx: number) => {
        const did = (row.did as string) || '';
        let displayName = row.display_name as string | null;
        if (!displayName) displayName = did ? `${did.slice(0, 12)}...` : 'Anon';

        return {
          rank: offset + idx + 1,
          did,
          identity: did,
          isDid: true,
          displayName,
          wojakCount: (row.wojak_count as number) || 0,
          totalPower: (row.total_power as number) || 0,
          bestWojakPower: (row.best_wojak_power as number) || 0,
          bestWojakImage: resolveImageUri(row.best_wojak_image as string | null),
        };
      });

      // Caller's rank among same set (by Wojak power sum)
      let yourRank: number | null = null;
      if (callerDid) {
        const yourRankQuery = `
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT gp.did_id,
                   COALESCE(SUM(COALESCE(cf.power_score, 0)), 0) as total_power
            FROM game_players gp
            LEFT JOIN combat_fighters cf ON cf.owner_did = gp.did_id
              AND (cf.burned_at IS NULL OR cf.burned_at = '')
            WHERE gp.did_id IS NOT NULL AND gp.did_id != ''
              AND (gp.phase1_verified = 1 OR gp.power_level > 0 OR EXISTS (
                SELECT 1 FROM combat_fighters c2 WHERE c2.owner_did = gp.did_id AND (c2.burned_at IS NULL OR c2.burned_at = '')
              ))
            GROUP BY gp.did_id
          ) sub
          WHERE sub.total_power > (
            SELECT COALESCE(SUM(COALESCE(cf.power_score, 0)), 0)
            FROM combat_fighters cf
            WHERE cf.owner_did = ? AND (cf.burned_at IS NULL OR cf.burned_at = '')
          )
        `;
        const rankResult = await db.prepare(yourRankQuery).bind(callerDid).first<{ rank: number }>();
        yourRank = rankResult?.rank ?? null;
      }

      return jsonResponse({ players, yourRank });
    } else if (type === 'wojaks') {
      // Determine sort order
      const sortOrders: Record<string, string> = {
        power: 'COALESCE(cf.power_score, ws.net_score, 0) DESC, a.edition_number ASC',
        likes: 'COALESCE(ws.likes, 0) DESC, a.edition_number ASC',
        hot: '(COALESCE(ws.likes, 0) - COALESCE(ws.dislikes, 0)) DESC, a.edition_number ASC',
        ratio: 'CASE WHEN COALESCE(ws.likes, 0) + COALESCE(ws.dislikes, 0) > 0 THEN CAST(COALESCE(ws.likes, 0) AS REAL) / (COALESCE(ws.likes, 0) + COALESCE(ws.dislikes, 0)) ELSE 0 END DESC, COALESCE(ws.likes, 0) DESC',
        battles: 'COALESCE(cf.total_combat_wins, 0) DESC, a.edition_number ASC',
        newest: 'a.edition_number DESC',
      };
      const orderBy = sortOrders[sort] || sortOrders.power;

      // Total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT mintgarden_launcher_id FROM phase2_mints
          WHERE status = 'minted' AND mintgarden_launcher_id IS NOT NULL
          UNION
          SELECT ws.nft_id FROM wojak_scores ws
          WHERE ws.nft_id NOT IN (
            SELECT mintgarden_launcher_id FROM phase2_mints
            WHERE status = 'minted' AND mintgarden_launcher_id IS NOT NULL
          )
        )
      `;
      const countResult = await db.prepare(countQuery).first<{ total: number }>();
      const total = countResult?.total || 0;

      // All Wojaks: from phase2_mints (minted) UNION wojak_scores (voted) so we always show something.
      // No requirement for DIDs or verified wallets.
      const wojaksQuery = `
        WITH all_nfts(nft_id, edition_number) AS (
          SELECT mintgarden_launcher_id, mint_number
          FROM phase2_mints
          WHERE status = 'minted' AND mintgarden_launcher_id IS NOT NULL
          UNION
          SELECT ws.nft_id, ws.edition_number
          FROM wojak_scores ws
          WHERE ws.nft_id NOT IN (
            SELECT mintgarden_launcher_id FROM phase2_mints
            WHERE status = 'minted' AND mintgarden_launcher_id IS NOT NULL
          )
        )
        SELECT
          a.nft_id,
          a.edition_number,
          COALESCE(cf.owner_did, dh.did_id) as owner_did,
          COALESCE(cf.combat_type, 'Unknown') as combat_type,
          COALESCE(cf.power_score, 0) as power_score,
          COALESCE(cf.vote_power, ws.net_score, 0) as vote_power,
          COALESCE(cf.battle_power, 0) as battle_power,
          COALESCE(ws.likes, 0) as likes,
          COALESCE(ws.dislikes, 0) as dislikes,
          COALESCE(cf.total_combat_wins, 0) as wins,
          COALESCE(cf.total_combat_losses, 0) as losses,
          COALESCE(cf.total_combat_draws, 0) as draws,
          dp.display_name as owner_name,
          pm_img.ipfs_image_uri
        FROM all_nfts a
        LEFT JOIN phase2_mints pm_img ON pm_img.mintgarden_launcher_id = a.nft_id AND pm_img.status = 'minted'
        LEFT JOIN wojak_scores ws ON ws.nft_id = a.nft_id
        LEFT JOIN combat_fighters cf ON cf.nft_id = a.nft_id AND (cf.burned_at IS NULL OR cf.burned_at = '')
        LEFT JOIN did_holdings dh ON dh.nft_id = a.nft_id AND dh.collection = 'phase2'
        LEFT JOIN did_profiles dp ON dp.did_id = COALESCE(cf.owner_did, dh.did_id)
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      const results = await db.prepare(wojaksQuery).bind(limit, offset).all();

      const wojaks: WojakRanking[] = (results.results || []).map((row: Record<string, unknown>, idx: number) => ({
        rank: offset + idx + 1,
        nftId: row.nft_id,
        edition: row.edition_number ?? 0,
        imageUrl: resolveImageUri(row.ipfs_image_uri as string | null) || `https://assets.mainnet.mintgarden.io/thumbnails/medium/${row.nft_id}.png`,
        combatType: row.combat_type || 'Unknown',
        powerScore: (row.power_score as number) || 0,
        votePower: (row.vote_power as number) || 0,
        battlePower: (row.battle_power as number) || 0,
        likes: (row.likes as number) || 0,
        dislikes: (row.dislikes as number) || 0,
        wins: (row.wins as number) || 0,
        losses: (row.losses as number) || 0,
        draws: (row.draws as number) || 0,
        ownerName: (row.owner_name as string) || null,
      }));

      return jsonResponse({ wojaks, total });
    } else {
      return errorResponse('Invalid type parameter. Use "players" or "wojaks".', 400);
    }
  } catch (error) {
    console.error('[api/combat/power-leaderboard] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
