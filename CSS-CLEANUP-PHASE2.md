# CSS CLEANUP PHASE 2 - Remove Remaining Theme System

## CRITICAL: Fix Build Error First

`src/config/themes.ts` imports from deleted `@/types/theme` - app may not build!

---

## PHASE 2A: Remove Multi-Theme System

### Files to DELETE entirely:
```bash
rm -f src/config/themes.ts           # 308 lines - 5 theme definitions
rm -f src/config/settingsThemes.ts   # Theme selector config
rm -f src/components/settings/ThemeSelector.tsx  # Theme picker UI
rm -f src/components/common/AmbientBackground.tsx
rm -f src/components/common/AmbientBackground.css
```

### Files to EDIT:

#### 1. src/types/settings.ts
Remove theme-related types:
```ts
// DELETE these lines:
setTheme: (themeId: SettingsThemeId) => void;
// And any SettingsThemeId, SettingsThemeConfig types
```

#### 2. src/contexts/SettingsContext.tsx
Remove theme switching:
```ts
// DELETE:
- const setTheme = useCallback(...)
- isDark logic
- theme state
- setTheme from context value
```

#### 3. src/stores/settingsStore.ts
Remove theme state:
```ts
// DELETE:
- setTheme: (theme: Theme) => void;
- theme from state
```

#### 4. src/pages/Settings.tsx
Remove ThemeSelector:
```tsx
// DELETE:
- import { ThemeSelector } from '@/components/settings'
- <ThemeSelector ... /> components
- setTheme from useSettings()
```

#### 5. src/components/settings/index.ts
Remove ThemeSelector export:
```ts
// DELETE:
export { ThemeSelector } from './ThemeSelector';
```

#### 6. src/config/heatMapConfig.ts
Remove theme detection:
```ts
// DELETE:
const GREEN_THEMES = ['chia-green'];
// And isGreenTheme function
// Hardcode to orange theme behavior
```

#### 7. src/lib/canvas/parallax.ts
Hardcode to dark/orange theme:
```ts
// REPLACE theme lookup with hardcoded orange theme colors
```

#### 8. src/config/tokens.ts
Review and update - references deleted tokens.css

---

## PHASE 2B: Keep Only Tang Orange Theme

If you want to KEEP theme switching capability for future, instead:

### Option A: Delete all but tang-orange
Edit `src/config/themes.ts`:
- Keep only `tangOrangeTheme`
- Remove void, dark, light, chia-green
- Update `themeOrder` to single item

### Option B: Merge tang-orange into theme.css (RECOMMENDED)
- The `src/styles/theme.css` already has the dark/orange theme
- Delete `src/config/themes.ts` entirely
- All colors come from CSS variables in theme.css

---

## PHASE 2C: Fix !important Hacks

Priority order:
1. **BlockPuzzle.css** (286) - Game CSS, likely fighting old theme system
2. **BrickByBrick.css** (70) - Same issue
3. **mobile-game-ui.css** (64) - Game mobile overrides
4. **ArcadeFrame.css** (63) - Arcade cabinet styling
5. **ArcadeButtonLights.css** (45) - Arcade buttons

### Strategy:
Now that old CSS systems are deleted, many !important may no longer be needed.
Test removing them one by one after Phase 2A is complete.

---

## PHASE 2D: Clean Up Orphaned Files

### Check these CSS files for usage:
```bash
# Search for imports
grep -r "LegacySettings.css" src/
grep -r "SkipLink.css" src/
grep -r "OptimizedImage.css" src/
```

If not imported → DELETE

### Check these component files:
- `src/components/LegacySettings.tsx` - Is this used?
- `src/components/common/PageTransition.tsx` - Is this used?
- `src/components/common/BottomSheet.tsx` - Is this used?

---

## PHASE 2E: Update CLAUDE.md

After cleanup, update CLAUDE.md to remove theme references:
- Remove "ACTIVE TASK: CSS Cleanup" section
- Keep final architecture documentation

---

## VERIFICATION AFTER PHASE 2

```bash
# 1. Build check
npm run build

# 2. Dev server
npm run dev

# 3. Grep for dead references
grep -r "useTheme\|ThemeContext\|setTheme" src/
grep -r "themes\[" src/
grep -r "themeOrder" src/

# 4. Count remaining !important
grep -r "!important" src/**/*.css | wc -l
```

Expected results:
- Build succeeds
- No theme-related errors in console
- Single theme (orange/dark) only
- !important count significantly reduced

---

## COMMIT MESSAGE

```
refactor: remove multi-theme system, keep tang-orange only

PHASE 2 CSS CLEANUP:
- Delete 5-theme system (themes.ts, settingsThemes.ts)
- Remove ThemeSelector component
- Remove theme switching from Settings, SettingsContext
- Hardcode to tang-orange/dark theme
- Fix broken imports from deleted @/types/theme

BREAKING: Theme switching removed. App is dark-mode-only.
```
