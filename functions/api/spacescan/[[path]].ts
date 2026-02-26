/**
 * SpaceScan API Proxy
 * Proxies requests to api.spacescan.io to avoid CORS issues in production
 */

type Env = Record<string, unknown>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params } = context;

  // Get the path from the catch-all parameter
  const pathSegments = params.path as string[];
  const path = pathSegments ? pathSegments.join('/') : '';

  // Build the SpaceScan URL
  const spacescanUrl = `https://api.spacescan.io/${path}`;

  try {
    // Forward the request to SpaceScan
    const response = await fetch(spacescanUrl, {
      method: context.request.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'wojak.ink/1.0',
      },
    });

    // Get the response body
    const data = await response.text();

    // Only cache successful responses — NEVER cache 429/5xx errors.
    // Caching error responses causes the browser to serve stale 429s for minutes,
    // making retries useless and blocking all API calls until the cache expires.
    const cacheHeader = response.status >= 200 && response.status < 400
      ? 'public, max-age=300' // Cache successful responses for 5 minutes
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
    return new Response(JSON.stringify({ error: 'Failed to fetch from SpaceScan' }), {
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
