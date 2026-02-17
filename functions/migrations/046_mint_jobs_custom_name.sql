-- 046_mint_jobs_custom_name.sql
-- Add custom_name column to mint_jobs for NFT naming in mint flow

ALTER TABLE mint_jobs ADD COLUMN custom_name TEXT;
