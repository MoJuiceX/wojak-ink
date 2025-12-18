# Windows 98-Style Window System – Architecture & Behavior

This document explains how the Win98-style layout and window system works in **Wojak Ink** as it exists **now**.
It is meant as the single source of truth for layout, window behavior, startup semantics, and z-index rules.

> Note: This file describes how things actually behave today. Some older features
> (like the orange smash / OrangeTrail game) have been removed and are not covered here.

---

## 1. Layout Hierarchy (Top to Bottom)

At a high level the app behaves like a Windows 98 desktop:

1. **Root (`html`, `body`, `#root`)**
   - Uses `height: 100dvh` and `overflow: hidden` so the **page never scrolls**.
   - Global scroll-lock logic (in React) prevents wheel/touch/keyboard scrolling except in explicitly marked
     scrollable areas (e.g. window bodies with `.scroll-allowed`).

2. **Background Layer (`.bg-fixed`)**
   - Fixed-position, full-viewport background “wallpaper”.
   - Sits behind the windows and taskbar (negative `z-index`).

3. **Desktop Container (`.desktop`)**
   - Fixed, full-viewport container where **all windows are rendered**.
   - Adds bottom padding to reserve space for the taskbar and mobile safe-area insets:
     - `padding-bottom: calc(var(--taskbar-height) + var(--safe-area-inset-bottom))`
   - This is the main coordinate system for desktop windows.

4. **Windows (`.window`)**
   - React components wrapped by `src/components/windows/Window.jsx`.
   - Position:
     - **Desktop / tablet:** `position: relative` by default, but centered and clamped by
       `WindowContext` + `windowPosition` utilities and updated via `useDraggable`.
     - **Mobile (<= 640px):** forced to fullscreen-style behavior with `position: relative`,
       `width: 100vw`, `height: 100dvh` (plus safe-area padding).
   - Each window is draggable on desktop via the title bar (using `useDraggable`).

5. **Taskbar (`.taskbar`)**
   - Sits at the bottom of the viewport.
   - Contains:
     - Start button
     - Taskbar tray of **open window buttons**
     - Clock

6. **Overlays / Sheets**
   - Some components (e.g. mobile Wojak Creator window and bottom sheets for traits) are
     **fixed-position overlays** with high z-index values so they sit above the desktop and taskbar.
   - Typical values:
     - Fullscreen Wojak Creator (mobile): `z-index: 10000`
     - Bottom sheets / overlays: typically `z-index: 10001` or similar, always **above the taskbar**.

---

## 2. WindowContext – Single Source of Truth

The window manager is implemented in **`src/contexts/WindowContext.jsx`**.

It tracks:

- `windows: Map<string, WindowEntry>`  
  - A window is considered **open** if it has an entry in this map.
  - Each `WindowEntry` contains:
    - `id`, `title`
    - `position { x, y }`
    - `size { width, height }`
    - `zIndex`
    - `isMaximized`, `centerOnOpen`, etc.

- `minimizedWindows: Set<string>`  
  - A window is minimized if its id is in this set.
  - Minimized windows are still **open** and still appear in the taskbar.

- `activeWindowId: string | null`  
  - The currently focused / active window id.
  - Updated by actions like `bringToFront`, `restoreWindow`, `maximizeWindow`.

- `nextZIndexRef: React.useRef<number>`  
  - Monotonically increasing counter for z-index assignment.

### Core methods

- `registerWindow(windowId, windowData)`  
  - Called by `Window.jsx` on mount (and one-time retry) to register a window as open.
  - Assigns an initial `zIndex`.
  - Optionally computes a centered `position` (desktop) using `windowPosition` helpers.
  - Sets `activeWindowId` to `windowId` when a new window is registered.

- `unregisterWindow(windowId)`  
  - Called by `Window.jsx` on unmount (cleanup effect).
  - Removes the window from `windows` and `minimizedWindows`.
  - If the closed window was active, it promotes the **remaining window with highest zIndex** to active
    (or sets `activeWindowId = null` if none remain).

