// functions/api/combat/agent-battle.ts
// GET /api/combat/agent-battle?battle_id=xxx — get battle state from agent's perspective

import { jsonResponse, errorResponse, authenticateAgent, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const url = new URL(context.request.url);
  const battleId = url.searchParams.get('battle_id');

  const db = context.env.DB;

  // If no battle_id, find active battle for this DID
  let battle: any;
  if (battleId) {
    battle = await db.prepare('SELECT * FROM combat_battles WHERE id = ?').bind(battleId).first();
  } else {
    battle = await db.prepare(
      "SELECT * FROM combat_battles WHERE (fighter_a_did = ? OR fighter_b_did = ?) AND status IN ('active', 'waiting_moves') ORDER BY id DESC LIMIT 1"
    ).bind(agent.owner_did, agent.owner_did).first();
  }

  if (!battle) return errorResponse('No active battle found', 404);

  const isA = battle.fighter_a_did === agent.owner_did;

  // Load fighters
  const [fighterA, fighterB] = await Promise.all([
    db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first(),
    db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first(),
  ]);

  // Load resolved turns only (don't leak pending moves)
  const turns = await db.prepare(
    'SELECT turn_number, turn_result FROM combat_turns WHERE battle_id = ? AND turn_result IS NOT NULL ORDER BY turn_number ASC'
  ).bind(battle.id).all();

  const turnLog: any[] = [];
  for (const t of (turns.results ?? [])) {
    try {
      turnLog.push({
        turn: (t as any).turn_number,
        ...(t.turn_result ? JSON.parse(t.turn_result as string) : {}),
      });
    } catch { /* skip corrupted turn data */ }
  }

  return jsonResponse({
    battle_id: battle.id,
    status: battle.status,
    your_side: isA ? 'A' : 'B',
    current_turn: battle.current_turn,
    max_turns: battle.max_turns,
    winner_nft: battle.winner_nft,
    your_fighter: isA ? (fighterA ? buildFighterResponse(fighterA) : null) : (fighterB ? buildFighterResponse(fighterB) : null),
    opponent: isA ? (fighterB ? buildFighterResponse(fighterB) : null) : (fighterA ? buildFighterResponse(fighterA) : null),
    turns: turnLog,
    started_at: battle.started_at,
    ended_at: battle.ended_at,
  });
};
