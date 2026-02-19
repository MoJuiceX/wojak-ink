/**
 * Cloudflare Pages Function - /api/leaderboard/[gameId]
 *
 * GET: Returns top scores for a specific game with time filtering
 * 
 * Query params:
 * - timeframe: 'daily' | 'weekly' | 'all-time' (default: 'all-time')
 * - limit: number (default: 10, max: 100)
 * - offset: number (default: 0)
 * - userId: string (optional, for user position calculation)
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

type Timeframe = 'weekly' | 'all-time';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source: 'default' | 'user' | 'wallet';
  };
  score: number;
  level?: number;
  createdAt: string;
  equipped?: {
    nameEffect?: {
      id: string;
      css_class: string;
    };
    frame?: {
      id: string;
      css_class: string;
    };
    title?: {
      id: string;
      name: string;
    };
  };
}

interface UserPosition {
  rank: number;
  score: number;
  totalPlayers: number;
  nextRival?: {
    userId: string;
    displayName: string;
    avatar: {
      type: 'emoji' | 'nft';
      value: string;
    };
    score: number;
    pointsAhead: number;
  };
}

interface LeaderboardResponse {
  gameId: string;
  timeframe: Timeframe;
  entries: LeaderboardEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  userPosition?: UserPosition;
  resetTime?: string;
}

// Valid game IDs
const VALID_GAME_IDS = [
  'orange-stack',
  'memory-match',
  'orange-pong',
  'wojak-runner',
  'orange-juggle',
  'knife-game',
  'color-reaction',
  'merge-2048',
  'orange-wordle',
  'block-puzzle',
  'flappy-orange',
  'citrus-drop',
  'orange-snake',
  'brick-breaker',
  'wojak-whack',
  'brick-by-brick',
];

// Valid timeframes
const VALID_TIMEFRAMES: Timeframe[] = ['weekly', 'all-time'];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * Get SQL WHERE clause for timeframe filtering
 */
function getTimeframeFilter(timeframe: Timeframe): string {
  switch (timeframe) {
    case 'weekly':
      // This week (Monday to now, UTC)
      // SQLite: weekday 0 = Sunday, so we calculate Monday
      return "AND ls.created_at >= datetime('now', 'weekday 0', '-6 days', 'start of day')";
    case 'all-time':
    default:
      return '';
  }
}

/**
 * Calculate next reset time for countdown
 */
function getResetTime(timeframe: Timeframe): string | undefined {
  if (timeframe === 'all-time') return undefined;

  // Next Monday midnight UTC
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const resetDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday,
    0, 0, 0, 0
  ));

  return resetDate.toISOString();
}

/**
 * Get leaderboard entries for a game with timeframe filtering
 */
async function getLeaderboard(
  db: D1Database,
  gameId: string,
  timeframe: Timeframe,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  const timeFilter = getTimeframeFilter(timeframe);
  
  const query = `
    WITH best_scores AS (
      SELECT user_id, MAX(score) as score, MIN(created_at) as created_at
      FROM leaderboard_scores ls
      WHERE ls.game_id = ? ${timeFilter}
      GROUP BY user_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY bs.score DESC, bs.created_at ASC) as rank,
      bs.user_id,
      bs.score,
      bs.created_at,
      COALESCE(p.display_name, 'Player') as display_name,
      COALESCE(p.avatar_type, 'emoji') as avatar_type,
      COALESCE(p.avatar_value, '🎮') as avatar_value,
      COALESCE(p.avatar_source, 'default') as avatar_source,
      ue.name_effect_id,
      ne.css_class as name_effect_class,
      ue.frame_id,
      fr.css_class as frame_class,
      ue.title_id,
      ti.name as title_name
    FROM best_scores bs
    LEFT JOIN profiles p ON bs.user_id = p.user_id
    LEFT JOIN user_equipped ue ON bs.user_id = ue.user_id
    LEFT JOIN shop_items ne ON ue.name_effect_id = ne.id
    LEFT JOIN shop_items fr ON ue.frame_id = fr.id
    LEFT JOIN shop_items ti ON ue.title_id = ti.id
    ORDER BY bs.score DESC, bs.created_at ASC
    LIMIT ? OFFSET ?
  `;

  const results = await db
    .prepare(query)
    .bind(gameId, limit, offset)
    .all<{
      rank: number;
      user_id: string;
      score: number;
      created_at: string;
      display_name: string;
      avatar_type: string;
      avatar_value: string;
      avatar_source: string;
      name_effect_id: string | null;
      name_effect_class: string | null;
      frame_id: string | null;
      frame_class: string | null;
      title_id: string | null;
      title_name: string | null;
    }>();

  return (results.results || []).map((row) => {
    const entry: LeaderboardEntry = {
      rank: row.rank,
      userId: row.user_id,
      displayName: row.display_name,
      avatar: {
        type: row.avatar_type as 'emoji' | 'nft',
        value: row.avatar_value,
        source: row.avatar_source as 'default' | 'user' | 'wallet',
      },
      score: row.score,
      createdAt: row.created_at,
    };

    // Add equipped items if present
    if (row.name_effect_id || row.frame_id || row.title_id) {
      entry.equipped = {};
      if (row.name_effect_id && row.name_effect_class) {
        entry.equipped.nameEffect = {
          id: row.name_effect_id,
          css_class: row.name_effect_class,
        };
      }
      if (row.frame_id && row.frame_class) {
        entry.equipped.frame = {
          id: row.frame_id,
          css_class: row.frame_class,
        };
      }
      if (row.title_id && row.title_name) {
        entry.equipped.title = {
          id: row.title_id,
          name: row.title_name,
        };
      }
    }

    return entry;
  });
}

