# Generator Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 16 audit issues across the Wojak generator — eliminating code duplication, improving performance, and cleaning up architecture — without breaking any existing functionality.

**Architecture:** Phased rollout across 4 phases. Each phase is self-contained, tested, committed, and deployed before the next begins. The generator has 6,000+ lines of existing tests as a safety net.

**Tech Stack:** React, TypeScript, Vite, Vitest (unit tests), Cloudflare Pages

**Design doc:** `docs/plans/2026-02-27-generator-refactor-design.md`

**CRITICAL CONSTRAINT:** The generator is in production. Every change must preserve existing behavior exactly. Run `npm run test:unit` and `npm run build` after every task. If tests fail, fix before proceeding.

---

## Phase 1: Zero-Risk Fixes

### Task 1: Sync traitNameMap.ts (frontend ↔ backend)

**Files:**
- Modify: `functions/lib/traitNameMap.ts`
- Reference: `src/lib/traitNameMap.ts`

**Step 1: Add missing entry to backend map**

In `functions/lib/traitNameMap.ts`, find the Fake It Mask section and add the missing alias. The frontend (`src/lib/traitNameMap.ts` line 236) has `'skull mask love': 'Fake It Mask'` that the backend is missing.

Add this entry in the same section of the backend map (near the other `mask skull` entries):
```typescript
'skull mask love': 'Fake It Mask',
```

**Step 2: Verify BACKGROUND_COLOR_NAMES parity**

Compare the two files' `BACKGROUND_COLOR_NAMES` objects. The frontend version is the source of truth. If the backend is missing entries, copy them over. If the backend has entries the frontend doesn't, remove them.

**Step 3: Run tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

Expected: All pass, zero errors.

**Step 4: Commit**

```bash
git add functions/lib/traitNameMap.ts
git commit -m "fix: sync backend traitNameMap with frontend (missing entries)"
```

---

### Task 2: Remove 4 NOOP rules from RULES array

**Files:**
- Modify: `src/lib/wojakRules.ts`
- Test: `src/lib/wojakRules.test.ts` (existing tests must still pass)

**Step 1: Remove NOOP entries from RULES array**

In `src/lib/wojakRules.ts`, the RULES array (starting ~line 780) contains these 4 entries that are empty stubs returning `{ disabledLayers: [] }`:

Remove these 4 lines from the array:
- `ruleAstronautCopiumMaskMutualExclusion,` (line ~793)
- `ruleAstronautDisablesNightVision,` (line ~794)
- `ruleLaserEyesFakeMaskMutualExclusion,` (line ~802)
- `ruleFirefighterHelmetEyesExclusion,` (line ~805)

**Step 2: Comment out the function definitions**

Find each function definition in the file and add a comment explaining why it was removed:

```typescript
// REMOVED FROM RULES ARRAY — mutual exclusion now handled by suspend/restore in generatorReducer.ts
// Kept as reference. See: MUTUAL_EXCLUSION_CONFLICTS in generatorReducer.ts
// function ruleAstronautCopiumMaskMutualExclusion(...) { ... }
```

Or simply delete the function bodies entirely if they're truly dead code. Check that no other code references them.

**Step 3: Run tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

Expected: All pass. The NOOP functions returned empty results, so removing them changes nothing.

**Step 4: Commit**

```bash
git add src/lib/wojakRules.ts
git commit -m "chore: remove 4 NOOP rules from RULES array (handled by reducer)"
```

---

### Task 3: Consolidate VALID_LAYER_NAMES

**Files:**
- Modify: `functions/api/mint/_shared.ts`
- Modify: `functions/api/mint/submit.ts`
- Modify: `functions/api/mint/prepare.ts`

**Step 1: Add to _shared.ts**

At the end of `functions/api/mint/_shared.ts` (before any closing), add:

```typescript
/** Valid layer names accepted by mint endpoints. Single source of truth. */
export const VALID_LAYER_NAMES = new Set([
  'Background', 'Base', 'Clothes', 'FacialHair', 'MouthBase', 'MouthItem', 'Mask', 'Eyes', 'Head',
  'Extra1', 'Extra2', 'Extra3',
]);
```

**Step 2: Update submit.ts**

In `functions/api/mint/submit.ts`, remove the local `VALID_LAYER_NAMES` definition (lines 49-52) and add to the import from `_shared`:

```typescript
import { VALID_LAYER_NAMES, /* ...existing imports... */ } from './_shared';
```

**Step 3: Update prepare.ts**

Same change in `functions/api/mint/prepare.ts` — remove local definition (lines 63-66), import from `_shared`.

**Step 4: Run tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add functions/api/mint/_shared.ts functions/api/mint/submit.ts functions/api/mint/prepare.ts
git commit -m "refactor: consolidate VALID_LAYER_NAMES into _shared.ts"
```

---

### Task 4: Remove dead state in TraitSelector

**Files:**
- Modify: `src/components/generator/TraitSelector.tsx`

**Step 1: Delete unused useState**

Remove line 874:
```typescript
const [, setImages] = useState<LayerImage[]>([]);
```

Also check if `LayerImage` import is still needed after removal. If no other usage, remove from imports.

**Step 2: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add src/components/generator/TraitSelector.tsx
git commit -m "chore: remove unused setImages state from TraitSelector"
```

---

### Task 5: Phase 1 Deploy

```bash
git push origin main
npx wrangler pages deploy dist --project-name=wojak-ink
```

Verify generator loads at https://wojak.ink/generator — select layers, randomize, export.

---

## Phase 2: Performance Improvements

### Task 6: Fix O(n²) isOptionDisabled → Set-based O(1) lookup

**Files:**
- Modify: `src/lib/wojakRules.ts` — change `disabledOptions` return type
- Modify: `src/contexts/generatorReducer.ts` — store as `Record<UILayerName, Set<string>>`
- Modify: `src/contexts/GeneratorContext.tsx` — simplify `isOptionDisabled` callback
- Modify: `src/contexts/generatorStateUtils.ts` — update type if needed

**Step 1: Update wojakRules.ts `getDisabledLayers` return type**

In the `getDisabledLayers()` function (near line 815), change the internal `disabledOptions` accumulator from `Record<string, string[]>` to `Record<string, Set<string>>`:

```typescript
// Before:
const disabledOptions: Record<string, string[]> = {};
// ...
if (!disabledOptions[key]!.includes(option)) {
  disabledOptions[key]!.push(option);
}

// After:
const disabledOptions: Record<string, Set<string>> = {};
// ...
if (!disabledOptions[key]) disabledOptions[key] = new Set();
disabledOptions[key].add(option.toLowerCase());  // normalize at source
```

Update the `DisabledLayersResult` interface to use `Set<string>`:
```typescript
disabledOptions: Record<string, Set<string>>;
```

**Step 2: Update reducer to store Sets**

In `generatorReducer.ts`, update the state type for `disabledOptions` from `Record<string, string[]>` to `Record<string, Set<string>>`. The reducer already receives this from `getDisabledLayers()`.

**Step 3: Simplify isOptionDisabled in GeneratorContext.tsx**

Replace the callback at line 879:

```typescript
// Before:
const isOptionDisabled = useCallback(
  (layer: UILayerName, optionName: string) => {
    const options = state.disabledOptions[layer];
    if (!options) return false;
    return options.some((opt) => optionName.toLowerCase().includes(opt.toLowerCase()));
  },
  [state.disabledOptions]
);

// After:
const isOptionDisabled = useCallback(
  (layer: UILayerName, optionName: string) => {
    const options = state.disabledOptions[layer];
    if (!options) return false;
    return options.has(optionName.toLowerCase());
  },
  [state.disabledOptions]
);
```

**Step 4: Update all consumers**

Search for any code that reads `disabledOptions` as an array (e.g., `.length`, `.map()`, `.forEach()`, `.some()`, `.includes()`). Update to use Set methods (`.size`, `Set.forEach()`, `.has()`).

