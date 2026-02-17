# Mint Pipeline Implementation Plan

## For Claude CLI — Read this entire document before writing any code

This is the single source of truth for implementing the Wojak.ink Phase 2 minting pipeline. It supersedes TASK-4 and TASK-5 where they conflict with this document. This document was written after auditing the **current deployed code** against five security/UX/architecture review documents. It tells you exactly what exists, what's broken, what's missing, and what to build — in order.

**Design principle:** If you have to choose between speed and correctness, choose correctness every time. The user is OK waiting 1-5 minutes for their NFT.

---

## Current State of the Codebase (Read This First)

Before you change anything, understand what already exists and works:

### What exists and works correctly:
- `mintNumberHelper.ts` — atomic `UPDATE...RETURNING` for mint numbers. Do not touch.
- `traitResolver.ts` — trait consolidation, display name mapping, Phase 1 rarity data. Do not touch.
- `_shared.ts` — surcharge formula, decay math, CORS headers, validation re-export. Mostly good.
- `uploadToIPFS.ts` — Pinata upload with WebP validation, SHA-256 hashing, multi-gateway URIs. Works but needs gateway fix.
- `rateLimit.ts` — D1-based rate limiting, fail-closed on DB errors. Works.
- `validation.ts` — bech32m regex for Chia addresses. Works.
- `auditHelper.ts` — `logMintStep()` and `markRefundNeeded()`. Works.
- `pricing.ts` — read-only trait pricing endpoint with supply data. Works.
- `refund.ts` — admin refund endpoint with Bearer auth. Works.
- `audit.ts` — admin audit log viewer. Works.
- `wrangler.toml` — already has `MINT_JOBS_KV` binding (id: `ccfd834158b44a799fe567fe0e3c26cf`) and `PINATA_GATEWAY = "gold-important-gibbon-467.mypinata.cloud"`.
- Frontend `MintContext.tsx` — has credit fetching, pricing refresh, resume-pending-on-reload for paid mints.
- Frontend `MintFlowModal.tsx` — has countdown timer, "Accept in Wallet" / "Copy Offer" / "Already accepted" buttons.
- Sage wallet integration — WalletConnect with `takeOffer()` working.
- Database migrations 030-041 — all applied and stable.

### What is broken and must be fixed:

1. **`confirm.ts` has NO MintGarden on-chain verification.** It accepts any `launcherId` string the client sends (line 97) and marks the mint as `'minted'`. An attacker can confirm without paying. This was fixed on the main branch at some point but is NOT in the current worktree.

2. **Free mint path delivers NFT before credits are deducted.** `prepare.ts` calls MintGarden (line 333) which delivers the NFT, then does the batch credit deduction (line 376+). If the batch credit check fails (concurrent spend race), the mint is marked `'failed'` (line 432) but the user already received the NFT from MintGarden for free.

3. **No per-wallet mutex.** Two concurrent requests from the same wallet can both pass the `existingPending` check (line 140-155) and both proceed through the entire flow.

4. **`request.ts` returns nulls on failure instead of throwing.** Line 162: `return { offerFile: null, launcherId: null }`. Every caller must null-check or bugs are silent.

5. **IPFS gateway URIs are hardcoded and don't use the dedicated gateway.** `uploadToIPFS.ts` lines 78-82 and 107-111 hardcode `gateway.pinata.cloud` and `ipfs.io` but ignore the `PINATA_GATEWAY` env var. **NFT URIs are immutable once minted** — this must be fixed before any minting happens.

6. **No cleanup mechanism.** Expired paid mints, orphaned IPFS pins, wasted mint numbers, stuck jobs — nothing is cleaned up automatically.

7. **No queue architecture.** The entire flow runs synchronously in one HTTP request, risking Cloudflare's 30-second timeout on Workers.

8. **Frontend has no idempotency keys, no real progress, no queue polling.** Single spinner with no indication of which step is happening.

### What does NOT exist yet (you will build all of this):
- `042_mint_queue.sql` migration
- `submit.ts` — fast job submission endpoint
- `job.ts` — polling endpoint
- `process.ts` — background job processor
- `confirm-payment.ts` — paid mint verification with MintGarden on-chain check
- `cleanup.ts` — scheduled stale job cleanup
- `active-job.ts` — resume in-progress jobs on page reload
- `errors.ts` — MintError class and structured error codes
- Frontend queue/polling model in MintContext
- Frontend progress UI in MintFlowModal

---

## Implementation Order

Execute these phases in strict order. Do not skip ahead. Each phase builds on the previous one.

### PHASE 1: Fix Critical Bugs in Existing Code (Do First)

These are pre-launch blockers that must be fixed regardless of the queue architecture.

#### 1A. Fix `request.ts` — Throw on Failure

Change `callMintGardenMint()` so it throws when all retries are exhausted instead of returning nulls.

**File:** `functions/api/mint/request.ts`

Current (line 138):
```typescript
return { offerFile: null, launcherId: null };
```

Change ALL three `return { offerFile: null, launcherId: null }` statements (lines 138, 148, 162) to throw:

```typescript
throw new Error(`MintGarden API failed after ${MAX_RETRIES} retries: ${lastError}`);
```

