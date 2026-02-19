// functions/api/combat/submit-move.ts
// POST /api/combat/submit-move — submit a move for a manual battle turn

import { jsonResponse, errorResponse } from './_shared';
import { resolveTurn } from '../../../src/lib/combat/turn-resolver';
import { initFighterState, initBattleState } from '../../../src/lib/combat/battle-state';
import { chooseMove } from '../../../src/lib/combat/ai-strategist';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';
import type { CombatType } from '../../../src/lib/combat/types';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json<{
      battleId: number;
      nftId: string;
      moveId: string;
    }>();

    const { battleId, nftId, moveId } = body;
    if (!battleId || !nftId || !moveId) {
      return errorResponse('Missing required fields: battleId, nftId, moveId');
    }

    const db = context.env.DB;

    // Verify battle exists and is active
    const battle = await db.prepare(
      `SELECT * FROM combat_battles WHERE id = ? AND status IN ('active', 'waiting_moves')`
    ).bind(battleId).first<any>();

    if (!battle) return errorResponse('Battle not found or not active', 404);

    // Verify nftId is fighter_a or fighter_b
    const side = battle.fighter_a_nft === nftId ? 'a' : battle.fighter_b_nft === nftId ? 'b' : null;
    if (!side) return errorResponse('NFT is not a participant in this battle', 403);

    // Verify moveId is in fighter's moveset
    const fighter = await db.prepare(
      'SELECT * FROM combat_fighters WHERE nft_id = ?'
    ).bind(nftId).first<any>();

    if (!fighter) return errorResponse('Fighter not found', 404);

    const validMoves = [fighter.move_1, fighter.move_2, fighter.move_3, fighter.move_4];
    if (!validMoves.includes(moveId)) {
      return errorResponse('Invalid move for this fighter');
    }

    // Get or create current turn record
    const currentTurn = battle.current_turn;
    let turnRecord = await db.prepare(
      'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
    ).bind(battleId, currentTurn).first<any>();

    if (!turnRecord) {
      await db.prepare(
        'INSERT INTO combat_turns (battle_id, turn_number) VALUES (?, ?)'
      ).bind(battleId, currentTurn).run();
      turnRecord = { battle_id: battleId, turn_number: currentTurn };
    }

    // Store the move
    const moveCol = side === 'a' ? 'fighter_a_move' : 'fighter_b_move';
    const timeCol = side === 'a' ? 'fighter_a_submitted_at' : 'fighter_b_submitted_at';
    await db.prepare(
      `UPDATE combat_turns SET ${moveCol} = ?, ${timeCol} = datetime('now')
       WHERE battle_id = ? AND turn_number = ?`
    ).bind(moveId, battleId, currentTurn).run();

    // Check if both moves are submitted
    const updatedTurn = await db.prepare(
      'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
    ).bind(battleId, currentTurn).first<any>();

    if (updatedTurn?.fighter_a_move && updatedTurn?.fighter_b_move) {
      // Both moves submitted — resolve turn
      return await resolveBattleTurn(db, battle, updatedTurn.fighter_a_move, updatedTurn.fighter_b_move);
    }

    // Only one move submitted — wait for opponent
    return jsonResponse({
      status: 'waiting',
      message: 'Move submitted. Waiting for opponent.',
    });
  } catch (error) {
    console.error('[api/combat/submit-move] Unhandled error:', error);
    return Response.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
};

