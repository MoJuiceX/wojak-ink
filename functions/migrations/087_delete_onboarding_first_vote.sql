-- Remove deprecated onboarding_first_vote credit events.
-- This incentive was removed in the credit economy tuning (2026-03-10).
-- All wallets that received 2 credits for their first vote will have those entries deleted.

DELETE FROM credit_events WHERE nft_id = 'onboarding_first_vote';
