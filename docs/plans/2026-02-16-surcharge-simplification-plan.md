# Surcharge Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the per-category fair-share surcharge system with a universal power curve formula, change decay half-life to 14 days, and block top-3 traits from free mints.

**Architecture:** Backend constants and formula in `_shared.ts` are the single source of truth. `pricing.ts` exposes surcharges + top-3 list to frontend. `submit.ts` enforces the top-3 block for free mints. `process.ts` updates trait_usage with the new half-life. Frontend consumes new API shape.

**Tech Stack:** TypeScript, Cloudflare Workers (D1 + KV), React, Vite

---

### Task 1: Update surcharge constants and formula in _shared.ts

**Files:**
- Modify: `functions/api/mint/_shared.ts`

**Step 1: Replace surcharge constants (lines 34-48)**

Replace this block:
```typescript
// ─── Surcharge: Fair-Share Pricing ───
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
```

With:
```typescript
// ─── Surcharge: Universal Power Curve ───
// Formula: surcharge = SURCHARGE_SCALE × (effectiveUsage - 1) ^ SURCHARGE_EXPONENT
// Scale is auto-derived: targetSurcharge / (targetUses - 1) ^ exponent
export const SURCHARGE_TARGET_XCH = 1.275;
export const SURCHARGE_TARGET_USES = 200;
export const SURCHARGE_EXPONENT = 0.90;
export const SURCHARGE_SCALE = SURCHARGE_TARGET_XCH / Math.pow(SURCHARGE_TARGET_USES - 1, SURCHARGE_EXPONENT);
export const DECAY_HALF_LIFE_DAYS = 14;

/** Only these categories have surcharges */
export const SURCHARGE_CATEGORIES = new Set(['Head', 'Clothes', 'Face Wear']);
```

**Step 2: Rewrite surchargeXch function (lines 59-83)**

Replace the entire function:
```typescript
/**
 * Calculate surcharge for a trait based on its effective (decayed) usage.
 * Formula: SCALE × (effectiveUsage - 1) ^ EXPONENT
 * First use is free (surcharge = 0 when effectiveUsage <= 1).
 */
export function surchargeXch(
  effectiveUsage: number,
  traitCategory: string,
  traitDisplayName?: string
): number {
  if (!SURCHARGE_CATEGORIES.has(traitCategory)) return 0;
  if (traitDisplayName && SURCHARGE_EXEMPT_TRAITS.has(traitDisplayName)) return 0;
  if (effectiveUsage <= 1) return 0;

  return SURCHARGE_SCALE * Math.pow(effectiveUsage - 1, SURCHARGE_EXPONENT);
}
```

**Step 3: Verify build compiles**

Run: `cd /Users/abit_hex/wojak-ink && npx tsc --noEmit --project tsconfig.node.json 2>&1 | head -20`

If there are import errors for removed exports (`SURCHARGE_FAIR_SHARES`, `SURCHARGE_RAMP_RATE`, etc.), note them — they'll be fixed in subsequent tasks.

**Step 4: Commit**

