-- Migration: 074_friends_status
-- Add status column to friends table for friend request workflow
-- Referenced in: functions/api/profile/[userId].ts, functions/api/gift.ts

-- Add status column with default 'accepted' for backwards compatibility
-- (existing rows are already accepted friendships)
ALTER TABLE friends ADD COLUMN status TEXT NOT NULL DEFAULT 'accepted'
  CHECK(status IN ('pending', 'accepted', 'blocked'));

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(user_id, status);
