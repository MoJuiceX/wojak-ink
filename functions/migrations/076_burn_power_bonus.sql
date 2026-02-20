-- Burn power bonus: +50 power assignable to one Wojak per burn
-- One row per grant; nft_id NULL = unassigned, set on assign

CREATE TABLE IF NOT EXISTS burn_power_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did_id TEXT NOT NULL,
  nft_id TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_burn_power_grants_did ON burn_power_grants(did_id);
CREATE INDEX IF NOT EXISTS idx_burn_power_grants_did_unassigned ON burn_power_grants(did_id)
WHERE nft_id IS NULL;
