/**
 * Cloudflare Pages Function - /api/user/stats
 *
 * GET: Returns user's personal statistics across all games
 * 
 * Query params:
 * - compare_with: userId (optional, for friend comparison)
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

interface PerGameStats {
  gameId: string;
  gameName: string;
  gamesPlayed: number;
  bestRank: number | null;
  bestScore: number;
}

interface BestRankInfo {
  rank: number;
  gameId: string;
  gameName: string;
  achievedAt: string;
}

interface FavoriteGameInfo {
  gameId: string;
  gameName: string;
  gamesPlayed: number;
}

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  bestRankEver: BestRankInfo | null;
  totalGamesPlayed: number;
  totalOrangesEarned: number;
  favoriteGame: FavoriteGameInfo | null;
  perGameStats: PerGameStats[];
}

interface ComparisonResult {
  theirStats: UserStats;
  theirDisplayName: string;
  theirAvatar: {
    type: 'emoji' | 'nft';
    value: string;
  };
  wins: {
    you: number;
    them: number;
  };
}

interface UserStatsResponse {
  stats: UserStats;
  comparison?: ComparisonResult;
}

// Game name mapping
const GAME_NAMES: Record<string, string> = {
  'orange-stack': 'Orange Stack',
  'memory-match': 'Memory Match',
  'orange-pong': 'Orange Pong',
  'wojak-runner': 'Wojak Runner',
  'orange-juggle': 'Orange Juggle',
  'knife-game': 'Knife Game',
  'color-reaction': 'Color Reaction',
  'merge-2048': 'Wojak Merge',
  'orange-wordle': 'Orange Wordle',
  'block-puzzle': 'Block Puzzle',
  'flappy-orange': 'Flappy Orange',
  'citrus-drop': 'Citrus Drop',
  'orange-snake': 'Orange Snake',
  'brick-breaker': 'Brick Breaker',
  'wojak-whack': 'Wojak Whack',
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * Get user's statistics
 */
async function getUserStats(db: D1Database, userId: string): Promise<UserStats> {
  // Get profile data (streak, oranges)
  const profile = await db
    .prepare(`
      SELECT 
        COALESCE(current_streak, 0) as current_streak,
        COALESCE(longest_streak, 0) as longest_streak,
        COALESCE(lifetime_oranges_from_games, 0) as lifetime_oranges
      FROM profiles 
      WHERE user_id = ?
    `)
    .bind(userId)
    .first<{
      current_streak: number;
      longest_streak: number;
      lifetime_oranges: number;
    }>();

  // Get total games played
  const totalGamesResult = await db
    .prepare('SELECT COUNT(*) as count FROM leaderboard_scores WHERE user_id = ?')
    .bind(userId)
    .first<{ count: number }>();

  // Get per-game stats
  const perGameResults = await db
    .prepare(`
      SELECT 
        game_id,
        COUNT(*) as games_played,
        MAX(score) as best_score
      FROM leaderboard_scores
      WHERE user_id = ?
      GROUP BY game_id
      ORDER BY games_played DESC
    `)
    .bind(userId)
    .all<{
      game_id: string;
      games_played: number;
      best_score: number;
    }>();

  // Get best ranks from user_best_ranks table
  const bestRanksResult = await db
    .prepare(`
      SELECT game_id, best_rank, achieved_at
      FROM user_best_ranks
      WHERE user_id = ?
    `)
    .bind(userId)
    .all<{
      game_id: string;
      best_rank: number;
      achieved_at: string;
    }>();

  const bestRanksMap = new Map(
    (bestRanksResult.results || []).map(r => [r.game_id, r])
  );

  // Build per-game stats
  const perGameStats: PerGameStats[] = (perGameResults.results || []).map(row => {
    const bestRankData = bestRanksMap.get(row.game_id);
    return {
      gameId: row.game_id,
      gameName: GAME_NAMES[row.game_id] || row.game_id,
      gamesPlayed: row.games_played,
      bestRank: bestRankData?.best_rank || null,
      bestScore: row.best_score,
    };
  });

  // Find best rank ever across all games
  let bestRankEver: BestRankInfo | null = null;
  for (const [gameId, data] of bestRanksMap) {
    if (!bestRankEver || data.best_rank < bestRankEver.rank) {
      bestRankEver = {
        rank: data.best_rank,
        gameId: gameId,
        gameName: GAME_NAMES[gameId] || gameId,
        achievedAt: data.achieved_at,
      };
    }
  }

  // Determine favorite game (most played)
  let favoriteGame: FavoriteGameInfo | null = null;
  if (perGameStats.length > 0) {
    const mostPlayed = perGameStats[0]; // Already sorted by games_played DESC
    favoriteGame = {
      gameId: mostPlayed.gameId,
      gameName: mostPlayed.gameName,
      gamesPlayed: mostPlayed.gamesPlayed,
    };
  }

  return {
    currentStreak: profile?.current_streak || 0,
    longestStreak: profile?.longest_streak || 0,
    bestRankEver,
    totalGamesPlayed: totalGamesResult?.count || 0,
    totalOrangesEarned: profile?.lifetime_oranges || 0,
    favoriteGame,
    perGameStats,
  };
}

