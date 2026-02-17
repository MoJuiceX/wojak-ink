# MintGarden Concurrency Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Limit concurrent MintGarden API calls to 3, queue excess mints with visible position, handle 429s gracefully, and add an admin safety rail panel for flagged paid-but-undelivered mints.

**Architecture:** D1-based concurrency gate in `processJob` with cap-1 chain processing for fast queue drain. New `mint_queued` step between `uploading_ipfs` and `calling_mintgarden`. Admin panel added to existing `/admin` page.

**Tech Stack:** Cloudflare Pages Functions (TypeScript), D1 (SQLite), Vitest, React

---

## Task 1: Add RATE_LIMITED Error Code

**Files:**
- Modify: `functions/api/mint/errors.ts`
- Test: `functions/api/mint/process.test.ts` (verified by later tasks)

**Step 1: Add RATE_LIMITED to MintErrorCode type**

In `functions/api/mint/errors.ts`, add `'RATE_LIMITED'` to the union type after `'QUEUE_TIMEOUT'`:

```typescript
export type MintErrorCode =
  | 'SOLD_OUT'
  | 'INSUFFICIENT_CREDITS'
  | 'WALLET_LOCKED'
  | 'INVALID_TRAITS'
  | 'IPFS_UPLOAD_FAILED'
  | 'MINTGARDEN_FAILED'
  | 'OFFER_CREATION_FAILED'
  | 'OFFER_EXPIRED'
  | 'PAYMENT_NOT_VERIFIED'
  | 'FINALIZE_FAILED'
  | 'IMAGE_EXPIRED'
  | 'TIMEOUT'
  | 'QUEUE_TIMEOUT'
  | 'RATE_LIMITED'
  | 'CONFIG_ERROR'
  | 'SUPPLY_EXHAUSTED'
  | 'JOB_NOT_FOUND'
  | 'INTERNAL_ERROR';
```

**Step 2: Add user-friendly message**

In the `MINT_ERROR_MESSAGES` object, add after `QUEUE_TIMEOUT`:

```typescript
RATE_LIMITED: 'The minting service is busy. Your mint is queued and will process shortly.',
```

**Step 3: Run tests**

Run: `npx vitest run functions/api/mint/errors`
Expected: No test file for errors.ts — that's fine, it's a type/constant file. Verify build: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add functions/api/mint/errors.ts
git commit -m "feat: add RATE_LIMITED error code for MintGarden throttling"
```

---

## Task 2: Migration 044 — Add mint_queued Step and not_before Column

**Files:**
- Create: `functions/migrations/044_concurrency_queue.sql`

**Step 1: Write the migration**

SQLite doesn't support `ALTER TABLE ... ALTER CONSTRAINT`. The cleanest approach: add the column, then recreate the table with the updated CHECK constraint.

```sql
-- 044: Add mint_queued step and not_before column for MintGarden concurrency gate.
--
-- mint_queued: job has completed IPFS upload and is waiting for a MintGarden slot.
-- not_before: earliest time this job should be picked up (from Retry-After headers).

-- Step 1: Add the not_before column
ALTER TABLE mint_jobs ADD COLUMN not_before TEXT;

-- Step 2: Recreate table with updated CHECK constraint.
-- D1 supports "ALTER TABLE ... RENAME" and "CREATE TABLE ... AS SELECT" patterns,
-- but the safest approach for CHECK constraints is a full table recreate.

CREATE TABLE mint_jobs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  layers_json TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  image_base64_hash TEXT NOT NULL,
  mint_type TEXT NOT NULL CHECK(mint_type IN ('paid', 'free')),
  credit_cost INTEGER,
  xch_price_mojos INTEGER,
  surcharge_xch INTEGER,
  highest_surcharge_trait TEXT,
  step TEXT NOT NULL DEFAULT 'queued'
    CHECK(step IN (
      'queued',
      'validating',
      'reserving_number',
      'uploading_ipfs',
      'mint_queued',
      'calling_mintgarden',
      'awaiting_payment',
      'finalizing',
      'completed',
      'failed',
      'refunded'
    )),
  mint_number INTEGER,
  ipfs_image_uris TEXT,
  ipfs_metadata_uris TEXT,
  image_hash TEXT,
  metadata_hash TEXT,
  mintgarden_launcher_id TEXT,
  offer_file TEXT,
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  phase2_mint_id INTEGER,
  credit_spend_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  expires_at TEXT,
  wallet_lock TEXT,
  not_before TEXT
);

