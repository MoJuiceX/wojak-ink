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
  event_type: string | null;
  event_timestamp: string;
  nft_name: string | null;
  mg_nft_id: string | null;
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
      `SELECT ce.event_id, ce.nft_id, ce.price_xch, ce.credits_earned,
              ce.whale_multiplier, ce.event_type, ce.event_timestamp,
              sh.nft_name,
              CASE
                WHEN sh.mg_event_id IS NOT NULL
                THEN SUBSTR(sh.mg_event_id, 1, INSTR(sh.mg_event_id, '_') - 1)
                ELSE NULL
              END AS mg_nft_id
       FROM credit_events ce
       LEFT JOIN sales_history sh
         ON ce.nft_id LIKE 'nft_edition_%'
         AND sh.nft_edition = CAST(SUBSTR(ce.nft_id, 13) AS INTEGER)
       WHERE ce.wallet_address = ?
       ORDER BY ce.event_timestamp DESC
       LIMIT ?`
    )
      .bind(wallet, limit)
      .all<CreditEventRow>();

    const items = (rows.results || []).map((r) => {
      // Resolve the best MintGarden-compatible NFT ID:
      // 1. For hex coin IDs (from MintGarden XCH trades): use nft_id directly
      // 2. For nft_edition_XXXX: extract coin ID from mg_event_id
      // 3. For holder_airdrop: no NFT ID
      let resolvedNftId = r.nft_id;
      if (r.mg_nft_id && r.nft_id.startsWith('nft_edition_')) {
        resolvedNftId = r.mg_nft_id;
      }

      return {
        eventId: r.event_id,
        nftId: resolvedNftId,
        priceXch: r.price_xch,
        creditsEarned: r.credits_earned / 100,
        whaleMultiplier: r.whale_multiplier / 10000,
        eventType: r.event_type || 'trade',
        eventTimestamp: r.event_timestamp,
        nftName: r.nft_name || null,
      };
    });

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
