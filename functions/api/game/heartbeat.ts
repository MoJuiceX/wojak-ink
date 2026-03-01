/**
 * Game Heartbeat API - POST /api/game/heartbeat
 *
 * Updates the last_heartbeat timestamp for an active session.
 * Should be called every 30 seconds while playing.
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

interface HeartbeatRequest {
  sessionId: string;
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
  let body: HeartbeatRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { sessionId } = body;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // Update heartbeat for this session
    const result = await env.DB.prepare(
      `UPDATE active_sessions
       SET last_heartbeat = CURRENT_TIMESTAMP
       WHERE user_id = ? AND session_id = ?`
    )
      .bind(userId, sessionId)
      .run();

    // Check if session was found
    if (!result.meta.changes || result.meta.changes === 0) {
      // Session doesn't exist or wrong session ID
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Session not found or expired',
        }),
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Game Heartbeat] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update heartbeat' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
