/**
 * SpaceScan API Proxy
 * Proxies requests to api.spacescan.io to avoid CORS issues in production.
 *
 * Uses Cloudflare's Cache API for edge caching:
 *   - Successful responses (2xx/3xx) are cached at the edge for 5 minutes.
 *   - All users share the same edge cache, so SpaceScan is only called
 *     once per 5 minutes per unique URL — no matter how many visitors.
 *   - Error responses (429, 5xx) are NEVER cached.
 */

type Env = {
  SPACESCAN_API_KEY?: string;
};

const EDGE_CACHE_TTL = 300; // 5 minutes (seconds)

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, request, env } = context;

  // Only proxy GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // Get the path from the catch-all parameter
  const pathSegments = params.path as string[];
  const path = pathSegments ? pathSegments.join('/') : '';
  const queryString = new URL(request.url).search;

  // ── Edge Cache: check first ──────────────────────────────────────
  // Use the incoming request URL as the cache key (includes path + query).
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cache = caches.default;

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      // Clone so we can add our own header without mutating the stored copy.
      const hit = new Response(cached.body, cached);
      hit.headers.set('X-Cache', 'HIT');
      return hit;
    }
  } catch {
    // Cache API unavailable (e.g. local dev) — fall through to origin.
  }

  // ── Origin fetch ─────────────────────────────────────────────────
  const spacescanUrl = `https://api.spacescan.io/${path}${queryString}`;

  try {
    const spacescanApiKey = typeof env.SPACESCAN_API_KEY === 'string' ? env.SPACESCAN_API_KEY.trim() : '';
    const originHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'wojak.ink/1.0',
    };
    if (spacescanApiKey) {
      originHeaders['x-api-key'] = spacescanApiKey;
    }

    const response = await fetch(spacescanUrl, {
      headers: originHeaders,
    });

    const data = await response.text();
    const ok = response.status >= 200 && response.status < 400;

    const headers: Record<string, string> = {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      ...corsHeaders(),
      'Cache-Control': ok
        ? `public, max-age=${EDGE_CACHE_TTL}` // Browser + CDN cache
        : 'no-store, no-cache',               // Never cache errors
      'X-Cache': 'MISS',
    };

    const freshResponse = new Response(data, {
      status: response.status,
      headers,
    });

    // ── Edge Cache: store successful responses ────────────────────
    if (ok) {
      try {
        // waitUntil keeps the function alive while the cache write completes,
        // but doesn't block the response to the user.
        context.waitUntil(cache.put(cacheKey, freshResponse.clone()));
      } catch {
        // Cache write failed — not critical, next request will try again.
      }
    }

    return freshResponse;
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch from SpaceScan' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
        'Cache-Control': 'no-store, no-cache',
      },
    });
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders() });
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': 'https://wojak.ink',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
