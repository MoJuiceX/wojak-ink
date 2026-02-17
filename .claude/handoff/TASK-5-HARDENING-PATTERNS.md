# Task 5: Mint Pipeline Hardening Patterns

## Context

This document describes **architectural patterns and specific improvements** to adopt across the minting pipeline. These are independent of any specific file structure — apply them wherever the relevant logic lives after the queue-based architecture (Task 4) is implemented.

Each section describes: **what** to implement, **why** it matters, and a **reference implementation** that should be adapted to fit the current code.

Read `CLAUDE.md` and `.claude/instructions/PROMPT-PRINCIPLES.md` before starting. Follow all existing conventions (CSS rules, anti-patterns, etc).

---

## Pattern 1: Post-Mint Supply Check with Auto Sold-Out

### What

After every successful mint finalization (the step where `phase2_mints` gets a row with `status='minted'`), count the total minted supply and automatically mark the collection as sold out if it has reached 4,200.

### Why

The current supply check happens BEFORE the mint (a pre-check). Under concurrency, multiple requests can pass the pre-check simultaneously and exceed 4,200. Even with the queue's per-wallet lock, two different wallets minting at the same time could both pass the pre-check. A post-mint check is the safety net: it detects when 4,200 is reached and prevents any further mints from being accepted.

This pattern is proven in production in the Crate minting platform (`queue_airdrop.js` lines 1162-1217), where it automatically sets `collection.status = 'sold_out'` with a timestamp after each mint.

### Implementation

After the `phase2_mints` INSERT succeeds in the finalization step:

```typescript
// Post-mint supply check — runs after every successful mint.
// This is the authoritative supply gate (pre-check is just an optimization).
try {
  const supplyRow = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
  ).first<{ count: number }>();
  const totalMinted = supplyRow?.count ?? 0;

  // Store the latest supply count on the job for the frontend to display
  // e.g.: "Your Wojak #42 — 3,847 of 4,200 minted"

  if (totalMinted >= SUPPLY_TOTAL) {
    // Insert or update a server_state row that the pricing/submit endpoints check.
    // This is faster than COUNT(*) on every request.
    await env.DB.prepare(
      `INSERT INTO server_state (key, value, updated_at)
       VALUES ('sold_out', 'true', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = 'true', updated_at = datetime('now')`
    ).run();

    console.log(`[Mint] Collection sold out at ${totalMinted}/${SUPPLY_TOTAL}`);
  }
} catch (supplyCheckError) {
  // Non-critical — don't fail the mint for this
  console.error('[Mint] Post-mint supply check failed:', supplyCheckError);
}
```

Then in the submit/prepare endpoint, check this flag FIRST (fast path) before doing the COUNT:

```typescript
const soldOut = await env.DB.prepare(
  "SELECT value FROM server_state WHERE key = 'sold_out'"
).first<{ value: string }>();
if (soldOut?.value === 'true') {
  return errorResponse('All 4,200 Wojaks have been minted!', 400);
}
```

### Where to apply

- The finalization step of the mint processor (wherever `phase2_mints` INSERT with `status='minted'` happens)
- The submit/prepare endpoint (add the fast `server_state` check before the COUNT query)

### Database

If `server_state` table doesn't exist yet (it was created in migration 008), verify it has a UNIQUE constraint on `key`. If not, create it:

```sql
CREATE TABLE IF NOT EXISTS server_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Pattern 2: Automatic Refund Flagging on Paid Mint Failure

### What

When a paid mint job fails AFTER the user has already accepted the offer (meaning they've paid XCH), automatically set `refund_needed = 1` on the corresponding `phase2_mints` record and log it. Don't require an admin to discover the failure manually.

### Why

Currently, refunds are only triggered manually via the `/api/mint/refund` admin endpoint. If a paid mint fails during finalization (DB error after MintGarden succeeded), the user has paid but the mint isn't recorded. Nobody knows until the user complains in Discord.

Crate handles this by returning `{ needsRefund: true }` from the mint function, which the caller uses to flag the transaction. We need the same automatic flagging.

### Implementation

In the failure handler for mint jobs (wherever failed jobs are handled after the queue processes them):

```typescript
// If this is a paid mint that failed AFTER the user accepted the offer,
// they've already spent XCH. Flag for refund automatically.
if (job.mint_type === 'paid' && job.mintgarden_launcher_id) {
  // The launcher ID existing means MintGarden created the NFT.
  // If the job still failed, the user paid but our DB is inconsistent.
  // Flag for admin refund review.
  try {
    // If we have a phase2_mints record for this job, flag it
    if (job.phase2_mint_id) {
      await env.DB.prepare(
        `UPDATE phase2_mints SET refund_needed = 1,
         refund_reason = ? WHERE id = ?`
      ).bind(
        `Paid mint failed during ${job.step}: ${errorMsg}`,
        job.phase2_mint_id
      ).run();
    }

    // Also log to audit trail with high visibility
    await logMintStep(env.DB, {
      mint_id: job.phase2_mint_id ?? 0,
      step: 'refund_auto_flagged',
      status: 'failed',
      error: `Paid mint failed after payment. Job ${jobId}, step: ${job.step}`,
      data: {
        job_id: jobId,
        wallet: job.wallet_address,
        launcher_id: job.mintgarden_launcher_id,
        xch_price: job.xch_price_mojos,
        failure_step: job.step,
        error: errorMsg,
      },
    });
  } catch (refundFlagError) {
    // Critical: if we can't even flag the refund, log loudly
    console.error('[CRITICAL] Failed to auto-flag refund for paid mint:', {
      jobId,
      wallet: job.wallet_address,
      launcherId: job.mintgarden_launcher_id,
      error: refundFlagError,
    });
  }
}
```

### Where to apply

- The job failure handler (wherever `step = 'failed'` is set on a mint job)
- Only for paid mints where `mintgarden_launcher_id` is non-null (meaning the NFT was created on-chain)

---

## Pattern 3: Idempotency Wrapper Utility

### What

Create a reusable `processWithIdempotency()` function that wraps any operation with duplicate-request protection. Given an idempotency key, it either runs the operation (first call) or returns the cached result (subsequent calls).

### Why

The queue architecture uses an `idempotency_key` column with a UNIQUE constraint to prevent duplicate job creation. But the check-then-insert pattern needs to be done correctly in one place, not scattered across endpoints. A wrapper function makes this foolproof.

This pattern is proven in Crate's `processWithReplayProtection()` (`transactionReplayProtection.js` lines 430-510), which wraps any transaction processing with duplicate detection. Our version is simpler because D1's UNIQUE constraint does the heavy lifting.

### Implementation

Create this as a utility function (e.g., in a shared mint helpers file):

```typescript
/**
 * Process a request with idempotency protection.
 *
 * If a job with this idempotency_key already exists, returns the existing job
 * instead of creating a new one. If not, calls the creator function.
 *
 * @param db - D1 database
 * @param idempotencyKey - Client-generated UUID
 * @param walletAddress - For verification (must match existing job if found)
 * @param createJob - Function that creates the job if it doesn't exist
 * @returns The job record (existing or newly created)
 */
export async function processWithIdempotency<T>(
  db: D1Database,
  idempotencyKey: string,
  walletAddress: string,
  createJob: () => Promise<T & { jobId: number }>
): Promise<{ isNew: boolean; result: T & { jobId: number } }> {
  // Check for existing job with this key
  const existing = await db.prepare(
    `SELECT * FROM mint_jobs WHERE idempotency_key = ?`
  ).bind(idempotencyKey).first();

  if (existing) {
    // Verify wallet matches (prevent key collision attacks)
    if (existing.wallet_address !== walletAddress) {
      throw new Error('Idempotency key belongs to a different wallet');
    }
    // Return the existing job state
    return { isNew: false, result: existing as T & { jobId: number } };
  }

  // No existing job — create a new one
  const result = await createJob();
  return { isNew: true, result };
}
```

Usage in the submit endpoint:

```typescript
const { isNew, result } = await processWithIdempotency(
  env.DB,
  body.idempotencyKey,
  wallet,
  async () => {
    // ... all the job creation logic ...
    return { jobId, step: 'queued', mintType, ... };
  }
);

if (!isNew) {
  // Return existing job status (not an error — this is expected on retry)
  return jsonResponse({
    jobId: result.jobId,
    step: result.step,
    resumed: true,  // tells the frontend it's resuming, not creating
  });
}
```

### Where to apply

- Create the utility in a shared file (e.g., `functions/api/mint/idempotency.ts` or add to `_shared.ts`)
- Use it in the submit endpoint as the outermost wrapper

---

## Pattern 4: IPFS Upload Verification (Download-and-Verify)

### What

After uploading image and metadata to Pinata, optionally download the content back from one IPFS gateway and verify the SHA-256 hash matches what was computed locally. If it doesn't match, log a warning (but don't fail the mint — Pinata propagation can be slow).

### Why

Your current code computes the SHA-256 hash locally from the raw bytes, then uploads to Pinata. You trust that what Pinata stored matches what you sent. But silent corruption is possible (network glitch, Pinata bug, CDN cache poisoning).

Crate's `generateImageFileHash()` and `generateMetadataFileHash()` download from IPFS gateways to hash (with multi-gateway fallback). That's their ONLY hashing method, which is fragile. But the verification concept is sound.

The best approach: hash locally (fast, reliable) as the primary, then verify by downloading (slow, optional) as a safety check.

### Implementation

Add a verification function to the IPFS upload module:

```typescript
/**
 * Verify an IPFS upload by downloading and re-hashing.
 * Returns true if verified, false if verification failed or was skipped.
 * Never throws — this is a non-blocking safety check.
 */
export async function verifyIPFSUpload(
  expectedHash: string,
  ipfsHash: string,
  contentType: 'image' | 'metadata'
): Promise<{ verified: boolean; error?: string }> {
  // Try the fastest gateway first (Pinata dedicated > Pinata public > ipfs.io)
  const gatewayUrls = [
    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    `https://ipfs.io/ipfs/${ipfsHash}`,
  ];

  for (const url of gatewayUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      const downloadedHash = await sha256Hex(new Uint8Array(buffer));

      if (downloadedHash === expectedHash) {
        return { verified: true };
      } else {
        // Hash mismatch — this is serious
        console.error(`[IPFS Verify] Hash mismatch for ${contentType}!`, {
          expected: expectedHash,
          downloaded: downloadedHash,
          gateway: url,
          ipfsHash,
        });
        return { verified: false, error: 'Hash mismatch after download' };
      }
    } catch (err) {
      // Gateway failed — try next one
      continue;
    }
  }

  // All gateways failed — can't verify, but don't block the mint
  return { verified: false, error: 'All gateways unreachable for verification' };
}
```

Call it after IPFS upload in the mint processor:

```typescript
// Upload to IPFS
const uploadResult = await uploadToIPFS(imageBase64, metadata, jwt);

