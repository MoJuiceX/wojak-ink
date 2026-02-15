/**
 * Mint Job Cleanup — stale job expiry, credit refunds, retry.
 *
 * Exports cleanupStaleJobs() for use by cron.ts.
 * NOT an HTTP endpoint itself.
 */

import { processJob, type ProcessEnv } from './process';

interface CleanupEnv extends ProcessEnv {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
}

export async function cleanupStaleJobs(env: CleanupEnv): Promise<{
  expiredPaid: number;
  stuckProcessing: number;
  retriedQueued: number;
  refunded: number;
  expiredLegacy: number;
}> {
  const stats = {
    expiredPaid: 0,
    stuckProcessing: 0,
    retriedQueued: 0,
    refunded: 0,
    expiredLegacy: 0,
  };

  // 1. Expire jobs stuck in 'awaiting_payment' past their expires_at
  const expiredPaid = await env.DB.prepare(
    `UPDATE mint_jobs SET step = 'failed', error_message = 'Offer expired',
     error_code = 'OFFER_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
     WHERE step = 'awaiting_payment'
     AND expires_at IS NOT NULL AND expires_at < datetime('now')`
  ).run();
  stats.expiredPaid = expiredPaid.meta?.changes ?? 0;

  // 2. Fail jobs stuck in processing for more than 5 minutes (worker died)
  const stuckProcessing = await env.DB.prepare(
    `UPDATE mint_jobs SET step = 'failed', error_message = 'Processing timed out',
     error_code = 'TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
     WHERE step NOT IN ('completed', 'failed', 'refunded', 'awaiting_payment', 'queued')
     AND updated_at < datetime('now', '-5 minutes')`
  ).run();
  stats.stuckProcessing = stuckProcessing.meta?.changes ?? 0;

  // 3. Retry queued jobs that haven't been picked up in 30 seconds
  const staleQueued = await env.DB.prepare(
    `SELECT id FROM mint_jobs WHERE step = 'queued'
     AND created_at < datetime('now', '-30 seconds')
     AND retry_count < max_retries
     LIMIT 5`
  ).all<{ id: number }>();

  for (const row of (staleQueued.results || [])) {
    const imageBase64 = await env.MINT_JOBS_KV.get(`job-image:${row.id}`);
    if (imageBase64) {
      try {
        await processJob(env, row.id, imageBase64);
        stats.retriedQueued++;
      } catch (err) {
        console.error(`[Cleanup] Retry failed for job ${row.id}:`, err);
      }
    } else {
      // Image expired from KV — fail the job
      await env.DB.prepare(
        `UPDATE mint_jobs SET step = 'failed', error_message = 'Image data expired',
         error_code = 'IMAGE_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(row.id).run();
    }
  }

  // 4. Refund credits for failed free mint jobs that haven't been refunded yet
  const unrefunded = await env.DB.prepare(
    `SELECT id, credit_spend_id FROM mint_jobs
     WHERE step = 'failed' AND mint_type = 'free'
     AND credit_spend_id IS NOT NULL`
  ).all<{ id: number; credit_spend_id: number }>();

  for (const row of (unrefunded.results || [])) {
    await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?')
      .bind(row.credit_spend_id).run();
    await env.DB.prepare(
      "UPDATE mint_jobs SET step = 'refunded', credit_spend_id = NULL, updated_at = datetime('now') WHERE id = ?"
    ).bind(row.id).run();
    stats.refunded++;
  }

  // 5. Expire stale phase2_mints pending records (legacy backwards compat)
  const expiredLegacy = await env.DB.prepare(
    `UPDATE phase2_mints SET status = 'expired'
     WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
  ).run();
  stats.expiredLegacy = expiredLegacy.meta?.changes ?? 0;

  return stats;
}
