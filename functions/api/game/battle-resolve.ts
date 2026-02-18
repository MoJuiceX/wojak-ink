// POST /api/game/battle-resolve
// Resolves all battles past their ends_at time.
// Called by cron or manually by admin.
//
// Rules:
// - Min 10 votes required, otherwise draw
// - Winner: NFT with more votes (tie = draw)
// - Winner gets organic likes (battle votes recorded as regular votes)
// - Loser gets organic dislikes
// - Both players' Power Levels should be recalculated after

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const MIN_VOTES_FOR_RESULT = 10;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Admin auth — same pattern as /api/admin/* endpoints
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all active battles that have ended
    const expired = await context.env.DB.prepare(`
      SELECT * FROM battles
      WHERE status = 'active' AND ends_at <= datetime('now')
    `).all();

    const battles = expired.results || [];
    if (battles.length === 0) {
      return Response.json({ success: true, resolved: 0, message: 'No battles to resolve.' });
    }

    let resolved = 0;
    let draws = 0;

    for (const battle of battles) {
      const totalVotes = (battle.votes_a as number) + (battle.votes_b as number);
      const battleId = battle.id as number;

      if (totalVotes < MIN_VOTES_FOR_RESULT) {
        // Not enough votes — draw (optimistic lock: only if still active)
        const drawResult = await context.env.DB.prepare(`
          UPDATE battles SET status = 'draw', resolved_at = datetime('now')
          WHERE id = ? AND status = 'active'
        `).bind(battleId).run();

        if (drawResult.meta.changes === 0) {
          console.warn(`[Battle Resolve] Battle ${battleId} already resolved, skipping`);
          continue;
        }

        // Log activity
        await context.env.DB.batch([
          context.env.DB.prepare(`
            INSERT INTO game_activity (did_id, event_type, event_data)
            VALUES (?, 'battle_draw', ?)
          `).bind(battle.nft_a_owner_did as string, JSON.stringify({
            battleId, reason: 'insufficient_votes', totalVotes,
          })),
          context.env.DB.prepare(`
            INSERT INTO game_activity (did_id, event_type, event_data)
            VALUES (?, 'battle_draw', ?)
          `).bind(battle.nft_b_owner_did as string, JSON.stringify({
            battleId, reason: 'insufficient_votes', totalVotes,
          })),
        ]);

        draws++;
        continue;
      }

      const votesA = battle.votes_a as number;
      const votesB = battle.votes_b as number;

      if (votesA === votesB) {
        // Tie — draw (optimistic lock)
        const tieResult = await context.env.DB.prepare(`
          UPDATE battles SET status = 'draw', resolved_at = datetime('now')
          WHERE id = ? AND status = 'active'
        `).bind(battleId).run();

        if (tieResult.meta.changes === 0) {
          console.warn(`[Battle Resolve] Battle ${battleId} already resolved, skipping`);
          continue;
        }

        draws++;
        continue;
      }

      // Determine winner
      const winnerNftId = votesA > votesB ? battle.nft_a_id : battle.nft_b_id;
      const winnerEdition = votesA > votesB ? battle.nft_a_edition : battle.nft_b_edition;
      const loserNftId = votesA > votesB ? battle.nft_b_id : battle.nft_a_id;
      const loserEdition = votesA > votesB ? battle.nft_b_edition : battle.nft_a_edition;
      const winnerDid = votesA > votesB ? battle.nft_a_owner_did : battle.nft_b_owner_did;
      const loserDid = votesA > votesB ? battle.nft_b_owner_did : battle.nft_a_owner_did;
      const winnerVotes = Math.max(votesA, votesB);
      const loserVotes = Math.min(votesA, votesB);

      // Optimistic lock: only complete if still active
      const updateResult = await context.env.DB.prepare(`
        UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now')
        WHERE id = ? AND status = 'active'
      `).bind(winnerNftId, battleId).run();

      if (updateResult.meta.changes === 0) {
        console.warn(`[Battle Resolve] Battle ${battleId} already resolved, skipping`);
        continue;
      }

      // Score updates + activity logs (only after status update confirmed)
      await context.env.DB.batch([
        // Award organic likes to winner (proportional to margin)
        context.env.DB.prepare(`
          INSERT INTO wojak_scores (nft_id, edition_number, creator_wallet, likes, dislikes, net_score, total_votes, first_voted_at, last_voted_at)
          VALUES (?, ?, COALESCE((SELECT wallet_address FROM phase2_mints WHERE mint_number = ?), 'unknown'), ?, 0, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(nft_id) DO UPDATE SET
            likes = likes + ?,
            net_score = net_score + ?,
            total_votes = total_votes + ?,
            last_voted_at = datetime('now')
        `).bind(
          winnerNftId, winnerEdition, winnerEdition,
          winnerVotes, winnerVotes, winnerVotes,
          winnerVotes, winnerVotes, winnerVotes
        ),

        // Award organic dislikes to loser
        context.env.DB.prepare(`
          INSERT INTO wojak_scores (nft_id, edition_number, creator_wallet, likes, dislikes, net_score, total_votes, first_voted_at, last_voted_at)
          VALUES (?, ?, COALESCE((SELECT wallet_address FROM phase2_mints WHERE mint_number = ?), 'unknown'), 0, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(nft_id) DO UPDATE SET
            dislikes = dislikes + ?,
            net_score = net_score - ?,
            total_votes = total_votes + ?,
            last_voted_at = datetime('now')
        `).bind(
          loserNftId, loserEdition, loserEdition,
          loserVotes, -loserVotes, loserVotes,
          loserVotes, loserVotes, loserVotes
        ),

        // Activity logs
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_won', ?)
        `).bind(winnerDid as string, JSON.stringify({
          battleId, votes: winnerVotes, opponentVotes: loserVotes,
        })),
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_lost', ?)
        `).bind(loserDid as string, JSON.stringify({
          battleId, votes: loserVotes, opponentVotes: winnerVotes,
        })),
      ]);

      resolved++;
    }

    return Response.json({
      success: true,
      resolved,
      draws,
      total: battles.length,
    });
  } catch (err) {
    console.error('Battle resolve error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
