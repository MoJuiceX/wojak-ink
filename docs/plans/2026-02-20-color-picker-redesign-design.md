# Design: Color Picker — Zero-Gap Color Chart Redesign

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Status:** Approved — ready for implementation spec

---

## Problem

The current color picker has two issues:

1. **Scrolling required** — `gap-1.5` between every swatch adds enough height that the user must scroll to see all 15 color families
2. **Broken visual ordering** — Crimsons (dark reds) appear at row 14, far from Reds (row 1), which breaks the natural hue flow of the grid

---

## Design Decision

Approach A: Zero-gap color chart + hue reorder.

Inspired by Material Design, Lospec, and Procreate palettes — the industry standard for compact, scannable color grids in creative tools.

**The core insight:** when gaps are removed and families are ordered by hue, the entire grid reads as one continuous color gradient (light top-left → dark bottom-right). The user's eye can scan it instantly without thinking.

---

## Changes

### 1. Layout — remove all gaps

- `gap-1.5` → `gap-0` on the outer `flex-col` container
- `gap-1.5` → `gap-0` on every inner `grid-cols-6` row wrapper
- Same treatment for the quick-access row

### 2. Corner rounding — container only

- Remove `rounded-md` from individual swatch `<button>` elements (set border-radius to 0)
- Wrap the entire swatch grid in a single `rounded-lg overflow-hidden` div
- This clips only the four outer corners of the whole grid; all interior edges are sharp
- The quick-access row gets its own `rounded-lg overflow-hidden` wrapper

The selected-swatch rainbow border animation is unaffected — it still renders, just without per-swatch corner rounding. This is visually correct for a tight grid.

### 3. Row reorder — Crimsons moves to row 2

Only one row moves. Crimsons (currently row 14) moves to row 2, immediately after Reds. All other rows stay in their current positions.

**Rationale:** Crimsons and Reds share the same hue (0°/360°). Placing them adjacent creates a wide red band that naturally darkens from row 1 to row 2 — the same technique Material Design uses for its Red 500→900 progression.

No other family moves.

### 4. No dividers

No separator lines between any rows, including between Pinks and Earth & Olive, and between Earth & Olive and Neutrals. One seamless grid.

---

## Final Row Order

| Row | Family | Example range | Combat type |
|-----|--------|--------------|-------------|
| 1 | Reds | #FF6347 → #992222 | FIRE |
| 2 | Crimsons | #7B1111 → #1A0000 | MARTIAL |
| 3 | Oranges | #FFA500 → #B34400 | DRAGON |
| 4 | Yellows | #FFFF00 → #A8B800 | ELECTRIC |
| 5 | Yellow-Greens | #ADFF2F → #4A6520 | INSECT |
| 6 | Greens | #00FF00 → #1A5C38 | GRASS |
| 7 | Teals | #00FFFF → #0E7490 | WATER/ICE |
| 8 | Sky Blues | #E0F7FF → #38BDF8 | AIR |
| 9 | Blues | #1E90FF → #172554 | WATER/PSYCHE |
| 10 | Purples | #C084FC → #5B21B6 | PSYCHE |
| 11 | Indigos | #4B0082 → #0D001A | GHOST |
| 12 | Magentas | #FF00FF → #6B1278 | VENOM |
| 13 | Pinks | #FFB3D9 → #9D174D | MYSTIC |
| 14 | Earth & Olive | #C8A87A → #3D2B1F | EARTH |
| 15 | Neutrals | #FFFFFF → #171717 | NEUTRAL/METAL |

Within each row: light (left) → dark (right). Unchanged from current.

---

## Out of Scope

- No changes to the hex color values themselves
- No changes to the number of swatches (stays 15 × 6 = 90)
- No changes to the quick-access color list
- No changes to the selected-state rainbow border animation
- No changes to combat type mapping or color-type-map.ts
- No new CSS files

---

## Files to Touch

- `src/components/generator/ColorPicker.tsx` — only file that changes
  - Reorder `COLOR_FAMILIES` array (move Crimsons to index 1)
  - Remove `gap-1.5`, add `gap-0`
  - Remove `rounded-md` from swatch buttons
  - Add `rounded-lg overflow-hidden` wrapper div around the swatch grid
  - Same wrapper for quick-access row
