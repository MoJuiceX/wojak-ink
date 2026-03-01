/**
 * Currency Init API - POST /api/currency/init
 *
 * Initializes currency for a new user. Idempotent - safe to call multiple times.
 * Returns current balance (creates with starting balance if new).
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

const STARTING_ORANGES = 100;

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

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // Try to get existing balance
    const existing = await env.DB.prepare('SELECT * FROM user_currency WHERE user_id = ?')
      .bind(userId)
      .first();

    if (existing) {
      // Already initialized, return current balance
      return new Response(
        JSON.stringify({
          oranges: existing.oranges,
          gems: existing.gems,
          lifetimeOranges: existing.lifetime_oranges,
          lifetimeGems: existing.lifetime_gems,
          giftedOranges: existing.gifted_oranges,
          isNew: false,
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // Ensure user record exists in users table
    await env.DB.prepare(
      `INSERT INTO users (id, created_at, updated_at)
       VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')`
    )
      .bind(userId)
      .run();

    // Create new user currency record with starting balance
    await env.DB.prepare(
      `INSERT INTO user_currency (user_id, oranges, gems, lifetime_oranges, lifetime_gems, gifted_oranges)
       VALUES (?, ?, 0, ?, 0, 0)`
    )
      .bind(userId, STARTING_ORANGES, STARTING_ORANGES)
      .run();

    // Also initialize user_stats
    await env.DB.prepare(`INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)`)
      .bind(userId)
      .run();

    // Log the starting balance as a transaction
    await env.DB.prepare(
      `INSERT INTO currency_transactions
        (user_id, type, currency, amount, balance_after, source, idempotency_key)
       VALUES (?, 'earn', 'oranges', ?, ?, 'account_creation', ?)`
    )
      .bind(userId, STARTING_ORANGES, STARTING_ORANGES, `init_${userId}`)
      .run();

    return new Response(
      JSON.stringify({
        oranges: STARTING_ORANGES,
        gems: 0,
        lifetimeOranges: STARTING_ORANGES,
        lifetimeGems: 0,
        giftedOranges: 0,
        isNew: true,
      }),
      {
        status: 201,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Currency Init] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to initialize currency' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
