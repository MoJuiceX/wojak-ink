# Generator Refactor — Design Document

**Date:** 2026-02-27
**Status:** Approved
**Scope:** 16 audit issues across 15+ core generator files
**Approach:** Phased rollout — 4 phases, each deployed independently with full test gates

---

## Context

The Wojak generator is production-stable and functionally correct. However, iterative feature additions have created:
- **Code duplication** (G2 color logic duplicated across 2 functions, reducer cases copy-pasted)
- **Performance overhead** (O(n²) pattern matching, missing memoization, sequential loads)
- **Maintenance risk** (1,285-line component, 23 action types, magic strings, inline styles)
- **Data sync drift** (traitNameMap differs between frontend and backend)

This refactor addresses all 16 identified issues while preserving every existing behavior. Each phase is self-contained and deployable.

---

## Constraints

- **Zero regressions** — all 6,000+ lines of existing tests must pass at every phase
- **No feature changes** — this is purely structural/performance improvement
- **Phased deployment** — each phase committed and deployed before the next begins
- **Follow existing conventions** — per GENERATOR-CODE-HEALTH.md (rules use SelectionResolver only, empty path via `isSelectionPathEmpty`, etc.)

---

## Phase 1: Zero-Risk Fixes

No behavioral changes. Safe deletions and data syncs.

### 1.1 Sync traitNameMap.ts (Issue #4)
- **Problem:** `src/lib/traitNameMap.ts` has `'skull mask love': 'Fake It Mask'` missing from `functions/lib/traitNameMap.ts`. Backend has a legacy Unicode entry removed from frontend. BACKGROUND_COLOR_NAMES has structural differences.
- **Fix:** Sync both files. Frontend is source of truth. Copy missing entries to backend. Remove stale backend entries.
- **Files:** `src/lib/traitNameMap.ts`, `functions/lib/traitNameMap.ts`

### 1.2 Remove 4 NOOP rules (Issue #7)
- **Problem:** 4 rule functions return empty `{ disabledLayers: [] }` but still execute on every dispatch (26 rules × every interaction). They were moved to suspend/restore in the reducer but the stubs remain.
- **Fix:** Remove from `RULES` array. Keep function definitions as commented-out reference with explanation. This saves 4 function calls per dispatch.
- **Functions:** `ruleAstronautCopiumMaskMutualExclusion`, `ruleAstronautDisablesNightVision`, `ruleLaserEyesFakeMaskMutualExclusion`, `ruleFirefighterHelmetEyesExclusion`
- **Files:** `src/lib/wojakRules.ts`

### 1.3 Consolidate VALID_LAYER_NAMES (Issue #13)
- **Problem:** Identical `VALID_LAYER_NAMES` Set defined in both `prepare.ts` (line 63) and `submit.ts` (line 49).
- **Fix:** Move to `functions/api/mint/_shared.ts` as a single exported constant. Import in both endpoints.
- **Files:** `functions/api/mint/_shared.ts`, `prepare.ts`, `submit.ts`

### 1.4 Remove dead state (Issue #16)
- **Problem:** `const [, setImages] = useState<LayerImage[]>([])` in TraitSelector.tsx is never used.
- **Fix:** Delete the line.
- **Files:** `src/components/generator/TraitSelector.tsx`

**Test gate:** `npm run test:unit` + `npm run build` + deploy

---

## Phase 2: Performance Improvements

Same behavior, faster execution. No API or UI changes.

### 2.1 Fix O(n²) isOptionDisabled (Issue #5)
- **Problem:** `isOptionDisabled()` in GeneratorContext.tsx (line 879) uses `.some((opt) => optionName.toLowerCase().includes(opt.toLowerCase()))` — O(n) substring search per trait option, called 100+ times during grid rendering.
- **Fix:**
  1. In `generatorReducer.ts`: store disabled options as `Record<UILayerName, Set<string>>` (normalized lowercase) instead of `string[]`
  2. In `GeneratorContext.tsx`: `isOptionDisabled()` becomes `disabledOptionsSet.get(layer)?.has(optionName.toLowerCase()) ?? false` — O(1) lookup
  3. Update `wojakRules.ts` `getDisabledLayers()` to return `Set<string>` for `disabledOptions` (use Set internally to avoid `.includes()` dedup)
