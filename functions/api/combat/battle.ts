// functions/api/combat/battle.ts
// GET /api/combat/battle?id=xxx — get full battle state

import { jsonResponse, errorResponse, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

interface CombatBattleRow {
  id: number;
  status: string;
  current_turn: number;
  max_turns: number;
  winner_nft: string | null;
  fighter_a_nft: string;
  fighter_b_nft: string;
  elo_change_a: number | null;
  elo_change_b: number | null;
  xp_awarded_a: number | null;
  xp_awarded_b: number | null;
  started_at: string;
  ended_at: string | null;
}

interface TurnRow {
  turn_number: number;
  turn_result: string | null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) return errorResponse('Missing id parameter');

    const db = context.env.DB;

    const battle = await db.prepare(
      'SELECT * FROM combat_battles WHERE id = ?'
    ).bind(id).first<CombatBattleRow>();

    if (!battle) return errorResponse('Battle not found', 404);

    // Load both fighters
    const [fighterA, fighterB] = await Promise.all([
      db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first(),
      db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first(),
    ]);

    // Load turn log — only include resolved turns (hide pending moves to prevent cheating)
    const turns = await db.prepare(
      'SELECT turn_number, turn_result FROM combat_turns WHERE battle_id = ? AND turn_result IS NOT NULL ORDER BY turn_number ASC'
    ).bind(id).all();

    const turnLog: Array<{ turn: number; [key: string]: unknown }> = [];
    for (const t of (turns.results ?? []) as TurnRow[]) {
      try {
        if (t.turn_result) {
          turnLog.push({ turn: t.turn_number, ...JSON.parse(t.turn_result) });
        }
      } catch {
        // Skip corrupted turn data
      }
    }

    return jsonResponse({
      id: battle.id,
      status: battle.status,
      currentTurn: battle.current_turn,
      maxTurns: battle.max_turns,
      winner: battle.winner_nft,
      fighterA: fighterA ? buildFighterResponse(fighterA) : null,
      fighterB: fighterB ? buildFighterResponse(fighterB) : null,
      eloChangeA: battle.elo_change_a,
      eloChangeB: battle.elo_change_b,
      xpAwardedA: battle.xp_awarded_a,
      xpAwardedB: battle.xp_awarded_b,
      turns: turnLog,
      startedAt: battle.started_at,
      endedAt: battle.ended_at,
    });
  } catch (error) {
    console.error('[api/combat/battle] Unhandled error:', error);
    return Response.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
};
