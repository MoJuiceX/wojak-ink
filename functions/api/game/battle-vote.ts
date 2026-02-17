// POST /api/game/battle-vote
// Body: { voterDid: string, battleId: number, votedFor: 'a' | 'b' }
// 1 vote per user per battle, separate from daily vote cap.

import { isValidDid } from './_shared';
import { verifyGameAuth, isAuthError } from './_auth';
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      voterDid: string;
      battleId: number;
      votedFor: 'a' | 'b';
    };

    const { voterDid, battleId, votedFor } = body;

    const authResult = await verifyGameAuth(context.request, context.env, voterDid);
    if (isAuthError(authResult)) return authResult;

    const rlKey = getRateLimitKey(context.request, authResult.userId);
    const rl = await checkRateLimit(context.env.DB, rlKey, GAME_RATE_LIMITS.battleVote);
    if (!rl.allowed) {
      return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
    }

    if (!voterDid || !isValidDid(voterDid) || !battleId || !['a', 'b'].includes(votedFor)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Check player exists and is verified
    const player = await context.env.DB.prepare(
      'SELECT phase1_verified FROM game_players WHERE did_id = ?'
    ).bind(voterDid).first();

    if (!player) {
      return Response.json({ error: 'Player not registered' }, { status: 403 });
    }
    if (!player.phase1_verified) {
      return Response.json({ error: 'Phase 1 NFT verification required' }, { status: 403 });
    }

    // Check battle exists and is active
    const battle = await context.env.DB.prepare(
      `SELECT * FROM battles WHERE id = ? AND status = 'active'`
    ).bind(battleId).first();

    if (!battle) {
      return Response.json({ error: 'Battle not found or already ended' }, { status: 404 });
    }

    // Check voter is not a participant
    if (voterDid === battle.nft_a_owner_did || voterDid === battle.nft_b_owner_did) {
      return Response.json({ error: 'Cannot vote in your own battle' }, { status: 403 });
    }

    // Insert vote (PRIMARY KEY constraint prevents duplicates)
    try {
      await context.env.DB.prepare(`
        INSERT INTO battle_votes (battle_id, voter_did, voted_for)
        VALUES (?, ?, ?)
      `).bind(battleId, voterDid, votedFor).run();
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('UNIQUE')) {
        return Response.json({ error: 'Already voted in this battle' }, { status: 409 });
      }
      throw e;
    }

    // Update vote count on battle
    const col = votedFor === 'a' ? 'votes_a' : 'votes_b';
    await context.env.DB.prepare(
      `UPDATE battles SET ${col} = ${col} + 1 WHERE id = ?`
    ).bind(battleId).run();

    // Get updated counts
    const updated = await context.env.DB.prepare(
      'SELECT votes_a, votes_b FROM battles WHERE id = ?'
    ).bind(battleId).first();

    return Response.json({
      success: true,
      votedFor,
      votesA: updated?.votes_a ?? 0,
      votesB: updated?.votes_b ?? 0,
    });
  } catch (err) {
    console.error('Battle vote error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
