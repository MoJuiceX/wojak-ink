# Color Picker Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the color picker from a spaced button grid to a zero-gap continuous color chart with hue-ordered rows.

**Architecture:** Single-file change in `ColorPicker.tsx`. Move Crimsons row to position 2 in the data array. Remove all `gap-1.5` from layout, replace with `gap-0`. Wrap the grid in a `rounded-lg overflow-hidden` container so only the four outer corners are rounded. Remove `rounded-md` from individual swatch buttons.

**Tech Stack:** React, Tailwind CSS, inline styles (existing patterns — no new dependencies)

---

## Context

Read the design doc before starting:
`docs/plans/2026-02-20-color-picker-redesign-design.md`

**Only file to modify:** `src/components/generator/ColorPicker.tsx`

No other files change. No CSS files. No new components.

---

### Task 1: Reorder COLOR_FAMILIES — move Crimsons to row 2

**File:**
- Modify: `src/components/generator/ColorPicker.tsx:15-60`

The `COLOR_FAMILIES` array currently has Crimsons at index 13 (row 14). Move it to index 1 (row 2), immediately after Reds.

**Current order (abbreviated):**
```
index 0:  Reds
index 1:  Oranges
...
index 12: Earth & Olive
index 13: Crimsons   ← move this up
index 14: Neutrals
```

**Step 1: Move the Crimsons entry**

Find this block in the array:
```typescript
  // Row 2 — Oranges → DRAGON
  { label: 'Oranges',        colors: ['#FFA500','#FF8C00','#FF6B00','#E65C00','#CC5200','#B34400'] },
```

Insert the Crimsons entry immediately before it, and remove it from its current position at row 14.

The array section covering rows 1–3 should become:
```typescript
  // Row 1 — Reds → FIRE
  { label: 'Reds',           colors: ['#FF6347','#FF0000','#DC143C','#C0392B','#B22222','#992222'] },

  // Row 2 — Crimsons → MARTIAL (same hue as Reds, darker band)
  { label: 'Crimsons',       colors: ['#7B1111','#6B0000','#5C0000','#4A0000','#380000','#1A0000'] },

  // Row 3 — Oranges → DRAGON
  { label: 'Oranges',        colors: ['#FFA500','#FF8C00','#FF6B00','#E65C00','#CC5200','#B34400'] },
```

And the old Crimsons entry at row 14 must be deleted. The array should end as:
```typescript
  // Row 13 — Pinks → MYSTIC
  { label: 'Pinks',          colors: ['#FFB3D9','#FF69B4','#EC4899','#DB2777','#BE185D','#9D174D'] },

  // Row 14 — Earth & Olive → EARTH
  { label: 'Earth & Olive',  colors: ['#C8A87A','#A67C52','#8B7355','#6B5C3E','#5C4A1E','#3D2B1F'] },

  // Row 15 — Neutrals (achromatic ramp: ICE → AIR → METAL → NEUTRAL → STONE → SHADOW)
  { label: 'Neutrals',       colors: ['#FFFFFF','#C8C8C8','#999999','#666666','#404040','#171717'] },
```

**Step 2: Update the row comments**

After moving Crimsons, renumber the row comments so they read Row 1 through Row 15 in correct sequence. The comments are just for readability — they don't affect behaviour. Update each `// Row N` comment to match the new position.

**Step 3: Verify the array still has exactly 15 entries**

Count the entries in `COLOR_FAMILIES`. There must be exactly 15. `GENERATOR_PALETTE_HEX` is derived from this array automatically — it does not need to change.

**Step 4: Commit**

```bash
git add src/components/generator/ColorPicker.tsx
git commit -m "refactor(color-picker): move Crimsons to row 2 next to Reds"
```

---

### Task 2: Remove all gaps from the layout

**File:**
- Modify: `src/components/generator/ColorPicker.tsx:154-165`

**Current JSX (the return statement):**
```tsx
return (
  <div className="flex flex-col gap-1.5" style={{ opacity: disabled ? 0.5 : 1 }}>
    {/* Color swatches by family — 6 columns */}
    {COLOR_FAMILIES.map((family) => (
      <div key={family.label} className="grid grid-cols-6 gap-1.5">
        {family.colors.map((hex, i) => (
          <Swatch key={`${family.label}-${i}`} hex={hex} />
        ))}
      </div>
    ))}
  </div>
);
```

