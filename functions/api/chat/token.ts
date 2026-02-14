/**
 * Chat Token API - /api/chat/token
 *
 * POST: Issues a short-lived JWT for Socket.io authentication after eligibility verification
 *
 * Request body: {
 *   walletAddress: string,  // User's Chia wallet address (xch1...)
 *   chatType: 'whale' | 'holder'  // Which chat room to access
 * }
 *
 * Response: {
 *   token: string,        // Short-lived JWT for Socket.io auth (includes roomName)
 *   expiresAt: number,    // Unix timestamp when token expires
 *   userId: string,       // Clerk user ID
 *   nftCount: number,     // Verified NFT count
 *   chatType: string,     // Requested chat type
 *   roomName: string      // Socket.io room name
 * }
 *
 * Security: Token is only issued after server-side NFT count verification.
 * Token expires in 5 minutes and must be used immediately to connect.
 */

import { authenticateRequest } from '../../lib/auth';
import { checkRateLimit, getRateLimitKey, getRateLimitHeaders, CHAT_RATE_LIMITS } from '../../lib/rateLimit';
import { isValidChiaAddress } from '../../lib/validation';

interface Env {
  CLERK_DOMAIN: string;
  CHAT_JWT_SECRET: string; // Secret for signing chat tokens
  DB: D1Database;
  CHAT_ADMIN_USER_IDS?: string; // Comma-separated list of admin user IDs
}

interface TokenRequest {
  walletAddress: string;
  chatType: 'whale' | 'holder';
}

interface MintGardenNFT {
  id: string;
  collection?: {
    id: string;
  };
}

interface MintGardenResponse {
  items: MintGardenNFT[];
}

// Wojak Farmers Plot collection ID
const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const TOKEN_EXPIRY_SECONDS = 300; // 5 minutes

// Chat room configurations
const CHAT_ROOMS = {
  whale: { minNfts: 42, roomName: 'wojak-whale', label: 'Whale Chat' },
  holder: { minNfts: 1, roomName: 'wojak-holder', label: 'Holder Chat' },
} as const;

type ChatType = keyof typeof CHAT_ROOMS;

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
    console.error('[Chat Token] Cache read error:', error);
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
    console.error('[Chat Token] Cache write error:', error);
  }
}

/**
 * Fetch NFT count from MintGarden API with D1 cache fallback
 */
async function fetchWojakNftCount(walletAddress: string, db: D1Database): Promise<number> {
  const url = `https://api.mintgarden.io/address/${walletAddress}/nfts?type=owned&collection_id=${WOJAK_COLLECTION_ID}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'wojak.ink/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[Chat Token] MintGarden API error: ${response.status}`);
      // Fall back to cache
      const cached = await getCachedNftCount(db, walletAddress);
      return cached ?? 0;
    }

    const data: MintGardenResponse = await response.json();
    const count = data.items?.length || 0;
    
    // Update cache with fresh data
    await updateNftCache(db, walletAddress, count);
    
    return count;
  } catch (error) {
    console.error(`[Chat Token] Error fetching NFTs:`, error);
    // Fall back to cache on network error
    const cached = await getCachedNftCount(db, walletAddress);
    return cached ?? 0;
  }
}

/**
 * Create a simple HMAC-signed JWT for chat authentication
 * Uses Web Crypto API for Cloudflare Workers compatibility
 */
async function createChatToken(
  secret: string,
  payload: {
    userId: string;
    walletAddress: string;
    nftCount: number;
    isAdmin?: boolean;
    chatType: ChatType;
    roomName: string;
  }
): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TOKEN_EXPIRY_SECONDS;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: expiresAt,
    iss: 'wojak.ink',
    aud: 'wojak-chat',
  };

  // Base64URL encode
  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(jwtPayload);
  const message = `${encodedHeader}.${encodedPayload}`;

  // Sign with HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    token: `${message}.${signatureBase64}`,
    expiresAt,
  };
}

// Admin user IDs loaded from environment variable
// Set in Cloudflare Pages: CHAT_ADMIN_USER_IDS=user_xxx,user_yyy

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
  if (!env.CLERK_DOMAIN || !env.CHAT_JWT_SECRET) {
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
  const rateLimitResult = await checkRateLimit(env.DB, rateLimitKey, CHAT_RATE_LIMITS.token);
  
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many token requests. Please try again later.' }),
      { 
        status: 429, 
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimitResult, CHAT_RATE_LIMITS.token),
        }
      }
    );
  }

  // Parse request body
  let body: TokenRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { walletAddress, chatType } = body;

  // Validate chat type
  if (!chatType || !CHAT_ROOMS[chatType]) {
    return new Response(
      JSON.stringify({ error: 'Valid chatType required (whale or holder)' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const roomConfig = CHAT_ROOMS[chatType];

  // Check if user is admin (bypasses NFT requirement)
  const adminUserIds = env.CHAT_ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
  const isAdmin = adminUserIds.includes(auth.userId);

  // Validate wallet address (admins can bypass this requirement)
  if (!isAdmin && (!walletAddress || !isValidChiaAddress(walletAddress))) {
    return new Response(
      JSON.stringify({ error: 'Valid Chia wallet address required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // For admins without wallet, use 0 NFT count but allow access
    // For regular users, verify NFT count from MintGarden
    let nftCount = 0;
    if (walletAddress && isValidChiaAddress(walletAddress)) {
      // CRITICAL: Server-side verification of NFT count
      // Never trust client-provided counts (uses cache fallback if MintGarden unavailable)
      nftCount = await fetchWojakNftCount(walletAddress, env.DB);
    }

    // Check eligibility for requested room (admins bypass)
    if (!isAdmin && nftCount < roomConfig.minNfts) {
      return new Response(
        JSON.stringify({
          error: `Insufficient NFT holdings for ${roomConfig.label}`,
          nftCount,
          required: roomConfig.minNfts,
          neededMore: roomConfig.minNfts - nftCount,
          chatType,
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Create short-lived chat token with room info
    const { token, expiresAt } = await createChatToken(env.CHAT_JWT_SECRET, {
      userId: auth.userId,
      walletAddress: walletAddress || 'admin', // Use 'admin' placeholder for admins without wallet
      nftCount,
      isAdmin,
      chatType,
      roomName: roomConfig.roomName,
    });

    return new Response(
      JSON.stringify({
        token,
        expiresAt,
        userId: auth.userId,
        nftCount,
        isAdmin,
        chatType,
        roomName: roomConfig.roomName,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Chat Token] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to issue chat token' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
