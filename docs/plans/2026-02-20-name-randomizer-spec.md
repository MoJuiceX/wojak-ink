# SPEC: Tang Gang Name Randomizer

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Independent:** Yes — does not depend on any other pending spec

---

## Design Intent (Read This First)

Replace the generic word pools in the mint name randomizer with culturally resonant
names drawn from Tang Gang lore, Wojak internet culture, crypto culture, and gaming
naming conventions. The goal is names that are funny and community-specific rather
than generic ("Donut Lord", "Sigma Grind").

The algorithm (50% full names / 50% combinatorial) and all validation/utility functions
are unchanged. Only the three word arrays are replaced.

---

## Context Files to Read First

1. `CLAUDE.md`
2. `src/lib/nameGenerator.ts` — read the full file before touching

---

## The One File to Modify

**Only file:** `src/lib/nameGenerator.ts`

No other files change.

---

## The One Change

Replace the three word arrays (`PREFIXES`, `SUFFIXES`, `FULL_NAMES`) with:

```typescript
const PREFIXES = [
  // Tang Gang — orange / citrus / Chia community
  'Tang', 'Honk', 'Bepe', 'Pulp', 'Citrus', 'Zesty', 'Tangy', 'Orange',
  'Peel', 'Rind', 'Juice', 'Juicy', 'Wedge', 'Navel', 'Squeeze',
  // Wojak / Internet
  'Doomer', 'Bloomer', 'Coomer', 'Feels', 'Based', 'Cursed', 'Gigachad', 'Brainlet',
  // Crypto
  'Degen', 'Diamond', 'Laser', 'HODL', 'Rekt', 'Wagmi', 'Whale', 'Bullish', 'Rugged',
  // Gaming / Dark
  'Shadow', 'Iron', 'Ghost', 'Hyper', 'Ultra', 'Void', 'Chaos', 'Neon',
  // Internet
  'Turbo', 'Sigma', 'Alpha', 'Omega', 'Clown', 'Cringe', 'NPC',
];

const SUFFIXES = [
  'Maxi', 'Lord', 'King', 'OG', 'Fren', 'Sage', 'Wizard', 'Knight', 'Monk', 'Chad',
  'Hands', 'Eyes', 'Pilled', 'Gang', 'Brain', 'Mode', 'Vibes', '9000', 'IRL', 'Ape',
  'Slayer', 'Master',
];

const FULL_NAMES = [
  // Tang Gang
  'Winners Win', 'Orange Maxi', 'Honk Pilled', 'Tang Lord', 'Pulp Gang',
  'Bepe Maxi', 'Neck Growth', 'Zesty Chad', 'Citrus King', 'Peel Gang',
  'Juice Wizard', 'Navel Sage',
  // Wojak / Internet
  'Feels Good', 'This Is Fine', 'Doomer Mode', 'Gigachad OG', 'Big Brain',
  'Clown World', 'NPC Brain', 'Touch Grass', 'Brainlet IRL', 'Based Lord',
  // Crypto
  'Diamond Hands', 'Paper Hands', 'Laser Eyes', 'Wagmi Fren', 'Rekt Again',
  'Degen Lord', 'Rug Survivor', 'Whale Alert', 'Moon Soon', 'NGMI Steve',
  // Gaming / Dark
  'Void Walker', 'Shadow King', 'Iron Fist', 'Chaos Mode', 'Neon Ghost', 'Coomer IRL',
];
```

**Do not change anything else in the file.** The algorithm, MAX_NAME_LENGTH, validateName(),
formatFullName(), and the DID generator at the bottom are all untouched.

---

## Constraints

- Modify ONLY `src/lib/nameGenerator.ts`
- Do NOT change `generateRandomName()` logic
- Do NOT change `validateName()` or `formatFullName()`
- Do NOT touch the DID generator functions at the bottom
- Do NOT change MAX_NAME_LENGTH (stays 15)
- Do NOT create new files

---

## Why all combos fit in 15 chars

All PREFIXES ≤ 8 chars. All SUFFIXES ≤ 6 chars.
Combined with 1 space: 8 + 1 + 6 = 15. No runtime overflow possible.

---

## Success Criteria (self-check before reporting done)

- [ ] Build passes: `npm run build`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] PREFIXES contains Tang Gang citrus words (Tang, Honk, Bepe, Pulp, Peel, Rind, etc.)
- [ ] SUFFIXES contains Maxi, Pilled, Vibes, 9000, IRL
- [ ] FULL_NAMES contains "Winners Win", "Diamond Hands", "Gigachad OG"
- [ ] Old generic words removed (Moon, Donut, Lil, Papa, Boy, Frog, etc.)
- [ ] generateRandomName(), validateName(), formatFullName() unchanged
- [ ] DID generator functions unchanged
- [ ] No new files created

---

## Verification

```bash
# Confirm Tang Gang words are in
grep -n "Bepe\|Honk\|Peel\|Pulp" src/lib/nameGenerator.ts
# Expected: results in PREFIXES

# Confirm generic words are gone
grep -n "'Moon'\|'Donut'\|'Lil'" src/lib/nameGenerator.ts
# Expected: no results

# TypeScript
npx tsc --noEmit

# Build
npm run build
```

---

## Suggested Commit Message

```
feat(generator): replace name randomizer with Tang Gang / Wojak / crypto pools

Generic names (Moon Boy, Donut Lord) replaced with culturally specific
word pools: Tang Gang citrus culture (Honk, Bepe, Peel, Pulp, Squeeze),
Wojak internet memes (Doomer, Gigachad, Brainlet), crypto culture
(Diamond Hands, Wagmi, HODL, Rekt), and gaming/dark (Void, Shadow, Chaos).

~50 prefixes × 22 suffixes + 38 curated full names. All combos ≤ 15 chars.

Only file changed: src/lib/nameGenerator.ts
```

---

## Report Format When Done

```
DONE: Tang Gang Name Randomizer
Files changed: src/lib/nameGenerator.ts (only)
Build: PASS / FAIL
TypeScript: PASS / FAIL
Self-checks:
  - Tang Gang citrus words in PREFIXES: PASS/FAIL
  - Old generic words removed: PASS/FAIL
  - generateRandomName() / validateName() unchanged: PASS/FAIL
  - DID generator unchanged: PASS/FAIL
  - Build passes: PASS/FAIL
Notes: [anything unexpected]
```
