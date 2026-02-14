/**
 * Credit System Status API — /api/credits/status
 *
 * GET — returns health/ops metrics for monitoring and alerting.
 * Use for: uptime checks, cron that verifies worker is ingesting events.
 *
 * Response:
 *   lastEventTimestamp: newest event_timestamp in credit_events
 *   lastFloorSnapshotDate: newest snapshot_date in floor_price_snapshots
 *   eventsLast24h: count of credit_events in last 24 hours
 *   totalEvents: total rows in credit_events
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
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

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19);

    const [latestEvent, latestFloor, count24h, totalEvents] = await Promise.all([
      env.DB.prepare(
        'SELECT event_timestamp AS ts FROM credit_events ORDER BY event_timestamp DESC LIMIT 1'
      ).first<{ ts: string }>(),
      env.DB.prepare(
        'SELECT snapshot_date AS d FROM floor_price_snapshots ORDER BY snapshot_date DESC LIMIT 1'
      ).first<{ d: string }>(),
      env.DB.prepare(
        'SELECT COUNT(*) AS n FROM credit_events WHERE event_timestamp >= ?'
      )
        .bind(since24h)
        .first<{ n: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM credit_events').first<{
        n: number;
      }>(),
    ]);

    const body = {
      lastEventTimestamp: latestEvent?.ts ?? null,
      lastFloorSnapshotDate: latestFloor?.d ?? null,
      eventsLast24h: count24h?.n ?? 0,
      totalEvents: totalEvents?.n ?? 0,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Credits Status] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
