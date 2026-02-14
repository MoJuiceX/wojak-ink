/**
 * Inventory API - /api/inventory
 *
 * GET: Returns user's owned items grouped by category
 * Requires authentication
 */

interface Env {
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
  description: string | null;
  category: string;
  tier: string;
  css_class: string | null;
  css_value: string | null;
  emoji: string | null;
  preview_type: string | null;
  state: string;
  acquisition_type: string;
  acquired_at: string;
  price_paid: number;
  uses_remaining: number | null;
}

interface Equipment {
  frame_id: string | null;
  title_id: string | null;
  background_id: string | null;
  name_effect_id: string | null;
  celebration_id: string | null;
  bigpulp_hat_id: string | null;
  bigpulp_mood_id: string | null;
  bigpulp_accessory_id: string | null;
  font_color_id: string;
  font_style_id: string;
  font_family_id: string;
  page_background_id: string;
  avatar_glow_id: string;
  avatar_size_id: string;
  bigpulp_position_id: string;
  dialogue_style_id: string;
  collection_layout_id: string;
  card_style_id: string;
  entrance_animation_id: string;
  stats_style_id: string;
  tabs_style_id: string;
  visitor_counter_id: string;
}

interface GiftStats {
  total_oranges_gifted: number;
  total_gems_gifted: number;
  total_items_gifted: number;
}

// Get user ID from Clerk JWT
async function getUserIdFromToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    // Decode JWT payload (middle part)
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || null;
  } catch {
    return null;
  }
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

  // Get user ID from token
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    // Get all owned items with item details
    const { results: items } = await env.DB
      .prepare(
        `SELECT
          ui.id, ui.item_id, i.name, i.description, i.category, i.tier,
          i.css_class, i.css_value, i.emoji, i.preview_type,
          ui.state, ui.acquisition_type, ui.acquired_at, ui.price_paid,
          ui.uses_remaining
        FROM user_items ui
        JOIN items i ON ui.item_id = i.id
        WHERE ui.user_id = ? AND ui.state IN ('owned', 'equipped')
        ORDER BY i.category, i.sort_order`
      )
      .bind(userId)
      .all<InventoryItem>();

    // Get current equipment
    const { results: equipmentResults } = await env.DB
      .prepare(
        `SELECT * FROM user_equipment WHERE user_id = ?`
      )
      .bind(userId)
      .all<Equipment>();

    // Default equipment if none exists
    const equipment: Equipment = equipmentResults?.[0] || {
      frame_id: null,
      title_id: null,
      background_id: null,
      name_effect_id: null,
      celebration_id: null,
      bigpulp_hat_id: null,
      bigpulp_mood_id: null,
      bigpulp_accessory_id: null,
      font_color_id: 'font-color-orange',
      font_style_id: 'font-style-normal',
      font_family_id: 'font-family-default',
      page_background_id: 'bg-midnight-black',
      avatar_glow_id: 'avatar-glow-none',
      avatar_size_id: 'avatar-size-normal',
      bigpulp_position_id: 'bigpulp-pos-right',
      dialogue_style_id: 'dialogue-style-default',
      collection_layout_id: 'layout-grid',
      card_style_id: 'card-style-default',
      entrance_animation_id: 'entrance-none',
      stats_style_id: 'stats-style-default',
      tabs_style_id: 'tabs-style-default',
      visitor_counter_id: 'visitor-counter-hidden',
    };

    // Build equipped map by category
    const equipped: Record<string, string | null> = {
      frame: equipment.frame_id,
      title: equipment.title_id,
      background: equipment.background_id,
      name_effect: equipment.name_effect_id,
      celebration: equipment.celebration_id,
      bigpulp_hat: equipment.bigpulp_hat_id,
      bigpulp_mood: equipment.bigpulp_mood_id,
      bigpulp_accessory: equipment.bigpulp_accessory_id,
      font_color: equipment.font_color_id,
      font_style: equipment.font_style_id,
      font_family: equipment.font_family_id,
      page_background: equipment.page_background_id,
      avatar_glow: equipment.avatar_glow_id,
      avatar_size: equipment.avatar_size_id,
      bigpulp_position: equipment.bigpulp_position_id,
      dialogue_style: equipment.dialogue_style_id,
      collection_layout: equipment.collection_layout_id,
      card_style: equipment.card_style_id,
      entrance_animation: equipment.entrance_animation_id,
      stats_style: equipment.stats_style_id,
      tabs_style: equipment.tabs_style_id,
      visitor_counter: equipment.visitor_counter_id,
    };

    // Group items by category and mark equipped status
    const categories: Record<string, (InventoryItem & { equipped: boolean })[]> = {};
    for (const item of items || []) {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push({
        ...item,
        equipped: equipped[item.category] === item.item_id,
      });
    }

    // Get consumable counts (aggregated)
    const { results: consumables } = await env.DB
      .prepare(
        `SELECT
          CASE
            WHEN item_id = 'consumable-donuts-10' THEN 'donut'
            WHEN item_id = 'consumable-poop-10' THEN 'poop'
            ELSE item_id
          END as type,
          SUM(uses_remaining) as quantity
        FROM user_items
        WHERE user_id = ? AND state = 'owned' AND uses_remaining > 0
        GROUP BY type`
      )
      .bind(userId)
      .all<{ type: string; quantity: number }>();

    const consumableCounts: Record<string, number> = {};
    for (const c of consumables || []) {
      consumableCounts[c.type] = c.quantity;
    }

    // Get gift stats
    const { results: giftStatsResults } = await env.DB
      .prepare(
        `SELECT total_oranges_gifted, total_gems_gifted, total_items_gifted
         FROM user_gift_stats WHERE user_id = ?`
      )
      .bind(userId)
      .all<GiftStats>();

    const giftStats = giftStatsResults?.[0] || {
      total_oranges_gifted: 0,
      total_gems_gifted: 0,
      total_items_gifted: 0,
    };

    // Calculate total spent
    const { results: spentResults } = await env.DB
      .prepare(
        `SELECT SUM(price_paid) as total FROM user_items WHERE user_id = ?`
      )
      .bind(userId)
      .all<{ total: number | null }>();

    const totalSpent = spentResults?.[0]?.total || 0;

    return new Response(
      JSON.stringify({
        categories,
        equipped,
        consumables: consumableCounts,
        stats: {
          totalItems: (items || []).length,
          totalSpent,
        },
        giftStats,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Inventory] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
