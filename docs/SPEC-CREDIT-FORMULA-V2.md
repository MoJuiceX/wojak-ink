# SPEC: Credit Formula V2 — Revenue-Neutral with Capped Whale Bonus

> **For Claude CLI:** This is a complete implementation spec. Read this entire file first, then read every file listed in the "Files to Change" section before writing any code. Do not deviate from this spec. Do not add features. Do not refactor anything outside scope.

---

## Prompt for Claude CLI

```
Read docs/SPEC-CREDIT-FORMULA-V2.md in full. This is your implementation spec.

Before writing any code:
1. Read every file listed in the "Files to Change" section
2. Read docs/CREDITS-FORMULA.md (the current formula doc you will replace)
3. Read docs/CREDIT-LEADERBOARD-SYSTEM.md (system docs you will update)

Then implement exactly what the spec says. Nothing more, nothing less.
Do NOT refactor surrounding code. Do NOT rename variables beyond what the spec requires.
Do NOT change any logic outside the calculateCredits function and constants unless the spec explicitly says to.
After making changes, run: npm run typecheck && npm run build
```

---

## 1. Background — Why We Are Changing This

### The Economic Model

The free mint credit system rewards buyers of **Wojak Farmers Plot** NFTs with free mints of **Your Wojak** NFTs from the generator.

The economics are grounded in royalties:

| Fact | Value |
|------|-------|
| Royalty rate on Farmers Plot sales | **10%** |
| Your Wojak mint price | **0.2 XCH** |
| Royalty earned on a 2 XCH floor buy | **0.2 XCH** |

When someone buys a Farmers Plot at floor (2 XCH), the project earns 0.2 XCH in royalties. A Your Wojak mint also costs 0.2 XCH. So giving 1 free mint per floor purchase is **revenue-neutral** — the royalty already funded it.

### The Problem with the Old Formula

The old whale multiplier `1 + 0.2 * ln(priceRatio)` grows without bound. At high price ratios, the credits awarded exceed the royalty income, making wash trading profitable:

- At 3x floor: multiplier = 1.22 → already above the ~1.20 break-even point
- At 100x floor: multiplier = 1.92 → massively exploitable

A wash trader listing their own NFT at 100 XCH and buying it themselves would pay ~12 XCH in fees (10% royalty + 2% marketplace) but earn ~17.8 XCH worth of free mints. That's a 5.8 XCH profit per wash trade.

### The Solution

Replace the unbounded logarithmic whale multiplier with an **asymptotic formula** that approaches a hard ceiling. The maximum bonus is set so that wash trading is never profitable (or at worst breaks even).

---

## 2. The New Formula

### Constants

```typescript
// === Economic constants (derived from business model) ===
const ROYALTY_RATE = 0.10;          // 10% royalty on Farmers Plot sales
const YOUR_WOJAK_MINT_PRICE = 0.20; // 0.2 XCH mint price for Your Wojak

// === Credit constants (derived from economics) ===
// CREDITS_PER_XCH = (ROYALTY_RATE / YOUR_WOJAK_MINT_PRICE) * 100 = 50
// This means: per 1 XCH spent, you earn 50 credits (before whale bonus).
// At floor, this gives exactly 1 free mint per floor purchase (revenue-neutral).
const CREDITS_PER_XCH = 50;

// === Whale bonus ===
// Asymptotic cap: multiplier approaches but never exceeds (1 + MAX_WHALE_BONUS).
// At 0.30, max multiplier = 1.30. Wash trading breaks even at best
// (royalty + marketplace fee ≈ 12%, reward max ≈ 13%, net ≈ 1% — not worth the capital risk).
const MAX_WHALE_BONUS = 0.30;

// === Floor protection ===
const MIN_EFFECTIVE_FLOOR = 0.5;     // Prevents division by tiny/zero floors
const FLOOR_FALLBACK_XCH = 100;     // 1.0 XCH (x100) when no snapshot exists
```

### The `calculateCredits` Function

