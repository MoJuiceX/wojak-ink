# SPEC: Combat Type & Nature Rebalancing — Full Distribution Fix

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Depends on:** `2026-02-20-new-backgrounds-spec.md` must be committed first

---

## Design Intent (Read This First)

**The goal is mathematical fairness.** When a user builds any Wojak, every one of
the 18 combat types and 25 natures should have roughly equal probability of being
the result. Right now NEUTRAL (18 primaries) and MARTIAL (18 primaries) dominate
the system so heavily that most randomly built Wojaks roll those types.

**The fix:** Reassign existing entries whose primary type is overloaded (NEUTRAL,
MARTIAL, SHADOW, ELECTRIC) to underrepresented types. No new traits are added.
The entries are the same — only the type and stat assignments change.

**Rule:** After this spec, the range should be 5-10 primaries per type,
not 1-20. NEUTRAL and MARTIAL must not exceed 8 each.

**Secondary fix:** Eyes layer currently has ZERO defense stat entries. This spec
adds defense to 2 Eyes entries to close that gap.

---

## Context Files to Read First

1. `CLAUDE.md`
2. `src/lib/combat/data/trait-type-map.ts` — read in full before touching
3. `src/lib/combat/types.ts` — verify CombatType and StatName values

---

## The One File to Modify

**Only file:** `src/lib/combat/data/trait-type-map.ts`

No other files change. No CSS. No manifest. No traitNameMap. Only the combat map.

---

## All 29 Entry Changes

For each entry below, find the existing entry by its key and replace the `e()` call
with the new values shown. Do not add new entries — update existing ones only.

### Group A — Reassign from NEUTRAL primary (13 changes)

These entries are currently NEUTRAL primary. Reassign them to types that are
underrepresented. The pattern is: flip primary and secondary where secondary was
already the target type; otherwise replace primary with the new type and demote
NEUTRAL to secondary.

```typescript
// 1. One-Market: financial floor → METAL (corporate metallic environment)
'Background_One-Market': e('Background_One-Market', 'Background', 'One Market', false, 'METAL', 5, 'NEUTRAL', 2, 'defense', 3),

// 2. White-House: stone building → STONE (literally built of stone)
'Background_White-House': e('Background_White-House', 'Background', 'White House', false, 'STONE', 5, 'MARTIAL', 2, 'defense', 3),

// 3. Bathrobe: bath → WATER (bathrobe = after water)
'Clothes_Bathrobe': e('Clothes_Bathrobe', 'Clothes', 'Bathrobe', true, 'WATER', 5, 'MYSTIC', 2, 'sp_def', 3),

// 4. Suit: corporate metal armor → METAL (sleek metallic business)
'Clothes_Suit': e('Clothes_Suit', 'Clothes', 'Suit', true, 'METAL', 5, 'SHADOW', 2, 'sp_atk', 3),

// 5. Tee: most basic garment, everywhere like insects → INSECT
//    (was null/null stats — now adds to distribution)
'Clothes_Tee': e('Clothes_Tee', 'Clothes', 'Tee', true, 'INSECT', 5, 'EARTH', 2, 'speed', 3),

// 6. Neckbeard: cold, frozen in time, isolated → ICE
//    (stat changed to defense: helps Eyes/Face defense gap in adjacent layers)
'Facial-Hair_Neckbeard': e('Facial-Hair_Neckbeard', 'FacialHair', 'Neckbeard', false, 'ICE', 5, 'PSYCHE', 2, 'defense', 3),

// 7. Stache: fiery personality, passion, handlebar = fire → FIRE (flip)
'Facial-Hair_Stache': e('Facial-Hair_Stache', 'FacialHair', 'Stache', false, 'FIRE', 5, 'NEUTRAL', 2, 'attack', 3),

// 8. Pizza: scavenger food, common = INSECT; earthy secondary
'Mouth_Pizza': e('Mouth_Pizza', 'Mouth', 'Pizza', false, 'INSECT', 5, 'EARTH', 2, 'sp_def', 3),

// 9. Cool-Glasses: "cool" = cold = ICE; stat → defense (Eyes layer has 0 defense — fix it)
'Eyes_Cool-Glasses': e('Eyes_Cool-Glasses', 'Eyes', 'Cool Glasses', false, 'ICE', 5, 'NEUTRAL', 2, 'defense', 3),

// 10. Beanie: winter hat = ICE (cold weather gear)
'Head_Beanie': e('Head_Beanie', 'Head', 'Beanie', false, 'ICE', 5, 'NEUTRAL', 2, 'sp_def', 3),

// 11. Beer-Hat: alcohol = VENOM/poison (flip)
'Head_Beer-Hat': e('Head_Beer-Hat', 'Head', 'Beer Hat', false, 'VENOM', 5, 'NEUTRAL', 2, 'sp_def', 3),

// 12. Cap: outdoor hat, fresh air = AIR (flip)
'Head_Cap': e('Head_Cap', 'Head', 'Cap', false, 'AIR', 5, 'NEUTRAL', 2, 'speed', 3),

// 13. Trump-Wave: powerful, dominant personality = DRAGON (flip)
'Head_Trump-Wave': e('Head_Trump-Wave', 'Head', 'Trump Wave', false, 'DRAGON', 5, 'NEUTRAL', 2, 'sp_atk', 3),
```

