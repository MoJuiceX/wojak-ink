/**
 * User Inventory API - /api/shop/inventory
 *
 * GET: Returns all items owned by the authenticated user
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

interface InventoryItem {
  id: string;
  item_id: string;
  name: string;
  category: string;
  rarity: string;
  css_class: string | null;
  emoji: string | null;
  acquired_at: string;
  acquisition_type: string;
}

interface EquippedItems {
  frame_id: string | null;
  title_id: string | null;
  name_effect_id: string | null;
  background_id: string | null;
  celebration_id: string | null;
}

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
    // Get all items in user's inventory
    const { results: inventory } = await env.DB
      .prepare(
        `SELECT
          ui.id,
          ui.item_id,
          si.name,
          si.category,
          si.rarity,
          si.css_class,
          si.emoji,
          ui.acquired_at,
          ui.acquisition_type
        FROM user_inventory ui
        JOIN shop_items si ON ui.item_id = si.id
        WHERE ui.user_id = ?
        ORDER BY si.category, ui.acquired_at DESC`
      )
      .bind(auth.userId)
      .all<InventoryItem>();

    // Get equipped items
    const equipped = await env.DB
      .prepare(
        'SELECT frame_id, title_id, name_effect_id, background_id, celebration_id FROM user_equipped WHERE user_id = ?'
      )
      .bind(auth.userId)
      .first<EquippedItems>();

    // Get owned emojis
    const { results: ownedEmojis } = await env.DB
      .prepare('SELECT emoji, item_id FROM user_owned_emojis WHERE user_id = ?')
      .bind(auth.userId)
      .all<{ emoji: string; item_id: string }>();

    // Get emoji ring positions
    const { results: emojiRing } = await env.DB
      .prepare('SELECT position, emoji FROM user_emoji_ring WHERE user_id = ?')
      .bind(auth.userId)
      .all<{ position: string; emoji: string }>();

    // Convert emoji ring to object
    const ringPositions: Record<string, string> = {};
    for (const pos of emojiRing || []) {
      ringPositions[pos.position] = pos.emoji;
    }

    // Get BigPulp state
    const bigpulp = await env.DB
      .prepare('SELECT current_hat, current_mood, current_accessory FROM user_bigpulp WHERE user_id = ?')
      .bind(auth.userId)
      .first<{ current_hat: string | null; current_mood: string; current_accessory: string | null }>();

    // Get total spent
    const spending = await env.DB
      .prepare('SELECT SUM(price_paid) as total FROM purchase_history WHERE user_id = ?')
      .bind(auth.userId)
      .first<{ total: number | null }>();

    // Group inventory by category
    const byCategory: Record<string, InventoryItem[]> = {};
    for (const item of inventory || []) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    }

    return new Response(
      JSON.stringify({
        items: inventory || [],
        byCategory,
        equipped: equipped || {
          frame_id: null,
          title_id: null,
          name_effect_id: null,
          background_id: null,
          celebration_id: null,
        },
        ownedEmojis: ownedEmojis?.map(e => e.emoji) || [],
        emojiRing: ringPositions,
        bigpulp: bigpulp || { current_hat: null, current_mood: 'happy', current_accessory: null },
        totalItems: inventory?.length || 0,
        totalSpent: spending?.total || 0,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Shop Inventory] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
