# MintGarden Concurrency Gate & Admin Safety Rail

**Date:** 2026-02-17
**Status:** Approved

## Problem

When many users mint simultaneously (e.g. 50 different wallets at launch), all `processJob` calls fire in parallel via `context.waitUntil()`. Each one hits the MintGarden API at the same instant. There is no global concurrency limit — only per-wallet locks. MintGarden could rate-limit us, causing mints to fail permanently.

Additionally, there is no visual admin tool to see at a glance who paid but didn't receive their NFT.

## Goals

1. No more than N concurrent MintGarden API calls (configurable, default 3)
2. A 429 from MintGarden never permanently kills a mint — job re-queues
3. Users see their queue position transparently
4. Every user who paid always gets their NFT or is flagged for admin review
5. Admin dashboard shows flagged cases with action buttons

## Non-Goals

- Real-time WebSocket updates for queue position (polling is sufficient)
- Live queue monitoring panel (queue is self-managing)
- Circuit breaker (over-engineering at 3 concurrent slots — add later if needed)

---

## Design

### 1. Concurrency Gate

**Constant:** `MAX_MINTGARDEN_CONCURRENT = 3` (in `process.ts`)

**Location:** Inside `processJob()`, immediately before the `calling_mintgarden` step.

**Logic:**
```
processJob reaches step 4 (calling_mintgarden)
  -> SELECT COUNT(*) FROM mint_jobs WHERE step = 'calling_mintgarden'
  -> If count >= MAX_MINTGARDEN_CONCURRENT:
       UPDATE mint_jobs SET step = 'mint_queued' WHERE id = ?
       return  (job stops — chain/cron picks it up)
  -> If count < MAX_MINTGARDEN_CONCURRENT:
       proceed to callMintGardenMint() as normal
```

**New step:** `mint_queued` — inserted between `uploading_ipfs` and `calling_mintgarden`. IPFS upload is already complete at this point. The job is fully ready and just waiting for a MintGarden slot.

**Race condition tolerance:** If two workers both read count=2 and both proceed, you briefly get 4 concurrent calls. That's fine — the cap is a throttle, not a safety-critical lock.

### 2. Chain Processing (Capped to 1)

When `processJob` finishes its MintGarden call (success or failure), it checks for the next `mint_queued` job and processes it inline:

```
processJob(A) finishes MintGarden call
  -> SELECT id FROM mint_jobs WHERE step = 'mint_queued'
     AND (not_before IS NULL OR not_before <= datetime('now'))
     ORDER BY created_at ASC LIMIT 1
  -> Found job B?
       -> Load image from KV
       -> Resume processJob(B) from the MintGarden step
       -> B does NOT chain further (cap = 1)
  -> No jobs? Done.
```

**Why cap at 1:** `context.waitUntil()` has execution time limits. Each MintGarden call takes ~5-10s. Capping at 1 keeps background tasks to ~20s total (original job + one chained job).

**Cascade effect:** With 3 concurrent slots and cap-1 chaining, the queue drains in waves:
- Wave 1: Jobs 1-3 (immediate slots)
- Wave 2: Jobs 4-6 (chained from wave 1)
- Wave 3: Jobs 7-9 (chained from wave 2)
- ~3 jobs every 10 seconds -> 50 jobs in ~2-3 minutes

**Safety net:** Cron runs every 5 minutes. If any chain link breaks (worker dies), cron picks up stranded `mint_queued` jobs. Cleanup already handles stuck processing jobs.

### 3. Queue Position & Frontend UX

**Job polling (`job.ts`):** When a job is in `mint_queued`, the response includes:

```json
{
  "step": "mint_queued",
  "stepLabel": "You are #3 in the mint queue",
  "queuePosition": 3,
  "queueTotal": 7
}
```

**Position calculation:**
```sql
SELECT COUNT(*) FROM mint_jobs
WHERE step = 'mint_queued' AND created_at < ?
```

