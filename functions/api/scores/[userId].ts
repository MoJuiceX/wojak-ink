/**
 * User Scores API
 *
 * GET /api/scores/:userId - Fetch all game scores for a user
 * Includes next rank info (who's above and points needed)
 */

interface Env {
  DB: D1Database;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const userId = params.userId as string;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Fetch all game scores grouped by game
    const scores = await env.DB.prepare(`
      SELECT
        ls.game_id,
        MAX(ls.score) as high_score,
        MAX(ls.created_at) as last_played
      FROM leaderboard_scores ls
      WHERE ls.user_id = ?
      GROUP BY ls.game_id
    `).bind(userId).all();

    // Calculate ranks and next rank info for each game
    const scoresWithRanks = await Promise.all(
      (scores.results || []).map(async (s: { game_id: string; high_score: number; last_played: string }) => {
        // Get current rank
        const rankResult = await env.DB.prepare(`
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT user_id, MAX(score) as max_score
            FROM leaderboard_scores
            WHERE game_id = ?
            GROUP BY user_id
          ) ranked
          WHERE max_score > ?
        `).bind(s.game_id, s.high_score).first<{ rank: number }>();

        const currentRank = rankResult?.rank || 1;

        // Get next rank info (player above current user)
        let nextRank = null;
        if (currentRank > 1) {
          const nextRankResult = await env.DB.prepare(`
            SELECT
              ranked.user_id,
              ranked.max_score,
              COALESCE(p.display_name, 'Player') as display_name
            FROM (
              SELECT user_id, MAX(score) as max_score
              FROM leaderboard_scores
              WHERE game_id = ?
              GROUP BY user_id
            ) ranked
            LEFT JOIN profiles p ON ranked.user_id = p.user_id
            WHERE ranked.max_score > ?
            ORDER BY ranked.max_score ASC
            LIMIT 1
          `).bind(s.game_id, s.high_score).first<{
            user_id: string;
            max_score: number;
            display_name: string;
          }>();

          if (nextRankResult) {
            nextRank = {
              rank: currentRank - 1,
              userId: nextRankResult.user_id,
              displayName: nextRankResult.display_name,
              score: nextRankResult.max_score,
              pointsNeeded: nextRankResult.max_score - s.high_score + 1,
            };
          }
        }

        return {
          gameId: s.game_id,
          highScore: s.high_score,
          rank: currentRank,
          lastPlayed: s.last_played,
          nextRank,
        };
      })
    );

    return new Response(JSON.stringify({
      scores: scoresWithRanks,
    }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Scores API] Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};
