# Launcher ID Format Mismatch — Audit & Fix Spec

> **Priority:** HIGH — Images won't load and votes will fail when other players join
> **Scope:** `phase2_mints.mintgarden_launcher_id`, feed query, SwipeCard image rendering, vote matching
> **Date:** 2026-02-18

---

## Problem Summary

There are **TWO distinct issues** that compound into broken images and votes:

### Issue 1: Unknown launcher ID format stored in `phase2_mints`

The `mintgarden_launcher_id` column gets its value from `callMintGardenMint()` → `parseResponse()` in `functions/api/mint/request.ts`. The parser tries multiple fields in priority order:

```ts
let launcherId = data.launcher_id ?? data.nft_coin_id ?? data.coin_id ?? data.nft_id ?? null;
```

For **paid mints**, it also extracts from `offer.offered` (keys are bech32m `nft1...`). For **free mints**, the format depends on which field MintGarden's `/mint/dynamic` response populates. Without live testing of the mint endpoint, we can't confirm which format gets stored — **it could be either hex or bech32m**.

The `detectLauncherByWallet()` fallback (in `mintgardenVerify.ts` line 99) returns:
```ts
return item.encoded_id || item.id || null;  // prefers bech32m, falls back to hex
```

**Bottom line:** The stored format is non-deterministic — could be hex `61fe0134cce89f...` or bech32m `nft1v8lqzd...` depending on mint type and response fields.

### Issue 2: `getNftImageUrl()` uses a dead CDN domain

**File:** `src/components/game/SwipeCard.tsx` line 282

```ts
export function getNftImageUrl(nftId: string): string {
  return `https://assets.mintgarden.io/thumbnails/medium/${nftId}.png`;
}
```

**Problems:**
1. `assets.mintgarden.io` **does not respond** (tested: HTTP 000 — connection refused). The working CDN is `assets.mainnet.mintgarden.io`.
2. The CDN expects a `data_hash` (image content hash), NOT a launcher ID or internal hex ID.
3. The URL format should be `https://assets.mainnet.mintgarden.io/thumbnails/{data_hash}_512.webp`

**Verified via curl:**
| URL Pattern | Status |
|------------|--------|
| `assets.mintgarden.io/thumbnails/medium/{hex_id}.png` | 000 (dead) |
| `assets.mintgarden.io/thumbnails/medium/{nft1_bech32m}.png` | 000 (dead) |
| `assets.mainnet.mintgarden.io/thumbnails/{data_hash}_512.webp` | **200 ✅** |

---

## Where `mintgarden_launcher_id` Gets Written

### Write Path 1: Free Mints (process.ts line 265-267)
```ts
// mintResult.launcherId comes from parseResponse()
await env.DB.prepare(
  'UPDATE mint_jobs SET mintgarden_launcher_id = ?, ...'
).bind(mintResult.launcherId, jobId).run();
```
Then `finalizeJob()` copies it to `phase2_mints`:
```ts
const launcherId = job.mintgarden_launcher_id;
// ...
batchStmts.push(env.DB.prepare(`INSERT OR IGNORE INTO phase2_mints (..., mintgarden_launcher_id, ...) VALUES (..., ?, ...)`).bind(..., launcherId, ...));
```

### Write Path 2: Paid Mints (process.ts line 277-284)
```ts
await env.DB.prepare(
  'UPDATE mint_jobs SET offer_file = ?, mintgarden_launcher_id = ?, ...'
).bind(mintResult.offerFile, mintResult.launcherId, jobId).run();
```
Then `confirm-payment.ts` may update it with the verified launcher from `verifyLauncherOnChain()` or `detectLauncherByWallet()`.

### Write Path 3: Legacy confirm.ts (deprecated)
```ts
// Uses body.launcherId or row.mintgarden_launcher_id from phase2_mints
await env.DB.prepare('UPDATE phase2_mints SET mintgarden_launcher_id = ? ...').bind(launcherId, mintId).run();
```

---

## Where `mintgarden_launcher_id` Gets Read

### Feed Query (feed.ts line 39)
```sql
SELECT pm.mintgarden_launcher_id as nft_id, ...
FROM phase2_mints pm
WHERE pm.status = 'minted' AND pm.mintgarden_launcher_id IS NOT NULL
```
Returns as `nftId` to frontend.

### Vote Endpoint (vote.ts)
```sql
-- Line 72: ownership exclusion
SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?  -- nft_id from request
-- Line 82-86: creator check
SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?
UNION SELECT wallet_address FROM phase2_mints WHERE mintgarden_launcher_id = ?
-- Line 95-97: insert vote
INSERT INTO wojak_votes (voter_did, nft_id, ...) VALUES (?, ?, ...)
-- Line 110-112: upsert score
INSERT INTO wojak_scores (nft_id, ...) ON CONFLICT(nft_id)
```
The vote system stores `nft_id` as whatever the feed gave it. If format changes, old votes and scores won't match new feed IDs.

### Image Rendering (VotingFeed.tsx line 300)
```tsx
imageUrl={getNftImageUrl(item.nftId)}
```
Passes `nftId` (from `mintgarden_launcher_id`) to `getNftImageUrl()`, which builds the broken CDN URL.

**NOTE:** The feed ALSO returns `imageUri` (from `pm.ipfs_image_uri` — IPFS URLs stored during mint). This is available in the feed response but is **never used for SwipeCard rendering**. It's only captured in `lastVote` for the post-round summary.

---

## Recommended Fix

### Strategy: Fix at display time + store consistently going forward

**Why not convert at write time:** The stored launcher ID is already used as a foreign key across `wojak_votes`, `wojak_scores`, and `did_holdings`. Changing the format would break existing vote/score joins. Better to normalize display separately.

