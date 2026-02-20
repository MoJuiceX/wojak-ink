/**
 * Rate Limiting for Cloudflare Workers
 *
 * Simple rate limiting using D1 database for distributed tracking.
 * Uses a single row per key with a count column (efficient for D1).
 * Falls back to allowing requests if D1 is unavailable.
 */

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Prefix for rate limit keys (e.g., 'chat-verify')
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and update rate limit for a given key
 * Uses user ID if authenticated, otherwise IP address
 *
 * failClosed: if true, deny requests when DB is unavailable (use for mint endpoints)
 */
export async function checkRateLimit(
  db: D1Database | undefined,
  key: string,
  config: RateLimitConfig,
  failClosed = false
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + config.windowMs;
  const windowStartDate = new Date(now - config.windowMs).toISOString();
  const nowDate = new Date(now).toISOString();

  // If no database, behavior depends on failClosed flag
  if (!db) {
    if (failClosed) {
      console.error('[RateLimit] DB unavailable — denying request (fail closed)');
      return { allowed: false, remaining: 0, resetAt };
    }
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  const rateLimitKey = `${config.keyPrefix}:${key}`;

  try {
    // Get current rate limit state
    const existing = await db.prepare(
      `SELECT count, timestamp FROM rate_limits WHERE key = ?`
    ).bind(rateLimitKey).first<{ count: number; timestamp: string }>();

    // Check if window has expired (timestamp is stored as ISO datetime string)
    const windowExpired = !existing || existing.timestamp < windowStartDate;
    const currentCount = windowExpired ? 0 : existing.count;

    if (currentCount >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Upsert: reset count if window expired, otherwise increment
    await db.prepare(`
      INSERT INTO rate_limits (key, count, timestamp)
      VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN timestamp < ? THEN 1 ELSE count + 1 END,
        timestamp = CASE WHEN timestamp < ? THEN ? ELSE timestamp END
    `).bind(rateLimitKey, nowDate, windowStartDate, windowStartDate, nowDate).run();

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt,
    };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    if (failClosed) {
      return { allowed: false, remaining: 0, resetAt };
    }
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }
}

/**
 * Get rate limit key from request
 * Prefers user ID from auth, falls back to IP
 */
export function getRateLimitKey(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // CF-Connecting-IP is set by Cloudflare and cannot be spoofed by clients.
  // X-Forwarded-For is client-controllable — never use it for rate limiting.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt / 1000).toString(),
  };
}

// Pre-configured rate limits for chat endpoints
export const CHAT_RATE_LIMITS = {
  verifyEligibility: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 10,      // 10 requests per minute
    keyPrefix: 'chat-verify',
  },
  token: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 10,      // 10 token requests per minute (was 5 - too aggressive for normal use)
    keyPrefix: 'chat-token',
  },
  presence: {
    windowMs: 10 * 1000,  // 10 seconds
    maxRequests: 30,      // 30 requests per 10 seconds (for polling)
    keyPrefix: 'chat-presence',
  },
} as const;

// Rate limits for mint endpoints
export const MINT_RATE_LIMITS = {
  /** Per-wallet: 5 submit attempts per minute (each user gets their own quota) */
  prepare: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'mint-prepare',
  },
  /** Per-IP cap: 30 submit requests per minute (prevents one IP from exhausting with many wallets) */
  prepareByIP: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'mint-prepare-ip',
  },
  confirm: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 10,       // 10 confirm attempts per minute per wallet/IP
    keyPrefix: 'mint-confirm',
  },
  jobPoll: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 120,      // 120 req/min per IP (frontend polls every 3s = 20/min; headroom for multi-tab)
    keyPrefix: 'mint-job',
  },
} as const;

// Rate limits for game endpoints
export const GAME_RATE_LIMITS = {
  vote: {
    windowMs: 60_000,
    maxRequests: 20,
    keyPrefix: 'game-vote',
  },
  register: {
    windowMs: 300_000,
    maxRequests: 3,
    keyPrefix: 'game-register',
  },
  burn: {
    windowMs: 60_000,
    maxRequests: 5,
    keyPrefix: 'game-burn',
  },
  verifyPhase1: {
    windowMs: 300_000,
    maxRequests: 20,
    keyPrefix: 'game-verify',
  },
  battleQueue: {
    windowMs: 60_000,
    maxRequests: 10,
    keyPrefix: 'game-bq',
  },
  linkDid: {
    windowMs: 300_000,
    maxRequests: 5,
    keyPrefix: 'game-link-did',
  },
} as const;