The function's return type `MintRequestResult` should then have non-optional fields:
```typescript
export interface MintRequestResult {
  offerFile: string | null;  // null for free mints (they get launcherId)
  launcherId: string | null; // null for paid mints (they get offerFile)
}
```

After this change, if the function returns at all, at least one of `offerFile` or `launcherId` is non-null. If both would be null, it throws.

Update the callers in `prepare.ts` to wrap in try/catch instead of null-checking. But since we're replacing `prepare.ts` with the queue, this fix is mainly for `process.ts` which will call it.

#### 1B. Fix IPFS Gateway URIs — Use Dedicated Gateway

**File:** `functions/api/mint/uploadToIPFS.ts`

Add a `generateIPFSUris` helper and use it instead of hardcoded arrays. The function needs the `PINATA_GATEWAY` env var passed in.

Change the function signature:
```typescript
export async function uploadToIPFS(
  imageBase64: string,
  metadata: Record<string, unknown>,
  pinataJwt: string,
  pinataGateway?: string  // NEW parameter
): Promise<IPFSUploadResult>
```

Add this helper function to the file:
```typescript
function generateIPFSUris(ipfsCid: string, pinataGateway?: string): string[] {
  const uris: string[] = [`ipfs://${ipfsCid}`];
  if (pinataGateway) {
    const gw = pinataGateway.replace(/\/$/, '');
    uris.push(`https://${gw}/ipfs/${ipfsCid}`);
  }
  uris.push(`https://gateway.pinata.cloud/ipfs/${ipfsCid}`);
  uris.push(`https://ipfs.io/ipfs/${ipfsCid}`);
  return uris;
}
```

Replace the hardcoded URI arrays (lines 78-82 and 107-111):
```typescript
const dataUris = generateIPFSUris(ipfsHash, pinataGateway);
// ...
const metadataUris = generateIPFSUris(metaIpfsHash, pinataGateway);
```

Export `generateIPFSUris` so the cleanup job can use it later.

Also add the `unpinFromIPFS` function to this file (needed by cleanup later):
```typescript
export async function unpinFromIPFS(ipfsCid: string, pinataJwt: string): Promise<boolean> {
  if (!ipfsCid || !pinataJwt) return false;
  try {
    const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${ipfsCid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pinataJwt}` },
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

export function extractCidFromUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return uri.replace('ipfs://', '');
  const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
```

#### 1C. Create Structured Error Types

**New file:** `functions/api/mint/errors.ts`

```typescript
export class MintError extends Error {
  constructor(
    public readonly code: MintErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'MintError';
  }
}

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
  | 'INTERNAL_ERROR';

export const MINT_ERROR_MESSAGES: Record<MintErrorCode, string> = {
  SOLD_OUT: 'All 4,200 Wojaks have been minted!',
  INSUFFICIENT_CREDITS: 'Not enough credits for this mint.',
  WALLET_LOCKED: 'You already have a mint in progress. Please wait for it to complete.',
  INVALID_TRAITS: 'Some trait selections are invalid. Please try different options.',
  IPFS_UPLOAD_FAILED: "Couldn't upload your artwork. Please try again in a moment.",
  MINTGARDEN_FAILED: 'The minting service is temporarily busy. Please try again.',
  OFFER_CREATION_FAILED: "Couldn't create the payment offer. Please try again.",
  OFFER_EXPIRED: 'Your payment window expired. Start a new mint to try again.',
  PAYMENT_NOT_VERIFIED: "We couldn't verify your payment on-chain yet. Try again in a moment.",
  FINALIZE_FAILED: 'Something went wrong saving your mint. Our team has been notified.',
  IMAGE_EXPIRED: 'Your session expired. Please try minting again.',
  TIMEOUT: 'Minting took too long. Please try again.',
  INTERNAL_ERROR: 'Something unexpected happened. Please try again.',
};
```

#### 1D. Move FREE_MINT_CREDITS to `_shared.ts`

**File:** `functions/api/mint/_shared.ts`

Add this constant (it's currently duplicated in `prepare.ts` line 51 and `balance.ts`):
```typescript
export const FREE_MINT_CREDITS = 10000; // 100 credits in x100 units
export const SUPPLY_TOTAL = 4200;
export const BASE_PRICE_XCH = 0.2;
export const OFFER_EXPIRY_MINUTES = 15;
```

Remove the duplicate declarations from `prepare.ts` (line 50-53) and import from `_shared.ts` instead. The `SUPPLY_TOTAL` on line 50 of `prepare.ts` should also be replaced with the import.

---

### PHASE 2: Database Migration

#### 2A. Create `functions/migrations/042_mint_queue.sql`

```sql
-- Mint job queue: one row per mint attempt.
-- Enforces one active job per wallet via partial unique index on wallet_lock.
CREATE TABLE IF NOT EXISTS mint_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Identity
  wallet_address TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,

  -- Input (frozen at submission time)
  layers_json TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  image_base64_hash TEXT NOT NULL,
  mint_type TEXT NOT NULL CHECK(mint_type IN ('paid', 'free')),

  -- Pricing (calculated and frozen at submission time)
  credit_cost INTEGER,
  xch_price_mojos INTEGER,
  surcharge_xch INTEGER,
  highest_surcharge_trait TEXT,

  -- Progress tracking
  step TEXT NOT NULL DEFAULT 'queued'
    CHECK(step IN (
      'queued',
      'validating',
      'reserving_number',
      'uploading_ipfs',
      'calling_mintgarden',
      'awaiting_payment',
      'finalizing',
      'completed',
      'failed',
      'refunded'
    )),

  -- Outputs (populated as steps complete)
  mint_number INTEGER,
  ipfs_image_uris TEXT,
  ipfs_metadata_uris TEXT,
  image_hash TEXT,
  metadata_hash TEXT,
  mintgarden_launcher_id TEXT,
  offer_file TEXT,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Cross-references
  phase2_mint_id INTEGER,
  credit_spend_id INTEGER,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  expires_at TEXT,

  -- Per-wallet mutex: set to wallet_address when active, NULL when done
  wallet_lock TEXT
);

-- CRITICAL: Per-wallet mutex. Only one row per wallet can have non-NULL wallet_lock.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mj_wallet_lock
  ON mint_jobs(wallet_lock) WHERE wallet_lock IS NOT NULL;

-- Polling by job ID + wallet
CREATE INDEX IF NOT EXISTS idx_mj_id_wallet ON mint_jobs(id, wallet_address);

-- Finding queued jobs to process
CREATE INDEX IF NOT EXISTS idx_mj_step ON mint_jobs(step) WHERE step = 'queued';

-- Finding stale jobs to expire
CREATE INDEX IF NOT EXISTS idx_mj_updated ON mint_jobs(updated_at);

-- Idempotency key lookup
CREATE INDEX IF NOT EXISTS idx_mj_idempotency ON mint_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

Apply this migration:
```bash
wrangler d1 migrations apply wojak-users --remote
```

---

### PHASE 3: Backend — New Queue Endpoints

Build these files in order. Each file is described with its complete purpose, endpoint, request/response format, and implementation logic.

#### 3A. `functions/api/mint/submit.ts` — Fast Job Submission

**Endpoint:** `POST /api/mint/submit`

This endpoint MUST respond in under 100ms. It does NO IPFS uploads, NO MintGarden calls. It validates input, locks the wallet, deducts credits (free mints), creates a queued job, and triggers background processing.

**Request body:**
```typescript
{
  walletAddress: string;
  selectedLayers: Record<string, string>;
  selectedColors: Record<string, string>;
  imageBase64: string;
  mintType: 'paid' | 'free';
  idempotencyKey: string;
}
```

**Success response:**
```typescript
{
  jobId: number;
  step: 'queued';
  mintType: 'paid' | 'free';
  creditCost?: number;      // free: display units
  estimatedXch?: number;    // paid: total XCH price
  resumed?: boolean;        // true if returning existing job
}
```

**Implementation steps — execute in this exact order:**

1. CORS + method check (same as current prepare.ts)
2. Rate limit: 5/min per IP/wallet, fail-closed
3. Parse and validate JSON body:
   - `walletAddress` via `isValidChiaAddress()`
   - `imageBase64` present and is string
   - `selectedLayers` keys in `VALID_LAYER_NAMES`, paths pass traversal check
   - `selectedColors` values pass hex validation
   - `mintType` is 'paid' or 'free'
   - `idempotencyKey` is present string
4. **Idempotency check:** `SELECT id, step, wallet_address, mint_number, offer_file, mintgarden_launcher_id, error_message, error_code FROM mint_jobs WHERE idempotency_key = ?`
   - If found AND wallet matches: return existing job state with `resumed: true`
   - If found AND wallet doesn't match: return 409 error
5. **Sold-out fast check:** `SELECT value FROM server_state WHERE key = 'sold_out'`
   - If `'true'`: return sold out immediately
6. **Supply check:** Count `phase2_mints WHERE status = 'minted'` PLUS `mint_jobs WHERE step NOT IN ('completed', 'failed', 'refunded')`. If total >= 4200: return sold out.
7. **Build consolidated traits** (same logic as current prepare.ts lines 169-197)
8. **Calculate pricing:**
   - For free: query `trait_usage`, calculate `freeMintCreditCost` with premium tier scaling (same as current prepare.ts lines 203-261)
   - For paid: query `trait_usage`, calculate `totalPriceXch` with max surcharge (same as current prepare.ts lines 459-492)
9. **For free mints — deduct credits NOW:**
   ```sql
   INSERT INTO credit_spends (wallet_address, mint_id, credits_spent)
   SELECT ?, 0, ?
   WHERE (
     (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
     (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?)
   ) >= ?
   ```
   If 0 rows affected: return insufficient credits error with balance details.
   Save `credit_spend_id` from `last_row_id`.
10. **Compute image hash:** `await sha256Hex(base64ToUint8Array(imageBase64))`
11. **INSERT the job** with `wallet_lock = walletAddress`:
    - If INSERT fails with UNIQUE constraint on `wallet_lock`: another job is active for this wallet. Return `{ error: 'You already have a mint in progress.', errorCode: 'WALLET_LOCKED' }` (409).
    - If INSERT fails with UNIQUE constraint on `idempotency_key`: race condition — another request with same key won. Re-query and return it.
    - On success: get `jobId` from `last_row_id`.
12. **Store image in KV:** `await env.MINT_JOBS_KV.put('job-image:' + jobId, imageBase64, { expirationTtl: 1800 })`
13. **Trigger processing:** `context.waitUntil(processJob(env, jobId, imageBase64))`
14. **Return:**
    ```typescript
    { jobId, step: 'queued', mintType, creditCost: freeMintCreditCost / 100, estimatedXch: totalPriceXch }
    ```

**CRITICAL:** If the credit deduction succeeds (step 9) but the INSERT fails (step 11), you MUST delete the credit_spends row to refund. Wrap steps 9-11 so that any failure after credit deduction triggers a refund.

**Env interface for this file:**
```typescript
interface Env {
  DB: D1Database;
  MINT_JOBS_KV: KVNamespace;
  PINATA_JWT?: string;
  PHASE2_COLLECTION_UUID?: string;
  PHASE2_PROFILE_ID?: string;
  PHASE2_ROYALTY_ADDRESS?: string;
  PHASE2_ROYALTY_PCT?: string;
  MINTGARDEN_API_KEY?: string;
  PINATA_GATEWAY?: string;
}
```

#### 3B. `functions/api/mint/process.ts` — Background Job Processor

This is NOT an HTTP endpoint. It's an exported function called by `submit.ts` via `waitUntil()` and by `cleanup.ts` for retries.

```typescript
export async function processJob(env: Env, jobId: number, imageBase64: string): Promise<void>
```

**Step-by-step processing — each step updates `mint_jobs.step`:**

**Helper function needed:**
```typescript
async function updateJobStep(db: D1Database, jobId: number, step: string): Promise<void> {
  await db.prepare(
    `UPDATE mint_jobs SET step = ?, updated_at = datetime('now'),
     started_at = COALESCE(started_at, datetime('now'))
     WHERE id = ?`
  ).bind(step, jobId).run();
}
```

**Step 1: Load and validate job**
- `SELECT * FROM mint_jobs WHERE id = ? AND step = 'queued'`
- If not found (already picked up or doesn't exist): return silently.
- Update step to `'validating'`.

**Step 2: Validate traits**
- Parse `layers_json` and `colors_json`.
- Build consolidated traits using the same logic from `prepare.ts` lines 169-197 (use `resolveTraitName`, `LAYER_TO_TRAIT_TYPE`, `PHASE1_RARITY`, consolidation by rarity, inject fixed "Base: Wojak").
- If validation fails: throw `new MintError('INVALID_TRAITS', ...)`.

**Step 3: Reserve mint number**
- Update step to `'reserving_number'`.
- Call `getNextMintNumber(env.DB)`.
- **SUPPLY CHECK IMMEDIATELY AFTER:** If `mintNumber > SUPPLY_TOTAL`, decrement the counter back (`UPDATE mint_counter SET next_number = next_number - 1 WHERE id = 1`) and throw `new MintError('SOLD_OUT', ...)`.
- Save mint number: `UPDATE mint_jobs SET mint_number = ? WHERE id = ?`

**Step 4: Upload to IPFS**
- Update step to `'uploading_ipfs'`.
- Build CHIP-0007 metadata object (same as current prepare.ts lines 296-308, but add collection attributes — see Pattern 8 below).
- Call `uploadToIPFS(imageBase64, metadata, env.PINATA_JWT, env.PINATA_GATEWAY)`.
  - Note: pass `env.PINATA_GATEWAY` so the dedicated gateway is included in URIs.
- Save results: `UPDATE mint_jobs SET ipfs_image_uris = ?, ipfs_metadata_uris = ?, image_hash = ?, metadata_hash = ? WHERE id = ?`
- Delete image from KV: `await env.MINT_JOBS_KV.delete('job-image:' + jobId)`

**Step 5: Call MintGarden**
- Update step to `'calling_mintgarden'`.
- Call `callMintGardenMint(params, env)` (this now throws on failure from Phase 1A fix).
- For free mints:
  - Verify `mintResult.launcherId` is truthy. If not: throw `new MintError('MINTGARDEN_FAILED', ...)`.
  - Save: `UPDATE mint_jobs SET mintgarden_launcher_id = ? WHERE id = ?`
- For paid mints:
  - Verify `mintResult.offerFile` is truthy. If not: throw `new MintError('OFFER_CREATION_FAILED', ...)`.
  - Save: `UPDATE mint_jobs SET offer_file = ?, expires_at = ? WHERE id = ?`
  - Expires at = `new Date(Date.now() + 20 * 60 * 1000).toISOString()` (20 minutes, slightly longer than frontend countdown).

**Step 6a: Await payment (paid mints only)**
- Update step to `'awaiting_payment'`.
- **STOP HERE.** Return from `processJob()`. The job stays in `awaiting_payment` until the user calls `confirm-payment.ts` or the cleanup job expires it.

**Step 6b: Finalize (free mints continue here; paid mints jump here from confirm-payment)**

Create a separate exported function:
```typescript
export async function finalizeJob(env: Env, jobId: number): Promise<void>
```

This function:
1. Updates step to `'finalizing'`.
2. Loads the full job row.
3. Parses layers and builds consolidated traits.
4. Creates an atomic D1 batch with:
   - INSERT into `phase2_mints` with `status = 'minted'`
   - UPSERT `trait_usage` for each consolidated trait (same decay logic as current confirm.ts)
5. Gets the `phase2_mints.id` from the INSERT.
6. Updates `credit_spends.mint_id` to the real mint ID (free mints — it was set to 0 at submission).
7. **Post-mint supply check:** Count `phase2_mints WHERE status = 'minted'`. If >= 4200: `INSERT OR REPLACE INTO server_state (key, value, updated_at) VALUES ('sold_out', 'true', datetime('now'))`.
8. Marks job as completed: `UPDATE mint_jobs SET step = 'completed', completed_at = datetime('now'), phase2_mint_id = ?, wallet_lock = NULL, updated_at = datetime('now') WHERE id = ?`
9. Logs to audit trail via `logMintStep()`.

**Failure handler:**

```typescript
async function handleJobFailure(env: Env, jobId: number, job: any, error: unknown): Promise<void>
```

This function:
1. Extracts error message and code (if `MintError`, use its code; otherwise `'INTERNAL_ERROR'`).
2. Checks if error is retryable. Non-retryable codes: `SOLD_OUT`, `INSUFFICIENT_CREDITS`, `INVALID_TRAITS`.
3. If retryable AND `retry_count < max_retries`: increment retry count, keep current step, save error. Return (cleanup job will retry later).
4. If non-retryable or max retries exceeded:
   - If free mint with `credit_spend_id`: DELETE from `credit_spends`, set step to `'refunded'`.
   - If paid mint with `mintgarden_launcher_id` (user already paid): flag `refund_needed = 1` on `phase2_mints` if it exists, log to audit trail with `'refund_auto_flagged'` step. This is critical — it prevents the user from losing money silently.
   - Release wallet lock: `UPDATE mint_jobs SET step = ?, error_message = ?, error_code = ?, wallet_lock = NULL WHERE id = ?`
5. Log to audit trail.

**CHIP-0007 Metadata (for Step 4):**

Build metadata like this:
```typescript
const metadata = {
  format: 'CHIP-0007',
  name: `Your Wojak #${mintNumber}`,
  description: 'Your Wojak puts collectors in control. Same handcrafted layers and lore from the Wojak Farmers Plot collection — but you choose every layer, every color, every detail using the Wojak Generator on Wojak.ink 🍊',
  sensitive_content: false,
  collection: {
    name: 'Your Wojak',
    id: env.PHASE2_COLLECTION_UUID || '',
    attributes: [
      { type: 'description', value: 'Your Wojak puts collectors in control. Choose every layer, every color, every detail.' },
      { type: 'website', value: 'https://wojak.ink' },
      { type: 'twitter', value: 'https://x.com/WojakInk' },
    ],
  },
  edition: mintNumber,
  date: Date.now(),
  compiler: 'Wojak.ink Generator',
  attributes: consolidatedAttributes,
  edition_number: mintNumber,
  edition_total: SUPPLY_TOTAL,
};
```

**IMPORTANT:** Verify `https://x.com/WojakInk` is the correct Twitter/X URL before deploying. If uncertain, omit the twitter attribute — these are immutable once minted.

#### 3C. `functions/api/mint/job.ts` — Polling Endpoint

**Endpoint:** `GET /api/mint/job?id=<jobId>&wallet=<walletAddress>`

No authentication beyond wallet address match. This is a read-only endpoint.

**Response:**
```typescript
{
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
  errorCode?: string;
  creditsRefunded?: boolean;
  createdAt: string;
  expiresAt?: string;
}
```

**Step label mapping:**
```
queued           → "Preparing your mint..."                    (1/6 free, 1/7 paid)
validating       → "Validating trait selections..."            (1)
reserving_number → "Reserving your Wojak number..."            (2)
uploading_ipfs   → "Uploading artwork to IPFS..."              (3)
calling_mintgarden → "Creating your NFT..."                    (4)
awaiting_payment → "Accept the offer in your wallet"           (5, paid only)
finalizing       → "Finalizing your mint..."                   (5 free / 6 paid)
completed        → "Your Wojak has been minted!"               (done)
failed           → use MINT_ERROR_MESSAGES[error_code] or error_message
refunded         → "Mint failed. Credits have been refunded."
```

For `creditsRemaining` on free mints: run a live balance query:
```sql
SELECT
  (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
  (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?) AS balance
```

For `mintgardenUrl`: if `launcherId` exists, return `https://mintgarden.io/nfts/${launcherId}`.

#### 3D. `functions/api/mint/confirm-payment.ts` — Paid Mint Verification

**Endpoint:** `POST /api/mint/confirm-payment`

This replaces the current `confirm.ts` for the queue flow.

**Request:**
```typescript
{ jobId: number; walletAddress: string; launcherId: string; }
```

**Implementation:**
1. Rate limit: 10/min per IP/wallet.
2. Validate inputs: `jobId` is integer, `walletAddress` is valid Chia address, `launcherId` is string.
3. Load job: `SELECT * FROM mint_jobs WHERE id = ? AND wallet_address = ? AND step = 'awaiting_payment'`
   - If not found: return 404.
   - Wallet mismatch check is implicit in the WHERE clause.
4. **MintGarden on-chain verification:**
   ```typescript
   const mgRes = await fetch(`https://api.mintgarden.io/nfts/${launcherId}`);
   if (!mgRes.ok) {
     return jsonResponse({ pending: true, message: 'NFT not found on-chain yet. It may take a moment.' });
   }
   const nftData = await mgRes.json();
   // Verify the NFT exists — if the API returns data, it's on-chain
   if (!nftData || nftData.error) {
     return jsonResponse({ pending: true, message: 'NFT not confirmed yet.' });
   }
   ```
   If verification fails: return `{ pending: true }` (not an error — blockchain propagation takes time).
5. Update job: `UPDATE mint_jobs SET mintgarden_launcher_id = ? WHERE id = ?`
6. Call `finalizeJob(env, jobId)`.
7. Load the completed job and return success with mint details.

#### 3E. `functions/api/mint/active-job.ts` — Resume on Page Reload

**Endpoint:** `GET /api/mint/active-job?wallet=<walletAddress>`

**Implementation:**
1. Validate wallet address.
2. Query: `SELECT * FROM mint_jobs WHERE wallet_address = ? AND wallet_lock IS NOT NULL ORDER BY created_at DESC LIMIT 1`
3. If found: return the job in the same format as `job.ts`.
4. If not found: return `{ job: null }`.

#### 3F. `functions/api/mint/cleanup.ts` — Scheduled Cleanup

**Endpoint:** `POST /api/mint/cleanup` (admin-authenticated via Bearer token, same as refund.ts)

Also export the cleanup function so it can be called from a cron worker.

**Implementation — run these cleanup tasks in order:**

1. **Expire stuck awaiting_payment jobs** (offer expired):
   ```sql
   UPDATE mint_jobs SET step = 'failed', error_message = 'Offer expired',
     error_code = 'OFFER_EXPIRED', wallet_lock = NULL, updated_at = datetime('now')
   WHERE step = 'awaiting_payment'
     AND expires_at IS NOT NULL AND expires_at < datetime('now')
   ```

2. **Expire stuck processing jobs** (worker died):
   ```sql
   UPDATE mint_jobs SET step = 'failed', error_message = 'Processing timed out',
     error_code = 'TIMEOUT', wallet_lock = NULL, updated_at = datetime('now')
   WHERE step NOT IN ('completed', 'failed', 'refunded', 'awaiting_payment', 'queued')
     AND updated_at < datetime('now', '-5 minutes')
   ```

3. **Retry stale queued jobs** (waitUntil failed to fire):
   ```sql
   SELECT id FROM mint_jobs WHERE step = 'queued'
     AND created_at < datetime('now', '-30 seconds')
     AND retry_count < max_retries
     LIMIT 5
   ```
   For each: try to get image from KV. If found, call `processJob()`. If image expired, fail the job with `IMAGE_EXPIRED`.

4. **Refund credits for failed free mint jobs:**
   ```sql
   SELECT id, credit_spend_id FROM mint_jobs
   WHERE step = 'failed' AND mint_type = 'free' AND credit_spend_id IS NOT NULL
   ```
   For each: DELETE from `credit_spends`, update job to `step = 'refunded'`, set `credit_spend_id = NULL`.

5. **Auto-flag refunds for paid mints that failed after payment:**
   ```sql
   SELECT id, phase2_mint_id, wallet_address, mintgarden_launcher_id, xch_price_mojos, step as failure_step, error_message
   FROM mint_jobs
   WHERE step = 'failed' AND mint_type = 'paid' AND mintgarden_launcher_id IS NOT NULL
   ```
   For each: if `phase2_mint_id` exists, `UPDATE phase2_mints SET refund_needed = 1, refund_reason = ?`. Log to audit trail.

6. **Unpin orphaned IPFS** (failed jobs older than 1 hour):
   ```sql
   SELECT id, ipfs_image_uris, ipfs_metadata_uris FROM mint_jobs
   WHERE step IN ('failed', 'refunded')
     AND (ipfs_image_uris IS NOT NULL OR ipfs_metadata_uris IS NOT NULL)
     AND created_at < datetime('now', '-1 hour')
     LIMIT 10
   ```
   For each: extract CIDs using `extractCidFromUri()`, call `unpinFromIPFS()`, then NULL out the URI fields.

7. **Expire stale phase2_mints** (backwards compatibility with old flow):
   ```sql
   UPDATE phase2_mints SET status = 'expired'
   WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')
   ```

Return a summary of what was cleaned up.

---

### PHASE 4: Frontend Refactor

#### 4A. Refactor `MintContext.tsx` to Queue/Polling Model

**Replace the MintStep type:**
```typescript
export type MintStep =
  | 'idle'
  | 'confirming'        // User reviewing price before submitting
  | 'submitted'         // Job submitted, polling for progress
  | 'awaiting_payment'  // Paid: waiting for user to accept offer
  | 'success'
  | 'error';
```

**Add new state:**
```typescript
const [currentJob, setCurrentJob] = useState<MintJob | null>(null);
const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
```

**New `startMint` flow:**
1. Generate idempotency key: `const key = crypto.randomUUID()`
2. Store in state: `setIdempotencyKey(key)`
3. Set step to `'submitted'`
4. Call `POST /api/mint/submit` with the key
5. On success: start polling with `data.jobId`
6. On error: set step to `'error'` with error message

**New `startPolling` function:**
```typescript
function startPolling(jobId: number) {
  // Clear any existing interval
  if (pollingInterval) clearInterval(pollingInterval);

  const poll = async () => {
    try {
      const res = await fetch(`/api/mint/job?id=${jobId}&wallet=${address}`);
      const data = await res.json();
      setCurrentJob(data);

      if (data.step === 'awaiting_payment') {
        setMintStep('awaiting_payment');
      }
      if (data.step === 'completed') {
        setMintStep('success');
        setSuccessResult({ mintNumber: data.mintNumber, launcherId: data.launcherId, mintgardenUrl: data.mintgardenUrl });
        clearInterval(interval);
        setPollingInterval(null);
        refetchCredits();
      }
      if (data.step === 'failed' || data.step === 'refunded') {
        setMintStep('error');
        setErrorMessage(data.error || 'Mint failed');
        clearInterval(interval);
        setPollingInterval(null);
        if (data.creditsRefunded) refetchCredits();
      }
    } catch {
      // Network error — don't stop polling, just skip this tick
    }
  };

  // Poll immediately, then every 3 seconds
  poll();
  const interval = setInterval(poll, 3000);
  setPollingInterval(interval);

  // Safety: stop after 10 minutes
  setTimeout(() => { clearInterval(interval); setPollingInterval(null); }, 10 * 60 * 1000);
}
```

**Paid mint confirmation — replace `acceptOfferInWallet`:**
After `takeOffer()` succeeds via WalletConnect, call `POST /api/mint/confirm-payment` with `{ jobId: currentJob.jobId, walletAddress: address, launcherId }`. The launcherId comes from... well, the current flow doesn't get it from takeOffer. Keep the existing pattern: after takeOffer succeeds, call confirm-payment. If confirm-payment returns `{ pending: true }`, stay on awaiting_payment and let the user click "I've already accepted" to retry.

**Page reload recovery:**
```typescript
useEffect(() => {
  if (!address || !isValidChiaAddress(address)) return;
  fetch(`/api/mint/active-job?wallet=${encodeURIComponent(address)}`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data?.job) return;
      const step = data.job.step;
      if (['completed', 'failed', 'refunded'].includes(step)) return;
      setCurrentJob(data.job);
      setIdempotencyKey(data.job.idempotency_key);
      setMintStep(step === 'awaiting_payment' ? 'awaiting_payment' : 'submitted');
      startPolling(data.job.id);
    })
    .catch(() => {});
}, [address]);
```

**Visibility change handler:**
```typescript
useEffect(() => {
  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && currentJob?.jobId) {
      // Immediately poll when tab becomes visible
      fetch(`/api/mint/job?id=${currentJob.jobId}&wallet=${address}`)
        .then(res => res.json())
        .then(data => setCurrentJob(data))
        .catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => document.removeEventListener('visibilitychange', onVisibilityChange);
}, [currentJob?.jobId, address]);
```

**Retry logic:**
- "Try Again" button: call `submitMint` with the SAME idempotency key.
- "Mint Another" button: set `idempotencyKey` to null, then call `startMint` which generates a new key.

**Remove the old `startMint` that calls `/api/mint/prepare`.** Remove `confirmMintManual`. Remove the `pendingMint` state that tracked the old flow. Keep `successResult` for displaying success info.

#### 4B. Update `MintFlowModal.tsx` — Progress-Driven UI

Replace the current modal content with server-driven progress:

- Show a real progress bar: `currentJob.stepNumber / currentJob.totalSteps`
- Show the step label from the server: `currentJob.stepLabel`
- When `step === 'awaiting_payment'`:
  - Show the offer file (Accept in Wallet / Copy Offer / Already Accepted — same buttons as now)
  - Show countdown timer based on `currentJob.expiresAt`
- When `step === 'completed'`:
  - Show mint number and MintGarden link
  - Show "Mint Another" button
- When `step === 'failed'` or `'refunded'`:
  - Show `currentJob.error` (this is already user-friendly from the error mapping)
  - If `creditsRefunded`: show "Credits have been refunded"
  - Show "Try Again" button

#### 4C. Update `ActionBar.tsx` — Wire Up New Flow

The mint button click handler should:
1. Export the canvas to WebP (same as current `handleMintClick`)
2. Call `startMint(blob, layers, colors, mintType)` on the new MintContext
3. The new `startMint` shows the confirming step, then submits

---

### PHASE 5: Deprecation and Cleanup

After the queue flow is working:

1. **Keep these files (still useful):**
   - `prepare.ts` — keep temporarily as fallback. Add a comment: `// DEPRECATED: use submit.ts + process.ts`
   - `confirm.ts` — keep temporarily. Add a comment: `// DEPRECATED: use confirm-payment.ts`
   - `status.ts` — keep for backwards compatibility with any external tools
   - `pricing.ts` — still serves pricing to frontend
   - `upload.ts` — may be used by other things (check before removing)
   - `refund.ts` — admin tool, still needed
   - `audit.ts` — admin tool, still needed

2. **Set up cron for cleanup:**
   - Create an external cron job (e.g., via Cloudflare Workers cron trigger, or cron-job.org) that hits `POST /api/mint/cleanup` with the admin Bearer token every 5 minutes.
   - Or add cleanup as a side-effect of the `job.ts` polling endpoint — if the polled job is stale, clean it up inline. Less clean but zero infrastructure.

---

## What NOT To Do

Read these carefully. These are anti-patterns from the project's CLAUDE.md and from my audit:

- **Never `SELECT MAX` for sequential IDs.** Use `UPDATE...RETURNING` on `mint_counter`. This is already done correctly in `mintNumberHelper.ts`.
- **Never single IPFS URIs.** Always use `string[]` with gateway redundancy. The `generateIPFSUris()` function handles this.
- **Never self-fetch own API endpoints.** The `prepare→upload` self-fetch was tech debt. `process.ts` calls `uploadToIPFS()` directly.
- **Never `startsWith('xch1')` for wallet validation.** Use `isValidChiaAddress()` (bech32m regex).
- **Never hardcode XCH prices.** Use the constants from `_shared.ts`.
- **Never change schema without a migration file.** All schema changes go in `042_mint_queue.sql`.
- **Never `!important` in CSS.** Ever.
- **Never copy Crate's Parse Server / MongoDB patterns.** Our D1/SQLite stack is better.
- **Never copy Crate's image-download-from-URL approach.** Client-sends-base64 is faster.
- **Never make IPFS verification a hard requirement.** Gateway propagation is slow — warn, don't block.
- **Never hardcode social URLs in CHIP-0007 without confirmation.** Wrong URLs are immutable on-chain.

---

## Files Summary

### New files to create:
1. `functions/migrations/042_mint_queue.sql`
2. `functions/api/mint/errors.ts`
3. `functions/api/mint/submit.ts`
4. `functions/api/mint/process.ts`
5. `functions/api/mint/job.ts`
6. `functions/api/mint/confirm-payment.ts`
7. `functions/api/mint/active-job.ts`
8. `functions/api/mint/cleanup.ts`

### Existing files to modify:
9. `functions/api/mint/request.ts` — throw on failure (Phase 1A)
10. `functions/api/mint/uploadToIPFS.ts` — add gateway config + unpin + extract CID (Phase 1B)
11. `functions/api/mint/_shared.ts` — add shared constants (Phase 1D)
12. `src/contexts/MintContext.tsx` — refactor to queue/polling (Phase 4A)
13. `src/components/generator/MintFlowModal.tsx` — progress UI (Phase 4B)
14. `src/components/generator/ActionBar.tsx` — wire up new flow (Phase 4C)

### Files to leave alone:
- `functions/api/mint/mintNumberHelper.ts`
- `functions/api/mint/traitResolver.ts`
- `functions/api/mint/auditHelper.ts`
- `functions/api/mint/pricing.ts`
- `functions/api/mint/refund.ts`
- `functions/api/mint/audit.ts`
- `functions/lib/rateLimit.ts`
- `functions/lib/validation.ts`
- `wrangler.toml` (already configured)

### Files to deprecate after queue works:
- `functions/api/mint/prepare.ts`
- `functions/api/mint/confirm.ts`
- `functions/api/mint/status.ts`

---

## Verification Checklist

After implementation, verify each of these:

- [ ] `request.ts` throws on all-retries-exhausted (no more `return { null, null }`)
- [ ] IPFS URIs include the dedicated Pinata gateway as the second URI
- [ ] `unpinFromIPFS()` and `extractCidFromUri()` exported from uploadToIPFS.ts
- [ ] `MintError` class and `MINT_ERROR_MESSAGES` exist in errors.ts
- [ ] `SUPPLY_TOTAL`, `FREE_MINT_CREDITS`, `BASE_PRICE_XCH` in _shared.ts (not duplicated)
- [ ] Migration 042 creates `mint_jobs` table with all indexes
- [ ] `submit.ts` responds in <100ms (no IPFS, no MintGarden calls)
- [ ] `submit.ts` deducts credits BEFORE creating the job (free mints)
- [ ] `submit.ts` refunds credits if job creation fails after deduction
- [ ] `submit.ts` stores image in KV with 30-min TTL
- [ ] `submit.ts` triggers `processJob()` via `waitUntil()`
- [ ] `process.ts` checks `mintNumber > SUPPLY_TOTAL` and decrements counter if over
- [ ] `process.ts` stops at `awaiting_payment` for paid mints
- [ ] `finalizeJob()` does post-mint supply check and auto sold-out
- [ ] `handleJobFailure()` refunds credits for failed free mints
- [ ] `handleJobFailure()` auto-flags refund for paid mints with launcher ID
- [ ] `handleJobFailure()` releases wallet_lock in all failure cases
- [ ] `confirm-payment.ts` verifies NFT on MintGarden before finalizing
- [ ] `cleanup.ts` expires stuck jobs, refunds credits, unpins IPFS, flags refunds
- [ ] `active-job.ts` returns active job for wallet (for page reload recovery)
- [ ] `job.ts` maps step to human-readable label and progress number
- [ ] `job.ts` uses MINT_ERROR_MESSAGES for error display
- [ ] Frontend generates `crypto.randomUUID()` idempotency key on mint click
- [ ] Frontend reuses same key on retry, generates new key on "Mint Another"
- [ ] Frontend polls `/api/mint/job` every 3 seconds
- [ ] Frontend checks `/api/mint/active-job` on page load for recovery
- [ ] Frontend handles `visibilitychange` to re-poll when tab becomes visible
- [ ] Frontend shows real progress bar driven by server step
- [ ] Frontend shows step labels from server (not hardcoded)
- [ ] Old `prepare.ts` and `confirm.ts` still exist but marked as deprecated