**Step 1: Replace the return statement**

Change the return to:
```tsx
return (
  <div style={{ opacity: disabled ? 0.5 : 1 }}>
    {/* Color swatches — zero-gap color chart, outer corners only via overflow-hidden */}
    <div className="rounded-lg overflow-hidden">
      <div className="flex flex-col gap-0">
        {COLOR_FAMILIES.map((family) => (
          <div key={family.label} className="grid grid-cols-6 gap-0">
            {family.colors.map((hex, i) => (
              <Swatch key={`${family.label}-${i}`} hex={hex} />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);
```

Key changes:
- Outer `flex flex-col gap-1.5` → outer div with just the opacity style
- New `rounded-lg overflow-hidden` wrapper div around the grid (clips outer corners)
- Inner `flex flex-col gap-0` (was `gap-1.5`)
- Each family row: `grid-cols-6 gap-0` (was `gap-1.5`)

**Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/generator/ColorPicker.tsx
git commit -m "refactor(color-picker): remove swatch gaps, wrap grid in rounded-lg overflow-hidden"
```

---

### Task 3: Remove rounded corners from individual swatches

**File:**
- Modify: `src/components/generator/ColorPicker.tsx` — the `Swatch` inner component (lines ~115–152)

With `overflow-hidden` on the container, each swatch needs `border-radius: 0` so interior swatches have sharp edges. Only the four outer-corner swatches get their corners clipped by the container.

**Current swatch button className:**
```tsx
className={`w-full aspect-square rounded-md transition-opacity${isSelected ? ' color-picker-rainbow-swatch' : ''}`}
```

**Step 1: Remove `rounded-md` from className**

```tsx
className={`w-full aspect-square transition-opacity${isSelected ? ' color-picker-rainbow-swatch' : ''}`}
```

**Step 2: Add `borderRadius: 0` to the button's inline style**

Current style object on the button:
```tsx
style={{
  background: isSelected ? `...` : hex,
  border: isSelected ? '2px solid transparent' : ...,
  boxSizing: 'border-box',
  cursor: disabled ? 'not-allowed' : 'pointer',
  pointerEvents: disabled ? 'none' : 'auto',
  outline: 'none',
}}
```

Add `borderRadius: 0` to it:
```tsx
style={{
  background: isSelected ? `...` : hex,
  border: isSelected ? '2px solid transparent' : ...,
  boxSizing: 'border-box',
  borderRadius: 0,
  cursor: disabled ? 'not-allowed' : 'pointer',
  pointerEvents: disabled ? 'none' : 'auto',
  outline: 'none',
}}
```

**Step 3: Build and visual check**

```bash
npm run build
```

Open the generator at `localhost:5173/generator`. Select a colorable layer. The color picker should show:
- A tight grid of 90 swatches with no gaps between them
- Only the four outer corners of the grid are rounded
- Interior edges between swatches are sharp
- The selected swatch still shows the rainbow border animation
- Crimsons appear as the second row (dark reds directly below bright reds)
- Earth & Olive and Neutrals appear at the bottom

**Step 4: Commit**

```bash
git add src/components/generator/ColorPicker.tsx
git commit -m "refactor(color-picker): remove per-swatch border-radius, clipped by container"
```

---

## Success Criteria

- [ ] `npm run build` passes with no errors
- [ ] 15 × 6 = 90 swatches render with zero gaps between them
- [ ] Only the four outer corners of the entire grid are rounded
- [ ] Crimsons is the second row (directly below Reds)
- [ ] Earth & Olive and Neutrals are the last two rows
- [ ] Selected swatch rainbow border animation still works
- [ ] No new files created
- [ ] No CSS files modified
- [ ] No `!important` added

---

## Notes

This is a pure visual change — no logic, no data flow, no state changes. There are no meaningful unit tests to write for swatch gap removal. Visual verification in the browser is the test.

The `GENERATOR_PALETTE_HEX` flat array derives from `COLOR_FAMILIES` automatically, so its order updates with the array reorder. No other file references the row order.
