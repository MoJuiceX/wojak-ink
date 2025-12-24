# Windows 98 Desktop App - Architecture & State Management Audit

**Date:** 2024  
**Scope:** Full system architecture, state management, and event flow analysis  
**Goal:** Identify architectural issues, propose improvements, preserve Win98 behavior

---

## EXECUTIVE SUMMARY

The application uses a **hybrid state management architecture** combining:
- **React Context** for global state (windows, keyboard, toasts, marketplace, orange toy, screensaver)
- **Local component state** for window visibility (`openWindows` in App.jsx)
- **DOM-derived state** for window positioning (Window component syncs from WindowContext)
- **Custom DOM events** for cross-component communication

**Key Finding:** There is a **duplication of window visibility state** between `App.jsx` (`openWindows`) and `WindowContext` (`windows` Map). This creates potential for desynchronization.

---

## CURRENT ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.jsx (Root)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Local State:                                             │  │
│  │  - openWindows: { [windowId]: boolean }                 │  │
│  │  - selectedIconIds: string[]                            │  │
│  │  - desktopImages: Image[]                               │  │
│  │  - recycleBin: Image[]                                   │  │
│  │  - wallpaper: string                                     │  │
│  │  - notifyOpen: boolean                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Context Providers (Nested):                              │  │
│  │  1. WindowProvider                                       │  │
│  │  2. MarketplaceProvider                                  │  │
│  │  3. ToastProvider                                        │  │
│  │  4. KeyboardPriorityProvider                             │  │
│  │  5. OrangeToyProvider                                     │  │
│  │  6. ScreensaverProvider                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WindowContext (Global)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State:                                                     │  │
│  │  - windows: Map<windowId, WindowEntry>                   │  │
│  │  - minimizedWindows: Set<windowId>                        │  │
│  │  - activeWindowId: string | null                          │  │
│  │  - hasUserMoved: Map<windowId, boolean>                  │  │
│  │  - nextZIndexRef: number (ref)                            │  │
│  │  - cascadeOrderRef: string[] (ref)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Methods:                                                  │  │
│  │  - registerWindow(windowId, data)                        │  │
│  │  - unregisterWindow(windowId)                            │  │
│  │  - minimizeWindow(windowId)                              │  │
│  │  - restoreWindow(windowId)                               │  │
│  │  - maximizeWindow(windowId)                              │  │
│  │  - bringToFront(windowId)                                │  │
│  │  - updateWindowPosition(windowId, pos)                   │  │
│  │  - updateWindowSize(windowId, size)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Window Component                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Props:                                                    │  │
│  │  - id, title, children, style, onClose                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Lifecycle:                                                │  │
│  │  1. Mount → registerWindow()                             │  │
│  │  2. Sync position from WindowContext → DOM               │  │
│  │  3. Handle drag → updateWindowPosition()                  │  │
│  │  4. Handle click → bringToFront()                        │  │
│  │  5. Unmount → unregisterWindow()                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ DOM State:                                                │  │
│  │  - windowRef.current (DOM element)                        │  │
│  │  - Inline styles: left, top, zIndex                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Taskbar Component                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Reads:                                                    │  │
│  │  - getAllWindows() from WindowContext                    │  │
│  │  - isWindowMinimized(windowId)                           │  │
│  │  - isWindowActive(windowId)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Actions:                                                  │  │
│  │  - restoreWindow(windowId)                               │  │
│  │  - bringToFront(windowId)                                 │  │
│  │  - minimizeWindow(windowId)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## STATE OWNERSHIP ANALYSIS

### 1. Window Visibility

**Problem: DUAL SOURCE OF TRUTH**

**Source 1: App.jsx `openWindows`**
```javascript
const [openWindows, setOpenWindows] = useState({
  'window-readme-txt': false,
  'window-mint-info-exe': false,
  // ... more windows
})
```

