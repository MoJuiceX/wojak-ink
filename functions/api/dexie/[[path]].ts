/**
 * Dexie API Proxy
 * Proxies requests to api.dexie.space to avoid CORS issues in production
 */

type Env = Record<string, unknown>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, request } = context;

  // Get the path from the catch-all parameter
  const pathSegments = params.path as string[];
  const path = pathSegments ? pathSegments.join('/') : '';

  // Get query string from original request
  const url = new URL(request.url);
  const queryString = url.search;

  // Build the Dexie URL
  const dexieUrl = `https://api.dexie.space/${path}${queryString}`;

  try {
    // Forward the request to Dexie
    const response = await fetch(dexieUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'wojak.ink/1.0',
      },
    });

    // Get the response body
    const data = await response.text();

    // Return with CORS headers
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://wojak.ink',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch from Dexie' }), {
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
