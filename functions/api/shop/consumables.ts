/**
 * User Consumables API - /api/shop/consumables
 *
 * GET: Fetch user's consumable counts (donuts, poop)
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
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

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
    // Fetch user's consumables
    const consumables = await env.DB
      .prepare('SELECT consumable_type, quantity FROM user_consumables WHERE user_id = ?')
      .bind(auth.userId)
      .all<{ consumable_type: string; quantity: number }>();

    // Convert to object format
    const counts = {
      donuts: 0,
      poops: 0,
    };

    for (const item of consumables.results || []) {
      if (item.consumable_type === 'donut') {
        counts.donuts = item.quantity;
      } else if (item.consumable_type === 'poop') {
        counts.poops = item.quantity;
      }
    }

    return new Response(JSON.stringify(counts), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Consumables] Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch consumables',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
