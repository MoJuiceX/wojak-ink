# Mint 429 Audit & Fix (2026-02-20)

## Problem
User saw "Too many requests" (429) after clicking Mint **once**. Rate limit was burning quota even when:
- The same request was replayed (idempotent duplicate with same `idempotencyKey`)
- The request failed (400, 409, 500)

So one "click" could send 2+ requests (e.g. double-fire), each one incrementing the counter, and after 5–15 such events the user hit the limit.

## Root cause
1. **Rate limit was incremented on every request** that passed the check, **before** idempotency.
2. Idempotent replays (same `idempotencyKey`) return the existing job without creating a new one — but we had already incremented the rate limit.
3. So: 2 requests (double-fire) with the same key → 2 increments, 1 job. Legitimate single-user flow was burning 2x (or more) quota.

## Fix (shipped)

### 1. Check-only rate limit at start
- `checkRateLimit(..., increment: false)` at the start of `/api/mint/submit`.
- If at limit → return 429 (no increment).
- If under limit → proceed; **do not increment yet**.

### 2. Increment only when a new job is created
- After successfully creating the job (batch INSERT, KV put, `waitUntil(processJob)`), call `incrementRateLimit(env.DB, ipKey, ...)` and `incrementRateLimit(env.DB, walletKey, ...)`.
- Idempotent path: if existing job for `idempotencyKey`, return that jobId **without** calling `incrementRateLimit`. So duplicate requests (same key) only count once.

### 3. New helper in `functions/lib/rateLimit.ts`
- `checkRateLimit(db, key, config, failClosed, increment = true)` — when `increment` is false, only reads state.
- `incrementRateLimit(db, key, config)` — upserts count (call only when a new mint job is created).

## Result
- One user click → 1 or 2 requests (e.g. double-fire).
- Request 1: check (0 < 15), no existing job, create job, **increment once**, return jobId.
- Request 2 (same idempotencyKey): check (1 < 15), **existing job**, return existing jobId, **no increment**.
- So quota used = 1 for one logical mint. User no longer hits 429 from a single click.

## Deploy
1. Commit these changes.
2. `npm run build`
3. `npx wrangler pages deploy dist --project-name=wojak-ink`
4. Test mint on wojak.ink/generator.

## Files changed
- `functions/lib/rateLimit.ts` — check-only option + `incrementRateLimit`
- `functions/api/mint/submit.ts` — check without increment at start; increment only after job creation
- `functions/api/mint/submit.test.ts` — mock `incrementRateLimit`
