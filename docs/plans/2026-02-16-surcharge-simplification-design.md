# Surcharge Simplification Design

## Problem

The current surcharge system uses per-category fair shares (Head=105, Clothes=117, Face Wear=233) with a complex ramp+penalty formula. This is hard for users to understand and doesn't clearly communicate "popular traits cost more."

## New Formula

Replace the entire fair-share system with one universal power curve:

```
surcharge = scale × (effectiveUsage - 1) ^ exponent
scale = targetSurcharge / (targetUses - 1) ^ exponent
```

If `effectiveUsage <= 1`, surcharge = 0 (first use is always free).

### Constants

| Constant | Old | New |
|----------|-----|-----|
| `SURCHARGE_SCALE` | N/A (derived) | Auto-calculated |
| `SURCHARGE_TARGET` | N/A | 1.275 XCH |
| `SURCHARGE_TARGET_USES` | N/A | 200 |
| `SURCHARGE_EXPONENT` | 2.0 (penalty) | 0.90 |
| `DECAY_HALF_LIFE_DAYS` | 30 | 14 |

### Delete

- `SURCHARGE_RAMP_RATE`
- `SURCHARGE_PENALTY_SCALE`
- `SURCHARGE_PENALTY_EXPONENT`
- `SURCHARGE_FAIR_SHARES` (entire object)

### Price Table (static, no decay)

| Uses | Surcharge | Total |
|------|-----------|-------|
| 1 | 0.00 | 0.20 |
| 5 | 0.04 | 0.24 |
| 10 | 0.08 | 0.28 |
| 25 | 0.20 | 0.40 |
| 50 | 0.40 | 0.60 |
| 100 | 0.78 | 0.98 |
| 200 | 1.28 | 1.48 |

### Decay

Exponential decay with 14-day half-life (down from 30). A trait's effective usage halves every 14 days of inactivity. At steady state with constant minting rate r/day:

```
steady_state = r × 14 / ln(2) ≈ r × 20.2
```

### Revenue Estimate (90-day mint-out)

With equal usage, 600 free mints, 3600 paid:
- Base revenue: 720 XCH
- Surcharge revenue: ~1,400 XCH
- **Total: ~2,100 XCH**

## Exempt Traits

Unchanged: "No Headgear" and "No Face Wear" — surcharge always 0.

## Credit System Changes: Top-3 Restriction

**New rule**: Free mint credits can be used for any trait EXCEPT the top 3 most popular traits in each surcharge category.

### How "Top 3" Is Determined

Query `trait_usage` for each surcharge category, ordered by `effective_usage` (with decay applied), take the top 3. Exempt traits ("No Headgear", "No Face Wear") are excluded from this ranking.

### Behavior

- If a minter's selected traits include ANY top-3 trait from ANY category → **cannot use free credits**, must pay XCH
- If all selected traits are outside the top 3 → free credits work at base cost (100 credits)
- No more premium credit scaling (the old `10000 × (0.2 + surcharge) / 0.2` formula is removed)

### Why This Is Simpler

Old system: premium traits cost more credits (scaled by surcharge amount).
New system: top-3 traits per category are simply blocked from free mints. Binary decision.

## Files to Change

### Backend

1. **`functions/api/mint/_shared.ts`**
   - Replace surcharge constants with new ones
   - Rewrite `surchargeXch()` to use `scale × (usage - 1)^exp`
   - Update `DECAY_HALF_LIFE_DAYS` from 30 → 14
   - Add `getTop3Traits()` helper that queries trait_usage
   - Remove `SURCHARGE_FAIR_SHARES`, `SURCHARGE_RAMP_RATE`, `SURCHARGE_PENALTY_SCALE`, `SURCHARGE_PENALTY_EXPONENT`

2. **`functions/api/mint/pricing.ts`**
   - Remove `fairShare` and `percentOfFairShare` from response
   - Add `top3` field: `{ Head: string[], Clothes: string[], FaceWear: string[] }`
   - Simplify trait pricing to just `{ usageCount, effectiveUsage, surchargeXch }`

3. **`functions/api/mint/submit.ts`**
   - Replace premium credit scaling with top-3 block check
   - If free mint and any trait is top-3 → reject with clear error message
   - Remove `getPremiumCreditCost()` logic

4. **`functions/api/mint/process.ts`**
   - Update the UPSERT SQL for trait_usage to use half-life of 14 instead of 30
   - The `ln(0.5) * (julianday('now') - julianday(last_decay_at)) / 30` becomes `/ 14`

### Frontend

5. **`src/contexts/MintContext.tsx`**
   - Consume new `top3` field from pricing API
   - Replace `isPremiumTrait()` with `isTop3Trait()` check
   - Remove premium credit cost calculation
   - Show "This trait is in the top 3 — free credits cannot be used" in UI

6. **`src/components/generator/PricingLightbox.tsx`**
   - Update pricing display to remove fair-share percentages
   - Show top-3 badge on restricted traits
   - Simplify surcharge explanation text

### Database

7. **New migration**: `functions/migrations/0XX_surcharge_simplification.sql`
   - No schema changes needed (trait_usage table structure unchanged)
   - Optional: reset `effective_usage` and `last_decay_at` to start fresh with new half-life
