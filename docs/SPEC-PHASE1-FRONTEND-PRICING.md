# SPEC: Phase 1 — Frontend Pricing Display

> **For Claude CLI:** Read this entire spec, then read every file listed in "Files to Read First" before writing any code. Follow `docs/BRAND-VOICE.md` for all user-facing copy. Follow `CLAUDE.md` for CSS conventions.

---

## Context

The Mint Pipeline Audit added a fair-share surcharge system. The pricing endpoint (`/api/mint/pricing`) now returns per-trait usage data. This phase surfaces that data in the generator UI so users see real-time prices before they mint.

### What Users Should See

- **Per-trait:** How many times a trait has been minted + its surcharge (if any)
- **Total price:** Base price + highest surcharge = total
- **Never shown:** Fair share values, percentages, formula internals

---

## Files to Read First

1. `docs/BRAND-VOICE.md` — tone, word choices, pricing format
2. `docs/SPEC-MINT-PIPELINE-AUDIT.md` — FIX 5 for the surcharge formula details
3. `CLAUDE.md` — CSS architecture rules (theme.css + Tailwind layout only)
4. `src/contexts/MintContext.tsx` — where pricing data is fetched and stored
5. `src/components/generator/ActionBar.tsx` — the mint button / price area
6. `functions/api/mint/pricing.ts` — the pricing endpoint (data source)
7. `src/styles/theme.css` — available CSS classes
8. `src/components/generator/` — all generator components (to find trait selector)

---

## Pricing Endpoint Response Shape

The `/api/mint/pricing` endpoint returns:

```typescript
{
  traits: {
    "Head_Crown": {
      usageCount: 87,        // raw times minted (integer)
      effectiveUsage: 82.3,  // after decay (float)
      surchargeXch: 0.784,   // surcharge in XCH (float)
      fairShare: 105          // DO NOT show this to users
    },
    "Clothes_Suit": { ... },
    "Face Wear_Aviators": { ... },
    "Mouth_Cig": {
      usageCount: 45,
      effectiveUsage: 42.1,
      surchargeXch: 0,        // Mouth is excluded — always 0
      fairShare: 0
    },
    ...
  },
  supply: {
    minted: 312,
    total: 4200
  }
}
```

Key format: `"{Category}_{TraitDisplayName}"` (e.g., `"Head_Crown"`, `"Face Wear_No Face Wear"`)

---

## Requirement 1: MintContext — Fetch and Store Pricing Data

### Current State

MintContext currently fetches supply data. It may or may not already fetch the full pricing response.

### Required Changes

1. Fetch the full `/api/mint/pricing` response (not just supply)
2. Store the `traits` map in context state as `traitPricing`
3. Store `supply` in context state (may already exist)
4. **Auto-refetch every 60 seconds** — trait usage changes as others mint
5. Expose a helper function for components:

```typescript
// Gets pricing for a specific trait
function getTraitPricing(category: string, traitDisplayName: string): {
  usageCount: number;
  surchargeXch: number;
} | null

// Gets the total mint price for the current selection
function getTotalMintPrice(): {
  basePrice: number;       // 0.20
  surchargeXch: number;    // highest surcharge among selected traits
  surchargeTraitName: string; // which trait caused the surcharge
  totalXch: number;        // base + surcharge
}
```

### Type Definition

```typescript
interface TraitPricingData {
  usageCount: number;
  effectiveUsage: number;
  surchargeXch: number;
  fairShare: number; // stored but never shown to users
}

interface PricingState {
  traitPricing: Record<string, TraitPricingData>;
  supply: { minted: number; total: number };
  lastFetched: number; // timestamp for cache management
}
```

---

## Requirement 2: ActionBar — Price Breakdown

### Display Format

Follow `BRAND-VOICE.md` pricing format exactly:

**When no surcharge (surchargeXch === 0):**
```
0.20 XCH
```

**When surcharge exists:**
```
0.45 XCH (base 0.20 + 0.25 Crown surcharge)
```