Key places to check:
- `generatorStateUtils.ts`
- `TraitSelector.tsx`
- `GeneratorContext.tsx`

**Step 5: Run tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

If tests fail on `disabledOptions` assertions (tests may compare arrays), update test expectations to use Sets.

**Step 6: Commit**

```bash
git add src/lib/wojakRules.ts src/contexts/generatorReducer.ts src/contexts/GeneratorContext.tsx src/contexts/generatorStateUtils.ts
git commit -m "perf: O(1) disabled option lookup via Set (was O(n²) substring search)"
```

---

### Task 7: Index G2 manifest traits with Map

**Files:**
- Modify: `src/services/generatorService.ts`

**Step 1: Build trait index after manifest load**

Find the `loadG2Manifest()` function. After the manifest is loaded and cached, build an index:

```typescript
let g2TraitIndex: Map<string, G2ManifestTrait> | null = null;

async function loadG2Manifest(): Promise<G2Manifest | null> {
  // ... existing cache logic ...

  // After successful load, build index
  if (manifest) {
    g2TraitIndex = new Map(manifest.traits.map(t => [t.id, t]));
  }

  return manifest;
}
```

**Step 2: Replace .find() with .get()**

At line ~700, replace:
```typescript
const traitData = g2Manifest.traits.find(t => t.id === traitId);
```
With:
```typescript
const traitData = g2TraitIndex?.get(traitId);
```

Search for ALL other `.find(t => t.id === ...)` patterns in the file and replace them too.

**Step 3: Clear index in cache clear function**

In `clearUnifiedTraitsCache()`, also clear the index:
```typescript
g2TraitIndex = null;
```

**Step 4: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add src/services/generatorService.ts
git commit -m "perf: index G2 traits with Map for O(1) lookup (was O(n) find)"
```

---

### Task 8: Parallelize manifest loading

**Files:**
- Modify: `src/services/generatorService.ts`

**Step 1: Change sequential to parallel**

At lines 686-687, replace:
```typescript
await generatorService.prefetchLayers();
const g2Manifest = await loadG2Manifest();
```

With:
```typescript
const [, g2Manifest] = await Promise.all([
  generatorService.prefetchLayers(),
  loadG2Manifest(),
]);
```

**Step 2: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add src/services/generatorService.ts
git commit -m "perf: parallelize G1/G2 manifest loading with Promise.all"
```

---

### Task 9: Memoize TraitSelector card rendering

**Files:**
- Modify: `src/components/generator/TraitSelector.tsx`

**Step 1: Wrap handleTraitClick in useCallback**

Replace the function definition at line ~951:

```typescript
// Before:
const handleTraitClick = (trait: UnifiedTrait) => { ... };

// After:
const handleTraitClick = useCallback((trait: UnifiedTrait) => {
  // ... exact same body ...
}, [isBlocked, isOptionDisabled, activeLayer, selectedLayers, g2Sel, selectLayer, selectG2Layer, toggleExtra, clearLayer, setBeerHatEditFocus, triggerSelectionGlow]);
```

**Step 2: Add React.memo to card components**

Wrap each card component defined inside the file with `React.memo`. For example:

```typescript
// Before:
function ImageCard({ ... }: ImageCardProps) { ... }

// After:
const ImageCard = React.memo(function ImageCard({ ... }: ImageCardProps) { ... });
```

Do this for ALL card components:
- `ImageCard`
- `BaseImageCard`
- `ClothesImageCard`
- `SolidColorBackgroundCard`
- `PriceOverlayCard`
- `LayerWithBaseMouthCard`
- `G2TraitCard`

**Step 3: Fix glow timer cleanup**

Add useEffect cleanup for the glow timer ref:

```typescript
useEffect(() => {
  return () => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
  };
}, []);
```