**Source 2: WindowContext `windows` Map**
```javascript
const [windows, setWindows] = useState(new Map())
```

**Issue:** 
- `App.jsx` controls **whether a window component renders** (`{openWindows['window-id'] && <Window />}`)
- `WindowContext` controls **window registration and state** (position, z-index, minimized)
- These can desynchronize if:
  - Window unmounts but isn't unregistered
  - Window is registered but component isn't rendered
  - Component renders but registration fails

**Current Flow:**
1. User clicks icon → `openWindow('window-id')` → `setOpenWindows({ ...prev, 'window-id': true })`
2. Component renders → `Window` mounts → `useEffect` calls `registerWindow()`
3. `WindowContext` adds window to `windows` Map
4. Taskbar reads from `getAllWindows()` (WindowContext)

**Risk:** If step 2 or 3 fails, Taskbar shows button but window doesn't render (or vice versa).

---

### 2. Window Stacking Order (Z-Index)

**Source of Truth: WindowContext**
- `nextZIndexRef.current` - Increments for each new window
- `windows` Map stores `zIndex` per window
- `bringToFront()` updates zIndex

**DOM Sync:**
- `Window` component reads `windowData?.zIndex` from context
- Sets inline style: `style={{ zIndex: windowData?.zIndex ?? 9999 }}`

**Issue:** 
- Window component has fallback `9999` if zIndex is undefined
- No validation that zIndex is unique
- Race condition: Multiple windows can get same zIndex if registered simultaneously

**Current Flow:**
1. `registerWindow()` → `windowEntry.zIndex = nextZIndexRef.current++`
2. `bringToFront()` → `zIndex: nextZIndexRef.current++`
3. Window component → `style={{ zIndex: windowData?.zIndex }}`

**Risk:** Windows can overlap incorrectly if zIndex assignment fails.

---

### 3. Active Window (Focus)

**Source of Truth: WindowContext**
- `activeWindowId: string | null`
- Set by: `registerWindow()`, `bringToFront()`, `restoreWindow()`, `maximizeWindow()`
- Cleared by: `minimizeWindow()`, `unregisterWindow()`

**DOM Sync:**
- Window component reads `isWindowActive(windowId)`
- Applies `active` class: `className={isActive ? 'active' : ''}`
- Title bar uses `inactive` class when not active

**Issue:**
- No explicit focus management (no `document.activeElement` sync)
- Keyboard priority system uses `activeWindowId` but doesn't enforce DOM focus
- Multiple windows could theoretically be "active" if state desyncs

**Current Flow:**
1. User clicks window → `bringToFront(windowId)` → `setActiveWindowId(windowId)`
2. Window component → `isWindowActive(windowId)` → applies `active` class
3. KeyboardPriorityContext → Uses `activeWindowId` for priority

**Risk:** Keyboard events could go to wrong window if focus state is stale.

---

### 4. Minimized State

**Source of Truth: WindowContext**
- `minimizedWindows: Set<windowId>`
- Managed by: `minimizeWindow()`, `restoreWindow()`, `registerWindow()`

**DOM Sync:**
- Window component reads `isWindowMinimized(windowId)`
- Sets `display: 'none'` if minimized: `style={{ display: isMinimized ? 'none' : 'block' }}`

**Issue:**
- Minimized windows remain in DOM (just hidden)
- Still registered in `windows` Map
- Taskbar shows button for minimized windows

**Current Flow:**
1. User clicks minimize → `minimizeWindow(windowId)` → `setMinimizedWindows(prev => prev.add(windowId))`
2. Window component → `isWindowMinimized(windowId)` → `display: 'none'`
3. Taskbar → Shows button with `minimized` class

**Risk:** None identified - this is correct behavior.

---

### 5. Window Position

**Source of Truth: WindowContext**
- `windows` Map stores `position: { x, y }` per window
- Updated by: `registerWindow()`, `restoreWindow()`, `updateWindowPosition()`

