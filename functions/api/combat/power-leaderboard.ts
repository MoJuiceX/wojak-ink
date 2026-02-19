// GET /api/combat/power-leaderboard
// Query params:
// - type: 'players' (default) or 'wojaks'
// - limit: number (default 50)
// - offset: number (default 0)

import { jsonResponse, errorResponse } from './_shared';
import { authenticateRequest } from '../../lib/auth';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

interface PlayerRanking {
  rank: number;
  did: string;
  displayName: string;
  wojakCount: number;
  totalPower: number;
  bestWojakPower: number;
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

    // Get caller's DID if authenticated (for "your rank" indicator)
    let callerDid: string | null = null;
    if (context.env.CLERK_DOMAIN) {
      const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
      callerDid = (auth?.payload?.did as string) || null;
    }

    const db = context.env.DB;

    if (type === 'players') {
      // Aggregate power by owner DID
      const playersQuery = `
        SELECT
          cf.owner_did,
          dp.display_name,
          COUNT(*) as wojak_count,
          SUM(COALESCE(cf.power_score, 0)) as total_power,
          MAX(COALESCE(cf.power_score, 0)) as best_wojak_power
        FROM combat_fighters cf
        LEFT JOIN did_profiles dp ON cf.owner_did = dp.did_id
        GROUP BY cf.owner_did
        HAVING total_power > 0
        ORDER BY total_power DESC
        LIMIT ? OFFSET ?
      `;

      const results = await db.prepare(playersQuery).bind(limit, offset).all();

      const players: PlayerRanking[] = (results.results || []).map((row: any, idx: number) => ({
        rank: offset + idx + 1,
        did: row.owner_did,
        displayName: row.display_name || null,
        wojakCount: row.wojak_count || 0,
        totalPower: row.total_power || 0,
        bestWojakPower: row.best_wojak_power || 0,
      }));

      // Get caller's rank if authenticated
      let yourRank: number | null = null;
      if (callerDid) {
        const yourRankQuery = `
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT owner_did, SUM(COALESCE(power_score, 0)) as total_power
            FROM combat_fighters
            GROUP BY owner_did
            HAVING total_power > 0
          ) sub
          WHERE sub.total_power > (
            SELECT COALESCE(SUM(COALESCE(power_score, 0)), 0)
            FROM combat_fighters
            WHERE owner_did = ?
          )
        `;
        const rankResult = await db.prepare(yourRankQuery).bind(callerDid).first<{ rank: number }>();
        yourRank = rankResult?.rank || null;
      }

      return jsonResponse({ players, yourRank });
    } else if (type === 'wojaks') {
      // Individual Wojak rankings
      const wojaksQuery = `
        SELECT
          cf.nft_id,
          cf.edition_number,
          cf.owner_did,
          cf.combat_type,
          COALESCE(cf.power_score, 0) as power_score,
          COALESCE(cf.vote_power, 0) as vote_power,
          COALESCE(cf.battle_power, 0) as battle_power,
          COALESCE(cf.total_combat_wins, 0) as wins,
          COALESCE(cf.total_combat_losses, 0) as losses,
          COALESCE(cf.total_combat_draws, 0) as draws,
          dp.display_name as owner_name,
          pm.image_url
        FROM combat_fighters cf
        LEFT JOIN did_profiles dp ON cf.owner_did = dp.did_id
        LEFT JOIN phase2_mints pm ON cf.edition_number = pm.mint_number
        WHERE cf.power_score > 0 OR cf.total_combat_wins > 0 OR cf.total_combat_losses > 0
        ORDER BY cf.power_score DESC
        LIMIT ? OFFSET ?
      `;

      const results = await db.prepare(wojaksQuery).bind(limit, offset).all();

      const wojaks: WojakRanking[] = (results.results || []).map((row: any, idx: number) => ({
        rank: offset + idx + 1,
        nftId: row.nft_id,
        edition: row.edition_number,
        imageUrl: row.image_url || null,
        combatType: row.combat_type,
        powerScore: row.power_score || 0,
        votePower: row.vote_power || 0,
        battlePower: row.battle_power || 0,
        wins: row.wins || 0,
        losses: row.losses || 0,
        draws: row.draws || 0,
        ownerName: row.owner_name || null,
      }));

      return jsonResponse({ wojaks });
    } else {
      return errorResponse('Invalid type parameter. Use "players" or "wojaks".', 400);
    }
  } catch (error) {
    console.error('[api/combat/power-leaderboard] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
