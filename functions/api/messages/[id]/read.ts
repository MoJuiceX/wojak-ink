/**
 * Mark Message Read API - POST /api/messages/[id]/read
 *
 * Marks a specific message as read.
 */

import { authenticateRequest } from '../../../lib/auth';

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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== 'POST') {
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

  const messageId = params.id as string;

  if (!messageId) {
    return new Response(
      JSON.stringify({ error: 'Message ID required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Mark message as read (only if it belongs to the user)
    const result = await env.DB
      .prepare(
        `UPDATE messages
         SET read = 1
         WHERE id = ? AND user_id = ?`
      )
      .bind(messageId, auth.userId)
      .run();

    if (result.meta.changes === 0) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Messages] Error marking read:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders });
};
