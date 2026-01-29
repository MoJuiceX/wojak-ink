/**
 * Cloudflare Pages Function - /api/profile
 *
 * GET: Returns the authenticated user's profile
 * POST: Creates/updates the authenticated user's profile
 */

import { authenticateRequest } from '../lib/auth';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database; // D1 binding
  CHAT_ADMIN_USER_IDS?: string; // Comma-separated list of admin user IDs
}

interface AvatarData {
  type: 'emoji' | 'nft';
  value: string;
  source: 'default' | 'user' | 'wallet';
  nftId?: string;
  nftLauncherId?: string;
}

interface ProfileData {
  displayName?: string;
  xHandle?: string;
  walletAddress?: string;
  avatar?: AvatarData;
  ownedNftIds?: string[];
  // NFT verification for chat access
  nftCount?: number | null;
  nftVerifiedAt?: string | null;
}

// Valid emoji list for validation and random assignment
const VALID_EMOJIS = ['🎮', '🔥', '🚀', '🎯', '🦊', '🐸', '👾', '🤖', '🎪', '🌸', '🍕', '🎸', '⚡', '🦁', '🐙'];

/**
 * Get a random emoji from the valid list
 */
function getRandomEmoji(): string {
  return VALID_EMOJIS[Math.floor(Math.random() * VALID_EMOJIS.length)];
}

// CORS headers - include no-cache to prevent stale profile data
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

/**
 * Ensure user exists in users table (upsert)
 */
async function ensureUser(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, created_at, updated_at)
       VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now')`
    )
    .bind(userId)
    .run();
}

/**
 * Get user profile with streak and avatar info
 * JOINs users table to get created_at for "Member for X days" display
 * Note: Falls back gracefully if columns don't exist yet
 */
async function getProfile(db: D1Database, userId: string) {
  // Query profile with all columns - no fallback, columns should exist
  console.warn('[Profile] getProfile called for userId:', userId);
  
  const result = await db
    .prepare(`SELECT
      u.created_at as user_created_at,
      p.display_name,
      p.x_handle,
      p.wallet_address,
      p.current_streak,
      p.longest_streak,
      p.last_played_date,
      p.avatar_type,
      p.avatar_value,
      p.avatar_source,
      p.avatar_nft_id,
      p.avatar_nft_launcher_id,
      p.owned_nft_ids,
      p.nft_count,
      p.nft_verified_at,
      p.updated_at
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ?`)
    .bind(userId)
    .first<{
      user_created_at: string;
      display_name: string | null;
      x_handle: string | null;
      wallet_address: string | null;
      current_streak: number | null;
      longest_streak: number | null;
      last_played_date: string | null;
      avatar_type: string | null;
      avatar_value: string | null;
      avatar_source: string | null;
      avatar_nft_id: string | null;
      avatar_nft_launcher_id: string | null;
      owned_nft_ids: string | null;
      nft_count: number | null;
      nft_verified_at: string | null;
      updated_at: string;
    }>();

  console.warn('[Profile] getProfile result:', JSON.stringify({
    hasResult: !!result,
    avatar_type: result?.avatar_type,
    avatar_value: result?.avatar_value?.substring(0, 50),
    avatar_source: result?.avatar_source,
  }));
  
  return result;
}


/**
 * Validate profile data
 */
function validateProfileData(data: ProfileData, existingProfile?: { wallet_address: string | null }): { valid: boolean; error?: string } {
  // Validate displayName (optional, 3-20 chars)
  if (data.displayName !== undefined && data.displayName !== null && data.displayName !== '') {
    if (data.displayName.length < 3 || data.displayName.length > 20) {
      return { valid: false, error: 'Display name must be 3-20 characters' };
    }
  }

  // Validate xHandle (optional, alphanumeric + underscore, max 15 chars)
  if (data.xHandle !== undefined && data.xHandle !== null && data.xHandle !== '') {
    // Remove @ if present
    const handle = data.xHandle.replace(/^@/, '');

    if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
      return { valid: false, error: 'X handle must be 1-15 alphanumeric characters or underscores' };
    }

    // Update the data with cleaned handle
    data.xHandle = handle;
  }

  // Validate walletAddress (optional, xch prefix, 62 chars)
  if (data.walletAddress !== undefined && data.walletAddress !== null && data.walletAddress !== '') {
    const wallet = data.walletAddress.trim().toLowerCase();

    if (!wallet.startsWith('xch') || wallet.length !== 62) {
      return { valid: false, error: 'Wallet address must be a valid Chia address (xch...)' };
    }

    // Update with cleaned address
    data.walletAddress = wallet;
  }

  // Validate avatar if provided
  if (data.avatar) {
    const { type, value, source } = data.avatar;

    if (type === 'nft') {
      // NFT avatar requires wallet to be connected
      const walletAddress = data.walletAddress || existingProfile?.wallet_address;
      if (!walletAddress) {
        return { valid: false, error: 'Wallet must be connected to use NFT avatar' };
      }
    }

    if (type === 'emoji' && source === 'user') {
      // Validate emoji is in allowed list
      if (!VALID_EMOJIS.includes(value)) {
        return { valid: false, error: 'Invalid emoji selection' };
      }
    }
  }

  return { valid: true };
}

