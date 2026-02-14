# SPEC: Phase 10B — Right Panel & Color Picker Visual Consistency

> **For Claude CLI:** Read this entire spec top to bottom. Then read every file in "Files to Read" before making changes. Follow `CLAUDE.md` for all CSS conventions: visual styling in `theme.css`, Tailwind for layout only, never `!important`.

---

## Problem

The generator has a visual inconsistency between its three columns:

1. **Trait grid** (middle) — sits inside a glass container with rounded corners, border, and subtle background (`--color-glass-bg`)
2. **Color picker** (right panel) — bare swatches floating without any container. No background, no border, no rounded corners.
3. **Right panel overall** — just a scrollable div with padding. No visual boundary separating it from the trait grid.

The color picker looks like it belongs to a different application than the trait grid. Premium NFT tools (like Figma's properties panel, or Zora's mint interface) give all sidebar sections a consistent container treatment.

---

## Files to Read

1. `src/components/generator/GeneratorRightPanel.tsx` — the right panel component
2. `src/components/generator/ColorPicker.tsx` — the color palette component
3. `src/pages/Generator.css` — `.generator-details-panel` styling
4. `src/styles/theme.css` — `.card-static` pattern to match

---

## Design Goal

Give the right panel visual structure by wrapping each section (color picker, fill targets, G2 details) in a consistent `card-static`-like container. The result should look like the right panel has labeled "panels" — similar to a properties sidebar in a design tool.

```
Right Panel (before):              Right Panel (after):

  ■■■■■■                          ┌─────── Color ───────┐
  ■■■■■■  (bare swatches)         │  ■■■■■■             │
  ■■■■■■                          │  ■■■■■■             │
  ■■■■■■                          │  ■■■■■■             │
  [ Reset ]                        │  [ Reset ]           │
                                   └─────────────────────┘
  Color part
  [Fill 1] [Fill 2]               ┌──── Color Part ─────┐
                                   │  [Fill 1] [Fill 2]  │
  Detail                           └─────────────────────┘
  [🔴] [🟢] [🔵]
                                   ┌───── Details ──────┐
                                   │  [🔴] [🟢] [🔵]    │
                                   └─────────────────────┘
```

---

## Exact Changes

### Step 1: Create a `.generator-panel-section` Class in `theme.css`

Add this to `src/styles/theme.css` in the component styles section (near the existing `.card-static` definition):

```css
/* Generator right-panel section — consistent container for color picker, details, etc. */
.generator-panel-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 12px;
}

.generator-panel-section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}
```

### Step 2: Wrap Color Picker in Container

In `GeneratorRightPanel.tsx`, find where the `ColorPicker` is rendered (around line 372-381):

**Before:**
```tsx
{hasSelection && !isG1MilitaryBeret && !(
  activeLayer === 'Mask' && (
    isFullFaceMaskSelected(selectedLayers.Mask) ||
    selectedLayers.Mask?.includes('Hannibal')
  )
) && (
  <div className="flex-shrink-0">
    <ColorPicker {...colorPickerProps} />
  </div>
)}
```

**After:**
```tsx
{hasSelection && !isG1MilitaryBeret && !(
  activeLayer === 'Mask' && (
    isFullFaceMaskSelected(selectedLayers.Mask) ||
    selectedLayers.Mask?.includes('Hannibal')
  )
) && (
  <div className="generator-panel-section flex-shrink-0">
    <div className="generator-panel-section-label">Color</div>
    <ColorPicker {...colorPickerProps} />
  </div>
)}
```

### Step 3: Wrap Fill Target Buttons in Container

Find the "Color part" buttons section (around line 390-423):

**Before:**
```tsx
<div className="flex-shrink-0">
  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
    Color part
  </p>
  <div className="flex flex-wrap gap-2">
    {/* ... fill buttons ... */}
  </div>
</div>
```

**After:**
```tsx
<div className="generator-panel-section flex-shrink-0">
  <div className="generator-panel-section-label">Color Part</div>
  <div className="flex flex-wrap gap-2">
    {/* ... fill buttons ... */}
  </div>
</div>
```

