/**
 * CoinGecko API Proxy
 * Proxies requests to api.coingecko.com to avoid CORS issues in production
 */

interface Env {
  COINGECKO_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, request, env } = context;

  // Get the path from the catch-all parameter
  const pathSegments = params.path as string[];
  const path = pathSegments ? pathSegments.join('/') : '';

  // Get query string from original request, append demo API key if available
  const url = new URL(request.url);
  if (env.COINGECKO_API_KEY) {
    url.searchParams.set('x_cg_demo_api_key', env.COINGECKO_API_KEY);
  }
  const queryString = url.search;

  // Build the CoinGecko URL
  const coingeckoUrl = `https://api.coingecko.com/${path}${queryString}`;

  try {
    // Forward the request to CoinGecko
    const response = await fetch(coingeckoUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'wojak.ink/1.0',
      },
    });

    // Get the response body
    const data = await response.text();

    // Only cache successful responses — NEVER cache 429/5xx errors.
    const cacheHeader = response.status >= 200 && response.status < 400
      ? 'public, max-age=900' // Cache successful responses for 15 minutes (demo API key: 10k calls/month)
      : 'no-store, no-cache'; // Never cache errors

    // Return with CORS headers
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://wojak.ink',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': cacheHeader,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch from CoinGecko' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://wojak.ink',
      },
    });
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://wojak.ink',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
