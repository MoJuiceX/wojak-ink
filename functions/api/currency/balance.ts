/**
 * Currency Balance API - /api/currency/balance
 *
 * GET: Returns the authenticated user's currency balance
 *
 * Response: {
 *   oranges: number,
 *   gems: number,
 *   lifetimeOranges: number,
 *   lifetimeGems: number,
 *   giftedOranges: number,
 *   gemsConvertedThisMonth: number
 * }
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Starting balance for new users
const STARTING_BALANCE = {
  oranges: 100,
  gems: 0,
};

/**
 * Ensure user profile exists with default currency
 */
async function ensureProfile(db: D1Database, userId: string): Promise<void> {
  // First ensure user exists
  await db
    .prepare(
      `INSERT INTO users (id, created_at, updated_at)
       VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')`
    )
    .bind(userId)
    .run();

  // Then ensure profile exists with default balance
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
 * Get user's currency balance
 */
async function getBalance(db: D1Database, userId: string) {
  const result = await db
    .prepare(
      `SELECT
        oranges,
        gems,
        lifetime_oranges,
        lifetime_gems,
        gifted_oranges,
        gems_converted_this_month,
        gem_conversion_reset_date
      FROM profiles
      WHERE user_id = ?`
    )
    .bind(userId)
    .first<{
      oranges: number;
      gems: number;
      lifetime_oranges: number;
      lifetime_gems: number;
      gifted_oranges: number;
      gems_converted_this_month: number;
      gem_conversion_reset_date: string | null;
    }>();

  return result;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET
  if (request.method !== 'GET') {
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

  try {
    // Ensure profile exists
    await ensureProfile(env.DB, auth.userId);

    // Get balance
    const balance = await getBalance(env.DB, auth.userId);

    if (!balance) {
      return new Response(
        JSON.stringify({
          oranges: STARTING_BALANCE.oranges,
          gems: STARTING_BALANCE.gems,
          lifetimeOranges: STARTING_BALANCE.oranges,
          lifetimeGems: STARTING_BALANCE.gems,
          giftedOranges: 0,
          gemsConvertedThisMonth: 0,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Check if we need to reset monthly gem conversion
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;

    if (balance.gem_conversion_reset_date !== currentMonth) {
      // Reset gem conversion for new month
      await env.DB
        .prepare(
          `UPDATE profiles
           SET gems_converted_this_month = 0,
               gem_conversion_reset_date = ?
           WHERE user_id = ?`
        )
        .bind(currentMonth, auth.userId)
        .run();

      balance.gems_converted_this_month = 0;
    }

    return new Response(
      JSON.stringify({
        oranges: balance.oranges,
        gems: balance.gems,
        lifetimeOranges: balance.lifetime_oranges,
        lifetimeGems: balance.lifetime_gems,
        giftedOranges: balance.gifted_oranges,
        gemsConvertedThisMonth: balance.gems_converted_this_month,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Currency Balance] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
