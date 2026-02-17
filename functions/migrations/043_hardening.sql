-- 043_hardening.sql
-- Pre-launch hardening: idempotent finalization + cleanup mutex.

-- Fix 2: Idempotent finalization — prevent duplicate phase2_mints rows
-- when finalizeJob() is retried (cleanup auto-finalize, network timeout).
CREATE UNIQUE INDEX IF NOT EXISTS idx_p2m_mint_number
  ON phase2_mints(mint_number);
