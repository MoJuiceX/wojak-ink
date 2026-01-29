# CSS CLEANUP EXECUTION PLAN

## For Claude CLI - Execute in Order

Read `CSS-CLEANUP-AUDIT.md` first for context.

---

## PHASE 0: BACKUP

```bash
git checkout -b css-cleanup-$(date +%Y%m%d)
git add .
git commit -m "backup: before CSS architecture cleanup"
```

---

## PHASE 1: ADD NEW THEME FILE

### Step 1.1: Copy theme.css to correct location
The new `theme.css` should be at `src/styles/theme.css`.

If it exists in uploads or docs, copy it:
```bash
cp [source]/theme.css src/styles/theme.css
```

If not, create from the template (see uploaded theme.css file).

### Step 1.2: Verify theme.css exists
```bash
ls -la src/styles/theme.css
```

---

## PHASE 2: DELETE DUPLICATE VARIABLE FILES

### Step 2.1: Delete old variable systems
```bash
# Old theme variables (26KB - replaced by theme.css)
rm -f src/theme/variables.css

# Old global styles (13KB - replaced by theme.css)
rm -f src/theme/global.css

# Old tokens (8.8KB - replaced by theme.css)
rm -f src/styles/tokens.css

# Premium tokens (merged into theme.css)
rm -f src/styles/premium-tokens.css

# Premium effects (merged into theme.css)
rm -f src/styles/premium-effects.css

# Ambient background (merged into theme.css)
rm -f src/styles/ambient-background.css

# Old utilities (Tailwind replaces this)
rm -f src/styles/utilities.css

# Delete entire duplicate theme system
rm -rf src/systems/theme/
```

### Step 2.2: Verify deletions
```bash
ls src/styles/
ls src/theme/
ls src/systems/
```

Expected remaining in `src/styles/`:
- theme.css (new)
- animations.css
- game-container.css
- game-colors.css (review if needed)
- mobile.css
- shop-cosmetics.css
- profile.css
- drawer-customization.css
- voting.css

---

## PHASE 3: SIMPLIFY INDEX.CSS

### Step 3.1: Replace src/index.css contents

Replace the entire 1317-line index.css with this minimal version:

```css
/* ============================================
   WOJAK.INK - Main CSS Entry Point
   ============================================ */

/* Theme - Single source of truth for all visual styles */
@import './styles/theme.css';

/* Tailwind - Layout utilities only */
@import "tailwindcss";

/* Animations */
@import './styles/animations.css';

/* Feature-specific styles */
@import './styles/game-container.css';
@import './styles/mobile.css';

/* Safe area insets for mobile */
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}
```

### Step 3.2: Update main.tsx imports

Edit `src/main.tsx` to remove old imports:

```tsx
// REMOVE these lines:
import '@ionic/react/css/core.css'   // DELETE
import './styles/tokens.css'          // DELETE
import './styles/utilities.css'       // DELETE

// KEEP only:
import './index.css'
import './styles/shop-cosmetics.css'
import './styles/animations.css'  // if not in index.css
```

---

## PHASE 4: CHECK IONIC USAGE

### Step 4.1: Search for Ionic components
```bash
grep -r "IonButton\|IonCard\|IonPage\|IonContent\|IonHeader\|IonApp\|IonRouterOutlet" src/ --include="*.tsx" --include="*.ts"
```

### Step 4.2: If Ionic components ARE used
Keep Ionic but clean up overrides:
```bash
# Just remove the heavy override file
rm -f src/theme/ionic-overrides.css
```

### Step 4.3: If Ionic components are NOT used
Remove Ionic completely:
```bash
# Uninstall packages
npm uninstall @ionic/react @ionic/core

# Remove ionic-overrides.css
rm -f src/theme/ionic-overrides.css

# Edit main.tsx - remove these lines:
# import { setupIonicReact } from '@ionic/react'
# import '@ionic/react/css/core.css'
# setupIonicReact({ mode: 'ios' })
```

---

## PHASE 5: REMOVE THEME SWITCHING

### Step 5.1: Identify theme-related files
```bash
# Find all theme-related files
grep -rn "ThemeContext\|ThemeProvider\|useTheme\|setTheme\|toggleTheme" src/ --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u
```

### Step 5.2: Delete theme context and components
```bash
rm -f src/contexts/ThemeContext.tsx
rm -f src/components/theme/ThemeSwitcher.tsx
rm -f src/types/theme.ts
rm -f src/hooks/useTheme.ts
```

