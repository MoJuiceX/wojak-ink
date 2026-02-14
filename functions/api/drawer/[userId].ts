/**
 * Achievement Drawer API - /api/drawer/[userId]
 *
 * GET: Returns public drawer data for a user (shareable link)
 * Reads from unified items and user_equipment tables
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

interface InventoryItem {
  id: string;
  item_id: string;
  name: string;
  category: string;
  tier: string;
  css_class: string | null;
  css_value: string | null;
  emoji: string | null;
  acquired_at: string;
}

// BigPulp dialogue based on collection size
function getBigPulpDialogue(totalItems: number): { text: string; mood: string } {
  if (totalItems >= 50) {
    const dialogues = [
      { text: "You madlad. You actually got them all. 👑", mood: "hype" },
      { text: "This is what PEAK performance looks like.", mood: "sergeant" },
    ];
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  } else if (totalItems >= 20) {
    const dialogues = [
      { text: "ABSOLUTE UNIT. This drawer is STACKED!", mood: "hype" },
      { text: "Look at this flex! Impressive.", mood: "sergeant" },
    ];
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  } else if (totalItems >= 10) {
    const dialogues = [
      { text: "Now we're talking! The Grove recognizes you.", mood: "happy" },
      { text: "Solid collection. You're getting there!", mood: "hype" },
    ];
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  } else {
    const dialogues = [
      { text: "Nice start! Keep grinding, seedling.", mood: "happy" },
      { text: "Everyone starts somewhere. Keep at it!", mood: "chill" },
    ];
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

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

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const userId = params.userId as string;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Get user profile
    const profile = await env.DB
      .prepare('SELECT user_id, display_name FROM profiles WHERE user_id = ?')
      .bind(userId)
      .first<{ user_id: string; display_name: string | null }>();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Get all items in user's inventory from unified table
    const { results: inventory } = await env.DB
      .prepare(
        `SELECT
          ui.id,
          ui.item_id,
          i.name,
          i.category,
          i.tier,
          i.css_class,
          i.css_value,
          i.emoji,
          ui.acquired_at
        FROM user_items ui
        JOIN items i ON ui.item_id = i.id
        WHERE ui.user_id = ? AND ui.state IN ('owned', 'equipped')
        ORDER BY i.category, ui.acquired_at DESC`
      )
      .bind(userId)
      .all<InventoryItem>();

    // Get equipped items from unified user_equipment table
    const equipped = await env.DB
      .prepare(
        `SELECT
          e.*,
          f.css_class as frame_css, f.name as frame_name,
          t.name as title_name,
          ne.css_class as name_effect_css, ne.name as name_effect_name,
          fc.css_value as font_color_css, fc.name as font_color_name,
          fs.css_class as font_style_css, fs.name as font_style_name,
          ff.css_value as font_family_css, ff.name as font_family_name,
          pb.css_class as page_background_css, pb.name as page_background_name,
          ag.css_class as avatar_glow_css, ag.name as avatar_glow_name,
          az.css_class as avatar_size_css, az.name as avatar_size_name,
          bp.css_class as bigpulp_position_css, bp.name as bigpulp_position_name,
          ds.css_class as dialogue_style_css, ds.name as dialogue_style_name,
          cl.css_class as collection_layout_css, cl.name as collection_layout_name,
          cs.css_class as card_style_css, cs.name as card_style_name,
          ea.css_class as entrance_animation_css, ea.name as entrance_animation_name,
          ss.css_class as stats_style_css, ss.name as stats_style_name,
          ts.css_class as tabs_style_css, ts.name as tabs_style_name,
          vc.css_class as visitor_counter_css, vc.name as visitor_counter_name
        FROM user_equipment e
        LEFT JOIN items f ON e.frame_id = f.id
        LEFT JOIN items t ON e.title_id = t.id
        LEFT JOIN items ne ON e.name_effect_id = ne.id
        LEFT JOIN items fc ON e.font_color_id = fc.id
        LEFT JOIN items fs ON e.font_style_id = fs.id
        LEFT JOIN items ff ON e.font_family_id = ff.id
        LEFT JOIN items pb ON e.page_background_id = pb.id
        LEFT JOIN items ag ON e.avatar_glow_id = ag.id
        LEFT JOIN items az ON e.avatar_size_id = az.id
        LEFT JOIN items bp ON e.bigpulp_position_id = bp.id
        LEFT JOIN items ds ON e.dialogue_style_id = ds.id
        LEFT JOIN items cl ON e.collection_layout_id = cl.id
        LEFT JOIN items cs ON e.card_style_id = cs.id
        LEFT JOIN items ea ON e.entrance_animation_id = ea.id
        LEFT JOIN items ss ON e.stats_style_id = ss.id
        LEFT JOIN items ts ON e.tabs_style_id = ts.id
        LEFT JOIN items vc ON e.visitor_counter_id = vc.id
        WHERE e.user_id = ?`
      )
      .bind(userId)
      .first<Record<string, string | null>>();

    // Get owned emojis
    const { results: ownedEmojis } = await env.DB
      .prepare('SELECT emoji FROM user_owned_emojis WHERE user_id = ?')
      .bind(userId)
      .all<{ emoji: string }>();

    // Get emoji ring positions
    const { results: emojiRing } = await env.DB
      .prepare('SELECT position, emoji FROM user_emoji_ring WHERE user_id = ?')
      .bind(userId)
      .all<{ position: string; emoji: string }>();

    // Convert emoji ring to object
    const ringPositions: Record<string, string> = {};
    for (const pos of emojiRing || []) {
      ringPositions[pos.position] = pos.emoji;
    }

    // Get BigPulp state (legacy support)
    const bigpulp = await env.DB
      .prepare('SELECT current_hat, current_mood, current_accessory FROM user_bigpulp WHERE user_id = ?')
      .bind(userId)
      .first<{ current_hat: string | null; current_mood: string; current_accessory: string | null }>();

    // Get total spent
    const spending = await env.DB
      .prepare('SELECT SUM(price_paid) as total FROM user_items WHERE user_id = ?')
      .bind(userId)
      .first<{ total: number | null }>();

    // Group inventory by category
    const byCategory: Record<string, InventoryItem[]> = {};
    for (const item of inventory || []) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    }

    const totalItems = inventory?.length || 0;
    const dialogue = getBigPulpDialogue(totalItems);

    // Build customization object from unified equipment
    const customization = {
      font_color: equipped?.font_color_id || 'font-color-orange',
      font_color_css: equipped?.font_color_css || '#F97316',
      font_style: equipped?.font_style_id || 'font-style-normal',
      font_style_css: equipped?.font_style_css || 'font-style-normal',
      font_family: equipped?.font_family_id || 'font-family-default',
      font_family_css: equipped?.font_family_css || 'system-ui, -apple-system, sans-serif',
      page_background: equipped?.page_background_id || 'bg-midnight-black',
      page_background_css: equipped?.page_background_css || 'drawer-bg-midnight-black',
      avatar_glow: equipped?.avatar_glow_id || 'avatar-glow-none',
      avatar_glow_css: equipped?.avatar_glow_css || '',
      avatar_size: equipped?.avatar_size_id || 'avatar-size-normal',
      avatar_size_css: equipped?.avatar_size_css || 'avatar-size-normal',
      bigpulp_position: equipped?.bigpulp_position_id || 'bigpulp-pos-right',
      bigpulp_position_css: equipped?.bigpulp_position_css || 'bigpulp-right',
      dialogue_style: equipped?.dialogue_style_id || 'dialogue-style-default',
      dialogue_style_css: equipped?.dialogue_style_css || 'dialogue-default',
      collection_layout: equipped?.collection_layout_id || 'layout-grid',
      collection_layout_css: equipped?.collection_layout_css || 'layout-grid',
      card_style: equipped?.card_style_id || 'card-style-default',
      card_style_css: equipped?.card_style_css || 'card-default',
      entrance_animation: equipped?.entrance_animation_id || 'entrance-none',
      entrance_animation_css: equipped?.entrance_animation_css || '',
      stats_style: equipped?.stats_style_id || 'stats-style-default',
      stats_style_css: equipped?.stats_style_css || 'stats-default',
      tabs_style: equipped?.tabs_style_id || 'tabs-style-default',
      tabs_style_css: equipped?.tabs_style_css || 'tabs-default',
      visitor_counter: equipped?.visitor_counter_id || 'visitor-counter-hidden',
      visitor_counter_css: equipped?.visitor_counter_css || '',
    };

    return new Response(
      JSON.stringify({
        userId,
        username: profile.display_name || 'Anonymous',
        totalItems,
        totalSpent: spending?.total || 0,
        emojiRing: ringPositions,
        ownedEmojis: ownedEmojis?.map(e => e.emoji) || [],
        frames: byCategory.frame || [],
        titles: byCategory.title || [],
        nameEffects: byCategory.name_effect || [],
        backgrounds: byCategory.background || [],
        celebrations: byCategory.celebration || [],
        bigpulp: {
          hat: equipped?.bigpulp_hat_id || bigpulp?.current_hat || null,
          mood: equipped?.bigpulp_mood_id || bigpulp?.current_mood || 'happy',
          accessory: equipped?.bigpulp_accessory_id || bigpulp?.current_accessory || null,
        },
        bigpulpItems: {
          hats: byCategory.bigpulp_hat || [],
          moods: byCategory.bigpulp_mood || [],
          accessories: byCategory.bigpulp_accessory || [],
        },
        equipped: {
          frame: equipped?.frame_id ? {
            id: equipped.frame_id,
            name: equipped.frame_name,
            css: equipped.frame_css,
          } : null,
          title: equipped?.title_id ? {
            id: equipped.title_id,
            name: equipped.title_name,
          } : null,
          nameEffect: equipped?.name_effect_id ? {
            id: equipped.name_effect_id,
            name: equipped.name_effect_name,
            css: equipped.name_effect_css,
          } : null,
        },
        bigpulpComment: dialogue.text,
        bigpulpMood: dialogue.mood,
        customization,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Drawer] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
