# SPEC: Phase 10C — Premium Visual Polish

> **For Claude CLI:** Read this entire spec top to bottom. Then read every file in "Files to Read" before making changes. Follow `CLAUDE.md` for all CSS conventions: visual styling in `theme.css` or `Generator.css`, Tailwind for layout only, never `!important`.

---

## Problem

The generator works well but small visual details hold it back from feeling premium:

1. **Preview canvas** — has a flat `2px solid var(--color-border)` border with no depth. It looks like an image in a form field, not the centerpiece of a creative tool.
2. **Trait card hover** — `scale(1.05)` is too aggressive. It visually breaks the grid and overlaps neighbors, feeling janky rather than polished.
3. **Layer tabs** — non-active tabs have no hover feedback at all (`background: transparent`). The user hovers and nothing happens until they click.
4. **Selection feedback** — selecting a trait has no one-shot animation. The card just becomes selected instantly. Premium tools (Figma, Linear) use a brief "pop" or glow pulse on selection.

---

## Files to Read

1. `src/components/generator/PreviewWithControls.tsx` — the canvas wrapper (39 lines)
2. `src/pages/Generator.css` — all generator visual styles (641 lines)
3. `src/components/generator/LayerTabs.tsx` — layer tab component (uses inline styles + framer-motion)

---

## Design Goal

Each change should be subtle and barely noticeable individually, but together they elevate the perceived quality. Think: the difference between a free tool and something that costs $20/month.

---

## Exact Changes

### Step 1: Preview Canvas Depth Shadow

In `src/components/generator/PreviewWithControls.tsx`, add a dark multi-layer box-shadow to the preview container. This creates the illusion of the canvas floating above the page.

**Before (around line 26-31):**
```tsx
<div
  className="relative overflow-hidden rounded-2xl flex items-center justify-center"
  style={{
    aspectRatio: '1 / 1',
    ...BG_STYLE,
    border: '2px solid var(--color-border)',
  }}
>
```

**After:**
```tsx
<div
  className="relative overflow-hidden rounded-2xl flex items-center justify-center"
  style={{
    aspectRatio: '1 / 1',
    ...BG_STYLE,
    border: '2px solid var(--color-border)',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.25)',
  }}
>
```

This adds a two-layer dark shadow. No colored glows — the preview should be a neutral stage for the art.

### Step 2: Trait Card Hover — Softer Scale + Warm Glow

In `Generator.css`, update the `.generator-option-item:hover` rule. The current `scale(1.05)` is too aggressive — it causes overlapping and visual jank in the tight grid.

**Before (around line 258-264):**
```css
/* Hover state */
.generator-option-item:hover {
  transform: scale(1.05);
  border-color: rgba(249, 115, 22, 0.5);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 10;
}
```

**After:**
```css
/* Hover state — subtle lift with warm glow */
.generator-option-item:hover {
  transform: scale(1.02);
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow:
    0 0 16px rgba(249, 115, 22, 0.12),
    0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 10;
}
```

Changes:
- `scale(1.05)` → `scale(1.02)` — subtle enough to not break grid layout
- `border-color` opacity reduced from 0.5 to 0.4 — less aggressive
- `box-shadow` — two-layer: warm orange ambient glow (barely visible at 0.12 opacity) + dark depth shadow

### Step 3: Layer Tab Hover Feedback

The `LayerTabs.tsx` component uses the class `.generator-layer-tab` with inline styles for active/inactive states and framer-motion for `whileHover` animation (scale/opacity). But there is NO background change on hover for inactive tabs.

Add a CSS-only hover background for non-active, non-disabled layer tabs. This works because:
- The active tab uses an inline `background` style (higher specificity than class rules), so it won't be overridden
- The component already sets `aria-selected={isActive}` and `aria-disabled={isBlocked}` on the button element

**Add to `Generator.css`** after the `.generator-option-item` states block (around line 285, before the `/* === CATEGORY TAB STATES === */` section):

```css
/* Layer tab hover — subtle feedback for non-active tabs */
.generator-layer-tab:not([aria-selected="true"]):not([aria-disabled="true"]):hover {
  background: rgba(255, 255, 255, 0.04);
}
```

**No changes needed in `LayerTabs.tsx`** — this is a CSS-only enhancement.

### Step 4: Selection Pulse Animation

When a user selects a trait, the card should briefly pulse its glow — a one-shot animation that plays once and settles into the normal selected state.

