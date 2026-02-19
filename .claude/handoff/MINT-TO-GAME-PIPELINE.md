# Mint-to-Game Pipeline Verification

> **Purpose:** Verify that a newly minted "Your Wojak" appears in the voting feed for other players
> **Date:** 2026-02-18

---

## Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND: Generator → MintFlowModal                               │
│  POST /api/mint/submit                                              │
│  Body: { walletAddress, selectedLayers, selectedColors,             │
│          imageBase64, mintType, idempotencyKey, customName }        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  submit.ts                                                          │
│  1. Validate inputs                                                 │
│  2. Check supply (minted + in-flight < 4200)                        │
│  3. Free: deduct credits atomically                                 │
│  4. INSERT mint_jobs (step = 'queued')                              │
│  5. Store imageBase64 in KV                                         │
│  6. context.waitUntil(processJob())                                 │
│  Returns: { jobId, step: 'queued' }                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  process.ts → processJob()                                         │
│                                                                     │
│  Step 1: validating                                                 │
│    - Parse layers, consolidate traits                               │
│                                                                     │
│  Step 2: reserving_number                                           │
│    - getNextMintNumber() → atomic counter                           │
│    - UPDATE mint_jobs SET mint_number = ?                            │
│                                                                     │
│  Step 3: uploading_ipfs                                             │
│    - Build CHIP-0007 metadata (name, attributes, collection)        │
│    - Upload image + metadata to Pinata                              │
│    - Store: ipfs_image_uris, ipfs_metadata_uris, image_hash,       │
│             metadata_hash                                           │
│                                                                     │
│  [Concurrency gate: max 3 MintGarden calls in flight]               │
│                                                                     │
│  Step 4: calling_mintgarden                                         │
│    - POST https://api.mintgarden.io/mint/dynamic                    │
│    - Free: returns launcherId (format TBD — see LAUNCHER-ID-FORMAT) │
│    - Paid: returns offerFile + launcherId (from offer.offered)      │
│    - Store: mintgarden_launcher_id, offer_file                      │
│                                                                     │
│  Step 5 (paid only): awaiting_payment                               │
│    - Return. Frontend polls /api/mint/job for offer file.           │
│    - User accepts offer in Sage wallet.                             │
│    → confirm-payment.ts picks up when user calls it.                │
│                                                                     │
│  Step 6: finalizing (free) or via confirm-payment (paid)            │
│    → finalizeJob()                                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  process.ts → finalizeJob()  ★ THE CRITICAL STEP ★                 │
│                                                                     │
│  Atomic D1 batch:                                                   │
│                                                                     │
│  1. INSERT INTO phase2_mints                             ✅ WRITTEN │
│     - mint_number, wallet_address, layers_json, colors_json         │
│     - ipfs_image_uri (JSON string[] of IPFS gateway URLs)           │
│     - ipfs_metadata_uri, image_hash, metadata_hash                  │
│     - mintgarden_launcher_id ← from mint_jobs                       │
│     - status = 'minted' ← IMMEDIATELY 'minted'                     │
│     - payment_verified = 1 (paid) or 0 (free)                      │
│                                                                     │
│  2. INSERT/UPDATE trait_usage (per trait)                 ✅ WRITTEN │
│                                                                     │
│  3. INSERT INTO nft_names                                ✅ WRITTEN │
│     - edition_number = mint_number                                  │
│     - custom_name = job.custom_name (nullable)                      │
│     - full_name = "Your Wojak #N" or "Your Wojak #N: CustomName"   │
│                                                                     │
│  Post-batch:                                                        │
│  4. UPDATE credit_spends SET mint_id = phase2_mint_id    ✅ DONE    │
│  5. Check sold_out flag                                  ✅ DONE    │
│  6. UPDATE mint_jobs SET step = 'completed'              ✅ DONE    │
│  7. Award onboarding milestone credits                   ✅ DONE    │
│  8. Clean up KV image                                    ✅ DONE    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  feed.ts → GET /api/game/feed?did=X&limit=10                       │
│                                                                     │
│  SELECT pm.mint_number as edition_number,                           │
│         pm.mintgarden_launcher_id as nft_id,          ← FEED READS │
│         pm.wallet_address as creator_wallet,                        │
│         pm.layers_json,                                             │
│         pm.ipfs_image_uri,                            ← HAS IMAGE  │
│         nn.custom_name,                               ← HAS NAME   │
│         nn.full_name,                                 ← HAS NAME   │
│         COALESCE(ws.total_votes, 0) as total_votes                  │
│  FROM phase2_mints pm                                               │
│  WHERE pm.status = 'minted'                           ← ✅ MATCHES │
│    AND pm.mintgarden_launcher_id IS NOT NULL           ← ⚠️ KEY    │
│    AND [exclusion filters]                                          │
│  ORDER BY weighted random                                           │
│                                                                     │
│  Returns: { nftId, editionNumber, name, imageUri, ... }             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VotingFeed.tsx → SwipeCard                                         │
│                                                                     │
│  imageUrl={getNftImageUrl(item.nftId)}                 ← ❌ BROKEN │
│  See LAUNCHER-ID-FORMAT.md for details                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Gap Analysis

