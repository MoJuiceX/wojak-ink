# CLEANUP ACTION PLAN - Detailed Implementation Guide

**Based on:** COMPREHENSIVE-CLEANUP-AUDIT.md
**Status:** Ready for Implementation
**Estimated Time:** 4-6 hours total

---

## PHASE A: QUICK WINS (1-2 hours)

These are safe, low-risk changes with immediate payoff.

### A.1 Delete Unused Theme Components

**Status:** Exported but never imported anywhere

```bash
# Step 1: Verify they're not used
grep -r "GlowContainer\|GlassCard" src/ --include="*.tsx" --include="*.ts" | grep -v "src/components/theme"

# Step 2: Delete the files
rm -f src/components/theme/GlowContainer.tsx
rm -f src/components/theme/GlassCard.tsx

# Step 3: Update barrel export
# File: src/components/theme/index.ts
```

**Edit File:** `/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/components/theme/index.ts`

**Before:**
```typescript
export { GlowContainer } from './GlowContainer';
export { GlassCard } from './GlassCard';
```

**After:**
```typescript
/* Theme components removed - use .card and .card-elevated classes instead */
```

---

### A.2 Delete 9 Empty Directories

```bash
cd /sessions/optimistic-stoic-bell/mnt/wojak-ink

# Verify they're empty
ls -la src/components/features/
ls -la src/components/media/shared/

# Delete all empty directories
rmdir src/components/features
rmdir src/components/media/shared
rmdir src/games/WojakRunner/components
rmdir src/games/OrangePong/components
rmdir src/games/OrangeJuggle/components
rmdir src/games/Orange2048/components
rmdir src/games/MemoryMatch/components
rmdir src/games/ColorReaction/components
rmdir src/games/KnifeGame/components

# Verify
find src -type d -empty
```

---

### A.3 Fix voting.css !important Declarations

**File:** `src/styles/voting.css`
**Lines:** 34, 39

**Before:**
```css
cursor: crosshair !important;
```

**After:**
```css
/* Increased specificity instead of !important */
.voting-grid .vote-cell {
  cursor: crosshair;
}
```

**Full context:** Lines 30-45 of voting.css

---

### A.4 Create CSS Utility Classes

**File to Edit:** `src/styles/theme.css`
**Location:** Add at END of file (after all component styles)

**Add these new utility classes:**

```css
/* ═══════════════════════════════════════════════════════════════════════════════
   UTILITY CLASSES
   For common inline style patterns to reduce JavaScript style={{}} usage
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Text Color Utilities */
.text-primary {
  color: var(--color-text-primary);
}

.text-secondary {
  color: var(--color-text-secondary);
}

.text-muted {
  color: var(--color-text-muted);
}

.text-accent {
  color: var(--color-primary);
}

.text-success {
  color: var(--color-success);
}

.text-warning {
  color: var(--color-warning);
}

.text-error {
  color: var(--color-error);
}

/* Background Color Utilities */
.bg-primary {
  background: var(--color-bg-primary);
}

.bg-surface {
  background: var(--color-surface);
}

.bg-elevated {
  background: var(--color-bg-elevated);
}

.bg-brand-primary {
  background: var(--color-brand-primary);
}

/* Display Utilities */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Opacity Utilities */
.opacity-muted {
  opacity: 0.6;
}

.opacity-subtle {
  opacity: 0.3;
}
```

**Verification:**
```bash
# Check that new classes are in the file
grep "text-primary\|bg-surface\|flex-center" src/styles/theme.css
```

---

## PHASE B: INVESTIGATION & REFACTORING (2-5 hours)

These require review before implementation.

### B.1 Review @ts-nocheck Files

**Files to review:**

1. **src/hooks/useSalesHistory.ts**
   ```bash
   # Check what's missing typing
   head -50 src/hooks/useSalesHistory.ts
   grep "@ts-nocheck" -A 20 src/hooks/useSalesHistory.ts
   ```
   - **Decision:** Keep or improve types?
   - **If improving:** Remove @ts-nocheck and add JSDoc types

2. **src/lib/canvas/drawing.ts**
   ```bash
   head -50 src/lib/canvas/drawing.ts
   ```
   - **Decision:** Is this legacy code that needs typing?
   - **If improving:** Add proper Canvas type definitions

3. **src/components/MarketHeatmap.tsx**
   ```bash
   head -30 src/components/MarketHeatmap.tsx
   ```
   - **Decision:** Market data types missing?
   - **If improving:** Add proper data shape types