### Group B — Reassign from MARTIAL primary (10 changes)

These are MARTIAL primary entries that thematically suit other types better.
MARTIAL becomes the secondary (warrior energy is always present as secondary).

```typescript
// 14. Colosseum-Arena: stone arena = STONE (literally a stone structure)
'Background_Colosseum-Arena': e('Background_Colosseum-Arena', 'Background', 'Colosseum Arena', false, 'STONE', 5, 'MARTIAL', 2, 'attack', 3),

// 15. Bepe-army: bug army = INSECT (bepe = bug-coded)
'Clothes_Bepe-army': e('Clothes_Bepe-army', 'Clothes', 'Bepe Army', true, 'INSECT', 5, 'MARTIAL', 2, 'attack', 3),

// 16. Military-jacket: camouflage = EARTH (earth tones, grounded)
'Clothes_Military-jacket': e('Clothes_Military-jacket', 'Clothes', 'Military Jacket', true, 'EARTH', 5, 'MARTIAL', 2, 'defense', 3),

// 17. Ninja-turtle-fit: ninja turtles live in water/sewers = WATER
'Clothes_Ninja-turtle-fit': e('Clothes_Ninja-turtle-fit', 'Clothes', 'Ninja Turtle Fit', true, 'WATER', 5, 'MARTIAL', 2, 'speed', 3),

// 18. Roman-drip: Roman empire = stone columns and architecture = STONE
'Clothes_Roman-drip': e('Clothes_Roman-drip', 'Clothes', 'Roman Drip', true, 'STONE', 5, 'MARTIAL', 2, 'attack', 3),

// 19. SWAT: heavy tactical metal gear = METAL
'Clothes_SWAT': e('Clothes_SWAT', 'Clothes', 'SWAT', true, 'METAL', 5, 'MARTIAL', 2, 'defense', 3),

// 20. Viking-Armor: Vikings = cold north = ICE
'Clothes_Viking-Armor': e('Clothes_Viking-Armor', 'Clothes', 'Viking Armor', true, 'ICE', 5, 'MARTIAL', 2, 'attack', 3),

// 21. Ninja-Turtle-Mask: same as fit — turtles = WATER; stat → defense (Eyes defense gap)
'Eyes_Ninja-Turtle-Mask': e('Eyes_Ninja-Turtle-Mask', 'Eyes', 'Ninja Turtle Mask', false, 'WATER', 5, 'MARTIAL', 2, 'defense', 3),

// 22. Centurion: Roman centurion = stone armor and fortifications = STONE
'Head_Centurion': e('Head_Centurion', 'Head', 'Centurion', false, 'STONE', 5, 'MARTIAL', 2, 'defense', 3),

// 23. Ronin-helmet: heavy samurai metal helmet = METAL
'Head_Ronin-helmet': e('Head_Ronin-helmet', 'Head', 'Ronin Helmet', false, 'METAL', 5, 'MARTIAL', 2, 'defense', 3),
```