```typescript
function calculateCredits(priceXch: number, floorXch: number): {
  credits: number;    // stored in hundredths (x100)
  multiplier: number; // stored as x10000
} {
  const effectiveFloor = Math.max(MIN_EFFECTIVE_FLOOR, floorXch);
  const priceRatio = Math.max(1, priceXch / effectiveFloor);

  // Asymptotic whale multiplier: approaches (1 + MAX_WHALE_BONUS) but never exceeds it.
  // At floor (priceRatio=1): multiplier = 1.0 (no bonus)
  // At 2x floor: multiplier ≈ 1.15
  // At 5x floor: multiplier ≈ 1.24
  // At 10x floor: multiplier ≈ 1.27
  // At 100x floor: multiplier ≈ 1.297
  // Limit as priceRatio → ∞: multiplier → 1.30
  const whaleMultiplier = 1 + (MAX_WHALE_BONUS * (1 - 1 / priceRatio));

  const rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier;

  return {
    credits: Math.round(rawCredits * 100),        // stored units (hundredths)
    multiplier: Math.round(whaleMultiplier * 10000), // stored units (x10000)
  };
}
```

### Critical Change in rawCredits Calculation

**OLD:** `rawCredits = CREDITS_PER_FLOOR * priceRatio * whaleMultiplier`

This multiplies by `priceRatio` which is `priceXch / effectiveFloor`. The "per floor" naming obscured that credits scaled with price.

**NEW:** `rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier`

This multiplies directly by `priceXch`. The constant is now named `CREDITS_PER_XCH` (50 credits per 1 XCH spent). The result is mathematically equivalent when priceRatio = priceXch / effectiveFloor, but the new form is clearer about the economic intent: **you earn credits proportional to what you spend, not proportional to how many floors you paid**.

> **Wait — are these actually equivalent?**
>
> OLD: `50 * (priceXch / floor) * whaleMultiplier`
> NEW: `50 * priceXch * whaleMultiplier`
>
> These are NOT the same. The old formula divides by floor, the new one doesn't. This is intentional. In the old model, buying at 2 XCH when floor is 2 XCH gave the same credits as buying at 1 XCH when floor is 1 XCH (both give 50 credits). In the new model, buying at 2 XCH always gives 100 credits regardless of floor. **The new model is anchored to XCH spent, not to floor multiples.** This is correct because the royalty you earn (10% of sale price) scales with the sale price, not with the floor.

---

## 3. Worked Examples

### At floor (2 XCH, floor = 2 XCH)

```
priceRatio = 2 / 2 = 1
whaleMultiplier = 1 + 0.30 * (1 - 1/1) = 1.0
rawCredits = 50 * 2 * 1.0 = 100
→ 100 credits = 1 free mint ✓
Your royalty: 0.2 XCH. Free mint value: 0.2 XCH. Revenue-neutral. ✓
```

### Above floor (4 XCH, floor = 2 XCH)

```
priceRatio = 4 / 2 = 2
whaleMultiplier = 1 + 0.30 * (1 - 1/2) = 1.15
rawCredits = 50 * 4 * 1.15 = 230
→ 230 credits = 2.3 free mints
Your royalty: 0.4 XCH. Free mint value: 0.46 XCH. You "spend" 0.06 XCH on the whale bonus.
```

### Whale purchase (20 XCH, floor = 2 XCH)

```
priceRatio = 20 / 2 = 10
whaleMultiplier = 1 + 0.30 * (1 - 1/10) = 1.27
rawCredits = 50 * 20 * 1.27 = 1270
→ 1270 credits = 12.7 free mints
Your royalty: 2.0 XCH. Free mint value: 2.54 XCH. You "spend" 0.54 XCH.
```

### Wash trade attempt (100 XCH, floor = 2 XCH)

```
priceRatio = 100 / 2 = 50
whaleMultiplier = 1 + 0.30 * (1 - 1/50) = 1.294
rawCredits = 50 * 100 * 1.294 = 6470
→ 6470 credits = 64.7 free mints = 12.94 XCH value

Attacker cost: 100 * 0.10 (royalty) + 100 * 0.02 (marketplace) = 12 XCH
Attacker reward: 12.94 XCH
Net profit: 0.94 XCH (< 1% of capital)

Verdict: Technically profitable by ~1%, but requires 100 XCH of locked capital
and marketplace risk for less than 1 XCH of gain. Not worth it.
```

### Floor changes (floor rises to 5 XCH)

```
Buy at floor (5 XCH):
rawCredits = 50 * 5 * 1.0 = 250 credits = 2.5 free mints
Your royalty: 0.5 XCH. Free mint value: 0.5 XCH. Revenue-neutral. ✓

The system automatically scales. No constant changes needed.
```