### Fix 1: Fix `getNftImageUrl()` to use IPFS URI (CRITICAL)

The real fix is to stop using the broken MintGarden CDN URL and use the IPFS image URI that's already in the feed response.

**File: `src/components/game/SwipeCard.tsx`**

```ts
// BEFORE (broken):
export function getNftImageUrl(nftId: string): string {
  return `https://assets.mintgarden.io/thumbnails/medium/${nftId}.png`;
}

// AFTER — delete getNftImageUrl entirely, or repurpose for data_hash-based CDN
```

**File: `src/components/game/VotingFeed.tsx`**

Change line 300 from:
```tsx
imageUrl={getNftImageUrl(item.nftId)}
```
To:
```tsx
imageUrl={getImageUrl(item)}
```

Where `getImageUrl` is:
```ts
function getImageUrl(item: FeedItem): string {
  // Prefer IPFS URI (always available from phase2_mints.ipfs_image_uri)
  if (item.imageUri) {
    try {
      const uris = JSON.parse(item.imageUri) as string[];
      if (uris.length > 0) return uris[0];
    } catch {
      // imageUri might be a direct string URL
      if (item.imageUri.startsWith('http')) return item.imageUri;
    }
  }
  // Fallback: MintGarden CDN with data_hash (requires adding image_hash to feed)
  if (item.imageHash) {
    return `https://assets.mainnet.mintgarden.io/thumbnails/${item.imageHash}_512.webp`;
  }
  // Last resort: broken old pattern (will show fallback image)
  return `https://assets.mainnet.mintgarden.io/thumbnails/${item.nftId}_512.webp`;
}
```

Also update the **feed query** (feed.ts) to include `image_hash`:
```sql
SELECT
  pm.mint_number as edition_number,
  pm.mintgarden_launcher_id as nft_id,
  pm.wallet_address as creator_wallet,
  pm.layers_json,
  pm.ipfs_image_uri,
  pm.image_hash,              -- ADD THIS
  nn.custom_name,
  nn.full_name,
  ...
```

And update the feed response mapping:
```ts
imageUri: row.ipfs_image_uri,
imageHash: row.image_hash,     // ADD THIS
```

Also fix the prefetch (VotingFeed.tsx line 118-121):
```ts
// BEFORE:
feed.slice(0, 3).forEach(item => {
  const img = new Image();
  img.src = getNftImageUrl(item.nftId);
});

// AFTER:
feed.slice(0, 3).forEach(item => {
  const img = new Image();
  img.src = getImageUrl(item);
});
```

### Fix 2: Normalize Launcher ID Format (RECOMMENDED)

Ensure `mintgarden_launcher_id` always stores bech32m `nft1...` format.

**File: `functions/api/mint/request.ts`**

Add after `parseResponse()`:
```ts
// Normalize launcher ID to bech32m format
function normalizeLauncherId(id: string | null): string | null {
  if (!id) return null;
  // Already bech32m
  if (id.startsWith('nft1')) return id;
  // Hex format — cannot convert without Chia libraries, flag for manual review
  console.warn(`[MintGarden] Non-bech32m launcher ID received: ${id.slice(0, 20)}...`);
  return id; // Store as-is for now, we need chia-bech32m to convert
}
```

**Or better:** Determine what MintGarden actually returns by adding logging:
```ts
console.warn('[MintGarden] Raw response launcher fields:', {
  launcher_id: data.launcher_id,
  nft_coin_id: data.nft_coin_id,
  coin_id: data.coin_id,
  nft_id: data.nft_id,
  offer_offered: data.offer && typeof data.offer === 'object'
    ? Object.keys((data.offer as Record<string, unknown>).offered || {})
    : null,
});
```

**⚠️ Testing step:** Do one test mint (free or credit) and check the logs to see what format MintGarden actually returns. This determines whether a migration is needed.

### Fix 3: Migration for Existing Rows (IF NEEDED)

If the existing 4 rows have hex IDs but we want bech32m, we need to either:

**Option A: Query MintGarden to resolve hex → bech32m**
```sql
-- Can't do this in pure SQL. Need a script:
-- For each row in phase2_mints:
--   GET /nfts/{hex_id} → response.encoded_id (bech32m)
--   UPDATE phase2_mints SET mintgarden_launcher_id = encoded_id WHERE id = row.id
--   UPDATE wojak_votes SET nft_id = encoded_id WHERE nft_id = hex_id
--   UPDATE wojak_scores SET nft_id = encoded_id WHERE nft_id = hex_id
```

**Option B: Accept both formats** (already the case — just fix the image URL)

**Recommendation:** Start with Fix 1 (image URL fix — CRITICAL, images are broken NOW) and Fix 2 (add logging), then assess Fix 3 after seeing real data.

---

## Verification Checklist

- [ ] `getNftImageUrl()` deleted or updated to use IPFS URI / data_hash CDN
- [ ] Feed query includes `image_hash`
- [ ] VotingFeed.tsx uses `getImageUrl(item)` instead of `getNftImageUrl(item.nftId)`
- [ ] Prefetch uses same `getImageUrl()` function
- [ ] SwipeCard renders images correctly with IPFS URIs
- [ ] Vote endpoint still works (nftId format unchanged in existing data)
- [ ] Logging added to `parseResponse()` to capture actual format from MintGarden
- [ ] Build passes, no TypeScript errors

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/game/SwipeCard.tsx` | Delete or fix `getNftImageUrl()` |
| `src/components/game/VotingFeed.tsx` | Use IPFS URI for images, update prefetch |
| `functions/api/game/feed.ts` | Add `image_hash` to query + response |
| `functions/api/mint/request.ts` | Add launcher format logging |
| `functions/api/mint/mintgardenVerify.ts` | Confirm `encoded_id` preference is correct |
