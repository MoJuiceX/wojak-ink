/**
 * Messages API - GET /api/messages
 *
 * Returns list of messages for the authenticated user.
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

interface Message {
  id: string;
  title: string;
  content: string;
  type: string;
  read: number;
  created_at: string;
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
    // Fetch messages for user, ordered by newest first
    const result = await env.DB
      .prepare(
        `SELECT id, title, content, type, read, created_at
         FROM messages
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .bind(auth.userId)
      .all<Message>();

    const messages = result.results || [];

    return new Response(
      JSON.stringify({
        messages: messages.map(m => ({
          id: m.id,
          title: m.title,
          content: m.content,
          type: m.type,
          read: m.read === 1,
          createdAt: m.created_at,
        })),
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Messages] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders });
};
