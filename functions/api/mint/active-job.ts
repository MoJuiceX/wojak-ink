/**
 * Active Job — GET /api/mint/active-job?wallet=<walletAddress>
 *
 * Returns the active (locked) mint job for a wallet, if any.
 * Used for page-reload recovery: frontend checks on mount and
 * resumes polling if a job is found.
 */

import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
} from './_shared';

interface Env {
  DB: D1Database;
}

interface ActiveJobRow {
  id: number;
  step: string;
  mint_type: string;
  mint_number: number | null;
  offer_file: string | null;
  mintgarden_launcher_id: string | null;
  error_message: string | null;
  credit_cost: number | null;
  created_at: string;
  expires_at: string | null;
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
  const wallet = url.searchParams.get('wallet');

  if (!wallet || !isValidChiaAddress(wallet)) {
    return errorResponse('Missing or invalid wallet', 400);
  }

  try {
    const job = await env.DB.prepare(
      `SELECT id, step, mint_type, mint_number, offer_file,
              mintgarden_launcher_id, error_message, credit_cost,
              created_at, expires_at
       FROM mint_jobs
       WHERE wallet_address = ? AND wallet_lock IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`
    ).bind(wallet).first<ActiveJobRow>();

    if (!job) {
      return jsonResponse({ job: null });
    }

    return jsonResponse({
      job: {
        jobId: job.id,
        step: job.step,
        mintType: job.mint_type,
        mintNumber: job.mint_number,
        offerFile: job.offer_file,
        launcherId: job.mintgarden_launcher_id,
        error: job.error_message,
        creditCost: job.credit_cost ? job.credit_cost / 100 : undefined,
        createdAt: job.created_at,
        expiresAt: job.expires_at,
      },
    });
  } catch (error) {
    console.error('[Active Job] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
