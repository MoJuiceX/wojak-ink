# Logo + Unmapped Can Combat Mapping — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire all 35 Chia coin logos and 8 unmapped beer hat cans into the combat identity system so every detail choice contributes type and nature points.

**Architecture:** Two changes to `detail-combat-map.ts` — (1) add 8 missing cans to the existing `Head_Beer-Hat` block, (2) add a new exported `LOGO_COMBAT_MAP` keyed by logo name. Then wire `logoOption` lookup into the combat identity calculator.

**Tech Stack:** TypeScript, `src/lib/combat/data/detail-combat-map.ts`, combat identity calculator (find via grep for `detailOption` or `DETAIL_COMBAT_MAP`).

---

## Context Files — Read These First

1. `src/lib/combat/data/detail-combat-map.ts` — understand `d()` helper signature and `DetailCombatEntry` type
2. `src/lib/combat/data/trait-type-map.ts` — understand `e()` helper and `TraitCombatEntry` type
3. `public/assets/wojak-layers/YourWojak-layers/manifest.json` — verify exact `name` values for the 8 unmapped cans (check `detailOptions[].name` under `Head_Beer-Hat`)
4. Grep for `DETAIL_COMBAT_MAP` across `src/lib/combat/` — find the calculator that sums up detail bonuses; that's where logoOption wiring goes
5. `src/types/generator.ts` — confirm `logoOption?: string` field on G2Selection

---

## Task 1: Add 8 Unmapped Cans to `Head_Beer-Hat`

**File:** `src/lib/combat/data/detail-combat-map.ts`

**Before starting:** Open `public/assets/wojak-layers/YourWojak-layers/manifest.json`, find `Head_Beer-Hat`, look at `detailOptions[].name` — use those exact name strings as keys (case-sensitive, same as existing entries like `'Drpepper'`, `'Mtndew'`).

Find the existing `'Head_Beer-Hat'` block (currently 10 entries: Aw, Coffee, Coke, Drpepper, Mtndew, Red-bull, Monster, Monster-orange, Citrus, Tang) and add these 8 entries:

```typescript
// Add inside 'Head_Beer-Hat': { ... } — verify key names match manifest detailOptions[].name exactly
'7up':            d('Head_Beer-Hat', '7up',            'AIR',     1, 'speed',   1),
'Budweiser':      d('Head_Beer-Hat', 'Budweiser',      'FIRE',    1, null,      0),
'Captain Morgan': d('Head_Beer-Hat', 'Captain Morgan', 'VENOM',   1, 'attack',  1),
'Corona':         d('Head_Beer-Hat', 'Corona',         'GRASS',   1, null,      0),
'Heineken':       d('Head_Beer-Hat', 'Heineken',       'GRASS',   1, 'sp_def',  1),
'LaCroix':        d('Head_Beer-Hat', 'LaCroix',        'AIR',     1, null,      0),
'Modelo':         d('Head_Beer-Hat', 'Modelo',         'NEUTRAL',  1, 'defense', 1),
'Sunny D':        d('Head_Beer-Hat', 'Sunny D',        'FIRE',    1, 'speed',   1),
```

> ⚠️ If any key in the manifest differs (e.g. `'Sunny-D'` instead of `'Sunny D'`), use the manifest value. Do NOT guess — open the file.

**Step 1:** Open manifest, note exact name strings for these 8 cans.

**Step 2:** Add the 8 entries using exact name strings.

**Step 3:** Build check — `npm run build` or `tsc --noEmit`. Fix any type errors.

**Step 4:** Commit
```bash
git add src/lib/combat/data/detail-combat-map.ts
git commit -m "feat(combat): map 8 unmapped beer hat cans to combat types

7up→AIR/speed, Budweiser→FIRE, CaptainMorgan→VENOM/attack,
Corona→GRASS, Heineken→GRASS/sp_def, LaCroix→AIR,
Modelo→NEUTRAL/defense, SunnyD→FIRE/speed"
```

---

## Task 2: Add `LOGO_COMBAT_MAP` to `detail-combat-map.ts`

**File:** `src/lib/combat/data/detail-combat-map.ts`

The logo system is shared across traits (Cap, Beer Hat underlayer, Hard Hat, Comrad Hat, Astronaut, Wizard Drip). One global map — Option A.

