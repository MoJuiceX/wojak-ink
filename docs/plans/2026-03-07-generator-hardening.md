# Generator Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 9 verified generator issues from the full audit — CSS variable definitions, manifest error handling, code deduplication, file splitting, dead code removal, and accessibility improvements.

**Architecture:** Pure cleanup/hardening — no new features, no behavior changes. Phase 1 fixes correctness issues. Phase 2 improves maintainability via file splitting. Phase 3 removes dead CSS. Phase 4 adds accessibility attributes. Each task is independently verifiable.

**Tech Stack:** React, TypeScript, CSS, Vitest (unit tests)

**Reference docs:**
- Design: `docs/plans/2026-03-07-generator-hardening-design.md`
- Architecture: `docs/GENERATOR-CODE-HEALTH.md`
- CSS rules: `CLAUDE.md` (CSS Architecture section)

---

## Phase 1: Critical Fixes

### Task 1: Define missing CSS variables

Two CSS variables (`--generator-trait-card-bg`, `--generator-trait-card-border`) are used in `src/styles/theme.css` (lines 603, 899) but never defined. Cards currently render with transparent/missing background.

**Files:**
- Modify: `src/pages/Generator.css:374-384`

**Step 1: Add the missing variables to the `:root` block**

In `src/pages/Generator.css`, find the `:root` block (lines 374-378) and add the two missing variables:

```css
/* === TRAIT CARD SELECTED BORDER & BADGE COLORS (Theme-aware) === */
:root {
  --generator-selected-color: #F97316;
  --generator-selected-glow: var(--color-primary-50);
  --generator-badge-color: #F97316;
  --generator-trait-card-bg: var(--color-surface);
  --generator-trait-card-border: rgba(255, 255, 255, 0.06);
}
```

**Step 2: Add overrides to `.theme-chia-green`**

In `src/pages/Generator.css`, find the `.theme-chia-green` block (lines 380-384) and add overrides:

```css
.theme-chia-green {
  --generator-selected-color: #4ade80;
  --generator-selected-glow: var(--color-success-50);
  --generator-badge-color: #166534;
  --generator-trait-card-bg: var(--color-surface);
  --generator-trait-card-border: rgba(74, 222, 128, 0.1);
}
```

**Step 3: Verify with grep**

Run: `grep -rn 'generator-trait-card-bg\|generator-trait-card-border' src/`

Expected: Variables defined in `Generator.css` (:root and .theme-chia-green) AND used in `theme.css` (lines 603, 899). No "used but not defined" gap.

**Step 4: Build check**

Run: `npm run build`
Expected: PASS (no errors)

**Step 5: Commit**

```bash
git add src/pages/Generator.css
git commit -m "fix: define missing --generator-trait-card-bg and --generator-trait-card-border CSS variables

These variables were used in theme.css for .generator-trait-card and
.mouth-trait-card but never defined, causing transparent card backgrounds."
```

---

### Task 2: Fix manifest load error handling

`src/services/generatorService.ts` silently returns `{}` when manifest fetch fails (line 56). This bypasses the error banner in GeneratorContext that would otherwise tell the user to refresh.

**Files:**
- Modify: `src/services/generatorService.ts:46-58`

**Step 1: Remove the try/catch and let errors propagate**

In `src/services/generatorService.ts`, replace the `loadManifest` function (lines 46-58) with:

```typescript
async function loadManifest(): Promise<ManifestData> {
  if (manifestCache) return manifestCache;

  const response = await fetch(`${LAYER_BASE}/manifest.json`);
  if (!response.ok) {
    throw new Error(`Failed to load layer manifest: ${response.status} ${response.statusText}`);
  }
  manifestCache = await response.json();
  return manifestCache!;
}
```

**Step 2: Build check**

Run: `npm run build`
Expected: PASS — the callers in `GeneratorContext.tsx` already wrap manifest-loading calls in try/catch that set `generatorError` state.