- **Files:** `GeneratorContext.tsx`, `generatorReducer.ts`, `wojakRules.ts`, `generatorStateUtils.ts`

### 2.2 Index G2 manifest traits (Issue #6)
- **Problem:** `generatorService.ts` line 700 does `.find(t => t.id === traitId)` per trait — O(n) linear scan through full manifest.
- **Fix:** After loading G2 manifest, build `Map<string, G2ManifestTrait>` index. Replace all `.find()` calls with `.get()`.
- **Files:** `src/services/generatorService.ts`

### 2.3 Parallelize manifest loading (Issue #9)
- **Problem:** G1 and G2 manifests load sequentially in `getUnifiedTraits()`.
- **Fix:** `const [_, g2Manifest] = await Promise.all([prefetchLayers(), loadG2Manifest()])` — independent fetches run in parallel.
- **Files:** `src/services/generatorService.ts`

### 2.4 Memoize TraitSelector rendering (Issue #10)
- **Problem:** `handleTraitClick` (50 lines, line 951) recreated every render and passed to every card. 7 card components inside `.map()` have no `React.memo`.
- **Fix:**
  1. Wrap `handleTraitClick` in `useCallback` with proper dependency array
  2. Create `TraitCardShell` wrapper (done fully in Phase 3) — for now, add `React.memo` to each existing card component
  3. Clean up glow timer with proper `useEffect` cleanup to prevent memory leak
- **Files:** `src/components/generator/TraitSelector.tsx`

**Test gate:** `npm run test:unit` + `npm run build` + React DevTools profiler check + deploy

---

## Phase 3: Structural Refactoring

Extract duplicated logic and split oversized files. Each sub-task is its own commit.

### 3.1 Extract G2 color building helper (Issue #1)
- **Problem:** `buildG2Selection()` (lines 64-193, 130 lines) and `selectG2Layer()` (lines 438-559, 121 lines) in GeneratorContext.tsx are 85% identical — both build G2 color maps from trait fill slots.
- **Fix:** Create `src/contexts/generatorG2Helpers.ts` with:
  - `buildG2Colors(trait, isUserPickableFill): Record<string, string>` — shared color slot resolution
  - `initializeG2Selection(trait, colors, traitId, g2Category): G2Selection` — builds the full selection object
  - Both `buildG2Selection()` and `selectG2Layer()` call these helpers
- **Files:** New `src/contexts/generatorG2Helpers.ts`, `GeneratorContext.tsx`
- **Lines saved:** ~130 lines of duplication eliminated

### 3.2 Merge SET_LAYER and SET_G2_LAYER reducer cases (Issue #3)
- **Problem:** Lines 352-437 (SET_LAYER) and 439-473 (SET_G2_LAYER) share 85% identical conflict/suspension logic.
- **Fix:** Create `processLayerUpdate(state, layer, path, options?)` function in the reducer that handles:
  1. Clear suspension for layer
  2. Process mutual exclusion conflicts
  3. Check restorable suspensions
  4. Base→Clothes auto-match (only for G1)
  5. Hand mask ↔ extra conflict (only for Mask layer)
  6. Straitjacket→clear extras (only for Clothes layer)
  7. Apply rules and push history
  - Both cases call `processLayerUpdate()` with their specific options (G2 selection, skipHistory flag)
- **Files:** `src/contexts/generatorReducer.ts`
- **Lines saved:** ~80 lines

