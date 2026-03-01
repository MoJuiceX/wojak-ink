/**
 * Achievements API - /api/currency/achievements
 *
 * GET: Returns all achievement progress for the authenticated user
 * POST: Records progress or claims rewards
 *
 * POST body: {
 *   action: 'update_progress' | 'claim'
 *   achievementId: string
 *   progress?: number (for update_progress)
 *   target?: number (for update_progress)
 * }
 *
 */

import { authenticateRequest } from '../../lib/auth';
import { checkBanned, bannedResponse } from '../../lib/ban';

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

// Starting balance for new users
const STARTING_BALANCE = { oranges: 100, gems: 0 };

/**
 * Ensure user currency record exists
 */
async function ensureUserCurrency(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_currency (user_id, oranges, gems, lifetime_oranges, lifetime_gems)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO NOTHING`
    )
    .bind(userId, STARTING_BALANCE.oranges, STARTING_BALANCE.gems, STARTING_BALANCE.oranges, STARTING_BALANCE.gems)
    .run();
}

/**
 * Get all achievement progress for user
 */
async function getAchievementProgress(db: D1Database, userId: string) {
  const result = await db
    .prepare(
      `SELECT
        achievement_id,
        progress,
        target,
        completed_at,
        claimed_at,
        reward_oranges,
        reward_gems
       FROM user_achievements
       WHERE user_id = ?`
    )
    .bind(userId)
    .all<{
      achievement_id: string;
      progress: number;
      target: number;
      completed_at: string | null;
      claimed_at: string | null;
      reward_oranges: number | null;
      reward_gems: number | null;
    }>();

  return result.results || [];
}

/**
 * Update or create achievement progress
 */
async function updateProgress(
  db: D1Database,
  userId: string,
  achievementId: string,
  progress: number,
  target: number,
  rewardOranges: number = 0,
  rewardGems: number = 0
): Promise<{ isCompleted: boolean; justCompleted: boolean }> {
  // Get current state
  const current = await db
    .prepare(
      `SELECT progress, completed_at
       FROM user_achievements
       WHERE user_id = ? AND achievement_id = ?`
    )
    .bind(userId, achievementId)
    .first<{ progress: number; completed_at: string | null }>();

  const wasCompleted = current?.completed_at !== null;
  const isNowCompleted = progress >= target;
  const justCompleted = !wasCompleted && isNowCompleted;

  // Upsert achievement progress
  await db
    .prepare(
      `INSERT INTO user_achievements (
        user_id, achievement_id, progress, target, completed_at,
        claimed_at, reward_oranges, reward_gems, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, achievement_id) DO UPDATE SET
        progress = ?,
        target = ?,
        completed_at = CASE
          WHEN user_achievements.completed_at IS NOT NULL THEN user_achievements.completed_at
          WHEN ? >= ? THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        reward_oranges = ?,
        reward_gems = ?,
        updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      userId,
      achievementId,
      progress,
      target,
      isNowCompleted ? new Date().toISOString() : null,
      rewardOranges,
      rewardGems,
      // Update values
      progress,
      target,
      progress,
      target,
      rewardOranges,
      rewardGems
    )
    .run();

  return { isCompleted: isNowCompleted, justCompleted };
}

/**
 * Claim achievement reward
 */