**Step 3: Run unit tests**

Run: `npm run test:unit`
Expected: PASS (no existing tests mock this function)

**Step 4: Commit**

```bash
git add src/services/generatorService.ts
git commit -m "fix: propagate manifest load errors instead of silently returning {}

Previously, loadManifest() caught errors and returned an empty object,
causing the generator to show an empty trait grid with no error indication.
Now errors propagate to GeneratorContext's existing error handler which
shows a refresh banner."
```

---

### Task 3: Replace hardcoded `#ff9500` in Generator.css

`.generator-action-btn.primary:hover` uses raw hex `#ff9500` instead of a CSS variable.

**Files:**
- Modify: `src/pages/Generator.css:546`

**Step 1: Replace the hardcoded color**

In `src/pages/Generator.css`, line 546, change:

```css
.generator-action-btn.primary:hover {
  background: #ff9500;
```

to:

```css
.generator-action-btn.primary:hover {
  background: var(--color-primary-hover);
```

**Step 2: Verify no more hardcoded hex in Generator.css**

Run: `grep -n '#[0-9a-fA-F]\{6\}' src/pages/Generator.css | grep -v 'var\|--\|/\*\|gradient'`

Expected: Only hex values inside CSS variable definitions (`:root` and `.theme-chia-green` blocks), not in property values.

**Step 3: Build check**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/Generator.css
git commit -m "fix: replace hardcoded #ff9500 with var(--color-primary-hover) in Generator.css"
```

---

### Task 4: Extract duplicated `findUnifiedTraitByName`

The function `findUnifiedTraitByName` is defined identically inside both `randomize()` (line 390) and `randomizeLayer()` (line 572) in `GeneratorContext.tsx`. Extract to a module-level function.

**Files:**
- Modify: `src/contexts/GeneratorContext.tsx:390-410, 572-586`

**Step 1: Add the module-level function**

In `src/contexts/GeneratorContext.tsx`, add this function BEFORE the `GeneratorProvider` component (around line 100, after the imports and type definitions). The function uses `normalizeName` which is already imported from `@/lib/weightedRandomizer` at line 40:

```typescript
/**
 * Find a unified trait by weighted trait name.
 * Matches trait names to frequency keys using normalization.
 * Pure function — safe to use outside React components.
 */
function findUnifiedTraitByName(
  traits: UnifiedTrait[],
  traitName: string
): UnifiedTrait | null {
  const normalizedTrait = normalizeName(traitName);

  // Try exact match first
  for (const t of traits) {
    if (normalizeName(t.name) === normalizedTrait) return t;
  }

  // Try partial match (trait contains or is contained)
  for (const t of traits) {
    const normalizedName = normalizeName(t.name);
    if (normalizedName.includes(normalizedTrait) || normalizedTrait.includes(normalizedName)) {
      return t;
    }
  }

  return null;
}
```

**Step 2: Remove the inline definition from `randomize()`**

In `src/contexts/GeneratorContext.tsx`, delete lines 386-410 (the `findUnifiedTraitByName` definition inside `randomize()`). The function call on line 448 (`findUnifiedTraitByName(traits, weightedTrait)`) will now reference the module-level version.

**Step 3: Remove the inline definition from `randomizeLayer()`**

In `src/contexts/GeneratorContext.tsx`, delete lines 572-586 (the `findUnifiedTraitByName` definition inside `randomizeLayer()`). The function call on line 598 (`findUnifiedTraitByName(traits, weightedName)`) will now reference the module-level version.

**Step 4: Build check**

Run: `npm run build`
Expected: PASS

**Step 5: Verify no duplicate definitions remain**

Run: `grep -n 'findUnifiedTraitByName' src/contexts/GeneratorContext.tsx`

Expected: Exactly 1 definition (the new module-level `function findUnifiedTraitByName`) plus 2 call sites. No `const findUnifiedTraitByName` inside callbacks.

**Step 6: Run unit tests**

Run: `npm run test:unit`
Expected: PASS

**Step 7: Commit**

```bash
git add src/contexts/GeneratorContext.tsx
git commit -m "refactor: extract findUnifiedTraitByName to module-level function