**Step 4: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add src/components/generator/TraitSelector.tsx
git commit -m "perf: memoize TraitSelector cards and handleTraitClick callback"
```

---

### Task 10: Phase 2 Deploy

```bash
git push origin main
npm run build
npx wrangler pages deploy dist --project-name=wojak-ink
```

Manual smoke test: load generator → change layers → randomize → export → check performance feels snappier.

---

## Phase 3: Structural Refactoring

### Task 11: Extract G2 color building helper

**Files:**
- Create: `src/contexts/generatorG2Helpers.ts`
- Modify: `src/contexts/GeneratorContext.tsx`

**Step 1: Identify the shared logic**

Read `buildG2Selection()` (~lines 64-193) and the color-building portion of `selectG2Layer()` (~lines 438-559). Identify the common pattern: iterating fill slots, checking `isUserPickableFill()`, building a `colors` record.

**Step 2: Create the helper file**

Create `src/contexts/generatorG2Helpers.ts` with the extracted shared function:

```typescript
import type { G2Selection } from '@/types/generator';
import { isUserPickableFill } from '@/lib/g2FillTreatments';

/**
 * Build the initial G2 colors record from a trait's fill slots.
 * Shared between buildG2Selection() and selectG2Layer().
 */
export function buildG2ColorsFromTrait(
  trait: { id: string; fillFile?: string; fill1File?: string; /* ... all fill slots */ ; defaultColor?: string },
): Record<string, string> {
  const colors: Record<string, string> = {};
  // ... extracted shared fill-slot iteration logic ...
  return colors;
}
```

**Step 3: Refactor both callers**

Replace the duplicated code in `buildG2Selection()` and `selectG2Layer()` with calls to `buildG2ColorsFromTrait()`.

**Step 4: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add src/contexts/generatorG2Helpers.ts src/contexts/GeneratorContext.tsx
git commit -m "refactor: extract shared G2 color building logic to generatorG2Helpers.ts"
```

---

### Task 12: Merge SET_LAYER and SET_G2_LAYER reducer cases

**Files:**
- Modify: `src/contexts/generatorReducer.ts`

**Step 1: Extract processLayerUpdate function**

Create a shared function that both cases call:

```typescript
function processLayerUpdate(
  state: GeneratorState,
  layer: UILayerName,
  path: string,
  options?: {
    g2?: G2Selection;
    skipHistory?: boolean;
    skipBaseAutoMatch?: boolean;
  }
): GeneratorState {
  const updated = { ...state.selections };
  updated[layer] = { path, traitId: /* ... */ };

  if (options?.g2) {
    // Set G2 selection
  }

  // 1. Clear suspension for layer
  // 2. Process mutual exclusion conflicts
  // 3. Check restorable suspensions
  // 4. Base→Clothes auto-match (skip for G2)
  // 5. Hand mask ↔ extra conflict
  // 6. Straitjacket → clear extras
  // 7. Apply rules and push history

  return newState;
}
```

**Step 2: Simplify both cases**

```typescript
case 'SET_LAYER':
  return processLayerUpdate(state, action.layer, action.path);

case 'SET_G2_LAYER':
  return processLayerUpdate(state, action.layer, action.path, {
    g2: action.g2,
    skipHistory: action.skipHistory,
    skipBaseAutoMatch: true,
  });
```

**Step 3: Run tests**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

This is the highest-risk change in the refactor. If any test fails, compare the old behavior line-by-line.

**Step 4: Commit**

```bash
git add src/contexts/generatorReducer.ts
git commit -m "refactor: merge SET_LAYER and SET_G2_LAYER into shared processLayerUpdate"
```

---

### Task 13: Extract TraitCardShell component

**Files:**
- Create: `src/components/generator/TraitCardShell.tsx`
- Modify: `src/components/generator/TraitSelector.tsx`

**Step 1: Create TraitCardShell**

Extract the shared wrapper that all 7 card types use:

```typescript
import { memo } from 'react';
import { motion } from 'framer-motion';

interface TraitCardShellProps {
  isSelected: boolean;
  isDisabled: boolean;
  isGlowing: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const TraitCardShell = memo(function TraitCardShell({
  isSelected, isDisabled, isGlowing, onClick, title, children, className,
}: TraitCardShellProps) {
  return (
    <motion.button
      className={`w-full aspect-square relative rounded-xl overflow-hidden p-1 ${className ?? ''}`}
      style={{
        background: 'var(--generator-trait-card-bg)',
        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-white-5)',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isSelected ? '0 0 20px rgba(249, 115, 22, 0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
      }}
      whileHover={!isDisabled ? { scale: 1.03 } : undefined}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
    >
      {children}
      {/* Selection checkmark */}
      {isSelected && !isDisabled && (
        <motion.div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'var(--generator-badge-color, #F97316)' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
      )}
      {/* Glow effect */}
      {isGlowing && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 0 25px rgba(249, 115, 22, 0.6)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
});
```

**Note:** Get the exact styles from the existing card components — the above is a template. Match the existing visual behavior exactly.

**Step 2: Refactor each card to use TraitCardShell**

Each card (ImageCard, BaseImageCard, etc.) becomes a thin wrapper providing only its unique content as `children`:

```typescript
const ImageCard = memo(function ImageCard({ image, isSelected, isDisabled, isGlowing, onClick }: ImageCardProps) {
  return (
    <TraitCardShell isSelected={isSelected} isDisabled={isDisabled} isGlowing={isGlowing} onClick={onClick} title={image.displayName}>
      <img src={image.thumbnailPath} alt={image.displayName} className="w-full h-full object-contain" />
      <span className="trait-card-label">{image.displayName}</span>
    </TraitCardShell>
  );
});
```

**Step 3: Run tests + build + visual check**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

Visually verify the trait grid looks identical on the dev server.

**Step 4: Commit**

```bash
git add src/components/generator/TraitCardShell.tsx src/components/generator/TraitSelector.tsx
git commit -m "refactor: extract TraitCardShell from 7 duplicated card components"
```

---

### Task 14: Extract GeneratorRightPanel nested components

**Files:**
- Create: `src/components/generator/MilitaryBeretSwatches.tsx`
- Create: `src/components/generator/MaskVariantPicker.tsx`
- Create: `src/components/generator/BeerHatUnderlayerPicker.tsx`
- Create: `src/hooks/usePrimarySlot.ts`
- Modify: `src/components/generator/GeneratorRightPanel.tsx`

**Step 1: Extract MilitaryBeretSwatches**

Move the `MilitaryBeretUpgradeSwatches` component (~lines 53-86 of GeneratorRightPanel.tsx) to its own file. Keep the same props interface, just move to a separate file and import.

**Step 2: Extract MaskVariantPicker**

Move `MaskVariantPicker` (~lines 203-314) to its own file.

**Step 3: Extract BeerHatUnderlayerPicker**

Move `BeerHatUnderlayerPicker` (~lines 316-361) to its own file.

**Step 4: Extract usePrimarySlot hook**

The 15-line ternary chain (~lines 452-484) becomes:

```typescript
// src/hooks/usePrimarySlot.ts
import { useMemo } from 'react';
import type { G2Selection } from '@/types/generator';

export function usePrimarySlot(
  g2Sel: G2Selection | undefined,
  allColorSlots: string[],
  g2Trait: G2ManifestTrait | null,
  hasG2Selection: boolean,
): string | null {
  return useMemo(() => {
    if (!hasG2Selection || !g2Sel) return null;

    // Suit and Chia Farmer: use activeColorSlot or default to fill0
    if (g2Sel.traitId === 'Clothes_Suit' || g2Sel.traitId === 'Clothes_Chia-farmer') {
      return g2Sel.activeColorSlot ?? 'fill0';
    }

    // Multi-slot traits: use active slot if valid, else first slot
    if (allColorSlots.length > 1) {
      return g2Sel.activeColorSlot && allColorSlots.includes(g2Sel.activeColorSlot)
        ? g2Sel.activeColorSlot
        : allColorSlots[0];
    }

    // Single-slot traits: use primary slot from trait config
    return getPrimaryColorSlot(g2Trait) ?? getDefaultSlotForTrait(g2Sel.traitId);
  }, [g2Sel, allColorSlots, g2Trait, hasG2Selection]);
}
```

