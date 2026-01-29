/**
 * Chat Eligibility Verification API - /api/chat/verify-eligibility
 *
 * POST: Verifies user eligibility for chat rooms based on NFT holdings
 *
 * Request body: {
 *   walletAddress: string,  // User's Chia wallet address (xch1...)
 *   chatType?: 'whale' | 'holder'  // Optional: specific room to check
 * }
 *
 * Response: {
 *   nftCount: number,
 *   isAdmin: boolean,
 *   eligibility: {
 *     whale: { eligible: boolean, minRequired: 42 },
 *     holder: { eligible: boolean, minRequired: 1 },
 *   }
 * }
 */

import { authenticateRequest } from '../../lib/auth';
import { checkRateLimit, getRateLimitKey, getRateLimitHeaders, CHAT_RATE_LIMITS } from '../../lib/rateLimit';

interface Env {
  CLERK_DOMAIN: string;
  DB: D1Database;
  CHAT_ADMIN_USER_IDS?: string; // Comma-separated list of admin user IDs
}

interface VerifyRequest {
  walletAddress: string;
  chatType?: 'whale' | 'holder';
}

interface MintGardenNFT {
  id: string;
  name?: string;
  collection?: {
    id: string;
    name: string;
  };
}

// MintGardenResponse type - structure of API response (items array extracted directly)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _MintGardenResponse = {
  items: MintGardenNFT[];
  count?: number;
  total?: number;
};

// Wojak Farmers Plot collection ID
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// Chat room requirements
const CHAT_ROOMS = {
  whale: { minNfts: 42, label: 'Whale Chat' },
  holder: { minNfts: 1, label: 'Holder Chat' },
} as const;

// Admin user IDs bypass NFT requirement (loaded from environment variable)
// Format: comma-separated list of Clerk user IDs
// Set in Cloudflare Pages: CHAT_ADMIN_USER_IDS=user_xxx,user_yyy

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://wojak.ink',
  'https://www.wojak.ink',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://wojak.ink';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

// Cache TTL: 24 hours in seconds
const CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Get cached NFT count from D1 database
 */
async function getCachedNftCount(db: D1Database, walletAddress: string): Promise<number | null> {
  try {
    const result = await db.prepare(
      'SELECT nft_count, updated_at FROM nft_cache WHERE wallet_address = ? AND collection_id = ?'
    ).bind(walletAddress, WOJAK_COLLECTION_ID).first<{ nft_count: number; updated_at: number }>();
    
    if (!result) return null;
    
    // Check if cache is still valid (within 24 hours)
    const now = Math.floor(Date.now() / 1000);
    if (now - result.updated_at > CACHE_TTL_SECONDS) {
      return null; // Cache expired
    }
    
    return result.nft_count;
  } catch (error) {
    console.error('[Chat Verify] Cache read error:', error);
    return null;
  }
}

/**
 * Update NFT count cache in D1 database
 */
async function updateNftCache(db: D1Database, walletAddress: string, nftCount: number): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);
    await db.prepare(
      `INSERT INTO nft_cache (wallet_address, nft_count, collection_id, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(wallet_address) DO UPDATE SET nft_count = ?, updated_at = ?`
    ).bind(walletAddress, nftCount, WOJAK_COLLECTION_ID, now, now, nftCount, now).run();
  } catch (error) {
    console.error('[Chat Verify] Cache write error:', error);
    // Don't throw - caching is non-critical
  }
}

/**
 * Fetch NFT count from MintGarden API with D1 cache fallback
 * - On success: Updates cache and returns count
 * - On failure: Returns cached value if available, otherwise 0
 */
async function fetchWojakNftCount(walletAddress: string, db: D1Database): Promise<{ count: number; fromCache: boolean }> {
  const url = `https://api.mintgarden.io/address/${walletAddress}/nfts?type=owned&collection_id=${WOJAK_COLLECTION_ID}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'wojak.ink/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[Chat Verify] MintGarden API error: ${response.status}`);
      // Fall back to cache
      const cached = await getCachedNftCount(db, walletAddress);
      if (cached !== null) {
        console.warn(`[Chat Verify] Using cached count: ${cached}`);
        return { count: cached, fromCache: true };
      }
      return { count: 0, fromCache: false };
    }

    const data = await response.json();
    const items = data.items || [];
    const count = Array.isArray(items) ? items.length : 0;
    
    // Update cache with fresh data
    await updateNftCache(db, walletAddress, count);
    
    return { count, fromCache: false };
  } catch (error) {
    console.error(`[Chat Verify] Error fetching NFTs:`, error);
    // Fall back to cache on network error
    const cached = await getCachedNftCount(db, walletAddress);
    if (cached !== null) {
      console.warn(`[Chat Verify] Using cached count after error: ${cached}`);
      return { count: cached, fromCache: true };
    }
    return { count: 0, fromCache: false };
  }
}

