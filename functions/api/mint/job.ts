/**
 * Mint Job Status — GET /api/mint/job?id=<jobId>&wallet=<walletAddress>
 *
 * Polling endpoint. Returns current state of a mint job.
 * Frontend polls every 3s (processing) or 5s (awaiting_payment).
 */

import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
} from './_shared';
import { MINT_ERROR_MESSAGES, type MintErrorCode } from './errors';
import { checkRateLimit, getRateLimitKey, MINT_RATE_LIMITS } from '../../lib/rateLimit';
import { getMoveById } from '../../../src/lib/combat/data/moves';

interface Env {
  DB: D1Database;
}

interface JobRow {
  id: number;
  wallet_address: string;
  mint_type: string;
  step: string;
  mint_number: number | null;
  mintgarden_launcher_id: string | null;
  offer_file: string | null;
  error_message: string | null;
  error_code: string | null;
  credit_cost: number | null;
  credit_spend_id: number | null;
  created_at: string;
  expires_at: string | null;
}

/** Map server step to user-friendly label + step number */
function stepInfo(step: string, mintType: string): { label: string; number: number; total: number } {
  const total = mintType === 'paid' ? 6 : 5;
  switch (step) {
    case 'queued':            return { label: 'Preparing your mint...', number: 1, total };
    case 'validating':        return { label: 'Validating trait selections...', number: 1, total };
    case 'reserving_number':  return { label: 'Reserving your Wojak number...', number: 2, total };
    case 'uploading_ipfs':    return { label: 'Uploading artwork to IPFS...', number: 3, total };
    case 'mint_queued':       return { label: 'Waiting for a mint slot...', number: 4, total };
    case 'calling_mintgarden': return { label: 'Creating your NFT...', number: 4, total };
    case 'awaiting_payment':  return { label: 'Accept the offer in your wallet', number: 5, total };
    case 'finalizing':        return { label: 'Finalizing your mint...', number: total, total };
    case 'completed':         return { label: 'Your Wojak has been minted!', number: total, total };
    case 'failed':            return { label: 'Mint failed', number: 0, total };
    case 'refunded':          return { label: 'Mint failed. Credits have been refunded.', number: 0, total };
    default:                  return { label: 'Processing...', number: 1, total };
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get('id');
  const wallet = url.searchParams.get('wallet');

  if (!jobId || !Number.isInteger(Number(jobId)) || Number(jobId) < 1) {
    return errorResponse('Missing or invalid job id', 400);
  }
  if (!wallet || !isValidChiaAddress(wallet)) {
    return errorResponse('Missing or invalid wallet', 400);
  }

  // Rate limit: 120 req/min per IP (polling endpoint)
  const rlKey = getRateLimitKey(request);
  const rlResult = await checkRateLimit(env.DB, rlKey, MINT_RATE_LIMITS.jobPoll);
  if (!rlResult.allowed) {
    return errorResponse('Too many requests. Please wait a moment.', 429);
  }

  try {
    const job = await env.DB.prepare(
      `SELECT id, wallet_address, mint_type, step, mint_number,
              mintgarden_launcher_id, offer_file, error_message, error_code,
              credit_cost, credit_spend_id, created_at, expires_at
       FROM mint_jobs WHERE id = ? AND wallet_address = ?`
    ).bind(Number(jobId), wallet).first<JobRow>();

    if (!job) {
      return errorResponse('Job not found', 404);
    }

    // Inline expiry: if awaiting_payment and past expires_at, mark as failed now.
    // This makes polling authoritative about expiry — no client/server mismatch.
    if (
      job.step === 'awaiting_payment' &&
      job.expires_at &&
      new Date(job.expires_at).getTime() < Date.now()
    ) {
      await env.DB.prepare(
        `UPDATE mint_jobs SET step = 'failed', error_message = 'Offer expired',
         error_code = 'OFFER_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
         WHERE id = ? AND step = 'awaiting_payment'`
      ).bind(job.id).run();
      job.step = 'failed';
      job.error_message = 'Offer expired';
      job.error_code = 'OFFER_EXPIRED';
    }

    // Queue position for mint_queued jobs
    let queuePosition: number | undefined;
    let queueTotal: number | undefined;
    if (job.step === 'mint_queued') {
      const posRow = await env.DB.prepare(
        "SELECT COUNT(*) AS position FROM mint_jobs WHERE step = 'mint_queued' AND created_at < ?"
      ).bind(job.created_at).first<{ position: number }>();
      const totalRow = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM mint_jobs WHERE step = 'mint_queued'"
      ).first<{ total: number }>();
      queuePosition = (posRow?.position ?? 0) + 1; // 1-indexed
      queueTotal = totalRow?.total ?? 0;
    }

    const info = stepInfo(job.step, job.mint_type);

    // Map error_code to user-friendly message via MINT_ERROR_MESSAGES
    const errorDisplay = (job.step === 'failed' || job.step === 'refunded') && job.error_code
      ? (MINT_ERROR_MESSAGES[job.error_code as MintErrorCode] || job.error_message || info.label)
      : (job.step === 'failed' && job.error_message ? job.error_message : info.label);

    // Dynamic step label for queue position
    const stepLabel = job.step === 'mint_queued' && queuePosition
      ? `You are #${queuePosition} in the mint queue`
      : errorDisplay;

    // For free mints, calculate credits remaining
    let creditsRemaining: number | undefined;
    if (job.mint_type === 'free' && (job.step === 'completed' || job.step === 'refunded')) {
      const balRow = await env.DB.prepare(
        `SELECT
          (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
          (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?) AS balance`
      ).bind(wallet, wallet).first<{ balance: number }>();
      creditsRemaining = balRow ? balRow.balance / 100 : undefined;
    }

    const launcherId = job.mintgarden_launcher_id;

    // Fetch combat identity for completed mints
    let combat: {
      type: string;
      nature: string;
      ability: string;
      moves: { id: string; name: string; power: number; accuracy: number; category: string; description: string }[];
    } | undefined;

    if (job.step === 'completed' && job.mint_number) {
      const fighterRow = await env.DB.prepare(
        `SELECT combat_type, nature, ability, move_1, move_2, move_3, move_4
         FROM combat_fighters WHERE edition_number = ?`
      ).bind(job.mint_number).first<{
        combat_type: string;
        nature: string;
        ability: string;
        move_1: string;
        move_2: string;
        move_3: string;
        move_4: string;
      }>();

      if (fighterRow) {
        const moveIds = [fighterRow.move_1, fighterRow.move_2, fighterRow.move_3, fighterRow.move_4];
        combat = {
          type: fighterRow.combat_type,
          nature: fighterRow.nature,
          ability: fighterRow.ability,
          moves: moveIds.map(id => {
            const move = getMoveById(id);
            return {
              id,
              name: move?.name || id,
              power: move?.power || 0,
              accuracy: move?.accuracy || 0,
              category: move?.category || 'physical',
              description: move?.description || '',
            };
          }),
        };
      }
    }

    return jsonResponse({
      jobId: job.id,
      step: job.step,
      mintType: job.mint_type,
      stepLabel: stepLabel,
      stepNumber: info.number,
      totalSteps: info.total,
      queuePosition,
      queueTotal,
      mintNumber: job.mint_number,
      offerFile: job.step === 'awaiting_payment' ? job.offer_file : undefined,
      launcherId,
      mintgardenUrl: launcherId ? `https://mintgarden.io/nfts/${launcherId}` : undefined,
      creditsSpent: job.credit_cost ? job.credit_cost / 100 : undefined,
      creditsRemaining,
      combat,
      error: job.step === 'failed' || job.step === 'refunded'
        ? (job.error_code ? (MINT_ERROR_MESSAGES[job.error_code as MintErrorCode] || job.error_message) : job.error_message)
        : undefined,
      creditsRefunded: job.step === 'refunded',
      createdAt: job.created_at,
      expiresAt: job.expires_at,
    });
  } catch (error) {
    console.error('[Mint Job] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
