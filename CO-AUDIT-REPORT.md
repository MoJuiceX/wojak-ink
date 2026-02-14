# Co-Audit Report: Mint Pipeline — End-to-End Flow Tracing

**Auditor:** Claude (co-audit agent)
**Date:** 2026-02-13
**Scope:** All 16 files listed in SECURITY-AUDIT-REQUEST.md
**Mode:** Read-only analysis — no patches, findings only

---

## Task 1: Trace the Free Mint Flow

### Step-by-step trace

**1. User clicks "Free Mint" in ActionBar.tsx**

The mint type toggle in ActionBar determines `mintType`. When the user clicks the Mint button, `handleMintClick` fires:

```ts
// ActionBar.tsx lines 149-178
const handleMintClick = useCallback(async () => {
    if (!isWalletConnected) {
      connect();
      return;
    }
    if (!canExport) return;

    try {
      const webpBlob = await exportImage(selectedLayers, {
        format: 'webp',
        quality: 0.92,
        includeBackground: true,
        size: { preset: '1024' },
      }, g2Selections);

      const effectiveMintType = hasFreeMintsAvailable ? mintType : 'paid';
      // ...
      setIsMintModalOpen(true);
      await startMint(webpBlob, layersForApi, colorsForApi, effectiveMintType);
    } catch (err) {
      console.error('[ActionBar] Failed to prepare mint:', err);
    }
  }, [...]);
```

The image is rendered to a WebP blob client-side, then `startMint` is called from MintContext.

**2. MintContext.tsx `startMint`**

```ts
// MintContext.tsx lines 192-257
const startMint = useCallback(
    async (
      imageBlob: Blob,
      selectedLayers: Record<string, string>,
      selectedColors: Record<string, string>,
      mintType: 'free' | 'paid'
    ) => {
      if (!address || !address.startsWith('xch1')) {
        setMintStep('error');
        setErrorMessage('Wallet not connected');
        return;
      }
      setMintStep('submitting');
      // ...
      const imageBase64 = await blobToBase64(imageBlob);
      const res = await fetch('/api/mint/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          selectedLayers,
          selectedColors,
          imageBase64,
          mintType,
        }),
      });
```

Sets step to `submitting`, converts blob to base64, POSTs to `/api/mint/prepare`.

**3. prepare.ts — Free mint path**

After validation (wallet, layers, colors, rate limit), the free path proceeds:

a) Expires stale pending mints:
```ts
// prepare.ts lines 129-131
await env.DB.prepare(
  `UPDATE phase2_mints SET status = 'expired'
   WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
).run();
```

b) Checks for existing pending mint for this wallet (lines 135-149).

c) Supply check — counts minted only (lines 153-159).

d) Credit pre-check (non-atomic, just an early exit):
```ts
// prepare.ts lines 163-175
if (mintType === 'free') {
  const balanceRow = await env.DB.prepare(
    `SELECT
      (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
      (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?) AS balance`
  )
    .bind(wallet, wallet)
    .first<{ balance: number }>();
  const balance = balanceRow?.balance ?? 0;
  if (balance < FREE_MINT_CREDITS) {
    return jsonResponse({ error: 'Insufficient credits', balance: balance / 100 }, 400);
  }
}
```

e) Reserves mint number atomically (line 182).

f) Builds metadata with real mint number (lines 185-204).

g) Uploads to IPFS via self-fetch to `/api/mint/upload` (lines 208-231).

h) Calls MintGarden API via `callMintGardenMint` (lines 236-249).

i) If MintGarden succeeds, inserts mint record with `status = 'minted'` (lines 260-275).

j) Atomic credit deduction via INSERT...SELECT (lines 281-289).

k) If deduction fails (race condition), marks mint as `'failed'` (lines 292-298).

l) Increments trait_usage (lines 310-322).

**4. Back in MintContext:** `data.success` is true, sets `successResult` and step to `'success'`.

---

### [MEDIUM] — Free mint: MintGarden succeeds but credit deduction fails → NFT minted, credits not actually spent, mint marked 'failed'

**File(s):** `functions/api/mint/prepare.ts`

**Code:**
```ts
// prepare.ts lines 236-298
const mintResult = await callMintGardenMint(
  {
    walletAddress: wallet,
    mintType: 'free',
    // ...
  },
  env
);
const launcherId = mintResult.launcherId ?? null;

if (!launcherId) {
  return jsonResponse({
    error: 'MintGarden API failed to create NFT...',
  }, 500);
}

// Insert mint record
const insert = await env.DB.prepare(
  `INSERT INTO phase2_mints (
    // ... status = 'minted' ...
  )`
).run();

