# Layout Hierarchy & Window System - Plain Language Explanation

## The Big Picture

Think of the app like a Windows 98 desktop. Everything is contained in a fixed viewport with no page scrolling. Windows float on top of a background, and a taskbar sits at the bottom.

## Layout Hierarchy (Top to Bottom)

### 1. **Root Level** (`html`, `body`, `#root`)
- **Purpose**: The foundation - sets up the viewport
- **Key Properties**:
  - `height: 100dvh` (dynamic viewport height - accounts for mobile browser UI)
  - `overflow: hidden` (NO page scrolling - desktop OS feel)
  - `overscroll-behavior: none` (prevents rubber-band scrolling on iOS)
- **Controls**: Global scroll lock, viewport sizing

### 2. **Background Layer** (`.bg-fixed`)
- **Purpose**: The Windows 98 wallpaper
- **Position**: `position: fixed`, `z-index: -1`
- **Size**: Full viewport (`100dvh`)
- **No conflicts**: Sits behind everything

### 3. **Desktop Container** (`.desktop`)
- **Purpose**: The main container where all windows live
- **Position**: `position: fixed`, `inset: 0` (fills entire viewport)
- **Key Properties**:
  - `padding-bottom: calc(var(--taskbar-height) + var(--safe-area-inset-bottom))`
  - This padding reserves space for the taskbar at the bottom
- **Contains**: All window components, OrangeTrail game
- **Controls**: Provides the "desktop" coordinate system for windows

### 4. **Window System** (`.window`)
- **Purpose**: Individual draggable/resizable windows
- **Position**: `position: absolute` (desktop) or `position: relative` (mobile)
- **Z-Index**: Managed by `WindowContext` (starts at 1000, increments)
- **Stacking**: Windows can overlap, topmost window has highest z-index
- **Centering**: New windows center automatically (via `getCenteredPosition()`)
- **Mobile Behavior**: 
  - At `<= 640px`: Windows become `position: relative`, stack vertically
  - Full width: `width: var(--window-max-width)` (which is `100vw - padding` on mobile)
  - No absolute positioning on mobile

### 5. **Taskbar** (`.taskbar`)
- **Purpose**: Fixed bottom bar (like Windows taskbar)
- **Position**: `position: fixed`, `bottom: 0`
- **Z-Index**: `10000` (always on top)
- **Height**: `calc(var(--taskbar-height) + var(--safe-area-inset-bottom))`
- **Controls**: Window switching, Start menu, clock

## Breakpoint System

### Mobile (≤ 640px)
- **Window Positioning**: `position: relative` (stacks vertically)
- **Window Width**: Full width minus padding (`100vw - 16px`)
- **Layout**: Single column, windows stack top to bottom
- **Taskbar**: Fixed at bottom, accounts for safe area
- **Special**: Wojak Creator uses fullscreen window + bottom sheet

### Tablet (641px - 1024px)
- **Window Positioning**: `position: absolute` (can overlap)
- **Window Width**: Responsive, max `100vw - padding`
- **Layout**: Windows can be positioned anywhere
- **Taskbar**: Fixed at bottom

### Desktop (≥ 1025px)
- **Window Positioning**: `position: absolute` (can overlap)
- **Window Width**: Token-based sizes (400px, 600px, 800px, 1200px)
- **Max Width**: `1400px` on ultrawide monitors
- **Layout**: Two-panel layout for Wojak Creator (controls left, preview right)
- **Taskbar**: Fixed at bottom

## Window System Architecture

### WindowContext (State Management)
- **Manages**: All window state (position, size, z-index, minimized, maximized)
- **Registration**: Windows register themselves on mount
- **Centering**: Calculates centered position on first open
- **Z-Index**: Auto-increments for new windows, brings to front on click
- **Tracking**: Remembers if user has moved a window (prevents re-centering)

### Window Component (Base)
- **Handles**: Dragging, resizing, minimize/maximize/close
- **Positioning**: Uses `WindowContext` for state, applies to DOM
- **Registration**: Registers with `WindowContext` on mount
- **Cleanup**: Unregisters on unmount

### useDraggable Hook
- **Purpose**: Handles window dragging logic
- **Detects**: Mobile vs desktop (uses `window.innerWidth <= 768`)
- **Constraints**: Prevents dragging windows off-screen
- **Taskbar Awareness**: Accounts for taskbar height when calculating bounds

## Mobile Bottom Sheet Integration