- `minimizeWindow(windowId)`  
  - Marks a window as minimized (adds id to `minimizedWindows`), clears `activeWindowId` if needed.

- `restoreWindow(windowId)`  
  - Removes id from `minimizedWindows`.
  - Centers the window if it has never been moved by the user (desktop) and brings it to front.

- `bringToFront(windowId)`  
  - Increments and sets the window’s `zIndex` to the latest value.
  - Centers the window if it has never been moved (desktop).
  - Updates `activeWindowId`.

These methods are the **only** way the rest of the app should change window state; everything else calls into them.

---

## 3. Breakpoints & Mobile Behavior (JS vs CSS)

There are **two relevant breakpoints** used in the current system:

1. **CSS breakpoint:**  
   - Media queries in `index.css` use **`max-width: 640px`** to switch to a mobile layout:
     - Windows become full-width.
     - Touch targets are larger.
     - Some CSS behaviors (like positioning) are simplified.

2. **JS breakpoints:**
   - `Window.jsx` and `StartMenu.jsx` treat **`window.innerWidth <= 640`** as mobile.
   - `useDraggable.js` historically used **`window.innerWidth <= 768`** to categorize “mobile-ish” drag behavior
     (e.g., different bounds and gesture thresholds).

> **Known discrepancy:** The **CSS** breakpoint (640) and the **JS drag breakpoint** (historically 768) are not
> identical. In practice, this means that at widths between 641–768px, some behavior still uses “mobile-style”
> drag calculations while the CSS is in a more desktop-like layout. This is a **known edge case** and should be
> treated as such if you tighten responsiveness later.

On **mobile-sized viewports (<= 640px)**:

- Windows are generally:
  - `position: relative`
  - `width: 100vw`, `height: 100dvh` (via styles in `Window.jsx`)
  - Clamped implicitly by the fullscreen layout instead of by drag logic.
- Dragging is effectively disabled for fullscreen windows (handled by passing `noStack || isMobile` to
  `useDraggable` in `Window.jsx`).

---

## 4. Mobile Positioning & Fullscreen Exceptions

On small viewports the **default rule** is effectively:

- `.window` elements live inside the `.desktop` container.
- CSS + `Window.jsx` force most windows to be **stacked, full-width blocks** rather than floating OS windows.

However, there are important **exceptions** for fullscreen / overlay experiences:

- **Wojak Creator (mobile mode)**:
  - In `WojakCreator.jsx`, the mobile version uses:
    - `position: fixed`
    - `width: 100vw`
    - `height: 100dvh`
    - `zIndex: 10000`
  - Because `position: fixed` is explicit and the `Window.jsx` mobile-override guard respects `position: fixed`,
    this window **escapes** the usual desktop-relative positioning and truly overlays the entire viewport.

- **Bottom sheets and similar overlays**:
  - Trait bottom sheets and similar UI overlays typically use fixed positioning and **higher z-index** values
    (e.g. 10001) so they appear **above** both windows and the taskbar.
  - This is intentional, to mimic mobile OS “bottom sheet” behavior: the sheet feels like it is attached to the
    screen, not to a particular window.

> In summary: while many windows inherit a mobile “stacked” layout via CSS, **fixed-position overlays** like
> the mobile Wojak Creator and bottom sheets explicitly opt out of that behavior and are allowed to sit above
> the taskbar and other windows.

---

## 5. Startup Semantics & Taskbar Rules

### First visit vs later visits

- **LocalStorage key:** `wojakInk_hasVisited`
- **First visit** (when the key is missing or not `'true'`):
  - `App.jsx` sets the `openWindows['window-readme-txt']` flag to `true`.
  - The `ReadmeWindow` component is mounted, which registers `window-readme-txt` in `WindowContext`.
  - Result: `README.TXT` opens automatically, is the only open window, and appears as a single taskbar button.
  - The key `wojakInk_hasVisited` is then set to `'true'`.