const mintId = insert.meta?.last_row_id ?? 0;

// Atomic credit deduction
const deduct = await env.DB.prepare(
  `INSERT INTO credit_spends (wallet_address, mint_id, credits_spent)
   SELECT ?, ?, ?
   WHERE (
     (SELECT COALESCE(SUM(credits_earned), 0) FROM credit_events WHERE wallet_address = ?) -
     (SELECT COALESCE(SUM(credits_spent), 0) FROM credit_spends WHERE wallet_address = ?)
   ) >= ?`
).bind(wallet, mintId, FREE_MINT_CREDITS, wallet, wallet, FREE_MINT_CREDITS).run();

if (!deduct.meta?.changes) {
  await env.DB.prepare(
    `UPDATE phase2_mints SET status = 'failed' WHERE id = ?`
  ).bind(mintId).run();
  return jsonResponse({ error: 'Insufficient credits (concurrent request)', balance: 0 }, 409);
}
```

**Issue:** The flow is: MintGarden API call → DB insert (status='minted') → credit deduction. If the atomic credit deduction at step (j) fails due to a race condition, the mint record is set to `'failed'`... but the NFT was **already minted on MintGarden** and sent to the user's wallet in step (h). The user receives a real NFT but the system thinks the mint failed. The NFT is "free" in a way that wasn't intended — the user keeps the NFT, keeps their credits, and the mint_number is consumed.

**Impact:** A user who rapidly fires two free mints can receive two NFTs but only pay credits for one. The second mint's record is marked `'failed'` but the MintGarden mint is irrevocable. This also consumes a mint_number that's marked as failed, creating a gap in the sequence.

**Question for primary engineer:** Is there a `refund_needed` flag being set in this case? The code sets status to `'failed'` but doesn't call `markRefundNeeded`. Since the NFT was already minted for free (no payment involved), the "cost" is the credits — but credits weren't deducted. Should there be a reconciliation mechanism, or is this an acceptable risk given the credit pre-check?

---

### [LOW] — Mint number consumed on any failure after `getNextMintNumber`

**File(s):** `functions/api/mint/prepare.ts`, `functions/api/mint/mintNumberHelper.ts`

**Code:**
```ts
// prepare.ts line 182
const mintNumber = await getNextMintNumber(env.DB);

// mintNumberHelper.ts lines 20-27
const result = await db
  .prepare(
    `UPDATE mint_counter
     SET next_number = next_number + 1
     WHERE id = 1
     RETURNING next_number - 1 AS mint_number`
  )
  .first<{ mint_number: number }>();
```

**Issue:** `getNextMintNumber` atomically increments the counter. If anything after this fails — IPFS upload, MintGarden call, DB insert, or credit deduction — the mint number is permanently consumed. Over time, failed mints create gaps in the mint number sequence (e.g., #1, #2, #4, #5 if #3 failed).

**Impact:** Cosmetic / collector concern. The `edition_number` in IPFS metadata won't be contiguous. Not a security issue, but worth being aware of. The alternative (reserving numbers later) was deliberately rejected for the IPFS-metadata-consistency reason noted in the code comments.

**Question for primary engineer:** Is the gap in mint numbers acceptable, or should failed/expired mints have their numbers tracked for a "gaps" report?

---

### [LOW] — Orphaned IPFS pin on MintGarden failure

**File(s):** `functions/api/mint/prepare.ts`, `functions/api/mint/upload.ts`

**Code:**
```ts
// prepare.ts lines 208-231 (IPFS upload)
const uploadRes = await fetch(uploadUrl, {
  method: 'POST',
  headers: uploadHeaders,
  body: JSON.stringify({ imageBase64, metadata }),
});
// ...
const uploadData = (await uploadRes.json()) as {
  dataHash: string;
  dataUris: string[];
  metadataHash: string;
  metadataUris: string[];
};

// prepare.ts lines 236-257 (MintGarden call — may fail)
const mintResult = await callMintGardenMint(/* ... */);
const launcherId = mintResult.launcherId ?? null;