**Step 5: Update GeneratorRightPanel imports**

Replace inline definitions with imports from new files.

**Step 6: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 7: Commit**

```bash
git add src/components/generator/MilitaryBeretSwatches.tsx src/components/generator/MaskVariantPicker.tsx src/components/generator/BeerHatUnderlayerPicker.tsx src/hooks/usePrimarySlot.ts src/components/generator/GeneratorRightPanel.tsx
git commit -m "refactor: extract 3 components + usePrimarySlot from GeneratorRightPanel"
```

---

### Task 15: Phase 3 Deploy + Smoke Test

```bash
git push origin main
npm run build
npx wrangler pages deploy dist --project-name=wojak-ink
```

**Full manual smoke test:**
1. Load /generator on desktop and mobile
2. Select Base → change to each expression (Classic, Rekt, etc.)
3. Select Head → pick G2 trait (Viking Helmet) → verify color picker works
4. Select Clothes → pick Suit → verify variant picker
5. Select Clothes → pick Astronaut → verify logo/flag selectors
6. Select Head → pick Beer Hat → verify underlayer picker
7. Select Mask → pick items → verify mouth auto-clearing
8. Select Extras → verify hand items and wing toggle
9. Randomize full → verify all layers populated
10. Export PNG → verify download works
11. Save favorite → load favorite → verify restoration
12. Check MetadataPreview shows correct trait names

---

## Phase 4: Type Safety & Style Cleanup

### Task 16: Move inline styles to theme.css

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/components/generator/TraitCardShell.tsx` (or TraitSelector.tsx if Shell not yet used)
- Modify: `src/components/generator/LayerTabs.tsx`
- Modify: `src/components/generator/MetadataPreview.tsx`

**Step 1: Add generator classes to theme.css**

```css
/* Generator Trait Cards */
.generator-trait-card {
  background: var(--generator-trait-card-bg, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--color-white-5);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.generator-trait-card--selected {
  border: 2px solid var(--color-primary);
  box-shadow: 0 0 20px rgba(249, 115, 22, 0.3);
}

.generator-trait-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Generator Layer Tabs */
.generator-layer-tab {
  background: transparent;
  transition: all 0.3s ease;
}

.generator-layer-tab--active {
  color: var(--color-text);
}

.generator-layer-tab--blocked {
  opacity: 0.5;
  filter: grayscale(1);
}

/* Metadata Attribute Rows */
.metadata-attribute-row {
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--color-white-5);
  border-radius: var(--radius-md);
}

.metadata-attribute-row--empty {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.03);
  opacity: 0.3;
}
```

**Step 2: Replace inline styles in components**

In each component, replace `style={{ ... }}` objects with the new class names. Use `className` with conditionals:

```tsx
className={`generator-trait-card ${isSelected ? 'generator-trait-card--selected' : ''} ${isDisabled ? 'generator-trait-card--disabled' : ''}`}
```

**Step 3: Run build + visual verify**

```bash
npm run build 2>&1 | tail -5
```

Start dev server and visually confirm all cards, tabs, and metadata rows look identical.

**Step 4: Commit**

```bash
git add src/styles/theme.css src/components/generator/TraitCardShell.tsx src/components/generator/LayerTabs.tsx src/components/generator/MetadataPreview.tsx
git commit -m "style: move generator inline styles to theme.css classes"
```

---

### Task 17: Extract magic strings to constants

**Files:**
- Create or modify: `src/lib/generatorConstants.ts`
- Modify: `src/components/generator/GeneratorRightPanel.tsx`

**Step 1: Create constants file**

```typescript
// src/lib/generatorConstants.ts

