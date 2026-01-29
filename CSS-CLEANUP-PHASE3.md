# CSS CLEANUP PHASE 3 - Dead Code & !important Removal

## IMPORTANT: Leave Game Files Untouched
Do NOT modify any files in:
- `src/games/`
- `src/pages/*Game*.css`
- `src/pages/*Puzzle*.css`
- `src/pages/*Runner*.css`
- `src/components/arcade/`
- Any file with game-related names (Snake, Pong, Flappy, Whack, etc.)

---

## PHASE 3A: Remove !important Hacks (Non-Game Files)

### Priority Files to Fix

| File | Count | Action |
|------|-------|--------|
| `src/systems/game-ui/mobile-game-ui.css` | 64 | SKIP (game-related) |
| `src/pages/ColorReaction.css` | 17 | SKIP (game) |
| `src/pages/GatedChat.css` | 16 | FIX |
| `src/pages/Generator.css` | 9 | FIX |
| `src/components/ui/ConfirmModal.css` | 8 | FIX |
| `src/components/TraitValues.css` | 6 | FIX |
| `src/components/Account/Account.css` | 4 | FIX |
| `src/styles/theme.css` | 3 | FIX |
| `src/styles/mobile.css` | 3 | FIX |
| `src/components/Shop/Shop.css` | 3 | FIX |
| `src/styles/voting.css` | 2 | FIX |
| `src/pages/SettingsPage.css` | 2 | FIX |
| `src/pages/Gallery.css` | 2 | FIX |
| `src/components/Leaderboard/Leaderboard.css` | 2 | FIX |
| `src/pages/Media.css` | 1 | FIX |
| `src/pages/Landing.css` | 1 | FIX |
| `src/components/voting/FlickModeToggle.css` | 1 | FIX |
| `src/components/auth/SignInButton.css` | 1 | FIX |
| `src/components/StartupSequence.css` | 1 | FIX |
| `src/components/MarketHeatmap.css` | 1 | FIX |
| `src/components/Guild/Guild.css` | 1 | FIX |

### Total to fix: ~63 !important (excluding games)

### Strategy:
1. Open each file
2. For each `!important`:
   - Check if it's overriding old theme system (now deleted) → REMOVE
   - Check if it's overriding Ionic (now deleted) → REMOVE
   - Check if it's fighting another rule → Increase specificity instead
3. Test after each file

---

## PHASE 3B: Remove Unused Components

### Components to DELETE (0 usages):

```bash
# These are exported but never imported anywhere
rm -f src/components/LegacySettings.tsx
rm -f src/components/LegacySettings.css
```

### Unused exports to REMOVE from files:

| File | Unused Export | Action |
|------|---------------|--------|
| `src/components/ui/SuccessCheck.tsx` | `SuccessPulse` | Remove export |
| `src/components/ui/ErrorState.tsx` | `ErrorInline`, `ErrorFallback` | Remove exports |
| `src/components/ui/CopyButton.tsx` | `CopyText` | Remove export |
| `src/components/ui/RetryCard.tsx` | `NetworkError` | Remove export |
| `src/components/ui/EmptyState.tsx` | `EMPTY_STATES` | Remove export |

---

## PHASE 3C: Remove Unused Hooks

### Hooks with 0 usages - DELETE:

```bash
rm -f src/hooks/useActionLoading.ts
rm -f src/hooks/useBatchPreload.ts
rm -f src/hooks/useCurrentBreakpoint.ts
rm -f src/hooks/useDeviceTilt.ts
rm -f src/hooks/useExplorerPreload.ts
rm -f src/hooks/useIsMobileLandscape.ts
rm -f src/hooks/useIsTablet.ts
rm -f src/hooks/useIsTouchDevice.ts
rm -f src/hooks/useOrientation.ts
rm -f src/hooks/useOverallStats.ts
rm -f src/hooks/usePageImageRequirements.ts
rm -f src/hooks/usePagePreload.ts
rm -f src/hooks/usePrefersDarkMode.ts
rm -f src/hooks/usePreloadImage.ts
rm -f src/hooks/usePreloadStats.ts
rm -f src/hooks/usePreloadTrigger.ts
rm -f src/hooks/usePreloadTriggers.ts
rm -f src/hooks/usePreloaderStats.ts
rm -f src/hooks/useSalesDatabank.ts
rm -f src/hooks/useScreenReaderAnnouncements.ts
rm -f src/hooks/useStaggerAnimation.ts
rm -f src/hooks/useTraitRarity.ts
rm -f src/hooks/useTraitSales.ts
rm -f src/hooks/useTraitStats.ts
rm -f src/hooks/useTraits.ts
rm -f src/hooks/useUISound.ts
rm -f src/hooks/useUpdateActionImages.ts
rm -f src/hooks/useUserDisplays.ts
rm -f src/hooks/useVisibilityTracking.ts
```

### Update hooks/index.ts
After deleting hooks, remove their exports from `src/hooks/index.ts`

---

## PHASE 3D: Remove Unused CSS Files

```bash
rm -f src/pages/Media.css
```

---

## PHASE 3E: Remove Unused Utility Functions

### In `src/lib/`:
- Remove `LAYER_NAMES` if unused
- Remove `UI_LAYER_ORDER` if unused
- Remove `addTrait` function if unused
- Remove `applyFullChromaticAberration` if unused

Search and verify before deleting:
```bash
grep -r "LAYER_NAMES\|UI_LAYER_ORDER\|addTrait\|applyFullChromaticAberration" src/
```

---

## PHASE 3F: Clean Up Console Statements (Optional)

Found 530 console.log/warn/error statements.

### Recommendation:
- Keep error logging for production debugging
- Remove debug console.log statements
- Convert important logs to proper logging system

### Quick cleanup command:
```bash
# Find all console.log (not error/warn)
grep -rn "console\.log" src/ --include="*.tsx" --include="*.ts" | head -50
```

---

## VERIFICATION CHECKLIST

After Phase 3, run:

```bash
# 1. Build check
npm run build

# 2. Count remaining !important (should be ~700 less, mostly in games)
grep -r "!important" src/**/*.css | grep -v games | wc -l

# 3. Check for broken imports
npm run dev
# Open browser console, check for errors

# 4. Verify deleted hooks aren't imported
grep -r "useActionLoading\|useBatchPreload\|useCurrentBreakpoint" src/
```

---

## SUMMARY

| Category | Items | Action |
|----------|-------|--------|
| !important (non-game) | ~63 | FIX |
| Unused components | 1 file | DELETE |
| Unused component exports | 6 | REMOVE |
| Unused hooks | 29 files | DELETE |
| Unused CSS files | 1 | DELETE |
| Unused utilities | 4 | REMOVE |
| Console statements | 530 | OPTIONAL cleanup |

### Estimated cleanup:
- **~30 files deleted**
- **~63 !important removed**
- **~4 unused exports removed**

---

## COMMIT MESSAGE

```
refactor: remove dead code and !important hacks

PHASE 3 CLEANUP:
- Delete 29 unused hooks
- Delete LegacySettings component
- Remove unused exports (SuccessPulse, ErrorInline, etc.)
- Fix 63 !important hacks in non-game CSS
- Delete unused Media.css

Game files left untouched as requested.
```
