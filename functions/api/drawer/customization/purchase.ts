/**
 * Customization Purchase API
 * POST /api/drawer/customization/purchase
 *
 * Purchase a customization item with oranges.
 */

import { authenticateRequest } from '../../../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

interface PurchaseRequest {
  category: string;
  itemId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = auth.userId;
    const { category, itemId } = await context.request.json() as PurchaseRequest;

    if (!category || !itemId) {
      return new Response(JSON.stringify({ error: 'Missing category or itemId' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get item from catalog
    const item = await context.env.DB.prepare(`
      SELECT id, category, name, price_oranges
      FROM customization_catalog
      WHERE id = ? AND category = ? AND is_active = 1
    `).bind(itemId, category).first<{
      id: string;
      category: string;
      name: string;
      price_oranges: number;
    }>();

    if (!item) {
      return new Response(JSON.stringify({ error: 'Item not found', category, itemId }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Check if already owned
    const existing = await context.env.DB.prepare(`
      SELECT id FROM user_customization_items
      WHERE user_id = ? AND category = ? AND item_id = ?
    `).bind(userId, category, itemId).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Already owned' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Free items don't need currency check
    if (item.price_oranges === 0) {
      await context.env.DB.prepare(`
        INSERT INTO user_customization_items (user_id, category, item_id)
        VALUES (?, ?, ?)
      `).bind(userId, category, itemId).run();

      return new Response(JSON.stringify({
        success: true,
        item: item.name,
        price: 0,
      }), {
        headers: corsHeaders,
      });
    }

    // Get user's balance
    const currency = await context.env.DB.prepare(`
      SELECT oranges FROM user_currency WHERE user_id = ?
    `).bind(userId).first<{ oranges: number }>();

    const balance = currency?.oranges || 0;

    if (balance < item.price_oranges) {
      return new Response(JSON.stringify({
        error: 'Insufficient oranges',
        required: item.price_oranges,
        balance,
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Process purchase - deduct oranges and add item
    const newBalance = balance - item.price_oranges;

    await context.env.DB.batch([
      // Update user_currency
      context.env.DB.prepare(`
        UPDATE user_currency
        SET oranges = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(newBalance, userId),

      // Also update profiles table for consistency
      context.env.DB.prepare(`
        UPDATE profiles
        SET oranges = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(newBalance, userId),

      context.env.DB.prepare(`
        INSERT INTO user_customization_items (user_id, category, item_id)
        VALUES (?, ?, ?)
      `).bind(userId, category, itemId),

      // Track in currency transactions (purchase_history has FK constraint to shop_items)
      context.env.DB.prepare(`
        INSERT INTO currency_transactions (user_id, currency_type, amount, balance_after, source, source_details, created_at)
        VALUES (?, 'oranges', ?, ?, 'drawer_customization', ?, datetime('now'))
      `).bind(userId, -item.price_oranges, newBalance, JSON.stringify({ category, itemId, itemName: item.name })),
    ]);

    // Get new balance
    const newCurrency = await context.env.DB.prepare(`
      SELECT oranges, gems FROM user_currency WHERE user_id = ?
    `).bind(userId).first<{ oranges: number; gems: number }>();

    return new Response(JSON.stringify({
      success: true,
      item: item.name,
      price: item.price_oranges,
      newBalance: {
        oranges: newCurrency?.oranges || 0,
        gems: newCurrency?.gems || 0,
      },
    }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Customization Purchase] Error:', error);
    return new Response(JSON.stringify({
      error: 'Purchase failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
