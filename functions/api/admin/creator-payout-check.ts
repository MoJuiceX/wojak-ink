/**
 * Admin: Creator Payout Check — GET /api/admin/creator-payout-check
 *
 * Verifies CREATOR_PAYOUT_ADDRESS and TREASURY_ADDRESS are set, returns short
 * suffixes only (no full addresses), and whether they match (same value).
 * Use this to confirm primary-sale XCH and treasury are the same wallet.
 *
 * Requires: Authorization: Bearer <ADMIN_SECRET>
 */

interface Env {
  ADMIN_SECRET?: string;
  CREATOR_PAYOUT_ADDRESS?: string;
  TREASURY_ADDRESS?: string;
}

const CORS = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization',
  'Content-Type': 'application/json',
};

function suffix6(val: string | undefined): string | null {
  const raw = val?.trim();
  return raw && raw.length >= 6 ? raw.slice(-6) : null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: CORS,
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: CORS,
    });
  }

  const creatorPayout = env.CREATOR_PAYOUT_ADDRESS?.trim();
  const treasury = env.TREASURY_ADDRESS?.trim();
  const match = !!creatorPayout && !!treasury && creatorPayout === treasury;

  return new Response(
    JSON.stringify({
      CREATOR_PAYOUT_ADDRESS: {
        configured: !!creatorPayout && creatorPayout.length > 0,
        suffix: suffix6(env.CREATOR_PAYOUT_ADDRESS),
      },
      TREASURY_ADDRESS: {
        configured: !!treasury && treasury.length > 0,
        suffix: suffix6(env.TREASURY_ADDRESS),
      },
      sameAddress: match,
      hint: match
        ? 'CREATOR_PAYOUT_ADDRESS and TREASURY_ADDRESS are the same. Primary-sale XCH and royalty share go to one wallet.'
        : 'If you want both to be the same, set CREATOR_PAYOUT_ADDRESS to the same value as TREASURY_ADDRESS (or leave CREATOR_PAYOUT unset and code uses TREASURY_ADDRESS for paid mints).',
    }),
    { headers: CORS }
  );
};