- **Subsequent visits** (when the key is `'true'`):
  - All entries in `openWindows` default to `false`.
  - No windows are mounted by default.
  - The desktop loads with **no taskbar window buttons** (just Start + clock) until the user opens a window.

### Open vs minimized vs closed

- **Open window**:
  - Mounted `Window` component calls `registerWindow` and adds an entry to `windows` in `WindowContext`.
  - The window appears in the taskbar because `Taskbar.jsx` maps over `getAllWindows()`.

- **Minimized window**:
  - Remains in `windows`, but its id is added to `minimizedWindows`.
  - Its taskbar button stays visible (Win98 semantics).
  - Clicking the button uses:
    - If minimized → `restoreWindow(windowId)`
    - If active and not minimized → `minimizeWindow(windowId)`
    - If open but inactive → `bringToFront(windowId)`

- **Closed window**:
  - The `Window` component’s close button calls `handleClose`, which:
    - Sets local `isVisible` to false.
    - Calls `onClose` if provided (in `App.jsx`, this toggles the corresponding `openWindows[windowId]` flag to `false`, causing the component to unmount).
  - On unmount, `Window.jsx` runs its cleanup effect, which calls `unregisterWindow(windowId)` in `WindowContext`.
  - The window is removed from `windows` and `minimizedWindows`.
  - Result: the window’s taskbar button **disappears immediately**, because `getAllWindows()` no longer includes it.

> **Key rule:** the taskbar window-button strip is **purely** a reflection of `WindowContext` **open windows**
> (via `getAllWindows()`), not a static list of “apps”.

---

## 6. Z-Index Rules (Authoritative Ladder)

To keep the visual stacking predictable, z-index usage follows this ladder:

1. **Background wallpaper (`.bg-fixed`)**
   - Negative or low z-index, always behind everything.

2. **Desktop (`.desktop`)**
   - Base layer for all standard windows.

3. **Standard windows (`.window`)**
   - Managed by `WindowContext`:
     - Initial `zIndex` around 1000.
     - Each call to `bringToFront`, `restoreWindow`, or `maximizeWindow` assigns a new, higher `zIndex`.
   - At any time, the highest `zIndex` belongs to the visually topmost window.

4. **Taskbar (`.taskbar`)**
   - Renders above the desktop layer but below fullscreen overlays and bottom sheets.

5. **Fullscreen / modal overlays**
   - Examples:
     - Mobile Wojak Creator window: `z-index` ≈ 10000.
     - Bottom sheets / modals: `z-index` ≈ 10001 or slightly higher.
   - These are intentionally placed **above** the taskbar to mimic OS-level overlays.

6. **Transient UI elements**
   - Tooltips, dropdowns, and similar elements use higher z-index values as needed, but should always be
     **bounded** above standard windows and below any critical browser-level UI.

If you add new overlays or modals, pick z-index values that respect this ordering and update this document if you
introduce a new “tier” (for example, a global emergency dialog above all other UI).

---

## 7. Summary of Key Behaviors

- **No page scroll**: The app locks the viewport and uses internal scrollable regions instead.
- **Desktop windows**:
  - Registered in `WindowContext`.
  - Centered and clamped via `windowPosition` helpers.
  - Open → appear in taskbar; closed → fully removed.
- **Mobile**:
  - Windows are fullscreen and non-draggable.
  - Bottom sheets and special overlays sit above the taskbar.
- **Startup semantics**:
  - First visit: `README.TXT` auto-opens once.
  - Later visits: user starts with no open windows and opens them via Start menu.
- **Taskbar semantics**:
  - One button per open window.
  - Minimized windows keep their button; closed windows do not.
- **Z-index**:
  - Strict ladder: background < desktop < windows < taskbar < overlays.

Use this file as the authoritative description of how the window system is supposed to behave. If you change the
window manager, breakpoints, or startup behavior, update this document alongside the code.


