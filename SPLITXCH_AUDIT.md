# SplitXCH Royalty Split Integration — Audit Handoff Document

**Date**: 2026-02-22  
**Status**: SplitXCH integration currently DISABLED in production  
**Project**: Wojak.ink — Chia NFT minting platform on Cloudflare Workers  
**Goal**: Split NFT royalties between minter (82.58%) and treasury (15.92%), with 1.5% platform fee to SplitXCH

---

## 1. What This System Does

When a user mints an NFT, the NFT is assigned a `royalty_address` and `royalty_percentage` (12%). On any future resale of that NFT, the Chia blockchain puzzle enforces that 12% of the sale price goes to that `royalty_address`.

We want to SPLIT that 12% royalty between:
- **The original minter**: 82.58% of the royalty (8258 basis points)
- **The project treasury**: 15.92% of the royalty (1592 basis points)
- **SplitXCH platform fee**: 1.50% (150 basis points, added automatically by SplitXCH)

Total: 8258 + 1592 + 150 = 10,000 basis points = 100%

SplitXCH is a service that creates a Chialisp "splitter puzzle" — a special on-chain address that, when coins arrive, anyone can trigger a spend that automatically divides the coins according to the predefined split ratios. No private key is needed to spend coins at this address.

---

## 2. Code Locations (all paths relative to repo root)

### Core SplitXCH Integration
| File | Purpose |
|---|---|
| `functions/api/mint/splitxch.ts` | Creates/caches SplitXCH splitter addresses. Calls the SplitXCH API. **Recently updated** with verification polling. |
| `functions/api/mint/process.ts` | Main mint processing pipeline. Calls `getOrCreateSplitterAddress()`. **SplitXCH currently DISABLED here** (lines 325-358 commented out). |
| `functions/api/mint/prepare.ts` | **DEPRECATED** legacy mint endpoint. **Still has ACTIVE SplitXCH calls** at lines 422 and 588 — NOT disabled. |
| `functions/api/mint/request.ts` | Builds the MintGarden API request. Line 160: `royalty_address: params.royaltyAddress \|\| params.walletAddress` — this is the fallback that uses the minter's wallet if no splitter address is provided. |
| `functions/api/mint/submit.ts` | Current mint entry point. Queues jobs for `process.ts`. Does NOT directly call SplitXCH. |

### Database
| File | Purpose |
|---|---|
| `functions/migrations/047_splitxch.sql` | Creates the `splitter_addresses` table in Cloudflare D1. Schema: `(creator_wallet, wave, splitter_address, splitxch_id, creator_points, treasury_points, created_at)`. Primary key: `(creator_wallet, wave)`. |

### Admin/Debug
| File | Purpose |
|---|---|
| `functions/api/admin/verify-royalty-split.ts` | Admin endpoint to verify royalty split assignments. Joins `splitter_addresses` with minted NFTs. |

### Configuration
| File | Variable | Value |
|---|---|---|
| `wrangler.toml` | `TREASURY_ADDRESS` | `xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd` |
| `wrangler.toml` | `PHASE2_ROYALTY_PCT` | `12` |
| Cloudflare Dashboard | Same variables confirmed matching `wrangler.toml` | |

---

## 3. SplitXCH API Documentation

**Base URL**: `https://splitxch.com`  
**Source code**: https://github.com/Koba42Corp/splitxch-builder  
**Chialisp puzzle source**: https://github.com/trgarrett/chialisp/tree/main/royalty_share

### POST /api/compute/fast

Creates a splitter address. Returns immediately with an address, but provisions the on-chain puzzle asynchronously.

**Request:**
```json
{
  "recipients": [
    {
      "name": "minter",
      "address": "xch1...",
      "points": 8258,
      "id": 1
    },
    {
      "name": "treasury",
      "address": "xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd",
      "points": 1592,
      "id": 2
    }
  ]
}
```

**Rules:**
- Points for all recipients must sum to **9850** (SplitXCH adds 150bp platform fee = 10,000 total)
- Each recipient needs `name`, `address`, `points`, `id`
- All recipient addresses must be unique
- Points for each recipient must be > 0

**Success Response (HTTP 200):**
```json
{
  "id": "8b820f14461345c6b24b0848f9b9c094",
  "message": "Saved",
  "pctProgress": 100,
  "address": "xch1sgtgjnl652ml6gu9zvjgv4h5n7spmafyk0lu5x5w6t3gsfry6dqs2gvx34"
}
```

> ⚠️ **CRITICAL**: The HTTP 200 + address does NOT mean the puzzle was provisioned on-chain. The address is computed deterministically (pure math), but the background test transaction may fail.

### GET /api/compute/{id}

Checks the status of a compute job.

**Successful compute:**
```json
{
  "address": "xch1q3ge2z...",
  "error": false,
  "id": "...",
  "message": "Complete",
  "pctProgress": 100
}
```

