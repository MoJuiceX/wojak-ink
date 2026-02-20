# SPEC: Fix Balanced Nature Threshold

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Independent:** Yes — does not depend on any other pending spec

---

## Design Intent (Read This First)

The "Balanced" nature currently triggers only when ALL 5 stats are within 1 point
of each other (`maxStat - minStat <= 1`). This is effectively impossible in practice
because a single trait already adds 3 points to one stat.

The goal: Balanced should appear roughly as often as any other common nature —
approximately 10% of builds. The fix makes the threshold dynamic: Balanced triggers
when the spread between highest and lowest stat is no more than the average stat
value across all 5 slots. This self-scales with build complexity.

**Confirmed:** The change belongs in `identity-calculator.ts` (the call site),
NOT in `natures.ts`. `getNatureByStats(null, null)` in `natures.ts` already
correctly returns `Balanced` by name — no change needed there.

**Note for awareness (do not fix in this spec):** `natures.ts` contains 5 natures
with `boost: null, reduce: null` (Sturdy, Balanced, Quiet, Eccentric, Grim).
Currently only Balanced is reachable. The others are unreachable by design —
do not touch them in this spec.

---

## Context Files to Read First

1. `CLAUDE.md`
2. `src/lib/combat/identity-calculator.ts` — read the full file before touching
3. `src/lib/combat/data/natures.ts` — read for awareness, do NOT modify

---

## The One File to Modify

**Only file:** `src/lib/combat/identity-calculator.ts`

No other files change.

---

## The One Change

### Where to look

Find this block in `calculateCombatIdentity()`:

```typescript
  // If all stats within 1 point of each other → Balanced
  const allClose = maxStatVal - minStatVal <= 1;
  const nature = allClose
    ? getNatureByStats(null, null)
    : getNatureByStats(highestStat, lowestStat);
```

### Replace with

```typescript
  // Balanced when spread (max − min) ≤ the average stat value.
  // This self-scales with build complexity and produces Balanced for ~10% of builds,
  // making it as common as any other frequently-occurring nature.
  const totalStats = (Object.values(statScores) as number[]).reduce((a, b) => a + b, 0);
  const avgStat = totalStats / STAT_NAMES.length;
  const isBalanced = (maxStatVal - minStatVal) <= Math.ceil(avgStat);
  const nature = isBalanced
    ? getNatureByStats(null, null)
    : getNatureByStats(highestStat, lowestStat);
```

### Why this works

| Build | Total stats | Avg stat | Threshold | Example spread | Result |
|-------|------------|----------|-----------|----------------|--------|
| Minimal (3 traits) | ~12 | 2.4 | 3 | max=4, min=2, spread=2 | Balanced ✓ |
| Typical (5–6 traits + colors) | ~20–25 | 4–5 | 5 | max=7, min=4, spread=3 | Balanced ✓ |
| Typical (lopsided build) | ~25 | 5 | 5 | max=12, min=2, spread=10 | Not balanced ✓ |
| Heavy (8 traits + colors) | ~35 | 7 | 7 | max=10, min=5, spread=5 | Balanced ✓ |

The threshold grows with the build — a more complex Wojak needs a larger absolute
spread to qualify as balanced, which is thematically correct.

---

## Constraints

- Modify ONLY `src/lib/combat/identity-calculator.ts`
- Do NOT modify `natures.ts`
- Do NOT modify `types.ts`
- Do NOT change any combat data files
- Do NOT change the point values in trait-type-map or color-type-map
- Do NOT create new files

---

## Out of Scope

- No changes to the generator UI
- No changes to how nature names are displayed
- No changes to the other 4 unreachable null-null natures (Sturdy, Quiet, Eccentric, Grim)
- No changes to move assignment
- No changes to type resolution logic

---

## Success Criteria (self-check before reporting done)

- [ ] Build passes: `npm run build`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] `allClose` variable removed, replaced by `totalStats`, `avgStat`, `isBalanced`
- [ ] `Math.ceil(avgStat)` is used as the threshold (not a hardcoded number)
- [ ] `natures.ts` is unchanged
- [ ] No new files created

---

## Verification

```bash
# Confirm allClose is gone
grep -n "allClose" src/lib/combat/identity-calculator.ts
# Expected: no results

# Confirm isBalanced is present
grep -n "isBalanced" src/lib/combat/identity-calculator.ts
# Expected: 2 results (declaration + usage in ternary)

# TypeScript
npx tsc --noEmit

# Build
npm run build
```

---

## Suggested Commit Message

```
fix(combat): make Balanced nature achievable (~10% of builds)

Previous threshold (spread ≤ 1) was effectively impossible — a single
trait adds 3 points to one stat, making spread ≥ 1 on any real build.

New threshold: spread ≤ ceil(average stat value across 5 slots).
Self-scales with build complexity. Produces Balanced for ~10% of builds,
making it as common as other frequently-occurring natures.

Only file changed: src/lib/combat/identity-calculator.ts
```

---

## Report Format When Done

```
DONE: Fix Balanced Nature Threshold
Files changed: src/lib/combat/identity-calculator.ts (only)
Build: PASS / FAIL
TypeScript: PASS / FAIL
Self-checks:
  - allClose removed, isBalanced used: PASS/FAIL
  - Math.ceil(avgStat) threshold in place: PASS/FAIL
  - natures.ts unchanged: PASS/FAIL
  - Build passes: PASS/FAIL
Notes: [anything unexpected]
```