**Step 1:** Check the `d()` helper signature. If it requires a `traitId` as first arg, use `'_logo'` as a sentinel. If `DetailCombatEntry` can be constructed without traitId, use that. Adapt as needed — goal is a `Record<string, DetailCombatEntry>` (or equivalent simple type).

**Step 2:** Add this export after the existing `DETAIL_COMBAT_MAP`. Logo keys are the exact `logoOption` string values from `ASTRONAUT_LOGOS` in `src/components/generator/G2TraitPanel.tsx` (line ~18). Verify spelling against that array before pasting.

```typescript
/**
 * Shared logo combat bonuses — applies to any trait with a logoOption.
 * Keys match ASTRONAUT_LOGOS values exactly (case-sensitive).
 * Type reasoning: color/culture/meme association.
 */
export const LOGO_COMBAT_MAP: Record<string, { type: string; typePoints: number; nature: string | null; naturePoints: number }> = {
  'BEPE':        { type: 'VENOM',    typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'CASTER':      { type: 'PSYCHE',   typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'CAT':         { type: 'AIR',      typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'CHAD':        { type: 'FIRE',     typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'XCH':         { type: 'GRASS',    typePoints: 1, nature: null,      naturePoints: 0 },
  'CNI':         { type: 'NEUTRAL',  typePoints: 1, nature: 'defense', naturePoints: 1 },
  'COOKIES':     { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
  'Dexi Bucks':  { type: 'ELECTRIC', typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'DIG':         { type: 'GRASS',    typePoints: 1, nature: 'defense', naturePoints: 1 },
  'DWB':         { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
  'G4M':         { type: 'ELECTRIC', typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'GYATT':       { type: 'AIR',      typePoints: 1, nature: null,      naturePoints: 0 },
  'HOA':         { type: 'NEUTRAL',  typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'HONK':        { type: 'AIR',      typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'JOCK':        { type: 'FIRE',     typePoints: 1, nature: 'defense', naturePoints: 1 },
  'LOVE':        { type: 'PSYCHE',   typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'MAX':         { type: 'ELECTRIC', typePoints: 1, nature: 'sp_atk',  naturePoints: 1 },
  'MIRROR':      { type: 'PSYCHE',   typePoints: 1, nature: null,      naturePoints: 0 },
  'MMM':         { type: 'VENOM',    typePoints: 1, nature: null,      naturePoints: 0 },
  'MOG':         { type: 'DRAGON',   typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'MonkeyZoo':   { type: 'GRASS',    typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'MRMT':        { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
  'NeckCoin':    { type: 'NEUTRAL',  typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'NWO':         { type: 'VENOM',    typePoints: 1, nature: 'attack',  naturePoints: 1 },
  'PEPEcoin':    { type: 'VENOM',    typePoints: 1, nature: null,      naturePoints: 0 },
  'PIZZA':       { type: 'FIRE',     typePoints: 1, nature: null,      naturePoints: 0 },
  'PP':          { type: 'AIR',      typePoints: 1, nature: null,      naturePoints: 0 },
  'Spacebucks':  { type: 'ELECTRIC', typePoints: 1, nature: null,      naturePoints: 0 },
  'SPELLPOWER':  { type: 'PSYCHE',   typePoints: 1, nature: 'sp_atk',  naturePoints: 1 },
  'SPROUT':      { type: 'GRASS',    typePoints: 1, nature: null,      naturePoints: 0 },
  'STONKS':      { type: 'NEUTRAL',  typePoints: 1, nature: 'speed',   naturePoints: 1 },
  'TANG':        { type: 'FIRE',     typePoints: 1, nature: null,      naturePoints: 0 },
  'TVL':         { type: 'NEUTRAL',  typePoints: 1, nature: 'defense', naturePoints: 1 },
  'WITCHER':     { type: 'VENOM',    typePoints: 1, nature: 'sp_def',  naturePoints: 1 },
  'WOJAK':       { type: 'NEUTRAL',  typePoints: 1, nature: null,      naturePoints: 0 },
};
```

> ⚠️ If the existing `d()` helper returns a typed `DetailCombatEntry` with specific fields, match that type. If the inline object type above causes errors, adapt to match. Do NOT use `any`.

