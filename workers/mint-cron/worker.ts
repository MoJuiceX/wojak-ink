/**
 * Mint Cron Worker — runs every 10 minutes via Cloudflare Cron Trigger.
 *
 * Cleans up stale mint jobs directly via D1 (no HTTP round-trip).
 * - Expires stuck awaiting_payment jobs past their expires_at
 * - Fails processing jobs stuck for >5 minutes (worker died)
 * - Refunds credits for failed free mints
 * - Expires stale legacy phase2_mints pending records
 * - Unpins orphaned IPFS data from Pinata
 * - Flags refunds for paid mints that failed after payment
 */

interface Env {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
  PINATA_JWT?: string;
}

/** Extract IPFS CID from a URI (ipfs:// or gateway URL) */
function extractCidFromUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return uri.replace('ipfs://', '');
  const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/** Unpin a CID from Pinata */
async function unpinFromIPFS(ipfsCid: string, pinataJwt: string): Promise<boolean> {
  if (!ipfsCid || !pinataJwt) return false;
  try {
    const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${ipfsCid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pinataJwt}` },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('[MintCron] Running cleanup...');

    // 1. Expire paid mints past their expires_at
    const expiredPaid = await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'failed', error_message = 'Offer expired',
       error_code = 'OFFER_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
       WHERE step = 'awaiting_payment'
       AND expires_at IS NOT NULL AND expires_at < datetime('now')`
    ).run();

    // 2. Fail jobs stuck in processing for >5 minutes
    const stuckProcessing = await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'failed', error_message = 'Processing timed out',
       error_code = 'TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
       WHERE step NOT IN ('completed', 'failed', 'refunded', 'awaiting_payment', 'queued')
       AND updated_at < datetime('now', '-5 minutes')`
    ).run();

    // 3. Refund credits for failed free mints
    const unrefunded = await env.DB.prepare(
      `SELECT id, credit_spend_id FROM mint_jobs
       WHERE step = 'failed' AND mint_type = 'free'
       AND credit_spend_id IS NOT NULL`
    ).all<{ id: number; credit_spend_id: number }>();

    let refunded = 0;
    for (const row of (unrefunded.results || [])) {
      await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?')
        .bind(row.credit_spend_id).run();
      await env.DB.prepare(
        "UPDATE mint_jobs SET step = 'refunded', credit_spend_id = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(row.id).run();
      refunded++;
    }

    // 4. Fail queued jobs older than 5 minutes (image likely expired from KV)
    const staleQueued = await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'failed', error_message = 'Job timed out in queue',
       error_code = 'QUEUE_TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
       WHERE step = 'queued' AND created_at < datetime('now', '-5 minutes')`
    ).run();

    // 5. Expire stale legacy phase2_mints pending records
    const expiredLegacy = await env.DB.prepare(
      `UPDATE phase2_mints SET status = 'expired'
       WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
    ).run();

    // 6. Unpin orphaned IPFS data for failed jobs older than 1 hour
    let unpinnedIPFS = 0;
    if (env.PINATA_JWT) {
      const orphanedJobs = await env.DB.prepare(
        `SELECT id, data_uris, metadata_uris FROM mint_jobs
         WHERE step IN ('failed', 'refunded')
         AND data_uris IS NOT NULL
         AND updated_at < datetime('now', '-1 hour')
         LIMIT 10`
      ).all<{ id: number; data_uris: string | null; metadata_uris: string | null }>();

      for (const row of (orphanedJobs.results || [])) {
        let unpinned = false;

        if (row.data_uris) {
          try {
            const uris: string[] = JSON.parse(row.data_uris);
            for (const uri of uris) {
              const cid = extractCidFromUri(uri);
              if (cid) { await unpinFromIPFS(cid, env.PINATA_JWT!); unpinned = true; break; }
            }
          } catch { /* parse error */ }
        }

        if (row.metadata_uris) {
          try {
            const uris: string[] = JSON.parse(row.metadata_uris);
            for (const uri of uris) {
              const cid = extractCidFromUri(uri);
              if (cid) { await unpinFromIPFS(cid, env.PINATA_JWT!); break; }
            }
          } catch { /* parse error */ }
        }

        if (unpinned) {
          await env.DB.prepare(
            "UPDATE mint_jobs SET data_uris = NULL, metadata_uris = NULL, updated_at = datetime('now') WHERE id = ?"
          ).bind(row.id).run();
          unpinnedIPFS++;
        }
      }
    }

    // 7. Flag refunds for paid mints that failed after payment (have launcherId)
    let paidRefundsFlagged = 0;
    const paidFailedWithPayment = await env.DB.prepare(
      `SELECT mj.id AS job_id, mj.phase2_mint_id, mj.error_message
       FROM mint_jobs mj
       LEFT JOIN phase2_mints pm ON pm.id = mj.phase2_mint_id
       WHERE mj.step = 'failed'
       AND mj.mint_type = 'paid'
       AND mj.mintgarden_launcher_id IS NOT NULL
       AND mj.phase2_mint_id IS NOT NULL
       AND (pm.refund_needed IS NULL OR pm.refund_needed = 0)
       LIMIT 10`
    ).all<{ job_id: number; phase2_mint_id: number; error_message: string | null }>();

    for (const row of (paidFailedWithPayment.results || [])) {
      try {
        await env.DB.prepare(
          `UPDATE phase2_mints SET refund_needed = 1, refund_reason = ? WHERE id = ?`
        ).bind(
          `Cron cleanup: job ${row.job_id} failed after payment. Error: ${row.error_message || 'unknown'}`,
          row.phase2_mint_id
        ).run();
        paidRefundsFlagged++;
      } catch (err) {
        console.error(`[MintCron] Failed to flag refund for job ${row.job_id}:`, err);
      }
    }

    console.log('[MintCron] Done:', {
      expiredPaid: expiredPaid.meta?.changes ?? 0,
      stuckProcessing: stuckProcessing.meta?.changes ?? 0,
      refunded,
      staleQueued: staleQueued.meta?.changes ?? 0,
      expiredLegacy: expiredLegacy.meta?.changes ?? 0,
      unpinnedIPFS,
      paidRefundsFlagged,
    });
  },
};