// Optional: verify the upload (non-blocking)
const imageVerification = await verifyIPFSUpload(
  uploadResult.dataHash,
  uploadResult.dataUris[0]?.replace('ipfs://', ''), // extract CID
  'image'
);
if (!imageVerification.verified) {
  console.warn('[Mint] IPFS image verification failed:', imageVerification.error);
  // Log to audit but don't fail — propagation delay is normal
  await logMintStep(env.DB, {
    mint_id: 0,
    step: 'ipfs_verification_warning',
    status: 'completed', // not a failure — just a warning
    data: { type: 'image', error: imageVerification.error, ipfsHash: uploadResult.dataHash },
  });
}
```

### Where to apply

- Add `verifyIPFSUpload()` to the IPFS upload module (`uploadToIPFS.ts` or a new file)
- Call it in the mint processor after the IPFS upload step
- Log warnings to `mint_audit_log` but don't fail the mint

---

## Pattern 5: IPFS Pin Cleanup for Failed Mints

### What

Add an `unpinFromIPFS()` function and use it in the cleanup/scheduled job to remove orphaned IPFS pins from failed mints.

### Why

Every failed mint that got past the IPFS upload step leaves orphaned image and metadata pins on Pinata. Over time, this consumes Pinata storage quota and costs money. Your edge case matrix identified this as a missing safeguard.

Crate has `unpinFromPinata()` (`queue_airdrop.js` lines 30-68) that handles this cleanly.

### Implementation

Add to the IPFS module:

```typescript
/**
 * Unpin content from Pinata IPFS.
 * Used by cleanup jobs to remove orphaned pins from failed mints.
 * Returns true if unpinned, false on failure (non-throwing).
 */
