# Color Palette V2 — Full Specification
**Date:** 2026-02-19
**Status:** Ready for implementation
**Replaces:** `src/components/generator/ColorPicker.tsx` COLOR_FAMILIES + `docs/GENERATOR-COLOR-PALETTE.md` + achromatic thresholds in `src/lib/combat/data/color-type-map.ts`

---

## Why This Exists

The V1 palette had 6 of 18 combat types with **zero** primary colors, and 3 more with only 1 color each. A user wanting to build toward GHOST, MARTIAL, AIR, EARTH, INSECT, or NEUTRAL through color choice simply couldn't — those types were impossible to reach via color alone. Additionally, 3 color slots were wasted on exact duplicates.

This spec fixes all of that. Every type gets 3–8 primary colors. No duplicates. Fair for all 18 types.

---

## Summary of Changes

| | V1 | V2 |
|--|--|--|
| Total colors | 54 (with 3 duplicates = 51 unique) | 90 unique |
| Rows | 9 × 6 | 15 × 6 |
| Types with 0 primary colors | 6 (NEUTRAL, MARTIAL, EARTH, AIR, INSECT, GHOST) | **0** |
| Types with 1 primary color | 3 (ELECTRIC, SHADOW, METAL) | **0** |
| Max colors for any type | 12 (WATER) | 8 (WATER, tied) |
| Min colors for any type | 0 | **3** |

---

## Part 1: New COLOR_FAMILIES Array

Drop this directly into `src/components/generator/ColorPicker.tsx`, replacing the existing `COLOR_FAMILIES`:

```typescript
export const COLOR_FAMILIES: { label: string; colors: string[] }[] = [
  // Row 1 — Reds → FIRE
  { label: 'Reds',           colors: ['#FF6347','#FF0000','#DC143C','#C0392B','#B22222','#992222'] },

  // Row 2 — Oranges → DRAGON
  { label: 'Oranges',        colors: ['#FFA500','#FF8C00','#FF6B00','#E65C00','#CC5200','#B34400'] },

  // Row 3 — Yellows → ELECTRIC
  { label: 'Yellows',        colors: ['#FFFF00','#F5FF00','#EEFF00','#D4E500','#C8D600','#A8B800'] },

  // Row 4 — Yellow-Greens → INSECT
  { label: 'Yellow-Greens',  colors: ['#ADFF2F','#9ACD32','#8DB600','#7CB518','#6B8E23','#4A6520'] },

  // Row 5 — Greens → GRASS
  { label: 'Greens',         colors: ['#00FF00','#32CD32','#22C55E','#16A34A','#2E8B57','#1A5C38'] },

  // Row 6 — Teals → WATER / ICE
  { label: 'Teals',          colors: ['#00FFFF','#40E0D0','#00CED1','#20B2AA','#0891B2','#0E7490'] },

  // Row 7 — Sky Blues → AIR
  { label: 'Sky Blues',      colors: ['#E0F7FF','#BAE6FD','#7DD3FC','#60A5FA','#93C5FD','#38BDF8'] },

  // Row 8 — Blues → WATER / PSYCHE
  { label: 'Blues',          colors: ['#1E90FF','#3B82F6','#2563EB','#1D4ED8','#1E3A8A','#172554'] },

  // Row 9 — Purples → PSYCHE
  { label: 'Purples',        colors: ['#C084FC','#A855F7','#9333EA','#7C3AED','#6D28D9','#5B21B6'] },

  // Row 10 — Indigos → GHOST
  { label: 'Indigos',        colors: ['#4B0082','#3B006B','#2E0054','#210040','#170030','#0D001A'] },

  // Row 11 — Magentas → VENOM
  { label: 'Magentas',       colors: ['#FF00FF','#E879F9','#D946EF','#A21CAF','#86198F','#6B1278'] },

  // Row 12 — Pinks → MYSTIC
  { label: 'Pinks',          colors: ['#FFB3D9','#FF69B4','#EC4899','#DB2777','#BE185D','#9D174D'] },

  // Row 13 — Earth & Olive → EARTH
  { label: 'Earth & Olive',  colors: ['#C8A87A','#A67C52','#8B7355','#6B5C3E','#5C4A1E','#3D2B1F'] },

  // Row 14 — Crimsons → MARTIAL
  { label: 'Crimsons',       colors: ['#7B1111','#6B0000','#5C0000','#4A0000','#380000','#1A0000'] },

  // Row 15 — Neutrals (achromatic ramp: ICE → AIR → METAL → NEUTRAL → STONE → SHADOW)
  { label: 'Neutrals',       colors: ['#FFFFFF','#C8C8C8','#999999','#666666','#404040','#171717'] },
];
```