**Step 3:** Build check — `tsc --noEmit`. Fix type errors.

**Step 4:** Commit
```bash
git add src/lib/combat/data/detail-combat-map.ts
git commit -m "feat(combat): add LOGO_COMBAT_MAP for 35 Chia coin logos

Shared global map — same logo bonus regardless of which trait it
appears on (Cap, Beer Hat, Hard Hat, Astronaut, Wizard Drip, Comrad Hat).
MOG is the only DRAGON logo (rare). TANG/PIZZA→FIRE, XCH→GRASS,
HONK→AIR, MOG→DRAGON, etc. Based on color + cultural association."
```

---

## Task 3: Wire `logoOption` into the Combat Identity Calculator

**Step 1:** Find the calculator. Run:
```bash
grep -r "DETAIL_COMBAT_MAP" src/lib/combat/ --include="*.ts" -l
```
Open the file(s) found. Look for where `detailOption` is looked up against `DETAIL_COMBAT_MAP`. This is where you add the parallel `logoOption` lookup.

**Step 2:** Import `LOGO_COMBAT_MAP` at the top of the calculator file:
```typescript
import { DETAIL_COMBAT_MAP, LOGO_COMBAT_MAP } from './data/detail-combat-map';
```

**Step 3:** After the existing `detailOption` scoring block, add `logoOption` scoring. The G2Selection has `logoOption?: string`. Pattern:

```typescript
// After existing detailOption lookup block:
if (selection.logoOption && LOGO_COMBAT_MAP[selection.logoOption]) {
  const logoBonuses = LOGO_COMBAT_MAP[selection.logoOption];
  // accumulate logoBonuses.type / logoBonuses.typePoints same as detail bonus
  // accumulate logoBonuses.nature / logoBonuses.naturePoints same as detail bonus
}
```

Adapt to match the exact accumulation pattern already in use (typePoints map, naturePoints map, etc.) — don't invent a new pattern.

**Step 4:** Build check — `tsc --noEmit`. Fix type errors.

**Step 5:** Smoke test in generator:
1. Load generator, select Beer Hat
2. Pick `XCH` logo → open combat preview → verify GRASS gets +1
3. Pick `MOG` logo → verify DRAGON gets +1, attack gets +1
4. Pick a different trait (Astronaut), add `HONK` logo → verify AIR +1, sp_def +1

**Step 6:** Commit
```bash
git add src/lib/combat/
git commit -m "feat(combat): wire logoOption into combat identity scoring

Any trait with a logoOption now contributes type+nature points via
LOGO_COMBAT_MAP. Affects Cap, Beer Hat underlayer, Hard Hat,
Comrad Hat, Astronaut, Wizard Drip."
```

---

## Success Criteria

- [ ] `tsc --noEmit` passes (no build errors)
- [ ] All 8 unmapped cans appear in `Head_Beer-Hat` block in detail-combat-map.ts
- [ ] `LOGO_COMBAT_MAP` exported with all 35 entries
- [ ] Generator: selecting XCH logo on any compatible trait adds GRASS +1 to combat preview
- [ ] Generator: selecting MOG logo adds DRAGON +1 + attack +1
- [ ] Generator: selecting no logo = no logo bonus (undefined key → skip)
- [ ] No `any` types introduced

## Out of Scope

- Do NOT change any existing can mappings (Tang, Monster, etc.)
- Do NOT change trait-type-map.ts (base trait points)
- Do NOT touch canvas renderer or layer rendering
- Do NOT change move/ability assignment logic
- Do NOT add new types beyond the 8 that exist (FIRE, VENOM, GRASS, ELECTRIC, AIR, PSYCHE, NEUTRAL, DRAGON)

## Report Format

```
DONE: Logo + Unmapped Can Combat Mapping
Files changed: [list]
Build: PASS / FAIL
Self-checks:
  - 8 unmapped cans added: pass/fail
  - LOGO_COMBAT_MAP has 35 entries: pass/fail
  - XCH logo → GRASS +1 in generator: pass/fail
  - MOG logo → DRAGON +1 + attack +1: pass/fail
  - No logoOption → no bonus: pass/fail
  - tsc --noEmit: pass/fail
Notes: [anything unexpected]
```
