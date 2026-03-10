-- Backfill onboarding_first_mint credits from 500 (5 display) to 4200 (42 display).
-- 25 wallets affected. Already executed on production D1 on 2026-03-10.

UPDATE credit_events SET credits_earned = 4200 WHERE nft_id = 'onboarding_first_mint' AND credits_earned = 500;
