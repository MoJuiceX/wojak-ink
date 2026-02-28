# Generator Polish Pass — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 visual inconsistencies between desktop and mobile generator layouts in a single polish pass.

**Architecture:** CSS and TSX changes only — no new components, no new dependencies, no API changes. Each task modifies 1-3 files. Tasks are independent and can be verified in isolation.

**Tech Stack:** React, TypeScript, Tailwind CSS (layout), theme.css (visuals), Vite

---

### Task 1: Flip Mobile Layout Order

**Context:** Desktop shows Categories→Preview→Actions (top to bottom). Mobile reverses this for no reason. Both should match.

**Files:**
- Modify: `src/pages/Generator.tsx` (lines 82-117)

**Step 1: Swap the mobile conditional blocks**

In `GeneratorContent()`, the `generator-preview` div has 4 conditional blocks. Swap the two `!isDesktop` blocks:

Current order (lines 82-117):
```tsx
{/* Mobile: Action Bar on top */}
{!isDesktop && (
  <div className="generator-actions">
    <ActionBar />
  </div>
)}

{/* Desktop: Category Tabs on top */}
{isDesktop && (
  <div className="generator-categories">
    <LayerTabs />
  </div>
)}

{/* Preview Canvas */}
<div className="generator-preview-canvas-wrapper">
  <PreviewWithControls className="w-full" />
</div>

{/* Desktop: Action Bar on bottom */}
{isDesktop && (
  <div className="generator-actions">
    <ActionBar ... />
  </div>
)}

{/* Mobile: Category Tabs on bottom */}
{!isDesktop && (
  <div className="generator-categories">
    <LayerTabs />
  </div>
)}
```

Change to:
```tsx
{/* Category Tabs on top (both desktop and mobile) */}
<div className="generator-categories">
  <LayerTabs />
</div>

{/* Preview Canvas */}
<div className="generator-preview-canvas-wrapper">
  <PreviewWithControls className="w-full" />
</div>

{/* Action Bar on bottom (both desktop and mobile) */}
<div className="generator-actions">
  <ActionBar
    {...(isDesktop ? {
      rightPanelMode,
      onToggleRightPanel: () => setRightPanelMode((m) => m === 'colors' ? 'metadata' : 'colors'),
    } : {})}
  />
</div>
```

Note: This simplifies the code — categories and actions are no longer conditional on `isDesktop`. They always render in the same order. The `rightPanelMode`/`onToggleRightPanel` props are only passed on desktop (the overflow menu "Metadata" option is desktop-only).

**Step 2: Verify**

Run: `npm run build`
Expected: Build passes. Desktop and mobile both show categories-top, actions-bottom.

**Step 3: Commit**

```bash
git add src/pages/Generator.tsx
git commit -m "fix: match mobile layout order to desktop (categories top, actions bottom)"
```

---

### Task 2: Fix Tab Bar Black Corners