async function resolveBattleTurn(
  db: D1Database,
  battle: any,
  moveA: string,
  moveB: string,
) {
  // Load both fighters
  const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first<any>();
  const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first<any>();

  if (!fighterARow || !fighterBRow) return errorResponse('Fighter data missing', 500);

  // Build fighter states
  const stateA = initFighterState({
    nftId: fighterARow.nft_id,
    type: fighterARow.combat_type as CombatType,
    nature: fighterARow.nature,
    ability: fighterARow.ability,
    moves: [fighterARow.move_1, fighterARow.move_2, fighterARow.move_3, fighterARow.move_4],
    level: fighterARow.level,
  });
  const stateB = initFighterState({
    nftId: fighterBRow.nft_id,
    type: fighterBRow.combat_type as CombatType,
    nature: fighterBRow.nature,
    ability: fighterBRow.ability,
    moves: [fighterBRow.move_1, fighterBRow.move_2, fighterBRow.move_3, fighterBRow.move_4],
    level: fighterBRow.level,
  });

  // Replay all previous turns to reconstruct state
  const prevTurns = await db.prepare(
    `SELECT turn_result FROM combat_turns
     WHERE battle_id = ? AND turn_number < ? AND turn_result IS NOT NULL
     ORDER BY turn_number ASC`
  ).bind(battle.id, battle.current_turn).all();

  const battleState = initBattleState(stateA, stateB);

  // Replay previous turns (apply the HP changes from stored results)
  if (prevTurns.results && prevTurns.results.length > 0) {
    for (const prev of prevTurns.results) {
      if (prev.turn_result) {
        const turnResult = JSON.parse(prev.turn_result as string);
        battleState.fighterA.currentHP = turnResult.end_of_turn.fighter_a_hp;
        battleState.fighterB.currentHP = turnResult.end_of_turn.fighter_b_hp;
        battleState.fighterA.status = turnResult.end_of_turn.fighter_a_status;
        battleState.fighterB.status = turnResult.end_of_turn.fighter_b_status;
        battleState.turnNumber++;
      }
    }
  }

  // Resolve the current turn
  const turnResult = resolveTurn(battleState, moveA, moveB);

  const statements = [
    // Store turn result
    db.prepare(
      `UPDATE combat_turns SET turn_result = ?, resolved_at = datetime('now')
       WHERE battle_id = ? AND turn_number = ?`
    ).bind(JSON.stringify(turnResult), battle.id, battle.current_turn),

    // Update battle
    db.prepare(
      `UPDATE combat_battles SET current_turn = current_turn + 1, status = ?${
        battleState.winnerId ? ", winner_nft = ?, ended_at = datetime('now')" : ''
      } WHERE id = ?`
    ).bind(
      battleState.status === 'finished' ? 'completed' : 'waiting_moves',
      ...(battleState.winnerId ? [battleState.winnerId] : []),
      battle.id,
    ),
  ];

  // If battle over, finalize XP/ELO
  if (battleState.status === 'finished') {
    const isWinnerA = battleState.winnerId === battle.fighter_a_nft;
    const isDraw = !battleState.winnerId;

    const resultA = isDraw ? 'draw' : isWinnerA ? 'win' : 'loss';
    const resultB = isDraw ? 'draw' : isWinnerA ? 'loss' : 'win';

    const xpA = calculateXPAward(resultA, battle.fighter_a_level, battle.fighter_b_level, battle.fighter_a_elo, battle.fighter_b_elo);
    const xpB = calculateXPAward(resultB, battle.fighter_b_level, battle.fighter_a_level, battle.fighter_b_elo, battle.fighter_a_elo);

    const eloChangeA = calculateELOChange(battle.fighter_a_elo, battle.fighter_b_elo, isDraw ? 0.5 : isWinnerA ? 1.0 : 0.0);
    const eloChangeB = calculateELOChange(battle.fighter_b_elo, battle.fighter_a_elo, isDraw ? 0.5 : !isWinnerA ? 1.0 : 0.0);

    // Update battle with XP/ELO records
    statements.push(
      db.prepare(
        'UPDATE combat_battles SET elo_change_a = ?, elo_change_b = ?, xp_awarded_a = ?, xp_awarded_b = ? WHERE id = ?'
      ).bind(eloChangeA, eloChangeB, xpA, xpB, battle.id),
    );

    // Update fighter A
    const winColA = resultA === 'win' ? 'total_combat_wins' : resultA === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
    statements.push(
      db.prepare(
        `UPDATE combat_fighters SET
         xp = xp + ?, elo_rating = elo_rating + ?, ${winColA} = ${winColA} + 1,
         level = ?, updated_at = datetime('now')
         WHERE nft_id = ?`
      ).bind(xpA, eloChangeA, calculateLevelFromXP(fighterARow.xp + xpA), battle.fighter_a_nft),
    );

    // Update fighter B
    const winColB = resultB === 'win' ? 'total_combat_wins' : resultB === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
    statements.push(
      db.prepare(
        `UPDATE combat_fighters SET
         xp = xp + ?, elo_rating = elo_rating + ?, ${winColB} = ${winColB} + 1,
         level = ?, updated_at = datetime('now')
         WHERE nft_id = ?`
      ).bind(xpB, eloChangeB, calculateLevelFromXP(fighterBRow.xp + xpB), battle.fighter_b_nft),
    );
  }

  await db.batch(statements);

  return jsonResponse({
    status: battleState.status === 'finished' ? 'completed' : 'active',
    turnResult,
    winnerId: battleState.winnerId,
  });
}
