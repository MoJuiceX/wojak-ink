/**
 * Mint Job Cleanup — stale job expiry, credit refunds, IPFS unpin, retry,
 * auto-finalize paid mints, phantom mint detection, and absolute lock timeout.
 *
 * Exports cleanupStaleJobs() for use by cron.ts.
 * NOT an HTTP endpoint itself.
 */

import { processJob, finalizeJob, type ProcessEnv } from './process';
import { unpinFromIPFS, extractCidFromUri } from './uploadToIPFS';
import { markRefundNeeded, logMintStep } from './auditHelper';
import { detectLauncherByWallet } from './mintgardenVerify';

interface CleanupEnv extends ProcessEnv {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
  PINATA_JWT?: string;
  PHASE2_COLLECTION_UUID?: string;
}

export async function cleanupStaleJobs(env: CleanupEnv): Promise<{
  autoFinalized: number;
  expiredPaid: number;
  stuckProcessing: number;
  retriedQueued: number;
  refunded: number;
  expiredLegacy: number;
  unpinnedIPFS: number;
  paidRefundsFlagged: number;
  phantomFinalized: number;
  locksForceReleased: number;
}> {
  const stats = {
    autoFinalized: 0,
    expiredPaid: 0,
    stuckProcessing: 0,
    retriedQueued: 0,
    refunded: 0,
    expiredLegacy: 0,
    unpinnedIPFS: 0,
    paidRefundsFlagged: 0,
    phantomFinalized: 0,
    locksForceReleased: 0,
  };

  // 1. Auto-finalize paid mints where user accepted the offer but
  //    confirm-payment didn't complete (browser closed, network error, etc.).
  //    Runs BEFORE expiry so we don't expire jobs that actually got paid.
  const awaitingJobs = await env.DB.prepare(
    `SELECT id, wallet_address, mint_number FROM mint_jobs
     WHERE step = 'awaiting_payment' AND mint_type = 'paid'
     AND mintgarden_launcher_id IS NULL
     AND mint_number IS NOT NULL
     AND updated_at < datetime('now', '-30 seconds')
     LIMIT 5`
  ).all<{ id: number; wallet_address: string; mint_number: number }>();

  for (const row of (awaitingJobs.results || [])) {
    try {
      const launcherId = await detectLauncherByWallet(
        row.wallet_address,
        row.mint_number,
        env.PHASE2_COLLECTION_UUID || ''
      );
      if (launcherId) {
        await env.DB.prepare(
          "UPDATE mint_jobs SET mintgarden_launcher_id = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(launcherId, row.id).run();
        await finalizeJob(env, row.id);
        stats.autoFinalized++;
        console.warn(`[Cleanup] Auto-finalized job ${row.id} with launcher ${launcherId}`);
      }
    } catch (err) {
      console.error(`[Cleanup] Auto-finalize failed for job ${row.id}:`, err);
      // Log MintGarden availability issues so admins can manually intervene
      // if paid mints are hanging due to MintGarden being down.
      try {
        await logMintStep(env.DB, {
          mint_id: 0,
          step: 'auto_finalize_failed',
          status: 'failed',
          error: `Cleanup auto-finalize failed for job ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
          data: { job_id: row.id, wallet: row.wallet_address, mint_number: row.mint_number },
        });
      } catch { /* audit log failure must not break cleanup */ }
    }
  }

  // 2. Expire jobs stuck in 'awaiting_payment' past their expires_at
  try {
    const expiredPaid = await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'failed', error_message = 'Offer expired',
       error_code = 'OFFER_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
       WHERE step = 'awaiting_payment'
       AND expires_at IS NOT NULL AND expires_at < datetime('now')`
    ).run();
    stats.expiredPaid = expiredPaid.meta?.changes ?? 0;
  } catch (err) {
    console.error('[Cleanup] Operation 2 (expire paid) failed:', err);
  }

  // 3. Fail jobs stuck in processing for more than 5 minutes (worker died)
  try {
    const stuckProcessing = await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'failed', error_message = 'Processing timed out',
       error_code = 'TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
       WHERE step NOT IN ('completed', 'failed', 'refunded', 'awaiting_payment', 'queued', 'mint_queued')
       AND updated_at < datetime('now', '-5 minutes')`
    ).run();
    stats.stuckProcessing = stuckProcessing.meta?.changes ?? 0;
  } catch (err) {
    console.error('[Cleanup] Operation 3 (stuck processing) failed:', err);
  }

  // 4. Retry queued jobs that haven't been picked up in 30 seconds.
  //    Limited to 2 jobs to avoid exceeding Cloudflare Pages Functions timeout
  //    (each processJob involves IPFS + MintGarden calls, 5-30s each).
  const staleQueued = await env.DB.prepare(
    `SELECT id FROM mint_jobs WHERE step = 'queued'
     AND created_at < datetime('now', '-30 seconds')
     AND retry_count < max_retries
     LIMIT 1`
  ).all<{ id: number }>();

  for (const row of (staleQueued.results || [])) {
    const imageBase64 = await env.MINT_JOBS_KV.get(`job-image:${row.id}`);
    if (imageBase64) {
      try {
        // Timeout guard: cap each retry at 25s to prevent blocking the HTTP handler
        const RETRY_TIMEOUT_MS = 25_000;
        await Promise.race([
          processJob(env, row.id, imageBase64),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Cleanup retry timed out')), RETRY_TIMEOUT_MS)
          ),
        ]);
        stats.retriedQueued++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Cleanup] Retry failed for job ${row.id}:`, errMsg);
        // Log to audit trail
        try {
          await logMintStep(env.DB, {
            mint_id: row.id,
            step: 'cleanup_retry_failed',
            status: 'failed',
            error: errMsg,
            data: { error_code: errMsg.includes('timed out') ? 'TIMEOUT' : 'RETRY_FAILED' },
          });
        } catch { /* audit log failure must not break cleanup */ }
        // On timeout, mark the job as failed to prevent infinite retry loops
        if (errMsg.includes('timed out')) {
          await env.DB.prepare(
            `UPDATE mint_jobs SET step = 'failed', error_message = 'Processing timed out during retry',
             error_code = 'TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
             WHERE id = ? AND step = 'queued'`
          ).bind(row.id).run();
        }
      }
    } else {
      // Image expired from KV — fail the job
      await env.DB.prepare(
        `UPDATE mint_jobs SET step = 'failed', error_message = 'Image data expired',
         error_code = 'IMAGE_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(row.id).run();
      // Log to audit trail
      try {
        await logMintStep(env.DB, {
          mint_id: row.id,
          step: 'cleanup_image_expired',
          status: 'failed',
          error: 'Image data expired from KV before processing',
          data: { error_code: 'IMAGE_EXPIRED' },
        });
      } catch { /* audit log failure must not break cleanup */ }
    }
  }

  // 4b. Pick up mint_queued jobs that haven't been chained (safety net for broken chains).
  //     These jobs have completed IPFS upload and just need a MintGarden slot.
  const staleMintQueued = await env.DB.prepare(
    `SELECT id FROM mint_jobs WHERE step = 'mint_queued'
     AND (not_before IS NULL OR not_before <= datetime('now'))
     AND updated_at < datetime('now', '-30 seconds')
     LIMIT 3`
  ).all<{ id: number }>();

  for (const row of (staleMintQueued.results || [])) {
    const imageBase64 = await env.MINT_JOBS_KV.get(`job-image:${row.id}`);
    if (imageBase64) {
      try {
        const RETRY_TIMEOUT_MS = 25_000;
        // Reset to queued so processJob picks it up (will re-check concurrency gate)
        const casResult = await env.DB.prepare(
          "UPDATE mint_jobs SET step = 'queued', updated_at = datetime('now') WHERE id = ? AND step = 'mint_queued'"
        ).bind(row.id).run();
        // CAS guard: if another cleanup/chain already picked this job up, skip it
        if ((casResult.meta?.changes ?? 0) === 0) continue;
        await Promise.race([
          processJob(env, row.id, imageBase64),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Cleanup retry timed out')), RETRY_TIMEOUT_MS)
          ),
        ]);
        stats.retriedQueued++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Cleanup] mint_queued retry failed for job ${row.id}:`, errMsg);
        try {
          await logMintStep(env.DB, {
            mint_id: row.id,
            step: 'cleanup_mint_queued_retry_failed',
            status: 'failed',
            error: errMsg,
            data: { error_code: errMsg.includes('timed out') ? 'TIMEOUT' : 'RETRY_FAILED' },
          });
        } catch { /* audit log failure must not break cleanup */ }
        // On timeout, mark the job as failed to prevent infinite retry loops
        if (errMsg.includes('timed out')) {
          await env.DB.prepare(
            `UPDATE mint_jobs SET step = 'failed', error_message = 'Processing timed out during retry',
             error_code = 'TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
             WHERE id = ? AND step IN ('queued', 'mint_queued')`
          ).bind(row.id).run();
        }
      }
    } else {
      await env.DB.prepare(
        "UPDATE mint_jobs SET step = 'failed', error_message = 'Image data expired', error_code = 'IMAGE_EXPIRED', wallet_lock = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(row.id).run();
    }
  }

  // 5. Refund credits for failed free mint jobs that haven't been refunded yet
  try {
    // 5a. Jobs with linked credit_spend_id
    const unrefunded = await env.DB.prepare(
      `SELECT id, credit_spend_id FROM mint_jobs
       WHERE step = 'failed' AND mint_type = 'free'
       AND credit_spend_id IS NOT NULL`
    ).all<{ id: number; credit_spend_id: number }>();

    for (const row of (unrefunded.results || [])) {
      try {
        await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?')
          .bind(row.credit_spend_id).run();
        await env.DB.prepare(
          "UPDATE mint_jobs SET step = 'refunded', credit_spend_id = NULL, updated_at = datetime('now') WHERE id = ?"
        ).bind(row.id).run();
        stats.refunded++;
      } catch (err) {
        console.error(`[Cleanup] Refund failed for job ${row.id}:`, err);
      }
    }

    // 5b. Orphaned credit_spends: linking failed so credit_spend_id is NULL on job,
    //     but credit_spends row exists with mint_id=0. Match by wallet_address.
    const orphanedSpends = await env.DB.prepare(
      `SELECT mj.id AS job_id, cs.id AS spend_id
       FROM mint_jobs mj
       JOIN credit_spends cs ON cs.wallet_address = mj.wallet_address AND cs.mint_id = 0
       WHERE mj.step = 'failed' AND mj.mint_type = 'free'
       AND mj.credit_spend_id IS NULL
       LIMIT 10`
    ).all<{ job_id: number; spend_id: number }>();

    for (const row of (orphanedSpends.results || [])) {
      try {
        await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?')
          .bind(row.spend_id).run();
        await env.DB.prepare(
          "UPDATE mint_jobs SET step = 'refunded', updated_at = datetime('now') WHERE id = ?"
        ).bind(row.job_id).run();
        stats.refunded++;
      } catch (err) {
        console.error(`[Cleanup] Orphan credit refund failed for job ${row.job_id}:`, err);
      }
    }
  } catch (err) {
    console.error('[Cleanup] Operation 5 (refund credits) failed:', err);
  }

  // 6. Expire stale phase2_mints pending records (legacy backwards compat)
  try {
    const expiredLegacy = await env.DB.prepare(
      `UPDATE phase2_mints SET status = 'expired'
       WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
    ).run();
    stats.expiredLegacy = expiredLegacy.meta?.changes ?? 0;
  } catch (err) {
    console.error('[Cleanup] Operation 6 (expire legacy) failed:', err);
  }

  // 7. Unpin orphaned IPFS data for failed jobs older than 1 hour
  if (env.PINATA_JWT) {
    const orphanedJobs = await env.DB.prepare(
      `SELECT id, ipfs_image_uris, ipfs_metadata_uris FROM mint_jobs
       WHERE step IN ('failed', 'refunded')
       AND ipfs_image_uris IS NOT NULL
       AND updated_at < datetime('now', '-1 hour')
       LIMIT 10`
    ).all<{ id: number; ipfs_image_uris: string | null; ipfs_metadata_uris: string | null }>();

    for (const row of (orphanedJobs.results || [])) {
      let unpinned = false;

      // Unpin data (image)
      if (row.ipfs_image_uris) {
        try {
          const uris: string[] = JSON.parse(row.ipfs_image_uris);
          for (const uri of uris) {
            const cid = extractCidFromUri(uri);
            if (cid) {
              await unpinFromIPFS(cid, env.PINATA_JWT!);
              unpinned = true;
              break; // Only need to unpin once per CID
            }
          }
        } catch { /* parse error */ }
      }

      // Unpin metadata
      if (row.ipfs_metadata_uris) {
        try {
          const uris: string[] = JSON.parse(row.ipfs_metadata_uris);
          for (const uri of uris) {
            const cid = extractCidFromUri(uri);
            if (cid) {
              await unpinFromIPFS(cid, env.PINATA_JWT!);
              break;
            }
          }
        } catch { /* parse error */ }
      }

      // Clear URIs from the job so we don't try to unpin again
      if (unpinned) {
        await env.DB.prepare(
          "UPDATE mint_jobs SET ipfs_image_uris = NULL, ipfs_metadata_uris = NULL, updated_at = datetime('now') WHERE id = ?"
        ).bind(row.id).run();
        stats.unpinnedIPFS++;
      }
    }
  }

  // 8. Auto-flag refund for paid mints that failed after payment.
  //    IMPORTANT: Uses mintgarden_launcher_id IS NOT NULL (not phase2_mint_id) to detect
  //    payment — phase2_mint_id is only set at finalization, which may not have completed.
  const paidFailedWithPayment = await env.DB.prepare(
    `SELECT mj.id AS job_id, mj.phase2_mint_id, mj.error_message,
            mj.mintgarden_launcher_id, mj.wallet_address
     FROM mint_jobs mj
     LEFT JOIN phase2_mints pm ON pm.id = mj.phase2_mint_id
     WHERE mj.step = 'failed'
     AND mj.mint_type = 'paid'
     AND mj.mintgarden_launcher_id IS NOT NULL
     AND (mj.phase2_mint_id IS NULL OR pm.refund_needed IS NULL OR pm.refund_needed = 0)
     AND NOT EXISTS (
       SELECT 1 FROM mint_audit_log mal
       WHERE mal.step = 'refund_needed_no_mint_record'
       AND json_extract(mal.data, '$.job_id') = mj.id
     )
     LIMIT 10`
  ).all<{ job_id: number; phase2_mint_id: number | null; error_message: string | null; mintgarden_launcher_id: string; wallet_address: string }>();

  for (const row of (paidFailedWithPayment.results || [])) {
    try {
      if (row.phase2_mint_id) {
        await markRefundNeeded(
          env.DB,
          row.phase2_mint_id,
          `Cleanup: job ${row.job_id} failed after payment. Error: ${row.error_message || 'unknown'}`
        );
      } else {
        // No phase2_mints record — log for manual review
        await logMintStep(env.DB, {
          mint_id: 0,
          step: 'refund_needed_no_mint_record',
          status: 'failed',
          error: `Cleanup: job ${row.job_id} failed after payment but no phase2_mints record exists.`,
          data: { job_id: row.job_id, launcher_id: row.mintgarden_launcher_id, wallet: row.wallet_address },
        });
      }
      stats.paidRefundsFlagged++;
    } catch (err) {
      console.error(`[Cleanup] Failed to flag refund for job ${row.job_id}:`, err);
    }
  }

  // 9. Fix 4: Absolute lock timeout — force-release wallet locks older than 30 minutes.
  //    This prevents permanent wallet lockout if cleanup or processing fails.
  try {
    const staleLocks = await env.DB.prepare(
      `UPDATE mint_jobs SET wallet_lock = NULL, updated_at = datetime('now'),
       error_message = COALESCE(error_message, '') || ' [lock force-released after 30min]'
       WHERE wallet_lock IS NOT NULL
       AND created_at < datetime('now', '-30 minutes')
       AND step NOT IN ('completed')`
    ).run();
    stats.locksForceReleased = staleLocks.meta?.changes ?? 0;
    if (stats.locksForceReleased > 0) {
      console.warn(`[Cleanup] Force-released ${stats.locksForceReleased} stale wallet locks`);
    }
  } catch (err) {
    console.error('[Cleanup] Operation 9 (force-release locks) failed:', err);
  }

  // 10. Fix 5: Phantom mint detection for free mints.
  //     Free mints that failed AFTER MintGarden returned a launcherId have the NFT
  //     already created on-chain. Detect and auto-finalize them.
  try {
    const phantomFree = await env.DB.prepare(
      `SELECT id, wallet_address, mint_number, mintgarden_launcher_id FROM mint_jobs
       WHERE step IN ('failed', 'refunded')
       AND mint_type = 'free'
       AND mintgarden_launcher_id IS NOT NULL
       AND mint_number IS NOT NULL
       LIMIT 5`
    ).all<{ id: number; wallet_address: string; mint_number: number; mintgarden_launcher_id: string }>();

    for (const row of (phantomFree.results || [])) {
      try {
        // Check if wallet already has an active lock (user started a new mint).
        // If so, skip — we can't acquire the lock without conflicting.
        const existingLock = await env.DB.prepare(
          "SELECT id FROM mint_jobs WHERE wallet_lock = ? AND wallet_lock IS NOT NULL AND id != ?"
        ).bind(row.wallet_address, row.id).first<{ id: number }>();
        if (existingLock) {
          console.warn(`[Cleanup] Skipping phantom finalize for job ${row.id} — wallet has active lock (job ${existingLock.id})`);
          continue;
        }

        // The NFT exists on chain — finalize it
        await env.DB.prepare(
          "UPDATE mint_jobs SET step = 'queued', wallet_lock = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(row.wallet_address, row.id).run();

        // Re-add credit spend if it was refunded
        // (The refund happened because we thought the mint failed, but it actually succeeded)
        await finalizeJob(env, row.id);
        stats.phantomFinalized++;
        console.warn(`[Cleanup] Phantom-finalized free mint job ${row.id} (launcher: ${row.mintgarden_launcher_id})`);
      } catch (err) {
        console.error(`[Cleanup] Phantom finalize failed for job ${row.id}:`, err);
        // Reset wallet_lock on failure
        try {
          await env.DB.prepare(
            "UPDATE mint_jobs SET wallet_lock = NULL, step = 'failed', updated_at = datetime('now') WHERE id = ?"
          ).bind(row.id).run();
        } catch { /* best effort */ }
      }
    }
  } catch (err) {
    console.error('[Cleanup] Operation 10 (phantom free mints) failed:', err);
  }

  // 11. Purge stale rate_limits rows older than 24 hours.
  //     Per-key cleanup only happens on access — keys from one-off IPs accumulate forever.
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('DELETE FROM rate_limits WHERE timestamp < ?').bind(cutoff).run();
  } catch (err) {
    console.error('[Cleanup] Operation 11 (rate_limits purge) failed:', err);
  }

  return stats;
}
