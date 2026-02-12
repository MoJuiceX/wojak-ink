/**
 * Mint Confirm API — /api/mint/confirm
 *
 * POST body: { mintId: number, walletAddress: string, launcherId?: string }
 *
 * Called by frontend after user accepts paid offer. Verifies wallet ownership,
 * updates status to minted, and increments trait_usage.
 *
 * AUDIT FIX: mint_number is now assigned at prepare time (so IPFS metadata
 * name is correct). This endpoint no longer assigns a new number — it only
 * transitions status from 'pending' to 'minted'. Added walletAddress
 * verification to prevent unauthorized confirmation.
 */

import { logMintStep } from './auditHelper';

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
  mint_number: number | null;
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

  let body: { mintId?: number; walletAddress?: string; launcherId?: string };
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

  const callerWallet = body.walletAddress;

  try {
    const row = await env.DB.prepare(
      `SELECT id, mint_number, wallet_address, mint_type, layers_json, mintgarden_launcher_id
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

    // Verify caller owns this mint (prevent unauthorized confirmation)
    if (callerWallet && callerWallet !== row.wallet_address) {
      return new Response(JSON.stringify({ error: 'Wallet address does not match this mint' }), {
        status: 403,
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

    // mint_number was already assigned at prepare time — use it directly
    const mintNumber = row.mint_number;

    // Increment trait usage
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

    // Update status to minted
    await env.DB.prepare(
      `UPDATE phase2_mints
       SET status = 'minted', minted_at = datetime('now'),
           mintgarden_launcher_id = ?, payment_verified = 1
       WHERE id = ?`
    )
      .bind(launcherId, mintId)
      .run();

    await logMintStep(env.DB, {
      mint_id: mintId,
      step: 'paid_mint_confirmed',
      status: 'completed',
      data: { mint_number: mintNumber, launcher_id: launcherId, wallet: row.wallet_address },
    });

    return new Response(
      JSON.stringify({
        success: true,
        mintNumber,
        launcherId,
        mintgardenUrl: `https://mintgarden.io/nfts/${launcherId}`,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Mint Confirm] Error:', error);
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logMintStep(env.DB, {
        mint_id: mintId || 0,
        step: 'confirm_failed',
        status: 'failed',
        error: errorMessage,
      });
    } catch {
      // Audit logging failure must not break error response
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
