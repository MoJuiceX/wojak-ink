-- 042_mint_queue.sql
-- Queue-based mint architecture: mint_jobs table with per-wallet mutex.

CREATE TABLE IF NOT EXISTS mint_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Identity
  wallet_address TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,

  -- Input (frozen at submission time)
  layers_json TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  image_base64_hash TEXT NOT NULL,
  mint_type TEXT NOT NULL CHECK(mint_type IN ('paid', 'free')),

  -- Pricing (calculated and frozen at submission time)
  credit_cost INTEGER,
  xch_price_mojos INTEGER,
  surcharge_xch INTEGER,
  highest_surcharge_trait TEXT,

  -- Progress tracking
  step TEXT NOT NULL DEFAULT 'queued'
    CHECK(step IN (
      'queued',
      'validating',
      'reserving_number',
      'uploading_ipfs',
      'calling_mintgarden',
      'awaiting_payment',
      'finalizing',
      'completed',
      'failed',
      'refunded'
    )),

  -- Outputs (populated as steps complete)
  mint_number INTEGER,
  ipfs_image_uris TEXT,
  ipfs_metadata_uris TEXT,
  image_hash TEXT,
  metadata_hash TEXT,
  mintgarden_launcher_id TEXT,
  offer_file TEXT,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Cross-reference to legacy table
  phase2_mint_id INTEGER,
  credit_spend_id INTEGER,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  expires_at TEXT,

  -- Per-wallet lock: only one active job per wallet.
  -- Set to wallet_address when active, NULL when done.
  wallet_lock TEXT
);

-- CRITICAL: Per-wallet mutex via partial unique index.
-- Only one row per wallet can have a non-NULL wallet_lock.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mj_wallet_lock
  ON mint_jobs(wallet_lock) WHERE wallet_lock IS NOT NULL;

-- For polling by job ID + wallet ownership check
CREATE INDEX IF NOT EXISTS idx_mj_id_wallet ON mint_jobs(id, wallet_address);

-- For finding queued jobs to process
CREATE INDEX IF NOT EXISTS idx_mj_step ON mint_jobs(step) WHERE step = 'queued';

-- For finding stale jobs to expire
CREATE INDEX IF NOT EXISTS idx_mj_updated ON mint_jobs(updated_at);

-- For idempotency lookups
CREATE INDEX IF NOT EXISTS idx_mj_idempotency ON mint_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