INSERT INTO mint_jobs_new SELECT
  id, wallet_address, idempotency_key, layers_json, colors_json,
  image_base64_hash, mint_type, credit_cost, xch_price_mojos,
  surcharge_xch, highest_surcharge_trait, step, mint_number,
  ipfs_image_uris, ipfs_metadata_uris, image_hash, metadata_hash,
  mintgarden_launcher_id, offer_file, error_message, error_code,
  retry_count, max_retries, phase2_mint_id, credit_spend_id,
  created_at, updated_at, started_at, completed_at, expires_at,
  wallet_lock, not_before
FROM mint_jobs;

DROP TABLE mint_jobs;
ALTER TABLE mint_jobs_new RENAME TO mint_jobs;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mj_wallet_lock
  ON mint_jobs(wallet_lock) WHERE wallet_lock IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mj_idempotency
  ON mint_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mj_step ON mint_jobs(step);
CREATE INDEX IF NOT EXISTS idx_mj_wallet_step ON mint_jobs(wallet_address, step);
```

**Step 2: Test locally**

Run: `npx wrangler d1 execute wojak-users --local --file=functions/migrations/044_concurrency_queue.sql`
Expected: Success, no errors.

**Step 3: Verify the new step works**

Run: `npx wrangler d1 execute wojak-users --local --command "INSERT INTO mint_jobs (wallet_address, layers_json, colors_json, image_base64_hash, mint_type, step) VALUES ('xch1test', '{}', '{}', 'hash', 'free', 'mint_queued')"`
Expected: Success (mint_queued is now a valid step value).

**Step 4: Commit**

```bash
git add functions/migrations/044_concurrency_queue.sql
git commit -m "feat: migration 044 — add mint_queued step and not_before column"
```

---

## Task 3: MintGarden 429 Detection in request.ts

**Files:**
- Modify: `functions/api/mint/request.ts`
- Test: New test or inline verification

**Step 1: Write the failing test**

Create/modify test to verify 429 throws a MintError with RATE_LIMITED code. Add to `functions/api/mint/request.test.ts` (create if needed):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./errors', async () => {
  const actual = await vi.importActual('./errors');
  return actual;
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { callMintGardenMint } from './request';
import { MintError } from './errors';

const baseParams = {
  walletAddress: 'xch1' + 'a'.repeat(58),
  mintType: 'free' as const,
  ipfsImageUris: ['ipfs://QmTest'],
  ipfsMetadataUris: ['ipfs://QmMeta'],
  imageHash: 'abc123',
  metadataHash: 'def456',
  collectionUuid: 'uuid',
  editionNumber: 1,
  editionTotal: 4200,
};

const baseEnv = {
  MINTGARDEN_API_KEY: 'key',
  PHASE2_PROFILE_ID: 'pid',
  PHASE2_ROYALTY_PCT: '10',
};

describe('callMintGardenMint', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('throws RATE_LIMITED MintError on 429 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: 'Too many requests' }),
      headers: new Headers(),
    });

    await expect(callMintGardenMint(baseParams, baseEnv as any))
      .rejects.toThrow(MintError);

    try {
      await callMintGardenMint(baseParams, baseEnv as any);
    } catch (e) {
      expect((e as MintError).code).toBe('RATE_LIMITED');
    }
  });

  it('includes retryAfterMs when Retry-After header present', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: 'Too many requests' }),
      headers: new Headers({ 'Retry-After': '30' }),
    });

    try {
      await callMintGardenMint(baseParams, baseEnv as any);
    } catch (e) {
      expect((e as MintError).code).toBe('RATE_LIMITED');
      expect((e as any).retryAfterMs).toBe(30000);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/mint/request.test.ts`
Expected: FAIL — current code doesn't throw RATE_LIMITED.

**Step 3: Implement 429 detection**

In `functions/api/mint/request.ts`, modify the `callMintGardenMint` function. Import MintError at top:

```typescript
import { MintError } from './errors';
```

Inside the retry loop, replace the `if (!res.ok)` block (around line 180) with:

```typescript
      if (!res.ok) {
        console.error('[MintGarden] API error:', res.status, data.error ?? data.message ?? text);
        lastError = data.error ?? data.message ?? text ?? `HTTP ${res.status}`;

        // 429 = rate limited. Don't retry — throw immediately so processJob can re-queue.
        if (res.status === 429) {
          const retryAfterSec = parseInt(res.headers.get('Retry-After') ?? '', 10);
          const err = new MintError('RATE_LIMITED', `MintGarden rate limited: ${lastError}`);
          // Attach retryAfterMs for processJob to use as not_before
          (err as any).retryAfterMs = !isNaN(retryAfterSec) ? retryAfterSec * 1000 : 30_000;
          throw err;
        }

        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new Error(`MintGarden API failed after ${MAX_RETRIES} retries: ${lastError}`);
      }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/mint/request.test.ts`
Expected: PASS

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add functions/api/mint/request.ts functions/api/mint/request.test.ts
git commit -m "feat: detect MintGarden 429 and throw RATE_LIMITED error"
```

---

## Task 4: Concurrency Gate + Chain Processing in process.ts

This is the core change. `processJob` gets a concurrency check before calling MintGarden, and chain processing after.

**Files:**
- Modify: `functions/api/mint/process.ts`
- Test: `functions/api/mint/process.test.ts`

**Step 1: Write failing tests**

Add these tests to `functions/api/mint/process.test.ts`:

```typescript
  it('sets step to mint_queued when concurrency limit reached', async () => {
    const job = makeQueuedJob({ id: 1, mint_type: 'free' });
    // Mock: 3 jobs already in calling_mintgarden
    const concurrencyStmt = {
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ count: 3 }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    };
    const env = createProcessEnv({
      'SELECT * FROM mint_jobs WHERE id': makeStmt(job),
      'calling_mintgarden': concurrencyStmt,
    });

    await processJob(env, 1, DUMMY_IMAGE);
    // Should have set step to mint_queued (not calling_mintgarden)
    expect(mockUpdateJobStep).toHaveBeenCalledWith(expect.anything(), 1, 'mint_queued');
    expect(mockCallMintGarden).not.toHaveBeenCalled();
  });

  it('proceeds to MintGarden when under concurrency limit', async () => {
    const job = makeQueuedJob({ id: 1, mint_type: 'free' });
    // Mock: 1 job in calling_mintgarden (under limit of 3)
    const concurrencyStmt = {
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ count: 1 }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    };
    const env = createProcessEnv({
      'SELECT * FROM mint_jobs WHERE id': makeStmt(job),
      'calling_mintgarden': concurrencyStmt,
    });

    await processJob(env, 1, DUMMY_IMAGE);
    expect(mockCallMintGarden).toHaveBeenCalled();
  });

  it('re-queues to mint_queued on RATE_LIMITED error', async () => {
    const job = makeQueuedJob({ id: 1, mint_type: 'free' });
    const concurrencyStmt = {
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ count: 0 }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    };
    const env = createProcessEnv({
      'SELECT * FROM mint_jobs WHERE id': makeStmt(job),
      'calling_mintgarden': concurrencyStmt,
    });

    const rateLimitErr = new MintError('RATE_LIMITED', 'Rate limited');
    (rateLimitErr as any).retryAfterMs = 30000;
    mockCallMintGarden.mockRejectedValueOnce(rateLimitErr);

    await processJob(env, 1, DUMMY_IMAGE);
    // Should set step to mint_queued with not_before timestamp
    const updateCalls = env.DB.prepare.mock.calls;
    const mintQueuedCall = updateCalls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('mint_queued') && c[0].includes('not_before')
    );
    expect(mintQueuedCall).toBeTruthy();
  });
```

Note: The exact mock patterns will need to match the existing test helpers in the file. Adapt `makeQueuedJob`, `createProcessEnv`, `mockUpdateJobStep`, `mockCallMintGarden`, and `DUMMY_IMAGE` to match the actual test setup. Read the existing test file's helpers before writing.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run functions/api/mint/process.test.ts`
Expected: FAIL — mint_queued logic doesn't exist yet.

**Step 3: Implement concurrency gate**

In `functions/api/mint/process.ts`, add constant at top (after imports):

```typescript
const MAX_MINTGARDEN_CONCURRENT = 3;
```

Replace the `calling_mintgarden` step block (line 203+). Before `await updateJobStep(env.DB, jobId, 'calling_mintgarden')`, insert:

```typescript
    // ──── CONCURRENCY GATE ────
    // Check how many jobs are currently calling MintGarden.
    // If at capacity, park this job in mint_queued for chain/cron pickup.
    const concurrencyCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'"
    ).first<{ count: number }>();

    if ((concurrencyCount?.count ?? 0) >= MAX_MINTGARDEN_CONCURRENT) {
      await updateJobStep(env.DB, jobId, 'mint_queued');
      console.log(`[MintProcessor] Job ${jobId} queued — ${concurrencyCount!.count} MintGarden calls in flight`);
      return; // Chain processing from another job or cron will pick this up
    }

    // ──── STEP 4: Call MintGarden ────
    await updateJobStep(env.DB, jobId, 'calling_mintgarden');
```

**Step 4: Implement RATE_LIMITED re-queue**

In the `catch (error)` block of `processJob` (around line 260), add handling before the generic `handleJobFailure`:

```typescript
  } catch (error) {
    // Rate-limited by MintGarden — re-queue instead of failing
    if (error instanceof MintError && error.code === 'RATE_LIMITED') {
      const retryAfterMs = (error as any).retryAfterMs ?? 30_000;
      const notBefore = new Date(Date.now() + retryAfterMs).toISOString();
      await env.DB.prepare(
        "UPDATE mint_jobs SET step = 'mint_queued', not_before = ?, error_message = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(notBefore, error.message, jobId).run();
      console.log(`[MintProcessor] Job ${jobId} rate-limited, re-queued with not_before=${notBefore}`);
      return;
    }
    await handleJobFailure(env, jobId, job, error);
  }
```

**Step 5: Implement chain processing**

After the MintGarden call succeeds and results are stored (after the `if (job.mint_type === 'paid')` block, around line 255), but BEFORE the `finalizeJob` call for free mints, add a chain trigger helper. Actually, the cleanest place is after the entire processJob try/catch — add a new function and call it:

Add to the bottom of the try block (after `await finalizeJob(env, jobId)` for free mints, and after the `return` for paid mints), insert a chain call. The cleanest approach: wrap the chain in a finally-like pattern.

Add this function after `handleJobFailure`:

```typescript
/**
 * Chain processing: pick up the next mint_queued job and process it.
 * Called after a MintGarden call completes (success or failure).
 * Capped to 1 to stay within waitUntil execution limits.
 */
async function chainNextQueuedJob(env: ProcessEnv): Promise<void> {
  try {
    const next = await env.DB.prepare(
      `SELECT id FROM mint_jobs WHERE step = 'mint_queued'
       AND (not_before IS NULL OR not_before <= datetime('now'))
       ORDER BY created_at ASC LIMIT 1`
    ).first<{ id: number }>();

    if (!next) return;

    const imageBase64 = await env.MINT_JOBS_KV.get(`job-image:${next.id}`);
    if (!imageBase64) {
      // Image expired — fail it
      await env.DB.prepare(
        "UPDATE mint_jobs SET step = 'failed', error_message = 'Image data expired', error_code = 'IMAGE_EXPIRED', wallet_lock = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(next.id).run();
      return;
    }

    // Reset step to queued so processJob picks it up normally
    // (it will pass the concurrency gate since we just freed a slot)
    await env.DB.prepare(
      "UPDATE mint_jobs SET step = 'queued', updated_at = datetime('now') WHERE id = ? AND step = 'mint_queued'"
    ).bind(next.id).run();

    await processJob(env, next.id, imageBase64);
  } catch (err) {
    console.error('[MintProcessor] Chain processing failed:', err);
    // Non-fatal — cron will pick up stranded jobs
  }
}
```

Then call `chainNextQueuedJob(env)` at two points:
1. After the free mint `finalizeJob` call (line 258):
   ```typescript
   await finalizeJob(env, jobId);
   await chainNextQueuedJob(env);
   ```
2. After the paid mint `return` (inside the `if (job.mint_type === 'paid')` block), this won't work since it returns. Instead, call it in the RATE_LIMITED catch and also when the job moves to awaiting_payment. Actually, the chain should fire after the MintGarden HTTP call completes — regardless of whether it's free or paid. Add it right after both the free and paid result handling blocks, before the `if (job.mint_type === 'paid')` early return:

Actually, the cleanest approach: add the chain call in the paid mint path just before `return`:

