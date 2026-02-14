/**
 * Cloudflare Pages Function - /api/leaderboard/submit
 *
 * POST: Submit a score to the global leaderboard (authenticated)
 *
 * Uses atomic db.batch() operations to ensure data integrity.
 * Supports idempotency keys to prevent duplicate submissions.
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

interface SubmitScoreRequest {
  gameId: string;
  score: number;
  level?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string; // Client-generated UUID to prevent duplicates
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
];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * Check if an idempotency key already exists
 * Returns the existing score ID if found, null otherwise
 */
async function checkIdempotencyKey(
  db: D1Database,
  idempotencyKey: string
): Promise<{ id: number; score: number; game_id: string } | null> {
  const result = await db
    .prepare('SELECT id, score, game_id FROM leaderboard_scores WHERE idempotency_key = ?')
    .bind(idempotencyKey)
    .first<{ id: number; score: number; game_id: string }>();

  return result || null;
}

/**
 * Calculate streak values based on last played date
 */
function calculateStreak(
  profile: { current_streak: number | null; longest_streak: number | null; last_played_date: string | null } | null,
  today: string
): { newStreak: number; longestStreak: number; isNewDay: boolean } {
  if (!profile) {
    return { newStreak: 1, longestStreak: 1, isNewDay: true };
  }

  const lastPlayed = profile.last_played_date;
  let newStreak = profile.current_streak || 0;
  let isNewDay = false;

  if (lastPlayed === today) {
    // Already played today, no change
    return {
      newStreak,
      longestStreak: profile.longest_streak || newStreak,
      isNewDay: false,
    };
  }

  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastPlayed === yesterdayStr) {
    // Consecutive day! Increment streak
    newStreak += 1;
    isNewDay = true;
  } else {
    // Streak broken, reset to 1
    newStreak = 1;
    isNewDay = true;
  }

  const longestStreak = Math.max(newStreak, profile.longest_streak || 0);

  return { newStreak, longestStreak, isNewDay };
}

/**
 * Submit score atomically using db.batch()
 * This ensures all operations succeed or fail together
 */
