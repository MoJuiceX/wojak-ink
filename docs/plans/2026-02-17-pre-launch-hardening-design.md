# Pre-Launch Hardening Design

**Date:** 2026-02-17
**Goal:** Make the mint pipeline bulletproof before Friday launch. Core principle: once a user clicks mint, their intent is sacred -- the system must eventually deliver, no matter what breaks along the way.

## 9 Fixes

### Fix 1: Atomic Credit Deduction + Job Creation (CRITICAL)
**Problem:** Credits are deducted (INSERT into credit_spends) BEFORE the job is created (INSERT into mint_jobs). If the process crashes between these two operations, credits are lost with no job to track or refund them.
**Fix:** Use D1 `.batch()` to make credit deduction and job creation atomic. Insert credit_spends with a placeholder, then create the job, then update credit_spends with the real job reference -- all in one batch.

### Fix 2: Idempotent Finalization (CRITICAL)
**Problem:** `finalizeJob()` does a plain `INSERT INTO phase2_mints` without `ON CONFLICT`. If finalization is retried (cleanup auto-finalize, network timeout on first attempt), the duplicate INSERT crashes.
**Fix:** Add `ON CONFLICT(mint_number) DO NOTHING` to the phase2_mints INSERT. Check if the row already exists before proceeding with post-insert operations.

### Fix 3: Wrap All Cleanup Operations in try-catch (CRITICAL)
**Problem:** Cleanup operations 2, 3, 5, 6 in cleanup.ts have bare D1 operations. If any single operation fails (D1 timeout, constraint violation), the entire cleanup cron crashes and subsequent operations are skipped.
**Fix:** Wrap each cleanup operation in its own try-catch block so failures are isolated.

### Fix 4: Absolute Lock Timeout (HIGH)
**Problem:** Wallet locks depend entirely on the cleanup cron running correctly. If cleanup fails or doesn't run, a wallet can be permanently locked.
**Fix:** Add a 30-minute hard ceiling -- any job with wallet_lock set for >30 minutes gets force-released, regardless of step.

### Fix 5: Phantom Mint Detection for Free Mints (HIGH)
**Problem:** Free mints that fail after MintGarden returns a launcherId have the NFT already created on-chain but the job marked as failed. The cleanup only runs `detectLauncherByWallet` for paid mints, not free mints.
**Fix:** Add phantom detection for free mints in cleanup: find failed free mint jobs with a non-null launcherId and auto-finalize them.

### Fix 6: Timeout on MintGarden Fetch Calls + Consolidate detectLauncher (HIGH)
**Problem:** `detectLauncherByWallet()` and `verifyLauncherOnChain()` in cleanup.ts and confirm-payment.ts use bare `fetch()` with no timeout. MintGarden hanging blocks the entire cleanup/confirmation flow. The function is also duplicated across two files.
**Fix:** Add AbortController timeouts (10s) to all MintGarden verification fetches. Move `detectLauncherByWallet` and `verifyLauncherOnChain` to a shared module `mintgardenVerify.ts`.

### Fix 7: Cleanup Locking (MEDIUM)
**Problem:** If the cron endpoint is called twice in quick succession, two cleanup runs execute concurrently, potentially double-processing jobs (double refunds, double finalizations).
**Fix:** Use a `server_state` row as a mutex: set `cleanup_running = <timestamp>` at start, clear at end. Skip if already running and started <5 minutes ago.

### Fix 8: Polling Backoff for awaiting_payment (MEDIUM)
**Problem:** During `awaiting_payment`, every 10s poll cycle calls `/api/mint/confirm-payment` which hits MintGarden API. This is wasteful and can trigger rate limits.
**Fix:** Implement progressive backoff: start at 5s, increase to 10s after 30s, then 15s after 2min, then 20s after 5min.

### Fix 9: Extend Image KV TTL + IPFS Fallback on Retry (MEDIUM)
**Problem:** Image stored in KV with 30-min TTL, but KV entry is deleted immediately after IPFS upload (process.ts line 189). If MintGarden fails and retry is needed, the image is gone from both KV and no IPFS fallback exists. Job fails with IMAGE_EXPIRED.
**Fix:** Keep image in KV until job completes (don't delete after IPFS upload). Extend TTL to 2 hours. On retry, if KV is empty but IPFS URIs exist, skip re-upload.

## Migration

A new migration `043_hardening.sql` adds:
- `UNIQUE` constraint on `phase2_mints(mint_number)` for idempotent finalization
- Server state rows for cleanup mutex

## File Changes

| File | Fixes |
|------|-------|
| `functions/api/mint/submit.ts` | Fix 1, Fix 9 |
| `functions/api/mint/process.ts` | Fix 2, Fix 5, Fix 9 |
| `functions/api/mint/cleanup.ts` | Fix 3, Fix 4, Fix 5, Fix 7 |
| `functions/api/mint/confirm-payment.ts` | Fix 6 |
| `functions/api/mint/mintgardenVerify.ts` | Fix 6 (new shared module) |
| `functions/api/mint/cron.ts` | Fix 7 |
| `src/contexts/MintContext.tsx` | Fix 8 |
| `functions/migrations/043_hardening.sql` | Fix 2 |
