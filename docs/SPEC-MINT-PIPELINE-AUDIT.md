# SPEC: Your Wojak Minting Pipeline — Audit & Fixes

> **For Claude CLI:** This is a complete audit spec. Read this entire file first, then read every file referenced before writing any code. Implement fixes in the order listed. Run `npm run typecheck && npm run build` after each fix section.

---

## Prompt for Claude CLI

```
Read docs/SPEC-MINT-PIPELINE-AUDIT.md in full. This is your implementation spec.

Before writing any code, read these files:
1. functions/api/mint/prepare.ts (full — 695 lines, the core pipeline)
2. functions/api/mint/confirm.ts (wallet verification)
3. functions/api/mint/upload.ts (IPFS upload)
4. functions/api/mint/request.ts (MintGarden API)
5. functions/api/mint/_shared.ts (surcharge formula, wallet validation)
6. functions/api/mint/pricing.ts (pricing endpoint)
7. functions/api/credits/balance.ts (wallet validation bug)
8. functions/api/credits/history.ts (wallet validation bug)
9. src/lib/traitNameMap.ts (canonical trait names — THE source of truth)
10. src/lib/traitMapping.ts (G1 ↔ G2 mapping)
11. src/components/generator/MetadataPreview.tsx (client-side metadata preview)

Then implement the fixes in order: FIX 1 through FIX 6.
After each fix, run: npm run typecheck && npm run build
Do NOT refactor anything outside the scope of each fix.
Do NOT change any file not explicitly listed in the fix.

CRITICAL WARNINGS (read before implementing):
- D1 does NOT support POWER(). Use exp(ln(0.5) * x) instead. See FIX 5.
- FIX 4 covers 4 files, not just balance.ts. Read the full fix.
- FIX 2 requires explicit error handling — uploadToIPFS must throw on failure.
- FIX 5 is a COMPLETE REWRITE of the surcharge system. Delete old formula entirely.
  New formula: fair-share pricing with category-aware quadratic penalty.
  Surcharges ONLY on Head, Clothes, Face Wear. NOT on Mouth, Face, Background, Base.
  "No Headgear" and "No Face Wear" are EXEMPT from surcharge.
```

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [FIX 1: Eliminate Metadata Name Drift](#fix-1)
3. [FIX 1a: Fill Missing traitNameMap Entries](#fix-1a)
4. [FIX 2: Self-Fetch Elimination](#fix-2)
5. [FIX 3: Harden Confirm Endpoint](#fix-3)
6. [FIX 4: Fix Wallet Validation Across All Endpoints](#fix-4)
7. [FIX 5: Surcharge Formula — Fair-Share Pricing with Time Decay (CRITICAL)](#fix-5)
8. [FIX 6: G2 Trait Representation in Metadata](#fix-6)
9. [Known Limitation: Mint Number on IPFS Failure](#known-limitation-mint-number)
10. [Files Changed Summary](#files-summary)
11. [Verification Checklist](#verification)

---

<a id="1-system-overview"></a>
## 1. System Overview

### What This Pipeline Does

The Your Wojak minting pipeline:
1. User designs a Wojak in the generator (9 layers, optional colors)
2. Frontend exports a WebP image + layer/color selections
3. Backend validates, reserves an atomic mint number, builds CHIP-0007 metadata
4. Image + metadata uploaded to Pinata IPFS (3 gateway URIs each)
5. MintGarden Dynamic Minting API creates the NFT on Chia blockchain
6. For paid: returns offer file, user accepts in Sage wallet
7. For free: NFT minted directly, credits deducted atomically

### The 7 Canonical Trait Types

Your Wojak metadata must use the same 7 trait types as Wojak Farmers Plot:

| Trait Type | Generator Layers | Values |
|-----------|-----------------|--------|
| **Base** | (fixed) | Always "Wojak" |
| **Face** | Base files | Classic, Rekt, Rugged, Bleeding Bags, Terminator, NPC |
| **Mouth** | MouthBase, MouthItem, FacialHair | 20 values (Numb, Cig, Screaming, etc.) |
| **Face Wear** | Eyes, Mask | 18 values (MOG Glasses, Aviators, etc.) |
| **Head** | Head | 40 values (Crown, Fedora, etc.) |
| **Clothes** | Clothes | 36 values (Suit, Tee, Astronaut, etc.) |
| **Background** | Background | 45 values ($BEPE, NYSE Pump, etc.) + solid colors |

### The Single Source of Truth

**`src/lib/traitNameMap.ts`** contains `TRAIT_NAME_MAP` — a lookup table of ~280 entries mapping every possible generator file identifier (lowercase) to its canonical Phase 1 display name. This was built directly from the Wojak Farmers Plot metadata.json (4200 NFTs, 179 unique trait values).

Examples:
- `'firefigther uniform'` → `'Firefighter Uniform'` (fixes G1 typo)
- `'straigth jacket'` → `'Straitjacket'` (fixes G2 typo)
- `'alpha shades blue'` → `'Alpha Shades'` (strips color variant)
- `'medievalbepe cowboy'` → `'Fake It Mask'` (maps mask to Phase 1 name)
- `'super mario'` → `'Super Wojak Hat'` (brand-safe name)
- `'god rope'` → `"God's Robe"` (fixes G1 typo)

This map already handles G1 files, G2 traits, typos, color variants, and edge cases. **It must be the only place trait name resolution happens.**

---

<a id="fix-1"></a>
## FIX 1: Eliminate Metadata Name Drift (CRITICAL)

### The Problem

There are **two separate implementations** of trait name cleaning:

1. **Client-side:** `MetadataPreview.tsx` uses `lookupTraitName()` from `traitNameMap.ts` — the canonical map.
2. **Server-side:** `prepare.ts` has its own `cleanTraitDisplayName()` + `applyDisplayCorrections()` — a 170-line reimplementation with hardcoded corrections.

These WILL drift. When a new trait is added or a correction is made, it must be updated in two places. Worse, the server-side implementation may produce names that don't match Phase 1 metadata. For example:
- The server might produce `"Mom's Basement"` but Phase 1 metadata says `"Moms Basement"` (no apostrophe)
- The server's `titleCase()` might produce `"Nyse Dump"` instead of `"NYSE Dump"`

### The Fix

**Move `traitNameMap.ts` to a shared location** and use it on the server. Delete `cleanTraitDisplayName` and `applyDisplayCorrections` from `prepare.ts`.

### Step-by-Step

#### 1.1 Copy `TRAIT_NAME_MAP` to a shared module

Create **`functions/lib/traitNameMap.ts`** — a server-side copy of the canonical map.

```typescript
/**
 * Canonical trait name lookup for NFT metadata.
 * Source of truth: Wojak Farmers Plot metadata (4200 NFTs, 179 unique trait values).
 *
 * IMPORTANT: This map must stay in sync with src/lib/traitNameMap.ts.
 * Both files contain the same TRAIT_NAME_MAP. If you add a trait, add it to BOTH.
 * A future improvement could share this via a build step, but for now keep them synced.
 */
```

Copy the entire `TRAIT_NAME_MAP` object and the `lookupTraitName` function from `src/lib/traitNameMap.ts`. Also copy `BACKGROUND_COLOR_NAMES` and `lookupBackgroundColorName` (needed for solid-color backgrounds).

Do NOT copy the `export` of types or anything React-specific. This is a pure data + lookup module.

#### 1.2 Replace `cleanTraitDisplayName` in `prepare.ts`

**Remove** these functions entirely from `prepare.ts`:
- `cleanTraitDisplayName()` (lines 70-111)
- `applyDisplayCorrections()` (lines 117-229)
- `titleCase()` (lines 231-239)

**Replace** with an import and a simple resolver:

```typescript
import { lookupTraitName, lookupBackgroundColorName } from '../../lib/traitNameMap';

/**
 * Resolve a generator layer path to its canonical Phase 1 trait name.
 * Uses the definitive TRAIT_NAME_MAP — same source as MetadataPreview.
 *
 * Fallback: if the map doesn't contain the identifier, use the cleaned
 * filename as-is (for new traits not yet in Phase 1).
 */
function resolveTraitName(filepath: string, layerKey: string): string {
  // G2 virtual paths: /g2/Category/trait-name
  if (filepath.startsWith('/g2/')) {
    const traitName = filepath.split('/').pop() || '';
    const cleaned = traitName.replace(/[-_]/g, ' ').trim().toLowerCase();
    const mapped = lookupTraitName(cleaned);
    if (mapped) return mapped;
    // Fallback: title-case the cleaned name
    return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // G1 file paths: extract filename, strip prefix, normalize
  const filename = filepath.split('/').pop()?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || '';

  // Strip ALL-CAPS layer prefix (BACKGROUND_, BASE_, HEAD_, EXTRA_MOUTH_, etc.)
  let stripped = filename.replace(/^[A-Z]+_/, '');
  stripped = stripped.replace(/^MOUTH_/i, ''); // Handle EXTRA_MOUTH_ double prefix

  // Strip "Base-Wojak_" prefix
  stripped = stripped.replace(/^Base-Wojak[_\s]*/i, '');

  // Normalize for lookup: replace hyphens/underscores with spaces, lowercase
  const normalized = stripped.replace(/[-_]/g, ' ').trim().toLowerCase();

  // Look up in canonical map
  const mapped = lookupTraitName(normalized);
  if (mapped) return mapped;

  // Fallback: title-case (for traits not in Phase 1 — new G2-only traits)
  return normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
```

#### 1.3 Update metadata building in `prepare.ts`

In the metadata building section (currently around lines 410-418), replace:
```typescript
value: cleanTraitDisplayName(value, layer),
```
with:
```typescript
value: resolveTraitName(value, layer),
```

#### 1.4 Handle the "Super Saiyan" layer override

`traitNameMap.ts` maps `'super saiyan'` → `'Super Saiyan'` (the Head value). But when it appears as a Clothes trait, it should be `'Super Saiyan Uniform'`. The client handles this in MetadataPreview via `LAYER_OVERRIDES`.

Add this after the `resolveTraitName` call in the metadata building loop:

```typescript
// Layer-specific overrides (same logic as MetadataPreview LAYER_OVERRIDES)
const LAYER_OVERRIDES: Record<string, Record<string, string>> = {
  Clothes: {
    'Super Saiyan': 'Super Saiyan Uniform',
    'SWAT': 'SWAT Gear',
  },
  Head: {
    'SWAT': 'SWAT Helmet',
  },
};

// In the loop:
let displayName = resolveTraitName(value, layer);
const override = LAYER_OVERRIDES[layer]?.[displayName];
if (override) displayName = override;
```

#### 1.5 Verification

After this fix, the server-side metadata building should produce identical trait names to the client-side MetadataPreview for every possible layer selection. To verify:

- `resolveTraitName('HEAD_Firefigther-Helmet.png', 'Head')` → `'Firefighter Helmet'`
- `resolveTraitName('CLOTHES_Straigth-jacket.png', 'Clothes')` → `'Straitjacket'`
- `resolveTraitName('BACKGROUND_MomΓÇÖs Basement.png', 'Background')` → `'Moms Basement'`
- `resolveTraitName('EYE_Alpha-Shades_blue.png', 'Eyes')` → `'Alpha Shades'`
- `resolveTraitName('/g2/Clothes/Straigth-jacket', 'Clothes')` → `'Straitjacket'`
- `resolveTraitName('CLOTHES_Super-Saiyan-Uniform.png', 'Clothes')` with layer override → `'Super Saiyan Uniform'`

---

<a id="fix-1a"></a>
## FIX 1a: Fill Missing traitNameMap Entries (CRITICAL)

### The Problem

The `TRAIT_NAME_MAP` relies on a title-case fallback for traits not in the map. This works for most simple names but **fails for names requiring non-standard casing**. I verified this against the actual Wojak Farmers Plot metadata.json (4200 NFTs).

### Missing Entries That Produce Wrong Names

| Normalized Input | Fallback (WRONG) | Phase 1 Correct | Status |
|-----------------|-------------------|-----------------|--------|
| `'nyse rug'` | `'Nyse Rug'` | `'NYSE Rug'` | **MISSING** |
| `'npc'` | `'Npc'` | `'NPC'` | **MISSING** |

### Entries to Add

Add these to BOTH `src/lib/traitNameMap.ts` AND `functions/lib/traitNameMap.ts`:

```typescript
// === Face (add near other Face entries) ===
'npc': 'NPC',

// === Background (add near other NYSE entries) ===
'nyse rug': 'NYSE Rug',
```

### Why This Matters

These names are written into **immutable IPFS metadata** on the blockchain. If `'Nyse Rug'` gets minted once, that NFT has wrong metadata forever. There is no way to fix it after the fact. Every entry must be verified against Phase 1 metadata before launch.

### Full Audit Step

After adding the missing entries, run this verification (Claude CLI should do this):

```bash
# Extract all Phase 1 trait values and check each one resolves correctly
# through the traitNameMap + title-case fallback
node -e '
const data = require("./public/assets/nft-data/metadata.json");
const seen = new Set();
for (const nft of data) {
  for (const attr of nft.attributes || []) {
    const key = attr.trait_type + ":" + attr.value;
    if (seen.has(key)) continue;
    seen.add(key);
    // Simulate the fallback title-case
    const lower = attr.value.toLowerCase();
    const titleCased = lower.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    if (titleCased !== attr.value && !lower.startsWith("$")) {
      console.log("NEEDS MAP ENTRY: " + JSON.stringify(lower) + " → " + JSON.stringify(attr.value) + " (fallback gives: " + JSON.stringify(titleCased) + ")");
    }
  }
}
console.log("Done.");
'
```

If this produces any output, those entries must be added to the map.

---

<a id="fix-2"></a>
## FIX 2: Self-Fetch Elimination (HIGH)

### The Problem

`prepare.ts` (line 464-483) makes an HTTP fetch to its own `/api/mint/upload` endpoint:

```typescript
const uploadUrl = new URL('/api/mint/upload', request.url).toString();
const uploadRes = await fetch(uploadUrl, { ... });
```

This is a self-fetch anti-pattern (documented in CLAUDE.md). Problems:
- Adds unnecessary network latency (round-trip through Cloudflare edge)
- Can fail on cold starts or routing issues even though the function is running
- The `X-Internal-Mint-Request` header guard is security theater — the secret is in the same runtime

### The Fix

Extract the upload logic from `upload.ts` into a shared function. Call it directly from `prepare.ts`.

### Step-by-Step

#### 2.1 Create `functions/api/mint/uploadToIPFS.ts`

Extract the core upload logic from `upload.ts` into a pure function:

```typescript
/**
 * IPFS Upload — shared logic for uploading image + metadata to Pinata.
 *
 * Extracted from upload.ts to eliminate self-fetch anti-pattern.
 * Can be called directly from prepare.ts without an HTTP round-trip.
 */

export interface IPFSUploadResult {
  dataHash: string;
  dataUris: string[];
  metadataHash: string;
  metadataUris: string[];
}

export async function uploadToIPFS(
  imageBase64: string,
  metadata: Record<string, unknown>,
  pinataJwt: string
): Promise<IPFSUploadResult> {
  // ... move the core logic from upload.ts lines 84-143 here
  // Decode base64, SHA256, pin to Pinata, generate 3 gateway URIs
  // Same for metadata JSON
  // Return the result object
}
```

Move these helper functions from `upload.ts` into the new file:
- `base64ToUint8Array()`
- `sha256Hex()`

Keep `upload.ts` as a thin HTTP wrapper that calls `uploadToIPFS()` — this preserves the manual trigger endpoint for testing.

#### 2.2 Update `upload.ts` to use the shared function

```typescript
import { uploadToIPFS } from './uploadToIPFS';

// ... validation stays the same ...

const result = await uploadToIPFS(imageBase64, metadata as Record<string, unknown>, jwt);
return jsonResponse(result);
```

#### 2.3 Update `prepare.ts` to call directly

Replace lines 462-483 (the self-fetch block):

```typescript
import { uploadToIPFS } from './uploadToIPFS';

// ... in the handler, replace the fetch block with:
const jwt = env.PINATA_JWT;
if (!jwt) {
  return errorResponse('IPFS upload not configured', 503);
}
const uploadData = await uploadToIPFS(imageBase64, metadata as Record<string, unknown>, jwt);
```

Remove the `uploadUrl`, `uploadHeaders`, and `uploadRes` variables.

#### 2.4 Error Handling — uploadToIPFS Must Throw on Failure

The old self-fetch returned HTTP errors that `prepare.ts` checked. The new direct call must have equivalent error handling. `uploadToIPFS()` should **throw** with a descriptive message on failure. Do NOT return partial results.

```typescript
// In uploadToIPFS:
if (!pinFileRes.ok) {
  const err = await pinFileRes.text();
  console.error('[IPFS Upload] Pinata file error:', pinFileRes.status, err);
  throw new Error(`IPFS image upload failed: HTTP ${pinFileRes.status}`);
}

// Similarly for metadata upload:
if (!pinJsonRes.ok) {
  const err = await pinJsonRes.text();
  console.error('[IPFS Upload] Pinata JSON error:', pinJsonRes.status, err);
  throw new Error(`IPFS metadata upload failed: HTTP ${pinJsonRes.status}`);
}
```

In `prepare.ts`, wrap the call in try/catch:

```typescript
let uploadData: IPFSUploadResult;
try {
  uploadData = await uploadToIPFS(imageBase64, metadata as Record<string, unknown>, jwt);
} catch (error) {
  console.error('[Mint Prepare] IPFS upload failed:', error);
  return errorResponse(
    error instanceof Error ? error.message : 'IPFS upload failed',
    502
  );
}
```

Also validate the 2MB limit inside `uploadToIPFS` (not just in the HTTP wrapper):

```typescript
const imageBytes = base64ToUint8Array(imageBase64);
if (imageBytes.length > 2 * 1024 * 1024) {
  throw new Error('Image too large (max 2MB)');
}
```

#### 2.5 Keep the INTERNAL_API_HEADER in upload.ts

The `X-Internal-Mint-Request` header in `upload.ts` still serves as a guard against direct public access to the upload endpoint. Keep it in `upload.ts` for the HTTP path. It's just no longer needed for the prepare→upload call since that's now a direct function call.

---

<a id="fix-3"></a>
## FIX 3: Harden Confirm Endpoint (MEDIUM)

### The Problem

`confirm.ts` line 70-73:

```typescript
const callerWallet = body.walletAddress;
if (!callerWallet) {
  return errorResponse('Missing walletAddress', 400);
}
```

The wallet is checked for presence but **not validated with `isValidChiaAddress()`**. An attacker could send `walletAddress: "xch1"` (too short) and it would pass the presence check. More importantly, the string comparison on line 88 (`callerWallet !== row.wallet_address`) could be bypassed with case manipulation if the DB stores addresses differently than the request sends them.

### The Fix

#### 3.1 Add proper wallet validation

In `confirm.ts`, import `isValidChiaAddress` and validate:

```typescript
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,  // ADD THIS
} from './_shared';

// Replace lines 70-73 with:
const callerWallet = body.walletAddress;
if (!callerWallet || !isValidChiaAddress(callerWallet)) {
  return errorResponse('Missing or invalid walletAddress', 400);
}
```

#### 3.2 Normalize wallet comparison

Chia addresses are case-sensitive (bech32m lowercase), but ensure consistent comparison:

```typescript
// Line 88: normalize both sides
if (callerWallet.toLowerCase() !== row.wallet_address.toLowerCase()) {
  return errorResponse('Wallet address does not match this mint', 403);
}
```

---

<a id="fix-4"></a>
## FIX 4: Fix Wallet Validation Across All Endpoints (LOW)

### The Problem

Multiple endpoints use `startsWith('xch1')` instead of the proper `isValidChiaAddress()` regex. This accepts strings like `"xch1zzz"` (too short) or `"xch1AAAA..."` (uppercase, invalid bech32m).

**All instances found:**

| File | Line | Current Code |
|------|------|-------------|
| `functions/api/credits/balance.ts` | 81 | `wallet.startsWith('xch1')` |
| `functions/api/credits/history.ts` | 55 | `wallet.startsWith('xch1')` |
| `functions/api/chat/token.ts` | 168 | `address.startsWith('xch1')` |
| `functions/api/chat/verify-eligibility.ts` | 184 | `address.startsWith('xch1')` |

### The Fix

#### 4.1 Move `isValidChiaAddress` to a shared location

Since multiple directories need it, create **`functions/lib/validation.ts`**:

```typescript
/**
 * Shared validation utilities.
 * Single source of truth for address validation across all API endpoints.
 */

/**
 * Validate Chia bech32m wallet address format.
 * xch1 prefix + 58 bech32 characters = 62 total.
 */
export function isValidChiaAddress(address: string): boolean {
  return /^xch1[a-z0-9]{58}$/.test(address);
}
```

#### 4.2 Update `_shared.ts` to re-export

In `functions/api/mint/_shared.ts`, replace the local `isValidChiaAddress` with a re-export:

```typescript
// Replace the local function with:
export { isValidChiaAddress } from '../../lib/validation';
```

This ensures existing imports from `_shared` still work without changes.

#### 4.3 Fix each file

**`functions/api/credits/balance.ts`** — line 81:
```typescript
import { isValidChiaAddress } from '../../lib/validation';
// Replace: if (!wallet || !wallet.startsWith('xch1'))
// With:    if (!wallet || !isValidChiaAddress(wallet))
```

**`functions/api/credits/history.ts`** — line 55:
```typescript
import { isValidChiaAddress } from '../../lib/validation';
// Replace: if (!wallet || !wallet.startsWith('xch1'))
// With:    if (!wallet || !isValidChiaAddress(wallet))
```

**`functions/api/chat/token.ts`** — line 168:
```typescript
import { isValidChiaAddress } from '../../lib/validation';
// Replace: address.startsWith('xch1') && ...
// With:    isValidChiaAddress(address) && ...
// Note: check the surrounding context — if there's also a length check, remove it (the regex handles length)
```

**`functions/api/chat/verify-eligibility.ts`** — line 184:
```typescript
import { isValidChiaAddress } from '../../lib/validation';
// Same pattern as token.ts
```

---

<a id="fix-5"></a>
## FIX 5: Surcharge Formula — Fair-Share Pricing with Time Decay (CRITICAL)

### The Current Formula (REPLACING)

From `_shared.ts`:

```typescript
surchargeXch(usageCount) = 0.2 * ln(1 + usageCount / 20)
```

Problems with the old formula:
- **Logarithmic (concave)** — flattens at high usage. 1000 uses only costs 0.786 XCH surcharge.
- **Category-blind** — treats Crown at 100 uses (nearly exhausted for Head) the same as Cig at 100 uses (barely half of Mouth's capacity).
- **Cumulative, no decay** — popular traits stay permanently expensive.
- **Too conservative** — doesn't create enough economic pressure to distribute trait usage evenly.

### The New System: Fair-Share Pricing

#### Design Goals

1. **Equal distribution** — price pressure should steer users toward underused traits
2. **Category-aware** — a trait's "expensiveness" is relative to how many options exist in its category
3. **Accelerating** — price grows gently at first, then hits a wall past fair share
4. **Self-healing** — prices decay over time so traits become affordable again if demand drops
5. **Only on cosmetic choices** — surcharge categories that represent true player preference

#### Which Categories Get Surcharges

| Category | Surcharge? | Options | Fair Share | Reason |
|----------|-----------|---------|------------|--------|
| **Head** | ✅ YES | 40 | 105 | Pure cosmetic choice, high-value traits like Crown |
| **Clothes** | ✅ YES | 36 | 117 | Pure cosmetic choice |
| **Face Wear** | ✅ YES | 18 | 233 | Optional cosmetic (can choose "No Face Wear") |
| **Mouth** | ❌ NO | 20 | — | Mandatory base mouth + rarity-override system makes surcharge unfair |
| **Face** | ❌ NO | 6 | — | Core identity, only 6 options |
| **Background** | ❌ NO | 57 | — | Cosmetic backdrop, not a rarity driver |
| **Base** | ❌ NO | 1 | — | Always "Wojak" |

**Why exclude Mouth:** Every NFT requires a base mouth (Numb, Smile, Gold Teeth, Teeth, or Screaming). Users can add overlays (Cig, Pipe) and facial hair (Neckbeard), but metadata records only the rarest mouth-category trait (via PHASE1_RARITY). Surcharging Mouth would penalize users for mandatory selections and for the rarity-override system picking a trait they didn't specifically choose.

#### Surcharge-Exempt Trait Values

Within surcharge categories, these "none" values must NEVER be surcharged:

```typescript
export const SURCHARGE_EXEMPT_TRAITS: Set<string> = new Set([
  'No Headgear',    // Head category — user chose no head trait
  'No Face Wear',   // Face Wear category — user chose no face wear
]);
```

These are actual trait values in the metadata (verified against Phase 1 Wojak Farmers Plot data). When a user selects no headgear or no face wear, the metadata still records these values, but they must be skipped in surcharge calculation.

#### The Formula

```
surcharge = RAMP_RATE × r + PENALTY_SCALE × max(0, r - 1)²

where r = effectiveUsage / fairShare
      fairShare = TOTAL_SUPPLY / numberOfOptionsInCategory
```

**Constants:**
```typescript
export const SURCHARGE_RAMP_RATE = 1.0;      // Linear growth rate (gentle always-on increase)
export const SURCHARGE_PENALTY_SCALE = 8.0;   // Quadratic penalty multiplier past fair share
export const SURCHARGE_PENALTY_EXPONENT = 2.0; // Quadratic (accelerating past fair share)
export const TOTAL_SUPPLY = 4200;
export const DECAY_HALF_LIFE_DAYS = 30;

// Fair share per surcharge category
export const SURCHARGE_FAIR_SHARES: Record<string, number> = {
  'Head': Math.round(TOTAL_SUPPLY / 40),       // 105
  'Clothes': Math.round(TOTAL_SUPPLY / 36),     // 117
  'Face Wear': Math.round(TOTAL_SUPPLY / 18),   // 233
};

// Categories that have surcharges
export const SURCHARGE_CATEGORIES = new Set(Object.keys(SURCHARGE_FAIR_SHARES));
```

**Base mint price:** 0.200 XCH (defined as `BASE_PRICE_XCH` in `prepare.ts`). Total price = base + surcharge.

**Two components working together:**
- **Linear ramp** (`1.0 × r`) — gentle, always-on price increase from the very first use
- **Quadratic penalty** (`8.0 × (r-1)²`) — explodes past fair share, creating a price wall

#### Key Behavior

Every surcharge category reaches the same milestone price at its fair share:

| Category | Options | Fair Share | Price @ Fair Share |
|----------|---------|-----------|-------------------|
| Head | 40 | 105 | 1.20 XCH |
| Clothes | 36 | 117 | 1.20 XCH |
| Face Wear | 18 | 233 | 1.20 XCH |

Past fair share, the quadratic wall makes overuse brutally expensive.

### Step-by-Step Implementation

#### 5.1 Schema Change — Track usage timestamps

Create a new migration file: **`functions/migrations/034_trait_decay.sql`**

```sql
-- Add a rolling usage score that decays over time.
-- The updated_at column already exists; we add last_decay_at to track
-- when we last applied decay, and effective_usage as the decayed score.
ALTER TABLE trait_usage ADD COLUMN effective_usage REAL NOT NULL DEFAULT 0;
ALTER TABLE trait_usage ADD COLUMN last_decay_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Backfill: set effective_usage = usage_count for existing rows
UPDATE trait_usage SET effective_usage = usage_count, last_decay_at = datetime('now');
```

#### 5.2 Replace surcharge formula in `_shared.ts`

**Remove** the old constants and function:
```typescript
// DELETE THESE:
export const SURCHARGE_BASE = 0.2;
export const SURCHARGE_USES_DIVISOR = 20;
export function surchargeXch(usageCount: number): number { ... }
```

**Replace with:**

```typescript
// ─── Surcharge: Fair-Share Pricing ───

export const TOTAL_SUPPLY = 4200;
export const SURCHARGE_RAMP_RATE = 1.0;
export const SURCHARGE_PENALTY_SCALE = 8.0;
export const SURCHARGE_PENALTY_EXPONENT = 2.0;
export const DECAY_HALF_LIFE_DAYS = 30;

/** Fair share = ideal usage per trait if all traits used equally */
export const SURCHARGE_FAIR_SHARES: Record<string, number> = {
  'Head': Math.round(TOTAL_SUPPLY / 40),       // 105
  'Clothes': Math.round(TOTAL_SUPPLY / 36),     // 117
  'Face Wear': Math.round(TOTAL_SUPPLY / 18),   // 233
};

/** Only these categories have surcharges */
export const SURCHARGE_CATEGORIES = new Set(Object.keys(SURCHARGE_FAIR_SHARES));

/** Trait values within surcharge categories that are exempt (none/default) */
export const SURCHARGE_EXEMPT_TRAITS = new Set([
  'No Headgear',
  'No Face Wear',
]);

/**
 * Calculate surcharge for a trait based on its effective (decayed) usage
 * and the fair share for its category.
 *
 * Formula: RAMP_RATE × r + PENALTY_SCALE × max(0, r - 1)²
 * where r = effectiveUsage / fairShare
 *
 * Returns 0 if the category has no surcharge or the trait is exempt.
 */
export function surchargeXch(
  effectiveUsage: number,
  traitCategory: string,
  traitDisplayName?: string
): number {
  const fairShare = SURCHARGE_FAIR_SHARES[traitCategory];
  if (!fairShare) return 0; // Category not surcharge-eligible

  if (traitDisplayName && SURCHARGE_EXEMPT_TRAITS.has(traitDisplayName)) return 0;

  const ratio = effectiveUsage / fairShare;
  const ramp = SURCHARGE_RAMP_RATE * ratio;
  const overshoot = Math.max(0, ratio - 1);
  const penalty = SURCHARGE_PENALTY_SCALE * Math.pow(overshoot, SURCHARGE_PENALTY_EXPONENT);
  return ramp + penalty;
}

/**
 * Apply time decay to an effective usage score.
 * Returns the decayed score based on time elapsed since last decay.
 */
export function applyDecay(effectiveUsage: number, lastDecayAt: string): number {
  const now = Date.now();
  const lastDecay = new Date(lastDecayAt).getTime();
  const daysSinceDecay = (now - lastDecay) / (1000 * 60 * 60 * 24);
  if (daysSinceDecay <= 0) return effectiveUsage;

  const decayFactor = Math.pow(0.5, daysSinceDecay / DECAY_HALF_LIFE_DAYS);
  return effectiveUsage * decayFactor;
}
```

#### 5.3 Update `prepare.ts` surcharge calculation

Replace the surcharge section (currently lines 592-612) to use fair-share pricing:

```typescript
import {
  surchargeXch,
  applyDecay,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
} from './_shared';

// Fetch trait usage with decay info
const traitRows = await env.DB.prepare(
  'SELECT trait_category, trait_name, usage_count, effective_usage, last_decay_at FROM trait_usage'
).all<{
  trait_category: string;
  trait_name: string;
  usage_count: number;
  effective_usage: number;
  last_decay_at: string;
}>();

// Calculate surcharge — only for Head, Clothes, Face Wear
// Take the single highest surcharge across all selected traits
let maxSurcharge = 0;
let highestTrait: string | null = null;

for (const [traitType, displayName] of Object.entries(metadataAttributes)) {
  // Skip non-surcharge categories
  if (!SURCHARGE_CATEGORIES.has(traitType)) continue;

  // Skip exempt traits (No Headgear, No Face Wear)
  if (SURCHARGE_EXEMPT_TRAITS.has(displayName)) continue;

  // Find usage row for this trait
  const row = (traitRows.results || []).find(
    r => r.trait_category === traitType && r.trait_name === displayName
  );
  const decayedUsage = row ? applyDecay(row.effective_usage, row.last_decay_at) : 0;
  const traitSurcharge = surchargeXch(decayedUsage, traitType, displayName);

  if (traitSurcharge > maxSurcharge) {
    maxSurcharge = traitSurcharge;
    highestTrait = `${traitType}: ${displayName}`;
  }
}
```

**Important:** The surcharge lookup should use the **resolved display name** (from `resolveTraitName` in FIX 1) and the **mapped trait_type** (Head, Clothes, Face Wear), not the raw layer key. This ensures the surcharge matches exactly what goes into the metadata.

#### 5.4 Update trait_usage increment to refresh decay

When a trait is used (in both `prepare.ts` free mint and `confirm.ts` paid mint), update the increment to also refresh the decayed score. **Only increment for surcharge-eligible traits** — skip Mouth, Face, Background, Base:

```typescript
import { SURCHARGE_CATEGORIES, SURCHARGE_EXEMPT_TRAITS, DECAY_HALF_LIFE_DAYS } from './_shared';

// In the trait usage increment loop:
for (const [traitType, displayName] of Object.entries(metadataAttributes)) {
  if (!displayName) continue;
  // Skip exempt none-values (still record usage_count but not effective_usage)
  const isExempt = SURCHARGE_EXEMPT_TRAITS.has(displayName);

  // Always increment usage_count (for analytics), but only
  // update effective_usage for surcharge-eligible traits
  if (SURCHARGE_CATEGORIES.has(traitType) && !isExempt) {
    await env.DB.prepare(
      `INSERT INTO trait_usage (trait_category, trait_name, usage_count, effective_usage, last_decay_at, updated_at)
       VALUES (?, ?, 1, 1, datetime('now'), datetime('now'))
       ON CONFLICT(trait_category, trait_name) DO UPDATE SET
         usage_count = usage_count + 1,
         effective_usage = effective_usage * exp(
           ln(0.5) * (julianday('now') - julianday(last_decay_at)) / ?
         ) + 1,
         last_decay_at = datetime('now'),
         updated_at = datetime('now')`
    )
      .bind(traitType, displayName, DECAY_HALF_LIFE_DAYS)
      .run();
  } else {
    // Non-surcharge categories: track usage_count only (for analytics/display)
    await env.DB.prepare(
      `INSERT INTO trait_usage (trait_category, trait_name, usage_count, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(trait_category, trait_name) DO UPDATE SET
         usage_count = usage_count + 1,
         updated_at = datetime('now')`
    )
      .bind(traitType, displayName)
      .run();
  }
}
```

**CRITICAL: D1 does NOT support `POWER()`.** Use `exp(ln(0.5) * x)` instead.
D1 supports: `exp()`, `ln()`, `julianday()`, `datetime()`.
D1 does NOT support: `POWER()`, `POW()`, `LOG()`, `LOG10()`.
This has been verified against a real D1 instance.

#### 5.5 Update `pricing.ts` to return fair-share surcharges

The pricing endpoint should return category-aware surcharges so the frontend shows accurate prices:

```typescript
import {
  surchargeXch,
  applyDecay,
  SURCHARGE_CATEGORIES,
  SURCHARGE_FAIR_SHARES,
  SURCHARGE_EXEMPT_TRAITS,
} from './_shared';

// In the handler, replace the surcharge calculation:
const traitRows = await env.DB.prepare(
  'SELECT trait_category, trait_name, usage_count, effective_usage, last_decay_at FROM trait_usage'
).all<{
  trait_category: string;
  trait_name: string;
  usage_count: number;
  effective_usage: number;
  last_decay_at: string;
}>();

interface TraitPricing {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
  fairShare: number;
  percentOfFairShare: number;
}

const traits: Record<string, TraitPricing> = {};
for (const r of traitRows.results || []) {
  const decayed = applyDecay(r.effective_usage, r.last_decay_at);
  const fairShare = SURCHARGE_FAIR_SHARES[r.trait_category] || 0;
  const sc = surchargeXch(decayed, r.trait_category, r.trait_name);

  traits[`${r.trait_category}_${r.trait_name}`] = {
    usageCount: r.usage_count,
    effectiveUsage: Math.round(decayed * 100) / 100,
    surchargeXch: Math.round(sc * 1000) / 1000,
    fairShare,
    percentOfFairShare: fairShare > 0 ? Math.round(decayed / fairShare * 100) : 0,
  };
}
```

The frontend can use `percentOfFairShare` to show a visual indicator (e.g., a progress bar toward fair share, color-coded green→yellow→red).

#### 5.6 Pricing Tables

##### Head (40 options, fair share = 105)

| Usage | % Fair Share | Surcharge | Total Mint Price |
|-------|-------------|-----------|-----------------|
| 1 | 1% | 0.010 | 0.210 |
| 5 | 5% | 0.048 | 0.248 |
| 10 | 10% | 0.095 | 0.295 |
| 20 | 19% | 0.190 | 0.390 |
| 50 | 48% | 0.476 | 0.676 |
| 80 | 76% | 0.762 | 0.962 |
| **105** | **100%** | **1.000** | **1.200** ← fair share |
| 130 | 124% | 1.692 | 1.892 |
| 150 | 143% | 2.898 | **3.098** ← price wall |
| 200 | 190% | 8.454 | **8.654** ← effectively blocked |

##### Clothes (36 options, fair share = 117)

| Usage | % Fair Share | Surcharge | Total Mint Price |
|-------|-------------|-----------|-----------------|
| 1 | 1% | 0.009 | 0.209 |
| 10 | 9% | 0.085 | 0.285 |
| 30 | 26% | 0.256 | 0.456 |
| 60 | 51% | 0.513 | 0.713 |
| **117** | **100%** | **1.000** | **1.200** ← fair share |
| 150 | 128% | 1.918 | 2.118 |
| 200 | 171% | 5.735 | **5.935** ← price wall |

##### Face Wear (18 options, fair share = 233)

| Usage | % Fair Share | Surcharge | Total Mint Price |
|-------|-------------|-----------|-----------------|
| 1 | 0% | 0.004 | 0.204 |
| 20 | 9% | 0.086 | 0.286 |
| 100 | 43% | 0.429 | 0.629 |
| 150 | 64% | 0.644 | 0.844 |
| **233** | **100%** | **1.000** | **1.200** ← fair share |
| 300 | 129% | 1.949 | 2.149 |

##### Decay Example: Crown used 150 times, then stops

| Days Since Last Use | Effective Usage | Surcharge | Total Price |
|--------------------|----------------|-----------|-------------|
| 0 (today) | 150.0 | 2.898 | 3.098 |
| 7 days | 127.6 | 1.586 | 1.786 |
| 14 days | 108.5 | 1.043 | 1.243 |
| 30 days | 75.0 | 0.714 | 0.914 |
| 60 days | 37.5 | 0.357 | 0.557 |
| 90 days | 18.8 | 0.179 | 0.379 |
| 180 days | 2.3 | 0.022 | 0.222 |

After 6 months of disuse, even Crown returns to near-base price. Fresh usage immediately bumps it back up.

---

<a id="fix-6"></a>
## FIX 6: G2 Trait Representation in Metadata (MEDIUM)

### The Problem

When a user selects a G2 trait (colorable variant like Sports Jacket in different colors), the `selectedLayers` path looks like `/g2/Clothes/Sports-jacket`. The current metadata builder handles G2 paths (line 72-76 of prepare.ts), but:

1. G2 detail choices (logos on caps, flags, frame styles) are stored in `g2Selections` in GeneratorContext but **not sent to the backend** in the mint request body.
2. The trait name resolution for G2 paths may not match the canonical map for all cases.

### What's Already Working

- The `resolveTraitName` function (from FIX 1) will handle G2 paths by normalizing and looking up in `TRAIT_NAME_MAP`
- `TRAIT_NAME_MAP` already contains G2 typo corrections (e.g., `'straigth jacket'` → `'Straitjacket'`, `'3d glases'` → `'3D Glasses'`)
- Color variants map to their base name (e.g., `'sports jacket blue'` → `'Sports Jacket'`)

### What Needs Attention

The frontend sends `selectedLayers` with G2 virtual paths, which is correct. But verify that ALL G2 trait names resolve correctly through the canonical map. The key question: does `resolveTraitName('/g2/Clothes/fire-figther', 'Clothes')` produce `'Firefighter Uniform'`?

Let's trace it:
1. Strip `/g2/Clothes/` → `'fire-figther'`
2. Replace hyphens → `'fire figther'`
3. Lowercase → `'fire figther'`
4. Lookup in TRAIT_NAME_MAP → `'Firefighter Uniform'` ✓ (line 159 of traitNameMap.ts)

Good. The map already handles this.

### Implementation

After FIX 1 is implemented (which replaces `cleanTraitDisplayName` with `resolveTraitName` using `TRAIT_NAME_MAP`), G2 traits will automatically resolve correctly. **No additional code changes needed for G2 beyond FIX 1.**

However, **add these test cases to the verification checklist:**

- `/g2/Clothes/fire-figther` → `'Firefighter Uniform'`
- `/g2/Clothes/Straigth-jacket` → `'Straitjacket'`
- `/g2/Clothes/SWAT` → `'SWAT Gear'` (via LAYER_OVERRIDES)
- `/g2/Head/Comrad-Hat` → `'Comrade Hat'`
- `/g2/Head/Wiz-Hat` → `'Wizard Hat'`
- `/g2/Face-wear/3d-glases` → `'3D Glasses'`
- `/g2/Face-wear/cyber-shades` → `'Cyber Shades'`
- `/g2/Mouth/BubbleGum` → `'Bubble Gum'`
- `/g2/Face-laser/Laser-Eyes` → `'Laser Eyes'`
- `/g2/Clothes/gods-robe` → `"God's Robe"`

If any of these fail to resolve, add the missing entry to BOTH `src/lib/traitNameMap.ts` AND `functions/lib/traitNameMap.ts`.

---

<a id="files-summary"></a>
## Files Changed Summary

| Fix | Files Modified | Files Created |
|-----|---------------|---------------|
| FIX 1 | `functions/api/mint/prepare.ts` | `functions/lib/traitNameMap.ts` |
| FIX 1a | `src/lib/traitNameMap.ts`, `functions/lib/traitNameMap.ts` | — |
| FIX 2 | `functions/api/mint/prepare.ts`, `functions/api/mint/upload.ts` | `functions/api/mint/uploadToIPFS.ts` |
| FIX 3 | `functions/api/mint/confirm.ts` | — |
| FIX 4 | `functions/api/credits/balance.ts`, `functions/api/credits/history.ts`, `functions/api/chat/token.ts`, `functions/api/chat/verify-eligibility.ts`, `functions/api/mint/_shared.ts` | `functions/lib/validation.ts` |
| FIX 5 | `functions/api/mint/_shared.ts`, `functions/api/mint/prepare.ts`, `functions/api/mint/confirm.ts`, `functions/api/mint/pricing.ts` | `functions/migrations/034_trait_decay.sql` |
| FIX 6 | (covered by FIX 1) | — |

### Files NOT to Change

- `src/lib/traitNameMap.ts` — source of truth; only modify to ADD missing entries (FIX 1a), never remove or rename existing entries
- `src/lib/traitMapping.ts` — G1↔G2 mapping, unrelated to this spec
- `src/contexts/GeneratorContext.tsx` — frontend state, unrelated
- `src/components/generator/ActionBar.tsx` — frontend UI, unrelated
- `functions/api/mint/request.ts` — MintGarden API, working correctly
- `functions/api/mint/mintNumberHelper.ts` — atomic counter, working correctly
- `functions/migrations/030_credit_system.sql` — existing schema, don't touch

---

<a id="verification"></a>
## Verification Checklist

### After ALL fixes, run:

```bash
npm run typecheck && npm run build
```

### Manual Verification Points

#### Metadata Name Resolution (FIX 1 + 6)
Verify these resolve correctly server-side:

| Input | Layer | Expected Output |
|-------|-------|----------------|
| `HEAD_Firefigther-Helmet.png` | Head | Firefighter Helmet |
| `CLOTHES_Straigth-jacket.png` | Clothes | Straitjacket |
| `BACKGROUND_MomΓÇÖs Basement.png` | Background | Moms Basement |
| `EYE_Alpha-Shades_blue.png` | Eyes | Alpha Shades |
| `BASE_Base-Wojak_classic.png` | Base | Classic |
| `EXTRA_MOUTH_Cig_.png` | MouthBase | Cig |
| `HEAD_Super-Mario_green.png` | Head | Super Wojak Hat |
| `CLOTHES_Super-Saiyan-Uniform.png` | Clothes | Super Saiyan Uniform |
| `CLOTHES_Military-Jacket.png` | Clothes | El Presidente |
| `CLOTHES_god-rope.png` | Clothes | God's Robe |
| `/g2/Clothes/fire-figther` | Clothes | Firefighter Uniform |
| `/g2/Head/Comrad-Hat` | Head | Comrade Hat |
| `/g2/Face-wear/3d-glases` | Eyes | 3D Glasses |

#### Self-Fetch Elimination (FIX 2)
- Grep for `new URL('/api/mint/upload'` — should not exist in prepare.ts
- Grep for `INTERNAL_API_HEADER` — should only exist in upload.ts (HTTP path) and _shared.ts (definition)
- Test a mint — image and metadata should still appear on IPFS

#### Wallet Validation (FIX 3 + 4)
- `confirm.ts` should reject `walletAddress: "xch1short"` with 400
- `balance.ts` should reject `wallet=xch1short` with 400
- Both should accept valid 62-char bech32m addresses

#### Fair-Share Surcharge (FIX 5)
- New migration creates `effective_usage` and `last_decay_at` columns
- `pricing.ts` returns `effectiveUsage`, `fairShare`, `percentOfFairShare` alongside `usageCount`
- Surcharge only applies to Head, Clothes, Face Wear categories
- "No Headgear" and "No Face Wear" trait values are never surcharged
- Mouth, Face, Background, Base categories are never surcharged
- A Head trait at fair share (105 uses) produces surcharge of exactly 1.000 XCH
- Crown at 150 uses (143% fair share) produces surcharge of ~2.898 XCH (total ~3.10)
- A trait with `effective_usage=100` and `last_decay_at` 30 days ago decays to ~50
- Decay formula uses `exp(ln(0.5) * x)` NOT `POWER()` (D1 doesn't support POWER)

#### Grep for Anti-Patterns
```bash
# Should find ZERO results after all fixes:
grep -r "cleanTraitDisplayName\|applyDisplayCorrections" functions/
grep -r "startsWith('xch1')" functions/
grep -r "new URL.*'/api/mint/upload'" functions/api/mint/prepare.ts
grep -r "SURCHARGE_BASE\|SURCHARGE_USES_DIVISOR" functions/   # old formula constants
```
