-- 083: Add treasury balance snapshot to purchases for balance-based confirmation.
-- The Spacescan free API has no coin-level endpoint, so we detect payments
-- by comparing the treasury mojo balance before and after.
ALTER TABLE ai_credit_purchases ADD COLUMN treasury_mojo_snapshot INTEGER;
