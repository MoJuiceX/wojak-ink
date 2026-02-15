/**
 * Mint Confirm Payment — POST /api/mint/confirm-payment
 *
 * Called when a paid mint offer is accepted. Resumes the job from
 * 'awaiting_payment' to 'finalizing' → 'completed'.
 *
 * launcherId is OPTIONAL. Two modes:
 *   1. With launcherId: verify it directly on MintGarden, then finalize.
 *   2. Without launcherId: auto-detect the NFT by querying MintGarden for
 *      recent mints to this wallet, matching by edition_number.
 *      If not found yet, return { pending: true } — frontend keeps polling.
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
  PHASE2_COLLECTION_UUID?: string;
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

/** MintGarden NFT item shape (subset of fields we need) */
interface MintGardenNftItem {
  id?: string;
  encoded_id?: string;
  data?: {
    edition_number?: number;
    metadata_json?: {
      edition?: number;
      edition_number?: number;
      name?: string;
    };
  };
  owner_address?: { encoded_id?: string };
}

/**
 * Verify a known launcherId on MintGarden.
 * Returns the verified launcherId, or null if not found/mismatch.
 * Throws on network errors (caller handles).
 */
async function verifyLauncherOnChain(
  launcherId: string,
  expectedWallet: string
): Promise<string | null> {
  const mgRes = await fetch(`https://api.mintgarden.io/nfts/${launcherId}`);
  if (!mgRes.ok) return null;

  const nftData = await mgRes.json() as { owner_address?: { encoded_id?: string } };
  const onChainOwner = nftData?.owner_address?.encoded_id;
  if (onChainOwner && onChainOwner.toLowerCase() !== expectedWallet.toLowerCase()) {
    return null; // Owner mismatch
  }
  return launcherId;
}

/**
 * Auto-detect the NFT for a paid mint by querying MintGarden for
 * recently minted NFTs owned by this wallet, matching by edition_number.
 * Returns the launcherId if found, or null if the NFT hasn't appeared yet.
 */
async function detectLauncherByWallet(
  walletAddress: string,
  mintNumber: number,
  collectionUuid: string
): Promise<string | null> {
  // MintGarden /address/{addr}/nfts returns NFTs owned by wallet.
  // We filter by collection_id if we have one, or scan recent items.
  let url = `https://api.mintgarden.io/address/${walletAddress}/nfts?type=owned`;
  if (collectionUuid) {
    url += `&collection_id=${collectionUuid}`;
  }

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'wojak.ink/1.0' },
  });
  if (!res.ok) return null;

  const data = await res.json() as { items?: MintGardenNftItem[] };
  const items = data.items || [];

  for (const item of items) {
    const editionNumber =
      item.data?.edition_number ??
      item.data?.metadata_json?.edition_number ??
      item.data?.metadata_json?.edition;

    if (editionNumber === mintNumber) {
      return item.encoded_id || item.id || null;
    }

    // Fallback: match by name pattern "Your Wojak #N"
    const name = item.data?.metadata_json?.name;
    if (name && name === `Your Wojak #${mintNumber}`) {
      return item.encoded_id || item.id || null;
    }
  }

  return null;
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

  // launcherId is optional — auto-detection kicks in when absent
  const providedLauncherId = body.launcherId && typeof body.launcherId === 'string'
    ? body.launcherId
    : null;

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

    // Resolve launcher ID: use provided, or stored from offer response, or auto-detect
    let verifiedLauncherId: string | null = null;

    // Pick the best launcher ID candidate:
    // 1. Caller-provided (e.g. from "I've already accepted" with manual ID)
    // 2. Stored on job from MintGarden offer response (offer.offered contains the NFT ID)
    const candidateLauncherId = providedLauncherId || job.mintgarden_launcher_id;

    try {
      if (candidateLauncherId) {
        // Verify the known launcher ID on-chain (confirms offer was accepted)
        verifiedLauncherId = await verifyLauncherOnChain(candidateLauncherId, job.wallet_address);
        if (!verifiedLauncherId) {
          return jsonResponse({
            success: false,
            pending: true,
            message: 'NFT not found on-chain yet. The offer may not have been accepted.',
          });
        }
      } else {
        // Fallback: no launcher ID known — auto-detect by querying wallet's NFTs
        if (job.mint_number != null) {
          verifiedLauncherId = await detectLauncherByWallet(
            job.wallet_address,
            job.mint_number,
            env.PHASE2_COLLECTION_UUID || ''
          );
        }

        if (!verifiedLauncherId) {
          return jsonResponse({
            success: false,
            pending: true,
            message: 'NFT not confirmed on-chain yet. We will detect it automatically.',
          });
        }
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
    ).bind(verifiedLauncherId, jobId).run();

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