### Implementation Details

1. Use `getTotalMintPrice()` from MintContext
2. Only show the surcharge line when surcharge > 0
3. Show the name of the trait causing the surcharge (the most expensive one)
4. Round surcharge to 2 decimal places for display
5. Use `text-secondary` for the breakdown parenthetical
6. The total price should be prominent (larger or `text-accent`)

### Example Layouts

```
Simple (no surcharge):
┌─────────────────────────┐
│  0.20 XCH          [Mint] │
└─────────────────────────┘

With surcharge:
┌──────────────────────────────────────────┐
│  0.45 XCH (base 0.20 + 0.25 Crown surcharge)  [Mint] │
└──────────────────────────────────────────┘
```

---

## Requirement 3: Trait Selector — Usage Badges

### What to Show Per Trait

For **every** trait in the selector (all categories):

```
[Trait Thumbnail]
"87 minted"          ← small text below/on thumbnail (text-muted)
```

For surcharge categories (**Head, Clothes, Face Wear**) only, if surcharge > 0:

```
[Trait Thumbnail]
"87 minted"          ← usage count (text-muted)
"+0.25 XCH"          ← surcharge badge (badge or text-accent)
```

### Implementation Details

1. Look up each trait's pricing via `getTraitPricing(category, displayName)`
2. If pricing data hasn't loaded yet, show nothing (don't show "0 minted")
3. `usageCount` is what's shown — not `effectiveUsage` (that's internal)
4. Show "+X.XX XCH" only for surcharge categories where surchargeXch > 0
5. Use `text-muted` for the "N minted" count
6. Use `badge` or `text-accent` for the surcharge amount
7. Keep it compact — trait thumbnails are small

### Categories Reference

| Category | Shows Usage Count | Shows Surcharge |
|----------|:-:|:-:|
| Head | ✓ | ✓ |
| Clothes | ✓ | ✓ |
| Face Wear | ✓ | ✓ |
| Mouth | ✓ | ✗ (always 0) |
| Face | ✓ | ✗ (always 0) |
| Background | ✓ | ✗ (always 0) |
| Base | ✓ | ✗ (always 0) |

---

## Requirement 4: Things NOT to Show

These are internal formula details that should never appear in the UI:

- ❌ "Fair share" or "fair share percentage"
- ❌ "Effective usage" (the decayed number)
- ❌ Penalty/ramp breakdown
- ❌ Formula constants or explanations
- ❌ Decay rate or half-life
- ❌ Category exclusion reasons

Users see: **trait name, times minted, surcharge amount, total price.** That's it.

---

## Requirement 5: CSS and Styling

1. Use existing CSS classes from `theme.css`:
   - `badge` for surcharge amounts
   - `text-secondary` for price breakdowns
   - `text-muted` for "N minted" counts
   - `text-accent` for the total price (if making it stand out)
2. Use Tailwind for layout only (`flex`, `gap`, `p-`, `text-sm`, etc.)
3. **No new CSS files**
4. **No `!important`**
5. Follow all `CLAUDE.md` conventions

---

## Requirement 6: Edge Cases

1. **Pricing data not yet loaded:** Show base price only (0.20 XCH). Don't show "0 minted" or loading spinners.
2. **Pricing fetch fails:** Use cached data if available. If no cache, show base price only.
3. **Free mint selected:** Don't show surcharge breakdown (free mints are free regardless of traits).
4. **All surcharges are 0:** Show "0.20 XCH" with no breakdown.
5. **Multiple traits with surcharges:** Only the highest surcharge is charged. Show which trait it comes from.

---

## Verification

After all changes:

```bash
npm run typecheck && npm run build
```

Both must pass with zero errors.

### Manual Checks

1. Open the generator in the browser
2. Select a trait with known usage — verify "N minted" appears
3. Select Crown (if it has usage) — verify surcharge appears in ActionBar
4. Switch to a non-surcharge category trait — verify surcharge disappears
5. Wait 60 seconds — verify pricing data refreshes
