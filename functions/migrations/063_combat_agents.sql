-- 063_combat_agents.sql
-- Agent system for external AI controllers (ported from ClawCombat)

-- One agent per DID — controls all fighters under that wallet
CREATE TABLE IF NOT EXISTS combat_agents (
  id TEXT PRIMARY KEY,
  owner_did TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  webhook_url TEXT,
  webhook_secret TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'retired')),
  tier TEXT DEFAULT 'trial' CHECK(tier IN ('trial', 'free', 'premium')),
  trial_start_at TEXT DEFAULT (datetime('now')),
  fights_today INTEGER DEFAULT 0,
  fights_today_date TEXT,
  fights_this_hour INTEGER DEFAULT 0,
  fights_hour_start TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_active_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_combat_agents_api_key ON combat_agents(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_combat_agents_did ON combat_agents(owner_did);

-- Track battle mode type per fighter (manual/auto/agent)
ALTER TABLE combat_battles ADD COLUMN fighter_a_mode_type TEXT DEFAULT 'manual';
ALTER TABLE combat_battles ADD COLUMN fighter_b_mode_type TEXT DEFAULT 'manual';

-- Track consecutive timeouts per side (3 = auto-forfeit)
ALTER TABLE combat_battles ADD COLUMN fighter_a_timeouts INTEGER DEFAULT 0;
ALTER TABLE combat_battles ADD COLUMN fighter_b_timeouts INTEGER DEFAULT 0;

-- Track last turn timestamp (for 30s timeout detection)
ALTER TABLE combat_battles ADD COLUMN last_turn_at TEXT;
