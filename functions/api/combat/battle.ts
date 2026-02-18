// functions/api/combat/battle.ts
// GET /api/combat/battle?id=xxx — get full battle state

import { jsonResponse, errorResponse, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) return errorResponse('Missing id parameter');

  const db = context.env.DB;

  const battle = await db.prepare(
    'SELECT * FROM combat_battles WHERE id = ?'
  ).bind(id).first<any>();

  if (!battle) return errorResponse('Battle not found', 404);

  // Load both fighters
  const [fighterA, fighterB] = await Promise.all([
    db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first(),
    db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first(),
  ]);

  // Load turn log
  const turns = await db.prepare(
    'SELECT turn_number, turn_result FROM combat_turns WHERE battle_id = ? ORDER BY turn_number ASC'
  ).bind(id).all();

  const turnLog = turns.results?.map((t: any) => ({
    turn: t.turn_number,
    ...(t.turn_result ? JSON.parse(t.turn_result) : {}),
  })) ?? [];

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
};