/**
 * Validate Chia wallet address format
 */
function isValidChiaAddress(address: string): boolean {
  // Chia addresses start with 'xch1' and are 62 characters total (bech32m)
  return typeof address === 'string' &&
    address.startsWith('xch1') &&
    address.length === 62 &&
    /^xch1[a-z0-9]+$/.test(address);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const corsHeaders = getCorsHeaders(request);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Check configuration
  if (!env.CLERK_DOMAIN) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Authenticate user via Clerk
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Rate limiting - check after auth to use user ID
  const rateLimitKey = getRateLimitKey(request, auth.userId);
  const rateLimitResult = await checkRateLimit(env.DB, rateLimitKey, CHAT_RATE_LIMITS.verifyEligibility);
  
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        status: 429, 
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimitResult, CHAT_RATE_LIMITS.verifyEligibility),
        }
      }
    );
  }

  // Parse request body
  let body: VerifyRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { walletAddress } = body;

  // Check if user is admin (bypasses NFT requirement) - check early for proper response
  const adminUserIds = env.CHAT_ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  const isAdmin = adminUserIds.includes(auth.userId);

  // Validate wallet address (admins can bypass this requirement)
  if (!walletAddress) {
    // Admins without wallet still get full access
    if (isAdmin) {
      return new Response(
        JSON.stringify({
          nftCount: 0,
          isAdmin: true,
          eligibility: {
            whale: { eligible: true, minRequired: CHAT_ROOMS.whale.minNfts },
            holder: { eligible: true, minRequired: CHAT_ROOMS.holder.minNfts },
          },
          message: 'Welcome, Admin! You have full access to all chat rooms.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({
        nftCount: 0,
        isAdmin: false,
        eligibility: {
          whale: { eligible: false, minRequired: CHAT_ROOMS.whale.minNfts },
          holder: { eligible: false, minRequired: CHAT_ROOMS.holder.minNfts },
        },
        message: 'Connect your Sage wallet to verify NFT holdings',
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  if (!isValidChiaAddress(walletAddress)) {
    return new Response(
      JSON.stringify({ error: 'Invalid Chia wallet address format' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {

    // Fetch NFT count from MintGarden (with cache fallback)
    const { count: nftCount, fromCache } = await fetchWojakNftCount(walletAddress, env.DB);
    
    // Calculate eligibility for each room
    const eligibility = {
      whale: {
        eligible: isAdmin || nftCount >= CHAT_ROOMS.whale.minNfts,
        minRequired: CHAT_ROOMS.whale.minNfts,
      },
      holder: {
        eligible: isAdmin || nftCount >= CHAT_ROOMS.holder.minNfts,
        minRequired: CHAT_ROOMS.holder.minNfts,
      },
    };

    // Generate appropriate message
    let message: string;
    if (isAdmin) {
      message = `Welcome, Admin! You have full access to all chat rooms.`;
    } else if (eligibility.whale.eligible) {
      message = `Welcome to the Whale Chat! You hold ${nftCount} Wojak Farmers Plot NFTs.`;
    } else if (eligibility.holder.eligible) {
      message = `Welcome to the Holder Chat! You hold ${nftCount} Wojak Farmers Plot NFT${nftCount !== 1 ? 's' : ''}.`;
    } else {
      message = `Hold at least 1 Wojak Farmers Plot NFT to join the Holder Chat. Connect your wallet at wojak.ink`;
    }

    // Add cache warning if using stale data
    if (fromCache) {
      message += ' (Note: Using cached data - MintGarden API temporarily unavailable)';
    }

    return new Response(
      JSON.stringify({
        nftCount,
        isAdmin,
        eligibility,
        message,
        fromCache,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Chat Verify] Error fetching NFT count:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to verify NFT holdings. Please try again.' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
