# Mint Pipeline Audit Fixes — Design

**Date:** 2026-02-16
**Scope:** 13 audit findings across the minting pipeline (CRITICAL x3, HIGH x3, MEDIUM x3, LOW x3)

## Context

The audit was written against a pre-fix version of `confirm-payment.ts`. Several findings (CRITICAL-1/2/3, LOW-1) have been partially or fully addressed in the current code. This design covers all findings — implementing fixes where needed and adding defensive checks where code is already correct.

## Section 1: Paid Mint Confirmation Flow (CRITICAL-1, CRITICAL-2, HIGH-3)

Make auto-finalize the official path. Remove broken confirm-payment calls from UI button handlers.

- `acceptOfferInWallet()`: After `takeOffer()`, stop. Don't call confirm-payment. Polling handles detection.
- `confirmMintManual()`: Remove confirm-payment call. Show "checking automatically" message instead.
- Remove `confirmMintManual` from MintContextValue. Remove the "I've already accepted" button from MintFlowModal.
- Keep polling loop's confirm-payment call (lines 337-350) — that's the fast-path auto-detect.
- Keep `confirm-payment.ts` unchanged as admin/fallback endpoint.

## Section 2: Defensive Checks for Refund Flagging (CRITICAL-3)

Code is already correct (`mintgarden_launcher_id` check). Add clarifying comments in:
- `process.ts` handleJobFailure (line 441)
- `cleanup.ts` step 8 (line 257)
- `workers/mint-cron/worker.ts` step 7 (line 144)

## Section 3: Cleanup Timeout Protection (HIGH-1)

- Reduce `LIMIT 5` → `LIMIT 2` for stale queued job retries in `cleanup.ts`
- Wrap each `processJob()` in `Promise.race` with 25-second timeout
- On timeout, mark job as failed with `TIMEOUT` error code

## Section 4: Rate Limiting on Job Polling (HIGH-2)

- Add `checkRateLimit` to `job.ts`: 120 req/min per IP (6x headroom over normal polling)

## Section 5: Page Reload Recovery (MEDIUM-1)

- Add `idempotency_key` to `active-job.ts` SELECT and response
- Set `idempotencyKey` in MintContext reload recovery effect

## Section 6: Server-Side Expiry on Poll (MEDIUM-2)

- In `job.ts`, if job is `awaiting_payment` and `expires_at < NOW()`, inline-update to failed
- Return the failed state — makes polling authoritative about expiry

## Section 7: MintGarden Dependency Mitigation (MEDIUM-3)

- In `cleanup.ts` auto-finalize loop, log audit entry when MintGarden is unreachable
- Enables admin visibility into hung paid mints

## Section 8: Defensive Check for mint_number on Retry (LOW-1)

Code is correct. Add clarifying comment in `handleJobFailure` retry SQL documenting intentional mint_number preservation.

## Section 9: Add Auto-Finalize to Cron Worker (LOW-2)

- Add detectLauncherByWallet + auto-finalize step to `workers/mint-cron/worker.ts`
- Mirror cleanup.ts step 1 logic

## Section 10: Clear stale idempotencyKey on Retry (LOW-3)

- Add `setIdempotencyKey(null)` in `retryMint()`