Where `?` is this job's `created_at`. FIFO ordering.

**Frontend (`MintContext.tsx`):**
- `MintJob` type gets optional `queuePosition` and `queueTotal` fields
- Step label rendered dynamically in `job.ts`
- Polling interval for `mint_queued`: 3s (same as active processing — queue position changes quickly)

### 4. MintGarden 429 Handling

**Current behavior:** 429 retries 3 times with 1s/2s/4s backoff, then permanently fails. Bad.

**New behavior in `request.ts`:**
- Detect 429 specifically. Return error code `RATE_LIMITED` to `processJob`.
- `processJob` handles `RATE_LIMITED` by setting step back to `mint_queued` instead of failing. The job keeps its queue position (it already waited its turn).
- Parse `Retry-After` header if present. Store as `not_before` timestamp on the job. Chain/cron skip jobs whose `not_before` is in the future.
- Non-429 errors (500, timeout, network failure) continue to use existing retry logic (3 attempts with backoff, then fail).

**Guarantee:** A 429 never permanently kills a mint.

### 5. Admin Dashboard (Safety Rail)

**Route:** `/admin` — new React page

**Access control:** Same as existing `/api/mint/audit` — prompts for admin password, sends as Bearer token.

**Single panel — Flagged Cases:**
- Pulls from `/api/mint/audit` categories: `paid_not_confirmed`, `needs_refund`, `failed_mints`
- Each row: wallet (truncated), mint number, launcher ID, error, timestamp, status
- Action buttons per row:
  - **Retry Mint** — resets job to `mint_queued` for re-processing
  - **Mark Refund Needed** — calls `/api/mint/refund` with `action: "mark"`
  - **Record Refund Issued** — prompts for txid, calls refund with `action: "issue"`

**Implementation:** Calls existing audit/refund API endpoints. One new endpoint needed: `/api/mint/admin/retry` to reset a failed job to `mint_queued`.

### 6. Migration (044)

**New column:**
```sql
ALTER TABLE mint_jobs ADD COLUMN not_before TEXT;
```

**Step constraint update:** Add `mint_queued` to the CHECK constraint on `mint_jobs.step`. SQLite doesn't support ALTER CONSTRAINT, so this requires a table recreate or permissive migration approach. Test D1 behavior during implementation.

**New `server_state` usage:** None needed (circuit breaker was cut).

---

## Files Changed

| File | Change |
|------|--------|
| `functions/api/mint/process.ts` | Concurrency gate, chain processing (cap 1), RATE_LIMITED handling |
| `functions/api/mint/request.ts` | Detect 429, return RATE_LIMITED code, parse Retry-After |
| `functions/api/mint/job.ts` | Return queuePosition/queueTotal for mint_queued |
| `functions/api/mint/cleanup.ts` | Pick up mint_queued jobs as cron safety net |
| `src/contexts/MintContext.tsx` | Add queuePosition/queueTotal to MintJob type |
| `src/pages/Admin.tsx` (new) | Admin safety rail dashboard |
| `functions/api/mint/admin/retry.ts` (new) | Reset failed job to mint_queued |
| `functions/migrations/044_mint_queue_concurrency.sql` (new) | Add not_before column, update step constraint |

## Guarantees

1. Max 3 concurrent MintGarden API calls (tunable constant)
2. 429 never permanently kills a mint — job re-queues with Retry-After respect
3. Chain processing drains queue in ~2-3 minutes for 50 simultaneous users
4. Cron is the safety net — stranded jobs get picked up within 5 minutes
5. Every paid user either gets their NFT or is flagged in the admin dashboard
6. Admin can retry mints or issue refunds from a single page

## Future Enhancements (Not in v1)

- Circuit breaker for sustained MintGarden outages
- Live queue monitoring panel in admin dashboard
- Recent activity / audit log viewer in admin dashboard
- Configurable MAX_MINTGARDEN_CONCURRENT via env var instead of constant
- Automated email/webhook alerts for flagged cases
