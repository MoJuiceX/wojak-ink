-- Add balance_at_assignment to track the on-chain balance when an address is
-- assigned to a purchase. Confirmation then checks that the balance INCREASED
-- by at least the expected amount, enabling safe address reuse.
ALTER TABLE ai_payment_addresses ADD COLUMN balance_at_assignment INTEGER DEFAULT 0;

-- Release addresses from confirmed purchases so they return to the pool.
-- These addresses already have on-chain balances from prior payments, but the
-- new balance_at_assignment column will be set when they're next assigned,
-- so confirmation correctly checks the delta.
UPDATE ai_payment_addresses SET purchase_id = NULL
WHERE purchase_id IN (SELECT id FROM ai_credit_purchases WHERE status = 'confirmed');
