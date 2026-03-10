-- Vote Credit Daily Cap: track eligible votes (max 10/day count toward free mint credits)
-- 100 eligible votes = 100 credits = 1 free mint
-- User can vote unlimited times, but only 10 per day earn credit progress

ALTER TABLE vote_credit_tracking ADD COLUMN eligible_votes INTEGER DEFAULT 0;
ALTER TABLE vote_credit_tracking ADD COLUMN votes_today_for_credits INTEGER DEFAULT 0;

-- Backfill: existing total_votes become eligible_votes (generous — assumes past votes were spread across days)
UPDATE vote_credit_tracking SET eligible_votes = total_votes, votes_today_for_credits = 0;
