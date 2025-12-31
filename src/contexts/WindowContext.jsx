import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { getInitialPosition, getCenteredPosition, getDefaultWindowSize, getCascadePosition } from '../utils/windowPosition'

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
  const [hasUserMoved, setHasUserMoved] = useState(new Map()) // Track if user has moved each window
  const nextZIndexRef = useRef(1000)
  
  // Cascade layout constants
  const CASCADE_STEP = 30
  const README_ID = 'window-readme-txt'
  const cascadeOrderRef = useRef([README_ID]) // README always index 0

  // Clamp a window's position so it stays within the visible desktop viewport
  // on desktop/tablet. This prevents windows from ending up completely off-screen.
  const clampToViewport = useCallback((pos, size) => {
    // SSR / non-browser safety
    if (typeof window === 'undefined') {
      return pos || { x: 20, y: 20 }
    }

    // Mobile: windows are fullscreen/stacked; don't clamp here.
    if (window.innerWidth <= 640) {
      return pos || { x: 20, y: 20 }
    }

    const padding = 8
    let taskbarH = 48 // Default fallback
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        const rootStyles = getComputedStyle(document.documentElement)
        const fromCss = parseInt(rootStyles.getPropertyValue('--taskbar-height') || '48', 10)
        if (!Number.isNaN(fromCss) && fromCss > 0) {
          taskbarH = fromCss
        }
      }
    } catch {
      // Ignore and use fallback
    }
    const vw = window.innerWidth || 1024
    const vh = window.innerHeight || 768

    // #region agent log
    if (import.meta.env.DEV) {
      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WindowContext.jsx:52',message:'clampToViewport called',data:{vw,vh,scrollY:window.scrollY,scrollX:window.scrollX,posX:pos?.x,posY:pos?.y,sizeWidth:size?.width,sizeHeight:size?.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
    }
    // #endregion

    const parseSize = (value, fallback) => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const n = parseInt(value, 10)
        if (!Number.isNaN(n) && n > 0) return n
      }
      return fallback
    }

    const w = parseSize(size?.width, 600)
    const h = parseSize(size?.height, 400)

    const maxX = Math.max(padding, vw - w - padding)
    const maxY = Math.max(padding, vh - taskbarH - h - padding)

    const baseX = typeof pos?.x === 'number' ? pos.x : padding
    const baseY = typeof pos?.y === 'number' ? pos.y : padding

    const clamped = {
      x: Math.min(Math.max(baseX, padding), maxX),
      y: Math.min(Math.max(baseY, padding), maxY),
    }
    
    // #region agent log
    if (import.meta.env.DEV) {
      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WindowContext.jsx:75',message:'clampToViewport result',data:{clampedX:clamped.x,clampedY:clamped.y,baseX,baseY,maxX,maxY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
    }
    // #endregion

    return clamped
  }, [])

  // Helper to get stable cascade index for a window
  const getCascadeIndex = useCallback((windowId) => {
    const id = String(windowId || '')
    if (id === README_ID) return 0

    const list = cascadeOrderRef.current
    const existing = list.indexOf(id)
    if (existing >= 0) return existing

    // Ensure README is at index 0
    if (list.length === 0 || list[0] !== README_ID) {
      list.unshift(README_ID)
    }
    
    list.push(id)
    cascadeOrderRef.current = list
    // Return index in array (README is 0, first other window is 1, etc.)
    return list.indexOf(id)
  }, [])

  // Helper to compute README anchor position (base for cascade)
  // Accepts windows map as parameter to work correctly inside setWindows callbacks
  const getReadmeAnchor = useCallback((windowsMap = null) => {
    // Use provided map or fall back to current windows state
    const windowsToUse = windowsMap || windows
    
    // If README is already registered and has a position, use its actual position
    const readme = windowsToUse.get(README_ID)
    if (readme?.position && typeof readme.position.x === 'number' && typeof readme.position.y === 'number') {
      // Use actual README position as base
      return { x: readme.position.x, y: readme.position.y }
    }
    
    // Otherwise, calculate centered position for README
    const size = readme?.size || getDefaultWindowSize(README_ID)
    
    // Parse size if needed
    let width = size.width
    let height = size.height
    if (typeof width === 'string' && width.includes('px')) {
      width = parseInt(width, 10) || 820
    } else if (typeof width !== 'number') {
      width = 820
    }
    if (typeof height === 'string' && height.includes('px')) {
      height = parseInt(height, 10) || 600
    } else if (typeof height !== 'number') {
      height = 600
    }
    
    const isMobile = window.innerWidth <= 640
    return getCenteredPosition({
      width,
      height,
      padding: 24,
      isMobile,
      windowId: README_ID,
    })
  }, [windows])

  /**
   * Register a new window in the window manager.
   * 
   * @param {string} windowId - Unique identifier for the window
   * @param {Object} windowData - Window configuration
   * @param {string} [windowData.title] - Window title
   * @param {Object} [windowData.position] - Initial window position {x, y}
   * @param {Object} [windowData.size] - Initial window size {width, height}
   * @param {boolean} [windowData.centerOnOpen=true] - Whether to center window on first open
   */
  const registerWindow = useCallback((windowId, windowData) => {
    if (!windowId || typeof windowId !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WindowContext] registerWindow: Invalid windowId provided', windowId)
      }
      return
    }

    // Mobile-only: Auto-close other windows when a new one opens
    const isMobile = window.innerWidth <= 640
    if (isMobile) {
      setWindows(prev => {
        const next = new Map(prev)
        // Minimize all other windows (mobile: only one window visible at a time)
        prev.forEach((win, id) => {
          if (id !== windowId && !win.isMinimized) {
            setMinimizedWindows(prevMin => {
              const nextMin = new Set(prevMin)
              nextMin.add(id)
              return nextMin
            })
          }
        })
        return next
      })
    }

    setWindows(prev => {
      // Check for duplicate window IDs
      const existingWindow = prev.get(windowId)
      const isNewWindow = !existingWindow
      
      if (existingWindow && process.env.NODE_ENV === 'development') {
        console.warn(`[WindowContext] registerWindow: Window with ID "${windowId}" already exists. Preserving existing state.`)
      }

      const next = new Map(prev)
      
      // Determine position: center on first open if new window and centerOnOpen is true
      // Special case: try-again-window should always center when opened (it's a modal)
      const isTryAgainWindow = windowId === 'try-again-window'
      let position = windowData?.position || existingWindow?.position
      const centerOnOpen = windowData?.centerOnOpen !== false // Default to true
      
      
      // For new windows, calculate centered position synchronously if possible
      // For try-again-window, always center on open (even if reopening) - force recentering
      const shouldCenter = (isNewWindow && centerOnOpen && !windowData?.position) || (isTryAgainWindow && centerOnOpen)
      
      
      if (shouldCenter) {
        try {
          const defaultSize = getDefaultWindowSize(windowId)
          
          // Detect mobile viewport (<= 640px) - only center on desktop/tablet
          const isMobile = window.innerWidth <= 640
          
          // Only center on desktop/tablet, not mobile
          if (!isMobile) {
            // Parse window size from windowData or use defaults
            let windowWidth = defaultSize.width
            let windowHeight = defaultSize.height
            
            if (windowData?.size) {
              if (typeof windowData.size.width === 'number') {
                windowWidth = windowData.size.width
              } else if (typeof windowData.size.width === 'string') {
                // Handle CSS variables (e.g., 'var(--window-size-tanggang)')
                if (windowData.size.width.includes('var(')) {
                  // Try to get computed value from DOM if available
                  const windowElement = document.getElementById(windowId)
                  if (windowElement) {
                    const computedWidth = window.getComputedStyle(windowElement).width
                    const parsedWidth = parseFloat(computedWidth)
                    if (!isNaN(parsedWidth) && parsedWidth > 0) {
                      windowWidth = parsedWidth
                    }
                  }
                  // If element not found yet, use default - position will be updated later
                } else if (windowData.size.width.includes('px')) {
                  windowWidth = parseInt(windowData.size.width) || defaultSize.width
                }
              }
              
              if (typeof windowData.size.height === 'number') {
                windowHeight = windowData.size.height
              } else if (typeof windowData.size.height === 'string') {
                // Handle CSS variables
                if (windowData.size.height.includes('var(')) {
                  const windowElement = document.getElementById(windowId)
                  if (windowElement) {
                    const computedHeight = window.getComputedStyle(windowElement).height
                    const parsedHeight = parseFloat(computedHeight)
                    if (!isNaN(parsedHeight) && parsedHeight > 0) {
                      windowHeight = parsedHeight
                    }
                  }
                  // If element not found yet, use default - position will be updated later
                } else if (windowData.size.height.includes('px')) {
                  windowHeight = parseInt(windowData.size.height) || defaultSize.height
                } else if (windowData.size.height === 'auto') {
                  // For auto height, try to measure from DOM
                  const windowElement = document.getElementById(windowId)
                  if (windowElement) {
                    const computedHeight = window.getComputedStyle(windowElement).height
                    const parsedHeight = parseFloat(computedHeight)
                    if (!isNaN(parsedHeight) && parsedHeight > 0) {
                      windowHeight = parsedHeight
                    }
                  }
                }
              }
            }
            
            const isReadme = windowId === README_ID || windowId === 'readme' || windowId?.includes('readme')
            
            if (isReadme) {
              // README: fixed spawn position (120px, 20px) via getInitialPosition
              position = getInitialPosition({ 
                type: 'readme',
                width: windowWidth,
                height: windowHeight,
                isMobile: false
              })
              // Ensure README is at index 0 in cascade order
              if (cascadeOrderRef.current[0] !== README_ID) {
                cascadeOrderRef.current = [README_ID, ...cascadeOrderRef.current.filter(id => id !== README_ID)]
              }
            } else if (isTryAgainWindow) {
              // Try-again-window: always centered (modal popup)
              position = getCenteredPosition({
                width: windowWidth,
                height: windowHeight,
                padding: 24,
                isMobile: false,
                windowId
              })
            } else {
              // All windows (including ChubzWindow): cascade from README
              // Pass prev (current windows state) to getReadmeAnchor to get accurate README position
              const base = getReadmeAnchor(prev)
              const idx = getCascadeIndex(windowId) // First non-readme becomes index 1
              
              // Debug: ensure we have valid base position
              if (!base || typeof base.x !== 'number' || typeof base.y !== 'number') {
                console.warn('[WindowContext] Invalid README anchor position:', base)
                // Fallback to centered position
                position = getCenteredPosition({
                  width: windowWidth,
                  height: windowHeight,
                  padding: 24,
                  isMobile: false,
                  windowId
                })
              } else {
                position = getCascadePosition({
                  width: windowWidth,
                  height: windowHeight,
                  baseX: base.x,
                  baseY: base.y,
                  index: idx,
                  padding: 24,
                  isMobile: false
                })
                
                // Special adjustment for MINT_INFO window: 1px left, 1px down
                if (windowId === 'window-mint-info-exe') {
                  position.x -= 1 // 1px to the left
                  position.y += 1 // 1px down
                }
              }
            }
            
          } else {
            // Mobile: use default position
            position = { x: 20, y: 20 }
          }
          
          // Don't apply position to DOM here during registration - let the Window component's effect handle it
          // This prevents glitches when multiple windows register at once on page load
        } catch (e) {
          // Fallback to default position if centering fails
          position = { x: 20, y: 20 }
        }
      }
      
      // Preserve existing window state (isMaximized, zIndex) when re-registering
      const positionBeforeClamp = position
      const clampedPosition = clampToViewport(position, windowData?.size || existingWindow?.size)
      
      // #region agent log
      if (import.meta.env.DEV) {
        fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WindowContext.jsx:374',message:'registerWindow - position calculated',data:{windowId,positionBeforeClampX:positionBeforeClamp?.x,positionBeforeClampY:positionBeforeClamp?.y,clampedX:clampedPosition?.x,clampedY:clampedPosition?.y,existingWindow:!!existingWindow,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,scrollY:window.scrollY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
      }
      // #endregion
      
      const windowEntry = {
        id: windowId,
        title: windowData?.title || existingWindow?.title || windowId,
        position: clampedPosition,
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
        // Reset hasUserMoved for new windows
        setHasUserMoved(prev => {
          const next = new Map(prev)
          next.set(windowId, false)
          return next
        })
      }
      
      // For try-again-window (modal), always reset hasUserMoved so it can recenter on each open
      if (isTryAgainWindow) {
        setHasUserMoved(prev => {
          const next = new Map(prev)
          next.set(windowId, false)
          return next
        })
      }
      next.set(windowId, windowEntry)
      return next
    })
    // Ensure a (re)registered window is not left in minimized state
    setMinimizedWindows(prev => {
      const next = new Set(prev)
      next.delete(windowId)
      return next
    })
    setActiveWindowId(windowId)
  }, [clampToViewport, getReadmeAnchor, getCascadeIndex])

  /**
   * Unregister a window from the window manager.
   * 
   * @param {string} windowId - Unique identifier for the window to remove
   */
  const unregisterWindow = useCallback((windowId) => {
    // Compute the next active window ID based on the windows map AFTER removal.
    // Use a local variable populated inside setWindows to avoid stale closures.
    let computedNextActiveId = null

    setWindows(prev => {
      const next = new Map(prev)
      next.delete(windowId)

      // Choose the remaining window with the highest zIndex as the next active candidate
      let bestId = null
      let bestZ = -Infinity
      next.forEach((win) => {
        if (typeof win.zIndex === 'number' && win.zIndex > bestZ) {
          bestZ = win.zIndex
          bestId = win.id
        }
      })
      computedNextActiveId = bestId || null

      return next
    })
    setMinimizedWindows(prev => {
      const next = new Set(prev)
      next.delete(windowId)
      return next
    })

    // Use functional update to avoid capturing a stale activeWindowId
    setActiveWindowId(prevActiveId => {
      if (prevActiveId === windowId) {
        return computedNextActiveId
      }
      return prevActiveId
    })
  }, [])

  /**
   * Minimize a window (hide it and show it in the taskbar).
   * 
   * @param {string} windowId - Unique identifier for the window to minimize
   */
  const minimizeWindow = useCallback((windowId) => {
    // Backward compatibility: map old wojak-creator to wojak-generator
    if (windowId === 'wojak-creator') {
      windowId = 'wojak-generator'
    }
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
   * Does NOT reposition windows (only updates z-index).
   * Exception: assigns cascade position if window has no position at all.
   * This is called when clicking a window in the taskbar or Start menu.
   * 
   * @param {string} windowId - Unique identifier for the window to bring to front
   */
  const bringToFront = useCallback((windowId) => {
    // Backward compatibility: map old wojak-creator to wojak-generator
    if (windowId === 'wojak-creator') {
      windowId = 'wojak-generator'
    }
    // Mobile-only: Auto-minimize other windows when bringing one to front
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
    if (isMobile) {
      setWindows(prev => {
        prev.forEach((win, id) => {
          if (id !== windowId && !win.isMinimized) {
            setMinimizedWindows(prevMin => {
              const nextMin = new Set(prevMin)
              nextMin.add(id)
              return nextMin
            })
          }
        })
        return prev
      })
    }
    setWindows(prev => {
      const next = new Map(prev)
      const winEntry = next.get(windowId)
      if (winEntry) {
        // Only update z-index, do NOT reposition
        // Exception: if window has no position at all, assign cascade position once
        if (!winEntry.position || (winEntry.position.x === undefined && winEntry.position.y === undefined)) {
          // Window has no position - assign cascade position once
          try {
            const defaultSize = getDefaultWindowSize(windowId)
            let windowWidth = defaultSize.width
            let windowHeight = defaultSize.height
            
            // Try to get actual size from DOM or stored size
            const windowElement = document.getElementById(windowId)
            if (windowElement) {
              const rect = windowElement.getBoundingClientRect()
              if (rect.width > 0) windowWidth = rect.width
              if (rect.height > 0) windowHeight = rect.height
            } else if (winEntry.size) {
              // Parse from stored size
              if (typeof winEntry.size.width === 'number') {
                windowWidth = winEntry.size.width
              } else if (typeof winEntry.size.width === 'string' && winEntry.size.width.includes('px')) {
                windowWidth = parseInt(winEntry.size.width, 10) || defaultSize.width
              }
              if (typeof winEntry.size.height === 'number') {
                windowHeight = winEntry.size.height
              } else if (typeof winEntry.size.height === 'string' && winEntry.size.height.includes('px')) {
                windowHeight = parseInt(winEntry.size.height, 10) || defaultSize.height
              }
            }
            
            const isReadme = windowId === README_ID || windowId === 'readme' || windowId?.includes('readme')
            let newPos
            
            if (isReadme) {
              newPos = getCenteredPosition({
                width: windowWidth,
                height: windowHeight,
                padding: 24,
                windowId
              })
        } else {
          // Get README anchor from current windows state
          const base = getReadmeAnchor(prev)
          const idx = getCascadeIndex(windowId)
          
          if (!base || typeof base.x !== 'number' || typeof base.y !== 'number') {
            // Fallback to centered if README anchor is invalid
            newPos = getCenteredPosition({
              width: windowWidth,
              height: windowHeight,
              padding: 24,
              windowId
            })
          } else {
            newPos = getCascadePosition({
              width: windowWidth,
              height: windowHeight,
              baseX: base.x,
              baseY: base.y,
              index: idx,
              padding: 24
            })
            
              // Special adjustment for MINT_INFO window: 1px left, 1px down
              if (windowId === 'window-mint-info-exe') {
                newPos.x -= 1 // 1px to the left
                newPos.y += 1 // 1px down
              }
          }
        }
            
            const clampedPos = clampToViewport(newPos, winEntry.size)
            next.set(windowId, {
              ...winEntry,
              position: clampedPos,
              zIndex: nextZIndexRef.current++,
            })
          } catch (e) {
            // If positioning fails, just update z-index
            next.set(windowId, {
              ...winEntry,
              zIndex: nextZIndexRef.current++,
            })
          }
        } else {
          // Window has position - only update z-index
          next.set(windowId, {
            ...winEntry,
            zIndex: nextZIndexRef.current++,
          })
        }
      }
      return next
    })
    setActiveWindowId(windowId)
  }, [hasUserMoved, setMinimizedWindows, clampToViewport, getReadmeAnchor, getCascadeIndex])

  /**
   * Restore a minimized window (show it and remove from minimized set).
   * Centers window if it has never been moved by the user.
   * This is called when opening a window from Start menu or taskbar.
   * 
   * @param {string} windowId - Unique identifier for the window to restore
   */
  const restoreWindow = useCallback((windowId) => {
    // Backward compatibility: map old wojak-creator to wojak-generator
    if (windowId === 'wojak-creator') {
      windowId = 'wojak-generator'
    }
    // Mobile-only: Auto-minimize other windows when restoring one
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
    if (isMobile) {
      setWindows(prev => {
        prev.forEach((win, id) => {
          if (id !== windowId && !win.isMinimized) {
            setMinimizedWindows(prevMin => {
              const nextMin = new Set(prevMin)
              nextMin.add(id)
              return nextMin
            })
          }
        })
        return prev
      })
    }
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
      
      const winEntry = prev.get(windowId)
      const wasMoved = hasUserMoved.get(windowId)
      
      // Center on restore only if window has never been moved by user
      // This ensures windows opened from Start menu/taskbar appear centered
      // Only center on desktop/tablet, not mobile
      const isDesktop = typeof window !== 'undefined' && window.innerWidth > 640
      if (!wasMoved && !winEntry.isMaximized && isDesktop) {
        try {
          // Functions already imported at top of file
          const defaultSize = getDefaultWindowSize(windowId)
          
          // Try to get actual rendered size from DOM element
          const windowElement = document.getElementById(windowId)
          let windowWidth = defaultSize.width
          let windowHeight = defaultSize.height

          if (windowElement) {
            const rect = windowElement.getBoundingClientRect()
            if (rect.width > 0) windowWidth = rect.width
            if (rect.height > 0) windowHeight = rect.height
          } else {
            // Fallback to stored size or defaults
            if (winEntry.size) {
              if (typeof winEntry.size.width === 'number') {
                windowWidth = winEntry.size.width
              } else if (typeof winEntry.size.width === 'string' && winEntry.size.width.includes('px')) {
                windowWidth = parseInt(winEntry.size.width, 10) || defaultSize.width
              }
              
              if (typeof winEntry.size.height === 'number') {
                windowHeight = winEntry.size.height
              } else if (typeof winEntry.size.height === 'string' && winEntry.size.height.includes('px')) {
                windowHeight = parseInt(winEntry.size.height, 10) || defaultSize.height
              }
            }
          }
          
          // Detect mobile viewport (<= 640px)
          const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 640
          
          const isReadme = windowId === README_ID || windowId === 'readme' || windowId?.includes('readme')
          
          let newPos
          if (isReadme) {
            // README: center
            newPos = getCenteredPosition({
              width: windowWidth,
              height: windowHeight,
              padding: 24, // Explicit padding for desktop OS feel
              isMobile: isMobileViewport,
              windowId
            })
          } else {
            // Other windows: cascade (only if not moved by user)
            // Pass prev (current windows state) to getReadmeAnchor
            const base = getReadmeAnchor(prev)
            const idx = getCascadeIndex(windowId)
            
            if (!base || typeof base.x !== 'number' || typeof base.y !== 'number') {
              // Fallback to centered if README anchor is invalid
              newPos = getCenteredPosition({
                width: windowWidth,
                height: windowHeight,
                padding: 24,
                isMobile: isMobileViewport,
                windowId
              })
            } else {
              newPos = getCascadePosition({
                width: windowWidth,
                height: windowHeight,
                baseX: base.x,
                baseY: base.y,
                index: idx,
                padding: 24,
                isMobile: isMobileViewport
              })
              
              // Special adjustment for MINT_INFO window: 1px left, 1px down
              if (windowId === 'window-mint-info-exe') {
                newPos.x -= 1 // 1px to the left
                newPos.y += 1 // 1px down
              }
            }
          }
          
          const clampedPos = clampToViewport(newPos, winEntry.size)
          const next = new Map(prev)
          next.set(windowId, { ...winEntry, position: clampedPos })
          return next
        } catch (e) {
          // Continue with existing position if centering fails
        }
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
  }, [bringToFront, hasUserMoved, clampToViewport, getReadmeAnchor, getCascadeIndex])

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
        // Mark window as moved by user
        setHasUserMoved(prev => {
          const next = new Map(prev)
          next.set(windowId, true)
          return next
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
    // Backward compatibility: map old wojak-creator to wojak-generator
    if (windowId === 'wojak-creator') {
      windowId = 'wojak-generator'
    }
    return minimizedWindows.has(windowId)
  }, [minimizedWindows])

  // Check if window is active
  const isWindowActive = useCallback((windowId) => {
    // Backward compatibility: map old wojak-creator to wojak-generator
    if (windowId === 'wojak-creator') {
      windowId = 'wojak-generator'
    }
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
        hasUserMoved, // Expose hasUserMoved map for components that need to check if user moved a window
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

