import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const WindowContext = createContext()

/**
 * WindowProvider component that manages window state and provides window management functions.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components that can access window context
 * @returns {React.ReactElement} The context provider
 */
export function WindowProvider({ children }) {
  const [windows, setWindows] = useState(new Map())
  const [minimizedWindows, setMinimizedWindows] = useState(new Set())
  const [activeWindowId, setActiveWindowId] = useState(null)
  const nextZIndexRef = useRef(1000)

  /**
   * Register a new window in the window manager.
   * 
   * @param {string} windowId - Unique identifier for the window
   * @param {Object} windowData - Window configuration
   * @param {string} [windowData.title] - Window title
   * @param {Object} [windowData.position] - Initial window position {x, y}
   * @param {Object} [windowData.size] - Initial window size {width, height}
   */
  const registerWindow = useCallback((windowId, windowData) => {
    if (!windowId || typeof windowId !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WindowContext] registerWindow: Invalid windowId provided', windowId)
      }
      return
    }

    setWindows(prev => {
      // Check for duplicate window IDs
      const existingWindow = prev.get(windowId)
      if (existingWindow && process.env.NODE_ENV === 'development') {
        console.warn(`[WindowContext] registerWindow: Window with ID "${windowId}" already exists. Preserving existing state.`)
      }

      const next = new Map(prev)
      // Preserve existing window state (isMaximized, zIndex) when re-registering
      const windowEntry = {
        id: windowId,
        title: windowData?.title || existingWindow?.title || windowId,
        position: windowData?.position || existingWindow?.position || { x: 20, y: 20 },
        size: windowData?.size || existingWindow?.size || { width: 'auto', height: 'auto' },
        // Preserve zIndex from existing window, or assign new one for new windows
        zIndex: existingWindow?.zIndex ?? nextZIndexRef.current++,
        ...windowData,
        // Preserve isMaximized from existing window if not explicitly provided in windowData
        isMaximized: windowData?.isMaximized !== undefined ? windowData.isMaximized : (existingWindow?.isMaximized ?? false),
      }
      // Only increment zIndex if this is a new window
      if (!existingWindow) {
        windowEntry.zIndex = nextZIndexRef.current++
      }
      next.set(windowId, windowEntry)
      return next
    })
    setActiveWindowId(windowId)
  }, [])

  /**
   * Unregister a window from the window manager.
   * 
   * @param {string} windowId - Unique identifier for the window to remove
   */
  const unregisterWindow = useCallback((windowId) => {
    setWindows(prev => {
      const next = new Map(prev)
      next.delete(windowId)
      return next
    })
    setMinimizedWindows(prev => {
      const next = new Set(prev)
      next.delete(windowId)
      return next
    })
    if (activeWindowId === windowId) {
      setActiveWindowId(null)
    }
  }, [activeWindowId])

  /**
   * Minimize a window (hide it and show it in the taskbar).
   * 
   * @param {string} windowId - Unique identifier for the window to minimize
   */
  const minimizeWindow = useCallback((windowId) => {
    if (!windowId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WindowContext] minimizeWindow: Invalid windowId provided', windowId)
      }
      return
    }

    setWindows(prev => {
      if (!prev.has(windowId)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[WindowContext] minimizeWindow: Window with ID "${windowId}" does not exist`)
        }
        return prev
      }
      return prev
    })

    setMinimizedWindows(prev => {
      const next = new Set(prev).add(windowId)
      return next
    })
    setActiveWindowId(prev => prev === windowId ? null : prev)
  }, [])

  /**
   * Bring a window to the front (highest z-index).
   * 
   * @param {string} windowId - Unique identifier for the window to bring to front
   */
  const bringToFront = useCallback((windowId) => {
    setWindows(prev => {
      const next = new Map(prev)
      const window = next.get(windowId)
      if (window) {
        next.set(windowId, {
          ...window,
          zIndex: nextZIndexRef.current++,
        })
      }
      return next
    })
    setActiveWindowId(windowId)
  }, [])

  /**
   * Restore a minimized window (show it and remove from minimized set).
   * 
   * @param {string} windowId - Unique identifier for the window to restore
   */
  const restoreWindow = useCallback((windowId) => {
    if (!windowId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WindowContext] restoreWindow: Invalid windowId provided', windowId)
      }
      return
    }

    setWindows(prev => {
      if (!prev.has(windowId)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[WindowContext] restoreWindow: Window with ID "${windowId}" does not exist`)
        }
        return prev
      }
      return prev
    })

    setMinimizedWindows(prev => {
      const next = new Set(prev)
      next.delete(windowId)
      return next
    })
    setActiveWindowId(windowId)
    bringToFront(windowId)
  }, [bringToFront])

  /**
   * Maximize a window (fill the screen).
   * 
   * @param {string} windowId - Unique identifier for the window to maximize
   */
  const maximizeWindow = useCallback((windowId) => {
    if (!windowId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WindowContext] maximizeWindow: Invalid windowId provided', windowId)
      }
      return
    }

    setWindows(prev => {
      const next = new Map(prev)
      const window = next.get(windowId)
      if (!window) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[WindowContext] maximizeWindow: Window with ID "${windowId}" does not exist`)
        }
        return prev
      }
      next.set(windowId, {
        ...window,
        isMaximized: true,
      })
      return next
    })
    setActiveWindowId(windowId)
    bringToFront(windowId)
  }, [bringToFront])

  /**
   * Restore a window from maximized state to its previous size.
   * 
   * @param {string} windowId - Unique identifier for the window to restore
   */
  const restoreWindowSize = useCallback((windowId) => {
    setWindows(prev => {
      const next = new Map(prev)
      const window = next.get(windowId)
      if (window) {
        next.set(windowId, {
          ...window,
          isMaximized: false,
        })
      }
      return next
    })
  }, [])

  // Update window position
  const updateWindowPosition = useCallback((windowId, position) => {
    setWindows(prev => {
      const next = new Map(prev)
      const window = next.get(windowId)
      if (window && !window.isMaximized) {
        next.set(windowId, {
          ...window,
          position,
        })
      }
      return next
    })
  }, [])

  // Update window size
  const updateWindowSize = useCallback((windowId, size) => {
    setWindows(prev => {
      const next = new Map(prev)
      const window = next.get(windowId)
      if (window && !window.isMaximized) {
        next.set(windowId, {
          ...window,
          size,
        })
      }
      return next
    })
  }, [])

  // Get all open windows (not minimized)
  const getOpenWindows = useCallback(() => {
    return Array.from(windows.values()).filter(
      win => !minimizedWindows.has(win.id)
    )
  }, [windows, minimizedWindows])

  // Get all windows (including minimized)
  const getAllWindows = useCallback(() => {
    return Array.from(windows.values())
  }, [windows])

  // Get window by ID
  const getWindow = useCallback((windowId) => {
    return windows.get(windowId)
  }, [windows])

  // Check if window is minimized
  const isWindowMinimized = useCallback((windowId) => {
    return minimizedWindows.has(windowId)
  }, [minimizedWindows])

  // Check if window is active
  const isWindowActive = useCallback((windowId) => {
    return activeWindowId === windowId
  }, [activeWindowId])

  // Cascade windows
  const cascadeWindows = useCallback(() => {
    const openWindows = getOpenWindows()
    let x = 20
    let y = 20
    const offset = 30

    setWindows(prev => {
      const next = new Map(prev)
      openWindows.forEach((win, index) => {
        if (!win.isMaximized) {
          next.set(win.id, {
            ...win,
            position: { x: x + index * offset, y: y + index * offset },
            zIndex: nextZIndexRef.current++,
          })
        }
      })
      return next
    })
  }, [getOpenWindows])

  // Tile windows horizontally
  const tileWindows = useCallback(() => {
    const openWindows = getOpenWindows()
    if (openWindows.length === 0) return

    const windowWidth = Math.floor((window.innerWidth - 40) / openWindows.length)
    let x = 20

    setWindows(prev => {
      const next = new Map(prev)
      openWindows.forEach((win, index) => {
        if (!win.isMaximized) {
          next.set(win.id, {
            ...win,
            position: { x: x + index * windowWidth, y: 20 },
            size: { width: `${windowWidth}px`, height: win.size.height },
            zIndex: nextZIndexRef.current++,
          })
        }
      })
      return next
    })
  }, [getOpenWindows])

  return (
    <WindowContext.Provider
      value={{
        windows,
        minimizedWindows,
        activeWindowId,
        registerWindow,
        unregisterWindow,
        minimizeWindow,
        restoreWindow,
        maximizeWindow,
        restoreWindowSize,
        bringToFront,
        updateWindowPosition,
        updateWindowSize,
        getOpenWindows,
        getAllWindows,
        getWindow,
        isWindowMinimized,
        isWindowActive,
        cascadeWindows,
        tileWindows,
      }}
    >
      {children}
    </WindowContext.Provider>
  )
}

/**
 * Hook to access window management functions and state.
 * 
 * @returns {Object} Window context containing:
 * @returns {Map} returns.windows - Map of all registered windows
 * @returns {Set} returns.minimizedWindows - Set of minimized window IDs
 * @returns {string|null} returns.activeWindowId - ID of the currently active window
 * @returns {Function} returns.registerWindow - Function to register a new window
 * @returns {Function} returns.unregisterWindow - Function to unregister a window
 * @returns {Function} returns.minimizeWindow - Function to minimize a window
 * @returns {Function} returns.restoreWindow - Function to restore a minimized window
 * @returns {Function} returns.maximizeWindow - Function to maximize a window
 * @returns {Function} returns.restoreWindowSize - Function to restore from maximized
 * @returns {Function} returns.bringToFront - Function to bring a window to front
 * @returns {Function} returns.updateWindowPosition - Function to update window position
 * @returns {Function} returns.updateWindowSize - Function to update window size
 * @returns {Function} returns.getOpenWindows - Function to get all non-minimized windows
 * @returns {Function} returns.getAllWindows - Function to get all windows
 * @returns {Function} returns.getWindow - Function to get a window by ID
 * @returns {Function} returns.isWindowMinimized - Function to check if window is minimized
 * @returns {Function} returns.isWindowActive - Function to check if window is active
 * @returns {Function} returns.cascadeWindows - Function to cascade all windows
 * @returns {Function} returns.tileWindows - Function to tile all windows horizontally
 * @throws {Error} If used outside of WindowProvider
 * 
 * @example
 * ```jsx
 * const { minimizeWindow, restoreWindow, isWindowMinimized } = useWindow()
 * 
 * const handleClick = () => {
 *   if (isWindowMinimized('my-window')) {
 *     restoreWindow('my-window')
 *   } else {
 *     minimizeWindow('my-window')
 *   }
 * }
 * ```
 */
export function useWindow() {
  const context = useContext(WindowContext)
  if (!context) {
    throw new Error('useWindow must be used within WindowProvider')
  }
  return context
}

