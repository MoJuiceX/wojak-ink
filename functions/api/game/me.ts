// GET /api/game/me
// Clerk auth required. Returns the game player linked to this Clerk user, or null.

import { authenticateRequest } from '../../lib/auth';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

function playerResponse(row: Record<string, unknown>) {
  return {
    did: row.did_id,
    powerLevel: row.power_level ?? 0,
    phase1Verified: !!(row.phase1_verified ?? 0),
    votesToday: (row.votes_today as number) ?? 0,
    voteStreak: (row.vote_streak as number) ?? 0,
    onboarding: {
      did: true,
      phase1: !!(row.onboarding_phase1 ?? 0),
      minted: !!(row.onboarding_minted ?? 0),
      voted: !!(row.onboarding_voted ?? 0),
      battled: !!(row.onboarding_battled ?? 0),
    },
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.CLERK_DOMAIN) {
      return Response.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE clerk_user_id = ?'
    ).bind(auth.userId).first();

    if (!row) {
      return Response.json({ success: true, player: null });
    }

    return Response.json({
      success: true,
      player: playerResponse(row as Record<string, unknown>),
    });
  } catch (err) {
    console.error('Game me error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
