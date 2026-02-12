/**
 * Audit Helper - Track mint progress and enable admin oversight
 *
 * Logs each step of the minting process to mint_audit_log table
 * for complete audit trail and troubleshooting.
 */

export interface AuditLogEntry {
  mint_id: number;
  step: string;
  status: 'started' | 'completed' | 'failed';
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Log a step in the minting process
 */
export async function logMintStep(
  db: D1Database,
  entry: AuditLogEntry
): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO mint_audit_log (mint_id, step, status, data, error)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        entry.mint_id,
        entry.step,
        entry.status,
        entry.data ? JSON.stringify(entry.data) : null,
        entry.error || null
      )
      .run();
  } catch (error) {
    console.error('[AuditHelper] Failed to log mint step:', error);
    // Don't throw - audit logging failure shouldn't break the mint
  }
}

/**
 * Mark a mint as needing refund
 */
export async function markRefundNeeded(
  db: D1Database,
  mintId: number,
  reason: string
): Promise<void> {
  await db.prepare(
    `UPDATE phase2_mints
     SET refund_needed = 1, refund_reason = ?
     WHERE id = ?`
  )
    .bind(reason, mintId)
    .run();

  await logMintStep(db, {
    mint_id: mintId,
    step: 'refund_marked',
    status: 'completed',
    data: { reason }
  });
}

/**
 * Record refund issued
 */
export async function recordRefundIssued(
  db: D1Database,
  mintId: number,
  txid: string,
  adminNotes?: string
): Promise<void> {
  await db.prepare(
    `UPDATE phase2_mints
     SET refund_issued = 1,
         refund_issued_at = datetime('now'),
         refund_txid = ?,
         admin_notes = COALESCE(admin_notes || '\n', '') || ?
     WHERE id = ?`
  )
    .bind(txid, adminNotes || `Refund issued: ${txid}`, mintId)
    .run();

  await logMintStep(db, {
    mint_id: mintId,
    step: 'refund_issued',
    status: 'completed',
    data: { txid, notes: adminNotes }
  });
}
