// functions/api/combat/check-timeouts.ts
// POST /api/combat/check-timeouts — resolve timed-out turns
// Called by cron or lazily on poll. Requires ADMIN_SECRET.

import { jsonResponse, errorResponse } from './_shared';
import { resolveTurn } from '../../../src/lib/combat/turn-resolver';
import { initFighterState, initBattleState } from '../../../src/lib/combat/battle-state';
import { chooseMove } from '../../../src/lib/combat/ai-strategist';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';
import { sendBattleTurnWebhook } from './_webhook';
import type { CombatType } from '../../../src/lib/combat/types';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

interface CombatTurnRow {
  battle_id: number;
  turn_number: number;
  fighter_a_move: string | null;
  fighter_b_move: string | null;
}

interface CombatFighterRow {
  nft_id: string;
  combat_type: string;
  nature: string;
  ability: string;
  move_1: string;
  move_2: string;
  move_3: string;
  move_4: string;
  level: number;
  xp: number;
}

const TURN_TIMEOUT_SECONDS = 30;
const MAX_CONSECUTIVE_TIMEOUTS = 3;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  const db = context.env.DB;

  // Find battles where last_turn_at is older than 30 seconds
  const stale = await db.prepare(`
    SELECT * FROM combat_battles
    WHERE status IN ('active', 'waiting_moves')
      AND last_turn_at IS NOT NULL
      AND last_turn_at <= datetime('now', '-${TURN_TIMEOUT_SECONDS} seconds')
  `).all();

  if (!stale.results || stale.results.length === 0) {
    return jsonResponse({ success: true, resolved: 0 });
  }

  let resolved = 0;
  let forfeited = 0;

  for (const battle of stale.results) {
    const battleId = battle.id as number;
    const currentTurn = battle.current_turn as number;

    // Check which side(s) timed out
    const turnRecord = await db.prepare(
      'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
    ).bind(battleId, currentTurn).first<CombatTurnRow>();

    const moveAMissing = !turnRecord?.fighter_a_move;
    const moveBMissing = !turnRecord?.fighter_b_move;

    if (!moveAMissing && !moveBMissing) continue; // Both submitted, just slow to resolve

    // Update timeout counters
    let aTimeouts = (battle.fighter_a_timeouts as number) || 0;
    let bTimeouts = (battle.fighter_b_timeouts as number) || 0;
    if (moveAMissing) aTimeouts++;
    if (moveBMissing) bTimeouts++;

    // Check for forfeit
    if (aTimeouts >= MAX_CONSECUTIVE_TIMEOUTS || bTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
      const winnerNft = aTimeouts >= MAX_CONSECUTIVE_TIMEOUTS
        ? battle.fighter_b_nft as string
        : battle.fighter_a_nft as string;

      await db.prepare(
        "UPDATE combat_battles SET status = 'completed', winner_nft = ?, ended_at = datetime('now'), fighter_a_timeouts = ?, fighter_b_timeouts = ? WHERE id = ?"
      ).bind(winnerNft, aTimeouts, bTimeouts, battleId).run();

      forfeited++;
      continue;
    }

    // AI picks moves for timed-out sides, then resolve
    const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first<CombatFighterRow>();
    const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first<CombatFighterRow>();
    if (!fighterARow || !fighterBRow) continue;

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
      'SELECT turn_result FROM combat_turns WHERE battle_id = ? AND turn_result IS NOT NULL ORDER BY turn_number ASC'
    ).bind(battleId).all();

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

    // AI fallback for missing moves
    const moveA = turnRecord?.fighter_a_move ?? chooseMove(battleState.fighterA, battleState.fighterB);
    const moveB = turnRecord?.fighter_b_move ?? chooseMove(battleState.fighterB, battleState.fighterA);

    const turnResult = resolveTurn(battleState, moveA, moveB);

    const statements: D1PreparedStatement[] = [];

    // Ensure turn record exists
    if (!turnRecord) {
      statements.push(
        db.prepare('INSERT INTO combat_turns (battle_id, turn_number, fighter_a_move, fighter_b_move) VALUES (?, ?, ?, ?)')
          .bind(battleId, currentTurn, moveA, moveB),
      );
    }

    statements.push(
      db.prepare("UPDATE combat_turns SET fighter_a_move = ?, fighter_b_move = ?, turn_result = ?, resolved_at = datetime('now') WHERE battle_id = ? AND turn_number = ?")
        .bind(moveA, moveB, JSON.stringify(turnResult), battleId, currentTurn),
      db.prepare("UPDATE combat_battles SET fighter_a_timeouts = ?, fighter_b_timeouts = ?, last_turn_at = datetime('now') WHERE id = ?")
        .bind(aTimeouts, bTimeouts, battleId),
    );

    if (battleState.status === 'finished') {
      statements.push(
        db.prepare("UPDATE combat_battles SET current_turn = current_turn + 1, status = 'completed', winner_nft = ?, ended_at = datetime('now') WHERE id = ?")
          .bind(battleState.winnerId, battleId),
      );

      // XP/ELO (same pattern as resolve-turn.ts)
      const isWinnerA = battleState.winnerId === battle.fighter_a_nft;
      const isDraw = !battleState.winnerId;
      const resultA: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'win' : 'loss';
      const resultB: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'loss' : 'win';
      const xpA = calculateXPAward(resultA, battle.fighter_a_level as number, battle.fighter_b_level as number, battle.fighter_a_elo as number, battle.fighter_b_elo as number);
      const xpB = calculateXPAward(resultB, battle.fighter_b_level as number, battle.fighter_a_level as number, battle.fighter_b_elo as number, battle.fighter_a_elo as number);
      const eloA = calculateELOChange(battle.fighter_a_elo as number, battle.fighter_b_elo as number, isDraw ? 0.5 : isWinnerA ? 1.0 : 0.0);
      const eloB = calculateELOChange(battle.fighter_b_elo as number, battle.fighter_a_elo as number, isDraw ? 0.5 : !isWinnerA ? 1.0 : 0.0);

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
    } else {
      statements.push(
        db.prepare('UPDATE combat_battles SET current_turn = current_turn + 1 WHERE id = ?').bind(battleId),
      );
    }

    await db.batch(statements);

    // Send webhooks
    sendBattleTurnWebhook(db, battleId, battle.fighter_a_did as string, 'A', turnResult, battleState.status, battleState.winnerId);
    sendBattleTurnWebhook(db, battleId, battle.fighter_b_did as string, 'B', turnResult, battleState.status, battleState.winnerId);

    resolved++;
  }

  return jsonResponse({ success: true, resolved, forfeited });
};
