/**
 * Credit Audit API — /api/credits/audit-events
 *
 * GET ?since=2026-01-05
 *
 * Returns event_ids from credit_events where event_timestamp >= since.
 * Used by audit-credits-since-date.ts to verify completeness vs MintGarden.
 * Internal/operational use.
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

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
  let since = url.searchParams.get('since') ?? '2020-01-01';
  const full = url.searchParams.get('full') === '1';
  // Ensure YYYY-MM-DD format for SQL
  const match = since.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return new Response(
      JSON.stringify({ error: 'Invalid since parameter. Use YYYY-MM-DD (e.g. 2026-01-05)' }),
      { status: 400, headers: corsHeaders }
    );
  }
  since = match[0];

  try {
    const rows = await env.DB.prepare(
      full
        ? `SELECT event_id, wallet_address, price_xch, credits_earned, floor_at_time, event_timestamp
           FROM credit_events WHERE event_timestamp >= ? ORDER BY event_timestamp ASC`
        : `SELECT event_id FROM credit_events WHERE event_timestamp >= ? ORDER BY event_timestamp ASC`
    )
      .bind(since)
      .all<
        | { event_id: string }
        | { event_id: string; wallet_address: string; price_xch: number; credits_earned: number; floor_at_time: number; event_timestamp: string }
      >();

    const eventIds = (rows.results ?? []).map((r) => r.event_id);

    if (full) {
      const events = (rows.results ?? []).map((r) => {
        const row = r as { event_id: string; wallet_address: string; price_xch: number; credits_earned: number; floor_at_time: number; event_timestamp: string };
        return {
          eventId: row.event_id,
          walletAddress: row.wallet_address,
          priceXch: row.price_xch,
          creditsEarned: row.credits_earned,
          floorAtTime: row.floor_at_time,
          eventTimestamp: row.event_timestamp,
        };
      });
      return new Response(
        JSON.stringify({ since, count: eventIds.length, eventIds, events }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ since, count: eventIds.length, eventIds }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Credits Audit] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