```bash
git add functions/api/mint/_shared.ts
git commit -m "refactor: replace fair-share surcharge with universal power curve

New formula: scale × (effectiveUsage - 1)^0.90
Target: 1.275 XCH surcharge at 200 uses
Decay half-life: 30 → 14 days
Removes per-category fair shares entirely.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Update pricing.ts API response

**Files:**
- Modify: `functions/api/mint/pricing.ts`

**Step 1: Update imports**

Replace:
```typescript
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  surchargeXch,
  applyDecay,
  SURCHARGE_FAIR_SHARES,
} from './_shared';
```

With:
```typescript
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  surchargeXch,
  applyDecay,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
} from './_shared';
```

**Step 2: Simplify TraitPricing interface and add top-3 computation**

Replace the entire try block (lines 54-104) with:
```typescript
  try {
    const traitRows = await env.DB.prepare(
      'SELECT trait_category, trait_name, usage_count, effective_usage, last_decay_at FROM trait_usage'
    ).all<TraitUsageRow>();

    interface TraitPricing {
      usageCount: number;
      effectiveUsage: number;
      surchargeXch: number;
    }

    const traits: Record<string, TraitPricing> = {};

    // Build per-category lists for top-3 calculation
    const byCat: Record<string, { name: string; decayed: number }[]> = {};
    for (const cat of SURCHARGE_CATEGORIES) {
      byCat[cat] = [];
    }

    for (const r of traitRows.results || []) {
      const decayed = applyDecay(r.effective_usage, r.last_decay_at);
      const sc = surchargeXch(decayed, r.trait_category, r.trait_name);

      const key = `${r.trait_category}_${r.trait_name}`;
      traits[key] = {
        usageCount: r.usage_count,
        effectiveUsage: Math.round(decayed * 100) / 100,
        surchargeXch: Math.round(sc * 1000) / 1000,
      };

      // Track surchargeable traits for top-3
      if (SURCHARGE_CATEGORIES.has(r.trait_category) && !SURCHARGE_EXEMPT_TRAITS.has(r.trait_name)) {
        byCat[r.trait_category]?.push({ name: r.trait_name, decayed });
      }
    }

    // Top 3 most popular (by effective usage) per category
    const top3: Record<string, string[]> = {};
    for (const [cat, items] of Object.entries(byCat)) {
      items.sort((a, b) => b.decayed - a.decayed);
      top3[cat] = items.slice(0, 3).filter(t => t.decayed > 0).map(t => t.name);
    }

    const supplyRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM phase2_mints WHERE status = 'minted'"
    ).first<{ count: number }>();
    const minted = supplyRow?.count ?? 0;

    const floorRow = await env.DB.prepare(
      'SELECT floor_xch FROM floor_price_snapshots ORDER BY snapshot_date DESC LIMIT 1'
    ).first<{ floor_xch: number }>();
    const floorPrice = floorRow ? floorRow.floor_xch / 100 : 1.0;

    const pausedRow = await env.DB.prepare(
      "SELECT value FROM server_state WHERE key = 'minting_paused'"
    ).first<{ value: string }>();
    const mintingPaused = pausedRow?.value === 'true';

    return jsonResponse({
      traits,
      top3,
      supply: { minted, total: SUPPLY_TOTAL },
      floorPrice: Math.round(floorPrice * 1000) / 1000,
      mintingPaused,
    });
  } catch (error) {
    console.error('[Mint Pricing] Error:', error);
    return errorResponse('Internal server error', 500);
  }
```

**Step 3: Update the JSDoc at top of file**

Replace the response shape comment (lines 9-13) with:
```typescript
 * Response: {
 *   traits: { [traitKey]: { usageCount, effectiveUsage, surchargeXch } },
 *   top3: { [category]: string[] },
 *   supply: { minted: number, total: 4200 },
 *   floorPrice: number
 * }
```

**Step 4: Commit**

```bash
git add functions/api/mint/pricing.ts
git commit -m "refactor: simplify pricing API, add top-3 traits per category

Removes fairShare/percentOfFairShare from response.
Adds top3 field with the 3 most popular traits per surcharge category.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Update submit.ts — block top-3 for free mints

**Files:**
- Modify: `functions/api/mint/submit.ts`

**Step 1: Update imports (line 12-27)**

Replace:
```typescript
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
  surchargeXch,
  applyDecay,
  TOTAL_SUPPLY,
  FREE_MINT_CREDITS,
  BASE_PRICE_XCH,
  OFFER_EXPIRY_MINUTES,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
  DECAY_HALF_LIFE_DAYS,
  PREMIUM_TOP_N,
} from './_shared';
```

With:
```typescript
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidChiaAddress,
  surchargeXch,
  applyDecay,
  TOTAL_SUPPLY,
  FREE_MINT_CREDITS,
  BASE_PRICE_XCH,
  OFFER_EXPIRY_MINUTES,
  SURCHARGE_CATEGORIES,
  SURCHARGE_EXEMPT_TRAITS,
  PREMIUM_TOP_N,
} from './_shared';
```

