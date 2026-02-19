/**
 * Friends API
 *
 * GET /api/friends - Get current user's friends
 * POST /api/friends - Add a friend
 */

import { Env } from '../types';
import { authenticateRequest } from '../lib/auth';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate request
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const userId = auth.userId;

  if (request.method === 'GET') {
    try {
      const results = await env.DB.prepare(
        "SELECT friend_id FROM friends WHERE user_id = ? AND status = 'accepted'"
      ).bind(userId).all();

      return new Response(JSON.stringify({
        friendIds: (results.results || []).map((r: { friend_id: string }) => r.friend_id),
      }), {
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('[Friends API] GET error:', error);
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json() as { friendId: string };

      if (!body.friendId || typeof body.friendId !== 'string') {
        return new Response(JSON.stringify({ error: 'friendId is required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      await env.DB.prepare(
        'INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)'
      ).bind(userId, body.friendId, new Date().toISOString()).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('[Friends API] POST error:', error);
      return new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders,
  });
};