**DOM Sync:**
- Window component uses `useLayoutEffect` to sync position from context to DOM
- Also handles drag: `useDraggable` hook updates position via `updateWindowPosition()`

**Issue:**
- **Race condition:** Window component syncs position from context, but drag updates context
- `justFinishedDragRef` flag prevents sync during drag, but timing-dependent
- Position can be out of sync if drag ends but state update hasn't propagated

**Current Flow:**
1. `registerWindow()` → Sets initial position in context
2. Window component → `useLayoutEffect` reads position → Sets `style.left/top`
3. User drags → `useDraggable` → `updateWindowPosition()` → Context updates
4. Window component → `useLayoutEffect` detects change → Updates DOM

**Risk:** Window can "jump" if position sync happens during drag.

---

## EVENT FLOWS

### 1. Window Open Flow

```
User clicks icon/Start menu
    ↓
App.jsx: openWindow(windowId)
    ↓
setOpenWindows({ ...prev, [windowId]: true })
    ↓
React renders <Window id={windowId} />
    ↓
Window component mounts
    ↓
useEffect: registerWindow(windowId, { title, size, ... })
    ↓
WindowContext: setWindows(prev => next.set(windowId, windowEntry))
    ↓
WindowContext: setActiveWindowId(windowId)
    ↓
Window component: Reads windowData from context
    ↓
Window component: Sets position, zIndex from context
    ↓
Taskbar: getAllWindows() → Shows button
```

**Issues:**
- No error handling if registration fails
- No validation that windowId is unique
- Component can render before registration completes

---

### 2. Window Close Flow

```
User clicks close button
    ↓
Window component: handleClose()
    ↓
onClose() callback (from App.jsx)
    ↓
App.jsx: closeWindow(windowId)
    ↓
setOpenWindows({ ...prev, [windowId]: false })
    ↓
React unmounts <Window />
    ↓
Window component: useEffect cleanup
    ↓
unregisterWindow(windowId)
    ↓
WindowContext: setWindows(prev => next.delete(windowId))
    ↓
WindowContext: setActiveWindowId(prev => prev === windowId ? nextActive : prev)
    ↓
Taskbar: getAllWindows() → Removes button
```

**Issues:**
- If `onClose` is not provided, window unregisters but component doesn't unmount
- Active window selection logic is complex (finds highest zIndex)

---

### 3. Window Focus Flow

```
User clicks window title bar
    ↓
Window component: handleMouseDown()
    ↓
bringToFront(windowId)
    ↓
WindowContext: setWindows(prev => next.set(windowId, { ...win, zIndex: nextZIndex++ }))
    ↓
WindowContext: setActiveWindowId(windowId)
    ↓
Window component: Reads isWindowActive(windowId)
    ↓
Window component: Applies 'active' class
    ↓
Title bar: Changes from 'inactive' to active styles
```

**Issues:**
- No DOM focus management (`windowRef.current.focus()` is called but not enforced)
- Keyboard priority system doesn't verify DOM focus matches `activeWindowId`

---

### 4. Custom DOM Events

**Events Used:**
1. `'themeChanged'` - Theme switching (DisplayProperties → App.jsx)
2. `'accentChanged'` - Accent switching (DisplayProperties → App.jsx)
3. `'openPaintWindow'` - Open Paint window (StartMenu → App.jsx)
4. `'screensaverSettingsChanged'` - Screensaver config (DisplayProperties → Screensaver)
5. `'muteToggle'` - Sound mute (Taskbar → DisplayProperties)
6. `'appearanceChanged'` - Theme/accent combo (DisplayProperties → ?)

**Issues:**
- No event type safety (string literals)
- No centralized event registry
- Some events have listeners, some don't
- Potential memory leaks if listeners aren't cleaned up

---

## ARCHITECTURAL SMELLS & RISKS

### 🔴 CRITICAL (P0)