### Floor drops (floor falls to 0.5 XCH)

```
Buy at floor (0.5 XCH):
rawCredits = 50 * 0.5 * 1.0 = 25 credits = 0.25 free mints
Your royalty: 0.05 XCH. Free mint value: 0.05 XCH. Revenue-neutral. ✓

Need 4 floor buys for 1 free mint. Still proportional and fair.
```

---

## 4. Wash Trade Analysis Table

All calculations assume 10% royalty + 2% marketplace fee = 12% total cost.

| Sale Price | Floor | Multiplier | Credits | Free Mints | Reward Value | Cost | Profit |
|-----------|-------|-----------|---------|-----------|-------------|------|--------|
| 2 XCH | 2 | 1.000 | 100 | 1.0 | 0.20 XCH | 0.24 XCH | **-0.04** |
| 4 XCH | 2 | 1.150 | 230 | 2.3 | 0.46 XCH | 0.48 XCH | **-0.02** |
| 6 XCH | 2 | 1.200 | 360 | 3.6 | 0.72 XCH | 0.72 XCH | **0.00** |
| 10 XCH | 2 | 1.270 | 635 | 6.35 | 1.27 XCH | 1.20 XCH | **+0.07** |
| 20 XCH | 2 | 1.285 | 1285 | 12.85 | 2.57 XCH | 2.40 XCH | **+0.17** |
| 50 XCH | 2 | 1.292 | 3230 | 32.3 | 6.46 XCH | 6.00 XCH | **+0.46** |
| 100 XCH | 2 | 1.297 | 6485 | 64.85 | 12.97 XCH | 12.00 XCH | **+0.97** |

**Worst case:** 100 XCH wash trade nets ~1 XCH profit (~1% return on 100 XCH capital). Not economically viable.

---

## 5. Files to Change

### 5.1 `workers/credit-tracker/worker.ts`

**What to change:**

1. **Replace constants** (lines 15-18):

   Remove:
   ```typescript
   const CREDITS_PER_FLOOR = 50;
   const FLOOR_FALLBACK_XCH = 100;
   const MIN_EFFECTIVE_FLOOR = 0.5;
   const WHALE_COEFFICIENT = 0.2;
   ```

   Replace with:
   ```typescript
   // === Economic constants ===
   // Royalty: 10% on Farmers Plot sales. Your Wojak mint: 0.2 XCH.
   // CREDITS_PER_XCH = (0.10 / 0.20) * 100 = 50
   // At floor, 1 purchase = 1 free mint (revenue-neutral with royalty income).
   const CREDITS_PER_XCH = 50;

   // Asymptotic whale bonus cap: multiplier never exceeds 1.30.
   // Wash trading breaks even at ~3x floor, max ~1% profit at extreme prices.
   const MAX_WHALE_BONUS = 0.30;

   const MIN_EFFECTIVE_FLOOR = 0.5;
   const FLOOR_FALLBACK_XCH = 100; // 1.0 XCH (x100) when no snapshot
   ```

2. **Replace `calculateCredits` function** (lines 50-62):

   Remove the entire function and replace with:
   ```typescript
   function calculateCredits(priceXch: number, floorXch: number): {
     credits: number;
     multiplier: number;
   } {
     const effectiveFloor = Math.max(MIN_EFFECTIVE_FLOOR, floorXch);
     const priceRatio = Math.max(1, priceXch / effectiveFloor);

     // Asymptotic multiplier: approaches (1 + MAX_WHALE_BONUS) but never exceeds it
     const whaleMultiplier = 1 + (MAX_WHALE_BONUS * (1 - 1 / priceRatio));

     // Credits proportional to XCH spent (not floor multiples)
     const rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier;

     return {
       credits: Math.round(rawCredits * 100),
       multiplier: Math.round(whaleMultiplier * 10000),
     };
   }
   ```

3. **Do NOT change anything else in this file.** The rest of the worker (event processing, floor snapshots, CAT processing, batch logic) stays exactly the same.

### 5.2 `scripts/backfill-credits.ts`

**What to change:**

1. **Replace constants** (lines 36-38):

   Remove:
   ```typescript
   const CREDITS_PER_FLOOR = 50;
   const MIN_EFFECTIVE_FLOOR = 0.5;
   const WHALE_COEFFICIENT = 0.2;
   ```

   Replace with:
   ```typescript
   const CREDITS_PER_XCH = 50;
   const MAX_WHALE_BONUS = 0.30;
   const MIN_EFFECTIVE_FLOOR = 0.5;
   ```

