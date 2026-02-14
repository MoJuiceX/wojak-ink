/**
 * Equip Item API - /api/shop/equip
 *
 * POST: Equip or unequip an item
 * Body: {
 *   slot: string (category name),
 *   itemId: string | null  // null to unequip (resets to default)
 * }
 *
 * Supports all item categories from unified items table
 */

import { authenticateRequest } from '../../lib/auth';

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

// Map slot (category) to user_equipment column
const SLOT_TO_COLUMN: Record<string, string> = {
  frame: 'frame_id',
  title: 'title_id',
  background: 'background_id',
  name_effect: 'name_effect_id',
  celebration: 'celebration_id',
  bigpulp_hat: 'bigpulp_hat_id',
  bigpulp_mood: 'bigpulp_mood_id',
  bigpulp_accessory: 'bigpulp_accessory_id',
  font_color: 'font_color_id',
  font_style: 'font_style_id',
  font_family: 'font_family_id',
  page_background: 'page_background_id',
  avatar_glow: 'avatar_glow_id',
  avatar_size: 'avatar_size_id',
  bigpulp_position: 'bigpulp_position_id',
  dialogue_style: 'dialogue_style_id',
  collection_layout: 'collection_layout_id',
  card_style: 'card_style_id',
  entrance_animation: 'entrance_animation_id',
  stats_style: 'stats_style_id',
  tabs_style: 'tabs_style_id',
  visitor_counter: 'visitor_counter_id',
};

// Default values for each slot (used when unequipping)
const SLOT_DEFAULTS: Record<string, string | null> = {
  frame: null,
  title: null,
  background: null,
  name_effect: null,
  celebration: null,
  bigpulp_hat: null,
  bigpulp_mood: null,
  bigpulp_accessory: null,
  font_color: 'font-color-orange',
  font_style: 'font-style-normal',
  font_family: 'font-family-default',
  page_background: 'bg-midnight-black',
  avatar_glow: 'avatar-glow-none',
  avatar_size: 'avatar-size-normal',
  bigpulp_position: 'bigpulp-pos-right',
  dialogue_style: 'dialogue-style-default',
  collection_layout: 'layout-grid',
  card_style: 'card-style-default',
  entrance_animation: 'entrance-none',
  stats_style: 'stats-style-default',
  tabs_style: 'tabs-style-default',
  visitor_counter: 'visitor-counter-hidden',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== 'POST') {
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
    // Parse request body
    const body = await request.json() as { slot: string; itemId: string | null };
    const { slot, itemId } = body;

    // Validate slot
    if (!slot || !SLOT_TO_COLUMN[slot]) {
      return new Response(JSON.stringify({
        error: 'Invalid slot',
        validSlots: Object.keys(SLOT_TO_COLUMN),
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const column = SLOT_TO_COLUMN[slot];
    const statements: D1PreparedStatement[] = [];

    // Determine what item to equip
    let equipItemId = itemId;
    let itemName = '';

    if (itemId === null) {
      // Unequipping - use default value for this slot
      equipItemId = SLOT_DEFAULTS[slot];
    } else {
      // Equipping - verify user owns the item (or it's a free item)
      const item = await env.DB
        .prepare(
          `SELECT i.id, i.name, i.category, i.tier, i.price_oranges
           FROM items i
           LEFT JOIN user_items ui ON ui.item_id = i.id AND ui.user_id = ? AND ui.state IN ('owned', 'equipped')
           WHERE i.id = ? AND i.category = ?`
        )
        .bind(auth.userId, itemId, slot)
        .first<{ id: string; name: string; category: string; tier: string; price_oranges: number }>();

      if (!item) {
        return new Response(JSON.stringify({ error: 'Item not found or does not match slot' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Check if user owns it (or it's free)
      if (item.tier !== 'free' && item.price_oranges > 0) {
        const owned = await env.DB
          .prepare(
            `SELECT id FROM user_items
             WHERE user_id = ? AND item_id = ? AND state IN ('owned', 'equipped')`
          )
          .bind(auth.userId, itemId)
          .first();

        if (!owned) {
          return new Response(JSON.stringify({ error: 'You do not own this item' }), {
            status: 400,
            headers: corsHeaders,
          });
        }
      }

      itemName = item.name;
    }

    // Upsert user_equipment row with the new value
    statements.push(
      env.DB.prepare(
        `INSERT INTO user_equipment (user_id, ${column}, updated_at)
         VALUES (?, ?, datetime("now"))
         ON CONFLICT(user_id) DO UPDATE SET ${column} = ?, updated_at = datetime("now")`
      ).bind(auth.userId, equipItemId, equipItemId)
    );

    // Update user_items state: mark new item as 'equipped', old as 'owned'
    if (equipItemId) {
      // Set new item to equipped
      statements.push(
        env.DB.prepare(
          `UPDATE user_items SET state = 'equipped'
           WHERE user_id = ? AND item_id = ? AND state = 'owned'`
        ).bind(auth.userId, equipItemId)
      );
    }

    // Set previous item in this slot back to 'owned'
    statements.push(
      env.DB.prepare(
        `UPDATE user_items SET state = 'owned'
         WHERE user_id = ? AND item_id != ?
         AND item_id IN (SELECT id FROM items WHERE category = ?)
         AND state = 'equipped'`
      ).bind(auth.userId, equipItemId || '', slot)
    );

    // Execute all statements
    await env.DB.batch(statements);

    // Get updated equipped state
    const equipped = await env.DB
      .prepare('SELECT * FROM user_equipment WHERE user_id = ?')
      .bind(auth.userId)
      .first();

    return new Response(
      JSON.stringify({
        success: true,
        slot,
        itemId: equipItemId,
        equipped,
        toast: itemId !== null ? {
          type: 'success',
          title: 'Item Equipped!',
          message: `${itemName || 'Item'} is now active.`,
          icon: '✨',
        } : {
          type: 'info',
          title: 'Item Unequipped',
          message: `Slot reset to default.`,
          icon: '↩️',
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Shop Equip] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
