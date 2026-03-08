-- 080_mint_jobs_ai_metadata.sql
-- Add AI enhancement metadata column to mint_jobs.
-- Stores JSON array of AI edits so process.ts can append
-- AI attributes to CHIP-0007 metadata before IPFS upload.

ALTER TABLE mint_jobs ADD COLUMN ai_metadata_json TEXT;
