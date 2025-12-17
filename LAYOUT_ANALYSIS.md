# Layout Structure Analysis & Refactor Plan

## Current Layout Structure

### Overall Architecture

```
App.jsx
├── .desktop (main container)
│   ├── .bg-fixed (background image)
│   ├── OrangeTrail (game layer)
│   ├── Windows (absolute positioned)
│   │   ├── ReadmeWindow
│   │   ├── MintInfoWindow
│   │   ├── GalleryWindow
│   │   ├── FaqWindow
│   │   ├── TangGangWindow
│   │   ├── MarketplaceWindow
│   │   ├── WojakCreator (conditional)
│   │   └── PaintWindow (conditional)
│   ├── SideStack (window stacking)
│   ├── NotifyPopup (modal)
│   └── PerformanceDebug
└── Taskbar (fixed bottom)
    └── StartMenu (conditional)
```

### Header Structure
**No traditional header** - The app uses:
- **Taskbar** (fixed bottom, 30px height + safe-area)
  - Start button (left)
  - Window buttons (center tray)
  - Clock (right)
- **Window title bars** (per-window, 30px height)
  - Title text + icon
  - Control buttons (minimize/maximize/close)

### Generator Preview (WojakCreator)
**Desktop Layout (≥641px):**
```
Window Container (1000px × auto)
├── .meme-generator-container (flex row)
│   ├── Left Panel (450px fixed)
│   │   ├── "Meme Preview:" label
│   │   ├── MemeCanvas (400×400px, aspect-ratio preserved)
│   │   └── ExportControls (buttons)
│   └── Right Panel (flex: 1, min 250px)
│       ├── "Select Layers:" label
│       └── LayerSelector list (scrollable)
└── Footer (info text)
```

**Mobile Layout (≤640px):**
```
Window Container (full width)
├── .meme-generator-container (flex column)
│   └── Preview Panel (full width)
│       ├── "Meme Preview:" label
│       ├── MemeCanvas (responsive, aspect-ratio preserved)
│       └── ExportControls (buttons)
└── Footer (info text)

MobileTraitBottomSheet (portal, fixed bottom)
├── Collapsed State
│   ├── 3 Primary Buttons (Base, Head, Clothes)
│   └── Trait Summary
└── Expanded State (70dvh max-height)
    ├── Drag Handle
    ├── Header (title + close)
    ├── Search Input
    └── Full LayerSelector List (scrollable)
```

### Trait Menu (LayerSelector)
**Desktop:**
- Sidebar panel (right side of WojakCreator)
- Scrollable list of dropdowns
- Each LayerSelector has:
  - Label
  - Select dropdown
  - Tooltip (hover/long-press)

**Mobile:**
- Bottom sheet (collapsed/expanded states)
- Primary buttons for quick access
- Full list in expanded view with search

### Modals
**NotifyPopup:**
- Fixed position
- Centered via JavaScript calculation
- z-index: 1000000
- 640px width

**Marketplace Offer Modal:**
- Overlay (fixed, full screen)
- Centered content (90% width, max 600px)
- max-height: 80dvh

**TreasureWindow:**
- Fixed position
- CSS transform centering (50%, 50%, translate -50%)

### Mobile Behavior
**Breakpoint:** 640px (hardcoded in WojakCreator)
**Key Behaviors:**
- Windows become `position: relative` (stacked vertically)
- WojakCreator hides sidebar, shows bottom sheet
- Title bar controls: 44px × 44px touch targets
- Taskbar: 40px height (mobile) vs 30px (desktop)
- Safe-area insets applied to taskbar, bottom sheet, title bars

---

## Top 10 Responsive Issues

### iPhone/Android Issues (≤640px)

#### 1. **Hardcoded 640px Breakpoint**
**Issue:** `isMobile` state uses `window.innerWidth <= 640`, but CSS uses `@media (max-width: 640px)`. No single source of truth.
**Impact:** Potential mismatch between JS and CSS behavior.
**Location:** `WojakCreator.jsx:19`, `index.css:631`

#### 2. **Window Positioning Conflicts**
**Issue:** Mobile forces `position: relative !important` but WojakCreator uses `position: absolute` in inline styles. Conflicting rules.
**Impact:** Windows may not stack correctly on mobile.
**Location:** `index.css:637`, `WojakCreator.jsx:107`

#### 3. **Bottom Sheet Z-Index Conflicts**
**Issue:** Bottom sheet (z-index: 10001) may conflict with modals (z-index: 1000000) and taskbar (z-index: 10000).
**Impact:** Bottom sheet may appear behind modals or taskbar.
**Location:** `MobileTraitBottomSheet.css:6`, `index.css:813`

