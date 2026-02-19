// functions/api/combat/fighter-detail.ts
// GET /api/combat/fighter-detail?nftId=xxx OR ?edition=123
// Returns full combat data for a single fighter including owner name, rank, and power metrics

import { jsonResponse, errorResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const nftId = url.searchParams.get('nftId');
    const edition = url.searchParams.get('edition');

    if (!nftId && !edition) {
      return errorResponse('nftId or edition required');
    }

    const query = nftId
      ? 'SELECT * FROM combat_fighters WHERE nft_id = ?'
      : 'SELECT * FROM combat_fighters WHERE edition_number = ?';
    const binding = nftId || edition;

    const fighter = await context.env.DB.prepare(query).bind(binding).first();

    if (!fighter) {
      return jsonResponse({ fighter: null });
    }

    // Get owner display name
    let ownerName = '';
    if (fighter.owner_did) {
      const nameResult = await context.env.DB.prepare(
        'SELECT display_name FROM did_display_names WHERE did = ?'
      ).bind(fighter.owner_did).first();
      ownerName = (nameResult?.display_name as string) || '';
    }

    // Get rank (position in power leaderboard)
    const rankResult = await context.env.DB.prepare(
      'SELECT COUNT(*) + 1 as rank FROM combat_fighters WHERE power_score > ?'
    ).bind(fighter.power_score || 0).first();

    return jsonResponse({
      fighter: {
        nftId: fighter.nft_id,
        edition: fighter.edition_number,
        type: fighter.combat_type,
        nature: fighter.nature,
        ability: fighter.ability,
        moves: [fighter.move_1, fighter.move_2, fighter.move_3, fighter.move_4].filter(Boolean),
        level: fighter.level,
        xp: fighter.xp,
        elo: fighter.elo_rating,
        powerScore: fighter.power_score,
        votePower: fighter.vote_power,
        battlePower: fighter.battle_power,
        wins: fighter.total_combat_wins,
        losses: fighter.total_combat_losses,
        draws: fighter.total_combat_draws,
        ownerName,
        ownerDid: fighter.owner_did,
        rank: (rankResult?.rank as number) || null,
      },
    });
  } catch (error) {
    console.error('[api/combat/fighter-detail] Unhandled error:', error);
    return errorResponse('Internal server error', 500);
  }
};