### Current Implementation
- **Component**: `MobileTraitBottomSheet.jsx`
- **Rendering**: Uses React Portal (`createPortal`) to render outside window DOM
- **Position**: `position: fixed`, `bottom: 0`
- **Z-Index**: `10001` (above taskbar's `10000`)
- **Visibility**: Only shows on mobile (`@media (max-width: 640px)`)

### How It Fits in Hierarchy
```
html/body (#root)
  └─ .desktop (fixed, full viewport)
      ├─ .window (absolute/relative)
      │   └─ WojakCreator content
      └─ .taskbar (fixed, bottom, z-index: 10000)
  
  └─ Portal (rendered to document.body)
      └─ .mobile-trait-sheet (fixed, bottom, z-index: 10001)
```

## Potential Conflicts & How They're Resolved

### 1. **Z-Index Stacking**
- **Conflict**: Bottom sheet needs to be above taskbar but below modals
- **Resolution**: 
  - Taskbar: `z-index: 10000`
  - Bottom sheet: `z-index: 10001`
  - Modals: `z-index: 100000` (Toast uses `100000`)
- **Status**: ✅ Resolved

### 2. **Viewport Height Calculation**
- **Conflict**: Mobile browser UI (address bar, toolbars) changes viewport height
- **Resolution**: Uses `100dvh` (dynamic viewport height) instead of `100vh`
- **Applied To**: `html`, `body`, `#root`, `.desktop`, `.bg-fixed`
- **Status**: ✅ Resolved

### 3. **Taskbar Overlap**
- **Conflict**: Bottom sheet could overlap taskbar
- **Resolution**: 
  - Taskbar is `position: fixed` at `bottom: 0`
  - Bottom sheet is also `position: fixed` at `bottom: 0`
  - Bottom sheet has higher z-index, so it appears above
  - Both account for `safe-area-inset-bottom`
- **Status**: ✅ Resolved (sheet appears above taskbar, which is correct)

### 4. **Window Positioning on Mobile**
- **Conflict**: Windows use `position: absolute` on desktop but need `position: relative` on mobile
- **Resolution**: 
  - Media query at `<= 640px` forces `position: relative !important`
  - Windows stack vertically with margins
  - Bottom sheet is separate (Portal), doesn't interfere
- **Status**: ✅ Resolved

### 5. **Scroll Lock Conflicts**
- **Conflict**: Bottom sheet needs to prevent background scroll when expanded
- **Resolution**: 
  - Global scroll lock in `App.jsx` prevents all scrolling
  - Bottom sheet adds extra lock when expanded (`body.style.position = 'fixed'`)
  - Sheet content uses `.scroll-allowed` class for internal scrolling
- **Status**: ✅ Resolved

### 6. **Safe Area Insets**
- **Conflict**: Notched devices (iPhone X+) need padding for safe areas
- **Resolution**: 
  - CSS variables: `--safe-area-inset-*` using `env()`
  - Applied to: Taskbar, title bar, bottom sheet
  - Bottom sheet: `padding-bottom: var(--safe-area-inset-bottom)`
- **Status**: ✅ Resolved

### 7. **Wojak Creator Mobile Layout**
- **Conflict**: Wojak Creator window needs to be fullscreen on mobile, but bottom sheet needs space
- **Resolution**: 
  - Window uses `position: fixed`, `100vw x 100dvh`
  - Canvas area has `paddingBottom: calc(var(--spacing-md) + 140px)` to reserve space for collapsed sheet
  - Bottom sheet renders via Portal (outside window DOM)
- **Status**: ✅ Resolved

## Key Files & Their Roles

### Layout Control
- **`src/styles/layout.css`**: Defines breakpoints and CSS tokens (spacing, dimensions)
- **`src/index.css`**: Applies layout rules, media queries for responsive behavior
- **`src/styles/safeArea.css`**: Handles safe-area insets and overflow prevention

### Window Management
- **`src/contexts/WindowContext.jsx`**: Central state management for all windows
- **`src/components/windows/Window.jsx`**: Base window component (dragging, resizing)
- **`src/hooks/useDraggable.js`**: Dragging logic, bounds checking
- **`src/utils/windowPosition.js`**: Position calculation (centering, bounds)

### Mobile Bottom Sheet
- **`src/components/meme/MobileTraitBottomSheet.jsx`**: Bottom sheet component
- **`src/components/meme/MobileTraitBottomSheet.css`**: Bottom sheet styles
- **Renders via Portal**: Attached to `document.body`, not window DOM

### App Structure
- **`src/App.jsx`**: Main app component, contains `.desktop` container
- **Global Scroll Lock**: `useGlobalScrollLock()` hook prevents all page scrolling

## Where Conflicts Could Arise

### 1. **Z-Index Wars**
- **Risk**: If a new modal/overlay is added with z-index between 10001-99999
- **Solution**: Use z-index scale: Windows (1000+), Taskbar (10000), Bottom Sheet (10001), Modals (100000+)

### 2. **Portal Rendering**
- **Risk**: Bottom sheet Portal might conflict with other Portals
- **Solution**: Bottom sheet uses `document.body`, ensure other Portals use different containers if needed

### 3. **Mobile Window Positioning**
- **Risk**: If a window uses `position: fixed` on mobile, it could conflict with bottom sheet
- **Solution**: Media query forces `position: relative` on mobile for all `.window` elements

### 4. **Scroll Lock Override**
- **Risk**: If bottom sheet's scroll lock conflicts with global scroll lock
- **Solution**: Bottom sheet's lock is additive (sets `position: fixed` on body), global lock prevents wheel/touch

### 5. **Safe Area Calculation**
- **Risk**: Safe area insets might not be calculated correctly on all devices
- **Solution**: Uses CSS `env()` with fallback to `0px`, tested on iOS Safari

### 6. **Viewport Height Changes**
- **Risk**: Mobile browser UI showing/hiding changes viewport height
- **Solution**: Uses `100dvh` which accounts for dynamic viewport, not static `100vh`

## Summary

The layout is a **fixed viewport system** (no page scrolling) with:
- **Desktop**: Floating windows with absolute positioning
- **Mobile**: Stacked windows with relative positioning + bottom sheet overlay
- **Taskbar**: Always fixed at bottom
- **Bottom Sheet**: Portal-rendered, fixed at bottom, above taskbar

The system is designed to prevent conflicts through:
- Clear z-index hierarchy
- Portal rendering for overlays
- Media query-based positioning
- Safe area awareness
- Dynamic viewport height