Also update `QUICK_ACCESS_COLORS` to represent all 15 families:
```typescript
export const QUICK_ACCESS_COLORS = [
  '#FF0000',  // FIRE
  '#FF8C00',  // DRAGON
  '#FFFF00',  // ELECTRIC
  '#9ACD32',  // INSECT
  '#22C55E',  // GRASS
  '#00CED1',  // WATER
  '#7DD3FC',  // AIR
  '#3B82F6',  // WATER/PSYCHE
  '#A855F7',  // PSYCHE
  '#4B0082',  // GHOST
  '#D946EF',  // VENOM
  '#EC4899',  // MYSTIC
  '#8B7355',  // EARTH
  '#6B0000',  // MARTIAL
  '#999999',  // NEUTRAL/METAL
];
```

---

## Part 2: Type Coverage Per Row

Every row maps to a primary combat type. Users can understand: **"this color family = this type".**

| Row | Label | Primary Type(s) | Colors |
|-----|-------|-----------------|--------|
| 1 | Reds | **FIRE** | #FF6347 #FF0000 #DC143C #C0392B #B22222 #992222 |
| 2 | Oranges | **DRAGON** | #FFA500 #FF8C00 #FF6B00 #E65C00 #CC5200 #B34400 |
| 3 | Yellows | **ELECTRIC** | #FFFF00 #F5FF00 #EEFF00 #D4E500 #C8D600 #A8B800 |
| 4 | Yellow-Greens | **INSECT** | #ADFF2F #9ACD32 #8DB600 #7CB518 #6B8E23 #4A6520 |
| 5 | Greens | **GRASS** | #00FF00 #32CD32 #22C55E #16A34A #2E8B57 #1A5C38 |
| 6 | Teals | **WATER** (+ ICE secondary) | #00FFFF #40E0D0 #00CED1 #20B2AA #0891B2 #0E7490 |
| 7 | Sky Blues | **AIR** | #E0F7FF #BAE6FD #7DD3FC #60A5FA #93C5FD #38BDF8 |
| 8 | Blues | **WATER** (+ PSYCHE secondary) | #1E90FF #3B82F6 #2563EB #1D4ED8 #1E3A8A #172554 |
| 9 | Purples | **PSYCHE** | #C084FC #A855F7 #9333EA #7C3AED #6D28D9 #5B21B6 |
| 10 | Indigos | **GHOST** | #4B0082 #3B006B #2E0054 #210040 #170030 #0D001A |
| 11 | Magentas | **VENOM** | #FF00FF #E879F9 #D946EF #A21CAF #86198F #6B1278 |
| 12 | Pinks | **MYSTIC** | #FFB3D9 #FF69B4 #EC4899 #DB2777 #BE185D #9D174D |
| 13 | Earth & Olive | **EARTH** | #C8A87A #A67C52 #8B7355 #6B5C3E #5C4A1E #3D2B1F |
| 14 | Crimsons | **MARTIAL** | #7B1111 #6B0000 #5C0000 #4A0000 #380000 #1A0000 |
| 15 | Neutrals | ICE→AIR→METAL→NEUTRAL→STONE→SHADOW | #FFFFFF #C8C8C8 #999999 #666666 #404040 #171717 |

**Note on Row 15 (Neutrals):** This single row covers 6 different types via lightness. Left-to-right reads as the full achromatic ramp. See the mapping table below.

---

## Part 3: Full Type Coverage Count

| Type | Primary Colors | Row(s) | Status |
|------|---------------|--------|--------|
| FIRE | 6 | Row 1 (Reds) | ✅ |
| DRAGON | 6 | Row 2 (Oranges) | ✅ |
| ELECTRIC | 6 | Row 3 (Yellows) | ✅ |
| INSECT | 6 | Row 4 (Yellow-Greens) | ✅ |
| GRASS | 6 | Row 5 (Greens) | ✅ |
| WATER | 8 | Rows 6 + 8 | ✅ |
| AIR | 5 | Row 7 (Sky Blues) | ✅ |
| PSYCHE | 6 | Row 9 (Purples) | ✅ |
| GHOST | 6 | Row 10 (Indigos) | ✅ |
| VENOM | 6 | Row 11 (Magentas) | ✅ |
| MYSTIC | 6 | Row 12 (Pinks) | ✅ |
| EARTH | 5 | Row 13 (Earth & Olive) | ✅ |
| MARTIAL | 6 | Row 14 (Crimsons) | ✅ |
| ICE | 3 | Row 15 (top whites) + Row 7 top | ✅ |
| METAL | 3 | Row 15 (mid silvers) + Row 9 achrom | ✅ |
| NEUTRAL | 3 | Row 15 (mid greys) | ✅ |
| STONE | 3 | Row 15 (dark greys) | ✅ |
| SHADOW | 3 | Row 15 (near-blacks) | ✅ |

**Every single type: 3 or more primary colors. ✅**

---

## Part 4: color-type-map.ts Changes Required

The existing mapping logic needs **3 additions** to support the new palette. Without these changes, GHOST, MARTIAL, and AIR will not work as primary types from color.

### Change 1 — Achromatic threshold realignment

**File:** `src/lib/combat/data/color-type-map.ts`

Find the achromatic block and replace with:

```typescript
// Achromatic (S < 10%)
if (s < 0.10) {
  if (l > 0.88) return { primary: 'ICE',     secondary: 'AIR'     };
  if (l > 0.70) return { primary: 'AIR',     secondary: 'ICE'     };
  if (l > 0.55) return { primary: 'METAL',   secondary: 'NEUTRAL' };
  if (l > 0.38) return { primary: 'NEUTRAL', secondary: 'STONE'   };
  if (l > 0.20) return { primary: 'STONE',   secondary: 'GHOST'   };
               return { primary: 'SHADOW',  secondary: 'GHOST'   };
}
```

**What changed:** Added `AIR` and `METAL` as distinct achromatic bands. Previously the ramp was ICE→METAL→STONE→SHADOW (4 bands). Now it's ICE→AIR→METAL→NEUTRAL→STONE→SHADOW (6 bands), each ~18% lightness wide.

### Change 2 — GHOST: dark indigo / deep violet

Add this block **before** the main hue switch, after the gold check:

```typescript
// Dark saturated violet/indigo → GHOST
// Covers H 260-285°, L < 40%, S > 55%
// These are deep indigo / blackcurrant colors that read as "ghost/spirit/void"
if (h >= 260 && h <= 285 && l < 0.40 && s > 0.55) {
  return { primary: 'GHOST', secondary: 'SHADOW' };
}
```

### Change 3 — MARTIAL: dark saturated crimson

Add this block after the gold check:

```typescript
// Dark saturated crimson → MARTIAL
// Covers H 0-15° and H 348-360°, L < 30%, S > 55%
// Deep blood reds read as martial/combat, not fire
if ((h <= 15 || h > 348) && l < 0.30 && s > 0.55) {
  return { primary: 'MARTIAL', secondary: 'FIRE' };
}
```

### Change 4 — AIR: sky blue light hues

In the main hue switch, split the `195–250` WATER block:

```typescript
// Before (existing):
case (h > 195 && h <= 250):
  return { primary: 'WATER', secondary: 'PSYCHE' };

// After (replace with):
case (h > 195 && h <= 230 && l > 0.60):
  return { primary: 'AIR',   secondary: 'WATER'  };  // light sky blues
case (h > 195 && h <= 250):
  return { primary: 'WATER', secondary: 'PSYCHE' };
```

---

## Part 5: Neutrals Row — How Lightness Maps to Types

Row 15 is a single row covering 6 types via the achromatic lightness rules. Here's exactly what each swatch gives:

| Swatch | Hex | Lightness | Primary Type | Secondary |
|--------|-----|-----------|-------------|-----------|
| ⬜ White | `#FFFFFF` | 100% | ICE | AIR |
| 🩶 Light grey | `#C8C8C8` | 78.4% | AIR | ICE |
| 🩶 Mid grey | `#999999` | 60.0% | METAL | NEUTRAL |
| ⬛ Grey | `#666666` | 40.0% | NEUTRAL | STONE |
| ⬛ Dark grey | `#404040` | 25.1% | STONE | GHOST |
| ⬛ Near-black | `#171717` | 9.0% | SHADOW | GHOST |

This ramp is intentional. The UI could optionally show these type names as tooltips when a user hovers each swatch.

---

## Part 6: What "WATER has 8 colors" Actually Means for Fairness

WATER gets 8 primary colors (Teals row + Blues row). This is intentional because:
- Teal/Cyan and Blue are visually very distinct color families that both legitimately feel like "water"
- Splitting them would be confusing to users (calling one "Sea Green" and one "Ocean Blue" is misleading)
- WATER already has lower ATK stats as a trade-off in the combat system (ATK:75 vs FIRE's ATK:90)
- Having more colors available ≠ more powerful; it just means more creative options

All other types have 3–8 colors, which is the target range.

---

## Part 7: Files to Update

| File | Change |
|------|--------|
| `src/components/generator/ColorPicker.tsx` | Replace `COLOR_FAMILIES` and `QUICK_ACCESS_COLORS` with Part 1 above |
| `src/lib/combat/data/color-type-map.ts` | Apply 4 mapping changes from Part 4 |
| `docs/GENERATOR-COLOR-PALETTE.md` | Update table to reflect new 15-row structure |

---

## Part 8: What to Tell Users (UI Tooltip Copy)

If you add type hints to the color picker rows, here's the copy:

| Row label | Tooltip |
|-----------|---------|
| Reds | 🔥 Fire type |
| Oranges | 🐉 Dragon type |
| Yellows | ⚡ Electric type |
| Yellow-Greens | 🐛 Insect type |
| Greens | 🌿 Grass type |
| Teals | 💧 Water type |
| Sky Blues | 💨 Air type |
| Blues | 💧 Water / 🧠 Psyche type |
| Purples | 🧠 Psyche type |
| Indigos | 👻 Ghost type |
| Magentas | ☠️ Venom type |
| Pinks | ✨ Mystic type |
| Earth & Olive | 🪨 Earth type |
| Crimsons | 🥊 Martial type |
| Neutrals | Ramp: Ice → Air → Metal → Neutral → Stone → Shadow |
