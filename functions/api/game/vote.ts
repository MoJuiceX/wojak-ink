// POST /api/game/vote
// Body: { voterDid: string, nftId: string, editionNumber: number, voteType: 1 | -1 }
// Cast a vote on a Your Wojak NFT. 1 = like, -1 = dislike.

import { VOTES_PER_DAY, getTodayString, getYesterdayString, STREAK_MILESTONES } from './_shared';
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
      nftId: string;
      editionNumber: number;
      voteType: 1 | -1;
    };

    const { voterDid, nftId, editionNumber, voteType } = body;

    const authResult = await verifyGameAuth(context.request, context.env, voterDid);
    if (isAuthError(authResult)) return authResult;

    const rlKey = getRateLimitKey(context.request, authResult.userId);
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
        resetsAt: today + 'T00:00:00Z',
      }, { status: 429 });
    }

    // Check not voting on own or held NFT
    const holdsNft = await context.env.DB.prepare(
      'SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?'
    ).bind(voterDid, nftId).first();

    if (holdsNft) {
      return Response.json({ error: 'Cannot vote on NFTs you hold' }, { status: 403 });
    }

    // Check not voting on own creation
    const nftScore = await context.env.DB.prepare(
      'SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?'
    ).bind(nftId).first();

    if (nftScore) {
      const playerWallet = player.wallet_address as string;
      if (nftScore.creator_wallet === playerWallet) {
        return Response.json({ error: 'Cannot vote on your own creations' }, { status: 403 });
      }
    }

    // Insert vote (UNIQUE constraint prevents duplicates)
    try {
      await context.env.DB.prepare(`
        INSERT INTO wojak_votes (voter_did, nft_id, edition_number, vote_type)
        VALUES (?, ?, ?, ?)
      `).bind(voterDid, nftId, editionNumber, voteType).run();
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('UNIQUE')) {
        return Response.json({ error: 'Already voted on this Wojak' }, { status: 409 });
      }
      throw e;
    }

    // Update cached scores
    const likesDelta = voteType === 1 ? 1 : 0;
    const dislikesDelta = voteType === -1 ? 1 : 0;

    await context.env.DB.prepare(`
      INSERT INTO wojak_scores (nft_id, edition_number, creator_wallet, likes, dislikes, net_score, total_votes, first_voted_at, last_voted_at)
      VALUES (?, ?, COALESCE((SELECT wallet_address FROM phase2_mints WHERE mint_number = ?), 'unknown'), ?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(nft_id) DO UPDATE SET
        likes = likes + ?,
        dislikes = dislikes + ?,
        net_score = net_score + ?,
        total_votes = total_votes + 1,
        last_voted_at = datetime('now')
    `).bind(
      nftId, editionNumber, editionNumber,
      likesDelta, dislikesDelta, voteType,
      likesDelta, dislikesDelta, voteType
    ).run();

    // Update player vote count
    const isFirstVote = (player.total_votes_cast as number) === 0;
    const statements = [
      context.env.DB.prepare(`
        UPDATE game_players
        SET votes_today = votes_today + 1,
            total_votes_cast = total_votes_cast + 1,
            updated_at = datetime('now')
        WHERE did_id = ?
      `).bind(voterDid),
    ];

    // First vote onboarding milestone + activity log
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

    return Response.json({
      success: true,
      votesRemaining,
      voteType,
      editionNumber,
      voteStreak,
    });
  } catch (err) {
    console.error('Vote error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
