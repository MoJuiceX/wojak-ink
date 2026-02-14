/**
 * Daily Login Claim API - POST /api/daily-login/claim
 *
 * Claims daily login reward. Idempotent per day.
 * Tracks streak and awards appropriate oranges/gems.
 *
 * @see claude-specs/11-SERVER-STATE-SPEC.md
 */

import { authenticateRequest } from '../../lib/auth';
import { checkBanned, bannedResponse } from '../../lib/ban';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Daily login rewards (7-day cycle)
const DAILY_LOGIN_REWARDS = [
  { day: 1, oranges: 15, gems: 0 },
  { day: 2, oranges: 30, gems: 0 },
  { day: 3, oranges: 45, gems: 0 },
  { day: 4, oranges: 60, gems: 0 },
  { day: 5, oranges: 75, gems: 0 },
  { day: 6, oranges: 90, gems: 0 },
  { day: 7, oranges: 105, gems: 3 },
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
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

  const userId = auth.userId;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // ==========================================
    // CHECK IF ALREADY CLAIMED TODAY
    // ==========================================
    const existingClaim = await env.DB.prepare(
      'SELECT * FROM daily_login_claims WHERE user_id = ? AND claim_date = ?'
    )
      .bind(userId, today)
      .first();

    if (existingClaim) {
      // Already claimed today
      return new Response(
        JSON.stringify({
          success: true,
          alreadyClaimed: true,
          streakDay: existingClaim.streak_day,
          reward: {
            oranges: existingClaim.oranges_claimed,
            gems: existingClaim.gems_claimed,
          },
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // ==========================================
    // CALCULATE STREAK
    // ==========================================
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdayClaim = await env.DB.prepare(
      'SELECT streak_day FROM daily_login_claims WHERE user_id = ? AND claim_date = ?'
    )
      .bind(userId, yesterday)
      .first();

    let streakDay = 1;
    if (yesterdayClaim) {
      // Continue streak (wrap from 7 back to 1)
      streakDay = ((yesterdayClaim.streak_day as number) % 7) + 1;
    }

    // Get reward for this streak day
    const rewardConfig = DAILY_LOGIN_REWARDS[streakDay - 1];
    const orangesReward = rewardConfig.oranges;
    const gemsReward = rewardConfig.gems || 0;

    // ==========================================
    // ATOMIC UPDATE
    // ==========================================

    // Get current balance
    const currentCurrency = await env.DB.prepare(
      'SELECT oranges, gems, lifetime_oranges, lifetime_gems FROM user_currency WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    if (!currentCurrency) {
      return new Response(JSON.stringify({ error: 'User currency not initialized' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const newOranges = (currentCurrency.oranges as number) + orangesReward;
    const newGems = (currentCurrency.gems as number) + gemsReward;

    // Record the claim
    await env.DB.prepare(
      `INSERT INTO daily_login_claims (user_id, claim_date, streak_day, oranges_claimed, gems_claimed)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(userId, today, streakDay, orangesReward, gemsReward)
      .run();

    // Update currency
    await env.DB.prepare(
      `UPDATE user_currency
       SET
         oranges = oranges + ?,
         gems = gems + ?,
         lifetime_oranges = lifetime_oranges + ?,
         lifetime_gems = lifetime_gems + ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    )
      .bind(orangesReward, gemsReward, orangesReward, gemsReward, userId)
      .run();

    // Log transaction (oranges)
    if (orangesReward > 0) {
      await env.DB.prepare(
        `INSERT INTO currency_transactions
          (user_id, type, currency, amount, balance_after, source, metadata, idempotency_key)
         VALUES (?, 'earn', 'oranges', ?, ?, 'daily_login', ?, ?)`
      )
        .bind(
          userId,
          orangesReward,
          newOranges,
          JSON.stringify({ streak_day: streakDay }),
          `daily_${userId}_${today}_oranges`
        )
        .run();
    }

    // Log transaction (gems)
    if (gemsReward > 0) {
      await env.DB.prepare(
        `INSERT INTO currency_transactions
          (user_id, type, currency, amount, balance_after, source, metadata, idempotency_key)
         VALUES (?, 'earn', 'gems', ?, ?, 'daily_login', ?, ?)`
      )
        .bind(
          userId,
          gemsReward,
          newGems,
          JSON.stringify({ streak_day: streakDay }),
          `daily_${userId}_${today}_gems`
        )
        .run();
    }

    // Update profile streak (for backwards compatibility)
    await env.DB.prepare(
      `UPDATE profiles
       SET
         current_streak = ?,
         longest_streak = CASE WHEN ? > longest_streak THEN ? ELSE longest_streak END,
         last_played_date = ?
       WHERE user_id = ?`
    )
      .bind(streakDay, streakDay, streakDay, today, userId)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        alreadyClaimed: false,
        streakDay,
        reward: {
          oranges: orangesReward,
          gems: gemsReward,
        },
        newBalance: {
          oranges: newOranges,
          gems: newGems,
        },
        nextReward: DAILY_LOGIN_REWARDS[streakDay % 7],
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Daily Login Claim] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to claim daily reward' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
