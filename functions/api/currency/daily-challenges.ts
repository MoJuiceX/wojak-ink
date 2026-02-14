/**
 * Daily Challenges API - /api/currency/daily-challenges
 *
 * GET: Returns the user's daily challenges progress
 * POST: Records progress or claims rewards
 *
 * POST body: {
 *   action: 'record_game' | 'record_personal_best' | 'record_play_time' | 'claim'
 *   challengeId?: string (required for claim)
 *   gameId?: string (for record_game, record_personal_best)
 *   seconds?: number (for record_play_time)
 * }
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Daily challenges configuration (from economy spec)
const DAILY_CHALLENGES = [
  { id: 'games-played-5', type: 'games_played', target: 5, reward: 30, name: 'Active Player', description: 'Play 5 games', icon: '🎮', difficulty: 'easy' },
  { id: 'personal-best-1', type: 'personal_best', target: 1, reward: 50, name: 'Beat Yourself', description: 'Set a new personal best', icon: '🏆', difficulty: 'medium' },
  { id: 'play-time-600', type: 'play_time', target: 600, reward: 70, name: 'Dedicated Gamer', description: 'Play for 10 minutes', icon: '⏱️', difficulty: 'hard' },
];

// Starting balance for new users
const STARTING_BALANCE = { oranges: 100, gems: 0 };

/**
 * Get today's date in UTC (YYYY-MM-DD)
 */
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ensure user profile exists
 */
async function ensureUserRecords(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, created_at, updated_at)
       VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')`
    )
    .bind(userId)
    .run();

  await db
    .prepare(
      `INSERT INTO profiles (
        user_id, oranges, gems, lifetime_oranges, lifetime_gems,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO NOTHING`
    )
    .bind(userId, STARTING_BALANCE.oranges, STARTING_BALANCE.gems, STARTING_BALANCE.oranges, STARTING_BALANCE.gems)
    .run();
}

/**
 * Get or create today's challenges for user
 */
async function getOrCreateTodaysChallenges(db: D1Database, userId: string) {
  const today = getTodayUTC();

  // Check if challenges exist for today
  const existing = await db
    .prepare(
      `SELECT challenge_id, progress, target, is_completed, completed_at, is_claimed, claimed_at, reward_amount
       FROM daily_challenges
       WHERE user_id = ? AND challenge_date = ?`
    )
    .bind(userId, today)
    .all<{
      challenge_id: string;
      progress: number;
      target: number;
      is_completed: number;
      completed_at: string | null;
      is_claimed: number;
      claimed_at: string | null;
      reward_amount: number;
    }>();

  if (existing.results && existing.results.length === 3) {
    return existing.results;
  }

  // Create today's challenges
  for (const challenge of DAILY_CHALLENGES) {
    await db
      .prepare(
        `INSERT INTO daily_challenges (
          user_id, challenge_date, challenge_id, progress, target,
          is_completed, is_claimed, reward_amount, created_at, updated_at
        )
        VALUES (?, ?, ?, 0, ?, 0, 0, ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id, challenge_date, challenge_id) DO NOTHING`
      )
      .bind(userId, today, challenge.id, challenge.target, challenge.reward)
      .run();
  }

  // Fetch the created challenges
  const result = await db
    .prepare(
      `SELECT challenge_id, progress, target, is_completed, completed_at, is_claimed, claimed_at, reward_amount
       FROM daily_challenges
       WHERE user_id = ? AND challenge_date = ?`
    )
    .bind(userId, today)
    .all<{
      challenge_id: string;
      progress: number;
      target: number;
      is_completed: number;
      completed_at: string | null;
      is_claimed: number;
      claimed_at: string | null;
      reward_amount: number;
    }>();

  return result.results || [];
}

/**
 * Update challenge progress
 */
async function updateProgress(
  db: D1Database,
  userId: string,
  challengeId: string,
  incrementBy: number
): Promise<{ progress: number; isCompleted: boolean; justCompleted: boolean }> {
  const today = getTodayUTC();

  // Get current state
  const current = await db
    .prepare(
      `SELECT progress, target, is_completed
       FROM daily_challenges
       WHERE user_id = ? AND challenge_date = ? AND challenge_id = ?`
    )
    .bind(userId, today, challengeId)
    .first<{ progress: number; target: number; is_completed: number }>();

  if (!current) {
    return { progress: 0, isCompleted: false, justCompleted: false };
  }

  // Already completed, no update needed
  if (current.is_completed) {
    return { progress: current.progress, isCompleted: true, justCompleted: false };
  }

  const newProgress = Math.min(current.progress + incrementBy, current.target);
  const isNowCompleted = newProgress >= current.target;

  // Update progress
  await db
    .prepare(
      `UPDATE daily_challenges SET
        progress = ?,
        is_completed = ?,
        completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END,
        updated_at = datetime('now')
      WHERE user_id = ? AND challenge_date = ? AND challenge_id = ?`
    )
    .bind(newProgress, isNowCompleted ? 1 : 0, isNowCompleted ? 1 : 0, userId, today, challengeId)
    .run();

  return { progress: newProgress, isCompleted: isNowCompleted, justCompleted: isNowCompleted };
}

/**
 * Claim challenge reward
 */
