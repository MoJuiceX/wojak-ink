# Task 4: Queue-Based Mint Architecture

## Objective

Replace the current synchronous mint flow with a **queue-based architecture** that processes mints sequentially per wallet. This eliminates all concurrency vulnerabilities (double-spend, duplicate mints, race conditions) and provides a superior user experience with real-time progress updates.

**Design principle:** The user's browser never waits for IPFS or MintGarden. It submits a job and polls for progress. The server processes one mint per wallet at a time, in strict sequential order. If you have to choose between speed and correctness, choose correctness every time.

---

## Current State (What Already Works)

Before implementing, understand what has ALREADY been fixed on the main branch:

1. **Credit hold pattern** — `prepare.ts` already deducts credits BEFORE calling MintGarden, and refunds on failure. This is the `status='credit_hold'` flow (lines 342-424 of prepare.ts).
2. **MintGarden verification on confirm** — `confirm.ts` already queries `https://api.mintgarden.io/nfts/{launcherId}` to verify the NFT exists on-chain and checks owner address (lines 109-128).
3. **Atomic mint numbering** — `mintNumberHelper.ts` uses `UPDATE...RETURNING` (no race condition on numbers).
4. **Rate limiting** — 5 prepare/min, 10 confirm/min per IP/wallet with fail-closed on DB errors.

**What still needs fixing (this task solves):**
- Mint numbers are reserved too early (wasted on IPFS/MintGarden failures)
- No per-wallet mutex (concurrent free mints from same wallet can still both start)
- Supply cap not enforced at DB level (concurrent requests can exceed 4200)
- Long synchronous request can timeout on Cloudflare (30s limit for Workers)
- User sees a frozen spinner during the 10-30 second mint process
- Paid mint confirm still relies on user manually calling /confirm

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER BROWSER                                                        │
│                                                                     │
│  1. Click "Mint" ──► POST /api/mint/submit                         │
│                       (returns jobId immediately)                    │
│                                                                     │
│  2. Poll ──► GET /api/mint/job?id=xxx                               │
│              (returns current step + progress)                      │
│                                                                     │
│  3. If paid: accept offer in wallet when prompted                   │
│                                                                     │
│  4. Keep polling ──► see "minted!" when complete                    │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ /api/mint/submit (fast — responds in <100ms)                        │
│                                                                     │
│  • Validate inputs (wallet, layers, colors, image format)           │
│  • Check per-wallet lock (reject if wallet already has active job)  │
│  • For free: atomic credit deduction (INSERT...SELECT WHERE bal>=)  │
│  • INSERT into mint_jobs (status='queued')                          │
│  • Return { jobId } to browser                                      │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ /api/mint/process (called internally, NOT by the browser)           │
│                                                                     │
│  This is a Cloudflare Pages Function that processes one job.        │
│  Triggered by submit (via waitUntil) or by a cron/scheduled retry.  │
│                                                                     │
│  Sequential steps (each updates mint_jobs.step):                    │
│    Step 1: validate_traits  — server-side trait allowlist check      │
│    Step 2: reserve_number   — atomic mint counter increment          │
│    Step 3: upload_ipfs      — image + metadata to Pinata             │
│    Step 4: call_mintgarden  — create NFT (free) or offer (paid)     │
│    Step 5: await_payment    — (paid only) poll MintGarden for offer  │
│    Step 6: finalize         — update phase2_mints, trait_usage       │
│                                                                     │
│  On failure at any step: roll back all previous steps cleanly.      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### New Migration: `042_mint_queue.sql`

```sql
-- Mint job queue — one row per mint attempt.
-- Enforces one active job per wallet via partial unique index.
CREATE TABLE IF NOT EXISTS mint_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Identity
  wallet_address TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,  -- client UUID, prevents double-submit

  -- Input (frozen at submission time)
  layers_json TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  image_base64_hash TEXT NOT NULL,  -- SHA-256 of the image (NOT the image itself)
  mint_type TEXT NOT NULL CHECK(mint_type IN ('paid', 'free')),

  -- Pricing (calculated and frozen at submission time)
  credit_cost INTEGER,           -- for free mints: cost in x100 units
  xch_price_mojos INTEGER,       -- for paid mints: total price in mojos
  surcharge_xch INTEGER,         -- surcharge portion (stored × 100000)
  highest_surcharge_trait TEXT,

  -- Progress tracking
  step TEXT NOT NULL DEFAULT 'queued'
    CHECK(step IN (
      'queued',           -- waiting to be picked up
      'validating',       -- checking trait allowlist
      'reserving_number', -- getting atomic mint number
      'uploading_ipfs',   -- uploading image + metadata to Pinata
      'calling_mintgarden', -- calling MintGarden API
      'awaiting_payment', -- (paid only) waiting for user to accept offer
      'finalizing',       -- writing final DB records
      'completed',        -- done — NFT minted
      'failed',           -- unrecoverable failure
      'refunded'          -- failed after credit deduction, credits returned
    )),

  -- Outputs (populated as steps complete)
  mint_number INTEGER,            -- assigned at reserving_number step
  ipfs_image_uris TEXT,           -- JSON array of gateway URLs
  ipfs_metadata_uris TEXT,        -- JSON array of gateway URLs
  image_hash TEXT,                -- SHA-256 of image
  metadata_hash TEXT,             -- SHA-256 of metadata JSON
  mintgarden_launcher_id TEXT,    -- from MintGarden response (free)
  offer_file TEXT,                -- from MintGarden response (paid)

  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Cross-reference to legacy table (populated at finalize step)
  phase2_mint_id INTEGER,         -- FK to phase2_mints.id
  credit_spend_id INTEGER,        -- FK to credit_spends.id (free mints)

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,                -- when processing began
  completed_at TEXT,              -- when step='completed'
  expires_at TEXT,                -- for paid mints: offer expiry

  -- Per-wallet lock: only one active job allowed per wallet.
  -- 'active' when job is in progress, NULL when done.
  wallet_lock TEXT  -- set to wallet_address when active, NULL when done
);

-- CRITICAL: This partial unique index is the per-wallet mutex.
-- Only one row per wallet can have a non-NULL wallet_lock.
-- When a job completes/fails, wallet_lock is set to NULL, releasing the lock.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mj_wallet_lock
  ON mint_jobs(wallet_lock) WHERE wallet_lock IS NOT NULL;

-- For polling by job ID
CREATE INDEX IF NOT EXISTS idx_mj_id_wallet ON mint_jobs(id, wallet_address);

-- For finding queued jobs to process
CREATE INDEX IF NOT EXISTS idx_mj_step ON mint_jobs(step) WHERE step = 'queued';

-- For finding stale jobs to expire
CREATE INDEX IF NOT EXISTS idx_mj_updated ON mint_jobs(updated_at);

-- Supply cap enforcement: add a CHECK on mint_counter.
-- This makes it impossible to reserve a number beyond the supply.
-- The UPDATE...RETURNING in mintNumberHelper will fail if this is violated.
-- NOTE: Run this as a separate statement since ALTER TABLE can't add CHECK.
-- Instead, enforce in the application: after getNextMintNumber(), if number > 4200, rollback.
```