/**
 * Compare stats between two users
 */
function compareStats(myStats: UserStats, theirStats: UserStats): { you: number; them: number } {
  let myWins = 0;
  let theirWins = 0;

  // Compare streaks
  if (myStats.currentStreak > theirStats.currentStreak) myWins++;
  else if (theirStats.currentStreak > myStats.currentStreak) theirWins++;

  // Compare best rank (lower is better)
  if (myStats.bestRankEver && theirStats.bestRankEver) {
    if (myStats.bestRankEver.rank < theirStats.bestRankEver.rank) myWins++;
    else if (theirStats.bestRankEver.rank < myStats.bestRankEver.rank) theirWins++;
  } else if (myStats.bestRankEver && !theirStats.bestRankEver) {
    myWins++;
  } else if (!myStats.bestRankEver && theirStats.bestRankEver) {
    theirWins++;
  }

  // Compare total games
  if (myStats.totalGamesPlayed > theirStats.totalGamesPlayed) myWins++;
  else if (theirStats.totalGamesPlayed > myStats.totalGamesPlayed) theirWins++;

  // Compare oranges
  if (myStats.totalOrangesEarned > theirStats.totalOrangesEarned) myWins++;
  else if (theirStats.totalOrangesEarned > myStats.totalOrangesEarned) theirWins++;

  return { you: myWins, them: theirWins };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  // Check if DB is configured
  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Authenticate request
  if (!env.CLERK_DOMAIN) {
    return new Response(
      JSON.stringify({ error: 'Auth not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const { userId } = auth;

  try {
    // Get user's stats
    const stats = await getUserStats(env.DB, userId);

    // Check for comparison request
    const url = new URL(request.url);
    const compareWith = url.searchParams.get('compare_with');

    let comparison: ComparisonResult | undefined;

    if (compareWith && compareWith !== userId) {
      // Get comparison user's stats
      const theirStats = await getUserStats(env.DB, compareWith);

      // Get their profile info
      const theirProfile = await env.DB
        .prepare(`
          SELECT 
            COALESCE(display_name, 'Player') as display_name,
            COALESCE(avatar_type, 'emoji') as avatar_type,
            COALESCE(avatar_value, '🎮') as avatar_value
          FROM profiles
          WHERE user_id = ?
        `)
        .bind(compareWith)
        .first<{
          display_name: string;
          avatar_type: string;
          avatar_value: string;
        }>();

      comparison = {
        theirStats,
        theirDisplayName: theirProfile?.display_name || 'Player',
        theirAvatar: {
          type: (theirProfile?.avatar_type || 'emoji') as 'emoji' | 'nft',
          value: theirProfile?.avatar_value || '🎮',
        },
        wins: compareStats(stats, theirStats),
      };
    }

    const response: UserStatsResponse = {
      stats,
      comparison,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('[User Stats] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
