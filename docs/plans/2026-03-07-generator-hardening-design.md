# Generator Hardening — Design Document

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Fix all verified generator issues from full audit

---

## Context

A comprehensive audit of the generator codebase identified multiple issues. Each claim was verified against the actual code before inclusion. False positives were eliminated (7 of 16 original claims were false).

## Confirmed Issues (9 total)

### Phase 1: Critical fixes (correctness & CSS integrity)

**1. Undefined CSS variables**
- `--generator-trait-card-bg` and `--generator-trait-card-border` are used in `theme.css` (lines 603, 899) but never defined.
- **Fix:** Define both in the `:root` block in `Generator.css` (lines 374-378) alongside existing generator variables. Add `.theme-chia-green` overrides.
- **Values:** `--generator-trait-card-bg: var(--color-surface)`, `--generator-trait-card-border: rgba(255, 255, 255, 0.06)`

**2. Manifest load silently returns `{}`**
- `generatorService.ts` line 56 catches errors and returns empty object. Downstream code gets empty trait lists with no error indication.
- **Fix:** Remove try/catch, let errors propagate to GeneratorContext's existing error handler which sets `generatorError` state and shows a refresh banner.

**3. Hardcoded `#ff9500` in Generator.css**
- `.generator-action-btn.primary:hover` (line 546) uses raw hex instead of CSS variable.
- **Fix:** Replace with `var(--color-primary-hover)`.

**4. Duplicated `findUnifiedTraitByName` in GeneratorContext.tsx**
- Identical function defined inside both `randomize()` (line 390) and `randomizeLayer()` (line 572).
- **Fix:** Extract to module-level pure function. Both callbacks reference it.

### Phase 2: Code organization (maintainability)

**5. TraitSelector.tsx split (1,157 lines)**
- 8+ memoized sub-components defined inline plus the main 498-line component.
- **Fix:** Extract card components to `src/components/generator/trait-cards/` directory with barrel export. Extract `SortControls` to its own file. Main TraitSelector imports from barrel.
- **Files:** `TraitCardSkeleton.tsx`, `ImageCard.tsx`, `BaseImageCard.tsx`, `SolidColorBackgroundCard.tsx`, `PriceOverlayCard.tsx`, `LayerWithBaseMouthCard.tsx`, `ClothesImageCard.tsx`, `G2TraitCard.tsx`, `SortControls.tsx`, `index.ts`

**6. MouthLayerSelector internal duplication**
- `ImageCard` and `G2MouthCard` within MouthLayerSelector.tsx share ~60% structure (motion.button, checkmark SVG, disabled badge, base face + clothes underlay).
- **Fix:** Extract shared structure into a `MouthCardShell` wrapper. ImageCard and G2MouthCard become thin wrappers that provide only their unique content (single image vs fill+outline layers).

### Phase 3: CSS cleanup (consistency)

**7. Inline styles consolidation**
- 228 `style={` instances across 28 generator files. ~60-70% are hardcoded values that should be theme classes.
- **Fix:** Focus on worst offenders: `PricingLightbox.tsx` (35), `G2TraitPanel.tsx` (24), `GeneratorInfo.tsx` (16), `FavoritesModal.tsx` (12). Move repeated patterns (background, border, fontSize, padding) to theme.css classes.
- **Skip:** Dynamic/computed values (transforms, conditional opacity, CSS masks) are acceptable inline.

**8. Legacy animations cleanup**
- 12 unused `@keyframes` and 9 unused utility classes in `animations.css` (~200 lines dead code).
- **Unused keyframes:** orbFloat, orbFloat2, pulseLoader, pressDown, floatSlow, rotateSlow, textGlow, fadeOutUp, fadeOutDown, scaleOut, slideInUp, slideInDown.
- **Unused classes:** .animate-fade-in-down, .animate-scale-in, .animate-bounce, .animate-float, .animate-glow, .animate-glow-gold, .animate-shake, .animate-wiggle, .animate-fade-in-up.
- **Fix:** Remove all unused keyframes and classes.

### Phase 4: Polish (optional improvements)

**9. Accessibility: icon-only buttons**
- Icon-only buttons in ActionBar, GeneratorRightPanel, MouthLayerSelector use `title` attribute but not `aria-label`.
- **Fix:** Add explicit `aria-label` to icon-only buttons across generator components. Low priority — `title` already provides accessible names in most screen readers.

## Verified False Positives (excluded from plan)

| Claim | Verdict | Reason |
|-------|---------|--------|
| Race condition in randomize() | FALSE | All async work before dispatch |
| Silent failures in extras | FALSE | Straitjacket rule works; Extra3 replacement intentional |
| Right-hand extras brittle | FALSE | Substring approach is robust |
| Context re-render storm | FALSE | Properly useMemo'd with correct deps |
| Missing --color-cyan-* vars | FALSE | Only in debug file (TraitNameAudit.tsx) |
| GeneratorRightPanel extraction | FALSE | BeerHat/Mask/Beret already extracted |
| traitOptions.ts monolith | FALSE | Data-definition file, fine at 461 lines |

## What we are NOT changing

- No changes to rendering logic, rules engine, or state management
- No changes to canvas renderer or layer builder
- No new features or behavior changes
- Not touching GeneratorRightPanel structure (already clean)
- Not refactoring traitOptions.ts (data file, appropriate as-is)
- PreviewCanvas stays full-avatar, no zoom/crop per GENERATOR-CODE-HEALTH.md
