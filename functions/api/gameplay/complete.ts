/**
 * Gameplay Complete API - POST /api/gameplay/complete
 *
 * Called when a game ends. Atomically:
 * 1. Validates the game session
 * 2. Calculates rewards based on score and tier
 * 3. Updates currency balance
 * 4. Logs transaction
 * 5. Updates achievement progress
 * 6. Updates daily challenge progress
 *
 * Idempotent: Calling twice with same session returns same result.
 *
 * @see claude-specs/11-SERVER-STATE-SPEC.md
 */

import { authenticateRequest } from '../../lib/auth';
import { checkBanned, bannedResponse } from '../../lib/ban';
import { checkForAnomalies, flagScore } from '../../lib/anomaly';

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

// Import economy config values (copied here to avoid frontend import issues)
const GAME_TIERS = {
  easy: { baseReward: 5, highScoreBonus: 10, top10Bonus: 20 },
  medium: { baseReward: 10, highScoreBonus: 15, top10Bonus: 30 },
  hard: { baseReward: 15, highScoreBonus: 20, top10Bonus: 40 },
};

const GAME_TIER_MAP: Record<string, 'easy' | 'medium' | 'hard'> = {
  // Easy tier
  'memory-match': 'easy',
  'color-reaction': 'easy',
  'orange-snake': 'easy',
  'citrus-drop': 'easy',
  'wojak-whack': 'easy',
  // Medium tier
  'orange-pong': 'medium',
  'merge-2048': 'medium',
  'block-puzzle': 'medium',
  'brick-breaker': 'medium',
  'orange-wordle': 'medium',
  // Hard tier
  'flappy-orange': 'hard',
  'wojak-runner': 'hard',
  'orange-stack': 'hard',
  'knife-game': 'hard',
  'orange-juggle': 'hard',
};

const GAME_MIN_SCORES: Record<string, number> = {
  // Easy tier
  'memory-match': 4,
  'color-reaction': 5,
  'orange-snake': 5,
  'citrus-drop': 3,
  'wojak-whack': 5,
  // Medium tier
  'orange-pong': 3,
  'merge-2048': 256,
  'block-puzzle': 100,
  'brick-breaker': 50,
  'orange-wordle': 1,
  // Hard tier
  'flappy-orange': 5,
  'wojak-runner': 100,
  'orange-stack': 5,
  'knife-game': 10,
  'orange-juggle': 10,
};

interface CompleteGameRequest {
  sessionId: string;
  gameId: string;
  score: number;
  durationSeconds: number;
  isHighScore: boolean;
  isTop10: boolean;
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
  let body: CompleteGameRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { sessionId, gameId, score, durationSeconds, isHighScore, isTop10 } = body;

  // Validate required fields
  if (!sessionId || !gameId || score === undefined) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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
    // IDEMPOTENCY CHECK
    // ==========================================
    const idempotencyKey = `game_${sessionId}`;
    const existingTx = await env.DB.prepare(
      'SELECT * FROM currency_transactions WHERE idempotency_key = ?'
    )
      .bind(idempotencyKey)
      .first();

