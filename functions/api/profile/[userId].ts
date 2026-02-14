/**
 * Unified Profile API (SPEC 15)
 *
 * GET /api/profile/:userId - Fetch comprehensive profile data for unified profile page
 *
 * Returns:
 * - User basics (name, bio, title, socials)
 * - Avatar and customization settings
 * - Overview stats (level, items, achievements, streak, rank)
 * - Detailed stats for Stats tab
 * - Collection items for Collection tab
 * - Achievements and progress for Achievements tab
 * - Featured items, activities, game scores for Overview tab
 */

interface Env {
  DB: D1Database;
}

// Game ID to name mapping
const GAME_NAMES: Record<string, string> = {
  'flappy-orange': 'Flappy Orange',
  'orange-stack': 'Orange Stack',
  'memory-match': 'Memory Match',
  'orange-pong': 'Orange Pong',
  'wojak-runner': 'Wojak Runner',
  'orange-juggle': 'Orange Juggle',
  'knife-game': 'Knife Game',
  'block-puzzle': 'Block Puzzle',
  'citrus-drop': 'Citrus Drop',
  'orange-snake': 'Orange Snake',
  'brick-breaker': 'Brick Breaker',
  'wojak-whack': 'Wojak Whack',
  'color-reaction': 'Color Reaction',
  'merge-2048': 'Wojak Merge',
  'orange-wordle': 'Orange Wordle',
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const userId = params.userId as string;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Fetch basic profile
    const profile = await env.DB.prepare(`
      SELECT
        p.user_id,
        p.display_name,
        p.x_handle,
        p.wallet_address,
        p.avatar_type,
        p.avatar_value,
        p.avatar_source,
        p.avatar_nft_id,
        p.owned_nft_ids,
        p.current_streak,
        p.longest_streak,
        p.updated_at,
        u.created_at
      FROM profiles p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `).bind(userId).first<{
      user_id: string;
      display_name: string | null;
      x_handle: string | null;
      wallet_address: string | null;
      avatar_type: string | null;
      avatar_value: string | null;
      avatar_source: string | null;
      avatar_nft_id: string | null;
      owned_nft_ids: string | null;
      current_streak: number | null;
      longest_streak: number | null;
      updated_at: string;
      created_at: string | null;
    }>();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Fetch currency
    let oranges = 0;
    let gems = 0;
    let lifetimeOranges = 0;
    let totalSpent = 0;
    try {
      const currency = await env.DB.prepare(`
        SELECT oranges, gems, lifetime_earned, lifetime_spent
        FROM user_currency WHERE user_id = ?
      `).bind(userId).first<{
        oranges: number;
        gems: number;
        lifetime_earned: number | null;
        lifetime_spent: number | null;
      }>();
      if (currency) {
        oranges = currency.oranges;
        gems = currency.gems;
        lifetimeOranges = currency.lifetime_earned || oranges;
        totalSpent = currency.lifetime_spent || 0;
      }
    } catch {
      // Table may not exist
    }

    // Fetch drawer customization settings
    let customization: Record<string, unknown> | null = null;
    try {
      customization = await env.DB.prepare(`
        SELECT
          font_color as username_color,
          font_style as username_style,
          page_background as banner_style,
          avatar_glow,
          avatar_size
        FROM drawer_customization WHERE user_id = ?
      `).bind(userId).first();
    } catch {
      // Table may not exist
    }

    // Fetch equipped frame
    let frame: { id: string; css_class: string } | null = null;
    try {
      const frameResult = await env.DB.prepare(`
        SELECT ui.item_id, sc.css_class
        FROM user_inventory ui
        JOIN shop_items sc ON ui.item_id = sc.id
        WHERE ui.user_id = ? AND ui.equipped = 1 AND sc.category = 'frame'
        LIMIT 1
      `).bind(userId).first<{ item_id: string; css_class: string | null }>();
      if (frameResult) {
        frame = { id: frameResult.item_id, css_class: frameResult.css_class || '' };
      }
    } catch {
      // Tables may not exist
    }

    // Fetch emoji ring (equipped emojis)
    const emojiRing: Record<string, string> = {};
    try {
      const emojis = await env.DB.prepare(`
        SELECT ui.item_id, sc.icon
        FROM user_inventory ui
        JOIN shop_items sc ON ui.item_id = sc.id
        WHERE ui.user_id = ? AND ui.equipped = 1 AND sc.category = 'emoji_badge'
        LIMIT 4
      `).bind(userId).all<{ item_id: string; icon: string }>();
      if (emojis.results) {
        emojis.results.forEach((e, i) => {
          emojiRing[`slot${i + 1}`] = e.icon || '';
        });
      }
    } catch {
      // Tables may not exist
    }

    // Fetch equipped title
    let title: string | null = null;
    try {
      const titleResult = await env.DB.prepare(`
        SELECT sc.name
        FROM user_inventory ui
        JOIN shop_items sc ON ui.item_id = sc.id
        WHERE ui.user_id = ? AND ui.equipped = 1 AND sc.category = 'title'
        LIMIT 1
      `).bind(userId).first<{ name: string }>();
      if (titleResult) {
        title = titleResult.name;
      }
    } catch {
      // Tables may not exist
    }

    // Fetch equipped name effect from user_equipped table
    let nameEffect: { id: string; css_class: string } | null = null;
    try {
      const nameEffectResult = await env.DB.prepare(`
        SELECT ue.name_effect_id, si.css_class
        FROM user_equipped ue
        JOIN shop_items si ON ue.name_effect_id = si.id
        WHERE ue.user_id = ?
      `).bind(userId).first<{ name_effect_id: string; css_class: string | null }>();
      if (nameEffectResult && nameEffectResult.name_effect_id) {
        nameEffect = {
          id: nameEffectResult.name_effect_id,
          css_class: nameEffectResult.css_class || '',
        };
      }
    } catch {
      // Tables may not exist
    }

    // Fetch BigPulp configuration
    let bigpulp: { hat: string | null; mood: string; accessory: string | null } | null = null;
    try {
      const bpHat = await env.DB.prepare(`
        SELECT sc.css_value
        FROM user_inventory ui
        JOIN shop_items sc ON ui.item_id = sc.id
        WHERE ui.user_id = ? AND ui.equipped = 1 AND sc.category = 'bigpulp_hat'
        LIMIT 1
      `).bind(userId).first<{ css_value: string }>();

      const bpMood = await env.DB.prepare(`
        SELECT sc.css_value
        FROM user_inventory ui
        JOIN shop_items sc ON ui.item_id = sc.id
        WHERE ui.user_id = ? AND ui.equipped = 1 AND sc.category = 'bigpulp_mood'
        LIMIT 1
      `).bind(userId).first<{ css_value: string }>();

      const bpAccessory = await env.DB.prepare(`
        SELECT sc.css_value
        FROM user_inventory ui
        JOIN shop_items sc ON ui.item_id = sc.id
        WHERE ui.user_id = ? AND ui.equipped = 1 AND sc.category = 'bigpulp_accessory'
        LIMIT 1
      `).bind(userId).first<{ css_value: string }>();

      if (bpMood || bpHat || bpAccessory) {
        bigpulp = {
          hat: bpHat?.css_value || null,
          mood: bpMood?.css_value || 'happy',
          accessory: bpAccessory?.css_value || null,
        };
      }
    } catch {
      // Tables may not exist
    }

    // Fetch collection items (owned shop items)
    let collectionItems: Array<{
      id: string;
      name: string;
      category: string;
      rarity: string;
      icon: string | null;
      css_class: string | null;
    }> = [];
    try {
      const items = await env.DB.prepare(`
        SELECT sc.id, sc.name, sc.category, sc.rarity, sc.icon, sc.css_class
        FROM user_inventory ui
        JOIN shop_items sc ON ui.item_id = sc.id
        WHERE ui.user_id = ?
        ORDER BY sc.rarity DESC, sc.category, sc.name
      `).bind(userId).all();
      collectionItems = (items.results || []).map((i: { id: string; name: string; category: string; rarity: string | null; icon: string | null; css_class: string | null }) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        rarity: i.rarity || 'common',
        icon: i.icon,
        css_class: i.css_class,
      }));
    } catch {
      // Tables may not exist
    }

    // Fetch game scores with ranks
    const gameScores: Array<{
      gameId: string;
      gameName: string;
      score: number;
      rank: number | null;
    }> = [];
    let totalScore = 0;
    let gamesPlayed = 0;
    let bestRank: number | null = null;
    let highestRankGame: string | null = null;
    let firstPlaceCount = 0;
    try {
      const scores = await env.DB.prepare(`
        SELECT
          game_id,
          MAX(score) as high_score,
          COUNT(*) as play_count
        FROM leaderboard_scores
        WHERE user_id = ?
        GROUP BY game_id
      `).bind(userId).all();

      for (const s of (scores.results || []) as Array<{ game_id: string; high_score: number; play_count: number }>) {
        totalScore += s.high_score || 0;
        gamesPlayed += s.play_count || 0;

        // Get rank
        let rank: number | null = null;
        try {
          const rankResult = await env.DB.prepare(`
            SELECT COUNT(*) + 1 as rank
            FROM (
              SELECT user_id, MAX(score) as max_score
              FROM leaderboard_scores
              WHERE game_id = ?
              GROUP BY user_id
            ) ranked
            WHERE max_score > ?
          `).bind(s.game_id, s.high_score).first<{ rank: number }>();
          rank = rankResult?.rank || null;

          if (rank === 1) firstPlaceCount++;
          if (rank && (!bestRank || rank < bestRank)) {
            bestRank = rank;
            highestRankGame = s.game_id;
          }
        } catch {
          // Ignore rank calculation errors
        }

        gameScores.push({
          gameId: s.game_id,
          gameName: GAME_NAMES[s.game_id] || s.game_id,
          score: s.high_score,
          rank,
        });
      }

      // Sort by score descending
      gameScores.sort((a, b) => b.score - a.score);
    } catch {
      // Tables may not exist
    }

    // Fetch achievements and progress
    let achievements: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      rarity: string;
      reward: { oranges: number; gems: number };
      isSecret: boolean;
    }> = [];
    const achievementProgress: Record<string, {
      achievementId: string;
      progress: number;
      target: number;
      completed: boolean;
      completedAt: string | null;
      claimed: boolean;
    }> = {};
    let achievementsCompleted = 0;
    let achievementsTotal = 0;
    try {
      // Fetch all achievements
      const achievementDefs = await env.DB.prepare(`
        SELECT id, name, description, icon, category, rarity, reward_oranges, reward_gems, target, is_secret
        FROM achievements
        WHERE is_active = 1
        ORDER BY sort_order, rarity DESC
      `).all();

      achievements = (achievementDefs.results || []).map((a: { id: string; name: string; description: string; icon: string | null; category: string | null; rarity: string | null; reward_oranges: number | null; reward_gems: number | null; target: number; is_secret: number }) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon || '🏆',
        category: a.category || 'milestone',
        rarity: a.rarity || 'common',
        reward: { oranges: a.reward_oranges || 0, gems: a.reward_gems || 0 },
        isSecret: a.is_secret === 1,
      }));
      achievementsTotal = achievements.length;

      // Fetch user's progress
      const progress = await env.DB.prepare(`
        SELECT achievement_id, progress, completed, completed_at, claimed
        FROM user_achievements
        WHERE user_id = ?
      `).bind(userId).all();

      for (const p of (progress.results || []) as Array<{ achievement_id: string; progress: number; completed: number; completed_at: string | null; claimed: number }>) {
        const achDef = achievementDefs.results?.find((a: { id: string; target: number }) => a.id === p.achievement_id) as { id: string; target: number } | undefined;
        achievementProgress[p.achievement_id] = {
          achievementId: p.achievement_id,
          progress: p.progress || 0,
          target: achDef?.target || 1,
          completed: p.completed === 1,
          completedAt: p.completed_at,
          claimed: p.claimed === 1,
        };
        if (p.completed === 1) achievementsCompleted++;
      }
    } catch {
      // Tables may not exist
    }

    // Fetch friends count
    let friendsCount = 0;
    try {
      const friendsResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND status = 'accepted'
      `).bind(userId).first<{ count: number }>();
      friendsCount = friendsResult?.count || 0;
    } catch {
      // Table may not exist
    }

    // Calculate level from lifetime oranges (simple formula)
    const level = Math.floor(Math.sqrt(lifetimeOranges / 100)) + 1;

    // Parse owned NFT IDs
    let ownedNftIds: string[] = [];
    if (profile.owned_nft_ids) {
      try {
        ownedNftIds = JSON.parse(profile.owned_nft_ids);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Build the comprehensive response
    const response = {
      // User basics
      userId: profile.user_id,
      displayName: profile.display_name || 'Player',
      bio: null as string | null, // TODO: Add bio field to profiles table
      title,
      xHandle: profile.x_handle,
      discord: null as string | null, // TODO: Add discord field
      location: null as string | null, // TODO: Add location field
      createdAt: profile.created_at || profile.updated_at,

      // Avatar & customization
      avatar: {
        type: profile.avatar_type || 'emoji',
        value: profile.avatar_value || '🎮',
        nftId: profile.avatar_nft_id,
      },
      frame,
      nameEffect,
      emojiRing: Object.keys(emojiRing).length > 0 ? emojiRing : undefined,
      customization: customization ? {
        banner_style: customization.banner_style,
        username_color: customization.username_color,
        username_style: customization.username_style,
        avatar_glow: customization.avatar_glow,
        avatar_size: customization.avatar_size,
      } : undefined,

      // BigPulp
      bigpulp,

      // Stats
      level,
      oranges,
      gems,

      // Overview stats
      overviewStats: {
        level,
        itemsOwned: collectionItems.length,
        achievementsCompleted,
        achievementsTotal,
        currentStreak: profile.current_streak || 0,
        bestRank,
      },

      // Detailed stats for Stats tab
      detailedStats: {
        memberSince: profile.created_at || profile.updated_at,
        currentStreak: profile.current_streak || 0,
        longestStreak: profile.longest_streak || 0,
        profileViews: undefined, // TODO: Add visitor tracking
        level,
        lifetimeOranges,
        totalSpent,
        currentBalance: oranges,
        itemsOwned: collectionItems.length,
        gems,
        gamesPlayed,
        totalScore,
        bestGame: highestRankGame ? GAME_NAMES[highestRankGame] : undefined,
        highestRank: bestRank || undefined,
        firstPlaceCount,
        friendsCount,
        guildName: undefined, // TODO: Add guild support
        giftsSent: 0, // TODO: Add gift tracking
        giftsReceived: 0,
        challengesWon: 0, // TODO: Add challenge tracking
      },

      // Featured items (user can pin items)
      featured: [] as Array<{ id: string; type: string; name: string; icon: string }>,

      // Recent activity (TODO: Implement activity tracking)
      activities: [] as Array<{ id: string; type: string; text: string; icon: string; timestamp: string }>,

      // Game scores
      gameScores,

      // Collection items
      collectionItems,

      // Achievements
      achievements,
      achievementProgress,

      // Legacy fields for backwards compatibility
      walletAddress: profile.wallet_address,
      ownedNftIds,
      ownedItems: collectionItems.map(i => ({ id: i.id })),
    };

    return new Response(JSON.stringify(response), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[Profile API] Error for userId', userId, ':', error);
    return new Response(JSON.stringify({ error: 'Server error', details: String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: corsHeaders });
};
