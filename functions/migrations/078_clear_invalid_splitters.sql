-- Clear all cached splitter addresses from before verification polling was added.
-- These were created on 2026-02-20 when SplitXCH backend was broken.
-- New addresses will be created and verified on next mint per wallet.
DELETE FROM splitter_addresses;
