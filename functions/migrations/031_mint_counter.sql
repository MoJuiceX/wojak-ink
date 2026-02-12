-- Atomic Mint Counter for Sequential Numbering
-- Prevents race conditions when multiple users mint simultaneously

CREATE TABLE IF NOT EXISTS mint_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_number INTEGER NOT NULL DEFAULT 1
);

-- Initialize counter with 1 (or current max + 1 if mints already exist)
INSERT INTO mint_counter (id, next_number)
SELECT 1, COALESCE(MAX(mint_number), 0) + 1
FROM phase2_mints
WHERE status = 'minted'
ON CONFLICT(id) DO NOTHING;
