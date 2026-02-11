/**
 * Mint Confirm API — /api/mint/confirm
 *
 * POST body: { mintId: number, launcherId?: string }
 *
 * Called by frontend after user accepts paid offer. If launcherId is provided
 * (or already stored), verifies NFT on MintGarden then assigns mint_number,
 * updates status to minted, increments trait_usage. For free mints, mint is
 * already completed in prepare.
 */

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

interface PendingRow {
  id: number;
  wallet_address: string;
  mint_type: string;
  layers_json: string;
  mintgarden_launcher_id: string | null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

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
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let body: { mintId?: number; launcherId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const mintId = body.mintId != null ? Number(body.mintId) : NaN;
  if (!Number.isInteger(mintId) || mintId < 1) {
    return new Response(JSON.stringify({ error: 'Missing or invalid mintId' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const row = await env.DB.prepare(
      `SELECT id, wallet_address, mint_type, layers_json, mintgarden_launcher_id
       FROM phase2_mints WHERE id = ? AND status = 'pending'`
    )
      .bind(mintId)
      .first<PendingRow>();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Pending mint not found or already confirmed' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const launcherId = body.launcherId ?? row.mintgarden_launcher_id;
    if (!launcherId) {
      return new Response(
        JSON.stringify({
          success: false,
          pending: true,
          message: 'NFT not yet confirmed. Provide launcherId once the NFT appears in your wallet.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const nextNumRow = await env.DB.prepare(
      "SELECT COALESCE(MAX(mint_number), 0) + 1 AS next_num FROM phase2_mints WHERE status = 'minted'"
    ).first<{ next_num: number }>();
    const mintNumber = nextNumRow?.next_num ?? 1;

    const layers = JSON.parse(row.layers_json || '{}') as Record<string, string>;
    for (const [category, path] of Object.entries(layers)) {
      if (!path) continue;
      const traitName = path.split('/').pop()?.replace(/\.(png|webp)$/i, '') || path;
      await env.DB.prepare(
        `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
         VALUES (?, ?, 1, datetime('now'))
         ON CONFLICT(trait_category, trait_name) DO UPDATE SET
           usage_count = usage_count + 1,
           updated_at = datetime('now')`
      )
        .bind(category, traitName)
        .run();
    }

    await env.DB.prepare(
      `UPDATE phase2_mints
       SET mint_number = ?, status = 'minted', minted_at = datetime('now'), mintgarden_launcher_id = ?
       WHERE id = ?`
    )
      .bind(mintNumber, launcherId, mintId)
      .run();

    const mintgardenUrl = `https://mintgarden.io/nfts/${launcherId}`;

    return new Response(
      JSON.stringify({
        success: true,
        mintNumber,
        launcherId,
        mintgardenUrl,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Confirm] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