/** G2 trait IDs used in conditional logic across components */
export const G2_TRAIT_IDS = {
  SUIT: 'Clothes_Suit',
  ASTRONAUT: 'Clothes_Astronaut',
  CHIA_FARMER: 'Clothes_Chia-farmer',
  NINJA_TURTLE: 'Clothes_Ninja-turtle-fit',
  BEPA_ARMY: 'Clothes_Bepa-army',
  BEER_HAT: 'Head_Beer-Hat',
  VIKING_HELMET: 'Head_viking-helmet',
  MILITARY_BERET: 'Head_military-beret',
  CONSTRUCTION_HELMET: 'Head_Construction-helmet',
  THREE_D_GLASSES: 'Face-wear_3d-glases',
} as const;

/** Mouth classification patterns for generatorService.ts and wojakRules.ts */
export const MOUTH_BASE_PATTERNS = [
  'numb', 'smile', 'screeming', 'screaming', 'teeth', 'gold-teeth',
  'pizza', 'pipe', 'bubble-gum', 'drac', 'glossed', 'stunned', 'sexy',
] as const;

export const MOUTH_ITEM_PATTERNS = ['cig', 'cohiba', 'joint'] as const;
export const MASK_PATTERNS = ['bandana-mask', 'hannibal-mask', 'copium'] as const;
export const FACIAL_HAIR_PATTERNS = ['neckbeard', 'stach'] as const;
```

**Step 2: Replace hardcoded strings in GeneratorRightPanel**

Replace every instance like `g2Sel?.traitId === 'Clothes_Suit'` with `g2Sel?.traitId === G2_TRAIT_IDS.SUIT`.

**Step 3: Replace hardcoded patterns in generatorService.ts and wojakRules.ts**

Import `MOUTH_BASE_PATTERNS` etc. and replace inline arrays.

**Step 4: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add src/lib/generatorConstants.ts src/components/generator/GeneratorRightPanel.tsx src/services/generatorService.ts src/lib/wojakRules.ts
git commit -m "refactor: extract magic trait IDs and mouth patterns to generatorConstants.ts"
```

---

### Task 18: Clean up G2Selection interface

**Files:**
- Modify: `src/types/generator.ts`
- Modify: All G2Selection consumers (GeneratorContext, GeneratorRightPanel, etc.)

**Step 1: Restructure G2Selection**

Group trait-specific fields under an `options` record:

```typescript
export interface G2Selection {
  traitId: string;
  g2Category: string;
  colors: Record<string, string>;
  activeColorSlot?: string;
  /** Trait-specific customization — keyed by option name */
  options: Record<string, string | boolean | G2Selection | undefined>;
}
```

Migration map:
- `detailOption` → `options.detail`
- `frameOption` → `options.frame`
- `variant` → `options.variant`
- `logoOption` → `options.logo`
- `flagOption` → `options.flag`
- `name1` → `options.name1`
- `name2` → `options.name2`
- `suitVariant` → `options.suitVariant`
- `chiaFarmerUnderlayer` → `options.chiaFarmerUnderlayer`
- `constructionHelmetChiaLogo` → `options.constructionHelmetChiaLogo`
- `constructionHelmetCigPack` → `options.constructionHelmetCigPack`
- `beerHatUnderlayer` → `options.beerHatUnderlayer`
- `beerHatUnderlayerG2` → `options.beerHatUnderlayerG2`
- `beerHatEditFocus` → `options.beerHatEditFocus`

**Step 2: Update all consumers**

Search for every access like `g2Sel.logoOption` and replace with `g2Sel.options.logo as string`. Use TypeScript assertions or type guards.

**IMPORTANT:** This is a wide-reaching change. Do it methodically file by file. Run build after each file to catch type errors immediately.

