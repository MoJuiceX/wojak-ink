// functions/api/combat/agent-queue.ts
// POST /api/combat/agent-queue — queue a fighter for battle via agent API key
// DELETE /api/combat/agent-queue — leave queue

import {
  jsonResponse, errorResponse, authenticateAgent,
  checkAgentRateLimit, incrementAgentFightCount,
} from './_shared';
import { sendBattleStartWebhook } from './_webhook';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  // Rate limit check
  const rateLimit = checkAgentRateLimit(agent);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      retry_after: rateLimit.retryAfter,
      tier: agent.tier,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfter ?? 60),
      },
    });
  }

  let body: { nft_id: string; battle_mode?: 'agent' | 'auto' };
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { nft_id, battle_mode = 'agent' } = body;
  if (!nft_id) return errorResponse('Missing nft_id');

  const db = context.env.DB;

  // Verify fighter exists and is owned by this agent's DID
  const fighter = await db.prepare(
    'SELECT nft_id, owner_did, elo_rating FROM combat_fighters WHERE nft_id = ?'
  ).bind(nft_id).first<{ nft_id: string; owner_did: string; elo_rating: number }>();

  if (!fighter) return errorResponse('Fighter not found', 404);
  if (fighter.owner_did !== agent.owner_did) return errorResponse('Not the owner of this fighter', 403);

  // Check not already in queue
  const inQueue = await db.prepare('SELECT id FROM combat_queue WHERE nft_id = ?').bind(nft_id).first();
  if (inQueue) return errorResponse('Fighter already in queue');

  // Check not in active battle
  const inBattle = await db.prepare(
    "SELECT id FROM combat_battles WHERE (fighter_a_nft = ? OR fighter_b_nft = ?) AND status IN ('active', 'waiting_moves')"
  ).bind(nft_id, nft_id).first();
  if (inBattle) return errorResponse('Fighter is in an active battle');

  // Insert into queue
  await db.prepare(
    'INSERT INTO combat_queue (nft_id, owner_did, battle_mode, elo_rating) VALUES (?, ?, ?, ?)'
  ).bind(nft_id, agent.owner_did, battle_mode, fighter.elo_rating).run();

  // Attempt matchmaking (same logic as queue.ts)
  const opponent = await db.prepare(
    `SELECT * FROM combat_queue
     WHERE nft_id != ? AND owner_did != ?
       AND elo_rating BETWEEN ? AND ?
     ORDER BY queued_at ASC LIMIT 1`
  ).bind(nft_id, agent.owner_did, fighter.elo_rating - 100, fighter.elo_rating + 100)
    .first<{ nft_id: string; owner_did: string; battle_mode: string; elo_rating: number }>();

  if (!opponent) {
    const position = await db.prepare('SELECT COUNT(*) as cnt FROM combat_queue').first<{ cnt: number }>();
    return jsonResponse({ status: 'queued', position: position?.cnt ?? 1 });
  }

  // Cooldown check
  const recentBattle = await db.prepare(
    `SELECT id FROM combat_battles
     WHERE ((fighter_a_nft = ? AND fighter_b_nft = ?) OR (fighter_a_nft = ? AND fighter_b_nft = ?))
       AND ended_at > datetime('now', '-1 hour')`
  ).bind(nft_id, opponent.nft_id, opponent.nft_id, nft_id).first();

  if (recentBattle) {
    return jsonResponse({ status: 'queued', position: 1, message: 'Waiting for non-cooldown opponent' });
  }

  // Load fighter levels for snapshot
  const fighterB = await db.prepare('SELECT level, elo_rating FROM combat_fighters WHERE nft_id = ?')
    .bind(opponent.nft_id).first<{ level: number; elo_rating: number }>();
  const fighterALevel = (await db.prepare('SELECT level FROM combat_fighters WHERE nft_id = ?')
    .bind(nft_id).first<{ level: number }>())?.level ?? 1;

  // Determine initial status based on modes
  const bothAuto = battle_mode === 'auto' && opponent.battle_mode === 'auto';
  const initialStatus = bothAuto ? 'active' : 'waiting_moves';

  // Create battle
  await db.batch([
    db.prepare('DELETE FROM combat_queue WHERE nft_id = ?').bind(nft_id),
    db.prepare('DELETE FROM combat_queue WHERE nft_id = ?').bind(opponent.nft_id),
    db.prepare(
      `INSERT INTO combat_battles
       (fighter_a_nft, fighter_a_did, fighter_a_mode, fighter_b_nft, fighter_b_did, fighter_b_mode,
        status, fighter_a_level, fighter_b_level, fighter_a_elo, fighter_b_elo,
        fighter_a_mode_type, fighter_b_mode_type, last_turn_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      nft_id, agent.owner_did, battle_mode === 'auto' ? 'auto' : 'manual',
      opponent.nft_id, opponent.owner_did, opponent.battle_mode === 'auto' ? 'auto' : 'manual',
      initialStatus,
      fighterALevel, fighterB?.level ?? 1,
      fighter.elo_rating, opponent.elo_rating,
      battle_mode, opponent.battle_mode,
    ),
  ]);

  // Increment fight count
  await incrementAgentFightCount(db, agent.id);

  // Get battle ID
  const newBattle = await db.prepare(
    'SELECT id FROM combat_battles WHERE fighter_a_nft = ? AND fighter_b_nft = ? ORDER BY id DESC LIMIT 1'
  ).bind(nft_id, opponent.nft_id).first<{ id: number }>();

  // Send webhooks to both sides (fire-and-forget)
  const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(nft_id).first<Record<string, unknown>>();
  const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(opponent.nft_id).first<Record<string, unknown>>();

  if (fighterARow && fighterBRow && newBattle?.id) {
    sendBattleStartWebhook(db, newBattle.id, agent.owner_did, 'A', fighterARow, fighterBRow);
    sendBattleStartWebhook(db, newBattle.id, opponent.owner_did, 'B', fighterARow, fighterBRow);
  }

  return jsonResponse({
    status: 'matched',
    battle_id: newBattle?.id,
    opponent: { nft_id: opponent.nft_id, elo: opponent.elo_rating },
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nft_id');
  if (!nftId) return errorResponse('Missing nft_id');

  await context.env.DB.prepare(
    'DELETE FROM combat_queue WHERE nft_id = ? AND owner_did = ?'
  ).bind(nftId, agent.owner_did).run();

  return jsonResponse({ status: 'removed' });
};
