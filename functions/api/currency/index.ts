/**
 * Currency API - GET /api/currency
 *
 * Returns current currency balance for authenticated user.
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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    // Check if banned
    if (await checkBanned(env.DB, auth.userId)) {
      return bannedResponse();
    }

    // Get currency balance
    const currency = await env.DB.prepare(
      'SELECT * FROM user_currency WHERE user_id = ?'
    )
      .bind(auth.userId)
      .first();

    if (!currency) {
      // User not initialized - return zeros (frontend should call /init)
      return new Response(
        JSON.stringify({
          oranges: 0,
          gems: 0,
          lifetimeOranges: 0,
          lifetimeGems: 0,
          giftedOranges: 0,
          initialized: false,
        }),
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    return new Response(
      JSON.stringify({
        oranges: currency.oranges,
        gems: currency.gems,
        lifetimeOranges: currency.lifetime_oranges,
        lifetimeGems: currency.lifetime_gems,
        giftedOranges: currency.gifted_oranges,
        initialized: true,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Currency Get] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch currency' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
