# Phase 1: Mint Pipeline Test Suite

## What This Is

You are adding the first test coverage to the wojak.ink minting pipeline. This is a Chia blockchain NFT minting system with a queue-based async architecture. There are currently **zero tests** for the mint pipeline. You will write tests for the most critical money-handling flows.

## Before You Start

1. Read `CLAUDE.md` for project conventions
2. Read `functions/api/mint/_shared.ts` for constants and helpers
3. Read `functions/api/mint/submit.ts` — the submission endpoint
4. Read `functions/api/mint/process.ts` — the background processor
5. Read `functions/api/mint/cleanup.ts` — the stale job cleanup
6. Read `functions/api/mint/job.ts` — the polling endpoint
7. Read `functions/api/mint/active-job.ts` — page reload recovery
8. Read `functions/api/mint/confirm-payment.ts` — paid mint confirmation
9. Read `functions/api/mint/mintNumberHelper.ts` — atomic mint number reservation
10. Read `src/contexts/MintContext.tsx` — frontend state machine

## Tech Stack

- **Test runner:** Vitest (already configured, `happy-dom` environment)
- **Run tests:** `npm run test:unit` (single run) or `npm run test:unit:watch` (watch mode)
- **Test location:** Place test files next to the source files they test, e.g. `functions/api/mint/submit.test.ts`
- **Existing tests for reference:** `src/lib/wojakRules.test.ts`, `src/contexts/generatorReducer.test.ts`

## Architecture Context

The mint flow works like this:

1. **Submit** (`POST /api/mint/submit`) — Validates input, checks sold_out flag, checks supply (minted + in-flight), calculates pricing/surcharges, deducts credits atomically for free mints (INSERT...SELECT WHERE balance >=), computes image hash, INSERTs mint_job with wallet_lock (per-wallet mutex via partial UNIQUE index), stores image in KV, triggers `processJob()` via `waitUntil()`
2. **Process** (`processJob()`) — Steps: validating -> reserving_number -> uploading_ipfs -> calling_mintgarden -> awaiting_payment (paid) / finalizing (free). Uses atomic `UPDATE...RETURNING` for mint numbers. On failure: retries up to 3x, refunds credits for free mints, flags refunds for paid mints
3. **Poll** (`GET /api/mint/job`) — Frontend polls every 3 seconds. Returns step progress, error messages, offer file for paid mints. Also inline-expires jobs past `expires_at`
4. **Confirm** (`POST /api/mint/confirm-payment`) — For paid mints: verifies launcherId on MintGarden API, calls `finalizeJob()`
5. **Cleanup** (`cleanupStaleJobs()`) — Auto-finalizes paid mints via MintGarden search, expires stuck jobs, retries stale queued jobs, refunds credits, unpins IPFS

## What to Test

Use `/brainstorm` to explore the test strategy, then `/write-plan` to break it into tasks, then `/execute-plan` to implement.

### Critical Flows (Must Test)

**submit.ts tests:**
- Valid free mint submission creates a job with correct fields
- Valid paid mint submission creates a job with XCH price
- Idempotency: same key returns existing job instead of creating new one
- Wallet lock: second submission from same wallet returns 409 with `WALLET_LOCKED`
- Sold out: returns error when `server_state.sold_out = 'true'`
- Supply exhausted: returns error when minted + in-flight >= 4200
- Minting paused: returns error when `server_state.minting_paused = 'true'`
- Credit deduction: free mint deducts credits atomically
- Insufficient credits: returns 400 with balance info
- Credit refund on INSERT failure: if job INSERT fails after credit deduction, credits are restored
- Invalid wallet address: rejected (not bech32m format)
- Invalid layer names: rejected
- Path traversal attempt (`../` in layer path): rejected
- Missing idempotencyKey: returns 400
- Rate limiting: 6th request within 1 minute returns 429

**mintNumberHelper.ts tests:**
- Returns next sequential number
- Atomic: concurrent calls get different numbers
- Returns SUPPLY_EXHAUSTED when cap reached

**process.ts tests:**
- Free mint: full flow from queued to completed
- Paid mint: flow from queued to awaiting_payment (generates offer file)
- Failure handling: IPFS upload failure triggers retry (up to 3x)
- Failure handling: all retries exhausted marks job as failed
- Free mint failure: credits are refunded
- Paid mint failure after launcher set: refund is flagged
- `finalizeJob`: atomic batch insert (phase2_mints + trait_usage upsert)
- `finalizeJob`: supply check sets sold_out flag when minted count = TOTAL_SUPPLY
- `finalizeJob`: releases wallet_lock (sets to NULL)

**cleanup.ts tests:**
- Auto-finalize: detects paid mint via MintGarden search, finalizes
- Expire: jobs past `expires_at` are marked failed with OFFER_EXPIRED
- Stuck processing: jobs not updated for 5+ minutes are failed with TIMEOUT
- Retry: stale queued jobs with image in KV are retried
- Retry: stale queued jobs without image in KV are failed with IMAGE_EXPIRED
- Credit refund: failed free mint jobs get credits refunded
- IPFS unpin: failed jobs older than 1 hour get IPFS pins removed

**job.ts tests:**
- Returns correct step info for each step
- Rate limited: 121st request in 1 minute returns 429
- Inline expiry: awaiting_payment jobs past expires_at are expired on poll
- Wrong wallet: returns 404

**active-job.ts tests:**
- Returns active job with idempotencyKey for wallet with active mint
- Returns null when no active job
- Wrong wallet: no results

### Mocking Strategy

You will need to mock:
- `D1Database` — Mock the `.prepare().bind().first()` / `.run()` / `.all()` / `.batch()` chain
- `KVNamespace` — Mock `.put()` and `.get()`
- `processJob` — Mock for submit.ts tests (it runs in background via waitUntil)
- `fetch` — Mock for MintGarden API calls and Pinata uploads
- `context.waitUntil` — Mock to capture the background promise

Create a shared test helper file at `functions/api/mint/test-helpers.ts` with:
- `createMockEnv()` — Returns a mock Env with D1, KV, and env vars
- `createMockRequest(body, method?)` — Returns a mock Request
- `createMockContext(env)` — Returns a mock PagesFunction context with waitUntil spy

## Constraints

- Do NOT modify any source files. Tests only.
- Do NOT add new dependencies without documenting why.
- Do NOT use `!important` in any CSS (not that you should need CSS here).
- Place tests next to the files they test: `functions/api/mint/submit.test.ts`, etc.
- Use `describe` / `it` blocks with clear names describing the behavior being tested.
- Each test should be independent — no shared mutable state between tests.