#### 4. **Canvas Layout Shift**
**Issue:** Canvas uses `aspect-ratio` but container doesn't reserve space properly. Canvas dimensions change when images load.
**Impact:** CLS (Cumulative Layout Shift) when traits change.
**Location:** `MemeCanvas.jsx:18-40`

#### 5. **Fixed Widths in Generator**
**Issue:** Desktop preview panel is `450px` fixed, but mobile forces `100%`. No smooth transition at breakpoint.
**Impact:** Abrupt layout change at 640px breakpoint.
**Location:** `WojakCreator.jsx:124-127`

#### 6. **Taskbar Button Overflow**
**Issue:** Taskbar buttons can overflow on small screens. No horizontal scroll or wrapping.
**Impact:** Buttons cut off or hidden on narrow devices.
**Location:** `Taskbar.jsx:95-142`, `index.css:848`

#### 7. **Bottom Sheet Safe-Area Inconsistency**
**Issue:** Bottom sheet has safe-area padding, but taskbar also has it. May cause double padding or gaps.
**Impact:** Visual inconsistency at bottom of screen.
**Location:** `MobileTraitBottomSheet.css:15-17`, `index.css:817`

#### 8. **Export Controls Layout**
**Issue:** ExportControls buttons use `FieldRow` (flex row) which may wrap awkwardly on mobile.
**Impact:** Buttons may stack poorly or overflow.
**Location:** `ExportControls.jsx:56-86`

#### 9. **Window Body Padding Inconsistency**
**Issue:** Mobile uses `padding: 6px`, desktop uses `padding: 8px`. WojakCreator uses `padding: 0 !important`.
**Impact:** Inconsistent spacing across windows.
**Location:** `index.css:307`, `index.css:347`, `index.css:682`

#### 10. **Viewport Height Calculations**
**Issue:** Multiple calculations use `90dvh - 60px` but title bar height varies (30px desktop, 36px mobile).
**Impact:** Incorrect max-height calculations causing overflow.
**Location:** `index.css:317`, `index.css:353`, `layout.css:62`

### 1440px Desktop Issues

#### 1. **Wide Monitor Layout Waste**
**Issue:** Windows max at 1400px but desktop container has no max-width until 1920px. Content spreads too wide.
**Impact:** Poor use of space on 1440px-1919px monitors.
**Location:** `index.css:101-109`, `WojakCreator.jsx:100-101`

#### 2. **Generator Preview Too Narrow**
**Issue:** Preview panel is 450px fixed, but on 1440px screens there's room for 500-600px preview.
**Impact:** Wasted space, smaller preview than necessary.
**Location:** `WojakCreator.jsx:124`

#### 3. **Trait Menu Width Not Optimized**
**Issue:** Trait menu uses `flex: 1` but no max-width. On wide screens, dropdowns stretch unnecessarily.
**Impact:** Poor UX - dropdowns too wide, harder to scan.
**Location:** `WojakCreator.jsx:144`

#### 4. **Window Centering Logic**
**Issue:** Centering uses `(window.innerWidth - windowWidth) / 2` but doesn't account for max-width constraints.
**Impact:** Windows may not center correctly on wide monitors.
**Location:** `WojakCreator.jsx:63-68`, `windowPosition.js`

#### 5. **Desktop Padding Inconsistent**
**Issue:** Desktop padding is `24px` (from layout.css) but windows use `20px` in calculations.
**Impact:** Misalignment and inconsistent spacing.
**Location:** `layout.css:142`, `WojakCreator.jsx:64`

#### 6. **No Grid System for Wide Layouts**
**Issue:** No CSS Grid or structured layout system for organizing windows on wide screens.
**Impact:** Windows randomly positioned, no visual organization.
**Location:** N/A (missing feature)

#### 7. **Taskbar Button Spacing**
**Issue:** Taskbar buttons have fixed spacing, but on wide screens they could be more spread out.
**Impact:** Buttons clustered on left, wasted space on right.
**Location:** `index.css:848-895`

#### 8. **Start Menu Width Fixed**
**Issue:** Start menu is 200px fixed width, doesn't scale with screen size.
**Impact:** Looks tiny on 1440px+ screens.
**Location:** `layout.css:71`, `StartMenu.jsx`

#### 9. **Window Max-Width Calculation**
**Issue:** `--window-max-width` uses `100vw - padding * 2` but doesn't account for safe-area on desktop.
**Impact:** Potential overflow on notched desktop displays (rare but possible).
**Location:** `layout.css:61`

#### 10. **Generator Container Gap**
**Issue:** Generator container uses `gap: 16px` but doesn't scale with screen size.
**Impact:** Fixed gap looks small on wide screens.
**Location:** `WojakCreator.jsx:113`

---

## Step-by-Step Refactor Plan

### Phase 1: Foundation & Breakpoint System

