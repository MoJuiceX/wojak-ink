# Generator Polish v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move inline visual styles to theme.css classes and eliminate CSS anti-patterns across ActionBar, MouthLayerSelector, DetailSelector, and Generator.css — zero visual changes.

**Architecture:** CSS-only refactor. Add new classes to `src/styles/theme.css`, then swap inline `style={{}}` objects for `className` strings in 3 TSX components. Also clean up `!important` rules and hardcoded hex values in Generator.css.

**Tech Stack:** React, TypeScript, Tailwind CSS (layout), theme.css (visuals), Vite

**Design doc:** `docs/plans/2026-03-07-generator-polish-v2-design.md`

---

## Task 1: Add ActionBar CSS classes to theme.css

**Files:**
- Modify: `src/styles/theme.css` (insert after line 829, after `.action-bar-mint-btn:disabled`)

**Step 1: Add the CSS classes**

Insert the following block after line 829 in theme.css:

```css
/* ── Action Bar — buttons, tooltip, dropdown, menu items ──── */

.action-bar-container {
  background: var(--color-black-30);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
}

.action-bar-tooltip {
  background: var(--color-black-90);
  border: 1px solid var(--color-border);
}

.action-btn {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid transparent;
  box-shadow: none;
  transition: all 0.3s ease;
}

.action-btn--active {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.25), var(--color-primary-10));
  color: white;
  border-color: rgba(249, 115, 22, 0.6);
  box-shadow: 0 0 20px var(--color-primary-30), inset 0 0 15px var(--color-primary-10);
}

.action-btn--disabled {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.action-btn--paused {
  background: var(--color-white-10);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.action-btn-badge {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 0 8px var(--color-primary-50);
}

.action-bar-dropdown {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px var(--color-black-40);
}

.action-menu-item {
  transition: background 0.15s ease;
}

.action-menu-item:hover {
  background: var(--color-white-5);
}

.action-menu-item-badge {
  background: var(--color-primary);
  color: white;
}
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes (CSS only, no TS changes yet).

**Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add ActionBar CSS classes to theme.css"
```

---

## Task 2: Refactor ActionBar.tsx to use CSS classes

**Files:**
- Modify: `src/components/generator/ActionBar.tsx`

**Step 1: Replace tooltip inline styles (lines 93-99)**

Change:
```tsx
            className="fixed px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-[400] -translate-x-1/2 text-secondary"
            style={{
              left: pos.x,
              bottom: typeof window !== 'undefined' ? window.innerHeight - pos.y + 8 : 0,
              background: 'var(--color-black-90)',
              border: '1px solid var(--color-border)',
            }}
```

To:
```tsx
            className="fixed px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-[400] -translate-x-1/2 text-secondary action-bar-tooltip"
            style={{
              left: pos.x,
              bottom: typeof window !== 'undefined' ? window.innerHeight - pos.y + 8 : 0,
            }}
```

**Step 2: Replace ActionButton component styles (lines 302-321)**

Change the `<motion.button>` in ActionButton from:
```tsx
    <motion.button
      className="relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.25), var(--color-primary-10))'
          : 'transparent',
        color: disabled
          ? 'var(--color-text-muted)'
          : isActive
            ? 'white'
            : 'var(--color-text-secondary)',
        opacity: disabled ? 0.5 : 1,
        border: isActive
          ? '1px solid rgba(249, 115, 22, 0.6)'
          : '1px solid transparent',
        boxShadow: isActive
          ? '0 0 20px var(--color-primary-30), inset 0 0 15px var(--color-primary-10)'
          : 'none',
        transition: 'all 0.3s ease',
      }}
```

To:
```tsx
    <motion.button
      className={`relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8 action-btn${isActive ? ' action-btn--active' : ''}${disabled ? ' action-btn--disabled' : ''}`}
```

**Step 3: Replace badge inline styles (lines 331-338)**

Change:
```tsx
          <span
            className="absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full"
            style={{
              background: '#F97316',
              color: 'white',
              boxShadow: '0 0 8px var(--color-primary-50)',
            }}
          >
```

To:
```tsx
          <span
            className="absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full action-btn-badge"
          >
```

