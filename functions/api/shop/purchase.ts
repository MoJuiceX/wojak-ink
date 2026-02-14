/**
 * Shop Purchase API - /api/shop/purchase
 *
 * POST: Purchase an item from the unified items table
 * Body: { itemId: string }
 *
 * Handles:
 * - Regular items
 * - Limited editions (stock decrement)
 * - Bundles (multi-item purchase with discount)
 * - Consumables (quantity tracking)
 * - Auto-equip after purchase
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

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tier: string;
  price_oranges: number;
  price_gems: number;
  emoji: string | null;
  css_class: string | null;
  is_limited: number;
  stock_limit: number | null;
  stock_remaining: number | null;
  available_from: string | null;
  available_until: string | null;
  bundle_items: string | null;
  bundle_discount: number | null;
  is_consumable: number;
  consumable_quantity: number | null;
}

// Map category to equipment column
const CATEGORY_TO_EQUIPMENT_COLUMN: Record<string, string> = {
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
    const body = await request.json() as { itemId: string };
    const { itemId } = body;

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'itemId is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get the item details from unified items table
    const item = await env.DB
      .prepare(
        `SELECT id, name, description, category, tier, price_oranges, price_gems,
                emoji, css_class, is_limited, stock_limit, stock_remaining,
                available_from, available_until, bundle_items, bundle_discount,
                is_consumable, consumable_quantity
         FROM items WHERE id = ? AND is_active = 1`
      )
      .bind(itemId)
      .first<Item>();

    if (!item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Check limited edition availability
    if (item.is_limited) {
      const now = new Date().toISOString();

      if (item.stock_remaining !== null && item.stock_remaining <= 0) {
        return new Response(JSON.stringify({ error: 'Item is sold out' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (item.available_from && item.available_from > now) {
        return new Response(JSON.stringify({
          error: 'Item is not yet available',
          availableFrom: item.available_from,
        }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (item.available_until && item.available_until < now) {
        return new Response(JSON.stringify({ error: 'Item is no longer available' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    // Consumables can be bought multiple times, other items only once
    const isConsumable = item.is_consumable === 1;
    const isBundle = item.category === 'bundle';

    if (!isConsumable && !isBundle) {
      // Check if user already owns this item
      const existing = await env.DB
        .prepare(
          `SELECT id FROM user_items
           WHERE user_id = ? AND item_id = ? AND state IN ('owned', 'equipped')`
        )
        .bind(auth.userId, itemId)
        .first();

      if (existing) {
        return new Response(JSON.stringify({ error: 'You already own this item' }), {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    // Get user's current balance
    const profile = await env.DB
      .prepare('SELECT oranges, gems FROM profiles WHERE user_id = ?')
      .bind(auth.userId)
      .first<{ oranges: number; gems: number }>();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Check if user has enough currency
    if (profile.oranges < item.price_oranges) {
      return new Response(JSON.stringify({
        success: false,
        error: 'insufficient_funds',
        required: item.price_oranges,
        current: profile.oranges,
        deficit: item.price_oranges - profile.oranges,
        message: `You need ${item.price_oranges - profile.oranges} more oranges! Play games to earn.`,
        toast: {
          type: 'info',
          title: 'Need More Oranges?',
          message: `You need ${item.price_oranges - profile.oranges} more oranges! Play games to earn.`,
          icon: '🍊',
        },
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Calculate new balance
    const newBalance = profile.oranges - item.price_oranges;
    const statements: D1PreparedStatement[] = [];

    // Deduct oranges from profiles table
    statements.push(
      env.DB.prepare(
        'UPDATE profiles SET oranges = ?, updated_at = datetime("now") WHERE user_id = ?'
      ).bind(newBalance, auth.userId)
    );

    // Also update user_currency table
    statements.push(
      env.DB.prepare(
        'UPDATE user_currency SET oranges = ?, updated_at = datetime("now") WHERE user_id = ?'
      ).bind(newBalance, auth.userId)
    );

    // Handle bundle purchase
    let bundleItemIds: string[] = [];
    if (isBundle && item.bundle_items) {
      bundleItemIds = JSON.parse(item.bundle_items);

      // Add each bundle item to user's inventory
      for (const bundleItemId of bundleItemIds) {
        // Check if user already owns this item
        const existingBundleItem = await env.DB
          .prepare(
            `SELECT id FROM user_items
             WHERE user_id = ? AND item_id = ? AND state IN ('owned', 'equipped')`
          )
          .bind(auth.userId, bundleItemId)
          .first();

        if (!existingBundleItem) {
          statements.push(
            env.DB.prepare(
              `INSERT INTO user_items (user_id, item_id, state, acquisition_type, acquired_at, price_paid)
               VALUES (?, ?, 'owned', 'purchase', datetime("now"), 0)`
            ).bind(auth.userId, bundleItemId)
          );
        }
      }
    } else if (isConsumable) {
      // Add consumable to user_items with uses_remaining
      statements.push(
        env.DB.prepare(
          `INSERT INTO user_items (user_id, item_id, state, acquisition_type, acquired_at, price_paid, uses_remaining)
           VALUES (?, ?, 'owned', 'purchase', datetime("now"), ?, ?)`
        ).bind(auth.userId, itemId, item.price_oranges, item.consumable_quantity || 10)
      );

      // ALSO update user_consumables table (used by voting system)
      // Map item_id to consumable_type
      const consumableType = itemId === 'consumable-donuts-10' ? 'donut' :
                             itemId === 'consumable-poop-10' ? 'poop' : null;

      if (consumableType) {
        statements.push(
          env.DB.prepare(
            `INSERT INTO user_consumables (user_id, consumable_type, quantity, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(user_id, consumable_type)
             DO UPDATE SET quantity = quantity + ?, updated_at = datetime('now')`
          ).bind(auth.userId, consumableType, item.consumable_quantity || 10, item.consumable_quantity || 10)
        );
      }
    } else {
      // Add regular item to user_items
      statements.push(
        env.DB.prepare(
          `INSERT INTO user_items (user_id, item_id, state, acquisition_type, acquired_at, price_paid)
           VALUES (?, ?, 'owned', 'purchase', datetime("now"), ?)`
        ).bind(auth.userId, itemId, item.price_oranges)
      );
    }

    // Decrement stock for limited items
    if (item.is_limited && item.stock_remaining !== null) {
      statements.push(
        env.DB.prepare(
          'UPDATE items SET stock_remaining = stock_remaining - 1 WHERE id = ?'
        ).bind(itemId)
      );
    }

    // Record currency transaction
    statements.push(
      env.DB.prepare(
        `INSERT INTO currency_transactions (user_id, currency_type, amount, balance_after, source, source_details, created_at)
         VALUES (?, 'oranges', ?, ?, 'shop_purchase', ?, datetime("now"))`
      ).bind(auth.userId, -item.price_oranges, newBalance, JSON.stringify({ itemId, itemName: item.name }))
    );

    // Auto-equip: Ensure user_equipment row exists, then update the appropriate slot
    if (!isConsumable && !isBundle) {
      const equipColumn = CATEGORY_TO_EQUIPMENT_COLUMN[item.category];
      if (equipColumn) {
        // Upsert user_equipment row
        statements.push(
          env.DB.prepare(
            `INSERT INTO user_equipment (user_id, ${equipColumn}, updated_at)
             VALUES (?, ?, datetime("now"))
             ON CONFLICT(user_id) DO UPDATE SET ${equipColumn} = ?, updated_at = datetime("now")`
          ).bind(auth.userId, itemId, itemId)
        );

        // Update user_items state to 'equipped'
        statements.push(
          env.DB.prepare(
            `UPDATE user_items SET state = 'equipped'
             WHERE user_id = ? AND item_id = ? AND state = 'owned'`
          ).bind(auth.userId, itemId)
        );

        // Set previous item in this slot back to 'owned'
        statements.push(
          env.DB.prepare(
            `UPDATE user_items SET state = 'owned'
             WHERE user_id = ? AND item_id != ?
             AND item_id IN (SELECT id FROM items WHERE category = ?)
             AND state = 'equipped'`
          ).bind(auth.userId, itemId, item.category)
        );
      }
    }

    // If it's an emoji badge, also add to legacy user_owned_emojis for compatibility
    if (item.category === 'emoji_badge' && item.emoji) {
      statements.push(
        env.DB.prepare(
          'INSERT OR IGNORE INTO user_owned_emojis (user_id, emoji, item_id, acquired_at) VALUES (?, ?, ?, datetime("now"))'
        ).bind(auth.userId, item.emoji, itemId)
      );
    }

    // Execute all statements atomically
    await env.DB.batch(statements);

    return new Response(
      JSON.stringify({
        success: true,
        item: {
          id: item.id,
          name: item.name,
          category: item.category,
          tier: item.tier,
          emoji: item.emoji,
        },
        newBalance,
        autoEquipped: !isConsumable && !isBundle && !!CATEGORY_TO_EQUIPMENT_COLUMN[item.category],
        ...(isBundle ? { bundleItems: bundleItemIds } : {}),
        ...(isConsumable ? {
          consumable: {
            quantity: item.consumable_quantity || 10,
          },
        } : {}),
        toast: {
          type: 'success',
          title: 'Purchase Successful!',
          message: isBundle
            ? `${item.name} bundle has been added to your inventory.`
            : `${item.name} has been added to your inventory${!isConsumable && CATEGORY_TO_EQUIPMENT_COLUMN[item.category] ? ' and equipped.' : '.'}`,
          icon: item.emoji || '🛒',
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Shop Purchase] Error:', error);
    return new Response(JSON.stringify({
      error: 'Purchase failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
