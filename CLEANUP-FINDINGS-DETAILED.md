# DETAILED CLEANUP FINDINGS - Line-by-Line Issues

**Generated:** January 29, 2026
**Based on:** Comprehensive codebase audit

---

## 1. UNUSED EXPORTS & COMPONENTS

### 1.1 Theme Components (To Delete)

**File:** `/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/components/theme/GlowContainer.tsx`
- **Status:** Exported but never imported
- **Lines:** ~150 (full component)
- **Impact:** ~500 bytes bundle
- **Action:** DELETE

**File:** `/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/components/theme/GlassCard.tsx`
- **Status:** Exported but never imported
- **Lines:** ~150 (full component)
- **Impact:** ~500 bytes bundle
- **Action:** DELETE

**File:** `/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/components/theme/index.ts`
- **Current Exports (Lines 1-10):**
```typescript
export { GlowContainer } from './GlowContainer';
export { GlassCard } from './GlassCard';
```
- **Action:** DELETE these two lines

---

## 2. CSS !important VIOLATIONS

### 2.1 Fixable !important (Non-Game Files)

**File:** `src/styles/voting.css`
**Line 34:**
```css
.voting-cell {
  cursor: crosshair !important;  ← REMOVE !important
}
```

**Line 39:**
```css
.vote-label {
  cursor: crosshair !important;  ← REMOVE !important
}
```

**Reason:** Cursor property has low specificity conflicts. Use proper class specificity instead.

**Fix:**
```css
.voting-grid .vote-cell {
  cursor: crosshair;  /* Specificity solves the problem */
}

.voting-grid .vote-label {
  cursor: crosshair;
}
```

**Line Count:** 2 instances
**Status:** FIXABLE ✓

### 2.2 Acceptable !important (Accessibility)

**File:** `src/styles/theme.css`
**Lines 508-510:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Status:** ✓ KEEP - Accessibility requirement override

**File:** `src/styles/mobile.css`
**Lines 306-308:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Status:** ✓ KEEP - Accessibility requirement override

---

## 3. @ts-nocheck ANALYSIS

### 3.1 Game Components (Acceptable)

**Files: 9 instances** (Legitimate game complexity)
```
src/games/WojakRunner/index.tsx:4
src/games/OrangePong/index.tsx:6
src/games/OrangeJuggle/index.tsx:7
src/games/Orange2048/index.tsx:4
src/games/Merge2048/Merge2048Game.tsx:1
src/games/MemoryMatch/index.tsx:6
src/games/KnifeGame/index.tsx:4
src/pages/FlappyOrange.tsx:1
src/pages/BlockPuzzle.tsx:1
```

**Recommendation:** KEEP ✓ (Complex game logic justified)

### 3.2 Complex Components (Review Candidates)

**File:** `src/components/TraitValues.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** 1165 lines
- **Purpose:** Trait statistics table with complex sorting
- **Recommendation:** REVIEW - Possible to add types

**File:** `src/components/AskBigPulp.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** ~800 lines
- **Purpose:** BigPulp AI assistant UI
- **Recommendation:** REVIEW - Data type issues?

**File:** `src/components/gallery/desktop/DesktopExplorerPanel.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** 1209 lines
- **Purpose:** Desktop NFT explorer
- **Recommendation:** REVIEW - UI type issues?

**File:** `src/components/gallery/NFTInfoCard.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** ~600 lines
- **Purpose:** NFT information display
- **Recommendation:** REVIEW - Data type issues?

**File:** `src/components/layout/GallerySidebarControls.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** ~400 lines
- **Purpose:** Gallery sidebar controls
- **Recommendation:** REVIEW - UI type issues?

**File:** `src/components/MarketHeatmap.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** ~600 lines
- **Purpose:** Market data heatmap visualization
- **Recommendation:** REVIEW - Market data types missing?

**File:** `src/components/CryptoBubbles.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** ~400 lines
- **Purpose:** Crypto data bubbles
- **Recommendation:** REVIEW - Data type issues?

**File:** `src/components/FloatingVideoPlayer.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** ~500 lines
- **Purpose:** Video player component
- **Recommendation:** REVIEW - Video API types?

