# SPEC: Add STONE Coverage to Color-Type Map

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Independent:** Yes — does not depend on Spec 1 or Spec 2

---

## Design Intent (Read This First)

STONE is the most under-represented type in the color system. Currently STONE only
appears in the achromatic (gray) band at L 20–38%. This means only perfectly neutral
dark-gray hex colors route to STONE.

Real-world stone colors — concrete, limestone, slate, cool khaki, muted blue-gray —
have a slight tint (S 10–22%) and are missed by both:
- The achromatic block (requires S < 10%)
- The hue-based block (assumes S > 22% for hue to be meaningful)

The fix: insert one block in the gap between achromatic and hue-based mapping that
catches these near-achromatic, slightly-tinted stone-like colors and routes them to
STONE.

---

## Context Files to Read First

1. `CLAUDE.md`
2. `src/lib/combat/data/color-type-map.ts` — read in full before touching

---

## The One File to Modify

**Only file:** `src/lib/combat/data/color-type-map.ts`

No other files change.

---

## The One Change

### Where to insert

Find this exact block (the end of the achromatic section, just before the warm
neutrals comment):

```typescript
  // --- Warm neutrals ---
  // Brown: S 10-50%, H 15-45, L 20-50%
  if (s >= 10 && s <= 50 && h >= 15 && h <= 45 && l >= 20 && l <= 50) {
```

### What to insert immediately before it

```typescript
  // --- Near-achromatic stone tints ---
  // Colors too saturated for the achromatic block (S >= 10%) but too muted
  // to map meaningfully by hue (S <= 22%). Covers concrete, limestone, slate,
  // cool khaki, muted blue-gray — real-world stone and mineral colors.
  // Excludes warm hues (H 15-55°) so those still fall through to EARTH below.
  if (s >= 10 && s <= 22 && l >= 20 && l <= 55 && !(h >= 15 && h <= 55)) {
    return { primary: 'STONE', primaryPts: 3, secondary: 'EARTH', secondaryPts: 1 };
  }
```

### Why this range

| Condition | Reasoning |
|-----------|-----------|
| `s >= 10` | Doesn't overlap with achromatic block (`s < 10`) |
| `s <= 22` | Below this, hue is still indeterminate / "muddy" |
| `l >= 20 && l <= 55` | Avoids near-black (already SHADOW) and mid-light grays (already METAL/NEUTRAL) |
| `!(h >= 15 && h <= 55)` | Warm hues stay as EARTH via the warm-neutrals block below |

### Colors this now routes to STONE (examples)

| Hex | HSL approx | Before | After |
|-----|-----------|--------|-------|
| `#7A8090` | H 220°, S 11%, L 54% | WATER (hue) | STONE |
| `#6B7070` | H 180°, S 4%, L 43% | STONE (achromatic) | STONE (unchanged) |
| `#8B8FA0` | H 225°, S 12%, L 59% | WATER | STONE |
| `#74796B` | H 82°, S 7%, L 45% | STONE (achromatic) | STONE (unchanged) |
| `#7D8275` | H 82°, S 6%, L 48% | STONE (achromatic) | STONE (unchanged) |
| `#9A9080` | H 38°, S 13%, L 56% | (warm hue — stays EARTH) | EARTH |

### Colors not affected

- Pure grays (S < 10%): still caught by achromatic block first
- Warm browns (H 15–55°, S 10–22%): excluded by `!(h >= 15 && h <= 55)`, still EARTH
- Saturated colors (S > 22%): still map by hue as before
- Neons and vivids: S > 90%, unaffected

---

## Constraints

- Modify ONLY `src/lib/combat/data/color-type-map.ts`
- Do NOT change the achromatic block
- Do NOT change the warm neutrals block
- Do NOT change the hue-based mapping block
- Do NOT add new functions or imports
- Do NOT change any logic other than inserting the one new block
- Do NOT add `!important` (not CSS — but noted for habit)
- Do NOT create new files

---

## Out of Scope

- No changes to trait-type-map.ts
- No changes to color-nature-map.ts
- No changes to detail-combat-map.ts
- No changes to any UI files
- No changes to manifest.json or traitNameMap

---

## Success Criteria (self-check before reporting done)

- [ ] Build passes: `npm run build`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Exactly one new `if` block inserted — no other lines changed
- [ ] Insertion is between the achromatic block and the warm-neutrals block
- [ ] `!(h >= 15 && h <= 55)` exclusion is present (warm hues stay as EARTH)
- [ ] No new functions, no new imports
- [ ] No new files created

---

## Verification Commands

```bash
# Confirm the new block is present
grep -n "Near-achromatic stone" src/lib/combat/data/color-type-map.ts

# Confirm no other lines changed (should be ~145 lines total, was 141)
wc -l src/lib/combat/data/color-type-map.ts

# TypeScript
npx tsc --noEmit

# Build
npm run build
```

Expected:
- `grep` returns one match on line ~72
- `wc -l` returns ~145 (added ~4 lines)
- TypeScript: no errors
- Build: PASS

---

## Suggested Commit Message

```
feat(combat): add STONE coverage to near-achromatic color range

STONE was only reachable via achromatic grays (S < 10%, L 20-38%).
Muted real-world stone colors (concrete, slate, limestone) at S 10-22%
were falling through to hue-based mapping instead.

Inserts one block: S 10-22%, L 20-55%, non-warm hue → STONE/EARTH.
Warm hues (H 15-55°) excluded so browns still resolve to EARTH.
No other logic changed.
```

---

## Report Format When Done

```
DONE: Add STONE Coverage to Color-Type Map
Files changed: src/lib/combat/data/color-type-map.ts (only)
Build: PASS / FAIL
TypeScript: PASS / FAIL
Self-checks:
  - One block inserted, no other lines changed: PASS/FAIL
  - Insertion position correct (after achromatic, before warm-neutrals): PASS/FAIL
  - Warm hue exclusion present: PASS/FAIL
  - Build passes: PASS/FAIL
Notes: [anything unexpected]
```
