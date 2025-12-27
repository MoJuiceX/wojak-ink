# Windows 98 Desktop App - QA Strategy & Test Plan

**Date:** 2024  
**Scope:** Comprehensive regression-proof QA strategy  
**Goal:** Define testing approach, automation priorities, and coverage matrix

---

## EXECUTIVE SUMMARY

This document defines a **comprehensive QA strategy** for the Windows 98 desktop-style NFT showcase app. The strategy balances **automated testing** for critical logic and **manual testing** for visual/UX validation.

**Testing Philosophy:**
- **Automate:** Business logic, API integrations, trait rules, data flows
- **Manual:** Visual regressions, Windows 98 authenticity, UX polish, animations
- **Hybrid:** E2E flows for critical user paths, visual regression for UI consistency

**Coverage Goals:**
- **Unit Tests:** 80%+ coverage for utilities, rules, API services
- **Integration Tests:** All context providers, window management, state flows
- **E2E Tests:** All golden path user flows
- **Visual Regression:** All windows, themes, responsive breakpoints

---

## GOLDEN PATH USER FLOWS

### Flow 1: First-Time User Experience
1. **App loads** → Startup sequence displays
2. **Skip startup** → Desktop appears with icons
3. **Click Start** → Start menu opens
4. **Select "WOJAK_CREATOR.EXE"** → Wojak Generator window opens
5. **Select traits** → Preview updates in real-time
6. **Export wojak** → PNG downloads successfully
7. **Close window** → Window closes, taskbar updates

**Success Criteria:**
- ✅ Startup sequence shows once per session
- ✅ Desktop icons are clickable
- ✅ Start menu opens/closes correctly
- ✅ Wojak Generator opens and renders
- ✅ Trait selection updates preview
- ✅ Export creates valid PNG file

---

### Flow 2: Wojak Creation with Rules
1. **Open Wojak Generator**
2. **Select "Astronaut" clothes** → Head layer becomes disabled
3. **Select "Facial Hair"** → MouthBase auto-changes to "Numb"
4. **Select "Bubble Gum" mouth** → MouthItem becomes disabled
5. **Select "Pipe" mouth** → MouthItem becomes disabled
6. **Randomize** → All traits change, rules still apply
7. **Export** → Valid wojak PNG created

**Success Criteria:**
- ✅ Layer rules apply correctly
- ✅ Auto-selections work (Base → Classic, Facial Hair → Numb)
- ✅ Disabled layers show correct reason
- ✅ Randomize respects all rules
- ✅ Export produces valid image

---

### Flow 3: Theme Customization
1. **Right-click desktop** → Context menu appears
2. **Select "Properties"** → Display Properties window opens
3. **Change theme to "Spruce"** → All windows update instantly
4. **Change accent color** → Selection highlights update
5. **Change wallpaper** → Desktop background updates
6. **Close window** → Theme persists on reload

**Success Criteria:**
- ✅ Theme changes apply system-wide
- ✅ Taskbar updates instantly
- ✅ All open windows update
- ✅ No gray remnants in colored themes
- ✅ Settings persist in localStorage

---

### Flow 4: Marketplace NFT Management
1. **Open Marketplace window**
2. **Filter by group** → Only selected group shows
3. **Click NFT card** → Offer file modal opens
4. **Copy offer file** → Clipboard contains valid offer
5. **View offer details** → Dexie API resolves correctly
6. **Close modal** → Returns to marketplace

**Success Criteria:**
- ✅ Filters work correctly
- ✅ NFT cards load with images
- ✅ Offer files copy to clipboard
- ✅ API calls succeed (or show error)
- ✅ Modal opens/closes smoothly

---

### Flow 5: Window Management
1. **Open 3 windows** → All stack correctly
2. **Click window** → Brings to front
3. **Drag window** → Moves smoothly
4. **Resize window** → Size updates correctly
5. **Minimize window** → Hides, taskbar shows
6. **Maximize window** → Fills screen
7. **Close window** → Removes from taskbar

**Success Criteria:**
- ✅ Z-index stacking works
- ✅ Active window highlighted
- ✅ Drag/resize smooth
- ✅ Taskbar syncs with windows
- ✅ No visual glitches

---

### Flow 6: Mobile Experience
1. **Open on mobile** → Responsive layout loads
2. **Tap Start** → Start menu opens
3. **Open Wojak Generator** → Mobile bottom sheet appears
4. **Select traits** → Preview updates
5. **Export** → Image downloads (iOS: Photos, Android: Downloads)
6. **Close window** → Returns to desktop