**File:** `src/components/QuestionTree.tsx`
**Line 1:** `// @ts-nocheck`
- **Size:** ~400 lines
- **Purpose:** Question navigation tree
- **Recommendation:** REVIEW - Data type issues?

### 3.3 Library Code (Keep As-Is)

**Files: 5 instances** (Low-level, complex implementations)
```
src/lib/juice/audio.ts:1          ✓ Audio DSP library
src/lib/canvas/drawing.ts:1       ✓ Canvas rendering
src/lib/utils/mobile.ts:1         ✓ Mobile utilities
src/hooks/useSalesHistory.ts:1    ✓ Complex data hook
```

**Recommendation:** KEEP ✓ (Specialized code, types difficult)

### 3.4 Test/Setup (Accept As-Is)

```
src/App.test.tsx:1                ✓ Test file
src/setupTests.ts:1               ✓ Test setup
src/contexts/AudioContext.tsx:1   ✓ Audio setup
```

**Recommendation:** KEEP ✓ (Not critical for app)

---

## 4. INLINE STYLES - TOP OFFENDERS

### 4.1 UI Component Inline Styles

**File:** `src/components/ui/Dropdown.tsx`

**Line 45:**
```tsx
style={{ color: 'var(--color-text-primary)' }}
```

**Line 52:**
```tsx
style={{ color: 'var(--color-text-muted)' }}
```

**Line 67:**
```tsx
style={{ color: 'var(--color-text-muted)' }}
```

**And ~12 more similar patterns**

**Improvement:** Replace with `className="text-primary"`, `className="text-muted"` etc.

**File:** `src/components/ui/LoadingSpinner.tsx`

**Line 25:**
```tsx
style={{ color: 'var(--color-brand-primary)' }}
```

**Line 32:**
```tsx
style={{ color: 'var(--color-text-muted)' }}
```

**Line 38:**
```tsx
style={{ background: 'var(--color-bg-primary)' }}
```

**And ~5 more**

**Improvement:** Use new `.text-primary`, `.text-muted`, `.bg-primary` classes

**File:** `src/components/ui/ErrorState.tsx`

**Line 18:**
```tsx
style={{ color: 'var(--color-text-primary)' }}
```

**Line 22:**
```tsx
style={{ color: 'var(--color-text-muted)' }}
```

**Line 28:**
```tsx
style={{ background: 'var(--color-brand-primary)' }}
```

**Line 32:**
```tsx
style={{ color: '#ef4444' }}  ← Hard-coded color!
```

**Issue:** Hard-coded color should use CSS variable

**File:** `src/components/ui/Slider.tsx`

**Line 42:**
```tsx
style={{ color: isDragging ? 'var(--color-brand-primary)' : 'var(--color-text-muted)' }}
```

**Issue:** Dynamic inline style (harder to convert, but still possible)

**File:** `src/components/ui/Toggle.tsx`

**Line 56:**
```tsx
style={{ color: 'var(--color-text-primary)' }}
```

**File:** `src/components/ui/CopyButton.tsx`

**Line 22:**
```tsx
style={{ color: 'var(--color-text-secondary)' }}
```

**File:** `src/components/ui/RetryCard.tsx`

**Line 15:**
```tsx
style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}
```

**Issue:** Hard-coded RGBA color (not using CSS variables)

**Line 18:**
```tsx
style={{ color: 'white', margin: 0 }}
```

**Issue:** Hard-coded white color

**Count:** ~139 total files with inline styles

**Recommended Fix:** Create utility classes in theme.css (A.4 in action plan)

---

## 5. EMPTY DIRECTORIES

### 5.1 Empty Component Folders

**Location:** `src/components/features/`
```
Total items: 0
Size: 0 bytes
```
**Action:** DELETE

**Location:** `src/components/media/shared/`
```
Total items: 0
Size: 0 bytes
```
**Action:** DELETE

### 5.2 Empty Game Component Folders

```
src/games/WojakRunner/components/          ← EMPTY
src/games/OrangePong/components/           ← EMPTY
src/games/OrangeJuggle/components/         ← EMPTY
src/games/Orange2048/components/          ← EMPTY
src/games/MemoryMatch/components/         ← EMPTY
src/games/ColorReaction/components/       ← EMPTY
src/games/KnifeGame/components/           ← EMPTY
```

