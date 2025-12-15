# Window Component Development Guidelines

This document provides guidelines for creating and maintaining window components in the application.

## Overview

All windows in the application use the base `Window` component located at `src/components/windows/Window.jsx`. This component provides:
- Window management (minimize, maximize, close)
- Dragging functionality
- Z-index management
- Integration with the taskbar

## Window Component API

### Props

```javascript
<Window
  id={string}              // Optional: Unique window ID. Auto-generated if not provided
  title={string}           // Required: Window title displayed in title bar
  children={ReactNode}     // Required: Window content
  style={object}           // Optional: Additional inline styles
  noStack={boolean}        // Optional: Prevent auto-stacking on load (default: false)
  onClose={function}       // Optional: Callback when window is closed
  className={string}       // Optional: Additional CSS classes
/>
```

### Example Usage

```javascript
import Window from './Window'

function MyWindow({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <Window
      id="my-window"
      title="My Window"
      onClose={onClose}
    >
      <div className="window-body">
        <p>Window content goes here</p>
      </div>
    </Window>
  )
}
```

## Common Pitfalls and Solutions

### 1. Missing Dependencies in useCallback/useEffect

**Problem:** Forgetting to include dependencies in dependency arrays can cause stale closures and bugs.

**Solution:** Always include all dependencies. ESLint will warn you with `react-hooks/exhaustive-deps`.

```javascript
// ❌ BAD - Missing dependency
const restoreWindow = useCallback((windowId) => {
  bringToFront(windowId) // bringToFront not in deps
}, [])

// ✅ GOOD - All dependencies included
const restoreWindow = useCallback((windowId) => {
  bringToFront(windowId)
}, [bringToFront])
```

### 2. Event Handling Conflicts

**Problem:** Drag handlers interfering with button clicks.

**Solution:** The `useDraggable` hook checks for `.title-bar-controls` before initiating drag. Ensure your control buttons are inside this container.

```javascript
// ✅ Correct structure
<div className="title-bar">
  <div className="title-bar-text">Window Title</div>
  <div className="title-bar-controls">
    <button onClick={handleMinimize}>Minimize</button>
    <button onClick={handleMaximize}>Maximize</button>
    <button onClick={handleClose}>Close</button>
  </div>
</div>
```

### 3. Window ID Conflicts

**Problem:** Using duplicate window IDs can cause unexpected behavior.

**Solution:** Always provide unique IDs or let the component auto-generate them.

```javascript
// ✅ GOOD - Unique ID
<Window id="marketplace-window" title="Marketplace" />

// ✅ GOOD - Auto-generated from title
<Window title="My Window" /> // ID: "my-window"

// ❌ BAD - Duplicate IDs
<Window id="window" title="Window 1" />
<Window id="window" title="Window 2" />
```

### 4. Window Registration Failures

**Problem:** Window not appearing in taskbar or not responding to controls.

**Solution:** Ensure the window is properly registered. Check console for warnings in development mode.

```javascript
// The Window component automatically registers on mount
// If registration fails, check:
// 1. Window ref is available
// 2. windowId is valid (alphanumeric, hyphens, underscores only)
// 3. WindowProvider is wrapping your app
```

## Window Context Methods

The `useWindow()` hook provides access to window management methods:

```javascript
const {
  registerWindow,        // Register a new window
  unregisterWindow,     // Remove a window
  minimizeWindow,        // Minimize a window
  restoreWindow,         // Restore a minimized window
  maximizeWindow,        // Maximize a window
  restoreWindowSize,     // Restore from maximized
  bringToFront,          // Bring window to front
  getWindow,             // Get window data by ID
  isWindowMinimized,     // Check if window is minimized
  isWindowActive,        // Check if window is active
  getAllWindows,         // Get all windows
} = useWindow()
```

## Validation and Error Handling

### Development Mode Warnings

In development mode, the window system provides helpful warnings for:
- Invalid window IDs
- Duplicate window IDs
- Operations on non-existent windows
- Window registration failures

### Error Recovery

Window operations are wrapped in try-catch blocks to prevent crashes. Errors are logged to the console in development mode.

## Checklist for New Window Components

When creating a new window component, ensure:

- [ ] Window uses the base `Window` component
- [ ] Unique `id` prop is provided (or let it auto-generate)
- [ ] `title` prop is provided
- [ ] `onClose` callback is handled if needed
- [ ] Window content is wrapped in `.window-body` class
- [ ] All dependencies are included in `useCallback`/`useEffect` hooks
- [ ] No duplicate window IDs
- [ ] Window is conditionally rendered based on state
- [ ] ESLint warnings are resolved

## Example: Complete Window Component

```javascript
import { useState } from 'react'
import Window from './Window'
import Button from '../ui/Button'

function ExampleWindow({ isOpen, onClose }) {
  const [count, setCount] = useState(0)

  if (!isOpen) return null

  return (
    <Window
      id="example-window"
      title="Example Window"
      onClose={onClose}
      style={{ width: '400px', height: '300px' }}
    >
      <div className="window-body">
        <h2>Example Content</h2>
        <p>Count: {count}</p>
        <Button onClick={() => setCount(count + 1)}>
          Increment
        </Button>
      </div>
    </Window>
  )
}

export default ExampleWindow
```

## Testing Window Functionality

After creating a window, verify:

1. **Minimize**: Click minimize button, window should hide and appear in taskbar
2. **Restore**: Click taskbar button, window should restore
3. **Maximize**: Click maximize button, window should fill screen
4. **Restore from Maximized**: Click restore button, window should return to previous size
5. **Close**: Click close button, window should disappear
6. **Drag**: Click and drag title bar, window should move
7. **Focus**: Click window, it should come to front
8. **Multiple Windows**: Open multiple windows, verify they work independently

## Troubleshooting

### Window not appearing in taskbar
- Check that window is registered (look for console warnings)
- Verify `WindowProvider` wraps your app
- Ensure window has a valid `title` prop

### Buttons not working (minimize, maximize, close)
- Check browser console for errors
- Verify buttons are inside `.title-bar-controls`
- Ensure event handlers are not being prevented by drag handlers

### Window not draggable
- Verify `.title-bar` element exists
- Check that `useDraggable` hook is working
- Ensure no CSS is preventing pointer events

### Z-index issues
- Windows automatically manage z-index through WindowContext
- Active window should have highest z-index
- Check for CSS conflicts

## Best Practices

1. **Always use the base Window component** - Don't create custom window implementations
2. **Provide meaningful titles** - Helps users identify windows
3. **Handle onClose properly** - Update parent state to hide window
4. **Use unique IDs** - Prevents conflicts and makes debugging easier
5. **Follow the structure** - Use `.window-body` for content
6. **Test all operations** - Minimize, maximize, close, drag
7. **Check ESLint warnings** - Fix dependency array issues immediately
8. **Use development warnings** - They help catch issues early

## Additional Resources

- Window component: `src/components/windows/Window.jsx`
- Window context: `src/contexts/WindowContext.jsx`
- Draggable hook: `src/hooks/useDraggable.js`
- Taskbar component: `src/components/Taskbar.jsx`

