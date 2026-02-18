// functions/api/combat/resolve-turn.ts
// POST /api/combat/resolve-turn — for auto-battles and timeout handling (server-side)

import { jsonResponse, errorResponse } from './_shared';
import { resolveTurn } from '../../../src/lib/combat/turn-resolver';
import { initFighterState, initBattleState } from '../../../src/lib/combat/battle-state';
import { chooseMove } from '../../../src/lib/combat/ai-strategist';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';
import { getAbilityEffect } from '../../../src/lib/combat/ability-effects';
import type { CombatType } from '../../../src/lib/combat/types';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ battleId: number }>();
  const { battleId } = body;

  if (!battleId) return errorResponse('Missing battleId');

  const db = context.env.DB;

  const battle = await db.prepare(
    `SELECT * FROM combat_battles WHERE id = ? AND status IN ('active', 'waiting_moves')`
  ).bind(battleId).first<any>();

  if (!battle) return errorResponse('Battle not found or not active', 404);

  // Load fighters
  const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first<any>();
  const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first<any>();

  if (!fighterARow || !fighterBRow) return errorResponse('Fighter data missing', 500);

  // Build states
  const stateA = initFighterState({
    nftId: fighterARow.nft_id, type: fighterARow.combat_type as CombatType,
    nature: fighterARow.nature, ability: fighterARow.ability,
    moves: [fighterARow.move_1, fighterARow.move_2, fighterARow.move_3, fighterARow.move_4],
    level: fighterARow.level,
  });
  const stateB = initFighterState({
    nftId: fighterBRow.nft_id, type: fighterBRow.combat_type as CombatType,
    nature: fighterBRow.nature, ability: fighterBRow.ability,
    moves: [fighterBRow.move_1, fighterBRow.move_2, fighterBRow.move_3, fighterBRow.move_4],
    level: fighterBRow.level,
  });

  const battleState = initBattleState(stateA, stateB);

  // Apply battle_start abilities
  for (const [fighter, opponent] of [[battleState.fighterA, battleState.fighterB], [battleState.fighterB, battleState.fighterA]] as const) {
    const effect = getAbilityEffect(fighter.ability, 'battle_start', { self: fighter, opponent });
    if (effect?.selfStatMultipliers) {
      for (const [stat, mult] of Object.entries(effect.selfStatMultipliers)) {
        if (stat in fighter.effectiveStats) {
          (fighter.effectiveStats as any)[stat] = Math.floor((fighter.effectiveStats as any)[stat] * mult);
        }
      }
    }
    if (effect?.opponentStatMultipliers) {
      for (const [stat, mult] of Object.entries(effect.opponentStatMultipliers)) {
        if (stat in opponent.effectiveStats) {
          (opponent.effectiveStats as any)[stat] = Math.floor((opponent.effectiveStats as any)[stat] * mult);
        }
      }
    }
  }

  // Replay previous turns
  const prevTurns = await db.prepare(
    'SELECT turn_result FROM combat_turns WHERE battle_id = ? AND turn_result IS NOT NULL ORDER BY turn_number ASC'
  ).bind(battleId).all();

  if (prevTurns.results) {
    for (const prev of prevTurns.results) {
      if (prev.turn_result) {
        const tr = JSON.parse(prev.turn_result as string);
        battleState.fighterA.currentHP = tr.end_of_turn.fighter_a_hp;
        battleState.fighterB.currentHP = tr.end_of_turn.fighter_b_hp;
        battleState.fighterA.status = tr.end_of_turn.fighter_a_status;
        battleState.fighterB.status = tr.end_of_turn.fighter_b_status;
        battleState.turnNumber++;
      }
    }
  }

  // Get existing moves for this turn (for timeout scenario)
  const currentTurnRecord = await db.prepare(
    'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
  ).bind(battleId, battle.current_turn).first<any>();

  // Determine moves: use AI for auto-mode or missing moves (timeout)
  let moveA = currentTurnRecord?.fighter_a_move;
  let moveB = currentTurnRecord?.fighter_b_move;

  if (!moveA) {
    moveA = chooseMove(battleState.fighterA, battleState.fighterB);
  }
  if (!moveB) {
    moveB = chooseMove(battleState.fighterB, battleState.fighterA);
  }

  // Resolve turn
  const turnResult = resolveTurn(battleState, moveA, moveB);

  const statements = [];

  // Ensure turn record exists
  if (!currentTurnRecord) {
    statements.push(
      db.prepare('INSERT INTO combat_turns (battle_id, turn_number, fighter_a_move, fighter_b_move) VALUES (?, ?, ?, ?)')
        .bind(battleId, battle.current_turn, moveA, moveB)
    );
  }

  // Store result
  statements.push(
    db.prepare(
      `UPDATE combat_turns SET fighter_a_move = ?, fighter_b_move = ?, turn_result = ?, resolved_at = datetime('now')
       WHERE battle_id = ? AND turn_number = ?`
    ).bind(moveA, moveB, JSON.stringify(turnResult), battleId, battle.current_turn),
  );

  // Update battle
  const newStatus = battleState.status === 'finished' ? 'completed' : battle.status;
  if (battleState.status === 'finished') {
    statements.push(
      db.prepare(
        `UPDATE combat_battles SET current_turn = current_turn + 1, status = 'completed', winner_nft = ?, ended_at = datetime('now') WHERE id = ?`
      ).bind(battleState.winnerId, battleId),
    );
  } else {
    statements.push(
      db.prepare('UPDATE combat_battles SET current_turn = current_turn + 1 WHERE id = ?').bind(battleId),
    );
  }

  // Finalize XP/ELO if battle over
  if (battleState.status === 'finished') {
    const isWinnerA = battleState.winnerId === battle.fighter_a_nft;
    const isDraw = !battleState.winnerId;
    const resultA: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'win' : 'loss';
    const resultB: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'loss' : 'win';

    const xpA = calculateXPAward(resultA, battle.fighter_a_level, battle.fighter_b_level, battle.fighter_a_elo, battle.fighter_b_elo);
    const xpB = calculateXPAward(resultB, battle.fighter_b_level, battle.fighter_a_level, battle.fighter_b_elo, battle.fighter_a_elo);
    const eloA = calculateELOChange(battle.fighter_a_elo, battle.fighter_b_elo, isDraw ? 0.5 : isWinnerA ? 1.0 : 0.0);
    const eloB = calculateELOChange(battle.fighter_b_elo, battle.fighter_a_elo, isDraw ? 0.5 : !isWinnerA ? 1.0 : 0.0);

    statements.push(
      db.prepare('UPDATE combat_battles SET elo_change_a = ?, elo_change_b = ?, xp_awarded_a = ?, xp_awarded_b = ? WHERE id = ?')
        .bind(eloA, eloB, xpA, xpB, battleId),
    );

    const winColA = resultA === 'win' ? 'total_combat_wins' : resultA === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
    const winColB = resultB === 'win' ? 'total_combat_wins' : resultB === 'loss' ? 'total_combat_losses' : 'total_combat_draws';

    statements.push(
      db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColA} = ${winColA} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
        .bind(xpA, eloA, calculateLevelFromXP(fighterARow.xp + xpA), battle.fighter_a_nft),
      db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColB} = ${winColB} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
        .bind(xpB, eloB, calculateLevelFromXP(fighterBRow.xp + xpB), battle.fighter_b_nft),
    );
  }

  await db.batch(statements);

  return jsonResponse({
    status: battleState.status === 'finished' ? 'completed' : 'active',
    turnResult,
    winnerId: battleState.winnerId,
  });
};