Was duplicated identically inside both randomize() and randomizeLayer()
callbacks. Now a single pure function at module scope."
```

---

## Phase 2: Code Organization

### Task 5: Split TraitSelector.tsx into multiple files

`src/components/generator/TraitSelector.tsx` is 1,157 lines with 8 memoized sub-components plus the main component. Extract card components to a `trait-cards/` directory and `SortControls` to its own file.

**Files:**
- Create: `src/components/generator/trait-cards/TraitCardSkeleton.tsx`
- Create: `src/components/generator/trait-cards/ImageCard.tsx`
- Create: `src/components/generator/trait-cards/BaseImageCard.tsx`
- Create: `src/components/generator/trait-cards/SolidColorBackgroundCard.tsx`
- Create: `src/components/generator/trait-cards/PriceOverlayCard.tsx`
- Create: `src/components/generator/trait-cards/LayerWithBaseMouthCard.tsx`
- Create: `src/components/generator/trait-cards/ClothesImageCard.tsx`
- Create: `src/components/generator/trait-cards/G2TraitCard.tsx`
- Create: `src/components/generator/trait-cards/index.ts`
- Create: `src/components/generator/SortControls.tsx`
- Modify: `src/components/generator/TraitSelector.tsx` (remove extracted code, import from new files)

**Step 1: Create the `trait-cards/` directory**

Run: `mkdir -p src/components/generator/trait-cards`

**Step 2: Create `trait-cards/TraitCardSkeleton.tsx`**

```tsx
/**
 * Skeleton loading placeholder for trait cards.
 */

export function TraitCardSkeleton() {
  return (
    <div
      className="aspect-square rounded-xl overflow-hidden animate-pulse"
      style={{
        background: 'var(--color-border)',
        border: '1px solid var(--color-border)',
      }}
    />
  );
}
```

**Step 3: Create `trait-cards/ImageCard.tsx`**

```tsx
/**
 * Generic image card for trait grid (non-composite layers).
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import type { LayerImage } from '@/services/generatorService';

export interface ImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const ImageCard = memo(function ImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: ImageCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
    >
      <div
        className="relative w-full h-full overflow-hidden trait-card-image-bg"
      >
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});
```

**Step 4: Create `trait-cards/BaseImageCard.tsx`**

```tsx
/**
 * Base layer card — shows base + clothes + mouth composite.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import { BASE_CLOTHES_MAP, DEFAULT_CLOTHES_PATH } from '@/config/layers';
import type { LayerImage } from '@/services/generatorService';

const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

function getClothesForBase(basePath: string): string {
  const lowerPath = basePath.toLowerCase();
  for (const [key, clothesPath] of Object.entries(BASE_CLOTHES_MAP)) {
    if (lowerPath.includes(key)) {
      return clothesPath;
    }
  }
  return DEFAULT_CLOTHES_PATH;
}

export interface BaseImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const BaseImageCard = memo(function BaseImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: BaseImageCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
    >
      <div
        className="relative w-full h-full overflow-hidden trait-card-image-bg"
      >
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <img
          src={getClothesForBase(image.path)}
          alt="Clothes layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <img
          src={DEFAULT_MOUTH_PATH}
          alt="Mouth layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});
```

**Step 5: Create `trait-cards/SolidColorBackgroundCard.tsx`**

```tsx
/**
 * Solid color background card — color fill with label.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';

export interface SolidColorBackgroundCardProps {
  color: string;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const SolidColorBackgroundCard = memo(function SolidColorBackgroundCard({ color, isSelected, isDisabled, disabledReason, onClick }: SolidColorBackgroundCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : 'Solid color — pick with color picker'}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={{ backgroundColor: color }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-medium truncate text-primary"
        style={{
          background: 'linear-gradient(transparent, var(--color-black-70))',
        }}
      >
        Solid color
      </div>
    </TraitCardShell>
  );
});
```

**Step 6: Create `trait-cards/PriceOverlayCard.tsx`**

```tsx
/**
 * Price up/down overlay card — overlay on top of solid color background.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { LAYER_BASE } from '@/config/layerAssetBase';

export interface PriceOverlayCardProps {
  overlayType: 'up' | 'down';
  bgColor: string;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const PriceOverlayCard = memo(function PriceOverlayCard({ overlayType, bgColor, isSelected, isDisabled, disabledReason, onClick }: PriceOverlayCardProps) {
  const overlayPath = `${LAYER_BASE}/BACKGROUND/Scene/BACKGROUND_Price-${overlayType}.png`;
  const label = overlayType === 'up' ? 'Price up' : 'Price down';

  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : label}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        <img
          src={overlayPath}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-medium truncate"
        style={{
          background: 'linear-gradient(transparent, var(--color-black-70))',
          color: overlayType === 'up' ? 'var(--color-success)' : 'var(--color-error)',
        }}
      >
        {label}
      </div>
    </TraitCardShell>
  );
});
```

**Step 7: Create `trait-cards/LayerWithBaseMouthCard.tsx`**

```tsx
/**
 * Composite card for Head, Mask, Eyes, Background — base + clothes + mouth under the trait.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import { DEFAULT_CLOTHES_PATH } from '@/config/layers';
import type { LayerImage } from '@/services/generatorService';

const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

export interface LayerWithBaseMouthCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
  /** When true, render the trait image behind the base (e.g. wings) */
  renderBehindBase?: boolean;
}

