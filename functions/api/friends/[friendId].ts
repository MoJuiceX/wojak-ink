/**
 * Friends Delete API
 *
 * DELETE /api/friends/:friendId - Remove a friend
 */

import { Env } from '../../types';
import { authenticateRequest } from '../../lib/auth';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Authenticate request
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const friendId = params.friendId as string;
  if (!friendId) {
    return new Response(JSON.stringify({ error: 'Friend ID required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    await env.DB.prepare(
      'DELETE FROM friends WHERE user_id = ? AND friend_id = ?'
    ).bind(auth.userId, friendId).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Friends API] Delete error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