### 3.3 Extract TraitCardShell component (Issue #2)
- **Problem:** 7 card components in TraitSelector.tsx share 70% identical template (motion.button wrapper, border/shadow/disabled logic, selection checkmark animation).
- **Fix:** Create `src/components/generator/TraitCardShell.tsx`:
  ```tsx
  interface TraitCardShellProps {
    isSelected: boolean;
    isDisabled: boolean;
    isGlowing: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }
  ```
  Each specialized card (ImageCard, BaseImageCard, etc.) becomes a thin wrapper that provides only its unique content as `children`.
- **Files:** New `TraitCardShell.tsx`, `TraitSelector.tsx`
- **Lines saved:** ~300 lines from TraitSelector

### 3.4 Extract GeneratorRightPanel nested components (Issue #8)
- **Problem:** GeneratorRightPanel.tsx (814 lines) has 3 nested components defined inline and a 15-line ternary chain for `primarySlot`.
- **Fix:**
  1. Extract `MilitaryBeretUpgradeSwatches` → `src/components/generator/MilitaryBeretSwatches.tsx`
  2. Extract `MaskVariantPicker` → `src/components/generator/MaskVariantPicker.tsx`
  3. Extract `BeerHatUnderlayerPicker` → `src/components/generator/BeerHatUnderlayerPicker.tsx`
  4. Extract `primarySlot` computation → `usePrimarySlot(g2Sel, allColorSlots, g2Trait)` custom hook
- **Files:** 3 new component files, 1 new hook, `GeneratorRightPanel.tsx`
- **Lines saved:** ~400 lines from RightPanel

**Test gate:** All existing tests + manual smoke test (load → change layers → randomize → export → save/load favorite) + deploy

---

## Phase 4: Type Safety & Style Cleanup

Final polish. CSS consolidation and type improvements.

### 4.1 Move inline styles to theme.css (Issue #11)
- **Problem:** Card borders, shadows, tab styles, metadata rows all use inline `style={{}}` throughout TraitSelector, LayerTabs, MetadataPreview, GeneratorRightPanel — violating the project CSS rule (all visuals in theme.css).
- **Fix:** Add to `src/styles/theme.css`:
  - `.generator-trait-card` — base card with border, shadow, hover, transition
  - `.generator-trait-card--selected` — selected state glow
  - `.generator-trait-card--disabled` — disabled opacity + cursor
  - `.generator-layer-tab` — tab button base + active/blocked states
  - `.metadata-attribute-row` — attribute display styling
  - Replace inline styles in all components with these classes
- **Files:** `src/styles/theme.css`, TraitSelector, LayerTabs, MetadataPreview, GeneratorRightPanel

### 4.2 Extract magic strings to constants (Issue #12)
- **Problem:** Trait IDs like `'Clothes_Suit'`, `'Head_viking-helmet'`, `'Clothes_Astronaut'` are hardcoded strings scattered throughout GeneratorRightPanel.
- **Fix:** Add to `src/lib/generatorConstants.ts`:
  ```typescript
  export const G2_TRAIT_IDS = {
    SUIT: 'Clothes_Suit',
    ASTRONAUT: 'Clothes_Astronaut',
    CHIA_FARMER: 'Clothes_Chia-farmer',
    VIKING_HELMET: 'Head_viking-helmet',
    // ... etc
  } as const;
  ```
  Replace all hardcoded strings with constant references.
- **Files:** New/updated `src/lib/generatorConstants.ts`, `GeneratorRightPanel.tsx`

### 4.3 Clean up G2Selection interface (Issue #14)
- **Problem:** `G2Selection` in `types/generator.ts` has 18 optional fields — 12 of which are trait-specific (constructionHelmetChiaLogo, beerHatUnderlayer, etc.).
- **Fix:** Group trait-specific options under a single `options` bag:
  ```typescript
  export interface G2Selection {
    traitId: string;
    g2Category: string;
    colors: Record<string, string>;
    activeColorSlot?: string;
    /** Trait-specific customization options */
    options?: Record<string, unknown>;
  }
  ```
  Type-narrow in consuming code via trait ID discriminant. Update all read/write sites.
