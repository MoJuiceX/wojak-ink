// POST /api/game/battle-queue — join queue with an NFT
// DELETE /api/game/battle-queue — leave queue
// Body: { did: string, nftId: string, editionNumber: number }
//
// Auto-matchmaking: when 2+ NFTs are queued from different owners,
// the system creates a battle and removes both from the queue.

import { isValidDid } from './_shared';
import { authenticateRequest } from '../../lib/auth';

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
    const body = await context.request.json() as {
      did: string;
      nftId: string;
      editionNumber: number;
    };

    const { did, nftId, editionNumber } = body;

    if (!did || !isValidDid(did) || !nftId || !editionNumber) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Check player exists and is verified
    const player = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    if (!player) {
      return Response.json({ error: 'Player not registered' }, { status: 403 });
    }
    if (!player.phase1_verified) {
      return Response.json({ error: 'Phase 1 NFT verification required' }, { status: 403 });
    }

    // Verify ownership: player must hold this NFT
    const holds = await context.env.DB.prepare(
      'SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?'
    ).bind(did, nftId).first();

    if (!holds) {
      return Response.json({ error: 'You do not own this NFT' }, { status: 403 });
    }

    // Check NFT is not already in an active battle
    const inBattle = await context.env.DB.prepare(
      `SELECT 1 FROM battles
       WHERE (nft_a_id = ? OR nft_b_id = ?) AND status = 'active'`
    ).bind(nftId, nftId).first();

    if (inBattle) {
      return Response.json({ error: 'This NFT is already in an active battle' }, { status: 409 });
    }

    // Add to queue (UNIQUE constraint prevents duplicates)
    try {
      await context.env.DB.prepare(`
        INSERT INTO battle_queue (nft_id, edition_number, owner_did)
        VALUES (?, ?, ?)
      `).bind(nftId, editionNumber, did).run();
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('UNIQUE')) {
        return Response.json({ error: 'This NFT is already in the queue' }, { status: 409 });
      }
      throw e;
    }

    // Try matchmaking: find another queued NFT from a different owner
    const opponent = await context.env.DB.prepare(
      'SELECT * FROM battle_queue WHERE owner_did != ? ORDER BY queued_at ASC LIMIT 1'
    ).bind(did).first();

    if (opponent) {
      // Create a battle
      const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await context.env.DB.batch([
        // Insert battle
        context.env.DB.prepare(`
          INSERT INTO battles (nft_a_id, nft_a_edition, nft_a_owner_did, nft_b_id, nft_b_edition, nft_b_owner_did, ends_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          nftId, editionNumber, did,
          opponent.nft_id, opponent.edition_number, opponent.owner_did,
          endsAt
        ),
        // Remove both from queue
        context.env.DB.prepare('DELETE FROM battle_queue WHERE nft_id = ?').bind(nftId),
        context.env.DB.prepare('DELETE FROM battle_queue WHERE nft_id = ?').bind(opponent.nft_id),
        // Log activity for both players
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_started', ?)
        `).bind(did, JSON.stringify({ opponentDid: opponent.owner_did, editionNumber })),
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_started', ?)
        `).bind(opponent.owner_did as string, JSON.stringify({ opponentDid: did, editionNumber: opponent.edition_number })),
      ]);

      // First battle onboarding milestone for both players
      const isFirstBattleA = !(player.onboarding_battled as number);
      const isFirstBattleB = await context.env.DB.prepare(
        'SELECT onboarding_battled FROM game_players WHERE did_id = ?'
      ).bind(opponent.owner_did).first();

      const milestoneStmts: D1PreparedStatement[] = [];
      if (isFirstBattleA) {
        milestoneStmts.push(
          context.env.DB.prepare(
            'UPDATE game_players SET onboarding_battled = 1 WHERE did_id = ?'
          ).bind(did)
        );
      }
      if (isFirstBattleB && !(isFirstBattleB.onboarding_battled as number)) {
        milestoneStmts.push(
          context.env.DB.prepare(
            'UPDATE game_players SET onboarding_battled = 1 WHERE did_id = ?'
          ).bind(opponent.owner_did as string)
        );
      }
      if (milestoneStmts.length > 0) {
        await context.env.DB.batch(milestoneStmts);
      }

      return Response.json({
        success: true,
        matched: true,
        message: 'Battle started! Your NFT has been matched.',
      });
    }

    return Response.json({
      success: true,
      matched: false,
      message: 'Added to queue. Waiting for an opponent...',
    });
  } catch (err) {
    console.error('Battle queue error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
  if (!auth) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await context.request.json() as {
      did: string;
      nftId: string;
    };

    const { did, nftId } = body;

    if (!did || !nftId) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Only the owner can remove from queue
    const result = await context.env.DB.prepare(
      'DELETE FROM battle_queue WHERE nft_id = ? AND owner_did = ?'
    ).bind(nftId, did).run();

    if (!result.meta?.changes) {
      return Response.json({ error: 'NFT not found in queue' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Removed from queue.' });
  } catch (err) {
    console.error('Battle queue leave error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