### ✅ What Works

1. **`phase2_mints` row written immediately at finalize** — status is `'minted'` from the start, not `'pending'`. The feed query filters on `status = 'minted'`, so the NFT appears immediately after `finalizeJob()` completes.

2. **`nft_names` populated at finalize** — the batch insert in `finalizeJob()` writes `edition_number`, `custom_name`, and `full_name` to `nft_names`. The feed joins on this and falls back to `Your Wojak #N` if missing.

3. **`ipfs_image_uri` available at finalize** — stored as JSON string[] of IPFS gateway URLs. The feed returns it as `imageUri`. This data is available immediately (uploaded in Step 3, before MintGarden is even called).

4. **Status transitions are correct** — `status = 'minted'` is set in the same INSERT (not as a separate UPDATE). There's no intermediate state where the row exists but isn't `'minted'`.

5. **Custom names work** — `custom_name` is validated in submit.ts (max 15 chars, alphanumeric + basic punctuation) and flows through to both `nft_names` and the CHIP-0007 metadata.

### ⚠️ Potential Gaps

#### Gap 1: `mintgarden_launcher_id` Population Timing

**For free mints:** The launcher ID comes from MintGarden's response in Step 4 (`callMintGardenMint`). It's stored on `mint_jobs` first, then copied to `phase2_mints` in `finalizeJob()`. **This is immediate** — no delay.

**For paid mints:** The launcher ID comes from either:
- The offer response (`offer.offered` keys, bech32m format)
- `verifyLauncherOnChain()` or `detectLauncherByWallet()` in `confirm-payment.ts`

If MintGarden doesn't include the NFT ID in the offer response (the `if (!launcherId)` path in `parseResponse`), then `mintgarden_launcher_id` will be NULL on the job. The `confirm-payment.ts` fallback uses `detectLauncherByWallet()` which queries MintGarden's index — **this has a delay** (MintGarden needs to index the new NFT first).

**Impact:** For paid mints where the launcher ID isn't in the offer response, there's a window where:
- `phase2_mints.mintgarden_launcher_id` could be NULL
- The feed filters `AND pm.mintgarden_launcher_id IS NOT NULL` → NFT won't appear until launcher ID is set

**Mitigation:** The `confirm-payment.ts` flow handles this — it verifies/detects the launcher ID before calling `finalizeJob()`. So by the time `phase2_mints` is written, the launcher ID should be populated. The only exception is if `detectLauncherByWallet` returns a value but it's stored as the hex `item.id` instead of `item.encoded_id`. See LAUNCHER-ID-FORMAT.md.

#### Gap 2: Image URL is Broken (NOT a pipeline gap)

The IPFS image URI is correctly stored and returned by the feed. But VotingFeed.tsx ignores it and uses `getNftImageUrl(item.nftId)` which generates a broken URL. **This is a display bug, not a pipeline bug.** See LAUNCHER-ID-FORMAT.md for the fix.

#### Gap 3: MintGarden Indexing Delay (Phase 2 collection)