**Failed compute:**
```json
{
  "address": null,
  "error": true,
  "id": "...",
  "message": null,
  "pctProgress": 0
}
```

---

## 4. Current State of the Database (D1)

**Query**: `SELECT * FROM splitter_addresses LIMIT 10;`

| creator_wallet | wave | splitter_address | splitxch_id | creator_points | treasury_points |
|---|---|---|---|---|---|
| xch18tcyy0k... | 1 | xch1sgtgjnl... | 8b820f14461345c6b24b0848f9b9c094 | 8258 | 1592 |
| xch1krxf2ha... | 1 | xch1hh0mh7r... | cd401ed4716c417695ddb68f46804aac | 8258 | 1592 |
| _(8 more rows)_ | | | | | |

**Total rows**: 45  
**All created**: 2026-02-20 (one day of SplitXCH being active)

---

## 5. What We Found (The Problem)

### Every single SplitXCH compute has failed

All 45 cached `splitxch_id` values return `error: true` when checked:

```bash
# Test command — try any ID from the database:
curl -s 'https://splitxch.com/api/compute/8b820f14461345c6b24b0848f9b9c094'
# Returns: {"address":null,"error":true,"id":"8b820f14461345c6b24b0848f9b9c094","message":null,"pctProgress":0}
```

### New computes also fail

```bash
# Create a new split:
curl -s -XPOST 'https://splitxch.com/api/compute/fast' \
  -H 'Content-Type: application/json' \
  -d '{"recipients":[{"name":"minter","address":"xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk","points":8258,"id":1},{"name":"treasury","address":"xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd","points":1592,"id":2}]}'
# Returns HTTP 200 with an address (looks successful!)

# Check the status of the returned ID:
curl -s 'https://splitxch.com/api/compute/<ID_FROM_ABOVE>'
# Returns: {"address":null,"error":true,...}  ← FAILED
```

### The docs sample works (pre-existing puzzle)

```bash
# The exact sample from SplitXCH docs — uses a PREVIOUSLY provisioned address:
curl -s -XPOST 'https://splitxch.com/api/compute/fast' \
  -H 'Content-Type: application/json' \
  -d '{"recipients":[{"name":"hot","address":"xch12pfws6enm2jeqjt03pspqg6sjh50g86hl9xm24dx4cwwm2l88nmqrrznj7","points":9850,"id":1}]}'

# Check status:
curl -s 'https://splitxch.com/api/compute/<ID>'
# Returns: {"address":"xch1q3ge2z...","error":false,"message":"Complete","pctProgress":100}  ← SUCCESS
```

**Interpretation**: SplitXCH returns cached/pre-existing addresses correctly, but fails to provision NEW puzzles. This may be a temporary backend issue (their test transaction wallet is empty, their Chia node is down, etc.) OR there may be something about our request that causes the background job to fail.

### NFTs on-chain use the minter's wallet, not the splitter

For NFT #1 (minter: `xch18tcyy0k...`):
- On-chain `royalty_address` puzzle hash: `3af0423ed362708451bf6f90b50b2c8819c7b454607f701513bb9822a4c4fd22`
- Minter's wallet puzzle hash: `3af0423ed362708451bf6f90b50b2c8819c7b454607f701513bb9822a4c4fd22`
- **They match** → The fallback to minter's wallet kicked in

The D1 splitter address for this minter (`xch1sgtgjnl...`) has puzzle hash `8216894ffaa2b7fd...` which does NOT match the on-chain royalty address. This confirms the splitter address was cached but never actually used for any NFT mint.

---

## 6. Code Flow Walkthrough

### Current Mint Path: `submit.ts` → `process.ts`

```
User submits mint
    → submit.ts: validates, reserves mint number, queues job in mint_jobs table
    → process.ts: picks up job, uploads to IPFS, resolves royalty address, calls MintGarden

process.ts royalty resolution (CURRENTLY DISABLED):
    1. Call getOrCreateSplitterAddress(env, wallet, wave)
    2. Check D1 cache for (wallet, wave)
       → If cached: return cached address
       → If not cached: call SplitXCH API, verify, cache, return
    3. If splitter fails: royaltyAddress stays undefined
    4. Pass royaltyAddress to callMintGardenMint()

request.ts (line 160):
    royalty_address: params.royaltyAddress || params.walletAddress
    → If splitter succeeded: use splitter address
    → If splitter failed: use minter's own wallet
```

### splitxch.ts — Key Function: `getOrCreateSplitterAddress()`

