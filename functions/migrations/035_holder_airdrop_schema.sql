-- Add event_type column to credit_events for distinguishing trade vs airdrop credits
-- Default 'trade' preserves existing rows. Airdrop inserts use 'holder_airdrop'.
ALTER TABLE credit_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'trade';

-- Add metadata column for storing airdrop context (held count, snapshot date, etc.)
ALTER TABLE credit_events ADD COLUMN metadata TEXT;

-- Index for filtering by event type (admin queries, leaderboard breakdowns)
CREATE INDEX IF NOT EXISTS idx_ce_event_type ON credit_events(event_type);
