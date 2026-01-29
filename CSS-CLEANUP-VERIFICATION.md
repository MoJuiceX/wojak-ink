# CSS CLEANUP - FINAL VERIFICATION CHECKLIST

Run `npm run dev` and test each item below.

---

## Core UI Components

### Sign In Button
- [ ] Sign in button appears with correct styling
- [ ] Click shows Google sign-in flow
- [ ] Loading spinner appears during auth
- [ ] When signed in: avatar button appears
- [ ] Click avatar → dropdown menu opens
- [ ] Menu items (Change Avatar, Connect Wallet, Sign Out) are clickable
- [ ] Menu closes when clicking outside

### Settings Page
- [ ] Page loads without errors
- [ ] All Toggle switches work (click to toggle on/off)
- [ ] Toggle animations are smooth
- [ ] Settings sections expand/collapse properly

### Notification Settings
- [ ] "Enable Notifications" button styled correctly
- [ ] When enabled: toggle switches appear for each preference
- [ ] Toggles respond to clicks
- [ ] "Test" and "Disable All" buttons work

---

## BigPulp / TraitValues

### TraitValues Component
- [ ] Page loads with spinner, then shows data
- [ ] Category dropdown opens and shows options
- [ ] Selecting a category filters the table
- [ ] Search input works (type to filter)
- [ ] Search icon appears inside input
- [ ] Table headers are clickable for sorting
- [ ] Sort indicators (▲/▼) appear
- [ ] Click row → expands to show sales detail
- [ ] Sales sort buttons (💰 👑 🕐) work
- [ ] Images load in sales carousel

### AskBigPulp Component
- [ ] All section headers show lucide-react icons (not broken)
- [ ] Icons: BarChart3, GraduationCap, Flame, Tag, Diamond
- [ ] Chevron icons toggle direction on expand/collapse
- [ ] Sections expand/collapse smoothly
- [ ] Loading spinners appear while data loads
- [ ] NFT images load correctly (using native `<img>`)
- [ ] HP trait carousels work (prev/next buttons)
- [ ] Combo badges carousels work

---

## Games

### Game Pages (spot check 2-3)
- [ ] BlockPuzzle loads
- [ ] FlappyOrange loads
- [ ] OrangeSnake loads
- [ ] Orange2048 loads
- [ ] Icons display correctly (lucide-react)
- [ ] No console errors about missing Ionic components

---

## PWA Components

### Install Prompts
- [ ] InstallBanner displays correctly (if applicable)
- [ ] InstallPrompt modal works (if applicable)
- [ ] Buttons styled with `.btn` classes

---

## General

### Console Errors
- [ ] No errors about `@ionic/react`
- [ ] No errors about `ionicons`
- [ ] No errors about missing imports
- [ ] No "Failed to resolve" errors

### Visual Consistency
- [ ] All buttons use consistent `.btn` styling
- [ ] All spinners look the same (LoadingSpinner)
- [ ] All icons are from lucide-react (consistent stroke width)
- [ ] Colors match theme.css variables

---

## Build Verification

```bash
# Already done by Claude CLI, but double-check:
npm run build
```

- [ ] Build completes with no errors
- [ ] No TypeScript errors
- [ ] No unused import warnings for Ionic

---

## When All Checks Pass

```bash
git add -A && git commit -m "refactor: complete CSS cleanup phases 1-5

- Consolidated 7 CSS systems → 1 theme.css
- Removed 5 themes, kept tang-orange/dark only
- Deleted 50+ unused files (hooks, components, CSS)
- Removed @ionic/react and ionicons completely (24 files updated)
- Replaced with native components (LoadingSpinner, Toggle, Dropdown)
- All icons now use lucide-react
- Smaller bundle, no more CSS conflicts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Files Modified in Phase 5

| File | Changes |
|------|---------|
| main.tsx | Removed setupIonicReact |
| SignInButton.tsx | Full rewrite |
| NotificationSettings.tsx | Full rewrite |
| TraitValues.tsx | Full rewrite |
| AskBigPulp.tsx | Icon/img/spinner replacement |
| DailyRewardModal.tsx | Removed IonModal |
| UsernamePicker.tsx | Removed IonModal |
| SettingsPage.tsx | Full rewrite |
| AdminStats.tsx | Full rewrite |
| BlockPuzzle.tsx | Replaced icons |
| BrickByBrick.tsx | Replaced IonButton |
| FlappyOrange.tsx | Replaced icons |
| OrangeSnake.tsx | Replaced icons |
| Game.tsx | Full rewrite |
| KnifeGame.tsx | Replaced IonPage |
| Orange2048.tsx | Full rewrite |
| games/KnifeGame/index.tsx | Replaced IonPage |
| games/Orange2048/index.tsx | Replaced components |
| MarketHeatmap.tsx | Full rewrite |
| QuestionTree.tsx | Replaced components |
| FloatingVideoPlayer.tsx | Replaced icons |
| HapticSettings.tsx | Full rewrite |
| InstallBanner.tsx | Replaced IonButton |
| InstallPrompt.tsx | Replaced IonModal |
