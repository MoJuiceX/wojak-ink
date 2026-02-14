/**
 * Credit History API — /api/credits/history
 *
 * GET ?wallet=xch1...&limit=50
 *
 * Returns credit earning history for a wallet (earned events only).
 * No auth required — wallet-based.
 */

import { isValidChiaAddress } from '../../lib/validation';

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

interface CreditEventRow {
  event_id: string;
  nft_id: string;
  price_xch: number;
  credits_earned: number;
  whale_multiplier: number;
  event_timestamp: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

  if (!wallet || !isValidChiaAddress(wallet)) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid wallet parameter. Expected xch1... address.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT event_id, nft_id, price_xch, credits_earned, whale_multiplier, event_timestamp
       FROM credit_events
       WHERE wallet_address = ?
       ORDER BY event_timestamp DESC
       LIMIT ?`
    )
      .bind(wallet, limit)
      .all<CreditEventRow>();

    const items = (rows.results || []).map((r) => ({
      eventId: r.event_id,
      nftId: r.nft_id,
      priceXch: r.price_xch,
      creditsEarned: r.credits_earned / 100,
      whaleMultiplier: r.whale_multiplier / 10000,
      eventTimestamp: r.event_timestamp,
    }));

    return new Response(JSON.stringify({ wallet, items }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Credits History] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
