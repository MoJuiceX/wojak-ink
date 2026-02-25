-- Admin credit grant: 2026-02-25
-- Grant 3 free mints to wallet xch197sc39was3mh3hfyy5rmyss0suqatcz5en4qy8yn30v3rn0cgl4qxflrfc
-- 1 free mint = 10000 stored credit units (100 display credits)
-- Total: 30000 stored units = 3 free mints

INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, metadata, event_timestamp)
VALUES
('xch197sc39was3mh3hfyy5rmyss0suqatcz5en4qy8yn30v3rn0cgl4qxflrfc', 'manual_grant', 'admin_grant_2026-02-25_xflrfc', 0, 0, 30000, 10000, 'admin', 'manual_grant', '{"reason":"admin grant - 3 free mints","freeMints":3,"date":"2026-02-25"}', '2026-02-25T00:00:00Z');