#### 1. Dual Window Visibility State
**Location:** `App.jsx` + `WindowContext`
**Issue:** `openWindows` (App.jsx) and `windows` Map (WindowContext) can desynchronize
**Risk:** Taskbar shows button but window doesn't render, or window renders but no button
**Impact:** High - Core functionality broken

#### 2. Race Condition in Window Registration
**Location:** `Window.jsx` useEffect + `WindowContext.registerWindow()`
**Issue:** Component can render before registration completes
**Risk:** Window appears without position/zIndex, or registration fails silently
**Impact:** High - Windows can appear in wrong position

#### 3. Z-Index Collision Risk
**Location:** `WindowContext.nextZIndexRef`
**Issue:** No validation that zIndex is unique; race condition if multiple windows register simultaneously
**Risk:** Windows can overlap incorrectly
**Impact:** Medium - Visual glitch, but functional

---

### 🟡 HIGH (P1)

#### 4. Position Sync Race Condition
**Location:** `Window.jsx` useLayoutEffect + `useDraggable`
**Issue:** Position sync can happen during drag, causing "jump"
**Risk:** Window position can be incorrect after drag
**Impact:** Medium - UX issue

#### 5. No DOM Focus Management
**Location:** Window component + KeyboardPriorityContext
**Issue:** `activeWindowId` doesn't sync with `document.activeElement`
**Risk:** Keyboard events can go to wrong window
**Impact:** Medium - Accessibility issue

#### 6. Custom Events Without Type Safety
**Location:** Multiple files
**Issue:** String literals for event names, no TypeScript/validation
**Risk:** Typos cause silent failures, hard to refactor
**Impact:** Medium - Maintainability

---

### 🟢 MEDIUM (P2)

#### 7. Window ID Backward Compatibility Hacks
**Location:** Multiple files (`wojak-creator` → `wojak-generator`)
**Issue:** String mapping scattered across codebase
**Risk:** Easy to miss when adding new windows
**Impact:** Low - Technical debt

#### 8. Mobile Auto-Minimize Logic Duplication
**Location:** `WindowContext` (registerWindow, bringToFront, restoreWindow)
**Issue:** Same logic repeated in 3 places
**Risk:** Inconsistent behavior if one place is updated but others aren't
**Impact:** Low - Code duplication

#### 9. Cascade Order Ref Management
**Location:** `WindowContext.cascadeOrderRef`
**Issue:** Mutable ref, no validation, README always index 0
**Risk:** Cascade order can become incorrect
**Impact:** Low - Visual only

---

### 🔵 LOW (P3)

#### 10. useWindowStacking Hook Conflicts
**Location:** `hooks/useWindowStacking.js`
**Issue:** Directly manipulates DOM, conflicts with WindowContext position management
**Risk:** Windows can be repositioned by two systems
**Impact:** Low - May not be used (needs verification)

#### 11. hasUserMoved Map Exposure
**Location:** `WindowContext` exposes `hasUserMoved` Map
**Issue:** Components can read but shouldn't modify
**Risk:** Accidental mutation
**Impact:** Low - Read-only access pattern

---

## REFACTOR RECOMMENDATIONS

### P0 - Critical Fixes

#### 1. Unify Window Visibility State

**Current:** Dual state (`openWindows` in App.jsx + `windows` Map in WindowContext)

**Proposed:** Single source of truth in WindowContext

**Changes:**
- Remove `openWindows` state from App.jsx
- Add `isWindowOpen(windowId)` method to WindowContext
- Window components register on mount, unregister on unmount (already done)
- App.jsx renders windows based on WindowContext state

**Files to modify:**
- `src/App.jsx` - Remove `openWindows` state, use `getAllWindows()` from context
- `src/contexts/WindowContext.jsx` - Add `isWindowOpen()` method

**Example:**
```javascript
// App.jsx
const { getAllWindows } = useWindow()
const openWindows = getAllWindows().map(w => w.id)

// Render windows
{openWindows.includes('window-readme-txt') && <ReadmeWindow />}
```