export const LayerWithBaseMouthCard = memo(function LayerWithBaseMouthCard({ image, isSelected, isDisabled, disabledReason, onClick, renderBehindBase }: LayerWithBaseMouthCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
    >
      <div
        className="relative w-full h-full overflow-hidden trait-card-image-bg"
      >
        {renderBehindBase && (
          <img
            src={image.path}
            alt={image.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
            onError={handleTraitImgError}
          />
        )}
        <img
          src={DEFAULT_BASE_PATH}
          alt="Base layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <img
          src={DEFAULT_CLOTHES_PATH}
          alt="Clothes layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <img
          src={DEFAULT_MOUTH_PATH}
          alt="Mouth layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        {!renderBehindBase && (
          <img
            src={image.path}
            alt={image.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
            onError={handleTraitImgError}
          />
        )}
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});
```

**Step 8: Create `trait-cards/ClothesImageCard.tsx`**

```tsx
/**
 * Clothes layer card — base + variable clothes + mouth composite.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { handleTraitImgError } from '@/utils/traitImgError';
import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';
import type { LayerImage } from '@/services/generatorService';

const DEFAULT_MOUTH_PATH = DEFAULT_MOUTHBASE_PATH;

interface ClothesImageCardProps {
  image: LayerImage;
  isSelected: boolean;
  isDisabled: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export const ClothesImageCard = memo(function ClothesImageCard({ image, isSelected, isDisabled, disabledReason, onClick }: ClothesImageCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
    >
      <div
        className="relative w-full h-full overflow-hidden trait-card-image-bg"
      >
        <img
          src={DEFAULT_BASE_PATH}
          alt="Base layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <img
          src={image.path}
          alt={image.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <img
          src={DEFAULT_MOUTH_PATH}
          alt="Mouth layer preview"
          className="absolute inset-0 w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
          onError={handleTraitImgError}
        />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{image.displayName}</span>
        </div>
      </div>
    </TraitCardShell>
  );
});
```

**Step 9: Create `trait-cards/G2TraitCard.tsx`**

```tsx
/**
 * G2 trait card — uses G2TraitCardPreview for fill/outline rendering.
 */

