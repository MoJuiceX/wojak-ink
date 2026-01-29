# WOJAK.INK CSS ARCHITECTURE AUDIT

## Summary

| Metric | Count |
|--------|-------|
| Total CSS files in src/ | 127 |
| `!important` usages | 790 |
| Duplicate variable systems | 6 |
| Theme definitions | 5 |
| Files to DELETE | 90+ |

---

## Current CSS Entry Point Chain

```
main.tsx imports (in order):
├── @ionic/react/css/core.css      ← IONIC (should remove)
├── ./index.css                    ← MAIN (1317 lines!)
│   ├── @import "tailwindcss"
│   ├── @import "./styles/game-container.css"
│   ├── @import "./styles/game-colors.css"
│   ├── @import "./styles/premium-tokens.css"
│   ├── @import "./styles/premium-effects.css"
│   └── @import "./styles/ambient-background.css"
├── ./styles/tokens.css            ← DUPLICATE VARIABLES
├── ./styles/animations.css
├── ./styles/utilities.css
├── ./styles/mobile.css
└── ./styles/shop-cosmetics.css
```

---

## CONFLICT MAP: 6 Variable Systems Fighting

### 1. src/theme/variables.css (26KB)
- Defines `:root` and `.theme-dark`
- Contains: `--color-bg-primary`, `--color-orange-500`, etc.
- **REDUNDANT** - overlaps with index.css

### 2. src/index.css (1317 lines)
- Defines `:root` with 5 themes
- Uses `@theme` block and `[data-theme="*"]` selectors
- **SHOULD BE THE SINGLE SOURCE** - but too bloated

### 3. src/styles/tokens.css (8.8KB)
- More `--color-*`, `--font-*`, `--space-*` variables
- **REDUNDANT** - merge into theme.css

### 4. src/systems/theme/colors.css (2.8KB)
- Even more color variables
- **DELETE ENTIRE FOLDER**

### 5. src/styles/premium-tokens.css (1.4KB)
- Premium-specific tokens
- **REDUNDANT** - merge into theme.css

### 6. src/theme/ionic-overrides.css (14KB)
- Overrides for Ionic components
- **DELETE IF REMOVING IONIC**

---

## 5 THEMES DEFINED (Remove all but dark)

Located in `src/index.css`:
1. `dark` (default) - KEEP
2. `void` - DELETE
3. `light` - DELETE
4. `tang-orange` - DELETE
5. `chia-green` - DELETE

---

## THEME SWITCHING CODE TO REMOVE

### Files to DELETE entirely:
```
src/contexts/ThemeContext.tsx
src/components/theme/ThemeSwitcher.tsx
src/hooks/useTheme.ts (if exists)
src/types/theme.ts
```

### Files to EDIT (remove theme imports/usage):
```
src/App.tsx                    ← Remove ThemeProvider import
src/contexts/SettingsContext.tsx ← Remove setTheme
src/stores/settingsStore.ts    ← Remove theme state
src/components/gallery/NFTExplorerModal.tsx ← Remove useTheme
src/components/bigpulp/HeatMap.tsx ← Remove useTheme
```

---

## IONIC DEPENDENCY

### Package.json:
```json
"@ionic/react": "^8.7.16"
```

### Usage in main.tsx:
```tsx
import { setupIonicReact } from '@ionic/react'
import '@ionic/react/css/core.css'
setupIonicReact({ mode: 'ios' })
```

### Files to check for Ionic components:
Run: `grep -r "IonButton\|IonCard\|IonPage\|IonContent\|IonHeader" src/`

If NO Ionic components used → REMOVE ENTIRELY

---

## !important HOTSPOTS (Top 20)

| File | Count | Priority |
|------|-------|----------|
| BlockPuzzle.css | 286 | HIGH |
| BrickByBrick.css | 70 | HIGH |
| mobile-game-ui.css | 64 | MEDIUM |
| ArcadeFrame.css | 63 | MEDIUM |
| ArcadeButtonLights.css | 45 | MEDIUM |
| WojakRunner.css | 34 | LOW |
| index.css | 33 | HIGH |
| OrangePong.css | 18 | LOW |
| OrangePong.game.css | 18 | LOW |
| MemoryMatch.css | 17 | LOW |
| ColorReaction.css | 17 | LOW |
| GatedChat.css | 16 | LOW |
| Game.css | 14 | LOW |
| ionic-overrides.css | 9 | DELETE |
| Generator.css | 9 | LOW |
| ConfirmModal.css | 8 | LOW |