**Step 4: Replace main bar container styles (lines 349-355)**

Change:
```tsx
      className={`flex items-center justify-between px-1 lg:px-2 py-1.5 rounded-none lg:rounded-2xl flex-nowrap w-full ${className}`}
      style={{
        background: 'var(--color-black-30)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
      }}
```

To:
```tsx
      className={`flex items-center justify-between px-1 lg:px-2 py-1.5 rounded-none lg:rounded-2xl flex-nowrap w-full action-bar-container ${className}`}
```

**Step 5: Replace randomize button inline styles (lines 362-366)**

Change:
```tsx
          className="relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8"
          style={{
            background: 'transparent',
            border: 'none',
            transition: 'all 0.3s ease',
          }}
```

To:
```tsx
          className="relative flex items-center justify-center rounded-lg shrink-0 w-8 h-8 bg-transparent border-none transition-all duration-300"
```

**Step 6: Replace separator inline style (line 406-407)**

Change:
```tsx
        <div
          className="h-6 w-px shrink-0 mx-0.5"
          style={{ background: 'var(--color-border)' }}
        />
```

To:
```tsx
        <div className="h-6 w-px shrink-0 mx-0.5 bg-[var(--color-border)]" />
```

**Step 7: Replace dropdown inline styles (lines 487-492)**