```typescript
    if (job.mint_type === 'paid') {
      await updateJobStep(env.DB, jobId, 'awaiting_payment');
      await chainNextQueuedJob(env); // Free up the MintGarden slot
      return;
    }

    // ──── STEP 6: Finalize (free mints) ────
    await finalizeJob(env, jobId);
    await chainNextQueuedJob(env); // Free up the MintGarden slot
```

**Step 6: Run tests**

Run: `npx vitest run functions/api/mint/process.test.ts`
Expected: PASS (new + existing tests)

**Step 7: Run all tests**

Run: `npx vitest run`
Expected: All pass

**Step 8: Commit**

```bash
git add functions/api/mint/process.ts functions/api/mint/process.test.ts
git commit -m "feat: add MintGarden concurrency gate with cap-1 chain processing"
```

---

## Task 5: Queue Position in job.ts

**Files:**
- Modify: `functions/api/mint/job.ts`
- Test: `functions/api/mint/job.test.ts`

**Step 1: Write failing test**

Add to `functions/api/mint/job.test.ts`:

```typescript
  it('returns queue position for mint_queued jobs', async () => {
    const env = createEnv({
      'WHERE id': mockStmt({
        id: 5, wallet_address: TEST_WALLET, mint_type: 'free',
        step: 'mint_queued', mint_number: 42, created_at: '2026-02-17T10:00:05Z',
        // other fields null
      }),
      'mint_queued': mockStmt({ position: 3, total: 7 }),
    });
    const req = new Request(`https://wojak.ink/api/mint/job?id=5&wallet=${TEST_WALLET}`, {
      headers: { 'CF-Connecting-IP': '127.0.0.1' },
    });
    const ctx = createContext(env, req);
    const res = await onRequest(ctx);
    const data = await res.json() as Record<string, unknown>;
    expect(data.step).toBe('mint_queued');
    expect(data.queuePosition).toBe(3);
    expect(data.queueTotal).toBe(7);
    expect((data.stepLabel as string)).toContain('#3');
  });
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/mint/job.test.ts`
Expected: FAIL

**Step 3: Implement queue position**

In `functions/api/mint/job.ts`:

1. Add `mint_queued` to the `stepInfo` function:
```typescript
    case 'mint_queued':       return { label: 'Waiting for a mint slot...', number: 4, total };
```

2. After loading the job and before building the response, add queue position query:
```typescript
    // Queue position for mint_queued jobs
    let queuePosition: number | undefined;
    let queueTotal: number | undefined;
    if (job.step === 'mint_queued') {
      const posRow = await env.DB.prepare(
        "SELECT COUNT(*) AS position FROM mint_jobs WHERE step = 'mint_queued' AND created_at < ?"
      ).bind(job.created_at).first<{ position: number }>();
      const totalRow = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM mint_jobs WHERE step = 'mint_queued'"
      ).first<{ total: number }>();
      queuePosition = (posRow?.position ?? 0) + 1; // 1-indexed
      queueTotal = totalRow?.total ?? 0;
    }
```

3. Override stepLabel for mint_queued with dynamic position:
```typescript
    // Dynamic step label for queue position
    const stepLabel = job.step === 'mint_queued' && queuePosition
      ? `You are #${queuePosition} in the mint queue`
      : errorDisplay;
```

4. Add to response object:
```typescript
      stepLabel,
      // ... existing fields ...
      queuePosition,
      queueTotal,
