# SPEC: Add Combat Identity to NFT Metadata (IPFS / CHIP-0007)

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Independent:** Yes — does not depend on any other pending spec

---

## Design Intent (Read This First)

Combat Type, Nature, and Ability must be baked into the CHIP-0007 metadata
uploaded to IPFS at mint time. Once on-chain they are permanent and trustless,
enabling any future collection that follows the same attribute schema to battle
against Wojak NFTs automatically — no wojak.ink-specific tooling required.

The user does NOT see these attributes during the generator flow. They are
calculated silently and written to the NFT. The battle system remains invisible
to the user at mint time.

---

## What Already Exists (Do NOT re-implement)

`functions/api/mint/process.ts` already has:

```typescript
// Lines 25-26: imports are already present
import { calculateCombatIdentity } from '../../../src/lib/combat/identity-calculator';
import { assignMoves } from '../../../src/lib/combat/move-assigner';

// Lines 31-44: helper already defined
export function buildCombatAttributes(combat: {
  type: string; nature: string; ability: string; moves: string[];
}): Array<{ trait_type: string; value: string }> {
  return [
    { trait_type: 'Combat Type', value: combat.type },
    { trait_type: 'Nature', value: combat.nature },
    { trait_type: 'Ability', value: combat.ability },
    { trait_type: 'Move 1', value: combat.moves[0] },
    { trait_type: 'Move 2', value: combat.moves[1] },
    { trait_type: 'Move 3', value: combat.moves[2] },
    { trait_type: 'Move 4', value: combat.moves[3] },
  ];
}
```

Combat identity is also already calculated in `finalizeJob()` (lines 472–493)
for the database. That code does NOT need to change.

---

## Context Files to Read First

1. `CLAUDE.md`
2. `functions/api/mint/process.ts` — read lines 140–210 and 460–515 in full

---

## The One File to Modify

**Only file:** `functions/api/mint/process.ts`

No other files change.

---

## The One Change

### Where to look

In `processJob()`, find this block (approximately lines 149–176):

```typescript
const layers = JSON.parse(job.layers_json) as Record<string, string>;
const _colors = JSON.parse(job.colors_json) as Record<string, string>;
const consolidated = consolidateTraits(layers);

// ...

const attributes = [...consolidated.values()]
  .map(({ traitType, displayName }) => ({ trait_type: traitType, value: displayName }))
  .sort((a, b) => {
    const ai = TRAIT_ORDER.indexOf(a.trait_type);
    const bi = TRAIT_ORDER.indexOf(b.trait_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

const customName = job.custom_name;
```

### What to change

**Step 1:** Rename `_colors` → `colors` (remove the underscore — it will now be used):

```typescript
const colors = JSON.parse(job.colors_json) as Record<string, string>;
```

**Step 2:** Insert the combat identity calculation and attribute append immediately
after the `attributes` sort block and before the `customName` line:

```typescript
  // ── Combat identity → IPFS attributes ──
  // Calculate here (before metadata build + IPFS upload) so combat attributes
  // are baked into the on-chain metadata. Also calculated in finalizeJob() for
  // the combat_fighters DB record — both use the same deterministic function.
  const combatTraitEntries: { traitId: string; layer: string }[] = [];
  const combatColorMap: Record<string, string> = {};

  for (const [layer, path] of Object.entries(layers)) {
    if (!path || typeof path !== 'string') continue;
    const parts = path.split('/');
    if (parts.length >= 3) {
      const traitId = `${parts[parts.length - 2]}_${parts[parts.length - 1].replace(/\.[^.]+$/, '')}`;
      combatTraitEntries.push({ traitId, layer });
      const hex = colors[layer];
      if (hex) combatColorMap[traitId] = hex;
    }
  }

  const combatIdentity = calculateCombatIdentity({
    traits: combatTraitEntries,
    colors: combatColorMap,
    details: {},
  });

  const combatMoveAssignment = assignMoves(combatIdentity);

  attributes.push(...buildCombatAttributes({
    type: combatIdentity.type,
    nature: combatIdentity.nature,
    ability: combatIdentity.ability,
    moves: combatMoveAssignment.valid ? combatMoveAssignment.moves : ['', '', '', ''],
  }));
```

### What the final attributes array looks like on-chain

After this change, the CHIP-0007 `attributes` field uploaded to IPFS will be:

```json
[
  { "trait_type": "Background", "value": "Casino" },
  { "trait_type": "Base",       "value": "Wojak" },
  { "trait_type": "Clothes",    "value": "Suit" },
  { "trait_type": "Head",       "value": "Beanie" },
  { "trait_type": "Combat Type","value": "FIRE" },
  { "trait_type": "Nature",     "value": "Hasty" },
  { "trait_type": "Ability",    "value": "Flash Fire" },
  { "trait_type": "Move 1",     "value": "Flamethrower" },
  { "trait_type": "Move 2",     "value": "Fire Blast" },
  { "trait_type": "Move 3",     "value": "Heat Wave" },
  { "trait_type": "Move 4",     "value": "Will-O-Wisp" }
]
```

---

## Constraints

- Modify ONLY `functions/api/mint/process.ts`
- Do NOT change `finalizeJob()` — its combat calculation stays as-is for the DB record
- Do NOT change `buildCombatAttributes()` — use it as-is
- Do NOT change `calculateCombatIdentity` or any combat data files
- Do NOT add `!important` (not CSS — noted for discipline)
- Do NOT create new files

---

## Out of Scope

- No changes to `prepare.ts` (legacy route, not the active mint path)
- No changes to any combat data files
- No changes to the generator UI
- No changes to the database schema
- No changes to `identity-calculator.ts`

---

## Success Criteria (self-check before reporting done)

- [ ] Build passes: `npm run build`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] `_colors` renamed to `colors` (no underscore prefix)
- [ ] Combat identity block inserted after `attributes` sort, before `customName`
- [ ] `attributes.push(...buildCombatAttributes(...))` is present
- [ ] `finalizeJob()` is unchanged
- [ ] No new files created

---

## Verification

```bash
# Confirm buildCombatAttributes is called in processJob (not just defined)
grep -n "buildCombatAttributes" functions/api/mint/process.ts
# Expected: 2 lines — the definition (line ~32) and the new call site (new line)

# TypeScript
npx tsc --noEmit

# Build
npm run build
```

---

## Suggested Commit Message

```
feat(mint): add Combat Type, Nature, Ability to CHIP-0007 metadata

Combat identity is now baked into the NFT at mint time. The attributes
array uploaded to IPFS includes: Combat Type, Nature, Ability, Move 1-4.

Enables cross-collection battle compatibility — any collection using the
same attribute schema can fight Wojak NFTs without wojak.ink tooling.

Only file changed: functions/api/mint/process.ts
```

---

## Report Format When Done

```
DONE: Add Combat Identity to NFT Metadata
Files changed: functions/api/mint/process.ts (only)
Build: PASS / FAIL
TypeScript: PASS / FAIL
Self-checks:
  - _colors renamed to colors: PASS/FAIL
  - Combat block inserted in processJob before metadata build: PASS/FAIL
  - buildCombatAttributes called: PASS/FAIL
  - finalizeJob unchanged: PASS/FAIL
  - Build passes: PASS/FAIL
Notes: [anything unexpected]
```
