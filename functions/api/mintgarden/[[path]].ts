/**
 * MintGarden API Proxy
 * Proxies requests to api.mintgarden.io to avoid CORS issues in production
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

  // Build the MintGarden URL
  const mintgardenUrl = `https://api.mintgarden.io/${path}${queryString}`;

  try {
    // Forward the request to MintGarden
    const response = await fetch(mintgardenUrl, {
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch from MintGarden' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