export async function unpinFromIPFS(
  ipfsCid: string,
  pinataJwt: string
): Promise<boolean> {
  if (!ipfsCid || !pinataJwt) return false;

  try {
    const response = await fetch(
      `https://api.pinata.cloud/pinning/unpin/${ipfsCid}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${pinataJwt}` },
      }
    );

    if (response.ok || response.status === 404) {
      // 404 = already unpinned, which is fine
      return true;
    }

    console.error(`[IPFS Unpin] Failed for ${ipfsCid}: HTTP ${response.status}`);
    return false;
  } catch (error) {
    console.error(`[IPFS Unpin] Error for ${ipfsCid}:`, error);
    return false;
  }
}
```

In the cleanup/scheduled job, find failed jobs with IPFS data and unpin:

```typescript
// Find failed/refunded jobs that have IPFS hashes (orphaned pins)
const orphanedJobs = await env.DB.prepare(
  `SELECT id, image_hash, ipfs_image_uris, ipfs_metadata_uris
   FROM mint_jobs
   WHERE step IN ('failed', 'refunded')
   AND (ipfs_image_uris IS NOT NULL OR ipfs_metadata_uris IS NOT NULL)
   AND created_at < datetime('now', '-1 hour')
   LIMIT 10`
).all();

for (const job of (orphanedJobs.results || [])) {
  // Extract CIDs from URI arrays and unpin
  const imageUris = job.ipfs_image_uris ? JSON.parse(job.ipfs_image_uris) : [];
  const metadataUris = job.ipfs_metadata_uris ? JSON.parse(job.ipfs_metadata_uris) : [];

  for (const uri of [...imageUris, ...metadataUris]) {
    const cid = extractCidFromUri(uri);
    if (cid) {
      await unpinFromIPFS(cid, env.PINATA_JWT);
    }
  }

  // Clear the IPFS fields so we don't try to unpin again
  await env.DB.prepare(
    `UPDATE mint_jobs SET ipfs_image_uris = NULL, ipfs_metadata_uris = NULL WHERE id = ?`
  ).bind(job.id).run();
}

