// POST /api/game/vote
// Body: { voterDid: string, nftId: string, editionNumber: number, voteType: 1 | -1 }
// Cast a vote on a Your Wojak NFT. 1 = like, -1 = dislike.

import { VOTES_PER_DAY, getTodayString } from './_shared';

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

    return Response.json({
      success: true,
      votesRemaining: VOTES_PER_DAY - votesToday - 1,
      voteType,
      editionNumber,
    });
  } catch (err) {
    console.error('Vote error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
