/**
 * Cloudflare Pages Function - /api/me
 *
 * Returns the authenticated user's ID.
 * Requires valid Clerk JWT token in Authorization header.
 */

import { authenticateRequest } from '../lib/auth';

interface Env {
  // Clerk domain for JWT verification
  // Set in Cloudflare Pages: Settings > Environment Variables
  // Example: "your-app.clerk.accounts.dev"
  CLERK_DOMAIN: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  // Check if Clerk is configured
  if (!env.CLERK_DOMAIN) {
    return new Response(
      JSON.stringify({ error: 'Auth not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Authenticate request
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);

  if (!auth) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: corsHeaders }
    );
  }

  // Return user info
  return new Response(
    JSON.stringify({
      userId: auth.userId,
      // Include additional claims if needed
      // email: auth.payload.email,
    }),
    { status: 200, headers: corsHeaders }
  );
};
