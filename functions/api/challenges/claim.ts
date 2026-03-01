/**
 * Challenge Claim API - POST /api/challenges/claim
 *
 * Claims a completed daily challenge. Idempotent.
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Challenge rewards (oranges)
const CHALLENGE_REWARDS: Record<string, number> = {
  'games-played-5': 30,
  'personal-best-1': 50,
  'play-time-600': 70,
};

interface ClaimRequest {
  challengeId: string;
}

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

  let body: ClaimRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { challengeId } = body;
  const reward = CHALLENGE_REWARDS[challengeId];

  if (!reward) {
    return new Response(JSON.stringify({ error: 'Invalid challenge ID' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // Get challenge progress
    const progress = await env.DB.prepare(
      `SELECT * FROM daily_challenge_progress
       WHERE user_id = ? AND challenge_date = ? AND challenge_id = ?`
    )
      .bind(userId, today, challengeId)
      .first();

    // Check if already claimed
    if (progress?.claimed_at) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyClaimed: true,
          reward: progress.reward_amount,
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // Check if completed
    if (!progress?.completed_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Challenge not completed yet',
          progress: progress?.progress || 0,
          target: progress?.target || CHALLENGE_REWARDS[challengeId],
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Get current balance
    const currentCurrency = await env.DB.prepare(
      'SELECT oranges, lifetime_oranges FROM user_currency WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    if (!currentCurrency) {
      return new Response(JSON.stringify({ error: 'User currency not initialized' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const newOranges = (currentCurrency.oranges as number) + reward;

    // Mark as claimed
    await env.DB.prepare(
      `UPDATE daily_challenge_progress
       SET claimed_at = CURRENT_TIMESTAMP, reward_amount = ?
       WHERE user_id = ? AND challenge_date = ? AND challenge_id = ?`
    )
      .bind(reward, userId, today, challengeId)
      .run();

    // Update currency
    await env.DB.prepare(
      `UPDATE user_currency
       SET
         oranges = oranges + ?,
         lifetime_oranges = lifetime_oranges + ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    )
      .bind(reward, reward, userId)
      .run();

    // Log transaction
    const idempotencyKey = `challenge_${userId}_${today}_${challengeId}`;
    await env.DB.prepare(
      `INSERT INTO currency_transactions
        (user_id, type, currency, amount, balance_after, source, source_id, idempotency_key)
       VALUES (?, 'earn', 'oranges', ?, ?, 'daily_challenge', ?, ?)`
    )
      .bind(userId, reward, newOranges, challengeId, idempotencyKey)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        alreadyClaimed: false,
        challengeId,
        reward,
        newBalance: {
          oranges: newOranges,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Challenge Claim] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to claim challenge' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
