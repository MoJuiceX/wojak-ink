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
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
} from './_shared';

interface Env {
  DB: D1Database;
}

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
    return optionsResponse();
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  if (!env.DB) {
    return errorResponse('Service not configured', 500);
  }

  let body: { mintId?: number; walletAddress?: string; launcherId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const mintId = body.mintId != null ? Number(body.mintId) : NaN;
  if (!Number.isInteger(mintId) || mintId < 1) {
    return errorResponse('Missing or invalid mintId', 400);
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
      return errorResponse('Pending mint not found or already confirmed', 404);
    }

    // Verify caller owns this mint (prevent unauthorized confirmation)
    if (callerWallet && callerWallet !== row.wallet_address) {
      return errorResponse('Wallet address does not match this mint', 403);
    }

    const launcherId = body.launcherId ?? row.mintgarden_launcher_id;
    if (!launcherId) {
      return jsonResponse({
        success: false,
        pending: true,
        message: 'NFT not yet confirmed. Provide launcherId once the NFT appears in your wallet.',
      });
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

    return jsonResponse({
      success: true,
      mintNumber,
      launcherId,
      mintgardenUrl: `https://mintgarden.io/nfts/${launcherId}`,
    });
  } catch (error) {
    console.error('[Mint Confirm] Error:', error);
    try {
      const errMsg = error instanceof Error ? error.message : String(error);
      await logMintStep(env.DB, {
        mint_id: mintId || 0,
        step: 'confirm_failed',
        status: 'failed',
        error: errMsg,
      });
    } catch {
      // Audit logging failure must not break error response
    }
    return errorResponse('Internal server error', 500);
  }
};