if (!launcherId) {
  return jsonResponse({
    error: 'MintGarden API failed to create NFT...',
  }, 500);
}
```

**Issue:** If the IPFS upload succeeds (both image and metadata pinned to Pinata) but the MintGarden API call then fails after all 3 retries, the function returns a 500 error. The two IPFS pins remain on Pinata indefinitely. There is no cleanup / unpin step.

**Impact:** Over time, failed mints accumulate orphaned IPFS pins on the Pinata account. This costs storage (Pinata has pin limits on free/paid plans) but is not a security issue.

**Question for primary engineer:** Is there a periodic Pinata cleanup process, or is the pin count low enough that this doesn't matter?

---

### [INFO] — Credit balance correctly reflects deduction on next request

After a successful free mint, the credit_spends row is inserted atomically. The next call to `prepare.ts` re-computes the balance from `credit_events` minus `credit_spends`, so the deduction is immediately visible. **Verified — no issue.**

---

### [MEDIUM] — No frontend lock prevents double-clicking "Free Mint"

**File(s):** `src/components/generator/ActionBar.tsx`, `src/contexts/MintContext.tsx`

**Code:**
```ts
// ActionBar.tsx lines 149-154
const handleMintClick = useCallback(async () => {
    if (!isWalletConnected) {
      connect();
      return;
    }
    if (!canExport) return;
    // No check for mintStep !== 'idle' or any "in-progress" guard
```

```ts
// MintContext.tsx lines 204-206
setMintStep('submitting');
setPendingMint(null);
setSuccessResult(null);
```

**Issue:** `handleMintClick` does not check whether a mint is already in progress (`mintStep !== 'idle'`). If a user double-clicks fast enough, `startMint` can be called twice before the first call sets `mintStep` to `'submitting'` (React state updates are batched). Both calls will hit `/api/mint/prepare`.

The backend has two guards: (1) rate limiting (5/min — won't catch a double-click), and (2) the "existing pending mint" check — but this only catches *paid* pending mints. For free mints, `prepare.ts` inserts with `status = 'minted'` immediately, so the second request won't find a `pending` record and will proceed independently.

**Impact:** Two free mints could both succeed, consuming 200 credits (or one succeeds and one hits the credit race condition described above, getting a free NFT). The atomic credit deduction prevents double-spending *credits*, but the MintGarden call happens *before* the credit deduction, so two NFTs could be minted.

**Question for primary engineer:** Should `startMint` in MintContext check `mintStep` and bail early if not `'idle'`? Or should `handleMintClick` disable itself?

---

## Task 2: Trace the Paid Mint Flow

### Step-by-step trace

**1. prepare.ts — Paid path**

After shared validation, supply check, and mint number reservation:

a) Fetches trait_usage to calculate surcharge (lines 336-356).

b) Computes total price = BASE_PRICE_XCH + max surcharge (line 357).

c) Calls MintGarden with `requested_mojos` to get an offer file (lines 362-376).

d) If offer file is null, returns 500 (lines 379-384).

e) Inserts mint record with `status = 'pending'` and `expires_at` (lines 387-403).

f) Returns `{ pending: true, mintId, offerFile, expiresAt, totalPriceXch }` to frontend.

**2. MintContext.tsx**

`startMint` receives `data.pending && data.mintId`, sets `pendingMint` state, sets step to `'signing'`.

**3. MintFlowModal.tsx**

Shows countdown timer. User sees "Accept in Wallet" button.

```ts
// MintFlowModal.tsx lines 61-75
useEffect(() => {
    if (!pendingMint?.expiresAt) {
      setTimeLeft('');
      setIsExpired(false);
      return;
    }
    const tick = () => {
      const secs = getSecondsLeft(pendingMint.expiresAt);
      setTimeLeft(formatTimeLeft(pendingMint.expiresAt));
      setIsExpired(secs <= 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingMint?.expiresAt]);
```

**4. User clicks "Accept in Wallet" → MintContext `acceptOfferInWallet`**

```ts
// MintContext.tsx lines 260-299
const acceptOfferInWallet = useCallback(async () => {
    if (!pendingMint?.offerFile || !address) return;
    setMintStep('accepting');
    try {
      await takeOffer(pendingMint.offerFile, 0);
      // Offer accepted — confirm
      const res = await fetch('/api/mint/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintId: pendingMint.mintId,
          walletAddress: address,
        }),
      });
```

**5. confirm.ts**

```ts
// confirm.ts lines 76-81
const row = await env.DB.prepare(
  `SELECT id, mint_number, wallet_address, mint_type, layers_json, mintgarden_launcher_id
   FROM phase2_mints WHERE id = ? AND status = 'pending'`
)
  .bind(mintId)
  .first<PendingRow>();
```

Checks wallet ownership (line 88), gets `launcherId` from body or existing record (line 92), increments trait_usage (lines 106-118), updates status to `'minted'` (lines 121-128).

---

### [HIGH] — No expiry check in confirm.ts — user can confirm after 15-minute window

**File(s):** `functions/api/mint/confirm.ts`

**Code:**
```ts
// confirm.ts lines 76-81
const row = await env.DB.prepare(
  `SELECT id, mint_number, wallet_address, mint_type, layers_json, mintgarden_launcher_id
   FROM phase2_mints WHERE id = ? AND status = 'pending'`
)
  .bind(mintId)
  .first<PendingRow>();

if (!row) {
  return errorResponse('Pending mint not found or already confirmed', 404);
}

// Verify caller owns this mint
if (callerWallet !== row.wallet_address) {
  return errorResponse('Wallet address does not match this mint', 403);
}
```

**Issue:** The query selects any row with `status = 'pending'`. There is **no check** on `expires_at`. The expiry mechanism relies on two things: (1) `prepare.ts` and `status.ts` run `UPDATE phase2_mints SET status = 'expired' WHERE status = 'pending' AND expires_at < datetime('now')` before their queries, and (2) the frontend shows "expired" and hides the accept button.

But `confirm.ts` does **not** run this expiry sweep. If a user:
- Gets a paid offer at T=0
- The 15-minute window passes (T=15)
- No other user calls `prepare` or `status` for that wallet (so the expiry sweep never runs)
- User calls `confirm` directly at T=30

...the mint is still `'pending'` and confirm will succeed. The only protection is whether the MintGarden offer itself has expired on-chain (which is outside this system's control).

**Impact:** A user could accept an expired offer if the on-chain offer is still valid. This could be used to hold a mint_number hostage indefinitely — as long as nobody triggers the expiry sweep for that record, the pending mint persists. More practically: if MintGarden offers expire independently, this is a non-issue on-chain but a data integrity issue in the DB (the mint would be "confirmed" past its stated expiry).

**Question for primary engineer:** Should `confirm.ts` add its own expiry check? Something like `AND (expires_at IS NULL OR expires_at > datetime('now'))` in the SELECT, or run the expiry sweep before the query?

---

### [MEDIUM] — Double-confirmation: `confirm` can be called twice for the same mintId

**File(s):** `functions/api/mint/confirm.ts`

**Code:**
```ts
// confirm.ts line 77
`SELECT ... FROM phase2_mints WHERE id = ? AND status = 'pending'`

// confirm.ts lines 106-118 — trait_usage increment
for (const [category, path] of Object.entries(layers)) {
  if (!path) continue;
  const traitName = path.split('/').pop()?.replace(/\.(png|webp)$/i, '') || path;
  await env.DB.prepare(
    `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(trait_category, trait_name) DO UPDATE SET
       usage_count = usage_count + 1,
       updated_at = datetime('now')`
  ).bind(category, traitName).run();
}

// confirm.ts lines 121-128 — status update
await env.DB.prepare(
  `UPDATE phase2_mints
   SET status = 'minted', minted_at = datetime('now'),
       mintgarden_launcher_id = ?, payment_verified = 1
   WHERE id = ?`
).bind(launcherId, mintId).run();
```

**Issue:** The SELECT and UPDATE are not atomic. Two concurrent `confirm` calls for the same mintId could both read `status = 'pending'`, both increment trait_usage, and both update to `'minted'`. The UPDATE itself is idempotent (setting `'minted'` twice is harmless), but `trait_usage` would be double-incremented.

In practice, D1 is single-writer, so true concurrency is unlikely but not impossible with Worker retries or user double-clicks. The frontend's `acceptOfferInWallet` doesn't prevent rapid re-calls.

**Impact:** `trait_usage` counts could be inflated, causing higher surcharges for traits that were only minted once. Pricing integrity issue.

**Question for primary engineer:** Should the UPDATE use `WHERE id = ? AND status = 'pending'` and check `changes > 0` before incrementing traits? That would make the state transition atomic.

---

### [LOW] — Offer file sent to client is unprotected

**File(s):** `functions/api/mint/prepare.ts`, `src/contexts/MintContext.tsx`

**Code:**
```ts
// prepare.ts lines 415-422
return jsonResponse({
  pending: true,
  mintId: Number(mintId),
  offerFile,
  expiresAt,
  totalPriceXch: Math.round(totalPriceXch * 1000) / 1000,
  message,
});
```

**Issue:** The offer file (a Chia offer blob) is returned as a string in the JSON response. A malicious client could intercept and modify it before passing to their wallet. However, Chia offers are cryptographically signed by the maker (MintGarden). Modifying the offer would invalidate the signature, and the wallet would reject it.

**Impact:** No practical security impact. Chia's offer format is tamper-evident. The worst a client can do is refuse to accept it.

---

### [MEDIUM] — If trait_usage update fails partway through the loop in confirm.ts, partial state results

**File(s):** `functions/api/mint/confirm.ts`

**Code:**
```ts
// confirm.ts lines 106-118
const layers = JSON.parse(row.layers_json || '{}') as Record<string, string>;
for (const [category, path] of Object.entries(layers)) {
  if (!path) continue;
  const traitName = path.split('/').pop()?.replace(/\.(png|webp)$/i, '') || path;
  await env.DB.prepare(
    `INSERT INTO trait_usage ...`
  ).bind(category, traitName).run();
}

// Update status to minted
await env.DB.prepare(
  `UPDATE phase2_mints
   SET status = 'minted', minted_at = datetime('now'),
       mintgarden_launcher_id = ?, payment_verified = 1
   WHERE id = ?`
).bind(launcherId, mintId).run();
```

**Issue:** The trait_usage loop runs individual queries for each layer. If the loop fails after updating 3 of 7 traits (e.g., D1 connection drops), the catch block at line 143 logs the error and returns 500. But some trait_usage rows have already been incremented, and the mint status is still `'pending'`. If the user retries `confirm`, all traits get incremented again — including the 3 that already were. Those 3 traits end up double-counted.

**Impact:** Trait surcharge pricing could be inflated for specific traits. The magnitude is small (one extra count per failed partial loop), but it's a correctness issue.

**Question for primary engineer:** Should the trait_usage updates and status change be in a D1 batch (transaction)? D1 supports `db.batch()` for atomic multi-statement execution.

---

### [INFO] — Browser close after prepare but before confirm

If the user closes the browser after receiving the offer but before calling `confirm`:
- The mint record sits as `'pending'` with `expires_at` set.
- The next time `prepare.ts` or `status.ts` runs for *any* wallet, the expiry sweep catches it.
- After 15 minutes, it transitions to `'expired'`.
- The mint_number is consumed (gap), and the IPFS pins remain.
- If the user accepted the offer on-chain before closing, they have the NFT but the DB still shows `'pending'` → eventually `'expired'`. The NFT exists but isn't tracked as `'minted'`.

**Question for primary engineer:** Is there a reconciliation process that checks MintGarden for completed mints and updates DB records? Without one, a user who accepts the on-chain offer and closes the browser has an NFT with no `'minted'` record.

---

## Task 3: Trace the Resume Flow

### Step-by-step trace

**1. status.ts**

```ts
// status.ts lines 69-77 — expiry sweep
await env.DB.prepare(
  `UPDATE phase2_mints
   SET status = 'expired'
   WHERE status = 'pending'
   AND expires_at IS NOT NULL
   AND expires_at < datetime('now')`
).run();

// status.ts lines 80-91 — fetch latest pending
const pending = await env.DB.prepare(
  `SELECT id, offer_file, mint_type, total_price_xch, expires_at, created_at,
          layers_json, colors_json
   FROM phase2_mints
   WHERE wallet_address = ?
   AND status = 'pending'
   ORDER BY created_at DESC
   LIMIT 1`
).bind(wallet).first<PendingMintRow>();
```

**2. MintContext.tsx `checkPendingMint` (useEffect)**

```ts
// MintContext.tsx lines 132-151
useEffect(() => {
    if (walletStatus !== 'connected' || !address || !address.startsWith('xch1')) return;
    let cancelled = false;
    fetch(`/api/mint/status?wallet=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.pending) return;
        setPendingMint({
          mintId: data.pending.mintId,
          offerFile: data.pending.offerFile ?? null,
          expiresAt: data.pending.expiresAt ?? null,
          totalPriceXch: data.pending.totalPriceXch ?? null,
        });
        setMintStep('signing');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [walletStatus, address]);
```

**3. MintFlowModal.tsx — countdown resumes**

The `useEffect` at lines 61-75 recomputes time from `pendingMint.expiresAt`. Since `expiresAt` is an absolute ISO timestamp (not relative), the countdown resumes correctly after reload.

---

### [MEDIUM] — status.ts returns expired-but-not-yet-swept mints in a narrow race window

**File(s):** `functions/api/mint/status.ts`

**Code:**
```ts
// status.ts lines 69-91
// First sweep, then query
await env.DB.prepare(
  `UPDATE phase2_mints SET status = 'expired'
   WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
).run();

const pending = await env.DB.prepare(
  `SELECT ... FROM phase2_mints
   WHERE wallet_address = ? AND status = 'pending'
   ORDER BY created_at DESC LIMIT 1`
).bind(wallet).first<PendingMintRow>();
```

**Issue:** This is actually well-handled — the sweep runs *before* the query, so expired mints are cleared first. The frontend also handles expiry independently via the countdown timer (`isExpired` flag in MintFlowModal). **No issue found — flow verified.**

However, one edge case: `status.ts` doesn't filter by `expires_at > datetime('now')` in the SELECT. It relies entirely on the sweep. If D1 has any lag between the UPDATE and the subsequent SELECT (unlikely in single-connection SQLite, but possible in D1's distributed architecture), a just-expired record could slip through the sweep but still be returned.

**Impact:** Minimal — the frontend will immediately show "Offer expired" via its own timer.

---

### [LOW] — Multiple pending mints for the same wallet

**File(s):** `functions/api/mint/status.ts`, `functions/api/mint/prepare.ts`

**Code:**
```ts
// status.ts lines 86-88
ORDER BY created_at DESC
LIMIT 1
```

```ts
// prepare.ts lines 135-149
const existingPending = await env.DB.prepare(
  `SELECT id, offer_file, expires_at, created_at FROM phase2_mints
   WHERE wallet_address = ? AND status = 'pending' AND (expires_at IS NULL OR expires_at > datetime('now'))`
).bind(wallet).first<...>();

if (existingPending) {
  return jsonResponse({
    pending: true,
    mintId: existingPending.id,
    // ...
  });
}
```

**Issue:** `prepare.ts` checks for an existing pending mint and returns it instead of creating a new one. But `status.ts` uses `LIMIT 1` with `ORDER BY created_at DESC`. If multiple pending mints somehow exist (e.g., from a historical bug or direct DB manipulation), `status.ts` returns only the newest one. The older ones would sit as `'pending'` until they expire. This is safe — the system handles it gracefully.

`prepare.ts` also uses `.first<>()` which returns only one row. If there are two pending mints, it returns the first one the DB finds (not necessarily the newest — no ORDER BY). This could return a different pending mint than `status.ts` would.

**Impact:** Minor inconsistency. `prepare.ts` might return an older pending mint while `status.ts` returns the newer one. In practice, the pending mint check in `prepare.ts` prevents creating a *third*, so this only matters if the data is already inconsistent.

---

## Task 4: State Machine Verification

### States: `pending`, `minted`, `expired`, `failed`

```
           ┌──────────┐
           │ pending   │
           └──────┬────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
        ▼         ▼          ▼
   ┌─────────┐ ┌────────┐ ┌────────┐
   │ minted  │ │expired │ │ failed │
   └─────────┘ └────────┘ └────────┘
```

### Transition: `pending` → `minted`

**Trigger:** `confirm.ts` called with valid mintId and walletAddress.

**Code:**
```ts
// confirm.ts lines 121-128
await env.DB.prepare(
  `UPDATE phase2_mints
   SET status = 'minted', minted_at = datetime('now'),
       mintgarden_launcher_id = ?, payment_verified = 1
   WHERE id = ?`
).bind(launcherId, mintId).run();
```

**Idempotent?** The UPDATE uses `WHERE id = ?` without `AND status = 'pending'`. If called twice, the second call would not find a `pending` row in the SELECT at line 77 (since it was already set to `minted`), so it returns 404. **Effectively idempotent due to the earlier SELECT check, but see the race condition noted in Task 2.**

### Transition: `pending` → `expired`

**Trigger:** Expiry sweep in `prepare.ts` or `status.ts`.

**Code:**
```ts
// prepare.ts lines 129-131 / status.ts lines 69-77
await env.DB.prepare(
  `UPDATE phase2_mints SET status = 'expired'
   WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < datetime('now')`
).run();
```

**Idempotent?** Yes — `WHERE status = 'pending'` means it won't re-expire an already-expired record.

**Can it happen more than once?** No, once expired, the WHERE clause excludes it.

### Transition: `pending` → `failed`

**Trigger:** Free mint credit deduction race condition in `prepare.ts`.

**Code:**
```ts
// prepare.ts lines 295-297
await env.DB.prepare(
  `UPDATE phase2_mints SET status = 'failed' WHERE id = ?`
).bind(mintId).run();
```

**Idempotent?** The UPDATE doesn't check current status. If somehow called on an already-failed record, it's harmless (sets `'failed'` to `'failed'`).

### Transition: (none) → `minted` (free mint direct insert)

**Trigger:** Free mint success in `prepare.ts`.

**Code:**
```ts
// prepare.ts lines 260-275
const insert = await env.DB.prepare(
  `INSERT INTO phase2_mints (
    // ... status ... 'minted' ...
  )`
).run();
```

Free mints skip the `pending` state entirely — they're inserted directly as `'minted'`.

---

### [LOW] — `expired` and `failed` are terminal states with no outbound transitions

**File(s):** All migration and API files.

**Issue:** Once a mint reaches `expired` or `failed`, there is no code path to transition it to any other state. This is correct behavior, but worth noting:
- An `expired` mint that was actually accepted on-chain (user accepted the offer but browser was closed) cannot be recovered automatically.
- A `failed` mint (from credit race condition) that actually resulted in a real NFT on MintGarden has no recovery path.

The `refund_needed` / `refund_issued` columns in the audit trail migration (032) provide manual admin recovery, but there's no automated reconciliation.

**Impact:** Data integrity — the DB may not reflect on-chain reality for edge cases.

---

### [INFO] — No unreachable states

All four states can be reached:
- `pending`: Created by paid mint flow in prepare.ts.
- `minted`: Created by free mint flow (direct insert) or paid mint flow (confirm.ts).
- `expired`: Set by expiry sweep.
- `failed`: Set by credit race condition handler.

No state is permanently stuck — `pending` always transitions eventually (either confirmed, expired by sweep, or left indefinitely if no sweep runs — see Task 2 HIGH finding).

---

## Task 5: Database Consistency Check

### [INFO] — `mint_number` uniqueness: UNIQUE constraint exists

**File(s):** `functions/migrations/030_credit_system.sql`

**Code:**
```sql
-- 030_credit_system.sql line 43
mint_number INTEGER UNIQUE,
```

The column is `UNIQUE` but **nullable** (no `NOT NULL` constraint). SQLite allows multiple NULL values in a UNIQUE column. Since both free and paid mints assign `mint_number` at prepare time (via `getNextMintNumber`), the value should always be non-null in practice. But if `getNextMintNumber` were to throw and the error were swallowed, a row could be inserted with `mint_number = NULL`. The current code propagates the throw, so this doesn't happen today.

**Impact:** No current issue. The UNIQUE constraint enforces uniqueness for non-null values.

---

### [MEDIUM] — No foreign key between `credit_spends.mint_id` and `phase2_mints.id`

**File(s):** `functions/migrations/030_credit_system.sql`

**Code:**
```sql
-- credit_spends table (030_credit_system.sql lines 22-28)
CREATE TABLE IF NOT EXISTS credit_spends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  mint_id INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 10000,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Issue:** `credit_spends.mint_id` references `phase2_mints.id` conceptually but there is no `FOREIGN KEY` constraint. This means:

1. A `credit_spends` row can reference a `phase2_mints` record that was later marked `'failed'`. This *does* happen — see the free mint race condition in prepare.ts. The credit deduction is inserted, then if the deduction check fails, the mint is marked `'failed'`... but actually no: if deduction fails, **no credit_spends row is inserted** (the INSERT...SELECT returns 0 changes). So credit_spends rows should only exist for successful deductions.

2. However, the reverse case: a mint marked `'failed'` after a *successful* credit deduction (some other error after the INSERT...SELECT) would leave a credit_spends row pointing to a failed mint. Looking at the code, the credit deduction is the *last* database operation before the success return (after it comes only audit logging and trait_usage, which don't affect the mint status). So this case doesn't occur in the current code.

3. A foreign key would prevent deleting or orphaning phase2_mints records referenced by credit_spends, but D1/SQLite has `PRAGMA foreign_keys = OFF` by default in many configurations, so FK enforcement may be moot anyway.

**Impact:** Low practical risk given the current code flow, but a FK constraint would be a defense-in-depth measure.

---

### [MEDIUM] — `mint_counter` row id=1 bootstrap depends on migration running after data exists

**File(s):** `functions/migrations/031_mint_counter.sql`, `functions/api/mint/mintNumberHelper.ts`

**Code:**
```sql
-- 031_mint_counter.sql lines 4-14
CREATE TABLE IF NOT EXISTS mint_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_number INTEGER NOT NULL DEFAULT 1
);

INSERT INTO mint_counter (id, next_number)
SELECT 1, COALESCE(MAX(mint_number), 0) + 1
FROM phase2_mints
WHERE status = 'minted'
ON CONFLICT(id) DO NOTHING;
```

```ts
// mintNumberHelper.ts lines 20-33
const result = await db
  .prepare(
    `UPDATE mint_counter
     SET next_number = next_number + 1
     WHERE id = 1
     RETURNING next_number - 1 AS mint_number`
  )
  .first<{ mint_number: number }>();

if (!result || result.mint_number == null) {
  throw new Error('Failed to get next mint number from counter');
}
```

**Issue:** The migration seed query uses `WHERE status = 'minted'` to find the max mint_number. But mint numbers are now assigned at prepare time, *before* the mint is confirmed. If the migration runs while there are `pending` mints with assigned mint_numbers, those numbers won't be counted in the seed. The counter could start at a number that overlaps with a pending mint's number.

Example: Mints #1-#10 are `'minted'`, mint #11 is `'pending'`. Migration seeds counter with `next_number = 11`. Next mint gets `#11` from the counter — collision with the pending mint's `#11`. The `UNIQUE` constraint on `mint_number` would cause the INSERT in prepare.ts to fail.

**Impact:** Only relevant during initial migration deployment. Once the counter is seeded and running, it's fine. But if migrations are re-run or the table is recreated, this could cause collisions.

**Question for primary engineer:** Should the seed query use `MAX(mint_number)` across *all* statuses, not just `'minted'`?

---

### [LOW] — Concurrent trait_usage updates are safe (UPSERT is atomic)

**File(s):** `functions/migrations/030_credit_system.sql`, `functions/api/mint/prepare.ts`, `functions/api/mint/confirm.ts`

**Code:**
```sql
-- 030_credit_system.sql lines 67-73
CREATE TABLE IF NOT EXISTS trait_usage (
  trait_category TEXT NOT NULL,
  trait_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (trait_category, trait_name)
);
```

```ts
// prepare.ts lines 313-321 / confirm.ts lines 109-117
await env.DB.prepare(
  `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
   VALUES (?, ?, 1, datetime('now'))
   ON CONFLICT(trait_category, trait_name) DO UPDATE SET
     usage_count = usage_count + 1,
     updated_at = datetime('now')`
).bind(category, traitName).run();
```

The `ON CONFLICT ... DO UPDATE SET usage_count = usage_count + 1` is an atomic UPSERT in SQLite. Two concurrent requests updating the same trait won't lose an increment — SQLite serializes writes. **No issue.**

However, note the double-counting concern: **both `prepare.ts` (free mints) and `confirm.ts` (paid mints)** increment trait_usage. For free mints, traits are incremented at prepare time (since there's no confirm step). For paid mints, traits are incremented at confirm time. This is correct — each path increments once. But if a paid mint is confirmed twice (see Task 2 finding), traits get double-counted.

---

### [LOW] — `mint_audit_log.mint_id` has no foreign key to `phase2_mints.id`

**File(s):** `functions/migrations/032_mint_audit_trail.sql`

**Code:**
```sql
-- 032_mint_audit_trail.sql lines 31-39
CREATE TABLE IF NOT EXISTS mint_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mint_id INTEGER NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  data TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Issue:** No foreign key on `mint_id`. Also, `prepare.ts` logs audit entries with `mint_id: 0` for pre-insert failures (line 428: `mint_id: 0`), which doesn't correspond to any real mint record. This is intentional (best-effort logging), but means audit queries joining on mint_id need to handle `mint_id = 0` as "no associated mint."

**Impact:** Minor data quality concern for audit reporting.

---

### [INFO] — `getNextMintNumber` handles missing row correctly

```ts
// mintNumberHelper.ts lines 29-31
if (!result || result.mint_number == null) {
  throw new Error('Failed to get next mint number from counter');
}
```

If row id=1 doesn't exist, the UPDATE matches 0 rows, `RETURNING` returns nothing, `.first()` returns null, and the function throws. This propagates up to prepare.ts's catch block, which returns a 500. **Correctly handled — fails loud rather than silently.**

---

## Summary of Findings

| # | Severity | Task | Title |
|---|----------|------|-------|
| 1 | HIGH | 2 | No expiry check in confirm.ts — can confirm after 15-minute window |
| 2 | MEDIUM | 1 | Free mint: MintGarden succeeds but credit deduction fails → NFT minted but marked failed |
| 3 | MEDIUM | 1 | No frontend lock prevents double-clicking Free Mint → possible double-mint |
| 4 | MEDIUM | 2 | Double-confirmation race: trait_usage double-counted |
| 5 | MEDIUM | 2 | Partial trait_usage update on confirm failure → inconsistent state |
| 6 | MEDIUM | 5 | mint_counter seed query ignores pending mints |
| 7 | MEDIUM | 5 | No FK between credit_spends.mint_id and phase2_mints.id |
| 8 | LOW | 1 | Mint number gaps from failed mints |
| 9 | LOW | 1 | Orphaned IPFS pins on MintGarden failure |
| 10 | LOW | 2 | Offer file tamper-resistance (non-issue, Chia offers are signed) |
| 11 | LOW | 3 | Multiple pending mints: prepare.ts and status.ts may return different ones |
| 12 | LOW | 4 | expired/failed are terminal — no automated reconciliation with on-chain state |
| 13 | LOW | 5 | mint_audit_log uses mint_id=0 for pre-insert failures |
