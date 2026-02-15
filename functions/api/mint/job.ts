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

    const info = stepInfo(job.step, job.mint_type);

    // Map error_code to user-friendly message via MINT_ERROR_MESSAGES
    const errorDisplay = (job.step === 'failed' || job.step === 'refunded') && job.error_code
      ? (MINT_ERROR_MESSAGES[job.error_code as MintErrorCode] || job.error_message || info.label)
      : (job.step === 'failed' && job.error_message ? job.error_message : info.label);

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

    return jsonResponse({
      jobId: job.id,
      step: job.step,
      mintType: job.mint_type,
      stepLabel: errorDisplay,
      stepNumber: info.number,
      totalSteps: info.total,
      mintNumber: job.mint_number,
      offerFile: job.offer_file,
      launcherId,
      mintgardenUrl: launcherId ? `https://mintgarden.io/nfts/${launcherId}` : undefined,
      creditsSpent: job.credit_cost ? job.credit_cost / 100 : undefined,
      creditsRemaining,
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
