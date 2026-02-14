/**
 * Currency Earn API - /api/currency/earn
 *
 * POST: Award currency to the authenticated user
 *
 * Request body: {
 *   oranges?: number,
 *   gems?: number,
 *   source: string, // 'gameplay', 'challenge', 'login', 'achievement', 'leaderboard', etc.
 *   sourceDetails?: object // Additional context
 * }
 *
 * Response: {
 *   success: boolean,
 *   orangesEarned: number,
 *   gemsEarned: number,
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface EarnRequest {
  oranges?: number;
  gems?: number;
  source: string;
  sourceDetails?: Record<string, unknown>;
}

const VALID_SOURCES = [
  'gameplay',
  'challenge',
  'login',
  'achievement',
  'leaderboard',
  'onboarding',
  'gift_received',
  'admin',
];

// Starting balance for new users
const STARTING_BALANCE = {
  oranges: 100,
  gems: 0,
};

/**
 * Ensure user profile exists with default currency
 */
async function ensureProfile(db: D1Database, userId: string): Promise<void> {
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
        gifted_oranges, gems_converted_this_month, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO NOTHING`
    )
    .bind(userId, STARTING_BALANCE.oranges, STARTING_BALANCE.gems, STARTING_BALANCE.oranges, STARTING_BALANCE.gems)
    .run();
}

/**
 * Add currency and record transaction
 */
async function earnCurrency(
  db: D1Database,
  userId: string,
  oranges: number,
  gems: number,
  source: string,
  sourceDetails?: Record<string, unknown>,
  isGifted: boolean = false
): Promise<{ oranges: number; gems: number }> {
  // Update profile balance
  await db
    .prepare(
      `UPDATE profiles SET
        oranges = oranges + ?,
        gems = gems + ?,
        lifetime_oranges = lifetime_oranges + ?,
        lifetime_gems = lifetime_gems + ?,
        gifted_oranges = gifted_oranges + ?,
        updated_at = datetime('now')
      WHERE user_id = ?`
    )
    .bind(oranges, gems, oranges, gems, isGifted ? oranges : 0, userId)
    .run();

  // Get new balance
  const balance = await db
    .prepare(`SELECT oranges, gems FROM profiles WHERE user_id = ?`)
    .bind(userId)
    .first<{ oranges: number; gems: number }>();

  if (!balance) {
    throw new Error('Failed to get balance after update');
  }

  // Record transactions
  if (oranges > 0) {
    await db
      .prepare(
        `INSERT INTO currency_transactions
          (user_id, currency_type, amount, balance_after, source, source_details, is_gifted, created_at)
         VALUES (?, 'oranges', ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        userId,
        oranges,
        balance.oranges,
        source,
        sourceDetails ? JSON.stringify(sourceDetails) : null,
        isGifted ? 1 : 0
      )
      .run();
  }

  if (gems > 0) {
    await db
      .prepare(
        `INSERT INTO currency_transactions
          (user_id, currency_type, amount, balance_after, source, source_details, is_gifted, created_at)
         VALUES (?, 'gems', ?, ?, ?, ?, 0, datetime('now'))`
      )
      .bind(userId, gems, balance.gems, source, sourceDetails ? JSON.stringify(sourceDetails) : null)
      .run();
  }

  return balance;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
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

  // Parse request body
  let body: EarnRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Validate request
  const oranges = body.oranges || 0;
  const gems = body.gems || 0;

  if (oranges < 0 || gems < 0) {
    return new Response(JSON.stringify({ error: 'Amount must be non-negative' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (oranges === 0 && gems === 0) {
    return new Response(JSON.stringify({ error: 'Must specify oranges or gems to earn' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!body.source || !VALID_SOURCES.includes(body.source)) {
    return new Response(
      JSON.stringify({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Ensure profile exists
    await ensureProfile(env.DB, auth.userId);

    // Earn currency
    const isGifted = body.source === 'gift_received';
    const newBalance = await earnCurrency(env.DB, auth.userId, oranges, gems, body.source, body.sourceDetails, isGifted);

    return new Response(
      JSON.stringify({
        success: true,
        orangesEarned: oranges,
        gemsEarned: gems,
        newBalance,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Currency Earn] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