**Success Criteria:**
- ✅ Touch targets ≥ 44px
- ✅ No horizontal scroll
- ✅ Bottom sheet works
- ✅ Images download correctly
- ✅ Safe area respected

---

## HIGH-RISK REGRESSION AREAS

### 🔴 CRITICAL (Must Test Every Release)

1. **Wojak Trait Rules** (`src/utils/wojakRules.js`)
   - **Risk:** Complex rule logic, many edge cases
   - **Impact:** Broken wojaks, invalid combinations
   - **Test:** Unit tests for all rules, integration tests for UI

2. **Window Management** (`src/contexts/WindowContext.jsx`)
   - **Risk:** Z-index bugs, position loss, stacking issues
   - **Impact:** Windows overlap incorrectly, can't access content
   - **Test:** Integration tests for stacking, E2E for drag/resize

3. **Theme System** (`src/index.css`, `src/App.jsx`)
   - **Risk:** Mixed UI states, hardcoded colors
   - **Impact:** Visual inconsistency, broken themes
   - **Test:** Visual regression, integration tests for theme switching

4. **API Integrations** (`src/services/`)
   - **Risk:** API changes, network failures, rate limits
   - **Impact:** Broken features, poor error handling
   - **Test:** Unit tests with mocks, integration tests with real APIs

5. **Image Loading** (`src/utils/imageUtils.js`, `src/hooks/useMemeGenerator.js`)
   - **Risk:** Broken images, memory leaks, loading failures
   - **Impact:** Blank wojaks, performance issues
   - **Test:** Unit tests for loading logic, E2E for image rendering

---

### 🟡 HIGH (Test Before Major Releases)

6. **localStorage Operations** (`src/utils/desktopStorage.js`)
   - **Risk:** Quota exceeded, data loss, corruption
   - **Impact:** Lost user data, broken features
   - **Test:** Unit tests for error handling, integration tests for persistence

7. **Keyboard Shortcuts** (`src/hooks/useKeyboardShortcuts.js`)
   - **Risk:** Conflicts, missing shortcuts, broken navigation
   - **Impact:** Poor accessibility, broken workflows
   - **Test:** E2E tests for all shortcuts

8. **Mobile Interactions** (`src/components/meme/MobileTraitBottomSheet.jsx`)
   - **Risk:** Touch issues, scroll lock bugs, safe area problems
   - **Impact:** Unusable on mobile
   - **Test:** Manual mobile testing, E2E on mobile devices

9. **Canvas Rendering** (`src/hooks/useMemeGenerator.js`)
   - **Risk:** Rendering bugs, layer order, performance
   - **Impact:** Broken wojak preview, slow performance
   - **Test:** Visual regression, performance tests

10. **Error Boundaries** (`src/components/GlobalErrorBoundary.jsx`)
    - **Risk:** Uncaught errors, poor error messages
    - **Impact:** App crashes, poor UX
    - **Test:** Integration tests for error scenarios

---

### 🟢 MEDIUM (Test Periodically)

11. **Easter Eggs** (`src/components/ZooEasterEgg.jsx`, etc.)
    - **Risk:** Broken triggers, performance issues
    - **Impact:** Missing features, crashes
    - **Test:** Manual testing, smoke tests

12. **Sound Effects** (`src/utils/soundManager.js`)
    - **Risk:** Missing sounds, mute not working
    - **Impact:** Poor UX, broken features
    - **Test:** Manual testing, integration tests for mute

13. **Games** (`src/components/windows/PinballWindow.jsx`, etc.)
    - **Risk:** Game logic bugs, performance issues
    - **Impact:** Broken games, poor performance
    - **Test:** Manual testing, smoke tests

---

## AUTOMATED TESTING STRATEGY

### 1. Unit Tests

**Framework:** Vitest (Vite-native, fast, compatible with React)

**Coverage Target:** 80%+ for utilities, rules, services

**Priority Files:**
```
src/utils/wojakRules.js          # 🔴 CRITICAL - All rules
src/utils/imageUtils.js          # 🔴 CRITICAL - Image loading
src/services/tangifyApi.js        # 🔴 CRITICAL - API calls
src/services/mintgardenApi.js    # 🔴 CRITICAL - API calls
src/utils/desktopStorage.js      # 🟡 HIGH - localStorage
src/utils/filenameUtils.js       # 🟡 HIGH - Naming logic
src/utils/nftResolver.js         # 🟡 HIGH - Offer parsing
src/lib/traitOptions.js          # 🟡 HIGH - Label formatting
```

