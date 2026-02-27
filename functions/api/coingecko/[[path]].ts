/**
 * CoinGecko API Proxy
 * Proxies requests to api.coingecko.com to avoid CORS issues in production.
 *
 * Uses Cloudflare's Cache API for edge caching:
 *   - Successful responses cached at the edge for 15 minutes.
 *   - All users share the same edge cache — CoinGecko called once per
 *     15 minutes per unique URL (conserves demo API key: 10k calls/month).
 *   - Error responses (429, 5xx) are NEVER cached.
 */

interface Env {
  COINGECKO_API_KEY?: string;
}

const EDGE_CACHE_TTL = 900; // 15 minutes (seconds)

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

  // ── Edge Cache: check first ──────────────────────────────────────
  // Use the incoming request URL as the cache key (path + query, minus
  // the API key which gets appended below for the upstream call only).
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cache = caches.default;

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set('X-Cache', 'HIT');
      return hit;
    }
  } catch {
    // Cache API unavailable (e.g. local dev) — fall through to origin.
  }

  // ── Origin fetch ─────────────────────────────────────────────────
  // Append demo API key (if set) to the upstream URL only — not the cache key.
  const url = new URL(request.url);
  if (env.COINGECKO_API_KEY) {
    url.searchParams.set('x_cg_demo_api_key', env.COINGECKO_API_KEY);
  }
  const queryString = url.search;
  const coingeckoUrl = `https://api.coingecko.com/${path}${queryString}`;

  try {
    const response = await fetch(coingeckoUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'wojak.ink/1.0',
      },
    });

    const data = await response.text();
    const ok = response.status >= 200 && response.status < 400;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      'Cache-Control': ok
        ? `public, max-age=${EDGE_CACHE_TTL}`
        : 'no-store, no-cache',
      'X-Cache': 'MISS',
    };

    const freshResponse = new Response(data, {
      status: response.status,
      headers,
    });

    // ── Edge Cache: store successful responses ────────────────────
    if (ok) {
      try {
        context.waitUntil(cache.put(cacheKey, freshResponse.clone()));
      } catch {
        // Cache write failed — not critical.
      }
    }

    return freshResponse;
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch from CoinGecko' }), {
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