```typescript
// 1. Check D1 cache
const cached = await env.DB.prepare(
  'SELECT splitter_address FROM splitter_addresses WHERE creator_wallet = ? AND wave = ?'
).bind(creatorWallet, wave).first();
if (cached) return cached.splitter_address;

// 2. Call SplitXCH API
const response = await fetch('https://splitxch.com/api/compute/fast', {
  method: 'POST',
  body: JSON.stringify({ recipients: [...] }),
});
const data = await response.json();

// 3. VERIFY the compute succeeded (NEW — added 2026-02-22)
// Polls GET /api/compute/{id} up to 6 times (2s apart, 12s max)
// Checks for error: false AND pctProgress: 100
for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
  const status = await fetch(`https://splitxch.com/api/compute/${data.id}`);
  const statusData = await status.json();
  if (!statusData.error && statusData.pctProgress === 100) {
    // SUCCESS — cache and return
    await env.DB.prepare('INSERT INTO splitter_addresses ...').bind(...).run();
    return data.address;
  }
  await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
}

// 4. If verification fails, throw (caller falls back to minter's wallet)
throw new Error('SplitXCH compute failed verification');
```

---

## 7. Questions for the Auditor

1. **Is our SplitXCH API request format correct?** We send `recipients` with `name`, `address`, `points`, `id`. Points sum to 9850. Compare with the official builder's `splitxch-api.service.ts` at https://github.com/Koba42Corp/splitxch-builder/blob/main/client/src/app/services/splitxch-api.service.ts

2. **Why does the initial POST return HTTP 200 + address but the status check shows `error: true`?** Is this a transient SplitXCH backend issue, or are we triggering a failure with our specific inputs?

3. **Is there authentication or rate limiting we're missing?** The API docs don't mention any API key.

4. **Is the puzzle address returned by the POST valid even if the status check fails?** The address is computed deterministically from the CLVM puzzle. Does the "test transaction" failure mean the address is invalid, or just that their test didn't complete?

5. **Could we compute the puzzle hash ourselves?** The compiled puzzle hex is published: https://github.com/trgarrett/chialisp/blob/main/royalty_share/clsp/p2_royalty_share_arbitrary_shares/p2_royalty_share_arbitrary_shares_rest_to_last.clsp.hex. We could curry in our payout scheme and hash it ourselves in TypeScript, bypassing SplitXCH's API entirely while still using the same puzzle.

6. **Is `prepare.ts` being called for any active mints?** It's marked `@deprecated` but still deployed with active SplitXCH calls that were NOT disabled.

---

## 8. How to Reproduce

### Test SplitXCH API directly:
```bash
# Create a new split
curl -s -XPOST 'https://splitxch.com/api/compute/fast' \
  -H 'Content-Type: application/json' \
  -d '{"recipients":[{"name":"minter","address":"xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk","points":8258,"id":1},{"name":"treasury","address":"xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd","points":1592,"id":2}]}'

# Note the "id" field from the response, then:
curl -s 'https://splitxch.com/api/compute/<ID>'
```

### Test the docs sample (should succeed):
```bash
curl -s -XPOST 'https://splitxch.com/api/compute/fast' \
  -H 'Content-Type: application/json' \
  -d '{"recipients":[{"name":"hot","address":"xch12pfws6enm2jeqjt03pspqg6sjh50g86hl9xm24dx4cwwm2l88nmqrrznj7","points":9850,"id":1}]}'
```

### Check cached entries in D1:
```sql
SELECT * FROM splitter_addresses;
SELECT COUNT(*) FROM splitter_addresses;
```

### Verify an on-chain NFT royalty address:
Use MintGarden API to get an NFT's `royalty_address` puzzle hash, then compare with:
- The minter's wallet puzzle hash (bech32m decode)
- The D1-cached splitter address puzzle hash

```python
# bech32m decode helper (Python):
from chia.util.bech32m import decode_puzzle_hash
print(decode_puzzle_hash("xch1...").hex())
```

---

## 9. Files to Read (Priority Order)

1. **`functions/api/mint/splitxch.ts`** — The SplitXCH integration (recently updated with verification)
2. **`functions/api/mint/process.ts`** — Main mint pipeline, SplitXCH disabled at lines 325-358
3. **`functions/api/mint/request.ts`** — Line 160: the fallback logic
4. **`functions/api/mint/prepare.ts`** — Deprecated but still has active SplitXCH calls (lines 422, 588)
5. **`functions/migrations/047_splitxch.sql`** — Database schema
6. **`wrangler.toml`** — Environment variables (TREASURY_ADDRESS, PHASE2_ROYALTY_PCT)

---

## 10. Summary

| Component | Status |
|---|---|
| SplitXCH API call format | ✅ Matches official builder |
| Verification polling | ✅ Implemented, catches failed computes |
| D1 caching | ✅ Works, but all 45 cached addresses are from failed computes |
| Fallback to minter wallet | ✅ Working correctly |
| SplitXCH disabled in process.ts | ✅ Done |
| SplitXCH disabled in prepare.ts | ❌ NOT done (still active) |
| SplitXCH backend provisioning | ❌ Failing for ALL new computes |
| Treasury receiving royalties | ❌ Getting 0% (all royalties go to minter) |