**Example Test Structure:**
```javascript
// src/utils/wojakRules.test.js
import { describe, it, expect } from 'vitest'
import { getDisabledLayers } from './wojakRules'

describe('Wojak Rules', () => {
  describe('ruleAstronautNoHead', () => {
    it('should disable Head when Astronaut clothes selected', () => {
      const selectedLayers = {
        Clothes: '/wojak-creator/CLOTHES/CLOTHES_Astronaut.png',
        Head: '/wojak-creator/HEAD/HEAD_Classic.png'
      }
      const result = getDisabledLayers(selectedLayers)
      expect(result.disabledLayers).toContain('Head')
    })
    
    it('should not disable Head when other clothes selected', () => {
      const selectedLayers = {
        Clothes: '/wojak-creator/CLOTHES/CLOTHES_Sports_Jacket.png'
      }
      const result = getDisabledLayers(selectedLayers)
      expect(result.disabledLayers).not.toContain('Head')
    })
  })
  
  describe('ruleFacialHairRequiresMouthBase', () => {
    it('should auto-set MouthBase to Numb when FacialHair selected', () => {
      const selectedLayers = {
        FacialHair: '/wojak-creator/FACIAL_HAIR/FACIAL_HAIR_Beard.png'
      }
      const result = getDisabledLayers(selectedLayers)
      expect(result.forceSelections.MouthBase).toBe('/wojak-creator/MOUTH/MOUTH_numb.png')
    })
    
    it('should clear FacialHair when incompatible MouthBase selected', () => {
      const selectedLayers = {
        MouthBase: '/wojak-creator/MOUTH/MOUTH_Bubble_Gum.png',
        FacialHair: '/wojak-creator/FACIAL_HAIR/FACIAL_HAIR_Beard.png'
      }
      const result = getDisabledLayers(selectedLayers)
      expect(result.clearSelections).toContain('FacialHair')
    })
  })
  
  // Test all 15+ rules...
})
```

**Test Files to Create:**
- `src/utils/wojakRules.test.js`
- `src/utils/imageUtils.test.js`
- `src/services/tangifyApi.test.js`
- `src/services/mintgardenApi.test.js`
- `src/utils/desktopStorage.test.js`
- `src/utils/filenameUtils.test.js`
- `src/utils/nftResolver.test.js`
- `src/lib/traitOptions.test.js`

---

### 2. Integration Tests

**Framework:** Vitest + React Testing Library

**Coverage Target:** All context providers, window management, state flows

**Priority Areas:**
```
src/contexts/WindowContext.jsx       # 🔴 CRITICAL - Window management
src/contexts/MarketplaceContext.jsx   # 🔴 CRITICAL - Marketplace state
src/contexts/ToastContext.jsx         # 🟡 HIGH - Toast notifications
src/hooks/useMemeGenerator.js        # 🔴 CRITICAL - Wojak generation
src/hooks/useDraggable.js            # 🟡 HIGH - Window dragging
```

**Example Test Structure:**
```javascript
// src/contexts/WindowContext.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { WindowProvider, useWindow } from './WindowContext'

describe('WindowContext', () => {
  it('should register and unregister windows', () => {
    const TestComponent = () => {
      const { openWindow, closeWindow, getAllWindows } = useWindow()
      
      return (
        <div>
          <button onClick={() => openWindow('test-window', { title: 'Test' })}>
            Open
          </button>
          <button onClick={() => closeWindow('test-window')}>
            Close
          </button>
          <div data-testid="count">{getAllWindows().length}</div>
        </div>
      )
    }
    
    render(
      <WindowProvider>
        <TestComponent />
      </WindowProvider>
    )
    
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    
    act(() => {
      screen.getByText('Open').click()
    })
    
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    
    act(() => {
      screen.getByText('Close').click()
    })
    
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })
  
  it('should manage window z-index correctly', () => {
    // Test z-index stacking...
  })
  
  it('should persist window positions', () => {
    // Test localStorage persistence...
  })
})
```