async function claimReward(
  db: D1Database,
  userId: string,
  achievementId: string
): Promise<{ success: boolean; error?: string; oranges?: number; gems?: number; newBalance?: { oranges: number; gems: number } }> {
  // Get achievement state
  const achievement = await db
    .prepare(
      `SELECT completed_at, claimed_at, reward_oranges, reward_gems
       FROM user_achievements
       WHERE user_id = ? AND achievement_id = ?`
    )
    .bind(userId, achievementId)
    .first<{ completed_at: string | null; claimed_at: string | null; reward_oranges: number | null; reward_gems: number | null }>();

  if (!achievement) {
    return { success: false, error: 'Achievement not found' };
  }

  if (!achievement.completed_at) {
    return { success: false, error: 'Achievement not completed' };
  }

  if (achievement.claimed_at) {
    return { success: false, error: 'Already claimed' };
  }

  const oranges = achievement.reward_oranges || 0;
  const gems = achievement.reward_gems || 0;

  // Mark as claimed
  await db
    .prepare(
      `UPDATE user_achievements SET
        claimed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND achievement_id = ?`
    )
    .bind(userId, achievementId)
    .run();

  // Award currency
  if (oranges > 0 || gems > 0) {
    await db
      .prepare(
        `UPDATE user_currency SET
          oranges = oranges + ?,
          gems = gems + ?,
          lifetime_oranges = lifetime_oranges + ?,
          lifetime_gems = lifetime_gems + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`
      )
      .bind(oranges, gems, oranges, gems, userId)
      .run();
  }

  // Get new balance
  const balance = await db
    .prepare(`SELECT oranges, gems FROM user_currency WHERE user_id = ?`)
    .bind(userId)
    .first<{ oranges: number; gems: number }>();

  if (!balance) {
    return { success: false, error: 'Failed to get balance' };
  }

  // Record transactions
  if (oranges > 0) {
    await db
      .prepare(
        `INSERT INTO currency_transactions
          (user_id, currency_type, amount, balance_after, source, source_details, is_gifted, created_at)
         VALUES (?, 'oranges', ?, ?, 'achievement', ?, 0, CURRENT_TIMESTAMP)`
      )
      .bind(userId, oranges, balance.oranges, JSON.stringify({ achievementId }))
      .run();
  }

  if (gems > 0) {
    await db
      .prepare(
        `INSERT INTO currency_transactions
          (user_id, currency_type, amount, balance_after, source, source_details, is_gifted, created_at)
         VALUES (?, 'gems', ?, ?, 'achievement', ?, 0, CURRENT_TIMESTAMP)`
      )
      .bind(userId, gems, balance.gems, JSON.stringify({ achievementId }))
      .run();
  }

  return {
    success: true,
    oranges,
    gems,
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
    console.error('[Achievements] Missing configuration: CLERK_DOMAIN or DB');
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

  const userId = auth.userId;

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // Ensure user currency record exists
    await ensureUserCurrency(env.DB, userId);

    // Handle GET - return all progress
    if (request.method === 'GET') {
      const progress = await getAchievementProgress(env.DB, userId);

      // Format response
      const formattedProgress = progress.map((p) => ({
        achievementId: p.achievement_id,
        progress: p.progress,
        target: p.target,
        completed: p.completed_at !== null,
        completedAt: p.completed_at,
        claimed: p.claimed_at !== null,
        claimedAt: p.claimed_at,
        rewardOranges: p.reward_oranges || 0,
        rewardGems: p.reward_gems || 0,
      }));

      const unclaimedCount = formattedProgress.filter((p) => p.completed && !p.claimed).length;
      const completedCount = formattedProgress.filter((p) => p.completed).length;

      return new Response(
        JSON.stringify({
          progress: formattedProgress,
          unclaimedCount,
          completedCount,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle POST - update progress or claim
    if (request.method === 'POST') {
      let body: {
        action: string;
        achievementId: string;
        progress?: number;
        target?: number;
        rewardOranges?: number;
        rewardGems?: number;
      };

      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (!body.achievementId) {
        return new Response(JSON.stringify({ error: 'achievementId required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      switch (body.action) {
        case 'update_progress': {
          if (body.progress === undefined || body.target === undefined) {
            return new Response(JSON.stringify({ error: 'progress and target required' }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const result = await updateProgress(
            env.DB,
            userId,
            body.achievementId,
            body.progress,
            body.target,
            body.rewardOranges || 0,
            body.rewardGems || 0
          );

          return new Response(
            JSON.stringify({
              success: true,
              achievementId: body.achievementId,
              ...result,
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        case 'claim': {
          const result = await claimReward(env.DB, userId, body.achievementId);

          if (!result.success) {
            return new Response(JSON.stringify({ error: result.error }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          return new Response(
            JSON.stringify({
              success: true,
              achievementId: body.achievementId,
              oranges: result.oranges,
              gems: result.gems,
              newBalance: result.newBalance,
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action. Use: update_progress, claim' }),
            { status: 400, headers: corsHeaders }
          );
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Achievements] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
