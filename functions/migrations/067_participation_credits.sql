-- Participation Credits: Track votes for per-20-vote credit awards
-- 1 credit per 20 votes, 10 credits per 7-day streak

CREATE TABLE IF NOT EXISTS vote_credit_tracking (
  wallet_address TEXT PRIMARY KEY,
  total_votes INTEGER DEFAULT 0,
  credits_awarded_at INTEGER DEFAULT 0,  -- total_votes count when last 20-vote credit was awarded
  current_streak_days INTEGER DEFAULT 0,
  last_vote_date TEXT,
  last_streak_credit_date TEXT
);
