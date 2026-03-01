/**
 * Currency Spend API - POST /api/currency/spend
 *
 * Deducts currency for shop purchases.
 * Validates sufficient balance before deducting.
 *
 */

import { authenticateRequest } from '../../lib/auth';
import { checkBanned, bannedResponse } from '../../lib/ban';

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

interface SpendRequest {
  currency: 'oranges' | 'gems';
  amount: number;
  itemId: string;
  itemType: string; // 'cosmetic', 'continue', 'upgrade', 'voting', etc.
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Check configuration
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

  const userId = auth.userId;
  let body: SpendRequest;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { currency, amount, itemId, itemType } = body;

  // Validate request
  if (!currency || !['oranges', 'gems'].includes(currency)) {
    return new Response(JSON.stringify({ error: 'Invalid currency type' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!amount || amount <= 0 || !itemId) {
    return new Response(JSON.stringify({ error: 'Invalid request - amount and itemId required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Check if banned
    if (await checkBanned(env.DB, userId)) {
      return bannedResponse();
    }

    // Get current balance
    const currentCurrency = await env.DB.prepare(
      'SELECT oranges, gems FROM user_currency WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ oranges: number; gems: number }>();

    if (!currentCurrency) {
      return new Response(JSON.stringify({ error: 'User currency not initialized' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const currentBalance = currency === 'oranges' ? currentCurrency.oranges : currentCurrency.gems;

    // Check sufficient balance
    if (currentBalance < amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient balance',
          required: amount,
          available: currentBalance,
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const newBalance = currentBalance - amount;

    // Deduct currency
    if (currency === 'oranges') {
      await env.DB.prepare(
        `UPDATE user_currency
         SET oranges = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      )
        .bind(newBalance, userId)
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE user_currency
         SET gems = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      )
        .bind(newBalance, userId)
        .run();
    }

    // Log transaction with idempotency key
    const idempotencyKey = `spend_${userId}_${itemId}_${Date.now()}`;
    await env.DB.prepare(
      `INSERT INTO currency_transactions
        (user_id, type, currency, amount, balance_after, source, source_id, metadata, idempotency_key)
       VALUES (?, 'spend', ?, ?, ?, 'shop', ?, ?, ?)`
    )
      .bind(userId, currency, -amount, newBalance, itemId, JSON.stringify({ itemType }), idempotencyKey)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        spent: {
          currency,
          amount,
        },
        newBalance: {
          [currency]: newBalance,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('[Currency Spend] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process purchase' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
