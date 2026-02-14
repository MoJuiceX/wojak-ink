/**
 * User Display API - /api/shop/display
 *
 * GET: Returns all equipped cosmetics for rendering (used everywhere)
 * Query: ?userId=xxx (optional - defaults to authenticated user)
 *
 * Returns equipped items from unified user_equipment table
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

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

  // Get userId from query param or authentication
  const url = new URL(request.url);
  let userId = url.searchParams.get('userId');

  // If no userId in query, try to authenticate
  if (!userId && env.CLERK_DOMAIN) {
    const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
    if (auth) {
      userId = auth.userId;
    }
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required (query param or authentication)' }), {
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

    // Default response for non-existent users
    const defaultResponse = {
      userId,
      username: 'Anonymous',
      emojiRing: {},
      frame: null,
      title: null,
      nameEffect: null,
      background: null,
      celebration: null,
      bigpulp: { hat: null, mood: 'happy', accessory: null },
      drawer: {
        fontColor: { id: 'font-color-orange', css: '#F97316' },
        fontStyle: { id: 'font-style-normal', css: 'font-style-normal' },
        fontFamily: { id: 'font-family-default', css: 'system-ui, -apple-system, sans-serif' },
        pageBackground: { id: 'bg-midnight-black', css: 'drawer-bg-midnight-black' },
        avatarGlow: { id: 'avatar-glow-none', css: '' },
        avatarSize: { id: 'avatar-size-normal', css: 'avatar-size-normal' },
        bigpulpPosition: { id: 'bigpulp-pos-right', css: 'bigpulp-right' },
        dialogueStyle: { id: 'dialogue-style-default', css: 'dialogue-default' },
        collectionLayout: { id: 'layout-grid', css: 'layout-grid' },
        cardStyle: { id: 'card-style-default', css: 'card-default' },
        entranceAnimation: { id: 'entrance-none', css: '' },
        statsStyle: { id: 'stats-style-default', css: 'stats-default' },
        tabsStyle: { id: 'tabs-style-default', css: 'tabs-default' },
        visitorCounter: { id: 'visitor-counter-hidden', css: '' },
      },
    };

    if (!profile) {
      return new Response(JSON.stringify(defaultResponse), { status: 200, headers: corsHeaders });
    }

    // Get equipped items from user_equipment with item details
    const equipped = await env.DB
      .prepare(
        `SELECT
          e.*,
          f.css_class as frame_css, f.name as frame_name,
          t.name as title_name,
          ne.css_class as name_effect_css, ne.name as name_effect_name,
          bg.css_class as background_css, bg.name as background_name,
          c.css_class as celebration_css, c.name as celebration_name,
          bh.name as bigpulp_hat_name,
          bm.name as bigpulp_mood_name,
          ba.name as bigpulp_accessory_name,
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
        LEFT JOIN items bg ON e.background_id = bg.id
        LEFT JOIN items c ON e.celebration_id = c.id
        LEFT JOIN items bh ON e.bigpulp_hat_id = bh.id
        LEFT JOIN items bm ON e.bigpulp_mood_id = bm.id
        LEFT JOIN items ba ON e.bigpulp_accessory_id = ba.id
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

    // Build response
    const response = {
      userId,
      username: profile.display_name || 'Anonymous',
      emojiRing: ringPositions,
      frame: equipped?.frame_id ? {
        id: equipped.frame_id,
        css: equipped.frame_css,
        name: equipped.frame_name,
      } : null,
      title: equipped?.title_id ? {
        id: equipped.title_id,
        name: equipped.title_name,
      } : null,
      nameEffect: equipped?.name_effect_id ? {
        id: equipped.name_effect_id,
        css: equipped.name_effect_css,
        name: equipped.name_effect_name,
      } : null,
      background: equipped?.background_id ? {
        id: equipped.background_id,
        css: equipped.background_css,
        name: equipped.background_name,
      } : null,
      celebration: equipped?.celebration_id ? {
        id: equipped.celebration_id,
        css: equipped.celebration_css,
        name: equipped.celebration_name,
      } : null,
      bigpulp: {
        hat: equipped?.bigpulp_hat_id || bigpulp?.current_hat || null,
        mood: equipped?.bigpulp_mood_id || bigpulp?.current_mood || 'happy',
        accessory: equipped?.bigpulp_accessory_id || bigpulp?.current_accessory || null,
      },
      // Drawer customization
      drawer: {
        fontColor: {
          id: equipped?.font_color_id || 'font-color-orange',
          css: equipped?.font_color_css || '#F97316',
          name: equipped?.font_color_name || 'Tang Orange',
        },
        fontStyle: {
          id: equipped?.font_style_id || 'font-style-normal',
          css: equipped?.font_style_css || 'font-style-normal',
          name: equipped?.font_style_name || 'Normal',
        },
        fontFamily: {
          id: equipped?.font_family_id || 'font-family-default',
          css: equipped?.font_family_css || 'system-ui, -apple-system, sans-serif',
          name: equipped?.font_family_name || 'Default',
        },
        pageBackground: {
          id: equipped?.page_background_id || 'bg-midnight-black',
          css: equipped?.page_background_css || 'drawer-bg-midnight-black',
          name: equipped?.page_background_name || 'Midnight Black',
        },
        avatarGlow: {
          id: equipped?.avatar_glow_id || 'avatar-glow-none',
          css: equipped?.avatar_glow_css || '',
          name: equipped?.avatar_glow_name || 'None',
        },
        avatarSize: {
          id: equipped?.avatar_size_id || 'avatar-size-normal',
          css: equipped?.avatar_size_css || 'avatar-size-normal',
          name: equipped?.avatar_size_name || 'Normal',
        },
        bigpulpPosition: {
          id: equipped?.bigpulp_position_id || 'bigpulp-pos-right',
          css: equipped?.bigpulp_position_css || 'bigpulp-right',
          name: equipped?.bigpulp_position_name || 'Right',
        },
        dialogueStyle: {
          id: equipped?.dialogue_style_id || 'dialogue-style-default',
          css: equipped?.dialogue_style_css || 'dialogue-default',
          name: equipped?.dialogue_style_name || 'Default',
        },
        collectionLayout: {
          id: equipped?.collection_layout_id || 'layout-grid',
          css: equipped?.collection_layout_css || 'layout-grid',
          name: equipped?.collection_layout_name || 'Grid',
        },
        cardStyle: {
          id: equipped?.card_style_id || 'card-style-default',
          css: equipped?.card_style_css || 'card-default',
          name: equipped?.card_style_name || 'Default',
        },
        entranceAnimation: {
          id: equipped?.entrance_animation_id || 'entrance-none',
          css: equipped?.entrance_animation_css || '',
          name: equipped?.entrance_animation_name || 'None',
        },
        statsStyle: {
          id: equipped?.stats_style_id || 'stats-style-default',
          css: equipped?.stats_style_css || 'stats-default',
          name: equipped?.stats_style_name || 'Default',
        },
        tabsStyle: {
          id: equipped?.tabs_style_id || 'tabs-style-default',
          css: equipped?.tabs_style_css || 'tabs-default',
          name: equipped?.tabs_style_name || 'Default',
        },
        visitorCounter: {
          id: equipped?.visitor_counter_id || 'visitor-counter-hidden',
          css: equipped?.visitor_counter_css || '',
          name: equipped?.visitor_counter_name || 'Hidden',
        },
      },
    };

    return new Response(JSON.stringify(response), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[Shop Display] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