    if (existingTx) {
      // Already processed - return the same result
      const currentBalance = await env.DB.prepare(
        'SELECT oranges, gems FROM user_currency WHERE user_id = ?'
      )
        .bind(userId)
        .first();

      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          reward: {
            oranges: existingTx.amount,
            gems: 0,
          },
          newBalance: {
            oranges: currentBalance?.oranges || 0,
            gems: currentBalance?.gems || 0,
          },
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // ==========================================
    // SCORE VALIDATION
    // ==========================================
    const minScore = GAME_MIN_SCORES[gameId] || 0;
    if (score < minScore) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Score below minimum threshold',
          minScore,
          yourScore: score,
          reward: { oranges: 0, gems: 0 },
        }),
        {
          status: 200, // Not an error, just no reward
          headers: corsHeaders,
        }
      );
    }

    // ==========================================
    // ANOMALY DETECTION (flag but don't block)
    // ==========================================
    const anomaly = await checkForAnomalies(env.DB, userId, gameId, score, durationSeconds);
    if (anomaly.isFlagged) {
      await flagScore(
        env.DB,
        userId,
        gameId,
        sessionId,
        score,
        anomaly.reason!,
        anomaly.details || {}
      );
    }

    // ==========================================
    // CALCULATE REWARD
    // ==========================================
    const tier = GAME_TIER_MAP[gameId] || 'medium';
    const tierConfig = GAME_TIERS[tier];

    let orangesEarned = tierConfig.baseReward;
    const bonuses: string[] = [];

    if (isHighScore) {
      orangesEarned += tierConfig.highScoreBonus;
      bonuses.push(`high_score:+${tierConfig.highScoreBonus}`);
    }

    if (isTop10) {
      orangesEarned += tierConfig.top10Bonus;
      bonuses.push(`top10:+${tierConfig.top10Bonus}`);
    }

    // ==========================================
    // STAGED TRUST (New accounts earn 50% for 7 days)
    // ==========================================
    const userCreatedAt = await env.DB.prepare('SELECT created_at FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (userCreatedAt?.created_at) {
      const accountAge = Date.now() - new Date(userCreatedAt.created_at as string).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (accountAge < sevenDays) {
        orangesEarned = Math.floor(orangesEarned * 0.5);
        bonuses.push('staged_trust:50%');
      }
    }

    // ==========================================
    // ATOMIC UPDATE (Currency + Transaction + Stats)
    // ==========================================

    // Get current balance
    const currentCurrency = await env.DB.prepare(
      'SELECT oranges, gems, lifetime_oranges FROM user_currency WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    if (!currentCurrency) {
      return new Response(JSON.stringify({ error: 'User currency not initialized' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const newOranges = (currentCurrency.oranges as number) + orangesEarned;
    const newLifetimeOranges = ((currentCurrency.lifetime_oranges as number) || 0) + orangesEarned;

    // Update currency
    await env.DB.prepare(
      `UPDATE user_currency
       SET oranges = ?, lifetime_oranges = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    )
      .bind(newOranges, newLifetimeOranges, userId)
      .run();

    // Log transaction
    await env.DB.prepare(
      `INSERT INTO currency_transactions
        (user_id, type, currency, amount, balance_after, source, source_id, metadata, idempotency_key)
       VALUES (?, 'earn', 'oranges', ?, ?, 'gameplay', ?, ?, ?)`
    )
      .bind(
        userId,
        orangesEarned,
        newOranges,
        gameId,
        JSON.stringify({ score, tier, bonuses, duration: durationSeconds }),
        idempotencyKey
      )
      .run();

    // ==========================================
    // RECORD GAME SESSION
    // ==========================================
    await env.DB.prepare(
      `INSERT INTO game_sessions (id, user_id, game_id, completed_at, final_score, duration_seconds, reward_claimed, reward_amount)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         completed_at = CURRENT_TIMESTAMP,
         final_score = ?,
         duration_seconds = ?,
         reward_claimed = 1,
         reward_amount = ?`
    )
      .bind(
        sessionId,
        userId,
        gameId,
        score,
        durationSeconds,
        orangesEarned,
        score,
        durationSeconds,
        orangesEarned
      )
      .run();

    // ==========================================
    // UPDATE STATS (For achievement tracking)
    // ==========================================
    await env.DB.prepare(
      `INSERT INTO user_stats (user_id, total_games_played, highest_score, highest_score_game)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         total_games_played = total_games_played + 1,
         highest_score = CASE WHEN ? > highest_score THEN ? ELSE highest_score END,
         highest_score_game = CASE WHEN ? > highest_score THEN ? ELSE highest_score_game END,
         updated_at = CURRENT_TIMESTAMP`
    )
      .bind(userId, score, gameId, score, score, score, gameId)
      .run();

    // ==========================================
    // UPDATE DAILY CHALLENGE PROGRESS
    // ==========================================
    const today = new Date().toISOString().split('T')[0];

    // Challenge 1: games-played-5
    await env.DB.prepare(
      `INSERT INTO daily_challenge_progress (user_id, challenge_date, challenge_id, progress, target)
       VALUES (?, ?, 'games-played-5', 1, 5)
       ON CONFLICT(user_id, challenge_date, challenge_id) DO UPDATE SET
         progress = progress + 1,
         completed_at = CASE
           WHEN progress + 1 >= target AND completed_at IS NULL
           THEN CURRENT_TIMESTAMP
           ELSE completed_at
         END`
    )
      .bind(userId, today)
      .run();

    // Challenge 2: personal-best-1 (if this was a high score)
    if (isHighScore) {
      await env.DB.prepare(
        `INSERT INTO daily_challenge_progress (user_id, challenge_date, challenge_id, progress, target)
         VALUES (?, ?, 'personal-best-1', 1, 1)
         ON CONFLICT(user_id, challenge_date, challenge_id) DO UPDATE SET
           progress = 1,
           completed_at = CASE WHEN completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END`
      )
        .bind(userId, today)
        .run();
    }

    // Challenge 3: play-time-600 (add duration)
    await env.DB.prepare(
      `INSERT INTO daily_challenge_progress (user_id, challenge_date, challenge_id, progress, target)
       VALUES (?, ?, 'play-time-600', ?, 600)
       ON CONFLICT(user_id, challenge_date, challenge_id) DO UPDATE SET
         progress = progress + ?,
         completed_at = CASE
           WHEN progress + ? >= target AND completed_at IS NULL
           THEN CURRENT_TIMESTAMP
           ELSE completed_at
         END`
    )
      .bind(userId, today, durationSeconds, durationSeconds, durationSeconds)
      .run();

    // ==========================================
    // CLEAR ACTIVE SESSION
    // ==========================================
    await env.DB.prepare('DELETE FROM active_sessions WHERE user_id = ?').bind(userId).run();

    // ==========================================
    // RESPONSE
    // ==========================================
    return new Response(
      JSON.stringify({
        success: true,
        reward: {
          oranges: orangesEarned,
          gems: 0,
          breakdown: {
            base: tierConfig.baseReward,
            tier,
            bonuses,
          },
        },
        newBalance: {
          oranges: newOranges,
          gems: currentCurrency.gems,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Gameplay Complete] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process game completion' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
