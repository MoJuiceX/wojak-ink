/**
 * Currency Transactions API - /api/currency/transactions
 *
 * GET: Returns the authenticated user's transaction history
 *
 * Query params:
 *   limit?: number (default 50, max 100)
 *   offset?: number (default 0)
 *   currency?: 'oranges' | 'gems' | 'all' (default 'all')
 *   type?: 'earn' | 'spend' | 'all' (default 'all')
 *
 * Response: {
 *   transactions: [{
 *     id: number,
 *     currencyType: 'oranges' | 'gems',
 *     amount: number,
 *     balanceAfter: number,
 *     source: string,
 *     sourceDetails: object | null,
 *     isGifted: boolean,
 *     createdAt: string
 *   }],
 *   total: number,
 *   hasMore: boolean
 * }
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

interface Transaction {
  id: number;
  currencyType: 'oranges' | 'gems';
  amount: number;
  balanceAfter: number;
  source: string;
  sourceDetails: Record<string, unknown> | null;
  isGifted: boolean;
  createdAt: string;
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

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const currency = url.searchParams.get('currency') || 'all';
    const type = url.searchParams.get('type') || 'all';

    // Build query conditions
    const conditions: string[] = ['user_id = ?'];
    const params: (string | number)[] = [auth.userId];

    if (currency !== 'all' && ['oranges', 'gems'].includes(currency)) {
      conditions.push('currency_type = ?');
      params.push(currency);
    }

    if (type === 'earn') {
      conditions.push('amount > 0');
    } else if (type === 'spend') {
      conditions.push('amount < 0');
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await env.DB
      .prepare(`SELECT COUNT(*) as count FROM currency_transactions WHERE ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Get transactions
    const results = await env.DB
      .prepare(
        `SELECT
          id,
          currency_type,
          amount,
          balance_after,
          source,
          source_details,
          is_gifted,
          created_at
        FROM currency_transactions
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset)
      .all<{
        id: number;
        currency_type: string;
        amount: number;
        balance_after: number;
        source: string;
        source_details: string | null;
        is_gifted: number;
        created_at: string;
      }>();

    const transactions: Transaction[] = (results.results || []).map((row) => ({
      id: row.id,
      currencyType: row.currency_type as 'oranges' | 'gems',
      amount: row.amount,
      balanceAfter: row.balance_after,
      source: row.source,
      sourceDetails: row.source_details ? JSON.parse(row.source_details) : null,
      isGifted: Boolean(row.is_gifted),
      createdAt: row.created_at,
    }));

    return new Response(
      JSON.stringify({
        transactions,
        total,
        hasMore: offset + transactions.length < total,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Currency Transactions] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