Note: `DECAY_HALF_LIFE_DAYS` is no longer imported here (it's only needed in process.ts for the SQL).

**Step 2: Replace free mint pricing block (lines 203-251)**

Replace the entire `if (mintType === 'free') { ... }` block with:
```typescript
    if (mintType === 'free') {
      // Determine top-3 traits per surcharge category (by effective usage)
      const byCat: Record<string, { name: string; decayed: number }[]> = {};
      for (const cat of SURCHARGE_CATEGORIES) {
        byCat[cat] = [];
      }
      for (const row of (allTraitRows.results || [])) {
        if (!SURCHARGE_CATEGORIES.has(row.trait_category)) continue;
        if (SURCHARGE_EXEMPT_TRAITS.has(row.trait_name)) continue;
        const decayed = applyDecay(row.effective_usage, row.last_decay_at);
        byCat[row.trait_category]?.push({ name: row.trait_name, decayed });
      }

      const top3Traits = new Set<string>();
      for (const [cat, items] of Object.entries(byCat)) {
        items.sort((a, b) => b.decayed - a.decayed);
        for (let i = 0; i < Math.min(PREMIUM_TOP_N, items.length); i++) {
          if (items[i].decayed > 0) {
            top3Traits.add(`${cat}:${items[i].name}`);
          }
        }
      }

      // Block free mints if ANY selected trait is in the top 3
      const blockedTraits: string[] = [];
      for (const { traitType, displayName } of consolidated.values()) {
        if (!SURCHARGE_CATEGORIES.has(traitType)) continue;
        if (SURCHARGE_EXEMPT_TRAITS.has(displayName)) continue;
        if (top3Traits.has(`${traitType}:${displayName}`)) {
          blockedTraits.push(`${traitType}: ${displayName}`);
        }
      }

      if (blockedTraits.length > 0) {
        return jsonResponse({
          error: 'Free mints cannot use the top 3 most popular traits in each category. Switch to a paid mint or choose different traits.',
          errorCode: 'TOP3_BLOCKED',
          blockedTraits,
        }, 400);
      }

      // Free mints: flat credit cost (no premium scaling)
      freeMintCreditCost = FREE_MINT_CREDITS;
      surchargeStored = null;
      highestTrait = null;

    } else {
```

**Step 3: Verify the paid mint block (lines 252-271) still works**

The paid mint block should remain unchanged — it uses `surchargeXch()` which already has the new formula from Task 1. Verify no compile errors.

**Step 4: Commit**

```bash
git add functions/api/mint/submit.ts
git commit -m "feat: block top-3 traits from free mints, remove premium credit scaling

Free mints now have flat credit cost (100 credits).
If any selected trait is in the top 3 most popular per category,
free credits are rejected with a clear error message.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Update process.ts — new half-life in trait_usage UPSERT

**Files:**
- Modify: `functions/api/mint/process.ts`

**Step 1: Update imports (lines 18-23)**

The import of `DECAY_HALF_LIFE_DAYS` is already there and correct. No change needed — the constant value changed in _shared.ts (30 → 14), so the SQL automatically uses the new value via the bind parameter.

Verify this by reading line 330:
```typescript
).bind(traitType, displayName, DECAY_HALF_LIFE_DAYS)
```

This already binds dynamically. **No code change needed in process.ts.** The SQL uses `/ ?` with the bound value, which now equals 14.

**Step 2: Commit (skip — no changes)**

No changes needed. The half-life change propagates automatically via the constant.

---

### Task 5: Update MintContext.tsx — consume top3, replace premium logic

**Files:**
- Modify: `src/contexts/MintContext.tsx`

**Step 1: Update TraitPricingEntry interface (around line 68)**

Remove `fairShare` field if present. The interface should be:
```typescript
interface TraitPricingEntry {
  usageCount: number;
  surchargeXch: number;
}
```

**Step 2: Update pricing fetch handler (around line 149)**

Update the state to include top3:
```typescript
const [traitPricing, setTraitPricing] = useState<Record<string, { usageCount: number; effectiveUsage: number; surchargeXch: number }>>({});
const [top3Traits, setTop3Traits] = useState<Record<string, string[]>>({});
```

In the fetch callback, add:
```typescript
setTop3Traits(data.top3 || {});
```

**Step 3: Replace premium trait logic (lines 268-303)**

Replace `premiumTraitKeys` useMemo, `isPremiumTrait` callback, and `getPremiumCreditCost` callback with:
```typescript
const isTop3Trait = useCallback(
  (category: string, traitName: string): boolean => {
    return (top3Traits[category] || []).includes(traitName);
  },
  [top3Traits]
);
```

Remove `getPremiumCreditCost` entirely and remove `PREMIUM_TOP_N` constant.

**Step 4: Update context value**

In the useMemo that builds the context value, replace `isPremiumTrait` and `getPremiumCreditCost` with `isTop3Trait`. Also add `top3Traits` to the value.

**Step 5: Update the context type interface**

Replace `isPremiumTrait` and `getPremiumCreditCost` signatures with:
```typescript
isTop3Trait: (category: string, traitName: string) => boolean;
top3Traits: Record<string, string[]>;
```

**Step 6: Commit**

```bash
git add src/contexts/MintContext.tsx
git commit -m "refactor: replace premium trait logic with top-3 from pricing API

