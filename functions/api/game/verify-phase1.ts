// POST /api/game/verify-phase1
// Body: { did: string }
// Checks MintGarden API for Phase 1 NFT ownership by DID.

import { PHASE1_COLLECTION_ID, ONBOARDING_CREDITS } from './_shared';
import { verifyGameAuth, isAuthError } from './_auth';
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { did: string };
    const { did } = body;

    const authResult = await verifyGameAuth(context.request, context.env, did);
    if (isAuthError(authResult)) return authResult;

    const rlKey = getRateLimitKey(context.request, authResult.userId);
    const rl = await checkRateLimit(context.env.DB, rlKey, GAME_RATE_LIMITS.verifyPhase1);
    if (!rl.allowed) {
      return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
    }

    if (!did) {
      return Response.json({ error: 'DID required' }, { status: 400 });
    }

    // Check if already verified
    const player = await context.env.DB.prepare(
      'SELECT phase1_verified FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    if (!player) {
      return Response.json({ error: 'Player not registered. Call /api/game/register first.' }, { status: 404 });
    }

    if (player.phase1_verified) {
      return Response.json({ success: true, verified: true, alreadyVerified: true });
    }

    // Query MintGarden for Phase 1 NFTs owned by this DID
    // MintGarden API: GET /nfts?collection_id=...&owner_did=...
    const mgUrl = `https://api.mintgarden.io/nfts?collection_id=${PHASE1_COLLECTION_ID}&owner_did=${encodeURIComponent(did)}&size=1`;

    const mgResponse = await fetch(mgUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!mgResponse.ok) {
      console.error('MintGarden API error:', mgResponse.status);
      return Response.json({ error: 'Failed to verify NFT ownership' }, { status: 502 });
    }

    const mgData = await mgResponse.json() as { items: unknown[] };
    const hasPhase1 = mgData.items && mgData.items.length > 0;

    if (hasPhase1) {
      // Mark as verified + award onboarding credits
      await context.env.DB.batch([
        context.env.DB.prepare(`
          UPDATE game_players
          SET phase1_verified = 1,
              phase1_verified_at = datetime('now'),
              onboarding_phase1 = 1,
              updated_at = datetime('now')
          WHERE did_id = ?
        `).bind(did),
        // Award onboarding credits
        context.env.DB.prepare(`
          INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
          VALUES (
            (SELECT wallet_address FROM game_players WHERE did_id = ?),
            'onboarding_phase1',
            'onboarding_phase1_' || ?,
            0, 0, ?, 100, 'onboarding', 'onboarding',
            datetime('now')
          )
        `).bind(did, did, ONBOARDING_CREDITS.phase1),
      ]);
    }

    return Response.json({
      success: true,
      verified: hasPhase1,
      message: hasPhase1
        ? 'Phase 1 NFT verified! You can now participate in the game.'
        : 'No Wojak Farmers Plot NFT found on this DID. You need at least 1 to play.',
    });
  } catch (err) {
    console.error('Phase 1 verify error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