**Risk:** Medium - Requires testing all window open/close flows
**Benefit:** Eliminates desynchronization risk

---

#### 2. Add Window Registration Validation

**Current:** No validation, silent failures possible

**Proposed:** Validate windowId, handle errors, prevent duplicates

**Changes:**
- Add validation in `registerWindow()` (already partially done)
- Return success/failure status
- Window component handles registration failure gracefully

**Files to modify:**
- `src/contexts/WindowContext.jsx` - Enhance validation
- `src/components/windows/Window.jsx` - Handle registration errors

**Risk:** Low - Additive change
**Benefit:** Prevents silent failures

---

#### 3. Ensure Z-Index Uniqueness

**Current:** `nextZIndexRef.current++` can collide if called simultaneously

**Proposed:** Use functional update to ensure uniqueness

**Changes:**
- Wrap zIndex assignment in functional update
- Add validation that zIndex is unique before assignment

**Files to modify:**
- `src/contexts/WindowContext.jsx` - Z-index assignment logic

**Risk:** Low - Internal change
**Benefit:** Prevents z-index collisions

---

### P1 - High Priority Improvements

#### 4. Fix Position Sync Race Condition

**Current:** `justFinishedDragRef` flag prevents sync, but timing-dependent

**Proposed:** Use ref for position during drag, sync after drag completes

**Changes:**
- Store drag position in ref, not state
- Only update context position on drag end
- Remove position sync effect during drag

**Files to modify:**
- `src/components/windows/Window.jsx` - Position sync logic
- `src/hooks/useDraggable.js` - Drag position handling

**Risk:** Medium - Requires careful testing of drag behavior
**Benefit:** Eliminates position "jump" issue

---

#### 5. Add DOM Focus Management

**Current:** `activeWindowId` doesn't sync with DOM focus

**Proposed:** Sync `activeWindowId` with `document.activeElement`

**Changes:**
- When `activeWindowId` changes, focus the window element
- When window receives focus, update `activeWindowId`
- Keyboard priority system verifies DOM focus matches `activeWindowId`

**Files to modify:**
- `src/components/windows/Window.jsx` - Focus management
- `src/contexts/KeyboardPriorityContext.jsx` - Focus verification

**Risk:** Medium - May affect existing keyboard behavior
**Benefit:** Proper focus management, better accessibility

---

#### 6. Create Event Type System

**Current:** String literals for custom events

**Proposed:** Centralized event registry with TypeScript types

**Changes:**
- Create `src/utils/events.js` with event constants
- Use typed event dispatchers
- Document all events

**Files to create:**
- `src/utils/events.js` - Event constants and types

**Files to modify:**
- All files using `dispatchEvent` / `addEventListener`

**Risk:** Low - Additive change
**Benefit:** Type safety, easier refactoring

---

### P2 - Medium Priority Cleanup

#### 7. Centralize Window ID Mapping

**Current:** `wojak-creator` → `wojak-generator` mapping scattered

**Proposed:** Single mapping function in WindowContext

**Changes:**
- Create `normalizeWindowId(id)` function
- Use in all places that check windowId

**Files to modify:**
- `src/contexts/WindowContext.jsx` - Add normalization function
- All files with windowId checks

**Risk:** Low - Refactor only
**Benefit:** Easier to maintain

---

#### 8. Extract Mobile Auto-Minimize Logic

**Current:** Duplicated in 3 places

**Proposed:** Single function `autoMinimizeOtherWindows(windowId)`

**Changes:**
- Extract to helper function
- Call from registerWindow, bringToFront, restoreWindow

**Files to modify:**
- `src/contexts/WindowContext.jsx` - Extract function

**Risk:** Low - Refactor only
**Benefit:** DRY principle

---

## WHAT NOT TO REFACTOR

### ✅ Preserve These Patterns

