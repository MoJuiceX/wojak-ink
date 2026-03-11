-- Add cumulative AI trait overrides column to ai_enhancements.
-- Stores a JSON map like {"clothes": "Viking Hoodie", "head": "Cowboy Hat"}
-- representing the cumulative trait replacements at this point in the chain.
ALTER TABLE ai_enhancements ADD COLUMN ai_trait_overrides TEXT DEFAULT NULL;
