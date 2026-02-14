# SPEC: Phase 3 — Credit Formula V2 Completion

> **For Claude CLI:** Read this entire spec, then read `docs/SPEC-CREDIT-FORMULA-V2.md` (the full implementation spec) before doing anything. This phase verifies that the Credit Formula V2 was implemented correctly and all related files are consistent.

---

## Context

The credit-tracker worker (`workers/credit-tracker/worker.ts`) was already updated with the new Credit Formula V2:
- `CREDITS_PER_XCH = 50` (replaces `CREDITS_PER_FLOOR`)
- `MAX_WHALE_BONUS = 0.30` (replaces `WHALE_COEFFICIENT = 0.2`)
- Asymptotic whale multiplier: `1 + 0.30 * (1 - 1/priceRatio)` (replaces unbounded log)
- Credits based on XCH spent, not floor multiples: `CREDITS_PER_XCH * priceXch * whaleMultiplier`

This phase verifies everything is consistent and completes any remaining work.

---

## Files to Read First

1. `docs/SPEC-CREDIT-FORMULA-V2.md` — **the complete spec** (source of truth)
2. `workers/credit-tracker/worker.ts` — the worker (should already be updated)
3. `scripts/backfill-credits.ts` — the backfill script (should match worker)
4. `functions/api/credits/leaderboard.ts` — reads stored credits (should NOT contain formula)
5. `functions/api/credits/balance.ts` — reads stored credits (should NOT contain formula)
6. `functions/api/credits/history.ts` — reads stored credits (should NOT contain formula)
7. `functions/api/mint/prepare.ts` — spends credits for free mints (uses `FREE_MINT_COST`)
8. `docs/CREDITS-FORMULA.md` — documentation (should be updated to match V2)
9. `docs/CREDIT-LEADERBOARD-SYSTEM.md` — system docs (section 4.3 should be updated)

---

## Step 1: Verify Worker Formula

Read `workers/credit-tracker/worker.ts` and confirm:

### Constants (should match exactly)

```typescript
const CREDITS_PER_XCH = 50;
const MAX_WHALE_BONUS = 0.30;
const MIN_EFFECTIVE_FLOOR = 0.5;
const FLOOR_FALLBACK_XCH = 100; // 1.0 XCH (x100)
```

### calculateCredits Function (should match exactly)

```typescript
function calculateCredits(priceXch: number, floorXch: number): {
  credits: number;
  multiplier: number;
} {
  const effectiveFloor = Math.max(MIN_EFFECTIVE_FLOOR, floorXch);
  const priceRatio = Math.max(1, priceXch / effectiveFloor);
  const whaleMultiplier = 1 + (MAX_WHALE_BONUS * (1 - 1 / priceRatio));
  const rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier;
  return {
    credits: Math.round(rawCredits * 100),
    multiplier: Math.round(whaleMultiplier * 10000),
  };
}
```

### Old Constants Must NOT Exist

These should NOT appear anywhere in the worker:
- `CREDITS_PER_FLOOR`
- `WHALE_COEFFICIENT`
- `Math.log` or `ln` in the multiplier calculation

**If any discrepancy:** Fix the worker to match the spec. The spec (`SPEC-CREDIT-FORMULA-V2.md`) is the source of truth.

---

## Step 2: Verify Backfill Script

Read `scripts/backfill-credits.ts` and confirm:

1. Constants match the worker (same `CREDITS_PER_XCH`, `MAX_WHALE_BONUS`, `MIN_EFFECTIVE_FLOOR`)
2. `calculateCredits` function body is identical to the worker
3. Old constants (`CREDITS_PER_FLOOR`, `WHALE_COEFFICIENT`) do NOT appear

**If any discrepancy:** Fix the backfill script to match.

---

## Step 3: Verify Credit Consumers (Should NOT Contain Formula)

These files read stored credits from the database. They should NOT recalculate credits — only read and display them.

Check each file does NOT contain:
- `CREDITS_PER_XCH` or `CREDITS_PER_FLOOR`
- `MAX_WHALE_BONUS` or `WHALE_COEFFICIENT`
- Any `calculateCredits` function
- Any whale multiplier math

| File | Should Contain Formula? |
|------|:---:|
| `functions/api/credits/leaderboard.ts` | ❌ No — reads stored values |
| `functions/api/credits/balance.ts` | ❌ No — reads stored values |
| `functions/api/credits/history.ts` | ❌ No — reads stored values |
| `functions/api/credits/status.ts` | ❌ No — reads metadata |
| `functions/api/mint/prepare.ts` | ❌ No — only uses `FREE_MINT_COST` |
| `src/contexts/MintContext.tsx` | ❌ No — reads balance from API |

---

## Step 4: Verify FREE_MINT_COST Consistency

The `FREE_MINT_COST` constant represents 100 display credits = 10000 stored units (hundredths).

Check this value is consistent across:

1. `functions/api/mint/prepare.ts` — used to deduct credits for free mints
2. `functions/api/credits/balance.ts` — may reference for display
3. `src/contexts/MintContext.tsx` or `src/components/generator/ActionBar.tsx` — frontend display

The value should be `10000` (stored units) everywhere it's referenced.

---

## Step 5: Verify Documentation

### `docs/CREDITS-FORMULA.md`

Should reflect the V2 formula:
- New constants (`CREDITS_PER_XCH`, `MAX_WHALE_BONUS`)
- New formula (`rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier`)
- Asymptotic whale multiplier explanation
- Worked examples matching the spec

### `docs/CREDIT-LEADERBOARD-SYSTEM.md`

Section 4.3 ("Credit formula" or similar) should be updated to match V2.

**If either doc is outdated:** Update it to match `SPEC-CREDIT-FORMULA-V2.md`.

---

## Step 6: Run Formula Tests

Verify the formula produces correct results:

```
calculateCredits(2.0, 2.0)  → credits ≈ 10000 (100 display = 1 free mint)
calculateCredits(4.0, 2.0)  → credits ≈ 23000 (230 display)
calculateCredits(20.0, 2.0) → credits ≈ 127000 (1270 display)
calculateCredits(2.0, 2.0)  → multiplier = 10000 (1.0x — no bonus at floor)
calculateCredits(100.0, 2.0) → multiplier ≈ 12940 (1.294x — near cap)
```

---

## Step 7: Grep for Old Constants

Run these greps — all should return **zero results** (excluding this spec file and git history):

```bash
echo "=== Old CREDITS_PER_FLOOR ==="
grep -r "CREDITS_PER_FLOOR" workers/ functions/ scripts/ src/ --include="*.ts" --include="*.tsx"

echo "=== Old WHALE_COEFFICIENT ==="
grep -r "WHALE_COEFFICIENT" workers/ functions/ scripts/ src/ --include="*.ts" --include="*.tsx"
```

If any matches are found, the old formula was not fully replaced. Fix it.

---

## Step 8: Build Check

```bash
npm run typecheck && npm run build
```

Both must pass with zero errors.

---

## Report

After all steps, report:

1. ✓ or ✗ for each step
2. Any discrepancies found and how they were resolved
3. Confirmation that the V2 formula is consistent across all files