```

**Step 4: Run tests**

Run: `npx vitest run functions/api/mint/job.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/mint/job.ts functions/api/mint/job.test.ts
git commit -m "feat: show queue position for mint_queued jobs in polling endpoint"
```

---

## Task 6: Cleanup picks up mint_queued jobs

**Files:**
- Modify: `functions/api/mint/cleanup.ts`
- Test: `functions/api/mint/cleanup.test.ts`

**Step 1: Write failing test**

Add to `functions/api/mint/cleanup.test.ts`:

```typescript
  it('retries mint_queued jobs as safety net', async () => {
    const staleQueuedStmt = mockStmt();
    staleQueuedStmt.all.mockResolvedValue({
      results: [{ id: 10 }],
    });
    const env = createEnv({
      'mint_queued': staleQueuedStmt,
    });
    env.MINT_JOBS_KV.get.mockResolvedValue('base64image');

    const stats = await cleanupStaleJobs(env as any);
    expect(mockProcessJob).toHaveBeenCalledWith(expect.anything(), 10, 'base64image');
  });
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/mint/cleanup.test.ts`
Expected: FAIL

**Step 3: Implement mint_queued pickup in cleanup**

In `functions/api/mint/cleanup.ts`, add a new operation after the existing stale queued retry (operation 4). Insert before operation 5:

```typescript
  // 4b. Pick up mint_queued jobs that haven't been chained (safety net for broken chains).
  //     These jobs have completed IPFS upload and just need a MintGarden slot.
  const staleMintQueued = await env.DB.prepare(
    `SELECT id FROM mint_jobs WHERE step = 'mint_queued'
     AND (not_before IS NULL OR not_before <= datetime('now'))
     AND updated_at < datetime('now', '-30 seconds')
     LIMIT 3`
  ).all<{ id: number }>();

  for (const row of (staleMintQueued.results || [])) {
    const imageBase64 = await env.MINT_JOBS_KV.get(`job-image:${row.id}`);
    if (imageBase64) {
      try {
        const RETRY_TIMEOUT_MS = 25_000;
        // Reset to queued so processJob picks it up (will re-check concurrency gate)
        await env.DB.prepare(
          "UPDATE mint_jobs SET step = 'queued', updated_at = datetime('now') WHERE id = ? AND step = 'mint_queued'"
        ).bind(row.id).run();
        await Promise.race([
          processJob(env, row.id, imageBase64),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Cleanup retry timed out')), RETRY_TIMEOUT_MS)
          ),
        ]);
        stats.retriedQueued++;
      } catch (err) {
        console.error(`[Cleanup] mint_queued retry failed for job ${row.id}:`, err);
      }
    } else {
      await env.DB.prepare(
        "UPDATE mint_jobs SET step = 'failed', error_message = 'Image data expired', error_code = 'IMAGE_EXPIRED', wallet_lock = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(row.id).run();
    }
  }
```

Also update operation 3 (stuck processing) to include `mint_queued` in the exclusion list — `mint_queued` jobs should NOT be marked as stuck:

```typescript
  WHERE step NOT IN ('completed', 'failed', 'refunded', 'awaiting_payment', 'queued', 'mint_queued')
```

**Step 4: Run tests**

Run: `npx vitest run functions/api/mint/cleanup.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/mint/cleanup.ts functions/api/mint/cleanup.test.ts
git commit -m "feat: cleanup picks up stranded mint_queued jobs as safety net"
```

---

## Task 7: Frontend — MintJob Type + Queue Display

**Files:**
- Modify: `src/contexts/MintContext.tsx`

**Step 1: Update MintJob interface**

Add `queuePosition` and `queueTotal` fields:

```typescript
export interface MintJob {
  jobId: number;
  step: string;
  mintType: 'paid' | 'free';
  stepLabel: string;
  stepNumber: number;
  totalSteps: number;
  mintNumber?: number;
  offerFile?: string;
  launcherId?: string;
  mintgardenUrl?: string;
  creditsSpent?: number;
  creditsRemaining?: number;
  error?: string;
  creditsRefunded?: boolean;
  createdAt?: string;
  expiresAt?: string;
  queuePosition?: number;  // new
  queueTotal?: number;     // new
}
```

**Step 2: Handle mint_queued in polling**

In the `poll()` function inside `startPolling`, the existing step handling needs a case for `mint_queued`. It should behave like active processing (keep polling at 3s). No special handling needed — the `stepLabel` from the server already contains the queue position text. The `currentStepRef` will be set to `'mint_queued'` which is not `'awaiting_payment'`, so `getInterval()` correctly returns `POLL_INTERVAL_ACTIVE` (3s).

No code change needed here — the existing logic handles it.

**Step 3: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/contexts/MintContext.tsx
git commit -m "feat: add queuePosition/queueTotal to MintJob type"
```

---

## Task 8: Admin Safety Rail Panel

**Files:**
- Modify: `src/pages/Admin.tsx`
- Create: `functions/api/mint/admin/retry.ts`

**Step 1: Create the retry endpoint**

Create `functions/api/mint/admin/retry.ts`:

```typescript
/**
 * Admin Retry — POST /api/mint/admin/retry
 *
 * Resets a failed mint job to mint_queued for re-processing.
 * Admin-only endpoint (requires ADMIN_SECRET).
 */

import { jsonResponse, errorResponse, optionsResponse } from '../_shared';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();

  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const authHeader = request.headers.get('Authorization');
  if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  let body: { jobId?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const jobId = body.jobId;
  if (!jobId || !Number.isInteger(jobId) || jobId < 1) {
    return errorResponse('Missing or invalid jobId', 400);
  }

  try {
    const job = await env.DB.prepare(
      "SELECT id, step, mint_type FROM mint_jobs WHERE id = ?"
    ).bind(jobId).first<{ id: number; step: string; mint_type: string }>();

    if (!job) return errorResponse('Job not found', 404);

    if (!['failed', 'refunded'].includes(job.step)) {
      return errorResponse(`Job is in step '${job.step}', can only retry failed/refunded jobs`, 400);
    }

    // Check if IPFS data exists (required for mint_queued — no re-upload)
    const hasIpfs = await env.DB.prepare(
      "SELECT ipfs_image_uris FROM mint_jobs WHERE id = ? AND ipfs_image_uris IS NOT NULL"
    ).bind(jobId).first();

    // Reset to mint_queued if IPFS exists, or queued if not
    const newStep = hasIpfs ? 'mint_queued' : 'queued';
    await env.DB.prepare(
      `UPDATE mint_jobs SET step = ?, error_message = NULL, error_code = NULL,
       not_before = NULL, wallet_lock = wallet_address, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(newStep, jobId).run();

    return jsonResponse({ success: true, jobId, newStep });
  } catch (error) {
    console.error('[Admin Retry] Error:', error);
    return errorResponse('Internal server error', 500);
  }
};
```

**Step 2: Add safety rail panel to Admin.tsx**

This is a React component addition. Add a new section to the existing Admin page. The exact implementation depends on the existing Admin.tsx structure, but the core pattern is:

- Add state for `adminSecret`, `flaggedCases`, `loading`
- Add a password prompt if no secret stored
- Fetch from `/api/mint/audit?format=json` with Bearer token
- Render a table with action buttons
- Action buttons call `/api/mint/admin/retry`, `/api/mint/refund`

Since Admin.tsx already exists with its own patterns, read the full file and add a new section/tab. Keep it consistent with the existing styling (uses theme.css classes).

Key UI elements:
- Table rows with: mint #, wallet (truncated), step, error, launcher ID, timestamp
- "Retry" button (calls `/api/mint/admin/retry`)
- "Mark Refund" button (calls `/api/mint/refund` with `action: "mark"`)
- "Record Refund" button (prompts for txid, calls `/api/mint/refund` with `action: "issue"`)
- Auto-refresh toggle (every 30s)

**Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add functions/api/mint/admin/retry.ts src/pages/Admin.tsx
git commit -m "feat: admin safety rail panel with retry/refund actions"
```

---

## Task 9: Integration Test + Final Verification

**Files:**
- Test: All test files

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All pass (143+ tests)

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 3: Run migration on production D1**

Run: `npx wrangler d1 execute wojak-users --remote --file=functions/migrations/044_concurrency_queue.sql`
Expected: Success.

**Step 4: Deploy**

Run: `npx wrangler pages deploy dist --project-name=wojak-ink`
Expected: Deployment success.

**Step 5: Purge cache**

```bash
CLOUDFLARE_PURGE_TOKEN=$(cat ~/.cloudflare-purge-token) && curl -s -X POST "https://api.cloudflare.com/client/v4/zones/cf75e020a68dcccd84405950df016860/purge_cache" -H "Authorization: Bearer $CLOUDFLARE_PURGE_TOKEN" -H "Content-Type: application/json" --data '{"purge_everything":true}'
```

**Step 6: Verify**

Open https://wojak.ink and verify the site loads. Navigate to `/admin` and verify the safety rail panel loads.

---

## Task Summary

| Task | What | Files |
|------|------|-------|
| 1 | Add RATE_LIMITED error code | errors.ts |
| 2 | Migration 044 | 044_concurrency_queue.sql |
| 3 | MintGarden 429 detection | request.ts, request.test.ts |
| 4 | Concurrency gate + chain processing | process.ts, process.test.ts |
| 5 | Queue position in polling | job.ts, job.test.ts |
| 6 | Cleanup picks up mint_queued | cleanup.ts, cleanup.test.ts |
| 7 | Frontend MintJob type update | MintContext.tsx |
| 8 | Admin safety rail + retry endpoint | Admin.tsx, admin/retry.ts |
| 9 | Integration test + deploy | All |
