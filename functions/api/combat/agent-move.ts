// functions/api/combat/agent-move.ts
// POST /api/combat/agent-move — submit a move via agent API key

import { jsonResponse, errorResponse, authenticateAgent } from './_shared';
import { sendBattleTurnWebhook } from './_webhook';
import { resolveTurn } from '../../../src/lib/combat/turn-resolver';
import { initFighterState, initBattleState } from '../../../src/lib/combat/battle-state';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';
import type { CombatType } from '../../../src/lib/combat/types';

interface CombatBattleRow {
  id: number;
  fighter_a_nft: string;
  fighter_b_nft: string;
  fighter_a_did: string;
  fighter_b_did: string;
  fighter_a_level: number;
  fighter_b_level: number;
  fighter_a_elo: number;
  fighter_b_elo: number;
  current_turn: number;
  status: string;
  winner_nft: string | null;
}

interface CombatFighterRow {
  nft_id: string;
  owner_did: string;
  combat_type: string;
  nature: string;
  ability: string;
  move_1: string;
  move_2: string;
  move_3: string;
  move_4: string;
  level: number;
  xp: number;
  elo_rating: number;
}

interface CombatTurnRow {
  battle_id: number;
  turn_number: number;
  fighter_a_move: string | null;
  fighter_b_move: string | null;
  turn_result: string | null;
}

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  let body: { battle_id: number; move_id: string };
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { battle_id, move_id } = body;
  if (!battle_id || !move_id) return errorResponse('Missing battle_id or move_id');

  const db = context.env.DB;

  // Verify battle
  const battle = await db.prepare(
    "SELECT * FROM combat_battles WHERE id = ? AND status IN ('active', 'waiting_moves')"
  ).bind(battle_id).first<CombatBattleRow>();

  if (!battle) return errorResponse('Battle not found or not active', 404);

  // Determine which side this agent controls
  const isA = battle.fighter_a_did === agent.owner_did;
  const isB = battle.fighter_b_did === agent.owner_did;
  if (!isA && !isB) return errorResponse('Your DID is not a participant in this battle', 403);

  const nftId = isA ? battle.fighter_a_nft : battle.fighter_b_nft;
  const side = isA ? 'a' : 'b';

  // Validate move belongs to fighter
  const fighter = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(nftId).first<CombatFighterRow>();
  if (!fighter) return errorResponse('Fighter not found', 500);

  const validMoves = [fighter.move_1, fighter.move_2, fighter.move_3, fighter.move_4];
  if (!validMoves.includes(move_id)) return errorResponse('Invalid move for this fighter');

  // Get or create turn record
  const currentTurn = battle.current_turn;
  let turnRecord = await db.prepare(
    'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
  ).bind(battle_id, currentTurn).first<CombatTurnRow>();

  if (!turnRecord) {
    await db.prepare('INSERT INTO combat_turns (battle_id, turn_number) VALUES (?, ?)').bind(battle_id, currentTurn).run();
    turnRecord = { battle_id, turn_number: currentTurn };
  }

  // Check not already submitted (use WHERE IS NULL for race-safety)
  const moveCol = side === 'a' ? 'fighter_a_move' : 'fighter_b_move';
  const timeCol = side === 'a' ? 'fighter_a_submitted_at' : 'fighter_b_submitted_at';

  const moveResult = await db.prepare(
    `UPDATE combat_turns SET ${moveCol} = ?, ${timeCol} = datetime('now') WHERE battle_id = ? AND turn_number = ? AND ${moveCol} IS NULL`
  ).bind(move_id, battle_id, currentTurn).run();

  if (moveResult.meta.changes === 0) {
    return errorResponse('Move already submitted for this turn', 409);
  }

  // Check if both moves submitted
  const updated = await db.prepare(
    'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
  ).bind(battle_id, currentTurn).first<CombatTurnRow>();

  if (updated?.fighter_a_move && updated?.fighter_b_move) {
    // Both moves in — resolve turn (same pattern as submit-move.ts)
    const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first<CombatFighterRow>();
    const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first<CombatFighterRow>();
    if (!fighterARow || !fighterBRow) return errorResponse('Fighter data missing', 500);

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

    // Replay previous turns
    const prevTurns = await db.prepare(
      'SELECT turn_result FROM combat_turns WHERE battle_id = ? AND turn_number < ? AND turn_result IS NOT NULL ORDER BY turn_number ASC'
    ).bind(battle_id, currentTurn).all();

    if (prevTurns.results) {
      for (const prev of prevTurns.results) {
        if (prev.turn_result) {
          try {
            const tr = JSON.parse(prev.turn_result as string);
            battleState.fighterA.currentHP = tr.end_of_turn.fighter_a_hp;
            battleState.fighterB.currentHP = tr.end_of_turn.fighter_b_hp;
            battleState.fighterA.status = tr.end_of_turn.fighter_a_status;
            battleState.fighterB.status = tr.end_of_turn.fighter_b_status;
            battleState.turnNumber++;
          } catch { /* skip corrupted turn data */ }
        }
      }
    }

    const turnResult = resolveTurn(battleState, updated.fighter_a_move, updated.fighter_b_move);

    const statements: D1PreparedStatement[] = [
      db.prepare(
        "UPDATE combat_turns SET turn_result = ?, resolved_at = datetime('now') WHERE battle_id = ? AND turn_number = ?"
      ).bind(JSON.stringify(turnResult), battle_id, currentTurn),
    ];

    if (battleState.status === 'finished') {
      statements.push(
        db.prepare(
          "UPDATE combat_battles SET current_turn = current_turn + 1, status = 'completed', winner_nft = ?, ended_at = datetime('now'), last_turn_at = datetime('now') WHERE id = ?"
        ).bind(battleState.winnerId, battle_id),
      );

      // XP/ELO
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
          .bind(eloA, eloB, xpA, xpB, battle_id),
      );
      const winColA = resultA === 'win' ? 'total_combat_wins' : resultA === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
      const winColB = resultB === 'win' ? 'total_combat_wins' : resultB === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
      statements.push(
        db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColA} = ${winColA} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
          .bind(xpA, eloA, calculateLevelFromXP(fighterARow.xp + xpA), battle.fighter_a_nft),
        db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColB} = ${winColB} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
          .bind(xpB, eloB, calculateLevelFromXP(fighterBRow.xp + xpB), battle.fighter_b_nft),
      );
    } else {
      statements.push(
        db.prepare("UPDATE combat_battles SET current_turn = current_turn + 1, last_turn_at = datetime('now') WHERE id = ?").bind(battle_id),
      );
    }

    // Reset timeout counters (successful move = not a timeout)
    statements.push(
      db.prepare('UPDATE combat_battles SET fighter_a_timeouts = 0, fighter_b_timeouts = 0 WHERE id = ?').bind(battle_id),
    );

    await db.batch(statements);

    // Send webhooks to both sides (fire-and-forget)
    sendBattleTurnWebhook(db, battle_id, battle.fighter_a_did, 'A', turnResult, battleState.status, battleState.winnerId);
    sendBattleTurnWebhook(db, battle_id, battle.fighter_b_did, 'B', turnResult, battleState.status, battleState.winnerId);

    return jsonResponse({
      status: battleState.status === 'finished' ? 'completed' : 'turn_resolved',
      turn_number: battleState.turnNumber,
      events: turnResult.events,
      your_hp: isA ? turnResult.end_of_turn.fighter_a_hp : turnResult.end_of_turn.fighter_b_hp,
      opponent_hp: isA ? turnResult.end_of_turn.fighter_b_hp : turnResult.end_of_turn.fighter_a_hp,
      battle_status: battleState.status === 'finished' ? 'finished' : 'active',
      winner_nft: battleState.winnerId,
    });
  }

  return jsonResponse({ status: 'move_submitted', message: 'Waiting for opponent...' });
};
