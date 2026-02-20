// POST /api/game/link-did
// Body: { did: string, walletAddress?: string }
// Clerk auth required. Links the signed-in Clerk user to a DID (1:1).
// If DID is already linked to another Clerk user, returns 403.

import { isValidDid, getTodayString } from './_shared';
import { isValidChiaAddress } from '../../lib/validation';
import { authenticateRequest } from '../../lib/auth';
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.CLERK_DOMAIN) {
      return Response.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.userId;
    const body = await context.request.json() as { did?: string; walletAddress?: string };
    const did = body.did?.trim();
    const walletAddress = body.walletAddress?.trim() || '';

    if (!did || !isValidDid(did)) {
      return Response.json({ error: 'Invalid DID format' }, { status: 400 });
    }
    if (walletAddress && !isValidChiaAddress(walletAddress)) {
      return Response.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    const rlKey = getRateLimitKey(context.request, userId);
    const rl = await checkRateLimit(context.env.DB, rlKey, GAME_RATE_LIMITS.linkDid);
    if (!rl.allowed) {
      return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
    }

    const db = context.env.DB;

    // 1) Unlink: clear clerk_user_id from any row currently linked to this user
    await db.prepare(
      'UPDATE game_players SET clerk_user_id = NULL WHERE clerk_user_id = ?'
    ).bind(userId).run();

    // 2) Find row for the requested DID
    const existing = await db.prepare(
      'SELECT did_id, clerk_user_id, wallet_address FROM game_players WHERE did_id = ?'
    ).bind(did).first<{ did_id: string; clerk_user_id: string | null; wallet_address: string }>();

    if (existing) {
      if (existing.clerk_user_id != null && existing.clerk_user_id !== userId) {
        return Response.json(
          { error: 'This DID is already linked to another account.' },
          { status: 403 }
        );
      }
      const newWallet = walletAddress || existing.wallet_address || '';
      await db.prepare(
        `UPDATE game_players SET clerk_user_id = ?, wallet_address = ?, updated_at = datetime('now') WHERE did_id = ?`
      ).bind(userId, newWallet, did).run();
    } else {
      // 3) Insert new row (wallet_address NOT NULL; use placeholder if empty)
      const wallet = walletAddress || '';
      await db.prepare(
        `INSERT INTO game_players (did_id, clerk_user_id, wallet_address, votes_today_reset)
         VALUES (?, ?, ?, ?)`
      ).bind(did, userId, wallet, getTodayString()).run();
    }

    const player = await db.prepare('SELECT * FROM game_players WHERE did_id = ?').bind(did).first();
    if (!player) {
      return Response.json({ error: 'Internal error' }, { status: 500 });
    }

    return Response.json({
      success: true,
      player: playerResponse(player as Record<string, unknown>),
    });
  } catch (err) {
    console.error('Link DID error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