**4a. Add keyframe to `Generator.css`** (after the existing `@keyframes checkPop` block, around line 483):

```css
/* One-shot selection pulse — plays once when a trait card becomes selected */
@keyframes selectPulse {
  0% {
    box-shadow:
      0 0 20px rgba(249, 115, 22, 0.5),
      inset 0 0 20px rgba(249, 115, 22, 0.1);
  }
  50% {
    box-shadow:
      0 0 30px rgba(249, 115, 22, 0.7),
      0 0 60px rgba(249, 115, 22, 0.2),
      inset 0 0 25px rgba(249, 115, 22, 0.15);
  }
  100% {
    box-shadow:
      0 0 20px rgba(249, 115, 22, 0.5),
      inset 0 0 20px rgba(249, 115, 22, 0.1);
  }
}
```

**4b. Update the `.generator-option-item.selected` rule:**

**Before (around line 267-272):**
```css
/* Selected state */
.generator-option-item.selected {
  border-color: #F97316;
  box-shadow:
    0 0 20px rgba(249, 115, 22, 0.5),
    inset 0 0 20px rgba(249, 115, 22, 0.1);
}
```

**After:**
```css
/* Selected state — with one-shot pulse on selection */
.generator-option-item.selected {
  border-color: #F97316;
  box-shadow:
    0 0 20px rgba(249, 115, 22, 0.5),
    inset 0 0 20px rgba(249, 115, 22, 0.1);
  animation: selectPulse 0.4s ease-out;
}
```

The animation plays once (default `animation-iteration-count: 1`) each time the `.selected` class is added. It starts at the normal glow, flares brighter at 50%, then settles back. The `ease-out` timing makes the flare feel snappy.

**Reduced motion:** Already handled by the existing `@media (prefers-reduced-motion: reduce)` block at the bottom of Generator.css, which sets `animation: none` on `.generator-option-item`. No additional handling needed.

### Step 5: Trait Grid Empty State — SKIP

Some layers have very few traits. The grid with 3-5 items and empty space below looks sparse, but `align-content: start` is correct behavior. Sparse is better than filler.

**Skip this item.** No changes needed.

---

## Verification

```bash
# Preview has box-shadow
grep -n "40px rgba(0, 0, 0" src/components/generator/PreviewWithControls.tsx
# Expected: 1 result — the boxShadow line

# Card hover uses scale(1.02) not scale(1.05)
grep -n "scale(1.02)" src/pages/Generator.css
# Expected: in .generator-option-item:hover

# Old scale(1.05) is gone from hover
grep -n "scale(1.05)" src/pages/Generator.css
# Expected: ZERO results (it was only in hover, which is now 1.02)

# selectPulse animation exists
grep -n "selectPulse" src/pages/Generator.css
# Expected: @keyframes definition + usage on .selected

# Layer tab hover rule exists
grep -n "generator-layer-tab.*hover" src/pages/Generator.css
# Expected: the new subtle hover rule

# Build passes
npm run typecheck && npm run build
```

---

## Visual Check

After changes, open the generator at `localhost:5173/generator`:

1. **Preview canvas** — should appear to "float" with a soft dark shadow. No colored border glow.
2. **Hover a trait card** — should lift slightly (barely noticeable), with a faint warm halo around it. Should NOT overlap neighbors aggressively.
3. **Hover a non-active layer tab** — should show a barely-visible lighter background. Active tab should be unaffected.
4. **Select a trait** — the orange glow should briefly flare brighter (~0.4s) then settle to the normal glow level.
5. **Reduced motion** — toggle `prefers-reduced-motion: reduce` in dev tools. Hover scale should be disabled, selection pulse should not play.

---

## What NOT to Change

- **Do NOT** add colored glows (orange, cyan) to the preview canvas frame — dark shadows only
- **Do NOT** add bouncing or looping animations to any element
- **Do NOT** change the trait card's selected border color (#F97316)
- **Do NOT** change existing animation durations (checkPop, pulseGlow, layerPop)
- **Do NOT** modify layout structure (grid columns, panel widths, flex ratios)
- **Do NOT** change the reduced-motion `@media` query block
- **Do NOT** add new CSS files — all changes go in `Generator.css` or inline in TSX
- **Do NOT** modify `LayerTabs.tsx` — the hover is CSS-only via aria attributes
