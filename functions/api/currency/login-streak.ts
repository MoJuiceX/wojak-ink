/**
 * Login Streak API - /api/currency/login-streak
 *
 * GET: Returns the user's current login streak status
 * POST: Claims the daily login reward
 *
 * GET Response: {
 *   currentStreak: number,
 *   longestStreak: number,
 *   lastClaimDate: string | null,
 *   canClaim: boolean,
 *   nextReward: { day, oranges, gems },
 *   streakRewards: [{ day, oranges, gems }]
 * }
 *
 * POST Response: {
 *   success: boolean,
 *   reward: { day, oranges, gems },
 *   newStreak: number,
 *   newBalance: { oranges, gems }
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

// Daily login rewards: +15 progression per day
const DAILY_LOGIN_REWARDS = [
  { day: 1, oranges: 15, gems: 0 },
  { day: 2, oranges: 30, gems: 0 },
  { day: 3, oranges: 45, gems: 0 },
  { day: 4, oranges: 60, gems: 0 },
  { day: 5, oranges: 75, gems: 0 },
  { day: 6, oranges: 90, gems: 0 },
  { day: 7, oranges: 105, gems: 3 }, // Gems on day 7
];

// Starting balance for new users
const STARTING_BALANCE = {
  oranges: 100,
  gems: 0,
};

/**
 * Get today's date in UTC (YYYY-MM-DD)
 */
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if two dates are consecutive
 */
function areConsecutiveDays(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Ensure user profile and login streak record exist
 */
async function ensureUserRecords(db: D1Database, userId: string): Promise<void> {
  // Ensure user exists
  await db
    .prepare(
      `INSERT INTO users (id, created_at, updated_at)
       VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')`
    )
    .bind(userId)
    .run();

  // Ensure profile exists
  await db
    .prepare(
      `INSERT INTO profiles (
        user_id, oranges, gems, lifetime_oranges, lifetime_gems,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO NOTHING`
    )
    .bind(userId, STARTING_BALANCE.oranges, STARTING_BALANCE.gems, STARTING_BALANCE.oranges, STARTING_BALANCE.gems)
    .run();

  // Ensure login streak record exists
  await db
    .prepare(
      `INSERT INTO login_streaks (user_id, current_streak, longest_streak, total_claims, created_at, updated_at)
       VALUES (?, 0, 0, 0, datetime('now'), datetime('now'))
       ON CONFLICT(user_id) DO NOTHING`
    )
    .bind(userId)
    .run();
}

/**
 * Get user's login streak status
 */
async function getStreakStatus(db: D1Database, userId: string) {
  const result = await db
    .prepare(
      `SELECT
        current_streak,
        longest_streak,
        last_claim_date,
        total_claims
      FROM login_streaks
      WHERE user_id = ?`
    )
    .bind(userId)
    .first<{
      current_streak: number;
      longest_streak: number;
      last_claim_date: string | null;
      total_claims: number;
    }>();

  return result;
}

/**
 * Claim daily reward
 */
async function claimDailyReward(
  db: D1Database,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
  reward?: { day: number; oranges: number; gems: number };
  newStreak?: number;
  newBalance?: { oranges: number; gems: number };
}> {
  const today = getTodayUTC();
  const streak = await getStreakStatus(db, userId);

  if (!streak) {
    return { success: false, error: 'Streak record not found' };
  }

  // Check if already claimed today
  if (streak.last_claim_date === today) {
    return { success: false, error: 'Already claimed today' };
  }

  // Calculate new streak
  let newStreak: number;
  if (!streak.last_claim_date) {
    // First claim ever
    newStreak = 1;
  } else if (areConsecutiveDays(streak.last_claim_date, today)) {
    // Consecutive day - continue streak (cycle 1-7)
    newStreak = (streak.current_streak % 7) + 1;
  } else {
    // Streak broken - reset to day 1
    newStreak = 1;
  }

  // Get reward for this day
  const reward = DAILY_LOGIN_REWARDS[newStreak - 1];

  // Update login streak
  const newLongestStreak = Math.max(streak.longest_streak, newStreak);
  await db
    .prepare(
      `UPDATE login_streaks SET
        current_streak = ?,
        longest_streak = ?,
        last_claim_date = ?,
        total_claims = total_claims + 1,
        updated_at = datetime('now')
      WHERE user_id = ?`
    )
    .bind(newStreak, newLongestStreak, today, userId)
    .run();

  // Award currency
  await db
    .prepare(
      `UPDATE profiles SET
        oranges = oranges + ?,
        gems = gems + ?,
        lifetime_oranges = lifetime_oranges + ?,
        lifetime_gems = lifetime_gems + ?,
        updated_at = datetime('now')
      WHERE user_id = ?`
    )
    .bind(reward.oranges, reward.gems, reward.oranges, reward.gems, userId)
    .run();

  // Get new balance
  const balance = await db
    .prepare(`SELECT oranges, gems FROM profiles WHERE user_id = ?`)
    .bind(userId)
    .first<{ oranges: number; gems: number }>();

  if (!balance) {
    return { success: false, error: 'Failed to get balance' };
  }

  // Record transactions
  if (reward.oranges > 0) {
    await db
      .prepare(
        `INSERT INTO currency_transactions
          (user_id, currency_type, amount, balance_after, source, source_details, is_gifted, created_at)
         VALUES (?, 'oranges', ?, ?, 'login', ?, 0, datetime('now'))`
      )
      .bind(userId, reward.oranges, balance.oranges, JSON.stringify({ day: newStreak }))
      .run();
  }

  if (reward.gems > 0) {
    await db
      .prepare(
        `INSERT INTO currency_transactions
          (user_id, currency_type, amount, balance_after, source, source_details, is_gifted, created_at)
         VALUES (?, 'gems', ?, ?, 'login', ?, 0, datetime('now'))`
      )
      .bind(userId, reward.gems, balance.gems, JSON.stringify({ day: newStreak }))
      .run();
  }

  return {
    success: true,
    reward: { day: newStreak, oranges: reward.oranges, gems: reward.gems },
    newStreak,
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

    // Handle GET - return streak status
    if (request.method === 'GET') {
      const streak = await getStreakStatus(env.DB, auth.userId);

      if (!streak) {
        return new Response(JSON.stringify({ error: 'Streak record not found' }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      const today = getTodayUTC();
      const canClaim = streak.last_claim_date !== today;

      // Calculate next reward day
      let nextRewardDay: number;
      if (canClaim) {
        if (!streak.last_claim_date) {
          nextRewardDay = 1;
        } else if (areConsecutiveDays(streak.last_claim_date, today)) {
          nextRewardDay = (streak.current_streak % 7) + 1;
        } else {
          nextRewardDay = 1; // Streak broken
        }
      } else {
        // Already claimed, next is tomorrow's reward
        nextRewardDay = (streak.current_streak % 7) + 1;
      }

      const nextReward = DAILY_LOGIN_REWARDS[nextRewardDay - 1];

      return new Response(
        JSON.stringify({
          currentStreak: streak.current_streak,
          longestStreak: streak.longest_streak,
          lastClaimDate: streak.last_claim_date,
          totalClaims: streak.total_claims,
          canClaim,
          nextReward: { day: nextRewardDay, ...nextReward },
          streakRewards: DAILY_LOGIN_REWARDS,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle POST - claim daily reward
    if (request.method === 'POST') {
      const result = await claimDailyReward(env.DB, auth.userId);

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          reward: result.reward,
          newStreak: result.newStreak,
          newBalance: result.newBalance,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Login Streak] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
