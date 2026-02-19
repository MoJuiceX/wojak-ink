// POST /api/combat/ai-battle
// Starts an AI sparring match when no real opponent found
// AI battles count toward daily limit but don't affect ELO

import { jsonResponse, errorResponse, isValidDid } from './_shared';
import { getSubscriptionStatus } from '../subscription/status';
import { runAutoBattle } from '../../../src/lib/combat/battle-runner';
import { COMBAT_TYPES, type CombatType } from '../../../src/lib/combat/types';
import { getMovePoolForType } from '../../../src/lib/combat/data/moves';
import { getAbilitiesForType } from '../../../src/lib/combat/data/abilities';
import { NATURES } from '../../../src/lib/combat/data/natures';
import type { FighterData } from '../../../src/lib/combat/battle-state';

interface Env {
  DB: D1Database;
}

// AI Power rewards (half of normal)
const AI_WIN_POWER = 15;
const AI_LOSS_POWER = -5;
const AI_DRAW_POWER = 3;

// Normal XP rewards (unchanged from regular battles)
const XP_WIN = 30;
const XP_LOSS = 10;
const XP_DRAW = 15;

interface FighterRow {
  nft_id: string;
  edition_number: number;
  owner_did: string;
  combat_type: CombatType;
  nature: string;
  ability: string;
  move_1: string;
  move_2: string;
  move_3: string;
  move_4: string;
  level: number;
  xp: number;
  elo_rating: number;
  power_score: number;
}

/**
 * Generate a fair AI opponent for the player's fighter.
 * - Random type (different from player if possible)
 * - Same level as player
 * - Random nature
 * - Random ability for that type
 * - 4 random moves for that type
 */
