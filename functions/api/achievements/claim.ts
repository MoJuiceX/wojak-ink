/**
 * Achievement Claim API - POST /api/achievements/claim
 *
 * Claims a completed achievement. Idempotent.
 * Validates completion before awarding rewards.
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

// Achievement definitions (rewards only - validation happens on client)
const ACHIEVEMENT_REWARDS: Record<string, { oranges: number; gems: number; name: string }> = {
  // Gameplay (8)
  'first-game': { oranges: 50, gems: 0, name: 'First Steps' },
  'score-1000': { oranges: 100, gems: 0, name: 'Getting Started' },
  'score-10000': { oranges: 250, gems: 5, name: 'High Scorer' },
  'games-10': { oranges: 100, gems: 0, name: 'Casual Gamer' },
  'games-100': { oranges: 500, gems: 10, name: 'Dedicated Player' },
  'games-500': { oranges: 1000, gems: 25, name: 'Gaming Legend' },
  'all-games': { oranges: 300, gems: 10, name: 'Explorer' },
  'top-10': { oranges: 500, gems: 15, name: 'Leaderboard Star' },
  // Collection (4)
  'first-purchase': { oranges: 50, gems: 0, name: 'Shopper' },
  'collect-5': { oranges: 150, gems: 0, name: 'Collector' },
  'collect-10': { oranges: 300, gems: 5, name: 'Hoarder' },
  'nft-avatar': { oranges: 500, gems: 20, name: 'True Wojak' },
  // Social (3)
  'friend-1': { oranges: 100, gems: 0, name: 'Social Butterfly' },
  'friend-5': { oranges: 250, gems: 5, name: 'Popular' },
  'profile-complete': { oranges: 150, gems: 0, name: 'Identity' },
  // Dedication (4)
  'streak-7': { oranges: 200, gems: 5, name: 'Weekly Regular' },
  'streak-30': { oranges: 500, gems: 15, name: 'Monthly Dedication' },
  'oranges-10000': { oranges: 500, gems: 10, name: 'Orange Mogul' },
  'oranges-100000': { oranges: 2000, gems: 50, name: 'Orange Tycoon' },
};

interface ClaimRequest {
  achievementId: string;
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
  let body: ClaimRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { achievementId } = body;

  // Validate achievement exists
  const achievementDef = ACHIEVEMENT_REWARDS[achievementId];
  if (!achievementDef) {
    return new Response(JSON.stringify({ error: 'Invalid achievement ID' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // ==========================================
    // CHECK ACHIEVEMENT STATUS
    // ==========================================
    const achievement = await env.DB.prepare(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
    )
      .bind(userId, achievementId)
      .first();

    // Check if already claimed
    if (achievement?.claimed_at) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyClaimed: true,
          reward: {
            oranges: achievement.reward_oranges || 0,
            gems: achievement.reward_gems || 0,
          },
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // Check if completed
    if (!achievement?.completed_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Achievement not completed yet',
          progress: achievement?.progress || 0,
          target: achievement?.target || 0,
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // ==========================================
    // AWARD REWARDS
    // ==========================================
    const orangesReward = achievementDef.oranges || 0;
    const gemsReward = achievementDef.gems || 0;

    // Get current balance
    const currentCurrency = await env.DB.prepare(
      'SELECT oranges, gems FROM user_currency WHERE user_id = ?'
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

    // Mark as claimed
    await env.DB.prepare(
      `UPDATE user_achievements
       SET claimed_at = CURRENT_TIMESTAMP, reward_oranges = ?, reward_gems = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND achievement_id = ?`
    )
      .bind(orangesReward, gemsReward, userId, achievementId)
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

    // Log transaction
    const idempotencyKey = `achievement_${userId}_${achievementId}`;

    if (orangesReward > 0) {
      await env.DB.prepare(
        `INSERT INTO currency_transactions
          (user_id, type, currency, amount, balance_after, source, source_id, idempotency_key)
         VALUES (?, 'earn', 'oranges', ?, ?, 'achievement', ?, ?)`
      )
        .bind(userId, orangesReward, newOranges, achievementId, `${idempotencyKey}_oranges`)
        .run();
    }

    if (gemsReward > 0) {
      await env.DB.prepare(
        `INSERT INTO currency_transactions
          (user_id, type, currency, amount, balance_after, source, source_id, idempotency_key)
         VALUES (?, 'earn', 'gems', ?, ?, 'achievement', ?, ?)`
      )
        .bind(userId, gemsReward, newGems, achievementId, `${idempotencyKey}_gems`)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        alreadyClaimed: false,
        achievement: {
          id: achievementId,
          name: achievementDef.name,
        },
        reward: {
          oranges: orangesReward,
          gems: gemsReward,
        },
        newBalance: {
          oranges: newOranges,
          gems: newGems,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Achievement Claim] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to claim achievement' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