- **Files:** `src/types/generator.ts`, all G2Selection consumers
- **Impact:** Interface becomes extensible — new customizable traits don't require interface changes

### 4.4 Extract mouth classification constants (Issue #15)
- **Problem:** Mouth classification patterns (`MOUTH_BASE_PATTERNS`, `MOUTH_ITEM_PATTERNS`, etc.) are hardcoded string arrays in `generatorService.ts` and duplicated across rules in `wojakRules.ts`.
- **Fix:** Move all mouth/mask pattern arrays to `src/lib/generatorConstants.ts`:
  ```typescript
  export const MOUTH_BASE_IDS = ['numb', 'smile', 'screaming', 'teeth', ...] as const;
  export const MOUTH_ITEM_IDS = ['cig', 'cohiba', 'joint'] as const;
  export const MASK_IDS = ['bandana-mask', 'hannibal-mask'] as const;
  export const FACIAL_HAIR_IDS = ['neckbeard', 'stach'] as const;
  ```
  Import everywhere they're used.
- **Files:** `src/lib/generatorConstants.ts`, `generatorService.ts`, `wojakRules.ts`

**Test gate:** All tests + build + full manual test + deploy

---

## Verification Plan

After **each phase**:
1. `npm run test:unit` — all unit tests pass
2. `npm run build` — zero TypeScript/build errors
3. Manual smoke test:
   - Load /generator
   - Select layers across all categories (Base, Head, Clothes, Eyes, Mask, Mouth, Background, Extras)
   - Randomize full + randomize single layer
   - Toggle G2 traits with color customization
   - Export PNG
   - Save/load favorite
   - Check MetadataPreview shows correct traits
   - Test on mobile viewport
4. Commit + push + deploy to Cloudflare
5. Verify production site loads generator correctly

After **Phase 4** (final):
- Run E2E test: `TEST_BASE_URL=https://wojak.ink npx playwright test tests/generator.spec.ts`
- Update `docs/GENERATOR-CODE-HEALTH.md` to reflect new file structure
- Final commit with updated documentation

---

## Files Created/Modified Summary

### New Files
- `src/contexts/generatorG2Helpers.ts` — shared G2 color building logic
- `src/components/generator/TraitCardShell.tsx` — reusable card wrapper
- `src/components/generator/MilitaryBeretSwatches.tsx` — extracted from RightPanel
- `src/components/generator/MaskVariantPicker.tsx` — extracted from RightPanel
- `src/components/generator/BeerHatUnderlayerPicker.tsx` — extracted from RightPanel
- `src/hooks/usePrimarySlot.ts` — extracted from RightPanel

### Modified Files
- `src/contexts/GeneratorContext.tsx` — deduplicated G2 logic, improved memoization
- `src/contexts/generatorReducer.ts` — merged SET_LAYER cases, Set-based disabled options
- `src/lib/wojakRules.ts` — removed NOOPs, Set-based disabled options output
- `src/lib/traitNameMap.ts` — synced with backend
- `src/lib/generatorConstants.ts` — new/expanded constants file
- `src/services/generatorService.ts` — G2 index, parallel loading
- `src/components/generator/TraitSelector.tsx` — extracted cards, memoization
- `src/components/generator/GeneratorRightPanel.tsx` — extracted components
- `src/components/generator/MetadataPreview.tsx` — CSS classes
- `src/components/generator/LayerTabs.tsx` — CSS classes
- `src/styles/theme.css` — new generator classes
- `src/types/generator.ts` — cleaned G2Selection
- `functions/lib/traitNameMap.ts` — synced with frontend
- `functions/api/mint/_shared.ts` — shared VALID_LAYER_NAMES
- `functions/api/mint/prepare.ts` — import shared constant
- `functions/api/mint/submit.ts` — import shared constant
- `docs/GENERATOR-CODE-HEALTH.md` — updated file roles and conventions
