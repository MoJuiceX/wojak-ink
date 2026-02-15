/**
 * Mint Cron Worker — runs every 10 minutes via Cloudflare Cron Trigger.
 *
 * Cleans up stale mint jobs directly via D1 (no HTTP round-trip).
 * - Expires stuck awaiting_payment jobs past their expires_at
 * - Fails processing jobs stuck for >5 minutes (worker died)
 * - Refunds credits for failed free mints
 * - Expires stale legacy phase2_mints pending records
 */

interface Env {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
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

    console.log('[MintCron] Done:', {
      expiredPaid: expiredPaid.meta?.changes ?? 0,
      stuckProcessing: stuckProcessing.meta?.changes ?? 0,
      refunded,
      staleQueued: staleQueued.meta?.changes ?? 0,
      expiredLegacy: expiredLegacy.meta?.changes ?? 0,
    });
  },
};
