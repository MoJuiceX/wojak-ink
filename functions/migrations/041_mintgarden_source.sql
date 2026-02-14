-- Migration 041: Add MintGarden dual-source support to sales_history
-- Adds columns for MintGarden event data, wallet addresses, and asset_id mapping

-- MintGarden-specific columns on sales_history
ALTER TABLE sales_history ADD COLUMN mg_event_id TEXT;
ALTER TABLE sales_history ADD COLUMN buyer_address TEXT;
ALTER TABLE sales_history ADD COLUMN seller_address TEXT;
ALTER TABLE sales_history ADD COLUMN block_height INTEGER;

-- Index for MintGarden dedup
CREATE INDEX IF NOT EXISTS idx_sales_mg_event ON sales_history(mg_event_id) WHERE mg_event_id IS NOT NULL;

-- Index for wallet queries (future credit/analytics use)
CREATE INDEX IF NOT EXISTS idx_sales_buyer ON sales_history(buyer_address) WHERE buyer_address IS NOT NULL;

-- MintGarden sync cursor in sync state
ALTER TABLE sales_sync_state ADD COLUMN mg_last_timestamp TEXT;
ALTER TABLE sales_sync_state ADD COLUMN mg_total_synced INTEGER DEFAULT 0;

-- Asset ID mapping for CAT tokens (MintGarden uses asset_id, Dexie uses token_code)
ALTER TABLE cat_token_rates ADD COLUMN asset_id TEXT;

-- Seed known asset_id mappings
UPDATE cat_token_rates SET asset_id = 'ccda69ff6c44d687994efdbee30689be51d2347f739287ab4bb7b52344f8bf1d' WHERE token_code = 'BEPE';
