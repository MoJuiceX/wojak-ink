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
  'Access-Control-Allow-Origin': 'https://wojak.ink',
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
    // Step 1: Fetch credit events (fast — indexed on wallet_address)
    const rows = await env.DB.prepare(
      `SELECT event_id, nft_id, price_xch, credits_earned,
              whale_multiplier, event_type, event_timestamp
       FROM credit_events
       WHERE wallet_address = ?
       ORDER BY event_timestamp DESC
       LIMIT ?`
    )
      .bind(wallet, limit)
      .all<Omit<CreditEventRow, 'nft_name' | 'mg_nft_id'>>();

    const events = rows.results || [];

    // Step 2: Resolve NFT names with targeted lookups (avoid full-table window scans)
    // Collect edition IDs and coin IDs separately
    const editionIds: number[] = [];
    const coinIds: string[] = [];
    for (const e of events) {
      if (e.nft_id.startsWith('nft_edition_')) {
        editionIds.push(parseInt(e.nft_id.substring(12), 10));
      } else if (!e.nft_id.startsWith('holder_')) {
        coinIds.push(e.nft_id);
      }
    }

    // Lookup maps
    const nameMap = new Map<string, { nftName: string | null; mgNftId: string | null }>();

    // Resolve edition-based IDs
    if (editionIds.length > 0) {
      const placeholders = editionIds.map(() => '?').join(',');
      const editionRows = await env.DB.prepare(
        `SELECT nft_edition, nft_name, mg_event_id
         FROM sales_history
         WHERE nft_edition IN (${placeholders})
         ORDER BY id DESC`
      )
        .bind(...editionIds)
        .all<{ nft_edition: number; nft_name: string | null; mg_event_id: string | null }>();

      for (const r of editionRows.results || []) {
        const key = `nft_edition_${r.nft_edition}`;
        if (!nameMap.has(key)) {
          const mgNftId = r.mg_event_id
            ? r.mg_event_id.substring(0, r.mg_event_id.indexOf('_'))
            : null;
          nameMap.set(key, { nftName: r.nft_name, mgNftId });
        }
      }
    }

    // Resolve coin-based IDs
    if (coinIds.length > 0) {
      // Batch lookup: find sales_history rows where mg_event_id starts with any coin ID
      const placeholders = coinIds.map(() => '?').join(',');
      const coinRows = await env.DB.prepare(
        `SELECT nft_name, mg_event_id
         FROM sales_history
         WHERE mg_event_id IS NOT NULL
           AND SUBSTR(mg_event_id, 1, INSTR(mg_event_id, '_') - 1) IN (${placeholders})
         ORDER BY id DESC`
      )
        .bind(...coinIds)
        .all<{ nft_name: string | null; mg_event_id: string | null }>();

      for (const r of coinRows.results || []) {
        if (!r.mg_event_id) continue;
        const coinId = r.mg_event_id.substring(0, r.mg_event_id.indexOf('_'));
        if (!nameMap.has(coinId)) {
          nameMap.set(coinId, { nftName: r.nft_name, mgNftId: coinId });
        }
      }
    }

    const items = events.map((r) => {
      const lookup = nameMap.get(r.nft_id);
      let resolvedNftId = r.nft_id;
      if (r.nft_id.startsWith('nft_edition_') && lookup?.mgNftId) {
        resolvedNftId = lookup.mgNftId;
      }

      return {
        eventId: r.event_id,
        nftId: resolvedNftId,
        priceXch: r.price_xch,
        creditsEarned: r.credits_earned / 100,
        whaleMultiplier: r.whale_multiplier / 10000,
        eventType: r.event_type || 'trade',
        eventTimestamp: r.event_timestamp,
        nftName: lookup?.nftName || null,
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
