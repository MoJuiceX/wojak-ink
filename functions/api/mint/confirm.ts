/**
 * Mint Confirm API — /api/mint/confirm
 *
 * POST { mint_id: number, wallet: string }
 *
 * Called after the user accepts a paid offer in Sage Wallet.
 * Verifies the NFT exists on-chain via MintGarden, then finalizes:
 *   - Sets status to 'minted'
 *   - Increments trait usage counters
 *   - Returns congratulations data
 *
 * For free mints, confirmation happens automatically in the prepare endpoint.
 * This endpoint is only for paid mints that require offer acceptance.
 *
 * Response (success): { mint_number, nft_name, status: "minted" }
 * Response (pending): { status: "pending", retry: true, seconds_remaining }
 * Response (expired): { status: "expired", error: "..." }
 */

interface Env {
  DB: D1Database;
  MINTGARDEN_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const MINTGARDEN_API = 'https://api.mintgarden.io';

interface MintRow {
  id: number;
  mint_number: number;
  wallet_address: string;
  layers_json: string;
  colors_json: string;
  mint_type: string;
  mintgarden_launcher_id: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
}

/**
 * Check if an NFT exists on-chain via MintGarden.
 * Returns true if the NFT launcher_id resolves to a minted NFT.
 */
async function verifyOnChain(
  launcherId: string,
  apiKey: string
): Promise<{ confirmed: boolean; nftData?: Record<string, unknown> }> {
  try {
    const response = await fetch(`${MINTGARDEN_API}/nfts/${launcherId}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 404) {
      return { confirmed: false };
    }

    if (!response.ok) {
      console.warn(
        `[Mint Confirm] MintGarden verification returned ${response.status} for ${launcherId}`
      );
      return { confirmed: false };
    }

    const data = (await response.json()) as Record<string, unknown>;

    // If we get a valid response with data, the NFT exists on-chain
    if (data && (data.id || data.encoded_id)) {
      return { confirmed: true, nftData: data };
    }

    return { confirmed: false };
  } catch (error) {
    console.error('[Mint Confirm] On-chain verification error:', error);
    return { confirmed: false };
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'Service not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  // ── Parse input ──
  let body: { mint_id?: number; wallet?: string };
  try {
    body = (await request.json()) as { mint_id?: number; wallet?: string };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { mint_id: mintId, wallet } = body;

  if (!mintId || typeof mintId !== 'number') {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid mint_id' }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (!wallet || !wallet.startsWith('xch1')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid wallet address' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // ── Look up the mint row ──
    const mint = await env.DB
      .prepare(
        `SELECT id, mint_number, wallet_address, layers_json, colors_json,
                mint_type, mintgarden_launcher_id, status, expires_at, created_at
         FROM phase2_mints
         WHERE id = ? AND wallet_address = ?`
      )
      .bind(mintId, wallet)
      .first<MintRow>();

    if (!mint) {
      return new Response(
        JSON.stringify({ error: 'Mint not found for this wallet' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // ── Already confirmed ──
    if (mint.status === 'minted') {
      const paddedNumber = String(mint.mint_number).padStart(4, '0');
      return new Response(
        JSON.stringify({
          mint_number: mint.mint_number,
          nft_name: `Your Wojak #${paddedNumber}`,
          status: 'minted',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Check for expired status ──
    if (mint.status === 'expired' || mint.status === 'failed') {
      return new Response(
        JSON.stringify({
          status: mint.status,
          error: `This mint has ${mint.status}. Please create a new mint.`,
        }),
        { status: 410, headers: corsHeaders }
      );
    }

    // ── Check if offer has expired by time ──
    if (mint.expires_at) {
      const expiresAt = new Date(mint.expires_at).getTime();
      const now = Date.now();

      if (now > expiresAt) {
        // Mark as expired
        await env.DB
          .prepare(`UPDATE phase2_mints SET status = 'expired' WHERE id = ?`)
          .bind(mintId)
          .run();

        return new Response(
          JSON.stringify({
            status: 'expired',
            error: 'Offer has expired. Your design is saved — try again when ready.',
          }),
          { status: 410, headers: corsHeaders }
        );
      }

      // Calculate seconds remaining for the client
      const secondsRemaining = Math.ceil((expiresAt - now) / 1000);

      // ── Verify on-chain via MintGarden ──
      if (mint.mintgarden_launcher_id && env.MINTGARDEN_API_KEY) {
        const verification = await verifyOnChain(
          mint.mintgarden_launcher_id,
          env.MINTGARDEN_API_KEY
        );

        if (!verification.confirmed) {
          // Not yet on-chain — tell client to retry
          return new Response(
            JSON.stringify({
              status: 'pending',
              retry: true,
              seconds_remaining: secondsRemaining,
              message: 'Waiting for on-chain confirmation. Please accept the offer in Sage Wallet.',
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        // NFT confirmed on-chain! Finalize the mint.
      } else if (!mint.mintgarden_launcher_id) {
        // No launcher_id yet — still waiting
        return new Response(
          JSON.stringify({
            status: 'pending',
            retry: true,
            seconds_remaining: secondsRemaining,
            message: 'Mint is still being prepared.',
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // ── Finalize the mint ──
    // Parse layers for trait usage
    let layers: Record<string, string> = {};
    try {
      layers = JSON.parse(mint.layers_json);
    } catch {
      // If JSON is malformed, skip trait tracking
    }

    // Build batch: update status + increment trait usage
    const batchStatements: D1PreparedStatement[] = [];

    // 1. Mark as minted
    batchStatements.push(
      env.DB
        .prepare(
          `UPDATE phase2_mints
           SET status = 'minted', minted_at = datetime('now')
           WHERE id = ? AND status = 'pending'`
        )
        .bind(mintId)
    );

    // 2. Increment trait usage for all traits
    for (const [category, traitName] of Object.entries(layers)) {
      if (!traitName || traitName === 'none' || traitName === '') continue;
      batchStatements.push(
        env.DB
          .prepare(
            `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
             VALUES (?, ?, 1, datetime('now'))
             ON CONFLICT(trait_category, trait_name)
             DO UPDATE SET usage_count = usage_count + 1, updated_at = datetime('now')`
          )
          .bind(category, traitName)
      );
    }

    const batchResults = await env.DB.batch(batchStatements);

    // Check if the update actually changed a row (prevents double-confirm)
    const updateResult = batchResults[0];
    if (updateResult && updateResult.meta && updateResult.meta.changes === 0) {
      // Row wasn't updated — likely already minted or expired between checks
      const freshMint = await env.DB
        .prepare('SELECT status, mint_number FROM phase2_mints WHERE id = ?')
        .bind(mintId)
        .first<{ status: string; mint_number: number }>();

      if (freshMint?.status === 'minted') {
        const paddedNumber = String(freshMint.mint_number).padStart(4, '0');
        return new Response(
          JSON.stringify({
            mint_number: freshMint.mint_number,
            nft_name: `Your Wojak #${paddedNumber}`,
            status: 'minted',
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Mint could not be confirmed', status: freshMint?.status }),
        { status: 409, headers: corsHeaders }
      );
    }

    const paddedNumber = String(mint.mint_number).padStart(4, '0');
    const nftName = `Your Wojak #${paddedNumber}`;

    console.log(`[Mint Confirm] #${paddedNumber} confirmed for ${wallet.slice(0, 12)}...`);

    return new Response(
      JSON.stringify({
        mint_number: mint.mint_number,
        nft_name: nftName,
        status: 'minted',
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Confirm] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