### Group C — Reassign from SHADOW primary (3 changes)

```typescript
// 24. Eye-Patch: pirate = WATER (ocean piracy); stat → defense (Eyes defense gap fix)
'Eyes_Eye-Patch': e('Eyes_Eye-Patch', 'Eyes', 'Eye Patch', false, 'WATER', 5, 'SHADOW', 2, 'defense', 3),

// 25. Spikes: punk = VENOM (rebellion = poison, punk poison energy)
'Head_Spikes': e('Head_Spikes', 'Head', 'Anarchy Spikes', false, 'VENOM', 5, 'SHADOW', 2, 'attack', 3),

// 26. Fedora: noir detective = GHOST (mysterious, unseen, other-worldly)
'Head_Fedora': e('Head_Fedora', 'Head', 'Fedora', false, 'GHOST', 5, 'SHADOW', 2, 'sp_atk', 3),
```

### Group D — Reassign from ELECTRIC primary (3 changes)

```typescript
// 27. Sonic-suit: Sonic = speed = AIR/wind (Sonic runs so fast he creates wind)
'Clothes_Sonic-suit': e('Clothes_Sonic-suit', 'Clothes', 'Sonic Suit', true, 'AIR', 5, 'ELECTRIC', 2, 'speed', 3),

// 28. VR-headset: virtual reality = floating weightless mental space = AIR
'Face-wear_VR-headset': e('Face-wear_VR-headset', 'Eyes', 'VR Headset', false, 'AIR', 5, 'PSYCHE', 2, 'sp_atk', 3),

// 29. Tin-Foil-Hat: conspiracy theory = GHOST (seeing what others can't)
'Head_Tin-Foil-Hat': e('Head_Tin-Foil-Hat', 'Head', 'Tin Foil Hat', false, 'GHOST', 5, 'ELECTRIC', 2, 'sp_def', 3),
```

---

## Entries That Do NOT Change

These NEUTRAL entries are genuinely neutral and must stay:
- `Base_Classic` — the fundamental baseline, truly typeless
- `Head_Standard-Cut` — the default no-modifier cut
- `Background_Moms-Basement` — peak inertia, thematically neutral
- `Clothes_Tank-top` — basic athletic, no elemental pull
- `Clothes_topless` — no clothing = no modifier
- `Background_Solid-Color` — colorable, dynamic (0 pts, type from color)

These MARTIAL entries stay MARTIAL (8 total including above):
- `Background_Bepe-Barracks`
- `Background_Ronin-Dojo`
- `Clothes_Ronin`
- `Clothes_Sports-jacket`
- `Eyes_Tyson-Tattoo`
- `Head_SWAT-helmet`
- `Head_military-beret`
- `Head_Comrad-Hat`

---

## Expected Distribution After This Spec

| Type | Count | Status |
|------|-------|--------|
| NEUTRAL | 5 | Baseline only — intentionally minimal |
| MARTIAL | 8 | ✅ Balanced |
| SHADOW | 9 | ✅ Balanced |
| ELECTRIC | 9 | ✅ Balanced |
| MYSTIC | 9 | ✅ Balanced |
| PSYCHE | 9 | ✅ Balanced |
| GHOST | 10 | ✅ (was 1 — was critical) |
| FIRE | 9 | ✅ Balanced |
| EARTH | 8 | ✅ Balanced |
| AIR | 9 | ✅ Balanced |
| DRAGON | 8 | ✅ Balanced |
| GRASS | 7 | ✅ Balanced |
| WATER | 7 | ✅ (was 2 — was critical) |
| METAL | 7 | ✅ (was 2 — was critical) |
| ICE | 7 | ✅ (was 2 — was critical) |
| INSECT | 6 | ✅ (was 3) |
| VENOM | 6 | ✅ (was 3) |
| STONE | 6 | ✅ (was 1 — was critical) |