**Test Files to Create:**
- `src/contexts/WindowContext.test.jsx`
- `src/contexts/MarketplaceContext.test.jsx`
- `src/hooks/useMemeGenerator.test.jsx`
- `src/hooks/useDraggable.test.jsx`

---

### 3. E2E Tests (Playwright)

**Framework:** Playwright (cross-browser, mobile support, visual regression)

**Coverage Target:** All golden path user flows

**Priority Flows:**
1. ✅ First-time user experience
2. ✅ Wojak creation with rules
3. ✅ Theme customization
4. ✅ Marketplace NFT management
5. ✅ Window management
6. ✅ Mobile experience

**Example Test Structure:**
```javascript
// tests/e2e/wojak-creator.spec.js
import { test, expect } from '@playwright/test'

test.describe('Wojak Creator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    // Skip startup sequence
    await page.keyboard.press('Escape')
  })
  
  test('should open Wojak Generator from Start menu', async ({ page }) => {
    // Click Start button
    await page.click('[aria-label="Start menu"]')
    
    // Click WOJAK_CREATOR.EXE
    await page.click('text=WOJAK_CREATOR.EXE')
    
    // Verify window opens
    await expect(page.locator('#wojak-generator-window')).toBeVisible()
    await expect(page.locator('.title-bar-text:has-text("WOJAK_CREATOR.EXE")')).toBeVisible()
  })
  
  test('should apply trait rules correctly', async ({ page }) => {
    // Open Wojak Generator
    await page.click('[aria-label="Start menu"]')
    await page.click('text=WOJAK_CREATOR.EXE')
    
    // Select Astronaut clothes
    await page.selectOption('[data-layer="Clothes"]', { label: /Astronaut/i })
    
    // Verify Head layer is disabled
    const headSelect = page.locator('[data-layer="Head"]')
    await expect(headSelect).toBeDisabled()
    
    // Verify reason tooltip
    await headSelect.hover()
    await expect(page.locator('text=Astronaut suit includes helmet')).toBeVisible()
  })
  
  test('should export wojak as PNG', async ({ page }) => {
    // Open and configure wojak...
    
    // Click Export button
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.png$/i)
    
    // Verify file is valid image
    const path = await download.path()
    // Add image validation...
  })
  
  test('should randomize while respecting rules', async ({ page }) => {
    // Open Wojak Generator
    // Select Astronaut (disables Head)
    // Click Randomize
    // Verify Head remains disabled
    // Verify all other traits changed
  })
})
```

**Test Files to Create:**
- `tests/e2e/wojak-creator.spec.js`
- `tests/e2e/window-management.spec.js`
- `tests/e2e/theme-customization.spec.js`
- `tests/e2e/marketplace.spec.js`
- `tests/e2e/mobile.spec.js`
- `tests/e2e/keyboard-shortcuts.spec.js`

---

### 4. Visual Regression Tests

