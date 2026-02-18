// functions/api/combat/queue.ts
// POST /api/combat/queue — join queue
// DELETE /api/combat/queue — leave queue
// GET /api/combat/queue — check status

import { jsonResponse, errorResponse, isValidDid } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    nftId: string;
    ownerDid: string;
    battleMode: 'manual' | 'auto';
  }>();

  const { nftId, ownerDid, battleMode } = body;
  if (!nftId || !ownerDid || !battleMode) {
    return errorResponse('Missing required fields: nftId, ownerDid, battleMode');
  }
  if (!isValidDid(ownerDid)) return errorResponse('Invalid DID format');
  if (battleMode !== 'manual' && battleMode !== 'auto') {
    return errorResponse('battleMode must be "manual" or "auto"');
  }

  const db = context.env.DB;

  // Verify fighter exists
  const fighter = await db.prepare(
    'SELECT nft_id, owner_did, elo_rating FROM combat_fighters WHERE nft_id = ?'
  ).bind(nftId).first<{ nft_id: string; owner_did: string; elo_rating: number }>();

  if (!fighter) return errorResponse('Fighter not found', 404);
  if (fighter.owner_did !== ownerDid) return errorResponse('Not the owner of this fighter', 403);

  // Check not already in queue
  const inQueue = await db.prepare(
    'SELECT id FROM combat_queue WHERE nft_id = ?'
  ).bind(nftId).first();
  if (inQueue) return errorResponse('Fighter already in queue');

  // Check not in active battle
  const inBattle = await db.prepare(
    `SELECT id FROM combat_battles
     WHERE (fighter_a_nft = ? OR fighter_b_nft = ?)
       AND status IN ('active', 'waiting_moves')`
  ).bind(nftId, nftId).first();
  if (inBattle) return errorResponse('Fighter is in an active battle');

  // Insert into queue
  await db.prepare(
    'INSERT INTO combat_queue (nft_id, owner_did, battle_mode, elo_rating) VALUES (?, ?, ?, ?)'
  ).bind(nftId, ownerDid, battleMode, fighter.elo_rating).run();

  // Attempt matchmaking: find opponent within ELO ±100, different owner
  const opponent = await db.prepare(
    `SELECT * FROM combat_queue
     WHERE nft_id != ? AND owner_did != ?
       AND elo_rating BETWEEN ? AND ?
     ORDER BY queued_at ASC LIMIT 1`
  ).bind(nftId, ownerDid, fighter.elo_rating - 100, fighter.elo_rating + 100)
    .first<{ nft_id: string; owner_did: string; battle_mode: string; elo_rating: number }>();

  if (!opponent) {
    // No match found — return queued status
    const position = await db.prepare(
      'SELECT COUNT(*) as cnt FROM combat_queue'
    ).first<{ cnt: number }>();
    return jsonResponse({ status: 'queued', position: position?.cnt ?? 1 });
  }

  // Cooldown: same two NFTs cannot battle within 1 hour
  const recentBattle = await db.prepare(
    `SELECT id FROM combat_battles
     WHERE ((fighter_a_nft = ? AND fighter_b_nft = ?) OR (fighter_a_nft = ? AND fighter_b_nft = ?))
       AND ended_at > datetime('now', '-1 hour')`
  ).bind(nftId, opponent.nft_id, opponent.nft_id, nftId).first();

  if (recentBattle) {
    return jsonResponse({ status: 'queued', position: 1, message: 'Waiting for non-cooldown opponent' });
  }

  // Load both fighters for level/elo snapshot
  const fighterB = await db.prepare(
    'SELECT level, elo_rating FROM combat_fighters WHERE nft_id = ?'
  ).bind(opponent.nft_id).first<{ level: number; elo_rating: number }>();

  const fighterALevel = (await db.prepare(
    'SELECT level FROM combat_fighters WHERE nft_id = ?'
  ).bind(nftId).first<{ level: number }>())?.level ?? 1;

  // Match found — create battle and remove both from queue
  await db.batch([
    db.prepare('DELETE FROM combat_queue WHERE nft_id = ?').bind(nftId),
    db.prepare('DELETE FROM combat_queue WHERE nft_id = ?').bind(opponent.nft_id),
    db.prepare(
      `INSERT INTO combat_battles
       (fighter_a_nft, fighter_a_did, fighter_a_mode, fighter_b_nft, fighter_b_did, fighter_b_mode,
        status, fighter_a_level, fighter_b_level, fighter_a_elo, fighter_b_elo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      nftId, ownerDid, battleMode,
      opponent.nft_id, opponent.owner_did, opponent.battle_mode,
      battleMode === 'auto' && opponent.battle_mode === 'auto' ? 'active' : 'waiting_moves',
      fighterALevel, fighterB?.level ?? 1,
      fighter.elo_rating, opponent.elo_rating,
    ),
  ]);

  // Get the created battle ID
  const newBattle = await db.prepare(
    `SELECT id FROM combat_battles
     WHERE fighter_a_nft = ? AND fighter_b_nft = ?
     ORDER BY id DESC LIMIT 1`
  ).bind(nftId, opponent.nft_id).first<{ id: number }>();

  return jsonResponse({
    status: 'matched',
    battleId: newBattle?.id,
    opponent: { nftId: opponent.nft_id, elo: opponent.elo_rating },
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');
  const ownerDid = url.searchParams.get('ownerDid');

  if (!nftId || !ownerDid) return errorResponse('Missing nftId or ownerDid');

  await context.env.DB.prepare(
    'DELETE FROM combat_queue WHERE nft_id = ? AND owner_did = ?'
  ).bind(nftId, ownerDid).run();

  return jsonResponse({ status: 'removed' });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');

  if (!nftId) return errorResponse('Missing nftId parameter');

  const entry = await context.env.DB.prepare(
    'SELECT *, (SELECT COUNT(*) FROM combat_queue WHERE queued_at <= q.queued_at) as position FROM combat_queue q WHERE nft_id = ?'
  ).bind(nftId).first<{ nft_id: string; queued_at: string; position: number }>();

  if (!entry) return jsonResponse({ status: 'not_in_queue' });

  return jsonResponse({
    status: 'queued',
    position: entry.position,
    queuedAt: entry.queued_at,
  });
};
