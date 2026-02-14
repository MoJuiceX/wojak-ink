/**
 * Shop Items API - /api/shop/items
 *
 * GET: Returns all active items from unified items table grouped by category
 * Authenticated requests get owned status marked on items
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tier: string;
  price_oranges: number;
  price_gems: number;
  css_class: string | null;
  css_value: string | null;
  emoji: string | null;
  preview_type: string | null;
  effect: string | null;
  is_limited: number;
  stock_limit: number | null;
  stock_remaining: number | null;
  available_from: string | null;
  available_until: string | null;
  bundle_items: string | null;
  bundle_discount: number | null;
  is_consumable: number;
  consumable_quantity: number | null;
  sort_order: number;
  owned?: boolean;
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

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    // Try to authenticate to get userId for ownership marking
    let userId: string | null = null;
    try {
      const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
      if (auth) {
        userId = auth.userId;
      }
    } catch {
      // Auth is optional - continue without userId
    }

    // Get all active items from unified table
    const { results } = await env.DB
      .prepare(
        `SELECT
          id, name, description, category, tier,
          price_oranges, price_gems,
          css_class, css_value, emoji, preview_type, effect,
          is_limited, stock_limit, stock_remaining,
          available_from, available_until,
          bundle_items, bundle_discount,
          is_consumable, consumable_quantity,
          sort_order
        FROM items
        WHERE is_active = 1
        ORDER BY category, sort_order`
      )
      .all<ShopItem>();

    // If userId provided, get owned items to mark them
    let ownedItemIds: Set<string> = new Set();
    if (userId) {
      const { results: ownedItems } = await env.DB
        .prepare(
          `SELECT DISTINCT item_id FROM user_items
           WHERE user_id = ? AND state IN ('owned', 'equipped')`
        )
        .bind(userId)
        .all<{ item_id: string }>();

      ownedItemIds = new Set((ownedItems || []).map(i => i.item_id));
    }

    // Mark owned items and filter availability
    const now = new Date().toISOString();
    const processedItems = (results || []).map(item => ({
      ...item,
      owned: ownedItemIds.has(item.id),
      // Check if limited item is available
      isAvailable: !item.is_limited || (
        (item.stock_remaining === null || item.stock_remaining > 0) &&
        (!item.available_from || item.available_from <= now) &&
        (!item.available_until || item.available_until > now)
      ),
    }));

    // Group items by category
    const categories: Record<string, typeof processedItems> = {};
    const categoryOrder = [
      // Shop items
      'emoji_badge',
      'frame',
      'name_effect',
      'title',
      'background',
      'celebration',
      'bigpulp_hat',
      'bigpulp_mood',
      'bigpulp_accessory',
      // Drawer customization
      'font_color',
      'font_style',
      'font_family',
      'page_background',
      'avatar_glow',
      'avatar_size',
      'bigpulp_position',
      'dialogue_style',
      'collection_layout',
      'card_style',
      'entrance_animation',
      'stats_style',
      'tabs_style',
      'visitor_counter',
      // Other
      'consumable',
      'bundle',
    ];

    for (const item of processedItems) {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    }

    return new Response(
      JSON.stringify({
        items: processedItems,
        categories,
        categoryOrder,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Shop Items] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
