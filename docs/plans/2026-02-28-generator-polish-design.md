# Generator Polish Pass — Design Document

**Date:** 2026-02-28
**Goal:** Fix all visual inconsistencies between desktop and mobile generator layouts, standardize component sizing, and add type/nature info to the sort bar.

## Context

Deep audit of the generator revealed 8 categories of visual inconsistency across desktop (≥1024px) and mobile (<1024px) layouts. This design addresses all of them in a single polish pass.

## Fixes

### Fix 1: Flip Mobile Layout Order

**Problem:** Desktop shows Categories (top) → Preview → Actions (bottom). Mobile reverses this: Actions (top) → Preview → Categories (bottom). No reason for the reversal.

**Solution:** In `Generator.tsx`, swap the two `!isDesktop` conditional blocks so mobile matches desktop order: categories above preview, actions below.

**Files:** `src/pages/Generator.tsx` (lines 82-117)

---

### Fix 2: Tab Bar Black Corners

**Problem:** `.generator-categories` has `background: var(--color-bg)` (#0a0a0f). The tab bar inside has `rounded-2xl` with semi-transparent background. The parent's dark bg shows through at rounded corners.

**Solution:** Set `.generator-categories` background to `transparent`.

**Files:** `src/pages/Generator.css` (line 193)

---

### Fix 3: Standardize All Icon Sizes to 18px

**Problem:** Action bar icons range from 16px to 22px. Category tab icons have conflicting Tailwind (16/20px) and CSS (18px) values.

**Solution:**
- Action bar: Change all icon `size={}` props to 18
- Category tabs: Remove Tailwind `w-4 h-4 sm:w-5 sm:h-5` classes (CSS rule at 18px takes over)
- Both bars now use 18px icons consistently

**Files:** `src/components/generator/ActionBar.tsx`, `src/components/generator/LayerTabs.tsx`

---

### Fix 4: Add Type/Nature to Sort Bar

**Problem:** Combat type/nature info only shows in desktop right panel. Mobile users never see it. The sort bar has empty center space.

**Solution:**
- Add compact type/nature display to `SortControls`: `[⊘] [⚡ Electric · Bold] [🔥][💀][A→Z]`
- Import `calculateCombatIdentity` and `useGenerator` into sort bar
- Remove `CombatPreview` from `GeneratorRightPanel.tsx` (sort bar shows it everywhere now)
- 11-12px font, muted color, no background box, truncate with ellipsis on narrow screens

**Files:** `src/components/generator/TraitSelector.tsx` (SortControls), `src/components/generator/GeneratorRightPanel.tsx`, `src/components/generator/CombatPreview.tsx`

---

### Fix 5: Unify Action Bar Button Sizes

**Problem:** Secondary buttons are 32px, primary buttons are 36px. Inconsistent sizing.

**Solution:** All buttons = `w-8 h-8` (32px). Primary buttons differentiate with color, not size.

**Files:** `src/components/generator/ActionBar.tsx` (ActionButton component)

---

### Fix 6: Standardize Bar Padding & Blur

**Problem:**
- Sort bar: `blur(12px)`, tab/action bars: `blur(10px)` — inconsistent
- Sort bar: `rgba(255,255,255,0.04)`, tab/action bars: `var(--color-black-30)` — different bg
- Tab bar: `p-2` (8px all sides), action bar: `px-2 py-1.5` (8px × 6px) — different padding

**Solution:**
- All three bars: `blur(12px)` backdrop-filter
- All three bars: `var(--color-black-30)` background
- Tab bar padding: `px-2 py-1.5` (matches action bar)
- Sort bar border: `1px solid var(--color-border)` (matches tab/action bars which use `--color-border`)

**Files:** `src/styles/theme.css` (sort bar CSS), `src/components/generator/LayerTabs.tsx` (tab bar padding), `src/components/generator/ActionBar.tsx` (blur value)

---

### Fix 7: Fix Breakpoint Mismatch

**Problem:** `LayerTabs.tsx` uses Tailwind `sm:` (640px) for icon/padding changes. Generator page uses 1024px as mobile breakpoint. Tablets (640-1023px) get mismatched sizing.

**Solution:** Replace `sm:` with `lg:` (1024px) in LayerTabs, or remove responsive Tailwind classes entirely where CSS handles it:
- Remove icon size Tailwind classes (CSS at 18px handles it)
- Change `sm:px-3 sm:py-2` → `lg:px-3 lg:py-2`
- Change `sm:gap-1` → `lg:gap-1`
- Change `sm:flex-none sm:min-w-[60px]` → `lg:flex-none lg:min-w-[60px]`

**Files:** `src/components/generator/LayerTabs.tsx`

---

### Fix 8: Fix Z-Index Scale

**Problem:** ActionBarTooltip uses `z-[9999]`, far outside the theme's scale (`--z-tooltip: 400`).

**Solution:** Change `z-[9999]` to `z-[400]`.

**Files:** `src/components/generator/ActionBar.tsx` (line 93)

---

## Out of Scope

- Touch target sizing (28-32px → 44px) — would require major layout redesign, no user complaints
- Full border-radius standardization — current variety creates visual hierarchy
- Mobile bottom sheet patterns — working fine as-is

## Verification

1. Desktop: categories top, actions bottom, 18px icons in both bars, no black tab corners
2. Mobile: same order as desktop, type/nature visible in sort bar, consistent blur/bg
3. Tablet (640-1023px): tabs use mobile styling, no awkward mixed breakpoints
4. `npm run build` passes
5. All 4051+ tests pass
