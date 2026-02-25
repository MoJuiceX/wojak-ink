-- Migration 077: Collection bonus support
-- Adds columns to sales_history for Phase 2 tracking and collection bonus calculation

-- Add collection column to distinguish Phase 1 vs Phase 2 sales
ALTER TABLE sales_history ADD COLUMN collection TEXT DEFAULT 'phase1';

-- Add nft_id to link sales to did_holdings/wojak_scores
ALTER TABLE sales_history ADD COLUMN nft_id TEXT;

-- Indexes for collection bonus queries
CREATE INDEX IF NOT EXISTS idx_sh_collection ON sales_history(collection);
CREATE INDEX IF NOT EXISTS idx_sh_nft_id ON sales_history(nft_id);
CREATE INDEX IF NOT EXISTS idx_sh_buyer_collection ON sales_history(buyer_address, collection);

-- Update sync state for Phase 2 tracking
ALTER TABLE sales_sync_state ADD COLUMN phase2_last_timestamp TEXT;
ALTER TABLE sales_sync_state ADD COLUMN phase2_total_synced INTEGER DEFAULT 0;