#### 1. Window Component Lifecycle
**Why:** Works correctly, handles edge cases (retry on mount, cleanup on unmount)
**Location:** `src/components/windows/Window.jsx`

#### 2. Cascade Positioning Logic
**Why:** Complex but correct, handles README anchor, special cases (MINT_INFO offset)
**Location:** `src/contexts/WindowContext.jsx`

#### 3. Mobile Fullscreen Behavior
**Why:** Intentional design, windows are fullscreen on mobile
**Location:** Window component + CSS

#### 4. hasUserMoved Tracking
**Why:** Needed for restore behavior (center if not moved)
**Location:** `src/contexts/WindowContext.jsx`

#### 5. Keyboard Priority System
**Why:** Works correctly, handles modal/active window/global priorities
**Location:** `src/contexts/KeyboardPriorityContext.jsx`

#### 6. Window Drag Implementation
**Why:** Performance-optimized (rAF throttling, GPU-friendly)
**Location:** `src/hooks/useDraggable.js`

---

## DETERMINISM ANALYSIS

### ✅ Deterministic Behaviors

1. **Window Open:** Always registers, always centers/cascades, always sets active
2. **Window Close:** Always unregisters, always selects next active window
3. **Window Minimize:** Always adds to minimized set, always clears active if minimized
4. **Window Restore:** Always removes from minimized set, always centers if not moved
5. **Window Focus:** Always updates zIndex, always sets active

### ⚠️ Non-Deterministic Behaviors

1. **Window Position After Drag:** Can be out of sync due to race condition
2. **Z-Index Assignment:** Can collide if multiple windows register simultaneously
3. **Active Window Selection:** Uses highest zIndex, but if zIndexes collide, selection is non-deterministic

---

## TESTING CHECKLIST

### Window Lifecycle
- [ ] Open window → Registers in context → Appears in taskbar
- [ ] Close window → Unregisters from context → Removed from taskbar
- [ ] Minimize window → Added to minimized set → Hidden but button remains
- [ ] Restore window → Removed from minimized set → Visible and focused

### Window Stacking
- [ ] Click window → Brings to front → Highest zIndex
- [ ] Multiple windows → Each gets unique zIndex
- [ ] Active window → Title bar shows active style
- [ ] Inactive windows → Title bar shows inactive style

### Window Positioning
- [ ] New window → Centers or cascades correctly
- [ ] Drag window → Position updates in context
- [ ] Restore minimized → Centers if not moved, keeps position if moved
- [ ] Multiple windows → Cascade order maintained

### Cross-Window Events
- [ ] Theme change → All windows update
- [ ] Paint window event → Opens paint window
- [ ] Screensaver settings → Screensaver updates

---

## MIGRATION PLAN

### Phase 1: Critical Fixes (P0)
1. Unify window visibility state
2. Add registration validation
3. Ensure z-index uniqueness

**Estimated Time:** 4-6 hours  
**Risk:** Medium  
**Testing:** Full window lifecycle testing required

### Phase 2: High Priority (P1)
4. Fix position sync race condition
5. Add DOM focus management
6. Create event type system

**Estimated Time:** 6-8 hours  
**Risk:** Medium  
**Testing:** Drag behavior, keyboard navigation

### Phase 3: Medium Priority (P2)
7. Centralize window ID mapping
8. Extract mobile auto-minimize logic

**Estimated Time:** 2-3 hours  
**Risk:** Low  
**Testing:** Window ID mapping, mobile behavior

---

## CONCLUSION

The architecture is **fundamentally sound** but has **critical duplication** in window visibility state that must be fixed. The WindowContext system is well-designed and should be the single source of truth for all window state.

**Priority:** Fix P0 issues first, then P1, then P2. P3 can be deferred.

**Risk:** Medium - Changes are mostly additive/refactoring, but window state is core functionality.

**Benefit:** Eliminates desynchronization bugs, improves maintainability, enables future features.