async function submitScoreAtomic(
  db: D1Database,
  userId: string,
  data: SubmitScoreRequest
): Promise<{
  scoreId: number;
  rank: number;
  isNewHighScore: boolean;
  previousHighScore: number | null;
  currentStreak: number;
  isNewDay: boolean;
}> {
  const today = new Date().toISOString().split('T')[0];

  // Step 1: Get current state (profile and high score) - these can be batched
  const [profileResult, highScoreResult] = await db.batch([
    db.prepare('SELECT current_streak, longest_streak, last_played_date FROM profiles WHERE user_id = ?').bind(userId),
    db.prepare('SELECT MAX(score) as high_score FROM leaderboard_scores WHERE user_id = ? AND game_id = ?').bind(userId, data.gameId),
  ]);

  const profile = profileResult.results[0] as { current_streak: number | null; longest_streak: number | null; last_played_date: string | null } | undefined;
  const previousHighScore = (highScoreResult.results[0] as { high_score: number | null } | undefined)?.high_score ?? null;

  // Calculate streak
  const streakCalc = calculateStreak(profile || null, today);

  // Step 2: Perform all writes atomically
  const writeStatements: D1PreparedStatement[] = [
    // Ensure user exists
    db.prepare(
      `INSERT INTO users (id, created_at, updated_at)
       VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')`
    ).bind(userId),

    // Insert the score
    db.prepare(
      `INSERT INTO leaderboard_scores (user_id, game_id, score, level, metadata, idempotency_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      userId,
      data.gameId,
      data.score,
      data.level ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.idempotencyKey ?? null
    ),
  ];

  // Add streak update if it's a new day
  if (streakCalc.isNewDay) {
    writeStatements.push(
      db.prepare(`
        UPDATE profiles
        SET current_streak = ?, longest_streak = ?, last_played_date = ?
        WHERE user_id = ?
      `).bind(streakCalc.newStreak, streakCalc.longestStreak, today, userId)
    );
  }

  // Execute all writes atomically
  await db.batch(writeStatements);

  // Step 3: Get the inserted score ID and rank (read operations after commit)
  const [scoreIdResult, rankResult] = await db.batch([
    db.prepare(
      `SELECT id FROM leaderboard_scores
       WHERE user_id = ? AND game_id = ? AND score = ?
       ORDER BY created_at DESC LIMIT 1`
    ).bind(userId, data.gameId, data.score),
    db.prepare(
      `SELECT COUNT(DISTINCT user_id) + 1 as rank FROM leaderboard_scores
       WHERE game_id = ? AND score > ?`
    ).bind(data.gameId, data.score),
  ]);

  const scoreId = (scoreIdResult.results[0] as { id: number } | undefined)?.id ?? 0;
  const rank = (rankResult.results[0] as { rank: number } | undefined)?.rank ?? 1;
  const isNewHighScore = previousHighScore === null || data.score > previousHighScore;

  return {
    scoreId,
    rank,
    isNewHighScore,
    previousHighScore,
    currentStreak: streakCalc.newStreak,
    isNewDay: streakCalc.isNewDay,
  };
}

/**
 * Validate submit request
 */
function validateRequest(data: SubmitScoreRequest): { valid: boolean; error?: string } {
  if (!data.gameId) {
    return { valid: false, error: 'gameId is required' };
  }

  if (!VALID_GAME_IDS.includes(data.gameId)) {
    return { valid: false, error: 'Invalid gameId' };
  }

  if (typeof data.score !== 'number' || isNaN(data.score)) {
    return { valid: false, error: 'score must be a number' };
  }

  if (data.score < 0) {
    return { valid: false, error: 'score must be non-negative' };
  }

  if (data.level !== undefined && (typeof data.level !== 'number' || data.level < 0)) {
    return { valid: false, error: 'level must be a non-negative number' };
  }

  return { valid: true };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  // Check if auth is configured
  if (!env.CLERK_DOMAIN) {
    return new Response(
      JSON.stringify({ error: 'Auth not configured' }),
      { status: 500, headers: corsHeaders }
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
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);

  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const { userId } = auth;

  try {
    // Parse request body
    let data: SubmitScoreRequest;
    try {
      data = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate request
    const validation = validateRequest(data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check idempotency key if provided (prevents duplicate submissions)
    if (data.idempotencyKey) {
      const existing = await checkIdempotencyKey(env.DB, data.idempotencyKey);
      if (existing) {
        // Return the existing score info - this is a duplicate request
        const rankResult = await env.DB
          .prepare('SELECT COUNT(*) + 1 as rank FROM leaderboard_scores WHERE game_id = ? AND score > ?')
          .bind(existing.game_id, existing.score)
          .first<{ rank: number }>();

        const highScoreResult = await env.DB
          .prepare('SELECT MAX(score) as high_score FROM leaderboard_scores WHERE user_id = ? AND game_id = ?')
          .bind(userId, existing.game_id)
          .first<{ high_score: number | null }>();

        return new Response(
          JSON.stringify({
            success: true,
            scoreId: existing.id,
            rank: rankResult?.rank ?? 1,
            isNewHighScore: false, // Already submitted, so not "new"
            previousHighScore: highScoreResult?.high_score ?? null,
            duplicate: true, // Flag to indicate this was a duplicate
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Submit score atomically
    const result = await submitScoreAtomic(env.DB, userId, data);

    return new Response(
      JSON.stringify({
        success: true,
        scoreId: result.scoreId,
        rank: result.rank,
        isNewHighScore: result.isNewHighScore,
        previousHighScore: result.previousHighScore,
        currentStreak: result.currentStreak,
        isNewDay: result.isNewDay,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Leaderboard Submit] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