### Step 4: Wrap All Other Labeled Sections

Apply the same pattern to every other section in GeneratorRightPanel that has a `<p className="text-xs font-medium mb-2">` label. These are:

1. **"Pick a color to use new design"** (Military Beret) — around line 360-370
2. **"Mask style"** — inside the `MaskVariantPicker` component (around line 109-113)
3. **"Under layer"** — inside `BeerHatUnderlayerPicker` (around line 177-179)
4. **"Suit style"** (Bepe suit) — around line 459-462
5. **"Color"** (Chia Farmer) — around line 493-495

For each: replace the outer `<div className="flex-shrink-0">` with `<div className="generator-panel-section flex-shrink-0">` and replace the `<p>` label with `<div className="generator-panel-section-label">`.

### Step 5: Wrap G2TraitPanel Output

The `G2TraitPanel` component renders detail selectors (coin logos, flags, etc.). It's rendered at the bottom of the right panel. Wrap it:

**Before (around line 533-581):**
```tsx
<div className="flex flex-col gap-4">
  {/* ... G2 panels ... */}
</div>
```

This outer div should NOT be wrapped — it contains multiple conditional G2TraitPanel renders. Instead, the wrapping should happen INSIDE `G2TraitPanel.tsx` itself.

**In `G2TraitPanel.tsx`:** Find where each section renders its grid/options. If G2TraitPanel has its own section labels (like "Detail", "Logo", etc.), wrap each in `.generator-panel-section`. If it renders bare content, wrap the entire G2TraitPanel output:

Read `src/components/generator/G2TraitPanel.tsx` to determine the exact structure before making changes. The key rule: every labeled section in the right panel should have the same container.

### Step 6: Right Panel Background

Give the right panel container itself a subtle distinct background to create depth separation from the trait grid.

In `Generator.css`, update `.generator-details-panel` (around line 121-133):

**Add:**
```css
.generator-details-panel {
  /* ... existing properties ... */
  background: rgba(0, 0, 0, 0.15);
  border-left: 1px solid var(--color-border);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}
```

This gives the right panel a slightly darker background and a soft left edge, creating visual depth: trait grid (lighter) → right panel (darker).

### Step 7: Mobile Color Picker

On mobile, the color picker renders below the trait grid (inside `TraitSelector.tsx`, not inside `GeneratorRightPanel.tsx`). Find where the mobile color picker is rendered and apply the same container treatment.

Search in `TraitSelector.tsx` for where `ColorPicker` is used on mobile:

```bash
grep -n "ColorPicker" src/components/generator/TraitSelector.tsx
```

If found, wrap it in the same `.generator-panel-section` container with "Color" label.

---

## Verification

```bash
# New CSS class exists
grep -n "generator-panel-section" src/styles/theme.css
# Expected: class definition

# Class is used in GeneratorRightPanel
grep -c "generator-panel-section" src/components/generator/GeneratorRightPanel.tsx
# Expected: 3+ occurrences (color picker + fill targets + details)

# Right panel has background
grep -n "rgba(0, 0, 0, 0.15)" src/pages/Generator.css
# Expected: in .generator-details-panel

# Build passes
npm run typecheck && npm run build
```

---

## Visual Check

After changes, open the generator on desktop. The right panel should:
- Have a slightly darker background than the trait grid
- Show labeled containers for "Color", "Color Part", and any G2 detail sections
- Each container should have rounded corners, a border, and a subtle background
- The color swatches should be INSIDE a box, not floating bare
- The overall look should feel like a properties/inspector panel (like Figma's right sidebar)

---

## What NOT to Change

- **Do NOT change** the ColorPicker component internals (swatch layout, colors, hover tooltips)
- **Do NOT change** the color picker's swatch grid (6 columns, family grouping)
- **Do NOT change** the trait grid container (it already looks good)
- **Do NOT add** new CSS variable files
- **Do NOT use** inline styles for backgrounds or borders on the new containers — use the CSS class