**Eyes layer defense entries after this spec:** 2 (Cool-Glasses + Ninja-Turtle-Mask)
Previously: 0

---

## Constraints

- Modify ONLY `src/lib/combat/data/trait-type-map.ts`
- Do NOT add new entries — update existing ones only
- Do NOT touch any other file
- Do NOT change point values (keep 5/2/3 structure)
- Do NOT change the `name` or `colorable` fields unless clearly wrong
- Do NOT change any entry not listed in this spec

---

## Out of Scope

- No changes to manifest.json
- No changes to traitNameMap.ts
- No changes to any CSS files
- No changes to identity-calculator.ts or natures.ts
- No changes to wojakRules.ts
- No changes to the generator UI

---

## Success Criteria (self-check before reporting done)

- [ ] Build passes: `npm run build`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Exactly 29 entries modified, zero new entries added
- [ ] NEUTRAL primary count ≤ 7 (verify by grepping for `'NEUTRAL', 5` in the file)
- [ ] MARTIAL primary count ≤ 9 (verify by grepping for `'MARTIAL', 5` in the file)
- [ ] Eyes_Cool-Glasses uses ICE primary and defense stat
- [ ] Eyes_Ninja-Turtle-Mask uses WATER primary and defense stat
- [ ] Eyes_Eye-Patch uses WATER primary and defense stat
- [ ] Head_Trump-Wave uses DRAGON primary
- [ ] Clothes_Viking-Armor uses ICE primary
- [ ] Background_Colosseum-Arena uses STONE primary
- [ ] No `!important` added
- [ ] No new files created

---

## Verification Commands

Run after making changes to verify distribution counts:

```bash
# Count NEUTRAL primaries
grep -c "'NEUTRAL', 5" src/lib/combat/data/trait-type-map.ts

# Count MARTIAL primaries
grep -c "'MARTIAL', 5" src/lib/combat/data/trait-type-map.ts

# Count STONE primaries
grep -c "'STONE', 5" src/lib/combat/data/trait-type-map.ts

# Count WATER primaries
grep -c "'WATER', 5" src/lib/combat/data/trait-type-map.ts

# Count ICE primaries
grep -c "'ICE', 5" src/lib/combat/data/trait-type-map.ts

# Count defense stats
grep -c "'defense', 3" src/lib/combat/data/trait-type-map.ts
```

Expected grep results:
- NEUTRAL: ≤ 7
- MARTIAL: 8-9
- STONE: 5-6
- WATER: 7
- ICE: 7
- defense entries: ≥ 21

---

## Suggested Commit Message

```
feat(combat): rebalance combat type distribution across all layers

Redistribute 29 trait entries from overloaded NEUTRAL/MARTIAL/SHADOW/ELECTRIC
to underrepresented WATER, METAL, ICE, STONE, INSECT, VENOM, AIR, DRAGON types.

Before: NEUTRAL=18, MARTIAL=18, STONE=1, WATER=2, ICE=2 (range: 1-20)
After:  NEUTRAL=5,  MARTIAL=8,  STONE=6, WATER=7, ICE=7  (range: 5-10)

Also fixes Eyes layer which had zero defense stat entries (now has 3).
No new traits added — existing entries remapped to correct types.
```

---

## Report Format When Done

```
DONE: Combat Type & Nature Rebalancing
Files changed: src/lib/combat/data/trait-type-map.ts (only)
Build: PASS / FAIL
TypeScript: PASS / FAIL
Self-checks:
  - 29 entries modified (0 added): PASS/FAIL
  - NEUTRAL primaries ≤ 7: [count] PASS/FAIL
  - MARTIAL primaries ≤ 9: [count] PASS/FAIL
  - STONE primaries: [count] PASS/FAIL
  - WATER primaries: [count] PASS/FAIL
  - ICE primaries: [count] PASS/FAIL
  - defense entries: [count] PASS/FAIL
  - Eyes defense gap fixed: PASS/FAIL
  - Build passes: PASS/FAIL
Notes: [anything unexpected]
```
