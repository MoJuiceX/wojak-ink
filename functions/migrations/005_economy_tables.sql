-- Economy System Migration
-- Adds currency tracking, transactions, login streaks, daily challenges, and achievements

-- ============ USERS TABLE (if not exists) ============
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============ PROFILES TABLE (if not exists) ============
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  x_handle TEXT,
  wallet_address TEXT,

  -- Streaks (existing columns)
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_played_date TEXT,

  -- Avatar (existing columns)
  avatar_type TEXT DEFAULT 'emoji',
  avatar_value TEXT DEFAULT '🎮',
  avatar_source TEXT DEFAULT 'default',
  avatar_nft_id TEXT,
  avatar_nft_launcher_id TEXT,
  owned_nft_ids TEXT,

  -- Currency (new columns)
  oranges INTEGER DEFAULT 100,
  gems INTEGER DEFAULT 0,
  lifetime_oranges INTEGER DEFAULT 100,
  lifetime_gems INTEGER DEFAULT 0,
  gifted_oranges INTEGER DEFAULT 0,
  gems_converted_this_month INTEGER DEFAULT 0,
  gem_conversion_reset_date TEXT,

  -- NFT holder badge
  owns_nft INTEGER DEFAULT 0,
  owned_nft_count INTEGER DEFAULT 0,

  -- Anti-abuse
  account_trust_level TEXT DEFAULT 'new',
  trust_start_date TEXT DEFAULT CURRENT_TIMESTAMP,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_oranges ON profiles(oranges);
CREATE INDEX IF NOT EXISTS idx_profiles_gems ON profiles(gems);
CREATE INDEX IF NOT EXISTS idx_profiles_owns_nft ON profiles(owns_nft);

-- ============ CURRENCY TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS currency_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('oranges', 'gems')),
  amount INTEGER NOT NULL, -- Positive = earn, negative = spend
  balance_after INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'gameplay', 'challenge', 'login', 'shop', 'gift', 'conversion', 'achievement', 'leaderboard'
  source_details TEXT, -- JSON with additional context
  is_gifted INTEGER DEFAULT 0, -- Tracks if from gift (non-convertible)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON currency_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON currency_transactions(source);

-- ============ LOGIN STREAKS ============
CREATE TABLE IF NOT EXISTS login_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_claim_date TEXT,
  total_claims INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_login_streaks_user ON login_streaks(user_id);

-- ============ DAILY CHALLENGES PROGRESS ============
CREATE TABLE IF NOT EXISTS daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  challenge_date TEXT NOT NULL, -- YYYY-MM-DD in UTC
  challenge_id TEXT NOT NULL, -- 'games-played-5', 'personal-best-1', 'play-time-600'
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  is_claimed INTEGER DEFAULT 0,
  claimed_at TEXT,
  reward_amount INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, challenge_date, challenge_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);

-- ============ ACHIEVEMENTS PROGRESS ============
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  is_claimed INTEGER DEFAULT 0,
  claimed_at TEXT,
  reward_oranges INTEGER DEFAULT 0,
  reward_gems INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);

-- ============ PERIOD LEADERBOARD SCORES ============
CREATE TABLE IF NOT EXISTS period_leaderboard_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_key TEXT NOT NULL, -- '2026-01-21' for daily, '2026-W03' for weekly, '2026-01' for monthly
  score INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 1,
  best_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, game_id, period_type, period_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_period_scores_lookup ON period_leaderboard_scores(game_id, period_type, period_key, best_score DESC);
CREATE INDEX IF NOT EXISTS idx_period_scores_user ON period_leaderboard_scores(user_id, period_type, period_key);

-- ============ LEADERBOARD PAYOUTS ============
CREATE TABLE IF NOT EXISTS leaderboard_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  rank INTEGER NOT NULL,
  reward_amount INTEGER NOT NULL,
  paid_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, game_id, period_type, period_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON leaderboard_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON leaderboard_payouts(period_type, period_key);

-- ============ REWARD NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS reward_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  payout_id INTEGER NOT NULL,
  seen_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, payout_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (payout_id) REFERENCES leaderboard_payouts(id)
);

CREATE INDEX IF NOT EXISTS idx_reward_notifications_user ON reward_notifications(user_id);
