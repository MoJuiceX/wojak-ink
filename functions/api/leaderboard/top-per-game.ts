/**
 * Global Top Scores Per Game API
 *
 * GET /api/leaderboard/top-per-game - Returns #1 score for each game
 * Ordered by game popularity (donut votes - poop votes)
 */

interface Env {
  DB: D1Database;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Valid game IDs - kept for reference/future validation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VALID_GAME_IDS = [
  'orange-stack',
  'memory-match',
  'orange-pong',
  'wojak-runner',
  'orange-juggle',
  'knife-game',
  'color-reaction',
  'merge-2048',
  'orange-wordle',
  'block-puzzle',
  'flappy-orange',
  'citrus-drop',
  'orange-snake',
  'brick-breaker',
  'wojak-whack',
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Fetch top score for each game with player info and equipped items
    const topScores = await env.DB.prepare(`
      SELECT
        ls.game_id,
        ls.score,
        ls.user_id,
        COALESCE(p.display_name, 'Player') as display_name,
        COALESCE(p.avatar_type, 'emoji') as avatar_type,
        COALESCE(p.avatar_value, '🎮') as avatar_value,
        ue.frame_id,
        ue.title_id,
        ue.name_effect_id
      FROM leaderboard_scores ls
      LEFT JOIN profiles p ON ls.user_id = p.user_id
      LEFT JOIN user_equipped ue ON ls.user_id = ue.user_id
      WHERE ls.score = (
        SELECT MAX(score) FROM leaderboard_scores WHERE game_id = ls.game_id
      )
      GROUP BY ls.game_id
    `).all<{
      game_id: string;
      score: number;
      user_id: string;
      display_name: string;
      avatar_type: string;
      avatar_value: string;
      frame_id: string | null;
      title_id: string | null;
      name_effect_id: string | null;
    }>();

    // Get game popularity from votes (donuts - poops)
    const voteCounts = await env.DB.prepare(`
      SELECT
        target_id as game_id,
        SUM(CASE WHEN emoji = 'donut' THEN 1 ELSE 0 END) as donuts,
        SUM(CASE WHEN emoji = 'poop' THEN 1 ELSE 0 END) as poops
      FROM votes
      WHERE page_type = 'games'
      GROUP BY target_id
    `).all<{ game_id: string; donuts: number; poops: number }>();

    // Create popularity map
    const popularityMap = new Map<string, number>();
    for (const vote of voteCounts.results || []) {
      popularityMap.set(vote.game_id, vote.donuts - vote.poops);
    }

    // Get equipped item IDs (including name_effect now)
    const equippedItemIds = new Set<string>();
    for (const row of topScores.results || []) {
      if (row.frame_id) equippedItemIds.add(row.frame_id);
      if (row.title_id) equippedItemIds.add(row.title_id);
      if (row.name_effect_id) equippedItemIds.add(row.name_effect_id);
    }

    // Fetch item details if there are equipped items
    const itemDetails = new Map<string, { name: string; emoji: string | null; css_class: string | null }>();
    if (equippedItemIds.size > 0) {
      const itemIds = Array.from(equippedItemIds);
      const placeholders = itemIds.map(() => '?').join(',');
      const items = await env.DB.prepare(`
        SELECT id, name, emoji, css_class FROM shop_items WHERE id IN (${placeholders})
      `).bind(...itemIds).all<{ id: string; name: string; emoji: string | null; css_class: string | null }>();

      for (const item of items.results || []) {
        itemDetails.set(item.id, { name: item.name, emoji: item.emoji, css_class: item.css_class });
      }
    }

    const entries = (topScores.results || []).map((row) => ({
      gameId: row.game_id,
      score: row.score,
      userId: row.user_id,
      displayName: row.display_name,
      avatar: {
        type: row.avatar_type,
        value: row.avatar_value,
      },
      equipped: {
        frame: row.frame_id ? itemDetails.get(row.frame_id) : null,
        title: row.title_id ? itemDetails.get(row.title_id) : null,
        nameEffect: row.name_effect_id ? itemDetails.get(row.name_effect_id) : null,
      },
      popularity: popularityMap.get(row.game_id) || 0,
    }));

    // Sort by game popularity (descending)
    entries.sort((a, b) => b.popularity - a.popularity);

    return new Response(JSON.stringify({ topScores: entries }), {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('[Top Per Game API] Error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};
