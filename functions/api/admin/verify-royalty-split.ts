/**
 * Admin: Verify Royalty Split — GET /api/admin/verify-royalty-split
 *
 * Returns all minted Your Wojak NFTs with launcher_id, creator wallet, and the
 * expected SplitXCH splitter address (from splitter_addresses). Used by
 * scripts/verify-split-on-mints.ts to prove that every mint has the xchsplit.com
 * split set as royalty_address on-chain (via MintGarden NFT detail).
 *
 * Requires: Authorization: Bearer <ADMIN_SECRET>
 */

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface Row {
  mint_number: number;
  mintgarden_launcher_id: string | null;
  wallet_address: string;
  splitter_address: string | null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT pm.mint_number, pm.mintgarden_launcher_id, pm.wallet_address,
              sa.splitter_address
       FROM phase2_mints pm
       LEFT JOIN splitter_addresses sa
         ON sa.creator_wallet = pm.wallet_address AND sa.wave = 1
       WHERE pm.status = 'minted'
         AND pm.mintgarden_launcher_id IS NOT NULL
       ORDER BY pm.mint_number ASC`
    ).all<Row>();

    const results = rows.results || [];
    const mints = results.map((r) => ({
      mintNumber: r.mint_number,
      launcherId: r.mintgarden_launcher_id,
      walletAddress: r.wallet_address,
      expectedSplitter: r.splitter_address,
    }));

    const withSplitter = mints.filter((m) => m.expectedSplitter != null).length;

    return new Response(
      JSON.stringify({
        mints,
        summary: {
          total: mints.length,
          withExpectedSplitter: withSplitter,
          missingSplitterInDb: mints.length - withSplitter,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[verify-royalty-split]', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
