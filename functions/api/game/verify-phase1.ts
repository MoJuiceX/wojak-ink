// POST /api/game/verify-phase1
// Body: { did: string, nftId?: string }
// Checks MintGarden API for Phase 1 NFT ownership by DID.
// If nftId is provided, does a fast direct lookup on that specific NFT.
// Otherwise falls back to slower profile-based search.

import { PHASE1_COLLECTION_ID, ONBOARDING_CREDITS } from './_shared';
import { verifyGameAuth, isAuthError } from './_auth';
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

// Validate NFT launcher ID format: nft1... bech32m
function isValidNftId(id: string): boolean {
  return /^nft1[a-z0-9]{58,62}$/.test(id);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { did: string; nftId?: string };
    const { did, nftId } = body;

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

    let hasPhase1 = false;

    // Fast path: direct NFT lookup by launcher ID
    if (nftId) {
      if (!isValidNftId(nftId)) {
        return Response.json({ error: 'Invalid NFT Launcher ID format' }, { status: 400 });
      }

      const nftResponse = await fetch(
        `https://api.mintgarden.io/nfts/${encodeURIComponent(nftId)}`,
        { headers: { 'Accept': 'application/json' } },
      );

      if (nftResponse.ok) {
        // Individual NFT endpoint uses nested objects, not flat fields
        const nftData = await nftResponse.json() as {
          collection?: { id?: string };
          owner?: { encoded_id?: string };
        };
        hasPhase1 = nftData.collection?.id === PHASE1_COLLECTION_ID
          && nftData.owner?.encoded_id === did;
      }
    }

    // Slow path fallback: profile-based search
    if (!hasPhase1 && !nftId) {
      const mgUrl = `https://api.mintgarden.io/profile/${encodeURIComponent(did)}/nfts?type=owned&size=100`;
      const mgResponse = await fetch(mgUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (mgResponse.ok) {
        const mgData = await mgResponse.json() as { items: Array<{ collection_id?: string }> };
        hasPhase1 = (mgData.items || []).some(
          item => item.collection_id === PHASE1_COLLECTION_ID
        );
      }
    }

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
