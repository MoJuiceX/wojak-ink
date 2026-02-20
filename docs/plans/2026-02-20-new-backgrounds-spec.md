# SPEC: Add 12 New Backgrounds + Fix Combat Balance

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Priority:** Launch blocker

---

## Design Intent (Read This First)

The combat identity system accumulates type points and stat points across every layer
the user picks. The goal is EQUAL PROBABILITY — every one of the 18 combat types and
every one of the 25 natures should have roughly equal odds of being the final result
across a random Wojak build. Right now NEUTRAL (20 primary entries) and MARTIAL (18)
dominate. Every trait we add must be assigned to underrepresented types and stats
ONLY. Never add to overloaded types.

**Types that are critically underrepresented (fix with this spec):**
- STONE: 1 primary total → Bunker fixes this
- WATER: 2 primaries → Swamp fixes this
- GHOST: 1 primary → Circus fixes this
- ICE: 2 primaries → Mouth Numb fixes this
- DRAGON: underrepresented → Viking Ship fixes this
- METAL: 2 primaries → Space Station fixes this
- VENOM: 3 primaries → Tavern fixes this

**Nature stat bottleneck (fix with this spec):**
- defense: only 18 entries vs ~27 for others → Space Station + Bunker + Mouth Numb fix this
- NEUTRAL and MARTIAL must receive ZERO new primary entries in this spec

---

## Context Files to Read First

1. `CLAUDE.md` — project conventions, CSS rules, anti-patterns
2. `docs/GENERATOR-CODE-HEALTH.md` — generator rules, what not to do
3. `docs/GENERATOR-CHECKLIST.md` — checklist for adding traits
4. `public/assets/wojak-layers/manifest.json` — existing manifest format (read Background section)
5. `src/lib/traitNameMap.ts` — existing traitNameMap format (read Background section, lines ~243-287)
6. `functions/lib/traitNameMap.ts` — server-side copy, same format
7. `src/lib/combat/data/trait-type-map.ts` — existing combat entries format (read Background section)

---

## Phase 1: Copy Asset Files

Copy these 12 PNG files from `/Users/abit_hex/Downloads/Background/` to
`/Users/abit_hex/wojak-ink/public/assets/wojak-layers/BACKGROUND/Scene/`

Rename each file by adding the `BACKGROUND_` prefix:

| Source file | Destination filename |
|---|---|
| `Casino.png` | `BACKGROUND_Casino.png` |
| `Circus.png` | `BACKGROUND_Circus.png` |
| `Bunker.png` | `BACKGROUND_Bunker.png` |
| `Home Office.png` | `BACKGROUND_Home Office.png` |
| `Padded Cell.png` | `BACKGROUND_Padded Cell.png` |
| `Space Station.png` | `BACKGROUND_Space Station.png` |
| `Swamp.png` | `BACKGROUND_Swamp.png` |
| `Tavern.png` | `BACKGROUND_Tavern.png` |
| `Vaporwave.png` | `BACKGROUND_Vaporwave.png` |
| `Viking Ship.png` | `BACKGROUND_Viking Ship.png` |
| `Volcano.png` | `BACKGROUND_Volcano.png` |
| `Wizard Tower.png` | `BACKGROUND_Wizard Tower.png` |

Use `cp` commands. Do not rename the source files in Downloads.

---

## Phase 2: Update manifest.json

File: `public/assets/wojak-layers/manifest.json`

Add these 12 entries to the `"BACKGROUND"` array, inside the existing Scene group
(after the last existing Scene entry, before any $CASHTAG entries):

```
"Scene/BACKGROUND_Casino.png",
"Scene/BACKGROUND_Circus.png",
"Scene/BACKGROUND_Bunker.png",
"Scene/BACKGROUND_Home Office.png",
"Scene/BACKGROUND_Padded Cell.png",
"Scene/BACKGROUND_Space Station.png",
"Scene/BACKGROUND_Swamp.png",
"Scene/BACKGROUND_Tavern.png",
"Scene/BACKGROUND_Vaporwave.png",
"Scene/BACKGROUND_Viking Ship.png",
"Scene/BACKGROUND_Volcano.png",
"Scene/BACKGROUND_Wizard Tower.png",
```

---

## Phase 3: Update src/lib/traitNameMap.ts

Add these 12 entries to the Background (Scene) section of the TRAIT_NAME_MAP.
Keys must be lowercase. Values are display names (Title Case):

```typescript
'casino': 'Casino',
'circus': 'Circus',
'bunker': 'Bunker',
'home office': 'Home Office',
'padded cell': 'Padded Cell',
'space station': 'Space Station',
'swamp': 'Swamp',
'tavern': 'Tavern',
'vaporwave': 'Vaporwave',
'viking ship': 'Viking Ship',
'volcano': 'Volcano',
'wizard tower': 'Wizard Tower',
```

---

## Phase 4: Update functions/lib/traitNameMap.ts

Apply the identical 12 entries to the server-side copy at `functions/lib/traitNameMap.ts`.
Both files must stay in sync — same keys, same values.

---

## Phase 5: Update src/lib/combat/data/trait-type-map.ts

### 5A — Add 12 new background combat entries

Add these entries to the Background section of the trait-type-map. Follow the exact
`e()` helper function format used by all existing entries.

