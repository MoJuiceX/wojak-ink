// POST /api/game/register
// Body: { did: string, walletAddress: string }
// Registers a game player. Idempotent — re-registering updates wallet if needed.

import { isValidDid, getTodayString } from './_shared';
import { authenticateRequest } from '../../lib/auth';
import { isValidChiaAddress } from '../../lib/validation';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
  if (!auth) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await context.request.json() as { did: string; walletAddress: string };
    const { did, walletAddress } = body;

    if (!did || !isValidDid(did)) {
      return Response.json({ error: 'Invalid DID format' }, { status: 400 });
    }
    if (!walletAddress || !isValidChiaAddress(walletAddress)) {
      return Response.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Upsert player
    await context.env.DB.prepare(`
      INSERT INTO game_players (did_id, wallet_address, votes_today_reset)
      VALUES (?, ?, ?)
      ON CONFLICT(did_id) DO UPDATE SET
        wallet_address = excluded.wallet_address,
        updated_at = datetime('now')
    `).bind(did, walletAddress, getTodayString()).run();

    // Fetch current state
    const player = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    return Response.json({
      success: true,
      player: {
        did: player!.did_id,
        powerLevel: player!.power_level,
        phase1Verified: !!player!.phase1_verified,
        votesToday: player!.votes_today,
        voteStreak: player!.vote_streak ?? 0,
        onboarding: {
          did: true,
          phase1: !!player!.onboarding_phase1,
          minted: !!player!.onboarding_minted,
          voted: !!player!.onboarding_voted,
          battled: !!player!.onboarding_battled,
        },
      },
    });
  } catch (err) {
    console.error('Game register error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