### Update to `phase2_mints` status CHECK

The existing `phase2_mints.status` CHECK constraint includes `'pending', 'minted', 'expired', 'failed'`. The `credit_hold` status was added by a prior fix. Verify it's included:

```sql
-- If not already done, update the CHECK to include credit_hold:
-- (D1 doesn't support ALTER CHECK — this was handled in a prior migration)
-- Statuses: 'pending', 'minted', 'expired', 'failed', 'credit_hold'
```

---

## Backend Implementation

### File 1: `/functions/api/mint/submit.ts` (NEW)

**Purpose:** Fast endpoint (<100ms) that validates input, locks the wallet, deducts credits (free), and creates a queued job.

```
Endpoint: POST /api/mint/submit
```

**Request body:**
```typescript
{
  walletAddress: string;          // xch1...
  selectedLayers: Record<string, string>;  // e.g. { Head: "g2/crown", ... }
  selectedColors: Record<string, string>;  // e.g. { Head: "#ff6b00", ... }
  imageBase64: string;            // WebP base64
  mintType: 'paid' | 'free';
  idempotencyKey: string;         // Client-generated UUID (crypto.randomUUID())
}
```

**Response (success):**
```typescript
{
  jobId: number;
  step: 'queued';
  mintType: 'paid' | 'free';
  creditCost?: number;            // free mints: credits deducted (display units)
  estimatedXch?: number;          // paid mints: total price
}
```

**Implementation steps (all synchronous, all fast):**

1. **Rate limit** — same as current prepare (5/min per IP/wallet, fail-closed).

2. **Validate inputs:**
   - `walletAddress` via `isValidChiaAddress()`
   - `imageBase64` is present and is a string
   - `selectedLayers` keys are in `VALID_LAYER_NAMES`
   - Layer paths pass traversal check (no `..`, max 3 segments)
   - Colors pass hex validation
   - `mintType` is 'paid' or 'free'
   - `idempotencyKey` is present and is a string

