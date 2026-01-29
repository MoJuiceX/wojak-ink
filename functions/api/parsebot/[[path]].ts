/**
 * Parse.bot API Proxy
 * Proxies requests to api.parse.bot to avoid CORS issues in production
 */

interface Env {
  PARSEBOT_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, request, env } = context;

  // Check if API key is configured
  if (!env.PARSEBOT_API_KEY) {
    return new Response(JSON.stringify({
      error: 'Parse.bot API key not configured',
      fallback: true,
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Get the path from the catch-all parameter
  const pathSegments = params.path as string[];
  const path = pathSegments ? pathSegments.join('/') : '';

  // Build the Parse.bot URL
  const parsebotUrl = `https://api.parse.bot/${path}`;

  try {
    // Get request body for POST requests
    let body = null;
    if (request.method === 'POST') {
      body = await request.text();
    }

    // Forward the request to Parse.bot
    const response = await fetch(parsebotUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'wojak.ink/1.0',
        'x-api-key': env.PARSEBOT_API_KEY || '',
      },
      body: body,
    });

    // Get the response body
    const data = await response.text();

    // Return with CORS headers
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch from Parse.bot' }), {
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
