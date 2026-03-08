# Generator Polish v2 — Design Document

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Surgical CSS architecture cleanup on ActionBar, MouthLayerSelector, DetailSelector, Generator.css
**Approach:** Move inline visual styles to theme.css classes, eliminate anti-patterns. Zero visual changes.

---

## Context

The original Generator Polish plan (2026-02-28) was fully executed in a prior session. A fresh audit on 2026-03-07 found a new set of CSS architecture violations: inline styles for visual properties scattered across generator components instead of living in theme.css per project rules.

**Worst offenders:**
- ActionBar.tsx — 10 inline style violations, including JS `onMouseEnter/Leave` hover handlers
- MouthLayerSelector.tsx — 8 violations with 95% duplicated styles across two card components
- DetailSelector.tsx — 6 violations with hardcoded hex fallbacks
- Generator.css — 4 `!important` rules and 4 hardcoded `#F97316` hex values

MetadataPreview.tsx is clean — no action needed.

---

## Constraints

- **Zero visual changes** — CSS refactor only, no behavior changes
- **All visuals in theme.css** — per CLAUDE.md CSS architecture rules
- **No `!important`** — ever (per CLAUDE.md)
- **No hardcoded hex colors** — use CSS variables
- **Dynamic values stay inline** — transforms, zoom factors, computed positions

---

## Task 1: ActionBar — Extract inline styles to CSS classes

### 1a: Overflow menu hover handlers (anti-pattern)

**Problem:** Four menu items use `onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-white-5)'}` / `onMouseLeave` to handle hover. This is a React anti-pattern — CSS handles hover states.

**Fix:** Create `.action-menu-item` class with `:hover` rule. Remove all `onMouseEnter`/`onMouseLeave` handlers (lines 499-500, 524-525, 547-548, 563-564).

### 1b: ActionButton component styles (lines 304-321)

**Problem:** Large ternary block for `background`, `color`, `opacity`, `border`, `boxShadow` based on `isActive`/`disabled` state.

**Fix:** Create `.action-btn`, `.action-btn--active`, `.action-btn--disabled` in theme.css. Toggle via className.

### 1c: Other ActionBar inline styles

| Element | Lines | Fix |
|---------|-------|-----|
| Tooltip | 94-99 | `.action-bar-tooltip` class |
| Badge | 333-337 | `.action-btn-badge` class (use `var(--color-primary)`) |
| Main bar container | 350-355 | `.action-bar-container` class |
| Randomize button | 363-366 | Remove inline — element already has Tailwind layout classes |
| Separator | 407 | Tailwind `bg-[var(--color-border)]` |
| Dropdown | 488-492 | `.action-bar-dropdown` class |
| Menu badges | 512, 536 | Reuse existing `.badge` from theme.css |
| Paused button | 629-632 | `.action-btn--paused` class |
| Metadata toggle icon | 570 | Tailwind: `font-mono text-sm font-bold` |
| Mint section border | 585 | Tailwind: `border-l border-[var(--color-border)]` |

---

## Task 2: MouthLayerSelector — Deduplicate card styles

### 2a: Shared card class

**Problem:** `ImageCard` (lines 68-79) and `G2MouthCard` (lines 257-268) have 95% identical inline styles for background, border, opacity, cursor, boxShadow, transition.

**Fix:** Create `.mouth-trait-card` class in theme.css using existing `--generator-*` CSS variables. Add modifier classes `.mouth-trait-card--selected` and `.mouth-trait-card--disabled`.

### 2b: Shared badge/checkmark classes

**Problem:** Badge (lines 90-93), checkmark (lines 168, 337), and disabled info badge (lines 156, 350) each duplicated with inline styles.

**Fix:** Create `.trait-card-badge`, `.trait-card-checkmark`, `.trait-card-disabled-badge` classes in theme.css.

### 2c: Skeleton and notice cards

**Problem:** Skeleton (lines 39-42) and blocked/empty notices (lines 531-533, 657-659) use inline styles for background and border.

**Fix:** Create `.trait-card-skeleton` and `.generator-notice-card` (or reuse `.card-static`) in theme.css.

---

## Task 3: DetailSelector — Extract button styles

### 3a: Grid layout

**Problem:** Line 71 has inline grid styles despite `.detail-selector-grid` class already on the element.

**Fix:** Move grid definition to `.detail-selector-grid` in theme.css.

### 3b: Option buttons

**Problem:** None button (lines 76-84) and detail option buttons (lines 105-113) have identical ternary-based inline styles for background, border, boxShadow.

**Fix:** Create `.detail-option` and `.detail-option--selected` classes in theme.css. Use className toggling.

### 3c: Checkmark and icon color

**Problem:** Checkmark (line 159) and Ban icon (line 93) use inline color with hardcoded hex fallbacks (`#ff6b00`).

**Fix:** `.detail-option-checkmark` class and `.detail-option--selected .lucide-ban` selector in theme.css.

---

## Task 4: Generator.css cleanup

### 4a: Remove `!important` from trait card backgrounds

**Problem:** Lines 348, 356, 363, 370 use `!important` on `.trait-card-image-bg` gradient backgrounds. These are already the most specific selectors (`.theme-X .trait-card-image-bg`).

**Fix:** Remove `!important` from all four rules. Specificity is already sufficient.

### 4b: Replace hardcoded `#F97316`

**Problem:** Lines 410, 442 use raw `#F97316` instead of CSS variables.

**Fix:**
- Line 410: `border-color: #F97316` → `border-color: var(--generator-selected-color)`
- Line 442: `background: #F97316` → `background: var(--generator-selected-color)`

(Lines 375, 377 define the CSS variables themselves, so they keep the hex value as the default.)

---

## Out of Scope

- MaskVariantPicker inline styles (5 violations — lower priority, fewer instances)
- GeneratorRightPanel inline styles (3 violations — mixed layout/visual, lower impact)
- TraitSelector card components (already use `--generator-*` CSS vars, just inline)
- Any feature changes or behavioral modifications

---

## Verification

1. `npm run build` passes — zero TypeScript errors
2. Visual comparison: generator looks identical before and after on desktop + mobile
3. Hover states on overflow menu items still work (now via CSS instead of JS)
4. No `!important` rules remain in Generator.css (except `prefers-reduced-motion` which is acceptable)
5. `grep -r '#F97316\|#ff6b00' src/pages/Generator.css` returns only CSS variable definitions