4. **src/lib/juice/audio.ts**
   - **Decision:** Audio library types incomplete?
   - **Note:** This is complex audio manipulation code

5. **src/components/layout/GallerySidebarControls.tsx**
   - **Decision:** UI type issues?

**Recommendation:** Unless there are real type errors, keep @ts-nocheck for complex legacy code.

### B.2 Consolidate Small CSS Files

**Option 1: Merge game CSS files** (Recommended)

```bash
# Current state
wc -l src/styles/game-*.css
#  90 src/styles/game-colors.css
#  61 src/styles/game-container.css

# Create combined file
cat src/styles/game-colors.css src/styles/game-container.css > src/styles/game-ui.css

# Update imports in index.css
# Change: @import './styles/game-colors.css'
#         @import './styles/game-container.css'
# To:     @import './styles/game-ui.css'

# Delete old files
rm -f src/styles/game-colors.css
rm -f src/styles/game-container.css
```

**Step-by-step:**
1. Read both files
2. Combine into one organized file
3. Update import in src/index.css
4. Delete old files
5. Test: `npm run dev`

---

### B.3 Refactor Inline Styles (Batch Conversion)

**Most affected files:**
```
src/components/ui/Dropdown.tsx (15+ inline styles)
src/components/ui/LoadingSpinner.tsx (8+ inline styles)
src/components/ui/ErrorState.tsx (4+ inline styles)
```

**Conversion Pattern:**

**Before:**
```tsx
<div style={{ color: 'var(--color-text-primary)' }}>
<div style={{ background: 'var(--color-bg-surface)' }}>
```

**After:**
```tsx
<div className="text-primary">
<div className="bg-surface">
```

**Implementation for each file:**

1. **src/components/ui/Dropdown.tsx** - Find & Replace:
   - `style={{ color: 'var(--color-text-primary)' }}` → `className="text-primary"`
   - `style={{ color: 'var(--color-text-muted)' }}` → `className="text-muted"`
   - And so on...

2. **src/components/ui/LoadingSpinner.tsx** - Same process

3. **src/components/ui/ErrorState.tsx** - Same process

**Caution:** Some inline styles are dynamic (conditional colors). Keep those but migrate static ones.

---

## PHASE C: COMPONENT REFACTORING (Optional, 2-3 days)

These improve maintainability but aren't blocking.

### C.1 Split Large Components

**1. DesktopExplorerPanel.tsx** (1209 lines)

```
Current: One monolithic component
Goal: Break into smaller presentable components

Proposed structure:
DesktopExplorerPanel.tsx (300 lines, container logic)
├── ExplorerHeader.tsx (100 lines)
├── ExplorerViewer.tsx (200 lines)
├── ExplorerThumbnails.tsx (150 lines)
├── ExplorerStats.tsx (150 lines)
└── ExplorerControls.tsx (100 lines)
```

**2. HeatMap.tsx** (1125 lines)

```
Current: Complex heatmap visualization
Goal: Extract rendering logic

Proposed structure:
HeatMap.tsx (300 lines, state management)
├── HeatMapRenderer.tsx (400 lines, canvas rendering)
├── HeatMapLegend.tsx (100 lines)
├── HeatMapTooltip.tsx (100 lines)
└── HeatMapControls.tsx (100 lines)
```

**3. DrawerEditor.tsx** (1113 lines)

```
Current: Complex editor UI
Goal: Separate UI from state management

Proposed structure:
DrawerEditor.tsx (300 lines, container)
├── DrawerCanvas.tsx (400 lines, visualization)
├── DrawerTools.tsx (200 lines, toolbar)
├── DrawerLayers.tsx (100 lines, layer panel)
└── DrawerSettings.tsx (100 lines, properties)
```

**Implementation:** (Not immediate - plan for next sprint)

---

## PHASE D: OPTIONAL - ESLint Configuration

**Add plugin to catch unused imports automatically:**

```bash
npm install --save-dev eslint-plugin-unused-imports
```

**Update .eslintrc.json or eslint.config.js:**

```json
{
  "plugins": ["unused-imports"],
  "rules": {
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      { "vars": "all", "varsIgnorePattern": "^_" }
    ]
  }
}
```

**Run to find all unused imports:**
```bash
npm run lint -- --fix
```

---

## EXECUTION ORDER (Recommended)