**Action:** DELETE all 7 empty game component folders

**Total to delete:** 9 empty directories

---

## 6. CSS CONSOLIDATION CANDIDATES

### 6.1 Small CSS Files

**File:** `src/styles/game-colors.css`
- **Size:** 90 lines
- **Content:** Color variables for games
- **Status:** Could merge into theme.css or game-container.css
- **Action:** CONSOLIDATE

**File:** `src/styles/game-container.css`
- **Size:** 61 lines
- **Content:** Game container styling
- **Status:** Could merge with game-colors.css
- **Action:** CONSOLIDATE

**Proposed Solution:**
1. Create `src/styles/games-ui.css` (consolidating both)
2. Update `src/index.css` imports
3. Delete old files

---

## 7. LARGE COMPONENT CANDIDATES (Future Refactoring)

### 7.1 DesktopExplorerPanel.tsx

**File:** `src/components/gallery/desktop/DesktopExplorerPanel.tsx`
- **Size:** 1209 lines
- **Complexity:** High
- **Issues:**
  - Line 1: `// @ts-nocheck` flag
  - Mixed concerns: state, rendering, event handling
  - Could split into 5-7 sub-components

**Proposed split:**
```
Components/
├── ExplorerHeader.tsx (100 lines)
├── ExplorerViewer.tsx (200 lines)
├── ExplorerThumbnails.tsx (150 lines)
├── ExplorerStats.tsx (100 lines)
├── ExplorerControls.tsx (100 lines)
└── DesktopExplorerPanel.tsx (300 lines - container)
```

**Status:** Optional refactoring (not blocking)

### 7.2 HeatMap.tsx

**File:** `src/components/bigpulp/HeatMap.tsx`
- **Size:** 1125 lines
- **Complexity:** Very High (canvas rendering + data processing)
- **Issues:**
  - Line 123: `// @ts-ignore` flag
  - Complex visualization logic
  - Could split rendering from state management

**Proposed split:**
```
Components/
├── HeatMapRenderer.tsx (400 lines - canvas logic)
├── HeatMapLegend.tsx (100 lines)
├── HeatMapTooltip.tsx (100 lines)
└── HeatMap.tsx (300 lines - container)
```

**Status:** Optional refactoring (not blocking)

### 7.3 DrawerEditor.tsx

**File:** `src/components/Shop/DrawerEditor.tsx`
- **Size:** 1113 lines
- **Complexity:** High
- **Issues:**
  - Complex UI with multiple sections
  - Could split editor UI from canvas rendering

**Proposed split:**
```
Components/
├── DrawerCanvas.tsx (400 lines - visualization)
├── DrawerTools.tsx (200 lines - toolbar)
├── DrawerLayers.tsx (100 lines - layer panel)
├── DrawerSettings.tsx (100 lines - properties)
└── DrawerEditor.tsx (300 lines - container)
```

**Status:** Optional refactoring (not blocking)

---

## 8. TECHNICAL DEBT COMMENTS

### 8.1 TODO Comments to Address

**File:** `src/contexts/AuthContext.tsx`
```
Comment: "TODO: Implement Sage Wallet connection"
Type: Future Feature
Priority: Low
Action: Keep as GitHub issue
```

**File:** `src/stores/walletStore.ts`
```
Comment: "TODO: Get from price feed"
Type: Future Enhancement
Priority: Low
Line: Contains hardcoded price (5.35)
Action: Create API integration ticket
```

**File:** `src/components/bigpulp/MarketTab.tsx`
```
Comment: "TODO: Open cell detail modal"
Type: Feature Request
Priority: Low
Action: Keep as GitHub issue
```

**File:** `src/components/ArcadeFrame.tsx`
```
Comment: "TODO: Implement Phase 2 with edge pieces"
Type: Future Feature
Priority: Low
Action: Part of larger arcade feature planning
```

**File:** `src/pages/BigPulp.tsx`
```
Comment: "TODO: Handle attribute click for drill-down"
Type: Feature Request
Priority: Low
Action: Keep as GitHub issue
```