async function claimReward(
  db: D1Database,
  userId: string,
  challengeId: string
): Promise<{ success: boolean; error?: string; reward?: number; newBalance?: { oranges: number; gems: number } }> {
  const today = getTodayUTC();

  // Get challenge state
  const challenge = await db
    .prepare(
      `SELECT is_completed, is_claimed, reward_amount
       FROM daily_challenges
       WHERE user_id = ? AND challenge_date = ? AND challenge_id = ?`
    )
    .bind(userId, today, challengeId)
    .first<{ is_completed: number; is_claimed: number; reward_amount: number }>();

  if (!challenge) {
    return { success: false, error: 'Challenge not found' };
  }

  if (!challenge.is_completed) {
    return { success: false, error: 'Challenge not completed' };
  }

  if (challenge.is_claimed) {
    return { success: false, error: 'Already claimed' };
  }

  // Mark as claimed
  await db
    .prepare(
      `UPDATE daily_challenges SET
        is_claimed = 1,
        claimed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE user_id = ? AND challenge_date = ? AND challenge_id = ?`
    )
    .bind(userId, today, challengeId)
    .run();

  // Award currency
  await db
    .prepare(
      `UPDATE profiles SET
        oranges = oranges + ?,
        lifetime_oranges = lifetime_oranges + ?,
        updated_at = datetime('now')
      WHERE user_id = ?`
    )
    .bind(challenge.reward_amount, challenge.reward_amount, userId)
    .run();

  // Get new balance
  const balance = await db
    .prepare(`SELECT oranges, gems FROM profiles WHERE user_id = ?`)
    .bind(userId)
    .first<{ oranges: number; gems: number }>();

  if (!balance) {
    return { success: false, error: 'Failed to get balance' };
  }

  // Record transaction
  await db
    .prepare(
      `INSERT INTO currency_transactions
        (user_id, currency_type, amount, balance_after, source, source_details, is_gifted, created_at)
       VALUES (?, 'oranges', ?, ?, 'challenge', ?, 0, datetime('now'))`
    )
    .bind(userId, challenge.reward_amount, balance.oranges, JSON.stringify({ challengeId }))
    .run();

  return {
    success: true,
    reward: challenge.reward_amount,
    newBalance: balance,
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check configuration
  if (!env.CLERK_DOMAIN || !env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Authenticate
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    // Ensure user records exist
    await ensureUserRecords(env.DB, auth.userId);

    // Handle GET - return challenges
    if (request.method === 'GET') {
      const challenges = await getOrCreateTodaysChallenges(env.DB, auth.userId);

      // Calculate time until midnight UTC
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const timeUntilReset = midnight.getTime() - now.getTime();

      // Format response
      const formattedChallenges = DAILY_CHALLENGES.map((config) => {
        const progress = challenges.find((c) => c.challenge_id === config.id);
        return {
          id: config.id,
          type: config.type,
          name: config.name,
          description: config.description,
          icon: config.icon,
          difficulty: config.difficulty,
          target: config.target,
          reward: config.reward,
          progress: progress?.progress || 0,
          isCompleted: Boolean(progress?.is_completed),
          completedAt: progress?.completed_at,
          isClaimed: Boolean(progress?.is_claimed),
          claimedAt: progress?.claimed_at,
        };
      });

      const allCompleted = formattedChallenges.every((c) => c.isCompleted);
      const allClaimed = formattedChallenges.every((c) => c.isClaimed);
      const totalEarned = formattedChallenges
        .filter((c) => c.isClaimed)
        .reduce((sum, c) => sum + c.reward, 0);

      return new Response(
        JSON.stringify({
          date: getTodayUTC(),
          challenges: formattedChallenges,
          allCompleted,
          allClaimed,
          totalEarnedToday: totalEarned,
          timeUntilReset,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle POST - record progress or claim
    if (request.method === 'POST') {
      let body: {
        action: string;
        challengeId?: string;
        gameId?: string;
        seconds?: number;
      };

      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Ensure today's challenges exist
      await getOrCreateTodaysChallenges(env.DB, auth.userId);

      switch (body.action) {
        case 'record_game': {
          const result = await updateProgress(env.DB, auth.userId, 'games-played-5', 1);
          return new Response(
            JSON.stringify({
              success: true,
              challengeId: 'games-played-5',
              ...result,
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        case 'record_personal_best': {
          const result = await updateProgress(env.DB, auth.userId, 'personal-best-1', 1);
          return new Response(
            JSON.stringify({
              success: true,
              challengeId: 'personal-best-1',
              ...result,
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        case 'record_play_time': {
          const seconds = body.seconds || 1;
          const result = await updateProgress(env.DB, auth.userId, 'play-time-600', seconds);
          return new Response(
            JSON.stringify({
              success: true,
              challengeId: 'play-time-600',
              ...result,
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        case 'claim': {
          if (!body.challengeId) {
            return new Response(JSON.stringify({ error: 'challengeId required' }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const result = await claimReward(env.DB, auth.userId, body.challengeId);

          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              challengeId: body.challengeId,
              reward: result.reward,
              newBalance: result.newBalance,
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action. Use: record_game, record_personal_best, record_play_time, claim' }),
            { status: 400, headers: corsHeaders }
          );
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Daily Challenges] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
