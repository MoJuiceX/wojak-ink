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

/** MintGarden NFT item shape (subset) */
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
}

/**
 * Query MintGarden for NFTs owned by a wallet, find one matching the mint_number.
 * Returns the launcher ID if found, or null.
 * Mirrors the same logic in cleanup.ts — duplicated here because the cron worker
 * is a separate bundle that cannot import from Pages Functions.
 */
async function detectLauncherByWallet(
  walletAddress: string,
  mintNumber: number,
  collectionUuid: string
): Promise<string | null> {
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

    const name = item.data?.metadata_json?.name;
    if (name && name === `Your Wojak #${mintNumber}`) {
      return item.encoded_id || item.id || null;
    }
  }

  return null;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('[MintCron] Running cleanup...');

    // 0. Auto-detect paid mints where user accepted the offer but
    //    mintgarden_launcher_id wasn't captured (browser closed, network error, etc.).
    //    Sets the launcher ID so the next cleanup/cron cycle can finalize.
    let autoDetected = 0;
    try {
      const awaitingJobs = await env.DB.prepare(
        `SELECT id, wallet_address, mint_number FROM mint_jobs
         WHERE step = 'awaiting_payment' AND mint_type = 'paid'
         AND mintgarden_launcher_id IS NULL
         AND mint_number IS NOT NULL
         AND updated_at < datetime('now', '-30 seconds')
         LIMIT 3`
      ).all<{ id: number; wallet_address: string; mint_number: number }>();

      for (const row of (awaitingJobs.results || [])) {
        try {
          const launcherId = await detectLauncherByWallet(
            row.wallet_address,
            row.mint_number,
            '' // Collection UUID not available in cron env — detection still works via edition_number
          );
          if (launcherId) {
            await env.DB.prepare(
              "UPDATE mint_jobs SET mintgarden_launcher_id = ?, updated_at = datetime('now') WHERE id = ?"
            ).bind(launcherId, row.id).run();
            autoDetected++;
            console.log(`[MintCron] Auto-detected launcher for job ${row.id}: ${launcherId}`);
          }
        } catch (err) {
          console.error(`[MintCron] Auto-detect failed for job ${row.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[MintCron] Auto-detect step failed:', err);
    }

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

    // 4. Fail queued jobs that haven't progressed for >5 minutes
    //    Uses updated_at (not created_at) because handleJobFailure resets
    //    retryable jobs to 'queued' with fresh updated_at. Using created_at
    //    would incorrectly kill retried jobs whose original submission was >5 min ago.
    const staleQueued = await env.DB.prepare(
      `UPDATE mint_jobs SET step = 'failed', error_message = 'Job timed out in queue',
       error_code = 'QUEUE_TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
       WHERE step = 'queued' AND updated_at < datetime('now', '-5 minutes')`
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
        `SELECT id, ipfs_image_uris, ipfs_metadata_uris FROM mint_jobs
         WHERE step IN ('failed', 'refunded')
         AND ipfs_image_uris IS NOT NULL
         AND updated_at < datetime('now', '-1 hour')
         LIMIT 10`
      ).all<{ id: number; ipfs_image_uris: string | null; ipfs_metadata_uris: string | null }>();

      for (const row of (orphanedJobs.results || [])) {
        let unpinned = false;

        if (row.ipfs_image_uris) {
          try {
            const uris: string[] = JSON.parse(row.ipfs_image_uris);
            for (const uri of uris) {
              const cid = extractCidFromUri(uri);
              if (cid) { await unpinFromIPFS(cid, env.PINATA_JWT!); unpinned = true; break; }
            }
          } catch { /* parse error */ }
        }

        if (row.ipfs_metadata_uris) {
          try {
            const uris: string[] = JSON.parse(row.ipfs_metadata_uris);
            for (const uri of uris) {
              const cid = extractCidFromUri(uri);
              if (cid) { await unpinFromIPFS(cid, env.PINATA_JWT!); break; }
            }
          } catch { /* parse error */ }
        }

        if (unpinned) {
          await env.DB.prepare(
            "UPDATE mint_jobs SET ipfs_image_uris = NULL, ipfs_metadata_uris = NULL, updated_at = datetime('now') WHERE id = ?"
          ).bind(row.id).run();
          unpinnedIPFS++;
        }
      }
    }

    // 7. Flag refunds for paid mints that failed after payment.
    //    IMPORTANT: Uses mintgarden_launcher_id IS NOT NULL (not phase2_mint_id) to detect
    //    payment — phase2_mint_id is only set at finalization, which may not have completed.
    let paidRefundsFlagged = 0;
    const paidFailedWithPayment = await env.DB.prepare(
      `SELECT mj.id AS job_id, mj.phase2_mint_id, mj.error_message,
              mj.mintgarden_launcher_id, mj.wallet_address
       FROM mint_jobs mj
       LEFT JOIN phase2_mints pm ON pm.id = mj.phase2_mint_id
       WHERE mj.step = 'failed'
       AND mj.mint_type = 'paid'
       AND mj.mintgarden_launcher_id IS NOT NULL
       AND (mj.phase2_mint_id IS NULL OR pm.refund_needed IS NULL OR pm.refund_needed = 0)
       LIMIT 10`
    ).all<{ job_id: number; phase2_mint_id: number | null; error_message: string | null; mintgarden_launcher_id: string; wallet_address: string }>();

    for (const row of (paidFailedWithPayment.results || [])) {
      try {
        if (row.phase2_mint_id) {
          await env.DB.prepare(
            `UPDATE phase2_mints SET refund_needed = 1, refund_reason = ? WHERE id = ?`
          ).bind(
            `Cron cleanup: job ${row.job_id} failed after payment. Error: ${row.error_message || 'unknown'}`,
            row.phase2_mint_id
          ).run();
        } else {
          // No phase2_mints record — log for manual review
          console.warn(`[MintCron] Job ${row.job_id} failed after payment but has no phase2_mints record. Launcher: ${row.mintgarden_launcher_id}, Wallet: ${row.wallet_address}`);
          await env.DB.prepare(
            `INSERT INTO mint_audit_log (mint_id, step, status, error, data, created_at)
             VALUES (0, 'refund_needed_no_mint_record', 'failed', ?, ?, datetime('now'))`
          ).bind(
            `Cron: job ${row.job_id} failed after payment but no phase2_mints record exists.`,
            JSON.stringify({ job_id: row.job_id, launcher_id: row.mintgarden_launcher_id, wallet: row.wallet_address })
          ).run();
        }
        paidRefundsFlagged++;
      } catch (err) {
        console.error(`[MintCron] Failed to flag refund for job ${row.job_id}:`, err);
      }
    }

    console.log('[MintCron] Done:', {
      autoDetected,
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