**File:** `src/pages/Profile.tsx`
```
Comment: "TODO: Open edit profile modal"
Type: Feature Request
Priority: Low
Action: Keep as GitHub issue
```

**File:** `src/services/dexieSalesService.ts`
```
Comment: "TODO: Connect to NFT data to get actual traits"
Type: Data Integration
Priority: Low
Action: Backend integration task
```

**File:** `src/services/bigpulpService.ts`
```
Comment: "TODO: Fetch real price"
Type: API Integration
Priority: Low
Line: Contains hardcoded price (5.34)
Action: Create API integration ticket
```

**Status:** All 8 are low-priority, future enhancements. No action needed now. ✓

---

## 9. SUMMARY TABLE - FILES TO MODIFY

| File | Issue | Lines | Action | Priority | Time |
|------|-------|-------|--------|----------|------|
| src/components/theme/GlowContainer.tsx | Unused export | 150 | DELETE | HIGH | 2 min |
| src/components/theme/GlassCard.tsx | Unused export | 150 | DELETE | HIGH | 2 min |
| src/components/theme/index.ts | Exports unused | 2 | EDIT | HIGH | 2 min |
| src/styles/voting.css | !important (2x) | 34, 39 | FIX | MEDIUM | 5 min |
| src/styles/theme.css | Add utilities | EOF | ADD | HIGH | 30 min |
| src/styles/game-colors.css | Too small | 90 | CONSOLIDATE | MEDIUM | 15 min |
| src/styles/game-container.css | Too small | 61 | CONSOLIDATE | MEDIUM | 15 min |
| src/components/ui/*.tsx | Inline styles | 139 files | REFACTOR | MEDIUM | 2-3 hrs |
| 9x empty directories | Clutter | 0 | DELETE | HIGH | 5 min |
| src/components/TraitValues.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/AskBigPulp.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/gallery/desktop/DesktopExplorerPanel.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/gallery/NFTInfoCard.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/layout/GallerySidebarControls.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/MarketHeatmap.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/CryptoBubbles.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/FloatingVideoPlayer.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/QuestionTree.tsx | @ts-nocheck | 1 | REVIEW | LOW | 30 min |
| src/components/gallery/desktop/DesktopExplorerPanel.tsx | Large (1209 lines) | 1209 | REFACTOR (optional) | LOW | 2-3 days |
| src/components/bigpulp/HeatMap.tsx | Large (1125 lines) | 1125 | REFACTOR (optional) | LOW | 2-3 days |
| src/components/Shop/DrawerEditor.tsx | Large (1113 lines) | 1113 | REFACTOR (optional) | LOW | 2-3 days |

---

## CLEANUP CHECKLIST

**Quick Wins (Day 1):**
- [ ] Delete src/components/theme/GlowContainer.tsx
- [ ] Delete src/components/theme/GlassCard.tsx
- [ ] Edit src/components/theme/index.ts (remove 2 lines)
- [ ] Fix voting.css !important (2 instances)
- [ ] Add CSS utility classes to theme.css
- [ ] Delete 9 empty directories
- [ ] Test & Commit

**Medium Priority (Day 2-3):**
- [ ] Review 9 @ts-nocheck files
- [ ] Consolidate game CSS files
- [ ] Refactor inline styles (batch)

**Optional (Future):**
- [ ] Refactor large components
- [ ] Add ESLint unused imports plugin

---

## REFERENCE: File Paths

**Absolute paths for editing:**

```
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/components/theme/GlowContainer.tsx
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/components/theme/GlassCard.tsx
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/components/theme/index.ts
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/styles/voting.css
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/styles/theme.css
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/styles/game-colors.css
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/styles/game-container.css
/sessions/optimistic-stoic-bell/mnt/wojak-ink/src/index.css
```

**Root directory:**
```
/sessions/optimistic-stoic-bell/mnt/wojak-ink/
```

---

## NEXT STEPS

1. Review this detailed findings document
2. Implement CLEANUP-ACTION-PLAN.md steps
3. Follow execution order (Day 1, Day 2, Optional)
4. Use verification checklist after each phase
5. Create git commits with provided messages

Estimated total time: **4-6 hours** for complete cleanup
