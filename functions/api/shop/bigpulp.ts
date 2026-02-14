/**
 * BigPulp API - /api/shop/bigpulp
 *
 * GET: Returns BigPulp state for authenticated user
 * POST: Equip BigPulp hat, mood, or accessory
 * Body: { slot: 'hat' | 'mood' | 'accessory', itemId: string | null }
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

type BigPulpSlot = 'hat' | 'mood' | 'accessory';

const SLOT_TO_CATEGORY: Record<BigPulpSlot, string> = {
  hat: 'bigpulp_hat',
  mood: 'bigpulp_mood',
  accessory: 'bigpulp_accessory',
};

const SLOT_TO_COLUMN: Record<BigPulpSlot, string> = {
  hat: 'current_hat',
  mood: 'current_mood',
  accessory: 'current_accessory',
};

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

  // GET: Return current BigPulp state
  if (request.method === 'GET') {
    try {
      // Get BigPulp state
      const bigpulp = await env.DB
        .prepare('SELECT current_hat, current_mood, current_accessory FROM user_bigpulp WHERE user_id = ?')
        .bind(auth.userId)
        .first<{ current_hat: string | null; current_mood: string; current_accessory: string | null }>();

      // Get unlocked items by category
      const { results: inventory } = await env.DB
        .prepare(
          `SELECT si.id, si.name, si.category
           FROM user_inventory ui
           JOIN shop_items si ON ui.item_id = si.id
           WHERE ui.user_id = ? AND si.category IN ('bigpulp_hat', 'bigpulp_mood', 'bigpulp_accessory')
           ORDER BY si.category, si.sort_order`
        )
        .bind(auth.userId)
        .all<{ id: string; name: string; category: string }>();

      // Group by category
      const unlockedHats = inventory?.filter(i => i.category === 'bigpulp_hat').map(i => ({ id: i.id, name: i.name })) || [];
      const unlockedMoods = inventory?.filter(i => i.category === 'bigpulp_mood').map(i => ({ id: i.id, name: i.name })) || [];
      const unlockedAccessories = inventory?.filter(i => i.category === 'bigpulp_accessory').map(i => ({ id: i.id, name: i.name })) || [];

      return new Response(
        JSON.stringify({
          hat: bigpulp?.current_hat || null,
          mood: bigpulp?.current_mood || 'happy',
          accessory: bigpulp?.current_accessory || null,
          unlockedHats,
          unlockedMoods,
          unlockedAccessories,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error('[BigPulp GET] Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  // POST: Equip BigPulp item
  if (request.method === 'POST') {
    try {
      const body = await request.json() as { slot: BigPulpSlot; itemId: string | null };
      const { slot, itemId } = body;

      // Validate slot
      if (!slot || !SLOT_TO_COLUMN[slot]) {
        return new Response(JSON.stringify({ error: 'Invalid slot. Use: hat, mood, accessory' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // If equipping (not unequipping), verify user owns the item
      if (itemId !== null) {
        const owned = await env.DB
          .prepare(
            `SELECT ui.id
             FROM user_inventory ui
             JOIN shop_items si ON ui.item_id = si.id
             WHERE ui.user_id = ? AND ui.item_id = ? AND si.category = ?`
          )
          .bind(auth.userId, itemId, SLOT_TO_CATEGORY[slot])
          .first();

        if (!owned) {
          return new Response(JSON.stringify({ error: 'You do not own this item or it does not match the slot' }), {
            status: 400,
            headers: corsHeaders,
          });
        }
      }

      // Ensure user_bigpulp row exists
      await env.DB
        .prepare(
          `INSERT INTO user_bigpulp (user_id, current_mood, updated_at)
           VALUES (?, 'happy', datetime("now"))
           ON CONFLICT(user_id) DO NOTHING`
        )
        .bind(auth.userId)
        .run();

      // Update the equipped item
      const column = SLOT_TO_COLUMN[slot];
      await env.DB
        .prepare(
          `UPDATE user_bigpulp
           SET ${column} = ?, updated_at = datetime("now")
           WHERE user_id = ?`
        )
        .bind(itemId, auth.userId)
        .run();

      // Get updated BigPulp state
      const bigpulp = await env.DB
        .prepare('SELECT current_hat, current_mood, current_accessory FROM user_bigpulp WHERE user_id = ?')
        .bind(auth.userId)
        .first();

      return new Response(
        JSON.stringify({
          success: true,
          slot,
          itemId,
          bigpulp,
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error('[BigPulp POST] Error:', error);
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
