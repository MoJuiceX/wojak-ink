/**
 * Messages Unread Count API - GET /api/messages/unread-count
 *
 * Returns count of unread messages for the authenticated user.
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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  // Check configuration
  if (!env.CLERK_DOMAIN || !env.DB) {
    return new Response(
      JSON.stringify({ error: 'Server not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Authenticate
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    // Count unread messages
    const result = await env.DB
      .prepare(
        `SELECT COUNT(*) as count
         FROM messages
         WHERE user_id = ? AND read = 0`
      )
      .bind(auth.userId)
      .first<{ count: number }>();

    return new Response(
      JSON.stringify({ count: result?.count || 0 }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Messages] Error counting unread:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders });
};