The feed queries `phase2_mints` directly — it does NOT query MintGarden. So there's **no MintGarden indexing delay** for the voting feed. The NFT appears in the feed as soon as `finalizeJob()` completes, regardless of whether MintGarden has indexed it.

However, other features that rely on MintGarden API (like `hasRequiredNFTs()` in `SageWalletProvider.tsx`) WILL experience a delay. This doesn't affect the voting feed.

#### Gap 4: `image_hash` Not in Feed Response

The feed returns `ipfs_image_uri` (the full IPFS URLs) but not `image_hash` (the content hash needed for MintGarden CDN thumbnails). If we want to use `assets.mainnet.mintgarden.io/thumbnails/{hash}_512.webp` as a fast CDN fallback, we need to add `image_hash` to the feed query. See LAUNCHER-ID-FORMAT.md.

---

## Data Flow Summary

| Column | Written By | Written When | Available in Feed? |
|--------|-----------|-------------|-------------------|
| `mint_number` | `process.ts` Step 2 | Job creation | ✅ as `edition_number` |
| `wallet_address` | `submit.ts` | Job creation | ✅ as `creator_wallet` |
| `layers_json` | `submit.ts` | Job creation | ✅ |
| `colors_json` | `submit.ts` | Job creation | Not in feed (not needed) |
| `ipfs_image_uri` | `process.ts` Step 3 | Before MintGarden call | ✅ as `imageUri` |
| `ipfs_metadata_uri` | `process.ts` Step 3 | Before MintGarden call | Not in feed (not needed) |
| `image_hash` | `process.ts` Step 3 | Before MintGarden call | ❌ Not in feed (SHOULD BE) |
| `metadata_hash` | `process.ts` Step 3 | Before MintGarden call | Not needed |
| `mintgarden_launcher_id` | `process.ts` Step 4 / `confirm-payment.ts` | After MintGarden response | ✅ as `nft_id` |
| `status` | `finalizeJob()` | Finalization | ✅ (filter: `= 'minted'`) |
| `nft_names.custom_name` | `finalizeJob()` | Finalization | ✅ |
| `nft_names.full_name` | `finalizeJob()` | Finalization | ✅ |

---

## Conclusion

**The pipeline is fundamentally sound.** Data flows correctly from submit → process → finalize → feed. The NFT appears in the voting feed immediately after `finalizeJob()` completes — there is no MintGarden indexing delay because the feed queries `phase2_mints` directly.

**The two real issues are:**
1. **Image rendering is broken** — `getNftImageUrl()` uses a dead CDN domain and wrong ID format. Fix documented in LAUNCHER-ID-FORMAT.md.
2. **DID indexer is broken** — `did_holdings` never populates, so feed exclusion (don't show NFTs you own) and vote self-check don't work. Fix documented in DID-INDEXER-FIX.md.

**No pipeline changes needed** — only the display layer (SwipeCard image URL) and the indexer need fixing.

---

## Quick Reference: Key Files in the Pipeline

| Step | File | Function |
|------|------|----------|
| Submit | `functions/api/mint/submit.ts` | `onRequest` |
| Process | `functions/api/mint/process.ts` | `processJob()` |
| IPFS Upload | `functions/api/mint/uploadToIPFS.ts` | `uploadToIPFS()` |
| MintGarden Call | `functions/api/mint/request.ts` | `callMintGardenMint()` |
| Payment Confirm | `functions/api/mint/confirm-payment.ts` | `onRequest` |
| MG Verification | `functions/api/mint/mintgardenVerify.ts` | `verifyLauncherOnChain()`, `detectLauncherByWallet()` |
| Finalize | `functions/api/mint/process.ts` | `finalizeJob()` |
| Feed Query | `functions/api/game/feed.ts` | `onRequestGet` |
| Vote | `functions/api/game/vote.ts` | `onRequestPost` |
| Display | `src/components/game/VotingFeed.tsx` | `VotingFeed` |
| Card Render | `src/components/game/SwipeCard.tsx` | `SwipeCard`, `getNftImageUrl()` |
