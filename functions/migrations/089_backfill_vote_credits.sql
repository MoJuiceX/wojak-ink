-- Backfill vote credits: 10 display credits (1000 stored) per 10 eligible votes.
-- Previously wallets got 1 credit (100 stored) per 20 votes. Already executed on production D1 2026-03-11.
-- 11 wallets updated, 1 wallet inserted (had votes but no credit event).

UPDATE credit_events SET credits_earned = 46000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1w9uwe4wjj4hs7nf0np6m6zx69302vdckz22vqvn6yxl0ghgzd0ush3hqnf';
UPDATE credit_events SET credits_earned = 37000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1r5yt52muwy5lyzce8ckzk29v6lsf59nhlzz4rwwtxxkr8eqmwjsqqmt02c';
UPDATE credit_events SET credits_earned = 10000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk';
UPDATE credit_events SET credits_earned = 9000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1puma3rsdmfveymykc27u73s5cy6skd9442tsqzhquswhkzy8mdpsaqsgdx';
UPDATE credit_events SET credits_earned = 7000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1kwfq35wzw7ynp36rltq54q7pewuy633hhk39wn4qfausmmfnga7s7dwkqz';
UPDATE credit_events SET credits_earned = 6000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1lue0uj7t2kzxw09lwc3h6rjp5kzpav6ufvzkd3qv5u3y47qgee8sjemkrh';
UPDATE credit_events SET credits_earned = 4000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch19pz3t9hxkfd2psqlqpmdwptr6t5xcmldu5zj2ujnpmfwzvajx08s4dcxtg';
UPDATE credit_events SET credits_earned = 4000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1sml9tay0s7r27v27p9f5xvm456ghymtuy278eygpc997u3f9qj4qf99vy0';
UPDATE credit_events SET credits_earned = 3000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1hrucpsfqznqvgput8trj4ye9sfv8kq38ae2xexwf69usvazh8qvsqxgphq';
UPDATE credit_events SET credits_earned = 2000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch14ar2w3m79y3say8g9qx7ey58jwzsx85fatr4xwvc5ycrt5faa6vqlg6gt0';
UPDATE credit_events SET credits_earned = 2000 WHERE nft_id = 'participation_vote' AND wallet_address = 'xch1rhl2hypfnq3xpy7ykhyk8awrzvnf6vmn8e37stfpux20cef6tkrsqxdmew';