// Helper to extract CID from various URI formats
function extractCidFromUri(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return uri.replace('ipfs://', '');
  const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
```

### Where to apply

- Add `unpinFromIPFS()` to the IPFS upload module
- Add the cleanup logic to the scheduled cleanup job (wherever stale job expiry runs)
- Wait 1 hour before unpinning (in case the failure was transient and an admin wants to retry)

---

## Pattern 6: MintGarden Call Should Throw on Failure (Not Return Nulls)

### What

Refactor `callMintGardenMint()` (in `request.ts`) so that when all retries are exhausted, it **throws an error** instead of returning `{ offerFile: null, launcherId: null }`.

### Why

The current pattern returns nulls on failure, which means every caller must check for nulls:

```typescript
const result = await callMintGardenMint(params, env);
if (!result.launcherId) {
  // handle failure
}
```

This is error-prone — if a future developer forgets the null check, the code silently continues with a null launcher ID. Throwing on failure makes the error handling automatic: callers either catch or the error propagates up.

Crate's `callMintGardenAPI()` returns `{ success: false, error }` which is slightly better but still requires checking. The cleanest pattern for TypeScript is: return the data on success, throw on failure.

### Implementation

Change the end of `callMintGardenMint()`:

```typescript
// BEFORE (current):
console.error('[MintGarden] All retries exhausted:', lastError);
return { offerFile: null, launcherId: null };

// AFTER (new):
console.error('[MintGarden] All retries exhausted:', lastError);
throw new Error(`MintGarden API failed after ${MAX_RETRIES} retries: ${lastError}`);
```

Also update the non-JSON response handling and HTTP error handling inside the retry loop to continue retrying (as they do now) but throw after final retry instead of returning nulls.

Then in the caller (the mint processor), wrap in try/catch:

```typescript
try {
  const mintResult = await callMintGardenMint(params, env);
  // If we get here, it succeeded — mintResult.launcherId or .offerFile is guaranteed non-null
  const launcherId = mintResult.launcherId!;
} catch (error) {
  // MintGarden failed after all retries
  // Handle failure (refund credits, mark job failed, etc.)
}
```

### Where to apply

- `functions/api/mint/request.ts` — change the return-null pattern to throw
- Every caller of `callMintGardenMint()` — ensure they have try/catch (the queue processor should already have this)

---

## Pattern 7: Configurable IPFS Gateway List

### What

Extract the hardcoded IPFS gateway URLs into a configurable constant or helper function, so gateways can be added/removed without modifying upload logic.

### Why

The current `uploadToIPFS.ts` hardcodes three gateway URLs:
```typescript
const dataUris = [
  `ipfs://${ipfsHash}`,
  `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
  `https://ipfs.io/ipfs/${ipfsHash}`,
];
```

If a gateway goes down or you get a dedicated Pinata gateway (you already have `PINATA_GATEWAY` in `wrangler.toml`), you'd need to edit the upload function. Crate's `ipfsService.js` has a `generateIPFSUrls(ipfsHash)` function that builds URLs dynamically from configuration — cleaner.

### Implementation

```typescript
/**
 * Generate IPFS gateway URLs for a given CID.
 * Always includes ipfs:// as the first URI (canonical).
 * Uses dedicated Pinata gateway if configured, plus public fallbacks.
 */
export function generateIPFSUris(ipfsCid: string, pinataGateway?: string): string[] {
  const uris: string[] = [`ipfs://${ipfsCid}`];

  // Dedicated Pinata gateway (fastest, most reliable)
  if (pinataGateway) {
    const gateway = pinataGateway.endsWith('/')
      ? pinataGateway
      : `${pinataGateway}/`;
    uris.push(`https://${gateway}ipfs/${ipfsCid}`);
  }

  // Public gateways as fallback
  uris.push(`https://gateway.pinata.cloud/ipfs/${ipfsCid}`);
  uris.push(`https://ipfs.io/ipfs/${ipfsCid}`);

  return uris;
}
```

Then in the upload function, replace the hardcoded arrays:

```typescript
const dataUris = generateIPFSUris(ipfsHash, env.PINATA_GATEWAY);
const metadataUris = generateIPFSUris(metaIpfsHash, env.PINATA_GATEWAY);
```

This means `PINATA_GATEWAY` from `wrangler.toml` (currently `gold-important-gibbon-467.mypinata.cloud`) gets used automatically as the first gateway after `ipfs://`.

### Where to apply

- Add `generateIPFSUris()` to the IPFS upload module or `_shared.ts`
- Replace hardcoded URI arrays in the upload function
- Pass `env.PINATA_GATEWAY` from the caller (the mint processor has access to env)

---

## Pattern 8: CHIP-0007 Metadata Enhancement

### What

Add collection-level social links and richer metadata to the CHIP-0007 JSON that gets uploaded to IPFS with each NFT.

### Why

The current metadata includes `collection.name` and `collection.id` but not social links. Marketplaces like MintGarden and Dexie display collection metadata — having twitter, website, and discord links embedded in the NFT metadata makes collections look more professional and discoverable.

Crate's `metadataService.js` includes twitter, website, discord, icon, and banner in the `collection.attributes` array (lines 173-223). This follows the CHIP-0007 spec which allows arbitrary collection attributes.

### Implementation

In wherever the CHIP-0007 metadata object is built:

```typescript
const metadata = {
  format: 'CHIP-0007',
  name: `Your Wojak #${mintNumber}`,
  description: '...existing description...',
  sensitive_content: false,
  collection: {
    name: 'Your Wojak',
    id: collectionUuid,
    attributes: [
      {
        type: 'description',
        value: 'Your Wojak puts collectors in control. Choose every layer, every color, every detail.',
      },
      {
        type: 'website',
        value: 'https://wojak.ink',
      },
      {
        type: 'twitter',
        value: 'https://x.com/WojakInk',
      },
      // Add discord, icon, banner if available
    ],
  },
  attributes,
  edition_number: mintNumber,
  edition_total: SUPPLY_TOTAL,
  // ... rest of existing fields
};
```

**Important:** Verify the actual twitter/website/discord URLs before hardcoding. These become immutable once the NFT is minted. If you're not sure of the exact URLs, leave them out for now and add them once confirmed.

### Where to apply

- Wherever the `metadata` object is constructed before IPFS upload (currently in `prepare.ts`, will be in the mint processor after Task 4)
- These are constants — define them in `_shared.ts` or at the top of the processor

---

## Pattern 9: Structured Error Types for Mint Failures

### What

Create a `MintError` class with an error code that the frontend can use to show appropriate messages. The processor should throw `MintError` instances with specific codes, and the job polling endpoint should map codes to user-friendly messages.

### Why

Currently, error messages from different failure points are raw strings that get passed to the frontend. The frontend has to pattern-match on strings to decide what to show the user. With structured error codes, the frontend can have a clean switch statement.

### Implementation

Create a typed error class:

```typescript
/**
 * Structured error for mint pipeline failures.
 * The code is machine-readable; the message is human-readable.
 */
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
  | 'SOLD_OUT'               // Supply exhausted
  | 'INSUFFICIENT_CREDITS'   // Not enough credits for free mint
  | 'WALLET_LOCKED'          // Another mint is in progress for this wallet
  | 'INVALID_TRAITS'         // Layer paths failed validation
  | 'IPFS_UPLOAD_FAILED'     // Pinata upload error
  | 'MINTGARDEN_FAILED'      // MintGarden API error (after retries)
  | 'OFFER_CREATION_FAILED'  // Paid mint: MintGarden didn't return offer
  | 'OFFER_EXPIRED'          // Paid mint: offer timed out
  | 'PAYMENT_NOT_VERIFIED'   // Paid mint: on-chain verification failed
  | 'FINALIZE_FAILED'        // DB write failed during finalization
  | 'IMAGE_EXPIRED'          // KV image data expired before processing
  | 'TIMEOUT'                // Job processing timed out
  | 'INTERNAL_ERROR';        // Unexpected error

