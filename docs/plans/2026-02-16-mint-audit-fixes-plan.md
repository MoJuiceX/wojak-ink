# Mint Pipeline Audit Fixes — Implementation Plan

**Design doc:** `docs/plans/2026-02-16-mint-audit-fixes-design.md`

## Step Order

Steps are ordered by dependency and risk. Backend fixes first (no frontend consumers break), then frontend changes, then low-priority items.

---

## Step 1: Backend — Rate limit job polling endpoint (HIGH-2)

**File:** `functions/api/mint/job.ts`

1. Import `checkRateLimit`, `getRateLimitKey`, `MINT_RATE_LIMITS` from `../../lib/rateLimit`
2. Add rate limit config entry for job polling (120 req/min)
3. Add `checkRateLimit` call after method validation, before DB query
4. Verify: `npx tsc --noEmit`

## Step 2: Backend — Server-side expiry on poll (MEDIUM-2)

**File:** `functions/api/mint/job.ts`

1. After loading the job, check if `step === 'awaiting_payment'` and `expires_at` is past
2. If expired: update job to `step='failed'`, `error_code='OFFER_EXPIRED'`, release `wallet_lock`
3. Return the failed state in the response
4. Verify: `npx tsc --noEmit`

## Step 3: Backend — Cleanup timeout protection (HIGH-1)

**File:** `functions/api/mint/cleanup.ts`

1. Reduce `LIMIT 5` → `LIMIT 2` in stale queued job query (line 148)
2. Wrap each `processJob()` call in `Promise.race` with 25s timeout
3. On timeout, mark job as failed with `TIMEOUT` error code
4. Verify: `npx tsc --noEmit`

## Step 4: Backend — Page reload recovery idempotencyKey (MEDIUM-1)

**File:** `functions/api/mint/active-job.ts`

1. Add `idempotency_key` to the SELECT and to the ActiveJobRow interface
2. Include it in the response as `idempotencyKey`
3. Verify: `npx tsc --noEmit`

## Step 5: Backend — MintGarden failure logging (MEDIUM-3)

**File:** `functions/api/mint/cleanup.ts`

1. In the auto-finalize loop (step 1), catch MintGarden errors separately
2. Log audit entry via `logMintStep` when detection fails due to MintGarden unavailability
3. Verify: `npx tsc --noEmit`

## Step 6: Backend — Add auto-finalize to cron worker (LOW-2)

**File:** `workers/mint-cron/worker.ts`

1. Add `detectLauncherByWallet()` function (copy from cleanup.ts, adapted for worker context)
2. Add `finalizeJobInCron()` helper that does the same finalize steps as `finalizeJob` but directly using D1
3. Actually — the cron worker operates differently (no ProcessEnv, standalone). The proper fix is to add the MintGarden detection step that updates `mintgarden_launcher_id` on matching jobs. The actual finalization will be picked up by the next cleanup run or polling cycle.
4. Add step 0: query `awaiting_payment` paid jobs with `mintgarden_launcher_id IS NULL`, call `detectLauncherByWallet`, if found, update `mintgarden_launcher_id` on the job
5. Verify: `npx tsc --noEmit`

## Step 7: Backend — Defensive comments (CRITICAL-3, LOW-1)

**Files:** `functions/api/mint/process.ts`, `functions/api/mint/cleanup.ts`, `workers/mint-cron/worker.ts`

1. Add clarifying comments at:
   - process.ts handleJobFailure refund check (line ~441)
   - cleanup.ts step 8 query (line ~250)
   - mint-cron/worker.ts step 7 query (line ~137)
   - process.ts handleJobFailure retry SQL re: mint_number preservation
2. Verify: `npx tsc --noEmit`

## Step 8: Frontend — Simplify paid mint confirmation flow (CRITICAL-1, CRITICAL-2, HIGH-3)

**Files:** `src/contexts/MintContext.tsx`, `src/components/generator/MintFlowModal.tsx`

1. In `MintContext.tsx`:
   - `acceptOfferInWallet()`: Remove the `/api/mint/confirm-payment` fetch after `takeOffer()`. Just let polling handle it.
   - Remove `confirmMintManual()` function body — replace with no-op or remove entirely
   - Remove `confirmMintManual` from MintContextValue interface and value object
   - Add `setIdempotencyKey(null)` to `retryMint()` (LOW-3)
   - In reload recovery effect, set `idempotencyKey` from recovered job data (MEDIUM-1 frontend side)
2. In `MintFlowModal.tsx`:
   - Remove `confirmMintManual` from useMint() destructure
   - Remove the "I've already accepted the offer" button
   - After `acceptOfferInWallet` click: the existing polling auto-detects, so just keep the current "We'll detect the approval automatically" text
   - Ensure the "Accept in Wallet" button remains — it triggers `takeOffer()` which is needed
3. Verify: `npx tsc --noEmit`

## Step 9: Full build verification

1. Run `npm run build`
2. Verify no TypeScript errors
3. Review git diff for scope — only audit fixes, no unrelated changes

## Step 10: Commit

1. `git add` changed files
2. Commit with descriptive message covering all findings
