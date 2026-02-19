// POST /api/game/vote
// Body: { voterDid: string, nftId: string, editionNumber: number, voteType: 1 | -1 }
// Cast a vote on a Your Wojak NFT. 1 = like, -1 = dislike.

import { VOTES_PER_DAY, getTodayString, getYesterdayString, STREAK_MILESTONES, ONBOARDING_CREDITS, VOTES_PER_CREDIT, VOTE_CREDIT_AMOUNT } from './_shared';
import { verifyGamePlayer, isAuthError } from './_auth';
import { checkRateLimit, getRateLimitKey, GAME_RATE_LIMITS } from '../../lib/rateLimit';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      voterDid: string;
      nftId: string;
      editionNumber: number;
      voteType: 1 | -1;
    };

    const { voterDid, nftId, editionNumber, voteType } = body;

    const authResult = await verifyGamePlayer(context.env, voterDid);
    if (isAuthError(authResult)) return authResult;

    const rlKey = getRateLimitKey(context.request, authResult.did);
    const rl = await checkRateLimit(context.env.DB, rlKey, GAME_RATE_LIMITS.vote);
    if (!rl.allowed) {
      return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
    }

    // Validate inputs
    if (!voterDid || !nftId || !editionNumber || ![1, -1].includes(voteType)) {
      return Response.json({ error: 'Invalid vote parameters' }, { status: 400 });
    }

    // Check player exists and is verified
    const player = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE did_id = ?'
    ).bind(voterDid).first();

    if (!player) {
      return Response.json({ error: 'Player not registered' }, { status: 403 });
    }
    if (!player.phase1_verified) {
      return Response.json({ error: 'Phase 1 NFT verification required' }, { status: 403 });
    }

    // Reset daily vote counter if new day
    const today = getTodayString();
    let votesToday = player.votes_today as number;
    if (player.votes_today_reset !== today) {
      votesToday = 0;
      await context.env.DB.prepare(
        'UPDATE game_players SET votes_today = 0, votes_today_reset = ? WHERE did_id = ?'
      ).bind(today, voterDid).run();
    }

    // Check daily limit
    if (votesToday >= VOTES_PER_DAY) {
      return Response.json({
        error: 'Daily vote limit reached',
        votesRemaining: 0,
        resetsAt: new Date(new Date(today + 'T00:00:00Z').getTime() + 86400000).toISOString(),
      }, { status: 429 });
    }

    // Check not voting on own or held NFT
    const holdsNft = await context.env.DB.prepare(
      'SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?'
    ).bind(voterDid, nftId).first();

    if (holdsNft) {
      return Response.json({ error: 'Cannot vote on NFTs you hold' }, { status: 403 });
    }

    // Check not voting on own creation (check wojak_scores first, fall back to phase2_mints for unvoted NFTs)
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

    // Check for existing vote (re-vote after 24h cooldown)
    const existingVote = await context.env.DB.prepare(
      'SELECT id, vote_type FROM wojak_votes WHERE voter_did = ? AND nft_id = ?'
    ).bind(voterDid, nftId).first<{ id: number; vote_type: number }>();

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
        // like→dislike: -2 total (undo +1, apply -1)
        // dislike→like: +2 total (undo -1, apply +1)
        if (previousVoteType === 1 && voteType === -1) {
          // Was like, now dislike
          likesDelta = -1;
          dislikesDelta = 1;
          netScoreDelta = -2;
        } else {
          // Was dislike, now like
          likesDelta = 1;
          dislikesDelta = -1;
          netScoreDelta = 2;
        }

        // Update the existing vote record
        await context.env.DB.prepare(
          'UPDATE wojak_votes SET vote_type = ?, created_at = datetime(\'now\') WHERE id = ?'
        ).bind(voteType, existingVote.id).run();
      }
    } else {
      // New vote
      await context.env.DB.prepare(`
        INSERT INTO wojak_votes (voter_did, nft_id, edition_number, vote_type)
        VALUES (?, ?, ?, ?)
      `).bind(voterDid, nftId, editionNumber, voteType).run();

      likesDelta = voteType === 1 ? 1 : 0;
      dislikesDelta = voteType === -1 ? 1 : 0;
      netScoreDelta = voteType;
      totalVotesDelta = 1;
    }

    // Update cached scores (only if there's a delta)
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

    // Update power score in combat_fighters (only if score changed)
    if (netScoreDelta !== 0) {
      await context.env.DB.prepare(`
        UPDATE combat_fighters
        SET vote_power = vote_power + ?,
            power_score = vote_power + ? + battle_power,
            updated_at = datetime('now')
        WHERE nft_id = ?
      `).bind(netScoreDelta, netScoreDelta, nftId).run();
    }

    // Update player vote count (only increment totals for new votes, not re-votes)
    const isFirstVote = !isReVote && (player.total_votes_cast as number) === 0;
    const statements: D1PreparedStatement[] = [];

    if (!isReVote) {
      statements.push(
        context.env.DB.prepare(`
          UPDATE game_players
          SET votes_today = votes_today + 1,
              total_votes_cast = total_votes_cast + 1,
              updated_at = datetime('now')
          WHERE did_id = ?
        `).bind(voterDid)
      );
    }

    // Track participation credits (1 credit per 20 votes) - only for new votes
    const walletAddress = player.wallet_address as string;
    if (!isReVote) {
      const voteTracking = await context.env.DB.prepare(
        'SELECT total_votes, credits_awarded_at FROM vote_credit_tracking WHERE wallet_address = ?'
      ).bind(walletAddress).first<{ total_votes: number; credits_awarded_at: number }>();

      const currentTotalVotes = (voteTracking?.total_votes ?? 0) + 1;
      const lastAwardedAt = voteTracking?.credits_awarded_at ?? 0;
      const votesSinceLastCredit = currentTotalVotes - lastAwardedAt;

      // Upsert vote tracking
      statements.push(
        context.env.DB.prepare(`
          INSERT INTO vote_credit_tracking (wallet_address, total_votes, last_vote_date)
          VALUES (?, 1, ?)
          ON CONFLICT(wallet_address) DO UPDATE SET
            total_votes = total_votes + 1,
            last_vote_date = ?
        `).bind(walletAddress, today, today)
      );

      // Award participation credit if reached 20 votes since last award
      if (votesSinceLastCredit >= VOTES_PER_CREDIT) {
        statements.push(
          context.env.DB.prepare(`
            UPDATE vote_credit_tracking SET credits_awarded_at = ? WHERE wallet_address = ?
          `).bind(currentTotalVotes, walletAddress),
          context.env.DB.prepare(`
            INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
            VALUES (?, 'participation_vote', ?, 0, 0, ?, 100, 'participation', 'vote_reward', datetime('now'))
          `).bind(walletAddress, `vote_credit_${walletAddress}_${currentTotalVotes}`, VOTE_CREDIT_AMOUNT)
        );
      }
    }

    // First vote onboarding milestone + activity log + credits
    if (isFirstVote) {
      statements.push(
        context.env.DB.prepare(
          'UPDATE game_players SET onboarding_voted = 1 WHERE did_id = ?'
        ).bind(voterDid),
        context.env.DB.prepare(
          `INSERT INTO game_activity (did_id, event_type, event_data) VALUES (?, 'vote_milestone', ?)`
        ).bind(voterDid, JSON.stringify({ count: 1, milestone: 'first_vote' })),
        context.env.DB.prepare(`
          INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
          VALUES (?, 'onboarding_first_vote', ?, 0, 0, ?, 100, 'onboarding', 'onboarding', datetime('now'))
        `).bind(player.wallet_address, `onboarding_first_vote_${voterDid}`, ONBOARDING_CREDITS.first_vote)
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

    await context.env.DB.batch(statements);

    // Vote streak tracking: update when all daily votes used
    const votesRemaining = VOTES_PER_DAY - votesToday - 1;
    let voteStreak = (player.vote_streak as number) || 0;

    if (votesRemaining === 0) {
      const yesterday = getYesterdayString();
      const lastStreakDate = player.vote_streak_last_date as string | null;

      if (lastStreakDate === yesterday) {
        // Consecutive day — extend streak
        voteStreak = voteStreak + 1;
      } else if (lastStreakDate === today) {
        // Already counted today (shouldn't happen, but safe)
        // keep current streak
      } else {
        // Streak broken — start fresh
        voteStreak = 1;
      }

      const streakStatements: D1PreparedStatement[] = [
        context.env.DB.prepare(`
          UPDATE game_players
          SET vote_streak = ?,
              vote_streak_last_date = ?,
              vote_streak_longest = MAX(COALESCE(vote_streak_longest, 0), ?)
          WHERE did_id = ?
        `).bind(voteStreak, today, voteStreak, voterDid),
      ];

      // Award milestone credits
      const milestoneCredits = STREAK_MILESTONES[voteStreak];
      if (milestoneCredits) {
        streakStatements.push(
          context.env.DB.prepare(`
            INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
            VALUES (?, ?, ?, 0, 0, ?, 100, 'streak', 'streak', datetime('now'))
          `).bind(player.wallet_address, `streak_${voteStreak}`, `streak_${voteStreak}_${voterDid}`, milestoneCredits),
          context.env.DB.prepare(`
            INSERT INTO game_activity (did_id, event_type, event_data) VALUES (?, 'streak_milestone', ?)
          `).bind(voterDid, JSON.stringify({ days: voteStreak, credits: milestoneCredits }))
        );
      }

      await context.env.DB.batch(streakStatements);
    }

    // Fetch updated onboarding state
    const updated = await context.env.DB.prepare(
      'SELECT onboarding_phase1, onboarding_minted, onboarding_voted, onboarding_battled FROM game_players WHERE did_id = ?'
    ).bind(voterDid).first();

    return Response.json({
      success: true,
      votesRemaining: isReVote ? votesRemaining + 1 : votesRemaining, // Re-votes don't consume daily quota
      voteType,
      editionNumber,
      voteStreak,
      isReVote,
      onboarding: updated ? {
        phase1: !!updated.onboarding_phase1,
        minted: !!updated.onboarding_minted,
        voted: !!updated.onboarding_voted,
        battled: !!updated.onboarding_battled,
      } : undefined,
    });
  } catch (err) {
    console.error('Vote error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