/**
 * Upsert profile - using explicit SELECT/UPDATE/INSERT for reliability
 */
async function upsertProfile(
  db: D1Database,
  userId: string,
  data: ProfileData
): Promise<void> {
  // Log what we're about to save
  console.warn('[Profile] upsertProfile called:', JSON.stringify({
    userId,
    hasAvatar: !!data.avatar,
    avatarType: data.avatar?.type,
    avatarValue: data.avatar?.value?.substring(0, 50),
    avatarSource: data.avatar?.source,
    avatarNftId: data.avatar?.nftId,
    walletAddress: data.walletAddress?.substring(0, 10),
  }));

  // Check if profile exists
  const existing = await db
    .prepare('SELECT user_id FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first();

  if (existing) {
    // UPDATE existing profile
    console.warn('[Profile] Profile exists, performing UPDATE');
    
    // Build SET clauses dynamically based on what's provided
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    // Avatar fields - set explicitly if avatar data is provided
    if (data.avatar) {
      setClauses.push('avatar_type = ?');
      values.push(data.avatar.type);
      
      setClauses.push('avatar_value = ?');
      values.push(data.avatar.value);
      
      setClauses.push('avatar_source = ?');
      values.push(data.avatar.source);
      
      setClauses.push('avatar_nft_id = ?');
      values.push(data.avatar.nftId || null);
      
      setClauses.push('avatar_nft_launcher_id = ?');
      values.push(data.avatar.nftLauncherId || null);
    }

    // Other fields - only update if explicitly provided
    if (data.displayName !== undefined) {
      setClauses.push('display_name = ?');
      values.push(data.displayName || null);
    }
    if (data.xHandle !== undefined) {
      setClauses.push('x_handle = ?');
      values.push(data.xHandle || null);
    }
    if (data.walletAddress !== undefined) {
      setClauses.push('wallet_address = ?');
      values.push(data.walletAddress || null);
    }
    if (data.ownedNftIds !== undefined) {
      setClauses.push('owned_nft_ids = ?');
      values.push(JSON.stringify(data.ownedNftIds));
    }
    if (data.nftCount !== undefined) {
      setClauses.push('nft_count = ?');
      values.push(data.nftCount);
    }
    if (data.nftVerifiedAt !== undefined) {
      setClauses.push('nft_verified_at = ?');
      values.push(data.nftVerifiedAt || null);
    }

    // Always update timestamp
    setClauses.push("updated_at = datetime('now')");

    if (setClauses.length > 1) { // More than just updated_at
      const sql = `UPDATE profiles SET ${setClauses.join(', ')} WHERE user_id = ?`;
      values.push(userId);

      console.warn('[Profile] UPDATE SQL:', sql);
      console.warn('[Profile] UPDATE values:', JSON.stringify(values));
      console.warn('[Profile] Value types:', values.map(v => typeof v).join(', '));

      try {
        const result = await db.prepare(sql).bind(...values).run();
        
        console.warn('[Profile] UPDATE result:', JSON.stringify({
          success: result.success,
          changes: result.meta?.changes,
          duration: result.meta?.duration,
        }));

        if (result.meta?.changes === 0) {
          console.error('[Profile] WARNING: UPDATE affected 0 rows!');
        }

        // VERIFICATION: Immediately read back the avatar data to confirm it was written
        const verify = await db
          .prepare('SELECT avatar_type, avatar_value, avatar_source FROM profiles WHERE user_id = ?')
          .bind(userId)
          .first<{ avatar_type: string | null; avatar_value: string | null; avatar_source: string | null }>();
        
        console.warn('[Profile] VERIFY after UPDATE:', JSON.stringify({
          avatar_type: verify?.avatar_type,
          avatar_value: verify?.avatar_value?.substring(0, 50),
          avatar_source: verify?.avatar_source,
        }));
      } catch (updateError) {
        console.error('[Profile] UPDATE FAILED:', updateError);
        console.error('[Profile] UPDATE error message:', updateError instanceof Error ? updateError.message : String(updateError));
        throw updateError;
      }
    }
  } else {
    // INSERT new profile
    console.warn('[Profile] Profile does not exist, performing INSERT');
    
    try {
      const result = await db
        .prepare(
          `INSERT INTO profiles (
            user_id, display_name, x_handle, wallet_address,
            avatar_type, avatar_value, avatar_source, avatar_nft_id, avatar_nft_launcher_id,
            owned_nft_ids, nft_count, nft_verified_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          userId,
          data.displayName || null,
          data.xHandle || null,
          data.walletAddress || null,
          data.avatar?.type || 'emoji',
          data.avatar?.value || '🎮',
          data.avatar?.source || 'default',
          data.avatar?.nftId || null,
          data.avatar?.nftLauncherId || null,
          data.ownedNftIds ? JSON.stringify(data.ownedNftIds) : null,
          data.nftCount ?? null,
          data.nftVerifiedAt || null
        )
        .run();

      console.warn('[Profile] INSERT result:', JSON.stringify({
        success: result.success,
        changes: result.meta?.changes,
        lastRowId: result.meta?.last_row_id,
      }));
    } catch (insertError) {
      console.error('[Profile] INSERT FAILED:', insertError);
      console.error('[Profile] INSERT error message:', insertError instanceof Error ? insertError.message : String(insertError));
      throw insertError;
    }
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if auth is configured
  if (!env.CLERK_DOMAIN) {
    return new Response(
      JSON.stringify({ error: 'Auth not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Check if DB is configured
  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Authenticate request
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);

  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const { userId } = auth;

  // Check if user is admin (bypasses NFT requirements for chat)
  const adminUserIds = env.CHAT_ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  const isAdmin = adminUserIds.includes(userId);

  try {
    // Ensure user exists
    await ensureUser(env.DB, userId);

    // Handle GET - return profile
    if (request.method === 'GET') {
      let profile = await getProfile(env.DB, userId);

      // Auto-assign random emoji for new users without an avatar
      if (!profile || !profile.avatar_value) {
        const randomEmoji = getRandomEmoji();
        console.warn(`[Profile] Assigning random emoji ${randomEmoji} to user ${userId}`);

        // Save the random emoji to the database
        await upsertProfile(env.DB, userId, {
          avatar: {
            type: 'emoji',
            value: randomEmoji,
            source: 'default',
          },
        });

        // Fetch the updated profile
        profile = await getProfile(env.DB, userId);
      }

      return new Response(
        JSON.stringify({
          userId,
          isAdmin,
          profile: profile
            ? {
                displayName: profile.display_name,
                xHandle: profile.x_handle,
                walletAddress: profile.wallet_address,
                currentStreak: profile.current_streak || 0,
                longestStreak: profile.longest_streak || 0,
                lastPlayedDate: profile.last_played_date,
                avatar: {
                  type: profile.avatar_type || 'emoji',
                  value: profile.avatar_value || '🎮',
                  source: profile.avatar_source || 'default',
                  nftId: profile.avatar_nft_id,
                  nftLauncherId: profile.avatar_nft_launcher_id,
                },
                ownedNftIds: profile.owned_nft_ids ? JSON.parse(profile.owned_nft_ids) : [],
                nftCount: profile.nft_count,
                nftVerifiedAt: profile.nft_verified_at,
                createdAt: profile.user_created_at,
                updatedAt: profile.updated_at,
              }
            : null,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle POST - update profile
    if (request.method === 'POST') {
      let data: ProfileData;

      try {
        data = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Get existing profile for validation
      const existingProfile = await getProfile(env.DB, userId);

      // Validate
      const validation = validateProfileData(data, existingProfile ? { wallet_address: existingProfile.wallet_address } : undefined);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Save
      console.warn('[Profile] Saving profile data:', JSON.stringify(data));
      await upsertProfile(env.DB, userId, data);
      console.warn('[Profile] Upsert complete');

      // Return updated profile
      const profile = await getProfile(env.DB, userId);
      console.warn('[Profile] Retrieved profile after save:', JSON.stringify({
        avatar_type: profile?.avatar_type,
        avatar_value: profile?.avatar_value?.substring(0, 50),
        avatar_source: profile?.avatar_source,
        avatar_nft_id: profile?.avatar_nft_id,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          isAdmin,
          profile: profile
            ? {
                displayName: profile.display_name,
                xHandle: profile.x_handle,
                walletAddress: profile.wallet_address,
                currentStreak: profile.current_streak || 0,
                longestStreak: profile.longest_streak || 0,
                lastPlayedDate: profile.last_played_date,
                avatar: {
                  type: profile.avatar_type || 'emoji',
                  value: profile.avatar_value || '🎮',
                  source: profile.avatar_source || 'default',
                  nftId: profile.avatar_nft_id,
                  nftLauncherId: profile.avatar_nft_launcher_id,
                },
                ownedNftIds: profile.owned_nft_ids ? JSON.parse(profile.owned_nft_ids) : [],
                nftCount: profile.nft_count,
                nftVerifiedAt: profile.nft_verified_at,
                createdAt: profile.user_created_at,
                updatedAt: profile.updated_at,
              }
            : null,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Profile] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
