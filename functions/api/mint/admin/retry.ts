/**
 * Admin Retry — POST /api/mint/admin/retry
 *
 * Resets a failed mint job to mint_queued for re-processing.
 * Admin-only endpoint (requires ADMIN_SECRET).
 *
 * Body: { "jobId": 123 }
 *
 * Logic:
 *   - Only allows retry on `failed` or `refunded` jobs
 *   - If IPFS data exists → reset to `mint_queued` (skip re-upload)
 *   - If no IPFS data → reset to `queued` (full re-process)
 *   - Clears error_message, error_code, not_before
 *   - Sets wallet_lock = wallet_address (re-acquires per-wallet mutex)
 */

import { jsonResponse, errorResponse, optionsResponse } from '../_shared';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();

  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  // Require admin authentication
  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized - Admin access required', 401);
  }

  let body: { jobId?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const jobId = body.jobId;
  if (!jobId || !Number.isInteger(jobId) || jobId < 1) {
    return errorResponse('Missing or invalid jobId', 400);
  }

  try {
    const job = await env.DB.prepare(
      "SELECT id, step, mint_type, wallet_address FROM mint_jobs WHERE id = ?"
    ).bind(jobId).first<{ id: number; step: string; mint_type: string; wallet_address: string }>();

    if (!job) return errorResponse('Job not found', 404);

    if (!['failed', 'refunded'].includes(job.step)) {
      return errorResponse(`Job is in step '${job.step}', can only retry failed/refunded jobs`, 400);
    }

    // Check if IPFS data exists — if so, skip re-upload and go straight to mint_queued
    const hasIpfs = await env.DB.prepare(
      "SELECT ipfs_image_uris FROM mint_jobs WHERE id = ? AND ipfs_image_uris IS NOT NULL"
    ).bind(jobId).first();

    const newStep = hasIpfs ? 'mint_queued' : 'queued';

    // Backdate updated_at by 1 minute so the cleanup cron's 30-second threshold
    // is already satisfied — the job gets picked up on the very next cron tick
    // instead of sitting idle for 30+ seconds.
    await env.DB.prepare(
      `UPDATE mint_jobs SET step = ?, error_message = NULL, error_code = NULL,
       not_before = NULL, wallet_lock = wallet_address, updated_at = datetime('now', '-1 minute')
       WHERE id = ?`
    ).bind(newStep, jobId).run();

    return jsonResponse({ success: true, jobId, newStep });
  } catch (error) {
    console.error('[Admin Retry] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