/**
 * Get total count of entries for a game with timeframe filtering
 */
async function getLeaderboardCount(
  db: D1Database, 
  gameId: string,
  timeframe: Timeframe
): Promise<number> {
  const timeFilter = getTimeframeFilter(timeframe);
  
  const query = `
    SELECT COUNT(DISTINCT user_id) as count 
    FROM leaderboard_scores ls
    WHERE game_id = ? ${timeFilter}
  `;
  
  const result = await db
    .prepare(query)
    .bind(gameId)
    .first<{ count: number }>();

  return result?.count ?? 0;
}

/**
 * Get user's position, tier, and rival for the leaderboard
 */
async function getUserPosition(
  db: D1Database,
  gameId: string,
  userId: string,
  timeframe: Timeframe,
  totalPlayers: number
): Promise<UserPosition | undefined> {
  const timeFilter = getTimeframeFilter(timeframe);
  
  // Get user's best score for this timeframe
  const userScoreQuery = `
    SELECT MAX(score) as best_score
    FROM leaderboard_scores ls
    WHERE user_id = ? AND game_id = ? ${timeFilter}
  `;
  
  const userScoreResult = await db
    .prepare(userScoreQuery)
    .bind(userId, gameId)
    .first<{ best_score: number | null }>();

  if (!userScoreResult?.best_score) {
    return undefined; // User has no scores in this timeframe
  }

  const userScore = userScoreResult.best_score;

  // Get user's rank (count of users with higher scores)
  const rankQuery = `
    SELECT COUNT(DISTINCT user_id) + 1 as rank
    FROM leaderboard_scores ls
    WHERE game_id = ? AND score > ? ${timeFilter}
  `;
  
  const rankResult = await db
    .prepare(rankQuery)
    .bind(gameId, userScore)
    .first<{ rank: number }>();

  const rank = rankResult?.rank ?? 1;

  // Get the next rival (user immediately above, deduplicated by best score)
  const rivalQuery = `
    WITH best_scores AS (
      SELECT user_id, MAX(score) as score
      FROM leaderboard_scores
      WHERE game_id = ? ${timeFilter}
      GROUP BY user_id
    )
    SELECT
      bs.user_id,
      bs.score,
      COALESCE(p.display_name, 'Player') as display_name,
      COALESCE(p.avatar_type, 'emoji') as avatar_type,
      COALESCE(p.avatar_value, '🎮') as avatar_value
    FROM best_scores bs
    LEFT JOIN profiles p ON bs.user_id = p.user_id
    WHERE bs.score > ?
      AND bs.user_id != ?
    ORDER BY bs.score ASC
    LIMIT 1
  `;

  const rivalResult = await db
    .prepare(rivalQuery)
    .bind(gameId, userScore, userId)
    .first<{
      user_id: string;
      score: number;
      display_name: string;
      avatar_type: string;
      avatar_value: string;
    }>();

  const userPosition: UserPosition = {
    rank,
    score: userScore,
    totalPlayers,
  };

  if (rivalResult) {
    userPosition.nextRival = {
      userId: rivalResult.user_id,
      displayName: rivalResult.display_name,
      avatar: {
        type: rivalResult.avatar_type as 'emoji' | 'nft',
        value: rivalResult.avatar_value,
      },
      score: rivalResult.score,
      pointsAhead: rivalResult.score - userScore,
    };
  }

  return userPosition;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

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

  // Get gameId from params
  const gameId = params.gameId as string;

  if (!gameId || !VALID_GAME_IDS.includes(gameId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid gameId' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Parse query params
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    const timeframeParam = url.searchParams.get('timeframe') as Timeframe | null;

    // Validate timeframe
    const timeframe: Timeframe = timeframeParam && VALID_TIMEFRAMES.includes(timeframeParam)
      ? timeframeParam
      : 'all-time';

    // Default: 10, max: 100
    let limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    let offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    if (isNaN(offset) || offset < 0) offset = 0;

    // Try to get authenticated user for position calculation
    let userId: string | null = null;
    if (env.CLERK_DOMAIN) {
      const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
      userId = auth?.userId ?? null;
    }

    // Get leaderboard entries
    const totalCount = await getLeaderboardCount(env.DB, gameId, timeframe);
    const entries = await getLeaderboard(env.DB, gameId, timeframe, limit, offset);

    // Get user position if authenticated
    let userPosition: UserPosition | undefined;
    if (userId) {
      userPosition = await getUserPosition(env.DB, gameId, userId, timeframe, totalCount);
    }

    // Calculate reset time
    const resetTime = getResetTime(timeframe);

    const response: LeaderboardResponse = {
      gameId,
      timeframe,
      entries,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + entries.length < totalCount,
      },
      userPosition,
      resetTime,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      },
    });
  } catch (error) {
    console.error('[Leaderboard Get] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