#### Step 1.1: Create Unified Breakpoint Hook
**File:** `src/hooks/useBreakpoint.js`
```javascript
import { useState, useEffect } from 'react'

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1920,
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => {
    const width = window.innerWidth
    if (width <= BREAKPOINTS.mobile) return 'mobile'
    if (width <= BREAKPOINTS.tablet) return 'tablet'
    if (width <= BREAKPOINTS.desktop) return 'desktop'
    return 'wide'
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width <= BREAKPOINTS.mobile) setBreakpoint('mobile')
      else if (width <= BREAKPOINTS.tablet) setBreakpoint('tablet')
      else if (width <= BREAKPOINTS.desktop) setBreakpoint('desktop')
      else setBreakpoint('wide')
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
    isWide: breakpoint === 'wide',
  }
}
```

#### Step 1.2: Update Layout CSS Variables
**File:** `src/styles/layout.css`
- Add `--breakpoint-mobile: 640px`
- Add `--breakpoint-tablet: 1024px`
- Add `--breakpoint-desktop: 1920px`
- Add wide monitor tokens (1440px+):
  - `--window-max-width-wide: 1400px`
  - `--preview-panel-width-wide: 550px`
  - `--trait-menu-max-width: 400px`

#### Step 1.3: Create Layout Component System
**File:** `src/components/layout/GeneratorLayout.jsx`
- Unified layout component for WojakCreator
- Handles mobile/desktop/wide breakpoints
- Manages preview and trait panel sizing

---

### Phase 2: Mobile Bottom Sheet Refactor

#### Step 2.1: Fix Bottom Sheet Z-Index Hierarchy
**File:** `src/components/meme/MobileTraitBottomSheet.css`
```css
.mobile-trait-sheet {
  z-index: 10002; /* Above taskbar (10000) but below modals (1000000) */
}
```

#### Step 2.2: Standardize Safe-Area Handling
**File:** `src/components/meme/MobileTraitBottomSheet.css`
- Remove duplicate safe-area padding
- Use CSS variables consistently
- Ensure taskbar and sheet don't double-pad

#### Step 2.3: Improve Bottom Sheet Transitions
**File:** `src/components/meme/MobileTraitBottomSheet.css`
- Use consistent easing functions
- Add spring physics for native feel
- Optimize will-change properties

---

### Phase 3: Generator Preview Refactor

#### Step 3.1: Create Responsive Preview Component
**File:** `src/components/meme/GeneratorPreview.jsx`
- Handles preview panel sizing
- Responsive canvas dimensions
- Export controls layout

**Breakpoint Sizes:**
- Mobile: Full width, aspect-ratio preserved
- Tablet: 350px fixed
- Desktop: 450px fixed
- Wide (1440px+): 550px fixed

#### Step 3.2: Fix Canvas Layout Shift
**File:** `src/components/meme/MemeCanvas.jsx`
- Set explicit container dimensions
- Use `aspect-ratio` CSS property
- Reserve space before image load
- Add skeleton/placeholder

#### Step 3.3: Refactor Generator Container
**File:** `src/components/windows/WojakCreator.jsx`
- Replace inline styles with CSS classes
- Use CSS Grid for desktop layout
- Use Flexbox for mobile layout
- Add smooth transitions between breakpoints

---

### Phase 4: Trait Menu Refactor

#### Step 4.1: Create Responsive Trait Panel
**File:** `src/components/meme/TraitPanel.jsx`
- Unified component for desktop sidebar and mobile sheet
- Handles breakpoint switching
- Manages search and filtering

#### Step 4.2: Optimize Trait Menu Widths
**File:** `src/components/windows/WojakCreator.jsx`
- Desktop: `max-width: 400px` for trait menu
- Wide: `max-width: 450px`
- Mobile: Full width in bottom sheet

#### Step 4.3: Improve LayerSelector Layout
**File:** `src/components/meme/LayerSelector.jsx`
- Consistent spacing using CSS variables
- Better mobile touch targets
- Improved keyboard navigation

---

### Phase 5: Window System Refactor

#### Step 5.1: Standardize Window Positioning
**File:** `src/index.css`
- Remove `!important` overrides
- Use CSS custom properties for positioning
- Create window positioning utility classes

#### Step 5.2: Fix Mobile Window Stacking
**File:** `src/index.css`
- Remove conflicting `position: relative !important`
- Use proper stacking context
- Ensure WojakCreator works on mobile

#### Step 5.3: Improve Window Centering
**File:** `src/utils/windowPosition.js`
- Account for max-width constraints
- Handle wide monitor centering
- Support safe-area insets

---

### Phase 6: Wide Monitor Optimization