3. **Idempotency check:**
   ```sql
   SELECT id, step, mint_number, mintgarden_launcher_id, offer_file, error_message
   FROM mint_jobs WHERE idempotency_key = ?
   ```
   If found: return the existing job state (don't create a new one).

4. **Per-wallet lock check:**
   Attempt to INSERT with `wallet_lock = walletAddress`. The UNIQUE partial index on `wallet_lock WHERE wallet_lock IS NOT NULL` will reject the INSERT if another active job exists.

   If INSERT fails with UNIQUE constraint: return `{ error: 'You already have a mint in progress. Please wait for it to complete.', existingJobId: <id> }` (409).

5. **Supply check:**
   ```sql
   SELECT COUNT(*) as count FROM phase2_mints WHERE status = 'minted'
   ```
   Plus count of `mint_jobs WHERE step NOT IN ('completed', 'failed', 'refunded')` (in-flight jobs also consume supply). If total >= 4200: return sold out.

6. **Calculate pricing:**
   - Query `trait_usage` for surcharge categories
   - Consolidate traits (same logic as current prepare.ts)
   - For free: calculate `freeMintCreditCost` (base 100 credits, premium scales)
   - For paid: calculate `totalPriceXch` (base 0.2 XCH + max surcharge)

7. **For free mints — deduct credits NOW:**
   ```sql
   INSERT INTO credit_spends (wallet_address, mint_id, credits_spent)
   SELECT ?, 0, ?   -- mint_id=0 temporarily, updated at finalize
   WHERE (
     (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
     (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?)
   ) >= ?
   ```
   If 0 rows affected: release the wallet lock, return insufficient credits error.

   Save the `credit_spend_id` (last_row_id) for later.

8. **Compute image hash** (for deduplication, NOT storing the full base64 in the queue):
   ```typescript
   const imageHash = await sha256Hex(base64ToUint8Array(imageBase64));
   ```

   **IMPORTANT:** The actual `imageBase64` must be stored somewhere the processor can retrieve it. Options:

   **Option A (recommended):** Store it in KV with a TTL:
   ```typescript
   await env.MINT_JOBS_KV.put(`job-image:${jobId}`, imageBase64, { expirationTtl: 1800 }); // 30 min TTL
   ```
   This requires adding a new KV namespace binding (`MINT_JOBS_KV`).

   **Option B:** Store the base64 directly in the `mint_jobs` row in a `image_base64` TEXT column. D1 supports large text fields but this makes the table heavier. Less clean but fewer moving parts.

   **Go with Option A** — keeps the queue table lightweight and the image auto-expires.

9. **INSERT the job:**
   ```sql
   INSERT INTO mint_jobs (
     wallet_address, idempotency_key, layers_json, colors_json,
     image_base64_hash, mint_type, credit_cost, xch_price_mojos,
     surcharge_xch, highest_surcharge_trait,
     step, wallet_lock, credit_spend_id, expires_at
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)
   ```
   - `wallet_lock` = `walletAddress` (activates the per-wallet mutex)
   - `expires_at` = paid mints get `now + 20 minutes`, free mints get `now + 5 minutes`
   - `credit_spend_id` = from step 7 (free mints only)

10. **Trigger processing** via `context.waitUntil()`:
    ```typescript
    context.waitUntil(processJob(env, jobId, imageBase64));
    ```
    This starts the processor in the background. The HTTP response returns immediately.

11. **Return:**
    ```typescript
    {
      jobId: <id>,
      step: 'queued',
      mintType,
      creditCost: freeMintCreditCost / 100,  // display units
      estimatedXch: totalPriceXch,
    }
    ```

---

### File 2: `/functions/api/mint/job.ts` (NEW)

**Purpose:** Polling endpoint. Returns current state of a mint job.

```
Endpoint: GET /api/mint/job?id=<jobId>&wallet=<walletAddress>
```

**Response:**
```typescript
{
  jobId: number;
  step: string;              // current processing step
  mintType: 'paid' | 'free';

  // Progress info (for UI)
  stepLabel: string;         // human-readable: "Uploading artwork to IPFS..."
  stepNumber: number;        // 1-6 for progress bar
  totalSteps: number;        // 6 (or 5 for free mints)

  // Outputs (populated as steps complete)
  mintNumber?: number;
  offerFile?: string;        // paid mints: offer to accept
  launcherId?: string;       // after MintGarden confirms
  mintgardenUrl?: string;    // link to view NFT

  // Credits (free mints)
  creditsSpent?: number;     // display units
  creditsRemaining?: number; // display units, calculated live

  // Error (if failed)
  error?: string;
  creditsRefunded?: boolean;

  // Timing
  createdAt: string;
  expiresAt?: string;        // paid mints: offer expiry
}
```

**Implementation:**
1. Validate `wallet` and `id` parameters.
2. Query:
   ```sql
   SELECT * FROM mint_jobs WHERE id = ? AND wallet_address = ?
   ```
3. Map `step` to `stepLabel` and `stepNumber`:
   ```
   queued           → "Preparing your mint..."                (1/6)
   validating       → "Validating trait selections..."        (1/6)
   reserving_number → "Reserving your Wojak number..."        (2/6)
   uploading_ipfs   → "Uploading artwork to IPFS..."          (3/6)
   calling_mintgarden → "Creating your NFT..."                (4/6)
   awaiting_payment → "Accept the offer in your wallet"       (5/6) [paid only]
   finalizing       → "Finalizing your mint..."               (6/6)
   completed        → "Your Wojak has been minted!"           (6/6)
   failed           → error_message                           (—)
   refunded         → "Mint failed. Credits have been refunded." (—)
   ```
4. For free mints, calculate `creditsRemaining` from live balance query.
5. Return the response.

**Polling guidance for frontend:**
- Poll every 3 seconds while step is `queued`, `validating`, `reserving_number`, `uploading_ipfs`, `calling_mintgarden`, `finalizing`
- Poll every 5 seconds while step is `awaiting_payment` (paid)
- Stop polling when step is `completed`, `failed`, or `refunded`

---

### File 3: `/functions/api/mint/process.ts` (NEW — internal only)

**Purpose:** The actual mint processor. Called via `waitUntil()` from submit, or from a scheduled retry handler. NOT directly callable from the browser.

**This function is the heart of the system.** It processes a single mint job through all steps sequentially.

```typescript
export async function processJob(
  env: Env,
  jobId: number,
  imageBase64: string  // passed from submit, or retrieved from KV
): Promise<void>
```

**Step-by-step processing:**

```typescript
async function processJob(env, jobId, imageBase64) {
  // Load job from DB
  const job = await env.DB.prepare(
    'SELECT * FROM mint_jobs WHERE id = ? AND step = ?'
  ).bind(jobId, 'queued').first();

  if (!job) return; // Already picked up or doesn't exist

  // Mark as started
  await updateJobStep(env.DB, jobId, 'validating');

  try {
    // ──── STEP 1: Validate Traits ────
    // Check selectedLayers against server-side trait allowlist.
    // (This is the NEW validation that the current code doesn't do.)
    // If you don't have the allowlist yet, skip this step initially
    // and just validate format like the current code does.
    const layers = JSON.parse(job.layers_json);
    const colors = JSON.parse(job.colors_json);
    // validateTraitsAgainstAllowlist(layers); // future improvement

    // Consolidate traits for metadata
    const consolidated = buildConsolidatedTraits(layers);

    // ──── STEP 2: Reserve Mint Number ────
    await updateJobStep(env.DB, jobId, 'reserving_number');

    const mintNumber = await getNextMintNumber(env.DB);

    // SUPPLY CHECK: enforce at the number level
    if (mintNumber > SUPPLY_TOTAL) {
      // Roll back the counter (decrement by 1)
      await env.DB.prepare(
        'UPDATE mint_counter SET next_number = next_number - 1 WHERE id = 1'
      ).run();
      throw new MintError('SOLD_OUT', 'All 4,200 Wojaks have been minted!');
    }

    await env.DB.prepare(
      'UPDATE mint_jobs SET mint_number = ? WHERE id = ?'
    ).bind(mintNumber, jobId).run();

    // ──── STEP 3: Upload to IPFS ────
    await updateJobStep(env.DB, jobId, 'uploading_ipfs');

    // Build CHIP-0007 metadata (now includes the mint number)
    const metadata = buildMetadata(mintNumber, consolidated, env);

    const uploadResult = await uploadToIPFS(imageBase64, metadata, env.PINATA_JWT);

    await env.DB.prepare(
      `UPDATE mint_jobs SET
        ipfs_image_uris = ?, ipfs_metadata_uris = ?,
        image_hash = ?, metadata_hash = ?
       WHERE id = ?`
    ).bind(
      JSON.stringify(uploadResult.dataUris),
      JSON.stringify(uploadResult.metadataUris),
      uploadResult.dataHash,
      uploadResult.metadataHash,
      jobId
    ).run();

    // Clean up the image from KV (no longer needed)
    await env.MINT_JOBS_KV.delete(`job-image:${jobId}`);

    // ──── STEP 4: Call MintGarden ────
    await updateJobStep(env.DB, jobId, 'calling_mintgarden');

    const mintResult = await callMintGardenMint({
      walletAddress: job.wallet_address,
      mintType: job.mint_type,
      ipfsImageUris: uploadResult.dataUris,
      ipfsMetadataUris: uploadResult.metadataUris,
      imageHash: uploadResult.dataHash,
      metadataHash: uploadResult.metadataHash,
      priceXch: job.mint_type === 'paid' ? (job.xch_price_mojos / 1e12) : undefined,
      collectionUuid: env.PHASE2_COLLECTION_UUID,
      editionNumber: mintNumber,
      editionTotal: SUPPLY_TOTAL,
    }, env);

    if (job.mint_type === 'free') {
      // Free mint: MintGarden returns launcherId directly
      if (!mintResult.launcherId) {
        throw new MintError('MINTGARDEN_FAILED', 'MintGarden did not return a launcher ID.');
      }
      await env.DB.prepare(
        'UPDATE mint_jobs SET mintgarden_launcher_id = ? WHERE id = ?'
      ).bind(mintResult.launcherId, jobId).run();

    } else {
      // Paid mint: MintGarden returns offer file
      if (!mintResult.offerFile) {
        throw new MintError('OFFER_CREATION_FAILED', 'MintGarden did not return an offer.');
      }
      await env.DB.prepare(
        `UPDATE mint_jobs SET offer_file = ?, expires_at = ? WHERE id = ?`
      ).bind(
        mintResult.offerFile,
        new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        jobId
      ).run();
    }

    // ──── STEP 5: Await Payment (paid only) ────
    if (job.mint_type === 'paid') {
      await updateJobStep(env.DB, jobId, 'awaiting_payment');
      // Processing STOPS here for paid mints.
      // The job stays in 'awaiting_payment' until:
      //   a) The user accepts the offer and calls /api/mint/confirm-payment
      //   b) A scheduled job detects the offer was accepted via MintGarden polling
      //   c) The offer expires (20 min) and a cleanup job sets step='failed'
      return; // Exit processJob — it will be resumed by confirm-payment or cron
    }

    // ──── STEP 6: Finalize (free mints continue here, paid mints jump here from confirm-payment) ────
    await finalizeJob(env, jobId);

  } catch (error) {
    await handleJobFailure(env, jobId, job, error);
  }
}
```

**Finalize function** (shared by free mints and paid confirm-payment):

```typescript
async function finalizeJob(env: Env, jobId: number): Promise<void> {
  await updateJobStep(env.DB, jobId, 'finalizing');

  const job = await env.DB.prepare('SELECT * FROM mint_jobs WHERE id = ?')
    .bind(jobId).first();

  const layers = JSON.parse(job.layers_json);
  const consolidated = consolidateTraits(layers);
  const launcherId = job.mintgarden_launcher_id;

  // Atomic batch: insert phase2_mints + update trait_usage + update job status
  const batchStmts: D1PreparedStatement[] = [];

  // 1. Insert into phase2_mints (the canonical mint record)
  batchStmts.push(
    env.DB.prepare(
      `INSERT INTO phase2_mints (
        mint_number, wallet_address, layers_json, colors_json,
        ipfs_image_uri, ipfs_metadata_uri, image_hash, metadata_hash,
        mint_type, total_price_xch, trait_surcharge_xch, highest_surcharge_trait,
        mintgarden_launcher_id, offer_file, status, minted_at,
        payment_verified,
        ipfs_upload_started_at, ipfs_upload_completed_at,
        mintgarden_called_at, mintgarden_completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'minted', datetime('now'),
                ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`
    ).bind(
      job.mint_number,
      job.wallet_address,
      job.layers_json,
      job.colors_json,
      JSON.parse(job.ipfs_image_uris)[0],
      JSON.parse(job.ipfs_metadata_uris)[0],
      job.image_hash,
      job.metadata_hash,
      job.mint_type,
      job.mint_type === 'paid' ? job.xch_price_mojos : null,
      job.surcharge_xch,
      job.highest_surcharge_trait,
      launcherId,
      job.offer_file,
      job.mint_type === 'paid' ? 1 : 0  // payment_verified
    )
  );

  // 2. Trait usage upserts
  for (const { traitType, displayName } of consolidated.values()) {
    if (traitType === 'Base') continue;
    const isExempt = SURCHARGE_EXEMPT_TRAITS.has(displayName);
    if (SURCHARGE_CATEGORIES.has(traitType) && !isExempt) {
      batchStmts.push(
        env.DB.prepare(
          `INSERT INTO trait_usage (trait_category, trait_name, usage_count, effective_usage, last_decay_at, updated_at)
           VALUES (?, ?, 1, 1, datetime('now'), datetime('now'))
           ON CONFLICT(trait_category, trait_name) DO UPDATE SET
             usage_count = usage_count + 1,
             effective_usage = effective_usage * exp(
               ln(0.5) * (julianday('now') - julianday(last_decay_at)) / ?
             ) + 1,
             last_decay_at = datetime('now'),
             updated_at = datetime('now')`
        ).bind(traitType, displayName, DECAY_HALF_LIFE_DAYS)
      );
    } else {
      batchStmts.push(
        env.DB.prepare(
          `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
           VALUES (?, ?, 1, datetime('now'))
           ON CONFLICT(trait_category, trait_name) DO UPDATE SET
             usage_count = usage_count + 1,
             updated_at = datetime('now')`
        ).bind(traitType, displayName)
      );
    }
  }

  await env.DB.batch(batchStmts);

  // Get the phase2_mint_id for cross-reference
  const mintRow = await env.DB.prepare(
    'SELECT id FROM phase2_mints WHERE mint_number = ?'
  ).bind(job.mint_number).first<{ id: number }>();

  // Update the credit_spends row to point to the real mint_id (free mints)
  if (job.credit_spend_id && mintRow) {
    await env.DB.prepare(
      'UPDATE credit_spends SET mint_id = ? WHERE id = ?'
    ).bind(mintRow.id, job.credit_spend_id).run();
  }

  // Mark job as completed and release wallet lock
  await env.DB.prepare(
    `UPDATE mint_jobs SET
      step = 'completed', completed_at = datetime('now'),
      phase2_mint_id = ?, wallet_lock = NULL, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(mintRow?.id, jobId).run();

  // Audit log
  await logMintStep(env.DB, {
    mint_id: mintRow?.id ?? 0,
    step: job.mint_type === 'free' ? 'free_mint_completed' : 'paid_mint_confirmed',
    status: 'completed',
    data: { mint_number: job.mint_number, launcher_id: launcherId, job_id: jobId },
  });
}
```

**Failure handler:**

```typescript
class MintError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

async function handleJobFailure(env: Env, jobId: number, job: any, error: unknown): Promise<void> {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof MintError ? error.code : 'INTERNAL_ERROR';

  console.error(`[MintProcessor] Job ${jobId} failed at step ${job?.step}:`, errorMsg);

  // Determine if this is retryable
  const retryable = !['SOLD_OUT', 'INSUFFICIENT_CREDITS', 'INVALID_TRAITS'].includes(errorCode);

  if (retryable && (job?.retry_count ?? 0) < (job?.max_retries ?? 3)) {
    // Increment retry count, keep step as-is for retry
    await env.DB.prepare(
      `UPDATE mint_jobs SET retry_count = retry_count + 1,
       error_message = ?, error_code = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(errorMsg, errorCode, jobId).run();
    // The scheduled retry handler will pick this up
    return;
  }

  // Non-retryable or max retries exceeded
  let finalStep = 'failed';

  // If credits were deducted (free mint), refund them
  if (job?.mint_type === 'free' && job?.credit_spend_id) {
    await env.DB.prepare(
      'DELETE FROM credit_spends WHERE id = ?'
    ).bind(job.credit_spend_id).run();
    finalStep = 'refunded';
  }

  // If a mint number was reserved, we accept the gap (numbers are cheap)
  // Future improvement: reclaim the number

  // Release wallet lock and mark as failed/refunded
  await env.DB.prepare(
    `UPDATE mint_jobs SET
      step = ?, error_message = ?, error_code = ?,
      wallet_lock = NULL, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(finalStep, errorMsg, errorCode, jobId).run();

  // Audit log
  await logMintStep(env.DB, {
    mint_id: 0,
    step: `job_${finalStep}`,
    status: 'failed',
    error: errorMsg,
    data: { job_id: jobId, error_code: errorCode, mint_number: job?.mint_number },
  });
}
```

**Step updater helper:**

```typescript
async function updateJobStep(db: D1Database, jobId: number, step: string): Promise<void> {
  await db.prepare(
    `UPDATE mint_jobs SET step = ?, updated_at = datetime('now'),
     started_at = COALESCE(started_at, datetime('now'))
     WHERE id = ?`
  ).bind(step, jobId).run();
}
```

---

### File 4: `/functions/api/mint/confirm-payment.ts` (NEW — replaces confirm.ts)

**Purpose:** Called when a paid mint offer is accepted. Resumes the job from `awaiting_payment` to `finalizing`.

```
Endpoint: POST /api/mint/confirm-payment
```

**Request body:**
```typescript
{
  jobId: number;
  walletAddress: string;
  launcherId: string;         // NFT launcher ID from wallet
}
```

**Implementation:**

1. Load the job:
   ```sql
   SELECT * FROM mint_jobs WHERE id = ? AND wallet_address = ? AND step = 'awaiting_payment'
   ```
   If not found: return 404.

2. **Verify on MintGarden** (same pattern as current confirm.ts):
   ```typescript
   const mgRes = await fetch(`https://api.mintgarden.io/nfts/${launcherId}`);
   ```
   - Verify NFT exists on-chain
   - Verify owner matches the minting wallet
   - If verification fails: return `{ pending: true, message: 'NFT not found on-chain yet' }`

3. Update job with launcherId:
   ```sql
   UPDATE mint_jobs SET mintgarden_launcher_id = ? WHERE id = ?
   ```

4. Call `finalizeJob(env, jobId)` to complete the mint.

5. Return success with mint details.

---

### File 5: `/functions/api/mint/cleanup.ts` (NEW — scheduled)

**Purpose:** Cron job that runs every 5 minutes to clean up stale jobs.

```typescript
export async function cleanupStaleJobs(env: Env): Promise<void> {
  // 1. Expire jobs stuck in 'awaiting_payment' for more than 20 minutes
  const expiredPaid = await env.DB.prepare(
    `UPDATE mint_jobs SET step = 'failed', error_message = 'Offer expired',
     error_code = 'OFFER_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
     WHERE step = 'awaiting_payment'
     AND expires_at IS NOT NULL AND expires_at < datetime('now')`
  ).run();

  // 2. Expire jobs stuck in processing for more than 5 minutes (worker died)
  const stuckJobs = await env.DB.prepare(
    `UPDATE mint_jobs SET step = 'failed', error_message = 'Processing timed out',
     error_code = 'TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
     WHERE step NOT IN ('completed', 'failed', 'refunded', 'awaiting_payment', 'queued')
     AND updated_at < datetime('now', '-5 minutes')`
  ).run();

  // 3. Retry queued jobs that haven't been picked up in 30 seconds
  // (In case waitUntil failed to fire)
  const staleQueued = await env.DB.prepare(
    `SELECT id FROM mint_jobs WHERE step = 'queued'
     AND created_at < datetime('now', '-30 seconds')
     AND retry_count < max_retries
     LIMIT 5`
  ).all<{ id: number }>();

  for (const row of (staleQueued.results || [])) {
    // Retrieve image from KV and re-trigger processing
    const imageBase64 = await env.MINT_JOBS_KV.get(`job-image:${row.id}`);
    if (imageBase64) {
      // Can't use waitUntil from a cron — process inline
      await processJob(env, row.id, imageBase64);
    } else {
      // Image expired from KV — fail the job
      await env.DB.prepare(
        `UPDATE mint_jobs SET step = 'failed', error_message = 'Image data expired',
         error_code = 'IMAGE_EXPIRED', wallet_lock = NULL
         WHERE id = ?`
      ).bind(row.id).run();
      // Refund credits if applicable
      const job = await env.DB.prepare('SELECT * FROM mint_jobs WHERE id = ?')
        .bind(row.id).first();
      if (job?.credit_spend_id) {
        await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?')
          .bind(job.credit_spend_id).run();
        await env.DB.prepare(
          "UPDATE mint_jobs SET step = 'refunded' WHERE id = ?"
        ).bind(row.id).run();
      }
    }
  }

  // 4. Refund credits for failed free mint jobs that haven't been refunded yet
  const unrefunded = await env.DB.prepare(
    `SELECT id, credit_spend_id FROM mint_jobs
     WHERE step = 'failed' AND mint_type = 'free'
     AND credit_spend_id IS NOT NULL`
  ).all<{ id: number; credit_spend_id: number }>();

  for (const row of (unrefunded.results || [])) {
    await env.DB.prepare('DELETE FROM credit_spends WHERE id = ?')
      .bind(row.credit_spend_id).run();
    await env.DB.prepare(
      "UPDATE mint_jobs SET step = 'refunded', credit_spend_id = NULL WHERE id = ?"
    ).bind(row.id).run();
  }

  // 5. Expire stale phase2_mints pending records (existing behavior, keep for backwards compat)
  await env.DB.prepare(
    `UPDATE phase2_mints SET status = 'expired'
     WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
  ).run();
}
```

---

## Frontend Changes

### MintContext.tsx — Refactor to Queue Model

**Replace the current mint flow state machine** with a simpler model:

```typescript
// Current states: idle, confirm, signing, submitting, accepting, success, error
// New states:
type MintStep =
  | 'idle'               // No mint in progress
  | 'confirming'         // User reviewing price before submitting
  | 'submitted'          // Job submitted, polling for progress
  | 'awaiting_payment'   // Paid mint: waiting for user to accept offer
  | 'success'            // Done
  | 'error';             // Failed

interface MintJob {
  jobId: number;
  step: string;          // server-side step (from /api/mint/job)
  stepLabel: string;     // human-readable
  stepNumber: number;    // for progress bar
  totalSteps: number;
  mintNumber?: number;
  offerFile?: string;
  launcherId?: string;
  mintgardenUrl?: string;
  creditsSpent?: number;
  creditsRemaining?: number;
  error?: string;
  creditsRefunded?: boolean;
}
```

**New flow:**

```typescript
async function submitMint(blob, layers, colors, mintType) {
  // 1. Set state to 'confirming' — show confirmation modal
  setMintStep('confirming');
}

async function confirmMint() {
  // 2. Call /api/mint/submit
  setMintStep('submitted');
  const idempotencyKey = crypto.randomUUID();

  const res = await fetch('/api/mint/submit', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress, selectedLayers, selectedColors,
      imageBase64, mintType, idempotencyKey
    })
  });
  const data = await res.json();

  if (data.error) {
    setMintStep('error');
    setError(data.error);
    return;
  }

  // 3. Start polling
  setCurrentJob({ jobId: data.jobId, step: 'queued', ... });
  startPolling(data.jobId);
}

function startPolling(jobId: number) {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/mint/job?id=${jobId}&wallet=${walletAddress}`);
    const data = await res.json();

    setCurrentJob(data);

    if (data.step === 'awaiting_payment') {
      setMintStep('awaiting_payment');
      // Don't stop polling — keep checking even during payment wait
    }

    if (data.step === 'completed') {
      setMintStep('success');
      clearInterval(interval);
      // Refresh credit balance
      refreshCredits();
    }

    if (data.step === 'failed' || data.step === 'refunded') {
      setMintStep('error');
      clearInterval(interval);
      if (data.creditsRefunded) {
        refreshCredits();
      }
    }
  }, 3000); // Poll every 3 seconds

  // Safety: stop polling after 10 minutes max
  setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
}
```

### MintFlowModal.tsx — Progress-Driven UI

Replace the timer-based "fake progress" with real server-driven progress:

```tsx
function MintFlowModal() {
  const { mintStep, currentJob } = useMintContext();

  return (
    <Modal>
      {/* Progress bar driven by real server state */}
      {currentJob && (
        <ProgressBar
          current={currentJob.stepNumber}
          total={currentJob.totalSteps}
        />
      )}

      {mintStep === 'confirming' && <ConfirmStep />}

      {mintStep === 'submitted' && (
        <div>
          <Spinner />
          <p className="text-secondary">{currentJob?.stepLabel}</p>
          <p className="text-muted text-sm">Please don't close this window</p>
        </div>
      )}

      {mintStep === 'awaiting_payment' && (
        <PaidMintWaitStep
          offerFile={currentJob?.offerFile}
          expiresAt={currentJob?.expiresAt}
          onAcceptedInWallet={handleConfirmPayment}
        />
      )}

      {mintStep === 'success' && (
        <SuccessStep
          mintNumber={currentJob?.mintNumber}
          launcherId={currentJob?.launcherId}
          creditsSpent={currentJob?.creditsSpent}
          creditsRemaining={currentJob?.creditsRemaining}
        />
      )}

      {mintStep === 'error' && (
        <ErrorStep
          error={currentJob?.error}
          creditsRefunded={currentJob?.creditsRefunded}
          onRetry={resetAndRetry}
        />
      )}
    </Modal>
  );
}
```

### ActionBar.tsx — Idempotency Key

Generate the idempotency key when the user clicks "Mint" and pass it through:

```typescript
const handleMintClick = () => {
  const key = crypto.randomUUID();
  setIdempotencyKey(key);
  prepareMint(blob, layers, colors, mintType, key);
};
```

Store it in state so that if the user clicks the button again (or the request fails and they retry), the same key is sent and the server returns the existing job instead of creating a duplicate.

### Page Reload Recovery

On `Generator.tsx` mount:

```typescript
useEffect(() => {
  // Check for in-progress mint jobs on page load
  if (walletAddress) {
    fetch(`/api/mint/active-job?wallet=${walletAddress}`)
      .then(res => res.json())
      .then(data => {
        if (data.job) {
          // Resume polling
          setCurrentJob(data.job);
          setMintStep(data.job.step === 'awaiting_payment' ? 'awaiting_payment' : 'submitted');
          startPolling(data.job.jobId);
        }
      });
  }
}, [walletAddress]);
```

This requires a new endpoint:

### File 6: `/functions/api/mint/active-job.ts` (NEW)

```
GET /api/mint/active-job?wallet=xch1...
```

Returns the active mint job for a wallet (if any):

```sql
SELECT * FROM mint_jobs
WHERE wallet_address = ? AND wallet_lock IS NOT NULL
ORDER BY created_at DESC LIMIT 1
```

---

## Infrastructure Changes

### wrangler.toml additions

```toml
# New KV namespace for mint job image storage (30 min TTL)
[[kv_namespaces]]
binding = "MINT_JOBS_KV"
id = "<create this with: wrangler kv namespace create MINT_JOBS_KV>"
```

**Create the KV namespace:**
```bash
wrangler kv namespace create "MINT_JOBS_KV"
# Copy the output ID into wrangler.toml
```

### Cron trigger for cleanup

Cloudflare Pages doesn't natively support cron triggers. Options:

**Option A (recommended):** Use the existing credit-tracker worker pattern. Add a `/api/mint/cron` endpoint that cleanup.ts exports, and trigger it from a Cloudflare Worker cron or an external cron service (e.g., cron-job.org) every 5 minutes:
```bash
curl -X POST https://wojak.ink/api/mint/cron -H "Authorization: Bearer $ADMIN_SECRET"
```

**Option B:** Add cleanup as a side-effect of the `/api/mint/job` polling endpoint — if the job being polled is stale, clean it up inline. Less clean but zero infrastructure.

**Go with Option A** — it's cleaner and matches your existing pattern.

---

## Migration Path (How to Deploy Without Breaking Existing Mints)

### Phase 1: Deploy new tables + endpoints alongside existing ones

1. Run migration `042_mint_queue.sql`
2. Create `MINT_JOBS_KV` namespace
3. Deploy `submit.ts`, `job.ts`, `process.ts`, `confirm-payment.ts`, `cleanup.ts`, `active-job.ts`
4. Keep existing `prepare.ts` and `confirm.ts` active (don't delete yet)
5. Update frontend to use new endpoints

### Phase 2: Frontend switchover

1. Update `MintContext.tsx` to use the queue model
2. Update `MintFlowModal.tsx` for progress-driven UI
3. Update `ActionBar.tsx` for idempotency key
4. Test thoroughly on staging

### Phase 3: Remove old endpoints

1. After confirming no traffic to `prepare.ts` and `confirm.ts`, deprecate them
2. Keep `status.ts` and `pricing.ts` (they still serve valid purposes)
3. `confirm.ts` can be kept as a fallback for a transition period

---

## What This Architecture Solves

| Problem | How It's Solved |
|---------|----------------|
| **Double-spend credits** | Per-wallet mutex via `wallet_lock` UNIQUE partial index. Only one active job per wallet at any time. |
| **Fake confirm (no payment)** | MintGarden on-chain verification in `confirm-payment.ts`. Server verifies NFT exists and owner matches. |
| **Supply exceeded under concurrency** | `mintNumber > SUPPLY_TOTAL` check immediately after `getNextMintNumber()`. Counter is decremented if over. Additionally, supply count includes in-flight jobs. |
| **Mint number waste** | Numbers are reserved AFTER validation passes but BEFORE IPFS. On failure, the number gap is small and accepted. Future: add reclamation in cleanup. |
| **Duplicate mints (concurrent requests)** | `idempotency_key` UNIQUE constraint returns existing job. `wallet_lock` prevents a second job from being created. |
| **Cloudflare timeout** | Submit returns in <100ms. Processing happens in `waitUntil()`. Frontend polls for progress. No long HTTP connections. |
| **Frozen spinner UX** | Real-time progress via `/api/mint/job` polling. User sees "Uploading artwork..." → "Creating your NFT..." → etc. |
| **Tab close / page reload** | `/api/mint/active-job` detects in-progress jobs on page load and resumes the UI. |
| **Offer expiry without cleanup** | Scheduled cleanup every 5 minutes expires stale jobs and releases wallet locks. |
| **Credits deducted but mint fails** | Failure handler deletes the `credit_spends` row and sets job to `'refunded'`. Cleanup catches any missed refunds. |
| **MintGarden down** | Retryable failures increment `retry_count`. Cleanup retries stale queued jobs. Max 3 retries with backoff. |
| **User doesn't know what happened** | Every step is tracked in `mint_jobs.step`. Job history persists for debugging and admin review. |

---

## Files to Create/Modify (Summary)

### New Files:
1. `functions/migrations/042_mint_queue.sql` — new table + indexes
2. `functions/api/mint/submit.ts` — fast job submission endpoint
3. `functions/api/mint/job.ts` — polling endpoint for job status
4. `functions/api/mint/process.ts` — background job processor
5. `functions/api/mint/confirm-payment.ts` — paid mint payment verification
6. `functions/api/mint/cleanup.ts` — scheduled stale job cleanup
7. `functions/api/mint/active-job.ts` — resume in-progress jobs on reload

### Modified Files:
8. `wrangler.toml` — add MINT_JOBS_KV binding
9. `src/contexts/MintContext.tsx` — refactor to queue/polling model
10. `src/components/generator/MintFlowModal.tsx` — progress-driven UI
11. `src/components/generator/ActionBar.tsx` — add idempotency key
12. `functions/api/mint/_shared.ts` — add SUPPLY_TOTAL enforcement helper

### Keep As-Is (no changes needed):
- `functions/api/mint/pricing.ts` — still serves trait pricing
- `functions/api/mint/uploadToIPFS.ts` — called by process.ts
- `functions/api/mint/request.ts` — called by process.ts
- `functions/api/mint/mintNumberHelper.ts` — called by process.ts
- `functions/api/mint/traitResolver.ts` — called by process.ts
- `functions/api/mint/auditHelper.ts` — called by process.ts
- `functions/api/mint/refund.ts` — admin refund still useful
- `functions/api/mint/audit.ts` — admin audit still useful

### Deprecated After Migration:
- `functions/api/mint/prepare.ts` — replaced by submit.ts + process.ts
- `functions/api/mint/confirm.ts` — replaced by confirm-payment.ts
- `functions/api/mint/status.ts` — replaced by active-job.ts + job.ts