```typescript
'Background_Casino':        e('Background_Casino',        'Background', 'Casino',        false, 'SHADOW',   5, 'NEUTRAL',  2, 'speed',   3),
'Background_Circus':        e('Background_Circus',        'Background', 'Circus',        false, 'GHOST',    5, 'SHADOW',   2, 'speed',   3),
'Background_Bunker':        e('Background_Bunker',        'Background', 'Bunker',        false, 'STONE',    5, 'EARTH',    2, 'defense', 3),
'Background_Home-Office':   e('Background_Home-Office',   'Background', 'Home Office',   false, 'ELECTRIC', 5, 'NEUTRAL',  2, 'sp_atk',  3),
'Background_Padded-Cell':   e('Background_Padded-Cell',   'Background', 'Padded Cell',   false, 'PSYCHE',   5, 'GHOST',    2, 'sp_def',  3),
'Background_Space-Station': e('Background_Space-Station', 'Background', 'Space Station', false, 'METAL',    5, 'AIR',      2, 'defense', 3),
'Background_Swamp':         e('Background_Swamp',         'Background', 'Swamp',         false, 'WATER',    5, 'GRASS',    2, 'sp_def',  3),
'Background_Tavern':        e('Background_Tavern',        'Background', 'Tavern',        false, 'VENOM',    5, 'NEUTRAL',  2, 'attack',  3),
'Background_Vaporwave':     e('Background_Vaporwave',     'Background', 'Vaporwave',     false, 'ELECTRIC', 5, 'PSYCHE',   2, 'sp_atk',  3),
'Background_Viking-Ship':   e('Background_Viking-Ship',   'Background', 'Viking Ship',   false, 'DRAGON',   5, 'MARTIAL',  2, 'attack',  3),
'Background_Volcano':       e('Background_Volcano',       'Background', 'Volcano',       false, 'FIRE',     5, 'EARTH',    2, 'attack',  3),
'Background_Wizard-Tower':  e('Background_Wizard-Tower',  'Background', 'Wizard Tower',  false, 'MYSTIC',   5, 'DRAGON',   2, 'sp_atk',  3),
```

### 5B — Add/Update Mouth combat entries

Check whether `'Mouth_Numb'` and `'Mouth_Cig'` already exist in the file.

- **If they exist with null type or null natureStat:** Update them to the values below.
- **If they do not exist:** Add them as new entries.

```typescript
'Mouth_Numb': e('Mouth_Numb', 'Mouth', 'Numb', false, 'ICE', 5, 'PSYCHE', 2, 'defense', 3),
'Mouth_Cig':  e('Mouth_Cig',  'Mouth', 'Cig',  false, 'SHADOW', 5, 'FIRE', 2, 'speed', 3),
```

**Rationale (do not deviate):**
- Mouth Numb → ICE (a numb face = cold, frozen expression; helps ICE which has only 2 primaries) + defense (helps the defense stat bottleneck)
- Mouth Cig → SHADOW (rebellious, cool, underground) + speed (quick, casual) + FIRE secondary (literally burning)

---

## Constraints

- Do NOT add NEUTRAL or MARTIAL as a primary type for any new entry — both are already overloaded (20 and 18 primaries respectively)
- Do NOT modify any existing background entries already in the combat map
- Do NOT create new CSS files
- Do NOT add `!important` to any CSS
- Do NOT change the generator UI, layer order, or any rules in wojakRules.ts
- Do NOT modify canvasRendererLayerBuilder.ts or generatorLayerMapping.ts — backgrounds are already wired for the BACKGROUND layer

---

## Out of Scope

- No changes to the generator UI components
- No changes to wojakRules.ts
- No changes to layerRegistry.ts
- No rebalancing of existing entries in trait-type-map.ts (that is a separate future spec)
- No changes to the minting pipeline
- No changes to any CSS files

---

## Success Criteria (self-check before reporting done)

- [ ] All 12 PNG files exist in `public/assets/wojak-layers/BACKGROUND/Scene/` with `BACKGROUND_` prefix
- [ ] `manifest.json` contains all 12 new Scene entries
- [ ] `src/lib/traitNameMap.ts` contains all 12 new lowercase keys with correct display names
- [ ] `functions/lib/traitNameMap.ts` contains the same 12 entries (in sync with src/)
- [ ] `trait-type-map.ts` contains all 12 new background combat entries with correct types/stats
- [ ] `Mouth_Numb` entry exists in trait-type-map.ts with ICE type and defense stat
- [ ] `Mouth_Cig` entry exists in trait-type-map.ts with SHADOW type and speed stat
- [ ] No new entry uses NEUTRAL or MARTIAL as PRIMARY type
- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No `!important` added anywhere
- [ ] No new CSS variable files created

---

## Suggested Commit Message

```
feat(generator): add 12 new backgrounds + fix combat type balance

- Add 12 scene backgrounds: Casino, Circus, Bunker, Home Office, Padded Cell,
  Space Station, Swamp, Tavern, Vaporwave, Viking Ship, Volcano, Wizard Tower
- Assign combat types targeting underrepresented types: STONE, WATER, GHOST,
  ICE, DRAGON, METAL, VENOM — no new NEUTRAL or MARTIAL primaries
- Add defense stat entries to reduce bottleneck (Space Station, Bunker)
- Add/update Mouth Numb (ICE/defense) and Mouth Cig (SHADOW/speed) combat entries
- Update manifest.json, traitNameMap (src + functions), trait-type-map
```

---

## Report Format When Done

```
DONE: Add 12 New Backgrounds + Fix Combat Balance
Files changed: [list all files touched]
Build: PASS / FAIL
TypeScript: PASS / FAIL
Self-checks:
  - 12 PNGs copied: PASS/FAIL
  - manifest.json updated: PASS/FAIL
  - src traitNameMap updated: PASS/FAIL
  - functions traitNameMap updated: PASS/FAIL
  - trait-type-map 12 backgrounds added: PASS/FAIL
  - Mouth_Numb entry: PASS/FAIL
  - Mouth_Cig entry: PASS/FAIL
  - No NEUTRAL/MARTIAL primaries added: PASS/FAIL
  - Build passes: PASS/FAIL
Notes: [anything unexpected]
```
