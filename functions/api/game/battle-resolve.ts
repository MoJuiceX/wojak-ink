// POST /api/game/battle-resolve
// Resolves all battles past their ends_at time.
// Called by cron or manually by admin.
//
// Blind battle resolution:
// - Compute net_score delta for each NFT during the battle window
// - Higher delta wins
// - Min 5 total votes (across both NFTs) during battle window required
// - Draw if insufficient votes or tied deltas
// - Winner gets organic likes proportional to margin (clamped 1-10)
// - Loser gets organic dislikes of the same magnitude

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const MIN_VOTES_DURING_BATTLE = 5;

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
      const battleId = battle.id as number;
      const nftAId = battle.nft_a_id as string;
      const nftBId = battle.nft_b_id as string;
      const snapshotA = battle.nft_a_score_start as number;
      const snapshotB = battle.nft_b_score_start as number;
      const startedAt = battle.started_at as string;
      const endsAt = battle.ends_at as string;

      // Get current net_scores
      const currentA = await context.env.DB.prepare(
        'SELECT net_score FROM wojak_scores WHERE nft_id = ?'
      ).bind(nftAId).first<{ net_score: number }>();
      const currentB = await context.env.DB.prepare(
        'SELECT net_score FROM wojak_scores WHERE nft_id = ?'
      ).bind(nftBId).first<{ net_score: number }>();

      const deltaA = (currentA?.net_score ?? 0) - snapshotA;
      const deltaB = (currentB?.net_score ?? 0) - snapshotB;

      // Count votes during the battle window
      const votesARow = await context.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM wojak_votes WHERE nft_id = ? AND created_at >= ? AND created_at <= ?'
      ).bind(nftAId, startedAt, endsAt).first<{ cnt: number }>();
      const votesBRow = await context.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM wojak_votes WHERE nft_id = ? AND created_at >= ? AND created_at <= ?'
      ).bind(nftBId, startedAt, endsAt).first<{ cnt: number }>();

      const windowVotesA = votesARow?.cnt ?? 0;
      const windowVotesB = votesBRow?.cnt ?? 0;
      const totalWindowVotes = windowVotesA + windowVotesB;

      // Draw: insufficient votes or tied deltas
      if (totalWindowVotes < MIN_VOTES_DURING_BATTLE || deltaA === deltaB) {
        const reason = totalWindowVotes < MIN_VOTES_DURING_BATTLE ? 'insufficient_votes' : 'tied_deltas';

        const drawResult = await context.env.DB.prepare(`
          UPDATE battles SET status = 'draw', resolved_at = datetime('now'),
            nft_a_score_end = ?, nft_b_score_end = ?
          WHERE id = ? AND status = 'active'
        `).bind(currentA?.net_score ?? 0, currentB?.net_score ?? 0, battleId).run();

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
            battleId, reason, deltaA, deltaB, totalWindowVotes,
          })),
          context.env.DB.prepare(`
            INSERT INTO game_activity (did_id, event_type, event_data)
            VALUES (?, 'battle_draw', ?)
          `).bind(battle.nft_b_owner_did as string, JSON.stringify({
            battleId, reason, deltaA, deltaB, totalWindowVotes,
          })),
        ]);

        draws++;
        continue;
      }

      // Determine winner by higher delta
      const aWins = deltaA > deltaB;
      const winnerNftId = aWins ? nftAId : nftBId;
      const winnerEdition = aWins ? battle.nft_a_edition : battle.nft_b_edition;
      const loserNftId = aWins ? nftBId : nftAId;
      const loserEdition = aWins ? battle.nft_b_edition : battle.nft_a_edition;
      const winnerDid = aWins ? battle.nft_a_owner_did : battle.nft_b_owner_did;
      const loserDid = aWins ? battle.nft_b_owner_did : battle.nft_a_owner_did;
      const winnerDelta = aWins ? deltaA : deltaB;
      const loserDelta = aWins ? deltaB : deltaA;

      // Organic bonus: proportional to margin, clamped 1-10
      const margin = winnerDelta - loserDelta;
      const bonus = Math.min(Math.max(Math.ceil(margin / 2), 1), 10);

      // Optimistic lock: only complete if still active
      const updateResult = await context.env.DB.prepare(`
        UPDATE battles SET status = 'completed', winner_nft_id = ?, resolved_at = datetime('now'),
          nft_a_score_end = ?, nft_b_score_end = ?
        WHERE id = ? AND status = 'active'
      `).bind(winnerNftId, currentA?.net_score ?? 0, currentB?.net_score ?? 0, battleId).run();

      if (updateResult.meta.changes === 0) {
        console.warn(`[Battle Resolve] Battle ${battleId} already resolved, skipping`);
        continue;
      }

      // Score updates + activity logs (only after status update confirmed)
      await context.env.DB.batch([
        // Award organic likes to winner
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
          bonus, bonus, bonus,
          bonus, bonus, bonus
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
          bonus, -bonus, bonus,
          bonus, bonus, bonus
        ),

        // Activity logs
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_won', ?)
        `).bind(winnerDid as string, JSON.stringify({
          battleId, deltaA, deltaB, bonus, totalWindowVotes,
        })),
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'battle_lost', ?)
        `).bind(loserDid as string, JSON.stringify({
          battleId, deltaA, deltaB, bonus, totalWindowVotes,
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