import { memo } from 'react';
import { TraitCardShell } from '../TraitCardShell';
import { G2TraitCardPreview } from '../G2TraitCardPreview';
import type { UnifiedTrait } from '@/services/generatorService';

/** Cyan glow for G2 trait cards when selected */
const G2_SELECTED_BOX_SHADOW = '0 0 20px rgba(0, 212, 255, 0.4), 0 4px 12px var(--color-black-30)';

export interface G2TraitCardProps {
  trait: UnifiedTrait;
  isSelected: boolean;
  isDisabled?: boolean;
  disabledReason?: string | null;
  onClick: () => void;
  needsClothesUnderlay?: boolean;
  isBeerHatUnderlayer?: boolean;
  livePreviewUrl?: string | null;
  hideCheckBadge?: boolean;
}

export const G2TraitCard = memo(function G2TraitCard({ trait, isSelected, isDisabled, disabledReason, onClick, needsClothesUnderlay, isBeerHatUnderlayer, livePreviewUrl, hideCheckBadge }: G2TraitCardProps) {
  return (
    <TraitCardShell
      isSelected={isSelected}
      isDisabled={!!isDisabled}
      disabledReason={disabledReason}
      onClick={onClick}
      title={isDisabled && disabledReason ? disabledReason : undefined}
      className="trait-card-hover"
      selectedBoxShadow={G2_SELECTED_BOX_SHADOW}
      hideCheckBadge={hideCheckBadge}
    >
      <div className="relative w-full h-full overflow-hidden trait-card-image-bg">
        <G2TraitCardPreview trait={trait} needsClothesUnderlay={needsClothesUnderlay} livePreviewUrl={livePreviewUrl} />
        <div className="trait-label-overlay">
          <span className="trait-label-text">{trait.name}</span>
        </div>
      </div>
      {isBeerHatUnderlayer && (
        <span
          className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ background: 'var(--color-cyan)', color: 'var(--color-bg)' }}
        >
          Under
        </span>
      )}
    </TraitCardShell>
  );
});
```

**Step 10: Create `trait-cards/index.ts` barrel export**

```typescript
export { TraitCardSkeleton } from './TraitCardSkeleton';
export { ImageCard } from './ImageCard';
export type { ImageCardProps } from './ImageCard';
export { BaseImageCard } from './BaseImageCard';
export type { BaseImageCardProps } from './BaseImageCard';
export { SolidColorBackgroundCard } from './SolidColorBackgroundCard';
export type { SolidColorBackgroundCardProps } from './SolidColorBackgroundCard';
export { PriceOverlayCard } from './PriceOverlayCard';
export type { PriceOverlayCardProps } from './PriceOverlayCard';
export { LayerWithBaseMouthCard } from './LayerWithBaseMouthCard';
export type { LayerWithBaseMouthCardProps } from './LayerWithBaseMouthCard';
export { ClothesImageCard } from './ClothesImageCard';
export { G2TraitCard } from './G2TraitCard';
export type { G2TraitCardProps } from './G2TraitCard';
```

**Step 11: Create `SortControls.tsx`**

Move the `SortControls` component and its props type from `TraitSelector.tsx` (lines 182-281) to a new file `src/components/generator/SortControls.tsx`:

```tsx
/**
 * Sort Controls — toolbar for trait grid sorting, clearing, and column toggle.
 */

import { Ban, Grid2X2, Grid3X3 } from 'lucide-react';
import type { TraitSortMode } from './TraitSelector';

export interface SortControlsProps {
  sortMode: TraitSortMode;
  onSortChange: (mode: TraitSortMode) => void;
  canClear?: boolean;
  isCleared?: boolean;
  onClear?: () => void;
  combatType?: string;
  combatTypeEmoji?: string;
  combatNature?: string;
  gridCols?: 2 | 3;
  onGridColsChange?: (cols: 2 | 3) => void;
}

