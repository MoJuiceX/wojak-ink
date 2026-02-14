/**
 * Votes Counts API - GET /api/votes/counts
 *
 * Get aggregated vote counts by page type
 * Query params:
 * - pageType: 'games' | 'gallery' | 'media' | 'shop'
 * - targetId: (optional) specific target to get counts for
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
  const targetId = url.searchParams.get('targetId');

  if (!pageType) {
    return new Response(JSON.stringify({ error: 'pageType is required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const counts: Record<string, { donuts: number; poops: number }> = {};

    if (targetId) {
      // Get counts for a specific target
      const result = await env.DB.prepare(`
        SELECT emoji, COUNT(*) as count
        FROM votes
        WHERE page_type = ? AND target_id = ?
        GROUP BY emoji
      `).bind(pageType, targetId).all<{ emoji: string; count: number }>();

      const targetCounts = { donuts: 0, poops: 0 };
      for (const row of result.results || []) {
        if (row.emoji === 'donut') targetCounts.donuts = row.count;
        if (row.emoji === 'poop') targetCounts.poops = row.count;
      }
      counts[targetId] = targetCounts;
    } else {
      // Get counts for all targets of this page type
      const result = await env.DB.prepare(`
        SELECT target_id, emoji, COUNT(*) as count
        FROM votes
        WHERE page_type = ?
        GROUP BY target_id, emoji
      `).bind(pageType).all<{ target_id: string; emoji: string; count: number }>();

      for (const row of result.results || []) {
        if (!counts[row.target_id]) {
          counts[row.target_id] = { donuts: 0, poops: 0 };
        }
        if (row.emoji === 'donut') counts[row.target_id].donuts = row.count;
        if (row.emoji === 'poop') counts[row.target_id].poops = row.count;
      }
    }

    return new Response(JSON.stringify({ counts }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Votes Counts API] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};
