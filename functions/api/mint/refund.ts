/**
 * Mint Refund API — /api/mint/refund
 *
 * POST - Admin endpoint to mark refunds and record refund transactions
 *
 * Body:
 * {
 *   "action": "mark" | "issue",
 *   "mintId": 123,
 *   "reason": "Payment not confirmed" (for mark),
 *   "txid": "abc123..." (for issue),
 *   "notes": "Manually refunded via Chia wallet" (optional)
 * }
 *
 * Requires: Authorization header with ADMIN_SECRET
 */

import { markRefundNeeded, recordRefundIssued } from './auditHelper';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface RefundBody {
  action: 'mark' | 'issue';
  mintId: number;
  reason?: string;
  txid?: string;
  notes?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Require admin authentication
  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let body: RefundBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!body.mintId || !body.action) {
    return new Response(JSON.stringify({ error: 'Missing required fields: mintId, action' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    if (body.action === 'mark') {
      // Mark mint as needing refund
      if (!body.reason) {
        return new Response(JSON.stringify({ error: 'Reason required for marking refund' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      await markRefundNeeded(env.DB, body.mintId, body.reason);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'marked',
          mintId: body.mintId,
          reason: body.reason,
        }),
        { status: 200, headers: corsHeaders }
      );
    } else if (body.action === 'issue') {
      // Record refund as issued
      if (!body.txid) {
        return new Response(JSON.stringify({ error: 'Transaction ID (txid) required for issuing refund' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      await recordRefundIssued(env.DB, body.mintId, body.txid, body.notes);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'issued',
          mintId: body.mintId,
          txid: body.txid,
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "mark" or "issue"' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    console.error('[Mint Refund] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