export function SortControls({ sortMode, onSortChange, canClear, isCleared, onClear, combatType, combatTypeEmoji, combatNature, gridCols, onGridColsChange }: SortControlsProps) {
  const isAlpha = sortMode === 'az' || sortMode === 'za';

  const handleAlphaClick = () => {
    if (sortMode === 'az') {
      onSortChange('za');
    } else if (sortMode === 'za') {
      onSortChange('az');
    } else {
      onSortChange('az');
    }
  };

  return (
    <div className="trait-sort-bar" role="toolbar" aria-label="Trait controls">
      <button
        type="button"
        className={`trait-sort-clear ${isCleared ? 'trait-sort-clear--active' : ''} ${!canClear ? 'trait-sort-clear--disabled' : ''}`}
        onClick={canClear && onClear ? onClear : undefined}
        disabled={!canClear}
        aria-label="Clear selection"
        title={canClear ? 'Clear selection' : 'This layer is required'}
      >
        <Ban size={14} />
      </button>

      {combatType && (
        <div className="trait-sort-combat" aria-label={`Type: ${combatType}, Nature: ${combatNature || ''}`}>
          <span className="trait-sort-combat-emoji">{combatTypeEmoji}</span>
          <span className="trait-sort-combat-text">
            {combatType}{combatNature ? ` \u00B7 ${combatNature}` : ''}
          </span>
        </div>
      )}

      <div className="trait-sort-buttons">
        <button
          type="button"
          className={`trait-sort-btn ${sortMode === 'hot' ? 'trait-sort-btn--active' : ''}`}
          onClick={() => onSortChange('hot')}
          aria-label="Most used first"
          aria-pressed={sortMode === 'hot'}
          title="Most used first"
        >
          🔥
        </button>
        <button
          type="button"
          className={`trait-sort-btn ${sortMode === 'not' ? 'trait-sort-btn--active' : ''}`}
          onClick={() => onSortChange('not')}
          aria-label="Least used first"
          aria-pressed={sortMode === 'not'}
          title="Least used first"
        >
          💀
        </button>
        <button
          type="button"
          className={`trait-sort-btn trait-sort-btn--text ${isAlpha ? 'trait-sort-btn--active' : ''}`}
          onClick={handleAlphaClick}
          aria-label={sortMode === 'za' ? 'Z to A' : 'A to Z'}
          aria-pressed={isAlpha}
          title={sortMode === 'za' ? 'Z to A' : 'A to Z'}
        >
          {sortMode === 'za' ? 'Z→A' : 'A→Z'}
        </button>

        {onGridColsChange && (
          <button
            type="button"
            className="trait-sort-btn lg:hidden"
            onClick={() => onGridColsChange(gridCols === 2 ? 3 : 2)}
            aria-label={gridCols === 2 ? 'Switch to 3 columns' : 'Switch to 2 columns'}
            title={gridCols === 2 ? '3 columns' : '2 columns'}
          >
            {gridCols === 2 ? <Grid3X3 size={14} /> : <Grid2X2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 12: Update `TraitSelector.tsx` — replace inline components with imports**

In `src/components/generator/TraitSelector.tsx`:

1. Remove the component imports that are no longer needed directly (keep `TraitCardShell` as it's still used by the barrel components):
   - Remove: `import { Ban, Grid2X2, Grid3X3 } from 'lucide-react';`
   - Remove: `import { BASE_CLOTHES_MAP, DEFAULT_CLOTHES_PATH } from '@/config/layers';`
   - Remove: `import { DEFAULT_BASE_PATH, DEFAULT_MOUTHBASE_PATH } from '@/lib/layerRegistry';`
   - Keep: `import { handleTraitImgError } from '@/utils/traitImgError';` (if still used in main component)

2. Add imports from new files:
   ```tsx
   import { SortControls } from './SortControls';
   import {
     TraitCardSkeleton,
     ImageCard,
     BaseImageCard,
     SolidColorBackgroundCard,
     PriceOverlayCard,
     LayerWithBaseMouthCard,
     ClothesImageCard,
     G2TraitCard,
   } from './trait-cards';
   ```

3. Remove all the inline component definitions (lines 170-657):
   - `TraitCardSkeleton` (lines 170-180)
   - `SortControlsProps` interface and `SortControls` function (lines 182-281)
   - `ImageCardProps` interface and `ImageCard` component (lines 283-318)
   - `getClothesForBase` helper (lines 323-331)
   - `BaseImageCardProps` interface and `BaseImageCard` component (lines 333-387)
   - `ClothesImageCardProps` interface (lines 389-395)
   - `SolidColorBackgroundCardProps` interface and `SolidColorBackgroundCard` component (lines 397-428)
   - `PriceOverlayCardProps` interface and `PriceOverlayCard` component (lines 430-476)
   - `LayerWithBaseMouthCardProps` interface and `LayerWithBaseMouthCard` component (lines 478-557)
   - `ClothesImageCard` component (lines 559-605)
   - `G2TraitCardProps` interface, `G2_SELECTED_BOX_SHADOW` constant, and `G2TraitCard` component (lines 607-657)

4. Keep the `DEFAULT_MOUTH_PATH` constant (line 321) only if it's still used in the main TraitSelector. (It's not — remove it.)

5. Keep the re-export for `TraitSortMode` and `SortControlsProps` so `MouthLayerSelector.tsx` still imports from `TraitSelector`:
   ```tsx
   // Re-export for backwards compatibility with MouthLayerSelector imports
   export { SortControls } from './SortControls';
   export type { SortControlsProps } from './SortControls';
   export { G2TraitCard } from './trait-cards';
   export type { G2TraitCardProps } from './trait-cards';
   ```

**Step 13: Build check**

Run: `npm run build`
Expected: PASS — all imports resolve, all types match.

**Step 14: Run unit tests**

Run: `npm run test:unit`
Expected: PASS

**Step 15: Verify line count reduction**

Run: `wc -l src/components/generator/TraitSelector.tsx`
Expected: ~500 lines (down from 1,157)

**Step 16: Commit**

```bash
git add src/components/generator/trait-cards/ src/components/generator/SortControls.tsx src/components/generator/TraitSelector.tsx
git commit -m "refactor: split TraitSelector.tsx into trait-cards/ directory and SortControls

Extracted 8 card components (TraitCardSkeleton, ImageCard, BaseImageCard,
SolidColorBackgroundCard, PriceOverlayCard, LayerWithBaseMouthCard,
ClothesImageCard, G2TraitCard) and SortControls into their own files.
TraitSelector.tsx reduced from 1,157 to ~500 lines. No behavior changes."
```

---

### Task 6: Consolidate MouthLayerSelector internal duplication

Skip this task — after review, the `ImageCard` and `G2MouthCard` in `MouthLayerSelector.tsx` have different rendering logic (zoom transforms, mouth underlay, G2 fill/outline layers). Their structural overlap (motion.button, checkmark SVG) is already shared via `TraitCardShell` for the non-mouth cards. Extracting a `MouthCardShell` would add indirection without meaningful DRY benefit because the mouth zoom/composite logic is inherently different between G1 and G2.

**Decision:** Deferred. The components are ~100 lines each and the shared parts (button wrapper, checkmark) are small. This is not worth the complexity of a shared wrapper.

---

## Phase 3: CSS Cleanup

### Task 7: Remove unused animations from `animations.css`

12 `@keyframes` and 9 utility classes in `src/styles/animations.css` are dead code (~200 lines).

**Files:**
- Modify: `src/styles/animations.css`

**Step 1: Remove unused `@keyframes`**

Remove these keyframe blocks from `src/styles/animations.css`:

- `orbFloat` (lines 21-31)
- `orbFloat2` (lines 33-43)
- `pulseLoader` (lines 66-75)
- `pressDown` (lines 112-122)
- `floatSlow` (lines 342-349)
- `rotateSlow` (lines 360-367)
- `textGlow` (lines 311-318)
- `fadeOutUp` (lines 256-265)
- `fadeOutDown` (lines 267-276)
- `scaleOut` (lines 278-287)
- `slideInUp` (lines 225-232)
- `slideInDown` (lines 234-241)

**Step 2: Remove unused utility classes**

Remove these utility classes from `src/styles/animations.css`:

- `.animate-fade-in-down` (lines 585-587)
- `.animate-scale-in` (lines 589-591)
- `.animate-bounce` (lines 601-603)
- `.animate-float` (lines 605-607)
- `.animate-glow` (lines 609-611)
- `.animate-glow-gold` (lines 613-615)
- `.animate-shake` (lines 617-619)
- `.animate-wiggle` (lines 621-623)
- `.animate-fade-in-up` (lines 581-583)

Also remove the stagger-related classes that are only used with `.animate-fade-in-up` (verify first):

Run: `grep -rn 'stagger-item\|stagger-[1-8]' src/ --include='*.tsx' --include='*.ts' | grep -v animations.css | grep -v '.test.'`

If no results, also remove:
- `.stagger-1` through `.stagger-8` (lines 626-633)
- `.stagger-item` (lines 636-638)
- `.stagger-item.animate-fade-in-up` (lines 640-643)

**Step 3: Verify no broken references**

Run: `grep -rn 'orbFloat\|orbFloat2\|pulseLoader\|pressDown\|floatSlow\|rotateSlow\|textGlow\|fadeOutUp\|fadeOutDown\|scaleOut\|slideInUp\|slideInDown' src/ --include='*.tsx' --include='*.ts' --include='*.css' | grep -v animations.css`

Expected: No results (these were only defined, never used).

**Step 4: Build check**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/styles/animations.css
git commit -m "chore: remove 12 unused keyframes and 9 unused utility classes from animations.css

Dead code cleanup: orbFloat, orbFloat2, pulseLoader, pressDown, floatSlow,
rotateSlow, textGlow, fadeOutUp, fadeOutDown, scaleOut, slideInUp, slideInDown
keyframes and their corresponding utility classes were defined but never
referenced anywhere in the codebase."
```

---

## Phase 4: Polish

### Task 8: Build, test, and visually verify

Final verification that everything works together.

**Files:** None (verification only)

**Step 1: Run unit tests**

Run: `npm run test:unit`
Expected: All tests pass.

**Step 2: Run build**

Run: `npm run build`
Expected: No errors or warnings.

**Step 3: Visual verification — mobile**

Start dev server, navigate to `/generator`, resize to mobile (375x812).
Verify:
- Trait cards render with proper background (not transparent) — the CSS variable fix
- Tab switching works
- Trait grid shows cards with correct composites (base+clothes+mouth for Base tab, etc.)
- Sort controls work (hot/not/az/za)
- Action bar buttons work

**Step 4: Visual verification — desktop**

Resize to desktop (1280x800).
Verify:
- All card types render correctly
- G2 trait cards show preview
- Right panel (color picker, Beer Hat options) works
- Export and save work

**Step 5: Commit final state (if any fixes needed)**

Only commit if verification revealed issues that were fixed.

---

## Summary

| Task | Phase | What | Files |
|------|-------|------|-------|
| 1 | Critical | Define missing CSS variables | Generator.css |
| 2 | Critical | Fix manifest error handling | generatorService.ts |
| 3 | Critical | Replace hardcoded #ff9500 | Generator.css |
| 4 | Critical | Extract findUnifiedTraitByName | GeneratorContext.tsx |
| 5 | Organization | Split TraitSelector.tsx | 11 new files + TraitSelector.tsx |
| 6 | Organization | ~~MouthLayerSelector duplication~~ | SKIPPED (deferred) |
| 7 | CSS Cleanup | Remove unused animations | animations.css |
| 8 | Polish | Build, test, verify | None (verification) |
