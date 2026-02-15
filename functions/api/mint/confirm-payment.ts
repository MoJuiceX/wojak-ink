/**
 * Mint Confirm Payment — POST /api/mint/confirm-payment
 *
 * Called when a paid mint offer is accepted. Resumes the job from
 * 'awaiting_payment' to 'finalizing' → 'completed'.
 *
 * Verifies the launcher ID on MintGarden API (same pattern as confirm.ts).
 */

import { finalizeJob, type ProcessEnv } from './process';
import { logMintStep } from './auditHelper';
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
} from './_shared';
import { checkRateLimit, getRateLimitKey, MINT_RATE_LIMITS } from '../../lib/rateLimit';

interface Env extends ProcessEnv {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
}

interface AwaitingJobRow {
  id: number;
  wallet_address: string;
  mint_type: string;
  step: string;
  mint_number: number | null;
  mintgarden_launcher_id: string | null;
  offer_file: string | null;
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

  // Rate limit
  const rlKey = getRateLimitKey(request);
  const rlResult = await checkRateLimit(env.DB, rlKey, MINT_RATE_LIMITS.confirm, true);
  if (!rlResult.allowed) {
    return errorResponse('Too many requests. Please wait a moment.', 429);
  }

  let body: { jobId?: number; walletAddress?: string; launcherId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const jobId = body.jobId != null ? Number(body.jobId) : NaN;
  if (!Number.isInteger(jobId) || jobId < 1) {
    return errorResponse('Missing or invalid jobId', 400);
  }

  const callerWallet = body.walletAddress;
  if (!callerWallet || !isValidChiaAddress(callerWallet)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }

  const launcherId = body.launcherId;
  if (!launcherId || typeof launcherId !== 'string') {
    return errorResponse('Missing launcherId', 400);
  }

  try {
    // Load job in awaiting_payment state
    const job = await env.DB.prepare(
      `SELECT id, wallet_address, mint_type, step, mint_number,
              mintgarden_launcher_id, offer_file
       FROM mint_jobs WHERE id = ? AND wallet_address = ? AND step = 'awaiting_payment'`
    ).bind(jobId, callerWallet).first<AwaitingJobRow>();

    if (!job) {
      return errorResponse('Job not found or not awaiting payment', 404);
    }

    // Verify launcher ID on MintGarden
    try {
      const mgRes = await fetch(`https://api.mintgarden.io/nfts/${launcherId}`);
      if (!mgRes.ok) {
        return jsonResponse({
          success: false,
          pending: true,
          message: 'NFT not found on-chain yet. The offer may not have been accepted.',
        });
      }
      const nftData = await mgRes.json() as { owner_address?: { encoded_id?: string } };
      const onChainOwner = nftData?.owner_address?.encoded_id;
      if (onChainOwner && onChainOwner.toLowerCase() !== job.wallet_address.toLowerCase()) {
        return errorResponse('NFT owner does not match the minting wallet.', 403);
      }
    } catch (err) {
      console.warn('[Confirm Payment] MintGarden verification failed:', err);
      return jsonResponse({
        success: false,
        pending: true,
        message: 'Could not verify NFT on-chain. Please try again in a moment.',
      });
    }

    // Update job with verified launcher ID
    await env.DB.prepare(
      "UPDATE mint_jobs SET mintgarden_launcher_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(launcherId, jobId).run();

    // Finalize the mint
    await finalizeJob(env, jobId);

    // Reload job for response
    const finalJob = await env.DB.prepare(
      'SELECT mint_number, mintgarden_launcher_id, phase2_mint_id FROM mint_jobs WHERE id = ?'
    ).bind(jobId).first<{ mint_number: number; mintgarden_launcher_id: string; phase2_mint_id: number | null }>();

    return jsonResponse({
      success: true,
      mintNumber: finalJob?.mint_number,
      launcherId: finalJob?.mintgarden_launcher_id,
      mintgardenUrl: finalJob?.mintgarden_launcher_id
        ? `https://mintgarden.io/nfts/${finalJob.mintgarden_launcher_id}`
        : undefined,
    });
  } catch (error) {
    console.error('[Confirm Payment] Error:', error);
    try {
      const errMsg = error instanceof Error ? error.message : String(error);
      await logMintStep(env.DB, {
        mint_id: 0,
        step: 'confirm_payment_failed',
        status: 'failed',
        error: errMsg,
        data: { job_id: jobId },
      });
    } catch {
      // Audit failure must not break response
    }
    return errorResponse('Internal server error', 500);
  }
};