2. **Replace `calculateCredits` function** (lines 100-113):

   Same replacement as in the worker (identical function body).

3. **Do NOT change anything else.** Same backfill logic, same SQL generation, same CLI.

### 5.3 `docs/CREDITS-FORMULA.md`

**Replace the entire file** with updated documentation that reflects the new formula. Include:

- The economic model (royalty rate, mint price, revenue-neutrality)
- The new constants with explanations
- The new formula with step-by-step
- Worked examples (at floor, above floor, whale)
- The wash trade safety analysis (brief — point to this spec for full table)
- Data flow (same as before)
- "See also" links (same as before)

### 5.4 `docs/CREDIT-LEADERBOARD-SYSTEM.md`

**Update section 4.3 only** ("Credit formula"). Replace the constants and formula steps with the new ones. Keep everything else in this file exactly the same.

---

## 6. Files to NOT Change

These files use credits but do not contain the formula. They must NOT be modified:

- `functions/api/credits/leaderboard.ts` — reads stored credits, does not calculate them
- `functions/api/credits/balance.ts` — reads stored credits, does not calculate them
- `functions/api/credits/history.ts` — reads stored credits, does not calculate them
- `functions/api/credits/status.ts` — reads metadata, no formula
- `functions/api/credits/audit-events.ts` — reads event IDs, no formula
- `functions/api/mint/prepare.ts` — spends credits, does not calculate them
- `src/contexts/MintContext.tsx` — reads balance from API, no formula
- `src/components/generator/ActionBar.tsx` — reads balance from context, no formula
- `functions/migrations/030_credit_system.sql` — schema unchanged (no new columns)

---

## 7. What About Existing credit_events Rows?

**Do nothing.** Existing rows keep their old `credits_earned` values. Only new events (processed after deployment) use the new formula. This is consistent with how the system already works (see section 11.3 of CREDIT-LEADERBOARD-SYSTEM.md: "Changing the formula does not recompute existing rows").

If you want to recompute historical credits later, that's a separate task using the backfill script. Not part of this spec.

---

## 8. Verification After Implementation

Run these checks:

1. **Type check:** `npm run typecheck` — must pass
2. **Build:** `npm run build` — must pass
3. **Manual formula check:** In the worker's `calculateCredits`, verify these produce correct results:
   - `calculateCredits(2.0, 2.0)` → credits ≈ 10000 (100 display credits = 1 free mint)
   - `calculateCredits(4.0, 2.0)` → credits ≈ 23000 (230 display credits)
   - `calculateCredits(20.0, 2.0)` → credits ≈ 127000 (1270 display credits)
   - `calculateCredits(2.0, 2.0)` multiplier = 10000 (1.0x — no bonus at floor)
   - `calculateCredits(100.0, 2.0)` multiplier ≈ 12970 (1.297x — near cap)
4. **Grep for old constants:** Make sure `CREDITS_PER_FLOOR` and `WHALE_COEFFICIENT` do not appear anywhere in the codebase after changes (except in git history and this spec file).

---

## 9. Summary of All Changes

| What | Old | New |
|------|-----|-----|
| Constant name | `CREDITS_PER_FLOOR` | `CREDITS_PER_XCH` |
| Constant value | 50 | 50 (same value, different meaning) |
| Whale constant | `WHALE_COEFFICIENT = 0.2` | `MAX_WHALE_BONUS = 0.30` |
| Whale formula | `1 + 0.2 * ln(priceRatio)` | `1 + 0.30 * (1 - 1/priceRatio)` |
| Whale behavior | Unbounded (grows forever) | Asymptotic (caps at 1.30) |
| Credit base | `50 * priceRatio * multiplier` | `50 * priceXch * multiplier` |
| Credit meaning | "credits per floor multiple" | "credits per XCH spent" |
| At floor (2 XCH) | 50 credits | 100 credits (= 1 free mint) |
| Revenue model | Accidental | Intentional (royalty-funded) |
| Wash trade safe? | No (profitable above ~2.7x floor) | Yes (max ~1% at extreme prices) |
| Files changed | 4 files | 4 files (same set) |
| Schema changes | None | None |
| Existing data | Untouched | Untouched |