**Context:** `.generator-categories` has `background: var(--color-bg)` (#0a0a0f). The tab bar inside has `rounded-2xl` with semi-transparent background. Parent's dark bg shows at rounded corners.

**Files:**
- Modify: `src/pages/Generator.css` (line 193)

**Step 1: Change background to transparent**

In `.generator-categories` (around line 188-194), change:
```css
background: var(--color-bg);
```
to:
```css
background: transparent;
```

**Step 2: Also update mobile `.generator-categories`**

Check the mobile media query (around line 197-201). If it also sets a background, change it to transparent too.

**Step 3: Verify**

Run: `npm run build`
Expected: No black corners visible around tab bar edges.

**Step 4: Commit**

```bash
git add src/pages/Generator.css
git commit -m "fix: remove dark background from tab bar parent (fixes black corners)"
```

---

### Task 3: Standardize Icon Sizes to 18px

**Context:** Action bar icons range 16-22px. Category tabs have conflicting Tailwind (16/20px) and CSS (18px). Standardize everything to 18px.

**Files:**
- Modify: `src/components/generator/ActionBar.tsx`
- Modify: `src/components/generator/LayerTabs.tsx`

**Step 1: Fix ActionBar icon sizes**

In `ActionBar.tsx`, find every `size={NUMBER}` prop on Lucide icons and change to `size={18}`:

| Line area | Current | Change to |
|-----------|---------|-----------|
| Undo2 | `size={16}` | `size={18}` |
| Redo2 | `size={16}` | `size={18}` |
| Heart | `size={20}` | `size={18}` |
| Download | `size={22}` | `size={18}` |
| MoreHorizontal | `size={20}` | `size={18}` |
| Wallet | `size={22}` | `size={18}` |
| Sparkles (mint) | `size={22}` | `size={18}` |
| Sparkles (toggle) | `size={18}` | Already 18 ✓ |
| Coins (toggle) | `size={18}` | Already 18 ✓ |

Icons in the overflow MENU (Trophy, Tag, Info) stay at `size={16}` — they're in a dropdown, not the bar.

**Step 2: Fix LayerTabs icon classes**

In `LayerTabs.tsx` line 73, the Icon has:
```tsx
<Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
```

Remove the width/height classes since `.generator-category-tab svg` in Generator.css already sets 18px:
```tsx
<Icon strokeWidth={2} />
```

The CSS rule `.generator-category-tab svg { width: 18px; height: 18px; }` (Generator.css line 411-414) handles sizing.

**Step 3: Verify**

Run: `npm run build`
Expected: All icons in both bars render at 18px.

**Step 4: Commit**

```bash
git add src/components/generator/ActionBar.tsx src/components/generator/LayerTabs.tsx
git commit -m "fix: standardize all generator bar icons to 18px"
```

---

### Task 4: Add Type/Nature to Sort Bar

**Context:** Combat type/nature only shows in desktop right panel. Mobile users never see it. Sort bar has empty center space between clear button and sort buttons.

**Files:**
- Modify: `src/components/generator/TraitSelector.tsx` (SortControls component)
- Modify: `src/components/generator/GeneratorRightPanel.tsx` (remove CombatPreview)
- Modify: `src/styles/theme.css` (add compact combat type styles)

**Step 1: Add combat type display to SortControls**

In `TraitSelector.tsx`, update `SortControlsProps` to accept combat identity:
```tsx
export interface SortControlsProps {
  sortMode: TraitSortMode;
  onSortChange: (mode: TraitSortMode) => void;
  canClear?: boolean;
  isCleared?: boolean;
  onClear?: () => void;
  combatType?: string;      // e.g. "Electric"
  combatTypeEmoji?: string;  // e.g. "⚡"
  combatNature?: string;     // e.g. "Bold"
}
```

In the `SortControls` JSX, add between the clear button and the sort buttons div:
```tsx
{/* Combat type — center */}
{combatType && (
  <div className="trait-sort-combat" aria-label={`Type: ${combatType}, Nature: ${combatNature || ''}`}>
    <span className="trait-sort-combat-emoji">{combatTypeEmoji}</span>
    <span className="trait-sort-combat-text">
      {combatType}{combatNature ? ` · ${combatNature}` : ''}
    </span>
  </div>
)}
```

**Step 2: Compute combat identity in TraitSelector**

In `TraitSelector.tsx`, at the component level (where SortControls is rendered), import and compute the identity:

```tsx
import { calculateCombatIdentity } from '@/lib/combat/identity-calculator';
import type { CombatType } from '@/lib/combat/types';
```

Add the TYPE_EMOJI and TYPE_NAME maps (copy from CombatPreview.tsx) or import them if they're exported.

In the main TraitSelector component, add a `useMemo`:
```tsx
const combatIdentity = useMemo(() => {
  // Same logic as CombatPreview.tsx — build trait list from selections
  const traits: { traitId: string; layer: string }[] = [];
  const colors: Record<string, string> = {};
  const details: Record<string, string> = {};
  let logoOption: string | undefined;

  if (g2Selections) {
    for (const [layer, sel] of Object.entries(g2Selections)) {
      if (!sel?.traitId) continue;
      traits.push({ traitId: sel.traitId, layer });
      if (sel.colors) {
        for (const hex of Object.values(sel.colors)) {
          if (hex) colors[sel.traitId] = hex;
        }
      }
      if (sel.options.detail) details[sel.traitId] = sel.options.detail as string;
      if (sel.options.logo) logoOption = sel.options.logo as string;
    }
  }

  if (selectedLayers) {
    for (const [layer, path] of Object.entries(selectedLayers)) {
      if (!path || typeof path !== 'string' || path === '__solid__') continue;
      const parts = path.split('/');
      if (parts.length >= 2) {
        const filename = parts[parts.length - 1].replace(/\.[^.]+$/, '');
        const layerFolder = parts[parts.length - 2];
        const traitId = `${layerFolder}_${filename}`;
        if (!traits.some(t => t.layer === layer)) {
          traits.push({ traitId, layer });
          const layerColor = (selectedColors as Record<string, string | undefined>)?.[layer];
          if (layerColor) colors[traitId] = layerColor;
        }
      }
    }
  }

  if (traits.length === 0) return null;
  try {
    return calculateCombatIdentity({ traits, colors, details, logoOption });
  } catch {
    return null;
  }
}, [selectedLayers, selectedColors, g2Selections]);
```

Then pass to SortControls:
```tsx
<SortControls
  sortMode={sortMode}
  onSortChange={setSortMode}
  canClear={canDeselect}
  isCleared={isSelectionPathEmpty(selectedPath) && ...}
  onClear={handleClearSelection}
  combatType={combatIdentity ? TYPE_NAME[combatIdentity.type] : undefined}
  combatTypeEmoji={combatIdentity ? TYPE_EMOJI[combatIdentity.type] : undefined}
  combatNature={combatIdentity?.nature}
/>
```

**Step 3: Add CSS for compact combat type display**

In `src/styles/theme.css`, add after the sort bar styles:
```css
/* Combat type display — compact inline in sort bar */
.trait-sort-combat {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  min-width: 0;
  overflow: hidden;
}

.trait-sort-combat-emoji {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.trait-sort-combat-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
}
```

**Step 4: Remove CombatPreview from GeneratorRightPanel**

In `GeneratorRightPanel.tsx`:
- Remove the import: `import { CombatPreview } from './CombatPreview';`
- Remove the render: `<CombatPreview />` (around line 209)
- Keep `CombatPreview.tsx` file — it exports the type maps that TraitSelector now uses, OR move the maps to a shared location.

Actually, better approach: export `TYPE_EMOJI` and `TYPE_NAME` from `CombatPreview.tsx` and import them in TraitSelector. Don't duplicate.

**Step 5: Verify**

Run: `npm run build`
Expected: Sort bar shows type/nature on both desktop and mobile. Right panel no longer shows CombatPreview. Build passes.

**Step 6: Commit**

```bash
git add src/components/generator/TraitSelector.tsx src/components/generator/GeneratorRightPanel.tsx src/styles/theme.css src/components/generator/CombatPreview.tsx
git commit -m "feat: show combat type/nature in sort bar (visible on all viewports)"
```

---

### Task 5: Unify Action Bar Button Sizes

**Context:** Secondary buttons are w-8 h-8 (32px), primary buttons are w-9 h-9 (36px). Should all be 32px.

**Files:**
- Modify: `src/components/generator/ActionBar.tsx`

**Step 1: Remove the variant-based sizing**

In the `ActionButton` component (around line 283-346), find:
```tsx
className={`relative flex items-center justify-center rounded-lg shrink-0 ${variant === 'primary' ? 'w-9 h-9' : 'w-8 h-8'}`}
```

Change to:
```tsx
className="relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8"
```

The `variant` prop still controls the color styling (through the `style` block), just not size.

**Step 2: Verify**

Run: `npm run build`
Expected: All action buttons are 32×32px. Primary buttons still have distinct color treatment.

**Step 3: Commit**

```bash
git add src/components/generator/ActionBar.tsx
git commit -m "fix: unify action bar button sizes to 32px"
```

---

### Task 6: Standardize Bar Padding, Background & Blur

**Context:** Three frosted glass bars (tab bar, action bar, sort bar) have inconsistent blur, background, and padding values.

**Files:**
- Modify: `src/styles/theme.css` (sort bar section, tab bar section)
- Modify: `src/components/generator/LayerTabs.tsx` (tab bar padding)
- Modify: `src/components/generator/ActionBar.tsx` (blur value)

**Step 1: Standardize sort bar background and border**

In `src/styles/theme.css`, find `.trait-sort-bar` (around line 615):

Change:
```css
background: rgba(255, 255, 255, 0.04);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.06);
```
to:
```css
background: var(--color-black-30);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid var(--color-border);
```

**Step 2: Update tab bar blur to 12px**

In `src/styles/theme.css`, find `.generator-layer-tab-bar` (around line 738):

Change:
```css
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
```
to:
```css
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

**Step 3: Update action bar blur to 12px**

In `src/components/generator/ActionBar.tsx`, find the container style (around line 352-353):

Change:
```tsx
backdropFilter: 'blur(10px)',
WebkitBackdropFilter: 'blur(10px)',
```
to:
```tsx
backdropFilter: 'blur(12px)',
WebkitBackdropFilter: 'blur(12px)',
```

**Step 4: Standardize tab bar padding**

In `src/components/generator/LayerTabs.tsx` line 112, change `p-2` to `px-2 py-1.5`:
```tsx
className={`generator-layer-tab-bar flex justify-between px-2 py-1.5 rounded-2xl overflow-x-auto w-full ${className}`}
```

**Step 5: Verify**

Run: `npm run build`
Expected: All three bars have matching blur (12px), background (--color-black-30), border (--color-border), and vertical padding.

**Step 6: Commit**

```bash
git add src/styles/theme.css src/components/generator/LayerTabs.tsx src/components/generator/ActionBar.tsx
git commit -m "fix: standardize blur, background, and padding across all generator bars"
```

---

### Task 7: Fix Breakpoint Mismatch in LayerTabs

**Context:** LayerTabs uses Tailwind `sm:` (640px) for responsive changes, but Generator page uses 1024px as the mobile breakpoint. On tablets (640-1023px), tabs get "desktop" sizing in a "mobile" layout.

**Files:**
- Modify: `src/components/generator/LayerTabs.tsx`

**Step 1: Replace sm: with lg: prefix**

In the `LayerTab` component (line 62), change:
```tsx
className={`generator-layer-tab relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 sm:flex-none sm:px-3 sm:py-2 sm:gap-1 sm:min-w-[60px]${isActive ? ...}`}
```
to:
```tsx
className={`generator-layer-tab relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 lg:flex-none lg:px-3 lg:py-2 lg:gap-1 lg:min-w-[60px]${isActive ? ...}`}
```

This ensures tab styling switches at 1024px (Tailwind `lg:` breakpoint), matching the Generator page's media queries.

**Step 2: Fix lock icon responsive class**

Line 76-78, change:
```tsx
className="absolute -top-1 -right-1 sm:w-2.5 sm:h-2.5 text-muted"
```
to:
```tsx
className="absolute -top-1 -right-1 lg:w-2.5 lg:h-2.5 text-muted"
```

**Step 3: Fix tab label font size**

Line 86, change:
```tsx
<span className="text-[10px] sm:text-xs font-medium">{config.label}</span>
```
to:
```tsx
<span className="text-[10px] lg:text-xs font-medium">{config.label}</span>
```

**Step 4: Verify**

Run: `npm run build`
Expected: On viewports 640-1023px, tabs now use mobile styling (smaller, flex-1) instead of desktop styling.

**Step 5: Commit**

```bash
git add src/components/generator/LayerTabs.tsx
git commit -m "fix: align LayerTabs breakpoint with Generator page (1024px, not 640px)"
```

---

### Task 8: Fix Z-Index Scale

**Context:** ActionBarTooltip uses `z-[9999]`, way outside the theme's z-index scale (--z-tooltip: 400).

**Files:**
- Modify: `src/components/generator/ActionBar.tsx` (line 93)

**Step 1: Fix tooltip z-index**

Find in ActionBarTooltip (around line 93):
```tsx
className="fixed px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-[9999] ..."
```

Change `z-[9999]` to `z-[400]`:
```tsx
className="fixed px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-[400] ..."
```

**Step 2: Verify**

Run: `npm run build`
Expected: Tooltips still render above other content (400 > any generator z-index). No visual change.

**Step 3: Commit**

```bash
git add src/components/generator/ActionBar.tsx
git commit -m "fix: use proper z-index scale for ActionBar tooltips (400, not 9999)"
```

---

## Final Verification

After all 8 tasks:

1. `npm run build` passes
2. `npm run test` passes (all 4051+ tests)
3. Desktop: categories top, actions bottom, 18px icons, no black tab corners
4. Mobile: same order as desktop, type/nature in sort bar, consistent bars
5. Tablet (640-1023px): tabs use mobile styling, correct breakpoint
6. Deploy to production

## Execution Order

Tasks are independent. Execute sequentially: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
Task 4 (combat type in sort bar) is the most complex. Others are quick fixes.