Change:
```tsx
              className={`absolute ${isDesktop ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 z-50 rounded-xl overflow-hidden py-1 whitespace-nowrap`}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 32px var(--color-black-40)',
              }}
```

To:
```tsx
              className={`absolute ${isDesktop ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 z-50 rounded-xl overflow-hidden py-1 whitespace-nowrap action-bar-dropdown`}
```

**Step 8: Remove onMouseEnter/onMouseLeave handlers and add action-menu-item class**

There are 4 menu item buttons (lines ~496, ~521, ~544, ~560). Each has:
```tsx
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-white-5)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
```

For each one, **remove both handlers** and add `action-menu-item` to the className. Example for the first (Save button, ~line 496-498):

Change:
```tsx
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-primary"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-white-5)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
```

To:
```tsx
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary action-menu-item"
```

Repeat for all 4 menu buttons (Save, Free Mints, Prices, Metadata toggle). Remove `transition-colors` from className too since `.action-menu-item` handles the transition.

**Step 9: Replace menu badge inline styles (lines ~510-513, ~534-537)**

Change (appears twice):
```tsx
                    <span
                      className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--color-primary)', color: 'white' }}
                    >
```

To:
```tsx
                    <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full action-menu-item-badge">
```

**Step 10: Replace metadata toggle icon inline style (line 570)**

Change:
```tsx
                  <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700 }}>{'{ }'}</span>
```

To:
```tsx
                  <span className="font-mono text-sm font-bold">{'{ }'}</span>
```

**Step 11: Replace mint section border inline style (line 585)**

Change:
```tsx
        style={{ borderLeft: '1px solid var(--color-border)' }}
```

To (add to className):
```tsx
        className="flex items-center gap-1 lg:gap-3 pl-1 lg:pl-2 ml-0.5 lg:ml-1 border-l border-[var(--color-border)]"
```

And remove the `style` prop entirely.

**Step 12: Replace paused button inline styles (lines 628-632)**

Change:
```tsx
              className="px-4 py-1.5 rounded-lg text-sm font-semibold"
              style={{
                background: 'var(--color-white-10)',
                color: 'var(--color-text-muted)',
                cursor: 'not-allowed',
              }}
```

To:
```tsx
              className="px-4 py-1.5 rounded-lg text-sm font-semibold action-btn--paused"
```

**Step 13: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes, zero errors.

**Step 14: Commit**

```bash
git add src/components/generator/ActionBar.tsx
git commit -m "refactor: replace ActionBar inline styles with theme.css classes"
```

---

## Task 3: Add MouthLayerSelector and DetailSelector CSS classes to theme.css

**Files:**
- Modify: `src/styles/theme.css` (insert after the ActionBar classes added in Task 1)

**Step 1: Add the CSS classes**

Append after the action bar classes block:

```css
/* ── Mouth Trait Cards — shared between ImageCard and G2MouthCard ──── */

.mouth-trait-card {
  background: var(--generator-trait-card-bg);
  border: 1px solid var(--generator-trait-card-border);
  box-shadow: 0 2px 8px var(--color-black-20);
  transition: all 0.3s ease;
}

.mouth-trait-card--selected {
  border: 2px solid var(--generator-selected-color);
  box-shadow: 0 0 20px var(--generator-selected-glow, var(--color-primary-50)), 0 4px 12px var(--color-black-30);
}

.mouth-trait-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trait-card-badge {
  background: var(--generator-badge-color);
  color: white;
}

.trait-card-checkmark {
  background: var(--generator-badge-color);
}

.trait-card-disabled-badge {
  background: var(--color-black-70);
  border: 1px solid var(--color-border);
}

.trait-card-skeleton {
  background: var(--color-border);
  border: 1px solid var(--color-border);
}

.generator-notice-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* ── Detail Selector — option thumbnails for G2 trait variants ──── */

.detail-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 56px);
  gap: 10px;
  justify-content: center;
}

.detail-option {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: none;
}

.detail-option--selected {
  border: 2px solid var(--color-primary);
  box-shadow: 0 0 12px var(--glow-primary);
}

.detail-option--selected .lucide-ban {
  color: var(--color-primary);
}

.detail-option-checkmark {
  background: var(--color-primary);
}
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes.

**Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add MouthLayerSelector and DetailSelector CSS classes to theme.css"
```

---

## Task 4: Refactor MouthLayerSelector.tsx to use CSS classes

**Files:**
- Modify: `src/components/generator/MouthLayerSelector.tsx`

**Step 1: Replace TraitCardSkeleton inline styles (lines 38-42)**

Change:
```tsx
    <div
      className="aspect-square rounded-xl overflow-hidden animate-pulse"
      style={{
        background: 'var(--color-border)',
        border: '1px solid var(--color-border)',
      }}
    />
```

To:
```tsx
    <div className="aspect-square rounded-xl overflow-hidden animate-pulse trait-card-skeleton" />
```

**Step 2: Replace ImageCard button styles (lines 67-79)**

Change:
```tsx
    <motion.button
      className="w-full aspect-square relative rounded-xl overflow-hidden p-1"
      style={{
        background: 'var(--generator-trait-card-bg)',
        border: isSelected
          ? '2px solid var(--generator-selected-color, #F97316)'
          : '1px solid var(--generator-trait-card-border)',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isSelected
          ? '0 0 20px var(--generator-selected-glow, var(--color-primary-50)), 0 4px 12px var(--color-black-30)'
          : '0 2px 8px var(--color-black-20)',
        transition: 'all 0.3s ease',
      }}
```

To:
```tsx
    <motion.button
      className={`w-full aspect-square relative rounded-xl overflow-hidden p-1 mouth-trait-card${isSelected ? ' mouth-trait-card--selected' : ''}${isDisabled ? ' mouth-trait-card--disabled' : ''}`}
```

**Step 3: Replace ImageCard badge styles (lines 89-93)**

Change:
```tsx
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10 text-xs font-bold"
          style={{
            background: 'var(--generator-badge-color, #F97316)',
            color: 'white',
          }}
```

To:
```tsx
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10 text-xs font-bold trait-card-badge"
```

**Step 4: Replace ImageCard disabled info badge styles (lines 155-156)**

Change:
```tsx
          style={{ background: 'var(--color-black-70)', border: '1px solid var(--color-border)' }}
```

To (add to className, remove style prop):
```tsx
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20 trait-card-disabled-badge"
```

**Step 5: Replace ImageCard checkmark styles (line 168)**

Change:
```tsx
          style={{ background: 'var(--generator-badge-color, #F97316)' }}
```

To (add to className, remove style prop):
```tsx
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20 trait-card-checkmark"
```

**Step 6: Replace G2MouthCard button styles (lines 256-268)**

Same change as Step 2. Change:
```tsx
    <motion.button
      className="w-full aspect-square relative rounded-xl overflow-hidden p-1"
      style={{
        background: 'var(--generator-trait-card-bg)',
        border: isSelected
          ? '2px solid var(--generator-selected-color, #F97316)'
          : '1px solid var(--generator-trait-card-border)',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isSelected
          ? '0 0 20px var(--generator-selected-glow, var(--color-primary-50)), 0 4px 12px var(--color-black-30)'
          : '0 2px 8px var(--color-black-20)',
        transition: 'all 0.3s ease',
      }}
```

To:
```tsx
    <motion.button
      className={`w-full aspect-square relative rounded-xl overflow-hidden p-1 mouth-trait-card${isSelected ? ' mouth-trait-card--selected' : ''}${isDisabled ? ' mouth-trait-card--disabled' : ''}`}
```

**Step 7: Replace G2MouthCard checkmark styles (line 337)**

Change:
```tsx
          style={{ background: 'var(--generator-badge-color, #F97316)' }}
```

To (add to className, remove style prop):
```tsx
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20 trait-card-checkmark"
```

**Step 8: Replace G2MouthCard disabled info badge styles (line 350)**

Change:
```tsx
          style={{ background: 'var(--color-black-70)', border: '1px solid var(--color-border)' }}
```

To (add to className, remove style prop):
```tsx
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-20 trait-card-disabled-badge"
```

**Step 9: Replace blocked notice styles (lines 530-533)**

Change:
```tsx
          className="p-4 rounded-xl text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
```

To:
```tsx
          className="p-4 rounded-xl text-center generator-notice-card"
```

**Step 10: Replace empty state notice styles (lines 656-660)**

Change:
```tsx
          className="p-8 rounded-xl text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
```

To:
```tsx
          className="p-8 rounded-xl text-center generator-notice-card"
```

**Step 11: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes, zero errors.

**Step 12: Commit**

```bash
git add src/components/generator/MouthLayerSelector.tsx
git commit -m "refactor: replace MouthLayerSelector inline styles with theme.css classes"
```

---

## Task 5: Refactor DetailSelector.tsx to use CSS classes

**Files:**
- Modify: `src/components/generator/DetailSelector.tsx`

**Step 1: Replace grid inline styles (line 71)**

Change:
```tsx
      <div className="detail-selector-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 56px)', gap: 10, justifyContent: 'center' }}>
```

To:
```tsx
      <div className="detail-selector-grid">
```

**Step 2: Replace None button inline styles (lines 75-84)**

Change:
```tsx
        <motion.button
          className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: 'var(--color-surface)',
            border: !selectedOption
              ? '2px solid var(--color-primary, #ff6b00)'
              : '1px solid var(--color-border)',
            boxShadow: !selectedOption
              ? '0 0 12px var(--glow-primary, rgba(255,107,0,0.4))'
              : 'none',
          }}
```

To:
```tsx
        <motion.button
          className={`w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center detail-option${!selectedOption ? ' detail-option--selected' : ''}`}
```

**Step 3: Replace Ban icon inline color (line 91-93)**

Change:
```tsx
          <Ban
            size={20}
            style={{ color: !selectedOption ? 'var(--color-primary, #ff6b00)' : 'var(--color-text-muted)' }}
          />
```

To:
```tsx
          <Ban
            size={20}
            className={!selectedOption ? '' : 'text-muted'}
          />
```

The `.detail-option--selected .lucide-ban` CSS rule handles the selected color. For the non-selected state, `text-muted` applies.

**Step 4: Replace detail option button inline styles (lines 104-113)**

Change:
```tsx
            <motion.button
              key={opt.file}
              className="w-14 h-14 rounded-lg overflow-hidden relative"
              style={{
                background: 'var(--color-surface)',
                border: isSelected
                  ? '2px solid var(--color-primary, #ff6b00)'
                  : '1px solid var(--color-border)',
                boxShadow: isSelected
                  ? '0 0 12px var(--glow-primary, rgba(255,107,0,0.4))'
                  : 'none',
              }}
```

To:
```tsx
            <motion.button
              key={opt.file}
              className={`w-14 h-14 rounded-lg overflow-hidden relative detail-option${isSelected ? ' detail-option--selected' : ''}`}
```

**Step 5: Replace checkmark inline style (line 158-159)**

Change:
```tsx
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-primary, #ff6b00)' }}
```

To:
```tsx
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center detail-option-checkmark"
```

**Step 6: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes, zero errors.

**Step 7: Commit**

```bash
git add src/components/generator/DetailSelector.tsx
git commit -m "refactor: replace DetailSelector inline styles with theme.css classes"
```

---

## Task 6: Clean up Generator.css — remove !important and hardcoded hex

**Files:**
- Modify: `src/pages/Generator.css`

**Step 1: Remove !important from trait card backgrounds (lines 348, 356, 363, 370)**

In each of these 4 lines, remove ` !important` from the end of the background property value.

Line 348 — change:
```css
    linear-gradient(180deg, #1f1f24 0%, #1a1a1f 50%, #16161a 100%) !important;
```
To:
```css
    linear-gradient(180deg, #1f1f24 0%, #1a1a1f 50%, #16161a 100%);
```

Line 356 — change:
```css
    linear-gradient(45deg, #e9ecef 0%, #f0f2f5 40%, #f5f7f9 70%, #fafbfc 100%) !important;
```
To:
```css
    linear-gradient(45deg, #e9ecef 0%, #f0f2f5 40%, #f5f7f9 70%, #fafbfc 100%);
```

Line 363 — change:
```css
    linear-gradient(180deg, #221f1c 0%, #1c1a18 50%, #181614 100%) !important;
```
To:
```css
    linear-gradient(180deg, #221f1c 0%, #1c1a18 50%, #181614 100%);
```

Line 370 — change:
```css
    linear-gradient(180deg, #1c221f 0%, #181c1a 50%, #141816 100%) !important;
```
To:
```css
    linear-gradient(180deg, #1c221f 0%, #181c1a 50%, #141816 100%);
```

**Step 2: Replace hardcoded hex on lines 410 and 442**

Line 410 — change:
```css
  border-color: #F97316;
```
To:
```css
  border-color: var(--generator-selected-color);
```

Line 442 — change:
```css
  background: #F97316;
```
To:
```css
  background: var(--generator-selected-color);
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes.

**Step 4: Verify no remaining violations**

Run: `grep -n '!important' src/pages/Generator.css`
Expected: Only lines 129-131 (aspect-ratio/height/flex layout overrides) and 800-801 (prefers-reduced-motion) should remain.

Run: `grep -n '#F97316\|#ff6b00' src/pages/Generator.css`
Expected: Only lines 375 and 377 (CSS variable definitions themselves).

**Step 5: Commit**

```bash
git add src/pages/Generator.css
git commit -m "fix: remove !important rules and hardcoded hex colors from Generator.css"
```

---

## Task 7: Final verification and deploy

**Step 1: Full build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build passes, zero errors.

**Step 2: Visual verification on dev server**

Start dev server and verify on both desktop and mobile viewports:
1. Generator loads, all tabs work
2. ActionBar buttons have correct hover/active states
3. Overflow menu items highlight on hover (now via CSS)
4. Mouth trait cards show correct selected/disabled states
5. Detail selector options show correct selected glow
6. Mint button still glows orange

**Step 3: Deploy to production**

```bash
npx wrangler pages deploy dist --project-name=wojak-ink --branch=main
```

**Step 4: Commit deploy verification**

No additional commit needed — all changes are already committed in Tasks 1-6.

---

## Summary

| Task | Files | Commits | What |
|------|-------|---------|------|
| 1 | theme.css | 1 | Add ActionBar CSS classes |
| 2 | ActionBar.tsx | 1 | Swap inline styles for CSS classes |
| 3 | theme.css | 1 | Add MouthLayerSelector + DetailSelector CSS classes |
| 4 | MouthLayerSelector.tsx | 1 | Swap inline styles for CSS classes |
| 5 | DetailSelector.tsx | 1 | Swap inline styles for CSS classes |
| 6 | Generator.css | 1 | Remove !important, replace hardcoded hex |
| 7 | — | 0 | Build, verify, deploy |
| **Total** | **4 files** | **6 commits** | — |
