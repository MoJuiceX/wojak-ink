/**
 * Votes Positions API - GET /api/votes/positions
 *
 * Get vote positions for heatmap visualization
 * Query params:
 * - pageType: 'games' | 'gallery' | 'media' | 'shop'
 * - emoji: 'donut' | 'poop'
 * - limit: max number of positions to return (default 200)
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pageType = url.searchParams.get('pageType');
  const emoji = url.searchParams.get('emoji');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);

  if (!pageType) {
    return new Response(JSON.stringify({ error: 'pageType is required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!emoji || (emoji !== 'donut' && emoji !== 'poop')) {
    return new Response(JSON.stringify({ error: 'emoji must be "donut" or "poop"' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT id, target_id, x_percent, y_percent, created_at
      FROM votes
      WHERE page_type = ? AND emoji = ? AND x_percent IS NOT NULL AND y_percent IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(pageType, emoji, limit).all<{
      id: number;
      target_id: string;
      x_percent: number;
      y_percent: number;
      created_at: string;
    }>();

    const votes = (result.results || []).map(row => ({
      id: row.id.toString(),
      targetId: row.target_id,
      xPercent: row.x_percent,
      yPercent: row.y_percent,
      emoji,
      createdAt: new Date(row.created_at).getTime(),
    }));

    return new Response(JSON.stringify({ votes }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Votes Positions API] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};