### Day 1 (2-3 hours):
1. Delete theme components (A.1) - 10 min
2. Delete empty directories (A.2) - 10 min
3. Fix voting.css (A.3) - 10 min
4. Add CSS utility classes (A.4) - 30 min
5. Test: `npm run dev` and `npm run build` - 15 min
6. Commit all changes - 5 min

**Total:** ~90 minutes

### Day 2 (2-3 hours):
1. Review @ts-nocheck files (B.1) - 60 min
2. Consolidate CSS files (B.2) - 45 min
3. Test and commit - 15 min

**Total:** ~120 minutes

### Optional (Later):
1. Batch refactor inline styles (B.3) - 2-3 hours
2. Component refactoring (C.1) - 2-3 days (future sprint)
3. ESLint plugin setup (D) - 30 min

---

## VERIFICATION CHECKLIST

After completing each phase:

### After A.1 (Delete Theme Components):
```bash
# Should return nothing
grep -r "GlowContainer\|GlassCard" src/ --include="*.tsx" --include="*.ts"

# Build should succeed
npm run build

# Dev server should start
npm run dev
```

### After A.2 (Delete Empty Directories):
```bash
# Should return nothing
find src -type d -empty

# Verify git status
git status
```

### After A.3 (Fix voting.css):
```bash
# Count !important in voting.css - should be 0
grep -c "!important" src/styles/voting.css

# Should be 3 fewer total
grep -r "!important" src/styles/ | wc -l
```

### After A.4 (Add CSS Utilities):
```bash
# Check utilities are in theme.css
grep -c "text-primary\|bg-surface\|flex-center" src/styles/theme.css

# Should match or exceed 10
grep -c "^\." src/styles/theme.css
```

### After B.1 (Review @ts-nocheck):
```bash
# Document decisions in CLEANUP-DECISIONS.md
# No changes to files yet unless decided
```

### After B.2 (Consolidate CSS):
```bash
# game-colors.css should be gone
ls -la src/styles/game-*.css

# Build and visual test
npm run build && npm run dev
```

---

## ROLLBACK INSTRUCTIONS (If Needed)

All changes are git-trackable. To rollback:

```bash
# Rollback all phases
git reset --hard HEAD~1

# Or rollback specific file
git checkout HEAD -- src/components/theme/index.ts
git checkout HEAD -- src/styles/theme.css
```

---

## GIT COMMIT MESSAGES

### For Phase A (Quick Wins):
```
refactor: cleanup unused components and directories

- Delete unused GlowContainer and GlassCard components
- Remove 9 empty component directories
- Fix !important in voting.css (use specificity instead)
- Add CSS utility classes to theme.css (.text-*, .bg-*, .flex-*)

No functional changes. Improves code cleanliness.
```

### For Phase B (Investigation):
```
refactor: consolidate game CSS files

- Merge game-colors.css and game-container.css into game-ui.css
- Update imports in index.css
- Reduces style directory from 9 to 7 files

No visual changes. CSS consolidation only.
```

### For Phase B.3 (Inline Styles):
```
refactor: convert inline styles to CSS utility classes

- Replace inline style={{}} with .text-* and .bg-* classes
- Affected: Dropdown, LoadingSpinner, ErrorState components
- Improves maintainability and consistency
```

---

## SUMMARY

| Phase | Time | Priority | Risk | Benefit |
|-------|------|----------|------|---------|
| A.1 - Delete components | 10 min | High | Low | Cleaner exports |
| A.2 - Delete directories | 10 min | High | Low | Cleaner structure |
| A.3 - Fix CSS !important | 10 min | Medium | Low | Better practices |
| A.4 - CSS utilities | 30 min | High | Low | Reduce inline styles |
| B.1 - Review @ts-nocheck | 60 min | Low | Low | Better types (optional) |
| B.2 - Consolidate CSS | 45 min | Medium | Low | Fewer files |
| B.3 - Refactor inline styles | 2-3 hrs | Medium | Medium | Better maintainability |
| C.1 - Split components | 1-2 days | Low | Medium | Better testability |

**Total Quick Impact:** Phase A = 60 minutes = immediate cleanup
**Recommended Next Sprint:** Phase B = 2-3 hours = consolidation
**Future Work:** Phase C = 1-2 days = deep refactoring

---

## NOTES

- All changes are **non-breaking** from a user perspective
- All changes are **testable** before commit
- All changes are **git-reversible** if needed
- Build and tests should pass after each phase
- Deploy after Phase A or Phase B (your choice)

**Recommended:** Do Phase A immediately (60 min), Phase B in next sprint (2-3 hrs)
