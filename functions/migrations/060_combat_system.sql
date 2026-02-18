-- functions/migrations/060_combat_system.sql
-- Combat system tables for turn-based battles

-- Combat fighter records (one per NFT, created at mint)
CREATE TABLE IF NOT EXISTS combat_fighters (
  nft_id TEXT PRIMARY KEY,
  edition_number INTEGER NOT NULL UNIQUE,
  owner_did TEXT NOT NULL,
  combat_type TEXT NOT NULL,
  nature TEXT NOT NULL,
  ability TEXT NOT NULL,
  move_1 TEXT NOT NULL,
  move_2 TEXT NOT NULL,
  move_3 TEXT NOT NULL,
  move_4 TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1000,
  total_combat_wins INTEGER DEFAULT 0,
  total_combat_losses INTEGER DEFAULT 0,
  total_combat_draws INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fighters_elo ON combat_fighters(elo_rating);
CREATE INDEX IF NOT EXISTS idx_fighters_owner ON combat_fighters(owner_did);
CREATE INDEX IF NOT EXISTS idx_fighters_type ON combat_fighters(combat_type);
CREATE INDEX IF NOT EXISTS idx_fighters_level ON combat_fighters(level);

-- Combat battle records
CREATE TABLE IF NOT EXISTS combat_battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fighter_a_nft TEXT NOT NULL REFERENCES combat_fighters(nft_id),
  fighter_a_did TEXT NOT NULL,
  fighter_a_mode TEXT NOT NULL CHECK(fighter_a_mode IN ('manual', 'auto')),
  fighter_b_nft TEXT NOT NULL REFERENCES combat_fighters(nft_id),
  fighter_b_did TEXT NOT NULL,
  fighter_b_mode TEXT NOT NULL CHECK(fighter_b_mode IN ('manual', 'auto')),
  status TEXT DEFAULT 'active'
    CHECK(status IN ('waiting_moves', 'active', 'completed', 'cancelled', 'draw', 'timeout')),
  current_turn INTEGER DEFAULT 0,
  max_turns INTEGER DEFAULT 50,
  winner_nft TEXT,
  fighter_a_level INTEGER NOT NULL,
  fighter_b_level INTEGER NOT NULL,
  fighter_a_elo INTEGER NOT NULL,
  fighter_b_elo INTEGER NOT NULL,
  elo_change_a INTEGER,
  elo_change_b INTEGER,
  xp_awarded_a INTEGER,
  xp_awarded_b INTEGER,
  turn_log TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_combat_battles_status ON combat_battles(status);
CREATE INDEX IF NOT EXISTS idx_combat_battles_fighters ON combat_battles(fighter_a_nft, fighter_b_nft);

-- Combat matchmaking queue
CREATE TABLE IF NOT EXISTS combat_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_id TEXT NOT NULL UNIQUE REFERENCES combat_fighters(nft_id),
  owner_did TEXT NOT NULL,
  battle_mode TEXT NOT NULL CHECK(battle_mode IN ('manual', 'auto')),
  elo_rating INTEGER NOT NULL,
  queued_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_combat_queue_elo ON combat_queue(elo_rating);

-- Per-turn state for active manual battles
CREATE TABLE IF NOT EXISTS combat_turns (
  battle_id INTEGER NOT NULL REFERENCES combat_battles(id),
  turn_number INTEGER NOT NULL,
  fighter_a_move TEXT,
  fighter_b_move TEXT,
  fighter_a_submitted_at TEXT,
  fighter_b_submitted_at TEXT,
  turn_result TEXT,
  resolved_at TEXT,
  PRIMARY KEY (battle_id, turn_number)
);

-- XP thresholds for leveling (pre-populated)
CREATE TABLE IF NOT EXISTS combat_level_thresholds (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL
);

-- Pre-populate level thresholds: xp = floor(level^2.5 * 10)
INSERT OR IGNORE INTO combat_level_thresholds (level, xp_required) VALUES
  (1, 0), (2, 57), (3, 156), (4, 320), (5, 559),
  (6, 882), (7, 1296), (8, 1810), (9, 2430), (10, 3162),
  (11, 4013), (12, 4988), (13, 6091), (14, 7328), (15, 8714),
  (16, 10240), (17, 11919), (18, 13754), (19, 15749), (20, 17889),
  (25, 31250), (30, 49295), (35, 72471), (40, 101193),
  (45, 135765), (50, 176777), (55, 224537), (60, 278855),
  (65, 340466), (70, 409963), (75, 487508), (80, 572433),
  (85, 665506), (90, 768425), (95, 880112), (100, 1000000);