---

## ALL CSS FILES BY LOCATION

### src/styles/ (14 files) - GLOBAL STYLES
```
ambient-background.css    ← DELETE (merge to theme)
animations.css            ← KEEP (review)
drawer-customization.css  ← KEEP (complex component)
game-colors.css          ← DELETE (merge to theme)
game-container.css       ← KEEP (game system)
mobile.css               ← KEEP (review)
premium-effects.css      ← DELETE (merge to theme)
premium-tokens.css       ← DELETE (merge to theme)
profile.css              ← KEEP (page styles)
shop-cosmetics.css       ← KEEP (feature styles)
tokens.css               ← DELETE (merge to theme)
utilities.css            ← DELETE (Tailwind does this)
voting.css               ← KEEP (feature styles)
```

### src/theme/ (3 files) - OLD THEME SYSTEM
```
global.css               ← DELETE
ionic-overrides.css      ← DELETE (if removing Ionic)
variables.css            ← DELETE (replaced by theme.css)
```

### src/systems/theme/ (6 files) - DUPLICATE SYSTEM
```
animations.css           ← DELETE (use theme.css)
colors.css               ← DELETE (use theme.css)
glassmorphism.css        ← DELETE (move to theme.css)
index.css                ← DELETE
spacing.css              ← DELETE (Tailwind does this)
typography.css           ← DELETE (move to theme.css)
```

### src/components/ (73 files) - COMPONENT CSS
Most can stay but need review. Priority targets:
```
ArcadeFrame.css          ← 63 !important - FIX
ArcadeButtonLights.css   ← 45 !important - FIX
```

### src/pages/ (20 files) - PAGE CSS
```
BlockPuzzle.css          ← 286 !important - CRITICAL FIX
BrickByBrick.css         ← 70 !important - HIGH FIX
WojakRunner.css          ← 34 !important - MEDIUM FIX
```

### src/games/ (8 files) - GAME CSS
```
Keep all but review for !important cleanup
```

---

## DELETION PRIORITY ORDER

### PHASE 1: Remove Duplicate Variable Systems
1. Delete `src/theme/variables.css`
2. Delete `src/theme/global.css`
3. Delete `src/styles/tokens.css`
4. Delete `src/styles/premium-tokens.css`
5. Delete `src/styles/premium-effects.css`
6. Delete `src/styles/ambient-background.css`
7. Delete `src/styles/utilities.css`
8. Delete entire `src/systems/theme/` folder

### PHASE 2: Remove Theme Switching
1. Delete `src/contexts/ThemeContext.tsx`
2. Delete `src/components/theme/ThemeSwitcher.tsx`
3. Delete `src/types/theme.ts`
4. Edit `src/App.tsx` - remove ThemeProvider
5. Edit `src/index.css` - remove all `[data-theme="*"]` selectors except dark

### PHASE 3: Remove Ionic (if applicable)
1. Run: `grep -r "Ion[A-Z]" src/` to check usage
2. If no usage: `npm uninstall @ionic/react @ionic/core`
3. Delete `src/theme/ionic-overrides.css`
4. Edit `src/main.tsx` - remove Ionic imports

### PHASE 4: Fix !important Hacks
1. Fix `BlockPuzzle.css` (286 instances)
2. Fix `BrickByBrick.css` (70 instances)
3. Fix remaining files

### PHASE 5: Clean Up Index.css
1. Reduce from 1317 lines to ~50 lines
2. Only imports + Tailwind + minimal base styles

---

## TARGET ARCHITECTURE

```
src/
├── index.css              ← ~50 lines (imports only)
│   ├── @import "./styles/theme.css"
│   └── @import "tailwindcss"
├── styles/
│   ├── theme.css          ← ALL visual styles (new single source)
│   ├── animations.css     ← Keyframe animations
│   └── [feature].css      ← Feature-specific (shop, profile, etc.)
├── components/
│   └── *.tsx              ← Use theme classes + Tailwind layout
└── pages/
    └── *.tsx              ← Use theme classes + Tailwind layout
```

---

## VERIFICATION CHECKLIST

After cleanup, verify:
- [ ] `npm run dev` starts without errors
- [ ] All routes render correctly
- [ ] No console CSS errors
- [ ] Cards have correct styling
- [ ] Buttons work and look correct
- [ ] Text colors are correct
- [ ] Hover effects work
- [ ] Games play correctly
- [ ] Mobile responsive works
