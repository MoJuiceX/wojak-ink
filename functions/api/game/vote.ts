// POST /api/game/vote
// Body: { voterDid?: string, guestId?: string, nftId: string, editionNumber: number, voteType: 1 | -1 }
// Cast a vote on a Your Wojak NFT. 1 = like, -1 = dislike.
// All users can vote unlimited times. Only holders (DAD + Farmers Plot) earn credits.

import { getTodayString, VOTES_PER_CREDIT, VOTE_CREDIT_AMOUNT, MAX_CREDIT_VOTES_PER_DAY, isValidGuestId } from './_shared';
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      voterDid?: string | null;
      guestId?: string | null;
      nftId: string;
      editionNumber: number;
      voteType: 1 | -1;
    };

    const { voterDid, guestId, nftId, editionNumber, voteType } = body;

    // Validate inputs
    if (!nftId || !editionNumber || ![1, -1].includes(voteType)) {
      return Response.json({ error: 'Invalid vote parameters' }, { status: 400 });
    }

    // Must have either voterDid or guestId
    if (!voterDid && !guestId) {
      return Response.json({ error: 'Either voterDid or guestId required' }, { status: 400 });
    }

    // Validate guestId format if provided
    if (guestId && !isValidGuestId(guestId)) {
      return Response.json({ error: 'Invalid guest ID format' }, { status: 400 });
    }

    // Determine voter identity and tier
    const voterId = voterDid || guestId!;
    let player: Record<string, unknown> | null = null;
    let isHolder = false;

    if (voterDid) {
      // Check if player exists and their verification status
      player = await context.env.DB.prepare(
        'SELECT * FROM game_players WHERE did_id = ?'
      ).bind(voterDid).first();

      isHolder = !!player?.phase1_verified;
    }

    // Rate limit by voter ID (DID or guestId)
    const rlKey = getRateLimitKey(context.request, voterId);
    const rl = await checkRateLimit(context.env.DB, rlKey, GAME_RATE_LIMITS.vote);
    if (!rl.allowed) {
      return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
    }

    const today = getTodayString();

    // For holders with DID, check not voting on own or held NFT
    if (voterDid && player) {
      const holdsNft = await context.env.DB.prepare(
        'SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?'
      ).bind(voterDid, nftId).first();

      if (holdsNft) {
        return Response.json({ error: 'Cannot vote on NFTs you hold' }, { status: 403 });
      }

      // Check not voting on own creation
      const playerWallet = player.wallet_address as string;
      const creatorRow = await context.env.DB.prepare(
        `SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?
         UNION ALL
         SELECT wallet_address AS creator_wallet FROM phase2_mints WHERE mintgarden_launcher_id = ?
         LIMIT 1`
      ).bind(nftId, nftId).first();

      if (creatorRow && creatorRow.creator_wallet === playerWallet) {
        return Response.json({ error: 'Cannot vote on your own creations' }, { status: 403 });
      }
    }

    // Check for existing vote (re-vote after 24h cooldown)
    const existingVote = await context.env.DB.prepare(
      'SELECT id, vote_type FROM wojak_votes WHERE voter_did = ? AND nft_id = ?'
    ).bind(voterId, nftId).first<{ id: number; vote_type: number }>();

    let likesDelta = 0;
    let dislikesDelta = 0;
    let netScoreDelta = 0;
    let totalVotesDelta = 0;
    let isReVote = false;

    if (existingVote) {
      isReVote = true;
      const previousVoteType = existingVote.vote_type;

      if (previousVoteType === voteType) {
        // Same direction re-vote: just update timestamp, no power change
        await context.env.DB.prepare(
          'UPDATE wojak_votes SET created_at = datetime(\'now\') WHERE id = ?'
        ).bind(existingVote.id).run();
        // No score changes needed
      } else {
        // Different direction: undo previous + apply new
        if (previousVoteType === 1 && voteType === -1) {
          likesDelta = -1;
          dislikesDelta = 1;
          netScoreDelta = -2;
        } else {
          likesDelta = 1;
          dislikesDelta = -1;
          netScoreDelta = 2;
        }

        await context.env.DB.prepare(
          'UPDATE wojak_votes SET vote_type = ?, created_at = datetime(\'now\') WHERE id = ?'
        ).bind(voteType, existingVote.id).run();
      }
    } else {
      // New vote
      await context.env.DB.prepare(`
        INSERT INTO wojak_votes (voter_did, nft_id, edition_number, vote_type)
        VALUES (?, ?, ?, ?)
      `).bind(voterId, nftId, editionNumber, voteType).run();

      likesDelta = voteType === 1 ? 1 : 0;
      dislikesDelta = voteType === -1 ? 1 : 0;
      netScoreDelta = voteType;
      totalVotesDelta = 1;
    }

    // Always update wojak_scores (vote counts) regardless of tier
    if (likesDelta !== 0 || dislikesDelta !== 0 || totalVotesDelta !== 0) {
      await context.env.DB.prepare(`
        INSERT INTO wojak_scores (nft_id, edition_number, creator_wallet, likes, dislikes, net_score, total_votes, first_voted_at, last_voted_at)
        VALUES (?, ?, COALESCE((SELECT wallet_address FROM phase2_mints WHERE mint_number = ?), 'unknown'), ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(nft_id) DO UPDATE SET
          likes = likes + ?,
          dislikes = dislikes + ?,
          net_score = net_score + ?,
          total_votes = total_votes + ?,
          last_voted_at = datetime('now')
      `).bind(
        nftId, editionNumber, editionNumber,
        Math.max(0, likesDelta), Math.max(0, dislikesDelta), netScoreDelta, totalVotesDelta,
        likesDelta, dislikesDelta, netScoreDelta, totalVotesDelta
      ).run();
    }

    // Track vote counts for analytics
    const statements: D1PreparedStatement[] = [];

    if (!isReVote && player) {
      statements.push(
        context.env.DB.prepare(`
          UPDATE game_players
          SET total_votes_cast = total_votes_cast + 1,
              updated_at = datetime('now')
          WHERE did_id = ?
        `).bind(voterDid)
      );
    }

    // Only award credits and track streaks for holders
    if (isHolder && player && voterDid) {
      const isFirstVote = !isReVote && (player.total_votes_cast as number) === 0;
      const walletAddress = player.wallet_address as string;

      // Track participation credits (max 10 votes/day count toward credits, 100 eligible votes = 1 free mint)
      if (!isReVote) {
        const voteTracking = await context.env.DB.prepare(
          'SELECT eligible_votes, credits_awarded_at, votes_today_for_credits, last_vote_date FROM vote_credit_tracking WHERE wallet_address = ?'
        ).bind(walletAddress).first<{ eligible_votes: number; credits_awarded_at: number; votes_today_for_credits: number; last_vote_date: string | null }>();

        const isNewDay = voteTracking?.last_vote_date !== today;
        const votesTodayForCredits = isNewDay ? 0 : (voteTracking?.votes_today_for_credits ?? 0);
        const isEligible = votesTodayForCredits < MAX_CREDIT_VOTES_PER_DAY;

        const currentEligibleVotes = (voteTracking?.eligible_votes ?? 0) + (isEligible ? 1 : 0);
        const lastAwardedAt = voteTracking?.credits_awarded_at ?? 0;
        const eligibleSinceLastCredit = currentEligibleVotes - lastAwardedAt;

        // Always update total_votes + last_vote_date; conditionally update eligible counters
        statements.push(
          context.env.DB.prepare(`
            INSERT INTO vote_credit_tracking (wallet_address, total_votes, eligible_votes, votes_today_for_credits, last_vote_date)
            VALUES (?, 1, ?, ?, ?)
            ON CONFLICT(wallet_address) DO UPDATE SET
              total_votes = total_votes + 1,
              eligible_votes = ?,
              votes_today_for_credits = ?,
              last_vote_date = ?
          `).bind(
            walletAddress,
            isEligible ? 1 : 0,           // INSERT eligible_votes
            isEligible ? 1 : 0,           // INSERT votes_today_for_credits
            today,                          // INSERT last_vote_date
            currentEligibleVotes,           // UPDATE eligible_votes
            isEligible ? votesTodayForCredits + 1 : votesTodayForCredits, // UPDATE votes_today_for_credits
            today                           // UPDATE last_vote_date
          )
        );

        if (isEligible && eligibleSinceLastCredit >= VOTES_PER_CREDIT) {
          statements.push(
            context.env.DB.prepare(`
              UPDATE vote_credit_tracking SET credits_awarded_at = ? WHERE wallet_address = ?
            `).bind(currentEligibleVotes, walletAddress),
            context.env.DB.prepare(`
              INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
              VALUES (?, 'participation_vote', ?, 0, 0, ?, 100, 'participation', 'vote_reward', datetime('now'))
            `).bind(walletAddress, `vote_credit_${walletAddress}_${currentEligibleVotes}`, VOTE_CREDIT_AMOUNT)
          );
        }
      }

      // First vote onboarding milestone + activity log (no credit bonus)
      if (isFirstVote) {
        statements.push(
          context.env.DB.prepare(
            'UPDATE game_players SET onboarding_voted = 1 WHERE did_id = ?'
          ).bind(voterDid),
          context.env.DB.prepare(
            `INSERT INTO game_activity (did_id, event_type, event_data) VALUES (?, 'vote_milestone', ?)`
          ).bind(voterDid, JSON.stringify({ count: 1, milestone: 'first_vote' }))
        );
      }

      // Log milestone every 10 votes
      const newTotal = (player.total_votes_cast as number) + 1;
      if (!isFirstVote && newTotal % 10 === 0) {
        statements.push(
          context.env.DB.prepare(
            `INSERT INTO game_activity (did_id, event_type, event_data) VALUES (?, 'vote_milestone', ?)`
          ).bind(voterDid, JSON.stringify({ count: newTotal }))
        );
      }
    }

    if (statements.length > 0) {
      await context.env.DB.batch(statements);
    }

    // Fetch updated onboarding state for holders
    let onboarding;
    if (voterDid && player) {
      const updated = await context.env.DB.prepare(
        'SELECT onboarding_phase1, onboarding_minted, onboarding_voted, onboarding_battled FROM game_players WHERE did_id = ?'
      ).bind(voterDid).first();
      onboarding = updated ? {
        phase1: !!updated.onboarding_phase1,
        minted: !!updated.onboarding_minted,
        voted: !!updated.onboarding_voted,
        battled: !!updated.onboarding_battled,
      } : undefined;
    }

    return Response.json({
      success: true,
      isHolder,
      voteType,
      editionNumber,
      isReVote,
      onboarding,
    });
  } catch (err) {
    console.error('Vote error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
