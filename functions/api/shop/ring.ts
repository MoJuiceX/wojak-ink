/**
 * Emoji Ring API - /api/shop/ring
 *
 * GET: Returns emoji ring configuration for authenticated user
 * POST: Update emoji ring positions (drag-and-drop arrangement)
 * Body: { positions: Record<string, string | null> }
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Valid ring positions
const VALID_POSITIONS = [
  'left_1', 'left_2', 'left_3',
  'right_1', 'right_2', 'right_3',
  'top_1', 'top_2', 'top_3', 'top_4', 'top_5', 'top_6',
  'bottom_1', 'bottom_2', 'bottom_3', 'bottom_4', 'bottom_5', 'bottom_6',
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

  // GET: Return current ring configuration
  if (request.method === 'GET') {
    try {
      // Get emoji ring positions
      const { results: ringRows } = await env.DB
        .prepare('SELECT position, emoji FROM user_emoji_ring WHERE user_id = ?')
        .bind(auth.userId)
        .all<{ position: string; emoji: string }>();

      // Convert to object
      const positions: Record<string, string | null> = {};
      for (const pos of VALID_POSITIONS) {
        const match = ringRows?.find(r => r.position === pos);
        positions[pos] = match?.emoji || null;
      }

      // Get owned emojis
      const { results: ownedEmojis } = await env.DB
        .prepare('SELECT emoji FROM user_owned_emojis WHERE user_id = ?')
        .bind(auth.userId)
        .all<{ emoji: string }>();

      return new Response(
        JSON.stringify({
          positions,
          ownedEmojis: ownedEmojis?.map(e => e.emoji) || [],
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error('[Emoji Ring GET] Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  // POST: Update ring positions
  if (request.method === 'POST') {
    try {
      const body = await request.json() as { positions: Record<string, string | null> };
      const { positions } = body;

      if (!positions || typeof positions !== 'object') {
        return new Response(JSON.stringify({ error: 'positions object is required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Get user's owned emojis
      const { results: ownedEmojis } = await env.DB
        .prepare('SELECT emoji FROM user_owned_emojis WHERE user_id = ?')
        .bind(auth.userId)
        .all<{ emoji: string }>();

      const ownedSet = new Set(ownedEmojis?.map(e => e.emoji) || []);

      // Validate positions
      const validatedPositions: { position: string; emoji: string }[] = [];

      for (const [position, emoji] of Object.entries(positions)) {
        // Skip invalid positions
        if (!VALID_POSITIONS.includes(position)) {
          continue;
        }

        // Skip null/empty (means unequip this position)
        if (!emoji) {
          continue;
        }

        // Verify user owns this emoji
        if (!ownedSet.has(emoji)) {
          return new Response(JSON.stringify({ error: `You do not own emoji: ${emoji}` }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        validatedPositions.push({ position, emoji });
      }

      // Clear existing ring and set new positions
      const statements = [
        // Delete all existing positions for this user
        env.DB.prepare('DELETE FROM user_emoji_ring WHERE user_id = ?').bind(auth.userId),
      ];

      // Insert new positions
      for (const { position, emoji } of validatedPositions) {
        statements.push(
          env.DB.prepare(
            'INSERT INTO user_emoji_ring (user_id, emoji, position) VALUES (?, ?, ?)'
          ).bind(auth.userId, emoji, position)
        );
      }

      await env.DB.batch(statements);

      // Return updated positions
      const finalPositions: Record<string, string | null> = {};
      for (const pos of VALID_POSITIONS) {
        const match = validatedPositions.find(p => p.position === pos);
        finalPositions[pos] = match?.emoji || null;
      }

      return new Response(
        JSON.stringify({
          success: true,
          positions: finalPositions,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error('[Emoji Ring POST] Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
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