**Step 3: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/types/generator.ts src/contexts/ src/components/generator/ src/services/
git commit -m "refactor: restructure G2Selection — trait options under options bag"
```

---

### Task 19: Extract mouth classification constants

**Files:**
- Modify: `src/lib/generatorConstants.ts` (already created in Task 17)
- Modify: `src/services/generatorService.ts`
- Modify: `src/lib/wojakRules.ts`

**Step 1: Verify constants already exist from Task 17**

The `MOUTH_BASE_PATTERNS`, `MOUTH_ITEM_PATTERNS`, `MASK_PATTERNS`, `FACIAL_HAIR_PATTERNS` should already be in `generatorConstants.ts`.

**Step 2: Replace all inline arrays**

In `generatorService.ts`, find `classifyMouthItem()` and replace its internal arrays with imports.

In `wojakRules.ts`, find rules that use inline mouth option arrays and replace with imports. Key rules:
- `ruleFacialHairRequiresMouthBase` — has inline `allowedMouthBases`
- `ruleCopiumMaskForcesValidMouthBase` — has inline `blockedMouthBase`
- `ruleMaskBlocksOtherLayers` — has inline `blockedMouthBase`

**Step 3: Run tests + build**

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tail -20
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/lib/generatorConstants.ts src/services/generatorService.ts src/lib/wojakRules.ts
git commit -m "refactor: consolidate mouth/mask classification into shared constants"
```

---

### Task 20: Update documentation + Final deploy

**Files:**
- Modify: `docs/GENERATOR-CODE-HEALTH.md`

**Step 1: Update file roles table**

Add new files:
```markdown
| Area            | Files |
|-----------------|--------|
| Layer definitions | `layerRegistry`, `config/layers` |
| Rules & trait IDs | `wojakRules`, `generatorTraitIds`, `generatorConstants` |
| Resolver & adapter | `selectionResolver`, `selectionAdapter` |
| State & reducer   | `generatorReducer`, `generatorStateUtils`, `GeneratorContext`, `generatorG2Helpers` |
| Render pipeline   | `canvasRendererLayerBuilder`, `canvasRendererConstants`, `canvasRenderer` |
| UI components     | `TraitCardShell`, `MilitaryBeretSwatches`, `MaskVariantPicker`, `BeerHatUnderlayerPicker` |
| Hooks             | `usePrimarySlot` |
| Docs              | `GENERATOR-ARCHITECTURE`, `GENERATOR-CHECKLIST`, this file |
```

**Step 2: Add refactor notes**

```markdown
## Refactored (2026-02-27)

- G2 color building: shared in `generatorG2Helpers.ts` (no longer duplicated)
- Reducer: `processLayerUpdate()` handles both G1 and G2 layer selection
- Disabled options: stored as `Set<string>` for O(1) lookup
- TraitCardShell: shared wrapper for all 7 card types
- Constants: `generatorConstants.ts` has G2 trait IDs and mouth patterns
- Manifest loading: parallel via Promise.all, G2 traits indexed with Map
```

**Step 3: Commit**

```bash
git add docs/GENERATOR-CODE-HEALTH.md
git commit -m "docs: update GENERATOR-CODE-HEALTH.md with refactored file roles"
```

**Step 4: Final deploy**

```bash
git push origin main
npm run build
npx wrangler pages deploy dist --project-name=wojak-ink
CLOUDFLARE_PURGE_TOKEN=$(cat ~/.cloudflare-purge-token) && curl -s -X POST "https://api.cloudflare.com/client/v4/zones/cf75e020a68dcccd84405950df016860/purge_cache" -H "Authorization: Bearer $CLOUDFLARE_PURGE_TOKEN" -H "Content-Type: application/json" --data '{"purge_everything":true}'
```

**Step 5: Full verification**

Run the complete smoke test from Task 15 one final time on production.

---

## Summary

| Phase | Tasks | Commits | Risk |
|-------|-------|---------|------|
| 1: Zero-risk | 1-5 | 4 | None |
| 2: Performance | 6-10 | 4 | Low |
| 3: Structural | 11-15 | 4 | Medium |
| 4: Cleanup | 16-20 | 5 | Low |
| **Total** | **20 tasks** | **17 commits** | — |
