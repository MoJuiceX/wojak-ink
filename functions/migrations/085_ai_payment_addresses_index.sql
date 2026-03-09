-- Migration 085: Index on ai_payment_addresses for efficient pool queries
--
-- The address pool query (buy.ts) does:
--   SELECT ... WHERE purchase_id IS NULL ORDER BY id ASC LIMIT 1
-- Without an index this is a full table scan. This composite index lets
-- SQLite satisfy both the WHERE and ORDER BY from the index directly.

CREATE INDEX IF NOT EXISTS idx_ai_payment_addresses_pool
  ON ai_payment_addresses(purchase_id, id);
