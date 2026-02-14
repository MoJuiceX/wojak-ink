/**
 * Debug endpoint to check auth token
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface Env {
  CLERK_DOMAIN: string;
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return atob(padded);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || null;

  if (!token) {
    return new Response(
      JSON.stringify({ 
        error: 'No token provided',
        clerkDomain: env.CLERK_DOMAIN || 'NOT SET'
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    // Decode token without verification
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    return new Response(
      JSON.stringify({
        clerkDomain: env.CLERK_DOMAIN || 'NOT SET',
        expectedIssuer: `https://${env.CLERK_DOMAIN}`,
        tokenIssuer: payload.iss,
        tokenSubject: payload.sub,
        tokenExpires: new Date(payload.exp * 1000).toISOString(),
        issuerMatch: payload.iss === `https://${env.CLERK_DOMAIN}`,
        header,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to decode token',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 200, headers: corsHeaders }
    );
  }
};
