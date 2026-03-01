/**
 * Game Start API - POST /api/game/start
 *
 * Starts a new game session. Returns 409 Conflict if user already has active session.
 * Single-session enforcement - one active game per user.
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

interface StartGameRequest {
  gameId: string;
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
  let body: StartGameRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { gameId } = body;

  if (!gameId) {
    return new Response(JSON.stringify({ error: 'gameId required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Check for existing active session (with 2-minute timeout)
    const existing = await env.DB.prepare(
      `SELECT * FROM active_sessions
       WHERE user_id = ?
       AND datetime(last_heartbeat) > datetime('now', '-2 minutes')`
    )
      .bind(userId)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: 'Already playing',
          activeGame: existing.game_id,
          message: 'You can only play one game at a time. Close the other tab first.',
        }),
        {
          status: 409,
          headers: corsHeaders,
        }
      );
    }

    // Create or replace session
    await env.DB.prepare(
      `INSERT OR REPLACE INTO active_sessions (user_id, game_id, session_id, started_at, last_heartbeat)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
      .bind(userId, gameId, sessionId)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        gameId,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Game Start] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to start game session' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