**Framework:** Playwright + Percy (or Playwright's built-in visual comparison)

**Coverage Target:** All windows, themes, responsive breakpoints

**Priority Screens:**
```
Desktop (1920x1080):
  - Desktop with icons
  - Wojak Generator window (all themes)
  - Marketplace window
  - Gallery window
  - Display Properties window
  - Start menu
  - Taskbar (all states)

Mobile (375x667):
  - Desktop layout
  - Wojak Generator (bottom sheet)
  - Window (fullscreen)
  - Start menu

Themes:
  - Classic
  - Spruce (Green)
  - Light
  - Dark
  - All accent colors
```

**Example Test Structure:**
```javascript
// tests/visual/theme-regression.spec.js
import { test, expect } from '@playwright/test'

test.describe('Theme Visual Regression', () => {
  const themes = ['classic', 'spruce', 'light', 'dark']
  const accents = ['blue', 'orange', 'green', 'red']
  
  for (const theme of themes) {
    for (const accent of accents) {
      test(`should match ${theme} theme with ${accent} accent`, async ({ page }) => {
        await page.goto('http://localhost:5173')
        await page.keyboard.press('Escape') // Skip startup
        
        // Set theme via Display Properties
        await page.evaluate(({ theme, accent }) => {
          document.documentElement.setAttribute('data-theme', theme)
          document.documentElement.setAttribute('data-accent', accent)
        }, { theme, accent })
        
        // Wait for theme to apply
        await page.waitForTimeout(100)
        
        // Take screenshot
        await expect(page).toHaveScreenshot(`theme-${theme}-accent-${accent}.png`, {
          fullPage: true,
          animations: 'disabled'
        })
      })
    }
  }
  
  test('should match Wojak Generator in all themes', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.keyboard.press('Escape')
    
    // Open Wojak Generator
    await page.click('[aria-label="Start menu"]')
    await page.click('text=WOJAK_CREATOR.EXE')
    
    for (const theme of themes) {
      await page.evaluate((theme) => {
        document.documentElement.setAttribute('data-theme', theme)
      }, theme)
      
      await page.waitForTimeout(100)
      
      const window = page.locator('#wojak-generator-window')
      await expect(window).toHaveScreenshot(`wojak-generator-${theme}.png`, {
        animations: 'disabled'
      })
    }
  })
})
```

**Test Files to Create:**
- `tests/visual/theme-regression.spec.js`
- `tests/visual/window-regression.spec.js`
- `tests/visual/mobile-regression.spec.js`
- `tests/visual/component-regression.spec.js`

---

## QA TEST MATRIX

### Manual Test Coverage

| Feature | Smoke | Full | Regression | Notes |
|---------|-------|------|------------|-------|
| **Core Windows 98 UI** | ✅ | ✅ | ✅ | Visual validation required |
| **Wojak Creator** | ✅ | ✅ | ✅ | Rule logic automated |
| **Theme System** | ✅ | ✅ | ✅ | Visual regression automated |
| **Marketplace** | ✅ | ✅ | ✅ | API integration automated |
| **Gallery** | ✅ | ✅ | ⚠️ | Image loading automated |
| **Paint Window** | ✅ | ⚠️ | ❌ | Third-party, smoke test only |
| **Window Management** | ✅ | ✅ | ✅ | E2E automated |
| **Keyboard Shortcuts** | ✅ | ✅ | ⚠️ | E2E automated |
| **Mobile Experience** | ✅ | ✅ | ⚠️ | Manual + E2E |
| **Easter Eggs** | ⚠️ | ❌ | ❌ | Manual only |
| **Games** | ⚠️ | ❌ | ❌ | Manual only |
| **Sound Effects** | ✅ | ⚠️ | ❌ | Manual only |

**Legend:**
- ✅ = Full coverage (automated + manual)
- ⚠️ = Partial coverage (manual or limited automation)
- ❌ = No coverage (manual only, low priority)

---

### Automated Test Coverage

| Area | Unit | Integration | E2E | Visual | Coverage % |
|------|------|-------------|-----|--------|------------|
| **Wojak Rules** | ✅ | ✅ | ✅ | ❌ | 95% |
| **Window Management** | ⚠️ | ✅ | ✅ | ✅ | 85% |
| **Theme System** | ⚠️ | ✅ | ✅ | ✅ | 80% |
| **API Services** | ✅ | ✅ | ⚠️ | ❌ | 90% |
| **Image Loading** | ✅ | ✅ | ✅ | ❌ | 85% |
| **localStorage** | ✅ | ✅ | ⚠️ | ❌ | 80% |
| **Keyboard Shortcuts** | ❌ | ⚠️ | ✅ | ❌ | 70% |
| **Mobile UI** | ❌ | ⚠️ | ✅ | ✅ | 75% |

---

## SUGGESTED TEST FILES

### Unit Tests (Vitest)

```
src/
  utils/
    wojakRules.test.js              # All 15+ rules
    imageUtils.test.js              # Image loading, caching
    desktopStorage.test.js          # localStorage operations
    filenameUtils.test.js           # Naming logic
    nftResolver.test.js             # Offer parsing
  services/
    tangifyApi.test.js              # API calls, error handling
    mintgardenApi.test.js           # API calls, rate limiting
  lib/
    traitOptions.test.js            # Label formatting
```

### Integration Tests (Vitest + React Testing Library)

```
src/
  contexts/
    WindowContext.test.jsx          # Window management
    MarketplaceContext.test.jsx      # Marketplace state
    ToastContext.test.jsx           # Toast notifications
  hooks/
    useMemeGenerator.test.jsx       # Wojak generation
    useDraggable.test.jsx           # Window dragging
    useTheme.test.jsx               # Theme switching
```

### E2E Tests (Playwright)

```
tests/
  e2e/
    wojak-creator.spec.js           # Golden path 2
    window-management.spec.js       # Golden path 5
    theme-customization.spec.js    # Golden path 3
    marketplace.spec.js             # Golden path 4
    first-time-user.spec.js         # Golden path 1
    mobile.spec.js                  # Golden path 6
    keyboard-shortcuts.spec.js      # Keyboard navigation
```

### Visual Regression Tests (Playwright)

```
tests/
  visual/
    theme-regression.spec.js        # All themes/accents
    window-regression.spec.js       # All windows
    mobile-regression.spec.js       # Mobile layouts
    component-regression.spec.js    # Individual components
```

---

## AUTOMATION PRIORITIES

### Phase 1: Critical Business Logic (Week 1-2)
**Goal:** Prevent broken wojaks and invalid combinations

1. ✅ **Wojak Rules Unit Tests** (P0)
   - All 15+ rules
   - Edge cases (empty selections, invalid combinations)
   - Auto-selections (Base → Classic, Facial Hair → Numb)

2. ✅ **API Service Unit Tests** (P0)
   - Tangify API (success, failure, retry)
   - MintGarden API (success, 429, timeout)
   - Error handling

3. ✅ **Image Loading Unit Tests** (P0)
   - Load success/failure
   - Caching logic
   - Error recovery

**Expected Outcome:** 80%+ coverage for critical logic, catch rule bugs before release

---

### Phase 2: Integration & E2E (Week 3-4)
**Goal:** Test user flows end-to-end

4. ✅ **Window Management Integration Tests** (P0)
   - Window registration/unregistration
   - Z-index stacking
   - Position persistence

5. ✅ **Wojak Creator E2E Tests** (P0)
   - Open from Start menu
   - Select traits
   - Apply rules
   - Export PNG

6. ✅ **Theme System E2E Tests** (P1)
   - Change theme
   - Verify system-wide update
   - Persist on reload

**Expected Outcome:** All golden paths covered, catch integration bugs

---

### Phase 3: Visual Regression (Week 5-6)
**Goal:** Prevent visual regressions

7. ✅ **Theme Visual Regression** (P1)
   - All themes × all accents
   - All windows in each theme

8. ✅ **Window Visual Regression** (P1)
   - All windows in default theme
   - Responsive breakpoints

9. ✅ **Mobile Visual Regression** (P2)
   - Mobile layouts
   - Bottom sheets
   - Safe areas

**Expected Outcome:** Visual consistency, catch UI regressions

---

### Phase 4: Polish & Edge Cases (Week 7+)
**Goal:** Comprehensive coverage

10. ✅ **Keyboard Shortcuts E2E** (P2)
    - All shortcuts
    - Conflicts
    - Accessibility

11. ✅ **Marketplace E2E** (P2)
    - Filter by group
    - Copy offer files
    - API error handling

12. ✅ **Mobile E2E** (P2)
    - Touch interactions
    - Bottom sheet
    - Image downloads

**Expected Outcome:** Comprehensive test coverage, production-ready

---

## WHAT SHOULD REMAIN MANUAL

### Visual/UX Validation
- ✅ **Windows 98 Authenticity** - Pixel-perfect validation requires human eye
- ✅ **Animation Smoothness** - Subjective, hard to automate
- ✅ **Color Accuracy** - Theme colors must match Windows 98 exactly
- ✅ **Typography** - Font rendering, spacing, line-height
- ✅ **Hover Effects** - Tooltips, button states, transitions

### Complex Interactions
- ✅ **Drag & Drop Feel** - Smoothness, responsiveness
- ✅ **Touch Gestures** - Swipe, pinch, long-press
- ✅ **Keyboard Navigation Flow** - Tab order, focus management
- ✅ **Error Message Clarity** - User-friendly language

### Performance
- ✅ **Perceived Performance** - How fast it "feels"
- ✅ **Animation Frame Rate** - Smooth 60fps
- ✅ **Memory Usage** - No leaks, reasonable consumption
- ✅ **Network Throttling** - Slow 3G experience

### Edge Cases
- ✅ **Browser Compatibility** - Safari, Chrome, Firefox differences
- ✅ **Device-Specific** - iOS Safari quirks, Android Chrome
- ✅ **Offline Behavior** - Network failure handling
- ✅ **Large Datasets** - 1000+ NFTs, many windows

### Easter Eggs & Games
- ✅ **Easter Egg Triggers** - Konami code, special clicks
- ✅ **Game Playability** - Pinball, Minesweeper, etc.
- ✅ **Sound Effects** - Audio quality, timing

---

## TEST EXECUTION STRATEGY

### Pre-Commit (Developer)
- ✅ Run unit tests: `npm test`
- ✅ Run linter: `npm run lint`
- ✅ Quick smoke test: Open app, check console

### Pre-PR (CI/CD)
- ✅ All unit tests
- ✅ All integration tests
- ✅ E2E tests for critical flows
- ✅ Visual regression (baseline comparison)

### Pre-Release (QA)
- ✅ Full manual test suite
- ✅ All automated tests
- ✅ Cross-browser testing (Chrome, Safari, Firefox)
- ✅ Mobile device testing (iOS, Android)
- ✅ Performance testing (Lighthouse)

### Post-Release (Monitoring)
- ✅ Error tracking (Sentry, etc.)
- ✅ User feedback
- ✅ Analytics (feature usage)

---

## TEST DATA & FIXTURES

### Wojak Test Data
```javascript
// tests/fixtures/wojak-test-data.js
export const VALID_WOJAK_COMBINATIONS = [
  {
    name: 'Classic Wojak',
    layers: {
      Base: '/wojak-creator/BASE/BASE_Base-Wojak_classic.png',
      Clothes: '/wojak-creator/CLOTHES/CLOTHES_Sports_Jacket.png',
      Eyes: '/wojak-creator/EYES/EYES_Classic.png',
      Head: '/wojak-creator/HEAD/HEAD_Classic.png',
      MouthBase: '/wojak-creator/MOUTH/MOUTH_numb.png'
    }
  },
  {
    name: 'Astronaut (Head disabled)',
    layers: {
      Base: '/wojak-creator/BASE/BASE_Base-Wojak_classic.png',
      Clothes: '/wojak-creator/CLOTHES/CLOTHES_Astronaut.png',
      // Head should be disabled
    }
  },
  // More test combinations...
]

export const INVALID_WOJAK_COMBINATIONS = [
  {
    name: 'Facial Hair + Bubble Gum',
    layers: {
      FacialHair: '/wojak-creator/FACIAL_HAIR/FACIAL_HAIR_Beard.png',
      MouthBase: '/wojak-creator/MOUTH/MOUTH_Bubble_Gum.png'
    },
    expectedError: 'Facial hair requires mouth base: numb, teeth, golden teeth, smile, screaming, pizza, or pipe'
  },
  // More invalid combinations...
]
```

### API Mock Data
```javascript
// tests/fixtures/api-mocks.js
export const MOCK_MINTGARDEN_RESPONSE = {
  data: {
    launcher_bech32: 'nft1...',
    metadata_json: {
      name: 'Wojak #123',
      token_id: '123'
    }
  }
}

export const MOCK_TANGIFY_RESPONSE = {
  imageData: 'data:image/png;base64,...'
}
```

---

## CONTINUOUS INTEGRATION

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test -- --coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: microsoft/playwright@v1
      - run: npm install
      - run: npm run build
      - run: npm run preview &
      - run: npm run test:e2e
      
  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: microsoft/playwright@v1
      - run: npm install
      - run: npm run build
      - run: npm run preview &
      - run: npm run test:visual
```

---

## METRICS & REPORTING

### Coverage Goals
- **Unit Tests:** 80%+ coverage for utilities, rules, services
- **Integration Tests:** 100% coverage for context providers
- **E2E Tests:** 100% coverage for golden paths
- **Visual Regression:** 100% coverage for all windows, themes

### Test Execution Metrics
- **Unit Tests:** < 30 seconds
- **Integration Tests:** < 2 minutes
- **E2E Tests:** < 10 minutes
- **Visual Regression:** < 5 minutes

### Quality Gates
- ✅ All tests must pass before merge
- ✅ Coverage must not decrease
- ✅ No visual regressions
- ✅ No console errors in E2E tests

---

## CONCLUSION

This QA strategy provides **comprehensive coverage** while balancing **automation** and **manual testing**:

**Strengths:**
- ✅ Critical business logic fully automated
- ✅ Golden paths covered end-to-end
- ✅ Visual regression prevents UI bugs
- ✅ Clear priorities and phases

**Next Steps:**
1. Set up Vitest for unit/integration tests
2. Set up Playwright for E2E tests
3. Implement Phase 1 (Critical Business Logic)
4. Gradually expand to Phase 2-4
5. Establish CI/CD pipeline

**Expected Outcome:** Regression-proof app with high confidence in releases.