function generateAiOpponent(playerFighter: FighterRow): FighterData {
  // Pick a random type, preferring different from player
  const otherTypes = COMBAT_TYPES.filter(t => t !== playerFighter.combat_type);
  const aiType = otherTypes.length > 0
    ? otherTypes[Math.floor(Math.random() * otherTypes.length)]
    : playerFighter.combat_type;

  // Match player's level
  const aiLevel = playerFighter.level;

  // Random nature
  const aiNature = NATURES[Math.floor(Math.random() * NATURES.length)].name;

  // Random ability for the type
  const abilities = getAbilitiesForType(aiType);
  const aiAbility = abilities[Math.floor(Math.random() * abilities.length)].name;

  // Random 4 moves for the type (ensure at least 1 damaging move)
  const movePool = getMovePoolForType(aiType);
  const damagingMoves = movePool.filter(m => m.power > 0);
  const statusMoves = movePool.filter(m => m.power === 0);

  // Pick at least 1 damaging move, rest random
  const selectedMoves: string[] = [];

  // First move: always damaging
  if (damagingMoves.length > 0) {
    const idx = Math.floor(Math.random() * damagingMoves.length);
    selectedMoves.push(damagingMoves[idx].id);
  }

  // Fill remaining 3 moves randomly
  const remainingPool = movePool.filter(m => !selectedMoves.includes(m.id));
  while (selectedMoves.length < 4 && remainingPool.length > 0) {
    const idx = Math.floor(Math.random() * remainingPool.length);
    selectedMoves.push(remainingPool[idx].id);
    remainingPool.splice(idx, 1);
  }

  // Pad with duplicates if not enough moves (shouldn't happen)
  while (selectedMoves.length < 4) {
    selectedMoves.push(selectedMoves[0]);
  }

  return {
    nftId: 'ai_sparring_partner',
    type: aiType,
    nature: aiNature,
    ability: aiAbility,
    moves: selectedMoves,
    level: aiLevel,
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { fighterNftId: string; ownerDid: string };
    const { fighterNftId, ownerDid } = body;

    if (!fighterNftId || !ownerDid) {
      return errorResponse('Missing fighterNftId or ownerDid');
    }
    if (!isValidDid(ownerDid)) {
      return errorResponse('Invalid DID format');
    }

    const db = context.env.DB;

    // 1. Verify fighter exists and is owned by this DID
    const fighter = await db.prepare(
      'SELECT * FROM combat_fighters WHERE nft_id = ?'
    ).bind(fighterNftId).first<FighterRow>();

    if (!fighter) {
      return errorResponse('Fighter not found', 404);
    }
    if (fighter.owner_did !== ownerDid) {
      return errorResponse('Not the owner of this fighter', 403);
    }

    // 2. Check battle limit (AI battles count toward daily limit)
    const subscription = await getSubscriptionStatus(db, ownerDid);
    if (subscription.battlesRemaining <= 0) {
      const upgradeMsg = subscription.tier === 'free'
        ? ' Upgrade to Premium for 4 battles/day.'
        : '';
      return Response.json(
        {
          error: `Daily battle limit reached.${upgradeMsg}`,
          code: 'BATTLE_LIMIT_REACHED',
          tier: subscription.tier,
          battlesPerDay: subscription.battlesPerDay,
          battlesToday: subscription.battlesToday,
        },
        { status: 429 }
      );
    }

    // 3. Generate AI opponent
    const aiOpponent = generateAiOpponent(fighter);

    // 4. Build player fighter data
    const playerFighterData: FighterData = {
      nftId: fighter.nft_id,
      type: fighter.combat_type,
      nature: fighter.nature,
      ability: fighter.ability,
      moves: [fighter.move_1, fighter.move_2, fighter.move_3, fighter.move_4],
      level: fighter.level,
    };

    // 5. Run the battle
    const battleResult = runAutoBattle(playerFighterData, aiOpponent);

    // 6. Determine winner and rewards
    const playerWon = battleResult.winnerId === fighter.nft_id;
    const isDraw = battleResult.winnerId === null;
    const aiWon = battleResult.winnerId === 'ai_sparring_partner';

    let powerDelta = 0;
    let xpGained = 0;
    let outcome: 'win' | 'loss' | 'draw';

    if (playerWon) {
      powerDelta = AI_WIN_POWER;
      xpGained = XP_WIN;
      outcome = 'win';
    } else if (isDraw) {
      powerDelta = AI_DRAW_POWER;
      xpGained = XP_DRAW;
      outcome = 'draw';
    } else {
      powerDelta = AI_LOSS_POWER;
      xpGained = XP_LOSS;
      outcome = 'loss';
    }

    // 7. Store battle in combat_battles with fighter_b_mode = 'ai_sparring'
    const battleInsert = await db.prepare(`
      INSERT INTO combat_battles (
        fighter_a_nft, fighter_a_did, fighter_a_mode,
        fighter_b_nft, fighter_b_did, fighter_b_mode,
        status, winner_nft,
        fighter_a_level, fighter_b_level,
        fighter_a_elo, fighter_b_elo,
        turn_log
      ) VALUES (?, ?, 'auto', ?, ?, 'ai_sparring', 'finished', ?, ?, ?, ?, ?, ?)
    `).bind(
      fighter.nft_id,
      ownerDid,
      'ai_sparring_partner',
      'ai_sparring',
      battleResult.winnerId,
      fighter.level,
      aiOpponent.level,
      fighter.elo_rating,
      1000, // AI has neutral ELO
      JSON.stringify(battleResult.turns)
    ).run();

    const battleId = battleInsert.meta?.last_row_id;

    // 8. Update fighter stats (XP and power, NOT ELO)
    const newXp = fighter.xp + xpGained;
    const newPower = Math.max(0, fighter.power_score + powerDelta);

    // Check for level up (every 100 XP)
    const currentLevel = fighter.level;
    const newLevel = Math.floor(newXp / 100) + 1;

    // Update win/loss/draw counts
    const updateFields = outcome === 'win'
      ? 'total_combat_wins = total_combat_wins + 1'
      : outcome === 'loss'
        ? 'total_combat_losses = total_combat_losses + 1'
        : 'total_combat_draws = total_combat_draws + 1';

    await db.prepare(`
      UPDATE combat_fighters
      SET xp = ?,
          level = ?,
          power_score = ?,
          ${updateFields},
          updated_at = datetime('now')
      WHERE nft_id = ?
    `).bind(newXp, newLevel, newPower, fighter.nft_id).run();

    console.log(`[ai-battle] ${ownerDid.slice(0, 20)}... vs AI: ${outcome}, Power ${powerDelta > 0 ? '+' : ''}${powerDelta}, XP +${xpGained}`);

    return jsonResponse({
      success: true,
      battleId,
      outcome,
      isSparring: true,
      rewards: {
        powerDelta,
        xpGained,
        levelUp: newLevel > currentLevel,
        newLevel,
      },
      aiOpponent: {
        type: aiOpponent.type,
        nature: aiOpponent.nature,
        ability: aiOpponent.ability,
        level: aiOpponent.level,
      },
      battle: {
        winnerId: battleResult.winnerId,
        totalTurns: battleResult.totalTurns,
        turns: battleResult.turns,
      },
    });
  } catch (error) {
    console.error('[ai-battle] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