Consumes new top3 field from /api/mint/pricing.
Removes getPremiumCreditCost and premium credit scaling.
isTop3Trait is a simple lookup against the API-provided list.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Update TraitSelector.tsx — use isTop3Trait

**Files:**
- Modify: `src/components/generator/TraitSelector.tsx`

**Step 1: Update hook destructure (line 680)**

Replace:
```typescript
const { getTraitPricing, isPremiumTrait, getPremiumCreditCost } = useMint();
```

With:
```typescript
const { getTraitPricing, isTop3Trait } = useMint();
```

**Step 2: Update premium check (lines 892-893)**

Replace:
```typescript
const traitIsPremium = isPremiumTrait(traitType, trait.name);
const traitCreditCost = traitIsPremium ? getPremiumCreditCost(traitType, trait.name) : null;
```

With:
```typescript
const traitIsTop3 = isTop3Trait(traitType, trait.name);
```

Then update any rendering that shows `traitIsPremium` or `traitCreditCost` to instead show a "Top 3" indicator when `traitIsTop3` is true. The exact rendering change depends on how premium traits are currently displayed — search for `traitIsPremium` and `traitCreditCost` in the file and replace accordingly. The key change: instead of showing a scaled credit cost, show a badge like "Top 3 — paid only".

**Step 3: Commit**

```bash
git add src/components/generator/TraitSelector.tsx
git commit -m "refactor: replace premium trait display with top-3 badge

Shows 'Top 3' indicator instead of scaled credit cost.
Free mints blocked for these traits (enforced by backend).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Update PricingLightbox.tsx — remove fair share columns

**Files:**
- Modify: `src/components/generator/PricingLightbox.tsx`

**Step 1: Update TraitPricing interface (lines 19-25)**

Remove `fairShare` and `percentOfFairShare`:
```typescript
interface TraitPricing {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
}
```

**Step 2: Remove any table columns showing fairShare or percentOfFairShare**

Search for `fairShare` and `percentOfFairShare` in the component and remove those columns/displays.

**Step 3: Commit**

```bash
git add src/components/generator/PricingLightbox.tsx
git commit -m "refactor: remove fair share from pricing lightbox

Pricing response no longer includes fairShare/percentOfFairShare.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Update Admin.tsx — remove fair share references

**Files:**
- Modify: `src/pages/Admin.tsx`

**Step 1: Update TraitPricing interface (lines 16-22)**

Remove `fairShare` and `percentOfFairShare`:
```typescript
interface TraitPricing {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
}
```

**Step 2: Remove fair share references**

- Remove `(fair share: ...)` display (line 124)
- Remove `statusBadge(t.data.percentOfFairShare)` logic (line 142)
- Replace with usage count or surcharge-based status if desired

**Step 3: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "refactor: remove fair share from admin dashboard

Admin now shows simplified surcharge data without fair-share percentages.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Clean up _shared.ts exports

**Files:**
- Modify: `functions/api/mint/_shared.ts`

**Step 1: Remove dead exports**

After all consumers are updated, remove any leftover exports that are no longer imported anywhere:
- `SURCHARGE_RAMP_RATE` (deleted in Task 1)
- `SURCHARGE_PENALTY_SCALE` (deleted in Task 1)
- `SURCHARGE_PENALTY_EXPONENT` (deleted in Task 1)
- `SURCHARGE_FAIR_SHARES` (deleted in Task 1)

Verify with: `cd /Users/abit_hex/wojak-ink && grep -r 'SURCHARGE_FAIR_SHARES\|SURCHARGE_RAMP_RATE\|SURCHARGE_PENALTY' --include='*.ts' --include='*.tsx' functions/ src/`

If any references remain, fix them.

**Step 2: Full type check**

Run: `cd /Users/abit_hex/wojak-ink && npx tsc --noEmit 2>&1 | head -30`

Fix any type errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up stale surcharge exports, fix type errors

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Build and verify

**Step 1: Run production build**

```bash
cd /Users/abit_hex/wojak-ink && npm run build
```

Fix any build errors.

**Step 2: Manual smoke test**

Start dev server and verify:
1. `/api/mint/pricing` returns new response shape (no fairShare, has top3)
2. Generator shows surcharges with new formula
3. Free mint button is disabled/blocked when top-3 traits are selected
4. Paid mint shows correct surcharge amounts
5. Admin page loads without errors

**Step 3: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: address build/runtime issues from surcharge simplification

Co-Authored-By: Claude <noreply@anthropic.com>"
```
