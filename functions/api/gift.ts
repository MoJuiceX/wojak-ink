/**
 * Gift API - /api/gift
 *
 * POST: Send a gift to a friend
 * Body: {
 *   recipientId: string,
 *   type: 'item' | 'oranges' | 'gems',
 *   itemId?: string,    // Required if type = 'item'
 *   amount?: number,    // Required if type = 'oranges' or 'gems'
 *   message?: string    // Optional gift message
 * }
 *
 * Rules:
 * - Friends-only (must be friends with recipient)
 * - Items are transferred (sender loses item)
 * - Currency is transferred atomically
 */

import { authenticateRequest } from '../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface GiftRequest {
  recipientId: string;
  type: 'item' | 'oranges' | 'gems';
  itemId?: string;
  amount?: number;
  message?: string;
}

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
    const body = await request.json() as GiftRequest;
    const { recipientId, type, itemId, amount, message } = body;

    // Validate required fields
    if (!recipientId) {
      return new Response(JSON.stringify({ error: 'recipientId is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!type || !['item', 'oranges', 'gems'].includes(type)) {
      return new Response(JSON.stringify({ error: 'type must be "item", "oranges", or "gems"' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (type === 'item' && !itemId) {
      return new Response(JSON.stringify({ error: 'itemId is required for item gifts' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if ((type === 'oranges' || type === 'gems') && (!amount || amount <= 0)) {
      return new Response(JSON.stringify({ error: 'amount must be a positive number for currency gifts' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Cannot gift to yourself
    if (recipientId === auth.userId) {
      return new Response(JSON.stringify({ error: 'Cannot gift to yourself' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify recipient exists
    const recipient = await env.DB
      .prepare('SELECT user_id, display_name FROM profiles WHERE user_id = ?')
      .bind(recipientId)
      .first<{ user_id: string; display_name: string | null }>();

    if (!recipient) {
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Verify friendship (friends-only gifting)
    const friendship = await env.DB
      .prepare(
        `SELECT id FROM friends
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
         AND status = 'accepted'`
      )
      .bind(auth.userId, recipientId, recipientId, auth.userId)
      .first();

    if (!friendship) {
      return new Response(JSON.stringify({ error: 'You can only gift to friends' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const statements: D1PreparedStatement[] = [];
    let giftDescription = '';

    if (type === 'item') {
      // Verify sender owns the item
      const ownedItem = await env.DB
        .prepare(
          `SELECT ui.id, ui.item_id, i.name, i.price_oranges
           FROM user_items ui
           JOIN items i ON ui.item_id = i.id
           WHERE ui.user_id = ? AND ui.item_id = ? AND ui.state = 'owned'`
        )
        .bind(auth.userId, itemId)
        .first<{ id: number; item_id: string; name: string; price_oranges: number }>();

      if (!ownedItem) {
        return new Response(JSON.stringify({ error: 'You do not own this item or it is equipped' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      giftDescription = ownedItem.name;

      // Mark item as gifted in sender's inventory
      statements.push(
        env.DB.prepare(
          `UPDATE user_items SET state = 'gifted', gifted_to = ?, gifted_at = datetime("now")
           WHERE id = ?`
        ).bind(recipientId, ownedItem.id)
      );

      // Add item to recipient's inventory
      statements.push(
        env.DB.prepare(
          `INSERT INTO user_items (user_id, item_id, state, acquisition_type, acquired_from, acquired_at, price_paid)
           VALUES (?, ?, 'owned', 'gift', ?, datetime("now"), 0)`
        ).bind(recipientId, itemId, auth.userId)
      );

      // Update sender's gift stats
      statements.push(
        env.DB.prepare(
          `INSERT INTO user_gift_stats (user_id, total_items_gifted, updated_at)
           VALUES (?, 1, datetime("now"))
           ON CONFLICT(user_id) DO UPDATE SET total_items_gifted = total_items_gifted + 1, updated_at = datetime("now")`
        ).bind(auth.userId)
      );

      // Record gift history
      statements.push(
        env.DB.prepare(
          `INSERT INTO gift_history (sender_id, recipient_id, gift_type, item_id, message, created_at)
           VALUES (?, ?, 'item', ?, ?, datetime("now"))`
        ).bind(auth.userId, recipientId, itemId, message || null)
      );
    } else {
      // Currency gift (oranges or gems)
      const currencyField = type === 'oranges' ? 'oranges' : 'gems';
      const giftAmount = amount!;
      giftDescription = `${giftAmount} ${type === 'oranges' ? '🍊' : '💎'}`;

      // Check sender balance
      const senderProfile = await env.DB
        .prepare(`SELECT ${currencyField} FROM profiles WHERE user_id = ?`)
        .bind(auth.userId)
        .first<{ oranges?: number; gems?: number }>();

      const senderBalance = type === 'oranges'
        ? senderProfile?.oranges || 0
        : senderProfile?.gems || 0;

      if (senderBalance < giftAmount) {
        return new Response(JSON.stringify({
          error: `Insufficient ${type}`,
          required: giftAmount,
          current: senderBalance,
        }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Deduct from sender
      statements.push(
        env.DB.prepare(
          `UPDATE profiles SET ${currencyField} = ${currencyField} - ?, updated_at = datetime("now")
           WHERE user_id = ?`
        ).bind(giftAmount, auth.userId)
      );

      // Also update user_currency table
      statements.push(
        env.DB.prepare(
          `UPDATE user_currency SET ${currencyField} = ${currencyField} - ?, updated_at = datetime("now")
           WHERE user_id = ?`
        ).bind(giftAmount, auth.userId)
      );

      // Add to recipient
      statements.push(
        env.DB.prepare(
          `UPDATE profiles SET ${currencyField} = ${currencyField} + ?, updated_at = datetime("now")
           WHERE user_id = ?`
        ).bind(giftAmount, recipientId)
      );

      // Also update recipient's user_currency table
      statements.push(
        env.DB.prepare(
          `INSERT INTO user_currency (user_id, ${currencyField}, updated_at)
           VALUES (?, ?, datetime("now"))
           ON CONFLICT(user_id) DO UPDATE SET ${currencyField} = ${currencyField} + ?, updated_at = datetime("now")`
        ).bind(recipientId, giftAmount, giftAmount)
      );

      // Update sender's gift stats
      const statsField = type === 'oranges' ? 'total_oranges_gifted' : 'total_gems_gifted';
      statements.push(
        env.DB.prepare(
          `INSERT INTO user_gift_stats (user_id, ${statsField}, updated_at)
           VALUES (?, ?, datetime("now"))
           ON CONFLICT(user_id) DO UPDATE SET ${statsField} = ${statsField} + ?, updated_at = datetime("now")`
        ).bind(auth.userId, giftAmount, giftAmount)
      );

      // Record currency transactions
      statements.push(
        env.DB.prepare(
          `INSERT INTO currency_transactions (user_id, currency_type, amount, balance_after, source, source_details, created_at)
           VALUES (?, ?, ?, ?, 'gift_sent', ?, datetime("now"))`
        ).bind(auth.userId, type, -giftAmount, senderBalance - giftAmount, JSON.stringify({ to: recipientId }))
      );

      // Record gift history
      statements.push(
        env.DB.prepare(
          `INSERT INTO gift_history (sender_id, recipient_id, gift_type, amount, message, created_at)
           VALUES (?, ?, ?, ?, ?, datetime("now"))`
        ).bind(auth.userId, recipientId, type, giftAmount, message || null)
      );
    }

    // Execute all statements atomically
    await env.DB.batch(statements);

    return new Response(
      JSON.stringify({
        success: true,
        gift: {
          type,
          itemId: type === 'item' ? itemId : undefined,
          amount: type !== 'item' ? amount : undefined,
          recipientId,
          recipientName: recipient.display_name || 'Anonymous',
        },
        toast: {
          type: 'success',
          title: 'Gift Sent!',
          message: `You sent ${giftDescription} to ${recipient.display_name || 'your friend'}!`,
          icon: '🎁',
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Gift] Error:', error);
    return new Response(JSON.stringify({
      error: 'Gift failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