### Step 5.3: Edit App.tsx
Remove ThemeProvider wrapper:

```tsx
// DELETE this import:
import { ThemeProvider } from '@/contexts/ThemeContext';

// DELETE ThemeProvider wrapper from JSX:
// <ThemeProvider>
//   ...
// </ThemeProvider>
```

### Step 5.4: Edit components that use useTheme
Search and update these files:
```bash
grep -rn "useTheme" src/components/ --include="*.tsx"
```

Replace `useTheme()` usage with static dark theme assumptions:
```tsx
// BEFORE:
const { isDark, theme } = useTheme();

// AFTER:
// Delete the import and const - just use dark theme styles
```

### Step 5.5: Remove data-theme attributes
```bash
grep -rn 'data-theme' src/ --include="*.tsx" --include="*.ts"
```
Remove any `data-theme` attribute setting code.

---

## PHASE 6: FIX !important HACKS

### Step 6.1: Audit highest offenders
```bash
grep -c "!important" src/pages/BlockPuzzle.css  # 286
grep -c "!important" src/pages/BrickByBrick.css  # 70
grep -c "!important" src/systems/game-ui/mobile-game-ui.css  # 64
```

### Step 6.2: Strategy for each file

For game CSS files with heavy !important:
1. Check if styles conflict with Ionic (now removed)
2. Check if styles conflict with old theme system (now removed)
3. Remove !important one by one, test after each
4. If a style breaks without !important, increase specificity properly

### Step 6.3: Common patterns to fix

```css
/* BEFORE (bad) */
.game-button {
  background: #ff6b00 !important;
}

/* AFTER (good) */
.game-container .game-button {
  background: var(--color-primary);
}
```

---

## PHASE 7: UPDATE COMPONENTS

### Step 7.1: Search for old class patterns
```bash
# Find components using old class names
grep -rn "nft-card\|glass-card\|premium-card" src/components/ --include="*.tsx"
```

### Step 7.2: Replace with new theme classes

```tsx
// OLD patterns → NEW patterns

// Cards
"nft-card" → "card"
"glass-card" → "card"
"card-container" → "card"

// Buttons
"primary-btn" → "btn btn-primary"
"secondary-btn" → "btn btn-secondary"
"ghost-btn" → "btn btn-ghost"

// Text
style={{ color: '#a0a0b0' }} → className="text-secondary"
style={{ color: '#ff6b00' }} → className="text-accent"
```

---

## PHASE 8: UPDATE TAILWIND CONFIG

### Step 8.1: Simplify tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // DO NOT define colors here
      // All colors come from theme.css CSS variables
    },
  },
  plugins: [],
}
```

---

## PHASE 9: TEST

### Step 9.1: Start dev server
```bash
npm run dev
```

### Step 9.2: Check each route
Visit each route and verify styling:
- / (home/landing)
- /gallery
- /bigpulp
- /generator
- /games
- /leaderboard
- /shop
- /guild
- /treasury
- /settings
- /account

### Step 9.3: Check browser console
No CSS errors should appear.

### Step 9.4: Test interactions
- Card hover effects
- Button clicks
- Form inputs
- Modal dialogs
- Mobile responsive

---

## PHASE 10: COMMIT

```bash
git add .
git commit -m "refactor: consolidate CSS to single theme.css

- Remove 6 duplicate variable systems
- Remove theme switching (dark mode only)
- Remove Ionic dependencies (if applicable)
- Fix !important hacks
- Reduce index.css from 1317 to ~50 lines

BREAKING: Light, void, tang-orange, chia-green themes removed"
```

---

## ROLLBACK IF NEEDED

If something breaks badly:
```bash
git checkout main -- src/
git checkout main -- package.json
npm install
```

---

## POST-CLEANUP RULES

### In theme.css ONLY:
- Colors: `--color-*`
- Shadows: `--shadow-*`
- Borders: `--radius-*`, `--color-border-*`
- Typography: `--font-*`, `--text-*`
- Component classes: `.card`, `.btn`, `.input`, `.badge`

### In Tailwind ONLY:
- Layout: `flex`, `grid`, `gap-*`, `p-*`, `m-*`
- Sizing: `w-*`, `h-*`, `max-w-*`
- Positioning: `absolute`, `relative`, `fixed`
- Responsive: `md:`, `lg:`

### NEVER:
- `!important`
- Inline color styles
- New CSS variable files
- Colors in Tailwind config
