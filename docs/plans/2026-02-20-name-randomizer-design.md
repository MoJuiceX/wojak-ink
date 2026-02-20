# Name Randomizer Redesign — Design Doc

**Date:** 2026-02-20
**Approach:** Combinatorial word pools (Approach A, user-selected)

---

## Goal

Replace the generic name pools in `src/lib/nameGenerator.ts` with culturally resonant
word pools drawn from Tang Gang lore, Wojak internet culture, crypto culture, and
gaming naming conventions. The randomizer should produce names that feel funny, specific,
and community-appropriate rather than generic.

---

## Word Pools

### PREFIXES (~50 words, max 8 chars)

**Tang Gang** (orange / citrus culture, Chia blockchain community)
Tang, Honk, Bepe, Pulp, Citrus, Zesty, Tangy, Orange, Peel, Rind, Juice, Juicy,
Wedge, Navel, Squeeze

**Wojak / Internet**
Doomer, Bloomer, Coomer, Feels, Based, Cursed, Gigachad, Brainlet

**Crypto**
Degen, Diamond, Laser, HODL, Rekt, Wagmi, Whale, Bullish, Rugged

**Gaming / Dark**
Shadow, Iron, Ghost, Hyper, Ultra, Void, Chaos, Neon

**Internet generalist**
Turbo, Sigma, Alpha, Omega, Clown, Cringe, NPC

---

### SUFFIXES (~22 words, max 6 chars)

Maxi, Lord, King, OG, Fren, Sage, Wizard, Knight, Monk, Chad,
Hands, Eyes, Pilled, Gang, Brain, Mode, Vibes, 9000, IRL, Ape, Slayer, Master

---

### FULL_NAMES (~38 curated, ≤15 chars each)

**Tang Gang**
Winners Win, Orange Maxi, Honk Pilled, Tang Lord, Pulp Gang, Bepe Maxi,
Neck Growth, Zesty Chad, Citrus King, Peel Gang, Juice Wizard, Navel Sage

**Wojak / Internet**
Feels Good, This Is Fine, Doomer Mode, Gigachad OG, Big Brain, Clown World,
NPC Brain, Touch Grass, Brainlet IRL, Based Lord

**Crypto**
Diamond Hands, Paper Hands, Laser Eyes, Wagmi Fren, Rekt Again, Degen Lord,
Rug Survivor, Whale Alert, Moon Soon, NGMI Steve

**Gaming / Dark**
Void Walker, Shadow King, Iron Fist, Chaos Mode, Neon Ghost, Coomer IRL

---

## Algorithm (unchanged from existing)

```
50% → pick from FULL_NAMES
50% → random PREFIXES[i] + " " + SUFFIXES[j]
```

Result sliced to MAX_NAME_LENGTH (15). `validateName()` and `formatFullName()` untouched.

---

## Sample Output

PeelLord → "Peel Lord", BepeWizard → "Bepe Wizard", DiamondHands → "Diamond Hands"
(existing: "Donut Lord", "Sigma Grind" → replaced with culturally specific names)

---

## Constraints

- Only file changed: `src/lib/nameGenerator.ts`
- MAX_NAME_LENGTH = 15 (unchanged)
- Algorithm unchanged — only the three word arrays replaced
- DID name generator (bottom of file) untouched
- validateName() untouched
- All prefixes ≤ 8 chars, all suffixes ≤ 6 chars → all combos ≤ 15 with space
