-- Enhanced Audit Trail for Phase 2 Minting
-- Tracks every step of the mint process for complete visibility

-- Add audit columns to phase2_mints
ALTER TABLE phase2_mints ADD COLUMN ipfs_upload_started_at TEXT;
ALTER TABLE phase2_mints ADD COLUMN ipfs_upload_completed_at TEXT;
ALTER TABLE phase2_mints ADD COLUMN mintgarden_called_at TEXT;
ALTER TABLE phase2_mints ADD COLUMN mintgarden_completed_at TEXT;
ALTER TABLE phase2_mints ADD COLUMN error_message TEXT;
ALTER TABLE phase2_mints ADD COLUMN error_code TEXT;

-- Refund tracking
ALTER TABLE phase2_mints ADD COLUMN refund_needed INTEGER DEFAULT 0;  -- boolean
ALTER TABLE phase2_mints ADD COLUMN refund_reason TEXT;
ALTER TABLE phase2_mints ADD COLUMN refund_issued INTEGER DEFAULT 0;  -- boolean
ALTER TABLE phase2_mints ADD COLUMN refund_issued_at TEXT;
ALTER TABLE phase2_mints ADD COLUMN refund_txid TEXT;  -- blockchain transaction ID if refunded
ALTER TABLE phase2_mints ADD COLUMN admin_notes TEXT;  -- for manual notes

-- Payment verification for paid mints
ALTER TABLE phase2_mints ADD COLUMN payment_verified INTEGER DEFAULT 0;  -- boolean
ALTER TABLE phase2_mints ADD COLUMN payment_amount_xch INTEGER;  -- stored as mojos (xch * 1e12)
ALTER TABLE phase2_mints ADD COLUMN payment_txid TEXT;  -- Chia transaction ID (for paid mints)

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_pm_refund ON phase2_mints(refund_needed, refund_issued);
CREATE INDEX IF NOT EXISTS idx_pm_error ON phase2_mints(status, error_code);
CREATE INDEX IF NOT EXISTS idx_pm_created ON phase2_mints(created_at);

-- Detailed audit log table (step-by-step tracking)
CREATE TABLE IF NOT EXISTS mint_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mint_id INTEGER NOT NULL,
  step TEXT NOT NULL,  -- 'prepare_start', 'ipfs_upload', 'mintgarden_call', 'confirm', etc.
  status TEXT NOT NULL,  -- 'started', 'completed', 'failed'
  data TEXT,  -- JSON data for this step
  error TEXT,  -- Error message if failed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mal_mint ON mint_audit_log(mint_id);
CREATE INDEX IF NOT EXISTS idx_mal_step ON mint_audit_log(step, status);