#### Step 6.1: Add Desktop Container Max-Width
**File:** `src/index.css`
```css
@media (min-width: 1440px) {
  .desktop {
    max-width: 1600px;
    margin: 0 auto;
    padding-left: var(--spacing-2xl);
    padding-right: var(--spacing-2xl);
  }
}
```

#### Step 6.2: Optimize Generator for Wide Screens
**File:** `src/components/windows/WojakCreator.jsx`
- Increase preview panel to 550px on wide screens
- Increase trait menu max-width to 450px
- Add more spacing between panels

#### Step 6.3: Improve Taskbar Layout
**File:** `src/components/Taskbar.jsx`
- Add max-width to taskbar-tray
- Better button spacing on wide screens
- Center clock on very wide screens

---

### Phase 7: Modal System Refactor

#### Step 7.1: Create Modal Component
**File:** `src/components/ui/Modal.jsx`
- Unified modal component
- Consistent positioning
- Proper z-index management
- Safe-area support

#### Step 7.2: Standardize Modal Sizes
**File:** `src/components/ui/Modal.css`
- Small: 400px
- Medium: 600px
- Large: 800px
- Responsive max-widths

#### Step 7.3: Fix Modal Centering
**File:** `src/components/windows/NotifyPopup.jsx`
- Use CSS for centering (not JS)
- Support all breakpoints
- Handle safe-area insets

---

### Phase 8: Export Controls Refactor

#### Step 8.1: Responsive Button Layout
**File:** `src/components/meme/ExportControls.jsx`
- Stack buttons on mobile
- Horizontal layout on desktop
- Better spacing and sizing

#### Step 8.2: Improve Button Sizing
**File:** `src/components/meme/ExportControls.jsx`
- Consistent button heights
- Proper touch targets on mobile
- Better visual hierarchy

---

### Phase 9: Testing & Validation

#### Step 9.1: Create Responsive Test Suite
**File:** `src/components/dev/ResponsiveTest.jsx`
- Visual breakpoint indicators
- Layout validation
- Touch target highlighting

#### Step 9.2: Cross-Device Testing
- Test on iPhone (390×844)
- Test on Android (360×640, 412×915)
- Test on iPad (768×1024, 820×1180)
- Test on 1440px desktop
- Test on 1920px+ wide monitors

#### Step 9.3: Performance Validation
- Check CLS scores
- Validate FPS on mobile
- Test bottom sheet animations
- Verify keyboard navigation

---

### Phase 10: Documentation & Cleanup

#### Step 10.1: Update Component Docs
- Document breakpoint system
- Explain layout structure
- Add usage examples

#### Step 10.2: Remove Dead Code
- Remove unused styles
- Clean up inline styles
- Consolidate duplicate code

#### Step 10.3: Update README
- Document responsive behavior
- Add breakpoint reference
- Update QA testing guide

---

## Implementation Priority

### High Priority (Critical Issues)
1. ✅ Phase 1: Foundation & Breakpoint System
2. ✅ Phase 2: Mobile Bottom Sheet Refactor
3. ✅ Phase 3: Generator Preview Refactor
4. ✅ Phase 5: Window System Refactor

### Medium Priority (UX Improvements)
5. ✅ Phase 4: Trait Menu Refactor
6. ✅ Phase 6: Wide Monitor Optimization
7. ✅ Phase 8: Export Controls Refactor

### Low Priority (Polish)
8. ✅ Phase 7: Modal System Refactor
9. ✅ Phase 9: Testing & Validation
10. ✅ Phase 10: Documentation & Cleanup

---

## Key Design Decisions

### Breakpoint Strategy
- **Mobile:** ≤640px (single column, bottom sheet)
- **Tablet:** 641px-1024px (hybrid layout)
- **Desktop:** 1025px-1919px (side-by-side layout)
- **Wide:** ≥1920px (optimized spacing, max-widths)

### Layout Approach
- **Mobile:** Stack vertically, bottom sheet for traits
- **Desktop:** Side-by-side (preview + traits)
- **Wide:** Increased panel sizes, centered container

### Component Architecture
- Unified breakpoint hook (single source of truth)
- Layout components handle responsive logic
- CSS variables for consistent spacing
- Portal-based bottom sheet (prevents clipping)

---

## Expected Outcomes

### Mobile (iPhone/Android)
- ✅ Smooth bottom sheet experience
- ✅ No layout shifts
- ✅ Proper touch targets
- ✅ Safe-area support
- ✅ No horizontal overflow

### Desktop (1440px)
- ✅ Better space utilization
- ✅ Larger preview (550px)
- ✅ Optimized trait menu (450px max)
- ✅ Centered content (1600px max-width)
- ✅ Consistent spacing

### Both
- ✅ No CLS when changing traits
- ✅ Smooth transitions
- ✅ Consistent breakpoint behavior
- ✅ Better performance
- ✅ Improved accessibility