/**
 * Map error codes to user-friendly messages for the frontend.
 * The job polling endpoint uses this to populate stepLabel on error.
 */
export const MINT_ERROR_MESSAGES: Record<MintErrorCode, string> = {
  SOLD_OUT: 'All 4,200 Wojaks have been minted!',
  INSUFFICIENT_CREDITS: 'Not enough credits for this mint.',
  WALLET_LOCKED: 'You already have a mint in progress. Please wait for it to complete.',
  INVALID_TRAITS: 'Some trait selections are invalid. Please try different traits.',
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

Usage in the processor:

```typescript
// Instead of: throw new Error('MintGarden did not return a launcher ID.');
throw new MintError('MINTGARDEN_FAILED', 'MintGarden did not return a launcher ID after 3 retries');
```

In the job polling endpoint:

```typescript
if (job.step === 'failed' || job.step === 'refunded') {
  const errorCode = job.error_code as MintErrorCode | undefined;
  return jsonResponse({
    jobId: job.id,
    step: job.step,
    error: errorCode
      ? MINT_ERROR_MESSAGES[errorCode]
      : (job.error_message || 'Something went wrong.'),
    errorCode,
    creditsRefunded: job.step === 'refunded',
  });
}
```

### Where to apply

- Create `MintError` class and constants in a shared file
- Use `MintError` throughout the processor instead of plain `Error`
- Use `MINT_ERROR_MESSAGES` in the job polling endpoint
- The frontend's MintFlowModal error step should use the `error` string directly (no more pattern matching)

---

## Pattern 10: Frontend — Idempotency Key Generation

### What

When the user clicks "Mint," generate a `crypto.randomUUID()` and store it in React state. If the user clicks again (or the request fails and they retry), send the same UUID. The server returns the existing job instead of creating a duplicate.

### Why

Without this, double-clicks, network retries, or page refreshes during submission create duplicate jobs. The server's UNIQUE constraint on `idempotency_key` prevents the DB from having two rows, but the user gets an error ("wallet locked") instead of a clean resume.

### Implementation

In the mint context or wherever the mint submission is triggered:

```typescript
// Generate once per mint attempt
const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

function startNewMint() {
  const key = crypto.randomUUID();
  setIdempotencyKey(key);
  submitMint(key);
}

async function submitMint(key: string) {
  const res = await fetch('/api/mint/submit', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress,
      selectedLayers,
      selectedColors,
      imageBase64,
      mintType,
      idempotencyKey: key,
    }),
  });
  const data = await res.json();

  if (data.resumed) {
    // Server found existing job — resume polling
    console.log('Resuming existing mint job:', data.jobId);
  }

  // Start polling regardless of new vs resumed
  startPolling(data.jobId);
}

// On retry (error state → user clicks "Try Again")
function retryMint() {
  if (idempotencyKey) {
    // Use the SAME key — server returns existing job if it exists
    submitMint(idempotencyKey);
  } else {
    startNewMint();
  }
}

// Only generate a NEW key when starting a truly new mint
function mintAnother() {
  setIdempotencyKey(null);
  startNewMint();
}
```

**Key rule:** Same intent = same idempotency key. New intent = new key.

### Where to apply

- MintContext (or wherever mint state is managed)
- The "Mint" button click handler
- The "Try Again" button in the error state
- The "Mint Another" button in the success state (generates NEW key)

---

## Pattern 11: Frontend — Page Reload Recovery

### What

When the Generator page loads and a wallet is connected, check for any active mint job for that wallet. If found, resume the UI from wherever the job is.

### Why

Users close tabs, refresh pages, switch apps on mobile. Without recovery, they lose track of their in-progress mint. With the queue architecture, the job continues processing on the server regardless — we just need to reconnect the UI.

### Implementation

```typescript
// On Generator page mount (or when wallet address becomes available)
useEffect(() => {
  if (!walletAddress) return;

  async function checkActiveJob() {
    try {
      const res = await fetch(
        `/api/mint/active-job?wallet=${walletAddress}`
      );
      const data = await res.json();

      if (data.job && data.job.step !== 'completed' && data.job.step !== 'failed' && data.job.step !== 'refunded') {
        // Active job found — resume UI
        setCurrentJob(data.job);
        setIdempotencyKey(data.job.idempotency_key);

        if (data.job.step === 'awaiting_payment') {
          setMintStep('awaiting_payment');
        } else {
          setMintStep('submitted');
        }

        startPolling(data.job.jobId);
      }
    } catch (err) {
      // Silent failure — don't block the page from loading
      console.warn('Failed to check for active mint job:', err);
    }
  }

  checkActiveJob();
}, [walletAddress]);
```

Also add a `visibilitychange` listener to re-check when the user returns to the tab:

```typescript
useEffect(() => {
  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && currentJob?.jobId) {
      // Immediately poll when tab becomes visible again
      pollJobStatus(currentJob.jobId);
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => document.removeEventListener('visibilitychange', onVisibilityChange);
}, [currentJob?.jobId]);
```

### Where to apply

- The Generator page component (or MintContext provider)
- The visibility listener should be in the same context as the polling logic

---

## Execution Order

These patterns are independent — they can be implemented in any order. However, the recommended order based on impact:

1. **Pattern 6** (MintGarden throws on failure) — smallest change, improves all error handling downstream
2. **Pattern 9** (structured error types) — needed by the job polling endpoint and frontend
3. **Pattern 3** (idempotency wrapper) — needed by the submit endpoint
4. **Pattern 10** (frontend idempotency key) — pairs with Pattern 3
5. **Pattern 11** (page reload recovery) — pairs with the polling endpoint
6. **Pattern 1** (post-mint supply check) — safety net for supply cap
7. **Pattern 2** (auto refund flagging) — safety net for paid mint failures
8. **Pattern 7** (configurable IPFS gateways) — uses existing `PINATA_GATEWAY` env var
9. **Pattern 5** (IPFS pin cleanup) — scheduled job, do after the core flow works
10. **Pattern 4** (IPFS verification) — optional safety check, lowest priority
11. **Pattern 8** (CHIP-0007 enhancement) — cosmetic, do last after verifying social URLs

---

## Files That Will Be Created or Modified

### New files:
- Mint error types (MintError class + error codes + user messages)
- Idempotency wrapper utility
- IPFS unpin function (can go in existing upload module)
- IPFS verification function (can go in existing upload module)

### Modified files:
- MintGarden request module — throw on failure instead of return null
- IPFS upload module — add `generateIPFSUris()`, `unpinFromIPFS()`, `verifyIPFSUpload()`
- Mint processor (from Task 4) — add post-mint supply check, auto refund flagging, structured errors
- Job polling endpoint (from Task 4) — use `MINT_ERROR_MESSAGES` mapping
- Cleanup scheduled job (from Task 4) — add IPFS pin cleanup
- Metadata builder — add collection social links
- Frontend MintContext — add idempotency key, page reload recovery, visibility listener
- Frontend MintFlowModal — use server-driven error messages (no pattern matching)

### Infrastructure:
- `wrangler.toml` — already has `MINT_JOBS_KV` and `PINATA_GATEWAY` (no changes needed)
- `server_state` table — verify it exists (migration 008) or create it

---

## What NOT to Do

- **Don't copy Crate's Parse Server / MongoDB patterns.** Our D1/SQLite stack is better for this workload.
- **Don't copy Crate's image-download-from-URL approach.** Our client-sends-base64 is faster and more reliable.
- **Don't add excessive console logging.** Use the `mint_audit_log` table for structured logging instead.
- **Don't make IPFS verification a hard requirement.** Gateway propagation is slow — verification failure should warn, not block.
- **Don't hardcode social URLs in CHIP-0007 metadata until they're confirmed.** Wrong URLs are immutable on-chain.
