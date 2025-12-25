import { useDraggable } from '../../hooks/useDraggable'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useWindow } from '../../contexts/WindowContext'
import { getInitialPosition, getCenteredPosition } from '../../utils/windowPosition'
import { getWindowIcon } from '../../utils/windowIcons'
import { getWindowSizeConstraints, clampWindowPosition } from '../../utils/windowPosition'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../../contexts/KeyboardPriorityContext'
import { playSound } from '../../utils/soundManager'

/**
 * Window component that provides a draggable, resizable window with minimize, maximize, and close functionality.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Unique window identifier. Auto-generated from title if not provided.
 * @param {string} props.title - Window title displayed in the title bar. Required.
 * @param {React.ReactNode} props.children - Window content to be displayed in the window body.
 * @param {Object} [props.style={}] - Additional inline styles to apply to the window container.
 * @param {boolean} [props.noStack=false] - If true, prevents the window from auto-stacking on initial load.
 * @param {Function} [props.onClose] - Callback function called when the window is closed.
 * @param {string} [props.className=''] - Additional CSS classes to apply to the window container.
 * @param {string} [props.icon] - Optional icon path. If not provided, will be auto-determined from window ID/title.
 * @param {boolean} [props.allowScroll=false] - If true, adds scroll-allowed class to window-body for internal scrolling.
 * @returns {React.ReactElement|null} The window component or null if not visible.
 * 
 * @example
 * ```jsx
 * <Window
 *   id="my-window"
 *   title="My Window"
 *   onClose={() => setIsOpen(false)}
 * >
 *   <div>Window content</div>
 * </Window>
 * ```
 */
export default function Window({
  id,
  title,
  children,
  style = {},
  noStack = false,
  onClose,
  className = '',
  icon,
  allowScroll = false, // If true, adds scroll-allowed class to window-body for internal scrolling
  contentAutoHeight = false, // If true, window-body will size to content instead of stretching
  type, // Window type identifier (e.g., 'readme') for special positioning
}) {
  // Generate stable window ID - sanitize title to only allow alphanumeric, hyphens, and underscores
  const sanitizeWindowId = (title) => {
    if (!title) return `window-${Math.random().toString(36).substr(2, 9)}`
    return `window-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace any non-alphanumeric characters with hyphens
      .replace(/^-+|-+$/g, '')}` // Remove leading/trailing hyphens
  }
  const windowIdRef = useRef(id || sanitizeWindowId(title))
  const windowId = windowIdRef.current
  
  // Get icon path - use provided icon or auto-determine from window ID/title
  // If icon is explicitly null or false, don't render any icon
  const iconPath = icon === null || icon === false ? null : (icon || getWindowIcon(windowId, title))
  
  const { 
    registerWindow, 
    unregisterWindow, 
    minimizeWindow, 
    restoreWindow,
    maximizeWindow,
    restoreWindowSize,
    bringToFront,
    updateWindowPosition,
    updateWindowSize,
    getWindow,
    isWindowMinimized,
    isWindowActive,
    hasUserMoved,
  } = useWindow()
  
  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Make window draggable (dragging disabled on mobile; WindowContext owns stacking)
  const { windowRef } = useDraggable(isMobile, {
    onActivate: () => {
      try {
        bringToFront(windowId)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Window] Error bringing window to front on activate:', error, 'windowId:', windowId)
        }
      }
    },
    onDragEnd: (pos) => {
      try {
        // Mark that we just finished dragging to prevent position sync race
        justFinishedDragRef.current = true
        updateWindowPosition(windowId, pos)
        // Clear the flag after state update completes (next frame)
        requestAnimationFrame(() => {
          setTimeout(() => {
            justFinishedDragRef.current = false
          }, 50) // Small delay to ensure state update propagates
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Window] Error updating position on drag end:', error, 'windowId:', windowId)
        }
        justFinishedDragRef.current = false
      }
    },
  })
  const [isVisible, setIsVisible] = useState(true)
  const savedPositionRef = useRef({ x: 0, y: 0 })
  const savedSizeRef = useRef({ width: '', height: '' })
  const justFinishedDragRef = useRef(false) // Track if we just finished dragging to prevent position sync race
  const windowData = getWindow(windowId)
  const isMinimized = windowData ? isWindowMinimized(windowId) : false
  const isMaximized = windowData?.isMaximized || false
  const isActive = windowData ? isWindowActive(windowId) : false

  // Validate windowId format in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (!windowId || typeof windowId !== 'string' || windowId.trim() === '') {
        console.warn('[Window] Invalid windowId:', windowId, 'Window title:', title)
      }
      // Check for valid ID format (alphanumeric, hyphens, underscores)
      if (windowId && !/^[a-zA-Z0-9_-]+$/.test(windowId)) {
        console.warn('[Window] windowId contains invalid characters:', windowId, 'Consider using alphanumeric characters, hyphens, or underscores only.')
      }
    }
  }, [windowId, title])

  // Track registration to prevent re-registration on effect re-runs
  const hasRegisteredRef = useRef(false)
  const isMountedRef = useRef(true)
  
  // Register window on mount - use a more reliable approach
  useEffect(() => {
    isMountedRef.current = true
    
    // Skip if already registered (prevents re-registration when effect re-runs)
    if (hasRegisteredRef.current) {
      return
    }
    
    const win = windowRef.current
    if (!win) {
      // Retry after a short delay if window ref isn't ready
      const timeout = setTimeout(() => {
        const retryWin = windowRef.current
        if (retryWin && !hasRegisteredRef.current && isMountedRef.current) {
          try {
            const rect = retryWin.getBoundingClientRect()
            // Parse size from style or use defaults
            // For CSS variables, we'll let the registration logic handle it
            const width = retryWin.style.width || style.width || 'auto'
            const height = retryWin.style.height || style.height || 'auto'
            
            // Check if this window should be centered (default is true, but can be overridden)
            // TangGang window should be centered on desktop/tablet
            const shouldCenter = windowId === 'tanggang' ? (window.innerWidth > 640) : true
            
            registerWindow(windowId, {
              title,
              // Don't pass position - let registerWindow center it if centerOnOpen is true
              size: { width, height },
              centerOnOpen: shouldCenter,
            })
            hasRegisteredRef.current = true
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[Window] Failed to register window:', error, 'windowId:', windowId)
            }
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('[Window] Window ref not available after retry, registration may have failed. windowId:', windowId)
        }
      }, 10)
      return () => clearTimeout(timeout)
    }

    try {
      const rect = win.getBoundingClientRect()
      // Parse size from style or use defaults
      // For CSS variables, we'll let the registration logic handle it
      const width = win.style.width || style.width || 'auto'
      const height = win.style.height || style.height || 'auto'
      
      // Check if this window should be centered (default is true, but can be overridden)
      // TangGang window should be centered on desktop/tablet
      const shouldCenter = windowId === 'tanggang' ? (window.innerWidth > 640) : true
      
      registerWindow(windowId, {
        title,
        // Don't pass position - let registerWindow center it if centerOnOpen is true
        size: { width, height },
        centerOnOpen: shouldCenter,
      })
      hasRegisteredRef.current = true
      
      // Play window open sound (Party Mode only - not in STANDARD_MODE_SOUNDS)
      playSound('windowOpen')
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Window] Failed to register window:', error, 'windowId:', windowId)
      }
    }
  }, [windowId, title, registerWindow])

  // Separate effect for cleanup on unmount only
  // Use ref to store latest unregisterWindow to avoid dependency issues
  const unregisterWindowRef = useRef(unregisterWindow)
  useEffect(() => {
    unregisterWindowRef.current = unregisterWindow
  }, [unregisterWindow])
  
  useEffect(() => {
    return () => {
      // Only unregister on actual unmount, not on effect re-runs
      isMountedRef.current = false
      hasRegisteredRef.current = false
      try {
        unregisterWindowRef.current(windowId)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Window] Failed to unregister window:', error, 'windowId:', windowId)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run cleanup on unmount

  // Sync position from windowData to DOM element
  // IMPORTANT: Skip this effect when window is being dragged or on mobile
  // Use useLayoutEffect to set position before paint to prevent visual flash
  useLayoutEffect(() => {
    const win = windowRef.current
    if (!win) return
    if (isMobile) return
    if (isMinimized || isMaximized) return
    if (style?.position === 'fixed') return
    
    // For try-again-window: completely skip position sync - handled by CSS transform centering in useEffect
    if (windowId === 'try-again-window') {
      return
    }

    const pos = windowData?.position
    if (!pos) return

    // Don't fight dragging
    if (win.classList.contains('dragging') || win.style.transform) {
      return
    }

    // Don't sync immediately after drag ends - wait for state to update
    if (justFinishedDragRef.current) {
      return
    }

    // Check if DOM position already matches state position (no sync needed)
    const currentLeft = parseFloat(win.style.left) || 0
    const currentTop = parseFloat(win.style.top) || 0
    const posX = pos.x || 0
    const posY = pos.y || 0
    const tolerance = 1 // Allow 1px difference for rounding
    if (Math.abs(currentLeft - posX) < tolerance && Math.abs(currentTop - posY) < tolerance) {
      return
    }

    win.style.left = `${pos.x}px`
    win.style.top = `${pos.y}px`
  }, [
    windowData?.position?.x,
    windowData?.position?.y,
    isMobile,
    isMinimized,
    isMaximized,
    style?.position,
  ])

  // For try-again-window: use simple CSS transform centering (like TreasureWindow)
  // This avoids all the complexity of calculating positions and prevents infinite loops
  useEffect(() => {
    if (windowId !== 'try-again-window') return
    if (isMobile || isMinimized || isMaximized) return
    
    const win = windowRef.current
    if (!win) return
    
    // Simply ensure it's centered using CSS transform (no state updates needed)
    win.style.position = 'fixed'
    win.style.left = '50%'
    win.style.top = '50%'
    win.style.transform = 'translate(-50%, -50%)'
    win.style.opacity = '1'
    win.style.visibility = 'visible'
  }, [windowId, isMobile, isMinimized, isMaximized])

  // For README window: recalculate position after content loads (e.g., images)
  // Only recalculate if user hasn't moved the window
  useEffect(() => {
    if (type !== 'readme') return
    if (isMobile || isMinimized || isMaximized) return
    if (style?.position === 'fixed') return
    
    const win = windowRef.current
    if (!win) return
    
    // Don't recalculate if user has moved the window
    if (hasUserMoved?.get?.(windowId)) return
    
    let lastWidth = 0
    let lastHeight = 0
    let recalculateTimeout = null
    
    const recalculatePosition = (source = 'unknown') => {
      // Clear any pending recalculation
      if (recalculateTimeout) {
        clearTimeout(recalculateTimeout)
      }
      
      // Debounce to avoid too many recalculations
      recalculateTimeout = setTimeout(() => {
        const rect = win.getBoundingClientRect()
        const actualWidth = rect.width
        const actualHeight = rect.height
        
        // Only recalculate if size has changed significantly (> 5px)
        if (lastWidth > 0 && lastHeight > 0 && 
            Math.abs(actualWidth - lastWidth) < 5 && 
            Math.abs(actualHeight - lastHeight) < 5) {
          return
        }
        
        lastWidth = actualWidth
        lastHeight = actualHeight
        
        // Only proceed if we have valid dimensions
        if (actualWidth <= 0 || actualHeight <= 0) return
        
        // Use getInitialPosition to get the fixed spawn position (120, 20)
        const newPos = getInitialPosition({
          type: 'readme',
          width: actualWidth,
          height: actualHeight,
          isMobile: false
        })
        
        // Only update if position differs significantly (> 1px)
        const currentLeft = parseFloat(win.style.left) || 0
        const currentTop = parseFloat(win.style.top) || 0
        if (Math.abs(currentLeft - newPos.x) > 1 || Math.abs(currentTop - newPos.y) > 1) {
          win.style.left = `${newPos.x}px`
          win.style.top = `${newPos.y}px`
          updateWindowPosition(windowId, newPos)
          win.dataset.recalculated = 'true'
        }
      }, 50) // 50ms debounce
    }
    
    // Use ResizeObserver to detect when window size changes (e.g., when images load)
    const resizeObserver = new ResizeObserver(() => {
      recalculatePosition('ResizeObserver')
    })
    resizeObserver.observe(win)
    
    // Also trigger after initial render to ensure correct positioning
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recalculatePosition('initial')
      })
    })
    
    return () => {
      resizeObserver.disconnect()
      if (recalculateTimeout) {
        clearTimeout(recalculateTimeout)
      }
    }
  }, [type, windowId, isMobile, isMinimized, isMaximized, style?.position, hasUserMoved, updateWindowPosition])

  // Focus window when it becomes active
  useEffect(() => {
    if (isActive && !isMinimized && windowRef.current) {
      // Focus window container for keyboard navigation
      windowRef.current.focus()
      
      // Announce window state change to screen readers
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const announcement = document.createElement('div')
        announcement.setAttribute('role', 'status')
        announcement.setAttribute('aria-live', 'polite')
        announcement.setAttribute('aria-atomic', 'true')
        announcement.className = 'sr-only'
        announcement.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
        announcement.textContent = `${title} window is now active`
        document.body.appendChild(announcement)
        setTimeout(() => document.body.removeChild(announcement), 1000)
      }
    }
  }, [isActive, isMinimized, title])

  // Bring to front when clicked - improved handler
  useEffect(() => {
    const win = windowRef.current
    if (!win) return

    const handleMouseDown = (e) => {
      // Don't bring to front if clicking on control buttons
      if (e.target.closest('.title-bar-controls')) return
      // Don't bring to front if clicking on interactive elements inside window (but allow title bar)
      if (e.target.closest('.window-body button, .window-body a, .window-body input, .window-body select, .window-body textarea')) return
      
      // Bring to front immediately on mousedown
      bringToFront(windowId)
      
      // Also focus the window element
      win.focus()
    }

    // Use capture phase to ensure we catch the event early
    win.addEventListener('mousedown', handleMouseDown, true)
    // Also listen on title bar specifically
    const titleBar = win.querySelector('.title-bar')
    if (titleBar) {
      titleBar.addEventListener('mousedown', handleMouseDown, true)
    }

    return () => {
      win.removeEventListener('mousedown', handleMouseDown, true)
      if (titleBar) {
        titleBar.removeEventListener('mousedown', handleMouseDown, true)
      }
    }
  }, [windowId, bringToFront])

  const handleClose = () => {
    try {
      // Play window close sound (Party Mode only - not in STANDARD_MODE_SOUNDS)
      playSound('windowClose')
      
      setIsVisible(false)
      if (onClose) {
        onClose()
      } else {
        // Fallback: if no onClose handler is provided, unregister immediately
        // so we never end up with a taskbar button for an invisible window.
        try {
          unregisterWindow(windowId)
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Window] Error unregistering window on close:', error, 'windowId:', windowId)
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Window] Error closing window:', error, 'windowId:', windowId)
      }
    }
  }

  const handleMinimize = () => {
    try {
      if (isMinimized) {
        // Party mode only - restore sound
        playSound('windowRestoreUp')
        restoreWindow(windowId)
      } else {
        // Party mode only - minimize sound
        playSound('windowMinimize')
        minimizeWindow(windowId)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Window] Error minimizing/restoring window:', error, 'windowId:', windowId)
      }
    }
  }

  const handleMaximize = () => {
    try {
      const win = windowRef.current
      if (!win) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Window] Cannot maximize: window ref not available. windowId:', windowId)
        }
        return
      }

      if (isMaximized) {
        // Restore - Party mode only
        playSound('windowRestoreDown')
        restoreWindowSize(windowId)
        win.style.width = savedSizeRef.current.width || style.width || 'auto'
        win.style.height = savedSizeRef.current.height || style.height || 'auto'
        win.style.left = `${savedPositionRef.current.x}px`
        win.style.top = `${savedPositionRef.current.y}px`
      } else {
        // Maximize - Party mode only
        playSound('windowMaximize')
        const rect = win.getBoundingClientRect()
        savedPositionRef.current = { x: rect.left, y: rect.top }
        savedSizeRef.current = { 
          width: win.style.width || style.width || 'auto', 
          height: win.style.height || style.height || 'auto' 
        }
        maximizeWindow(windowId)
        win.style.width = 'calc(100vw - 40px)'
        win.style.height = 'calc(100dvh - var(--taskbar-height) - var(--safe-area-inset-bottom) - 40px)' // Use dynamic viewport height, account for taskbar and safe area
        win.style.left = '20px'
        win.style.top = '20px'
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Window] Error maximizing/restoring window:', error, 'windowId:', windowId)
      }
    }
  }

  // Handle keyboard navigation (priority 3: active window)
  const handleWindowKeyboard = (e) => {
    if (!isActive) return

    // Don't interfere with input fields
    const target = e.target
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('input, textarea, [contenteditable="true"]')
    ) {
      // Allow normal input, but handle Esc
      if (e.key === 'Escape') {
        handleClose()
        e.preventDefault()
        e.stopPropagation()
      }
      return
    }

    // Handle Escape to close window
    if (e.key === 'Escape' && isActive) {
      handleClose()
      e.preventDefault()
      e.stopPropagation()
    }
  }

  useKeyboardHandler(KEYBOARD_PRIORITY.ACTIVE_WINDOW, windowId, handleWindowKeyboard, isActive)

  // Handle window resizing from all edges and corners
  // Disabled on mobile (mobile windows are fullscreen)
  const resizeRefs = {
    n: useRef(null),   // North (top)
    s: useRef(null),   // South (bottom)
    e: useRef(null),   // East (right)
    w: useRef(null),   // West (left)
    ne: useRef(null),  // Northeast (top-right)
    se: useRef(null),  // Southeast (bottom-right)
    sw: useRef(null),  // Southwest (bottom-left)
    nw: useRef(null),  // Northwest (top-left)
  }

  useEffect(() => {
    const win = windowRef.current
    if (!win || isMaximized || isMinimized || isMobile) return

    const MIN_WIDTH = 250
    const MIN_HEIGHT = 200

    let isResizing = false
    let resizeDirection = ''
    let startX = 0
    let startY = 0
    let startWidth = 0
    let startHeight = 0
    let startLeft = 0
    let startTop = 0

    const handleResizeStart = (e, direction) => {
      if (e.button !== 0) return // Only left mouse button
      e.preventDefault()
      e.stopPropagation()
      
      isResizing = true
      resizeDirection = direction
      
      // Batch all layout reads first (prevent layout thrashing)
      const rect = win.getBoundingClientRect()
      startX = e.clientX
      startY = e.clientY
      startWidth = rect.width
      startHeight = rect.height
      startLeft = rect.left
      startTop = rect.top

      // All reads done - now set up event listeners (no DOM writes yet)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      bringToFront(windowId)
    }

    const handleMouseMove = (e) => {
      if (!isResizing) return

      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      // Get size constraints from layout tokens
      const constraints = getWindowSizeConstraints({
        minWidth: style.minWidth ? parseInt(style.minWidth) : MIN_WIDTH,
        minHeight: style.minHeight ? parseInt(style.minHeight) : MIN_HEIGHT,
        maxWidth: style.maxWidth ? parseInt(style.maxWidth) : undefined,
        maxHeight: style.maxHeight ? parseInt(style.maxHeight) : undefined,
      })

      let newWidth = startWidth
      let newHeight = startHeight
      let newLeft = startLeft
      let newTop = startTop

      // Handle horizontal resizing (east/west)
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(constraints.minWidth, Math.min(constraints.maxWidth || Infinity, startWidth + deltaX))
      }
      if (resizeDirection.includes('w')) {
        const widthChange = startWidth - Math.max(constraints.minWidth, Math.min(constraints.maxWidth || Infinity, startWidth - deltaX))
        newWidth = startWidth - widthChange
        newLeft = startLeft + widthChange
      }

      // Handle vertical resizing (north/south)
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(constraints.minHeight, Math.min(constraints.maxHeight || Infinity, startHeight + deltaY))
      }
      if (resizeDirection.includes('n')) {
        const heightChange = startHeight - Math.max(constraints.minHeight, Math.min(constraints.maxHeight || Infinity, startHeight - deltaY))
        newHeight = startHeight - heightChange
        newTop = startTop + heightChange
      }

      // Batch all layout reads first (prevent layout thrashing)
      const rect = win.getBoundingClientRect()
      const isMobileCheck = window.innerWidth <= 768
      
      // Calculate clamped position (no DOM writes yet)
      let clampedX = newLeft
      let clampedY = newTop
      if (!isMobileCheck) {
        const clamped = clampWindowPosition({
          x: newLeft,
          y: newTop,
          width: newWidth,
          height: newHeight,
          isMobile: false
        })
        clampedX = clamped.x
        clampedY = clamped.y
      }
      
      // Now batch all DOM writes together (after all reads are done)
      // Use requestAnimationFrame to batch with other DOM updates
      requestAnimationFrame(() => {
        const win2 = windowRef.current
        if (!win2) return
        
        // Apply size changes (GPU-friendly, no layout reflow)
        win2.style.width = `${newWidth}px`
        win2.style.height = `${newHeight}px`
        
        // Apply position changes if resizing from west or north (or if clamp adjusted position)
        const currentLeft = parseFloat(win2.style.left) || startLeft
        const currentTop = parseFloat(win2.style.top) || startTop
        const positionChanged = Math.abs(clampedX - currentLeft) > 0.5 || Math.abs(clampedY - currentTop) > 0.5
        
        if (resizeDirection.includes('w') || resizeDirection.includes('n') || positionChanged) {
          win2.style.left = `${clampedX}px`
          win2.style.top = `${clampedY}px`
          updateWindowPosition(windowId, { x: clampedX, y: clampedY })
        }
        
        updateWindowSize(windowId, { width: `${newWidth}px`, height: `${newHeight}px` })
      })
    }

    const handleMouseUp = () => {
      if (isResizing) {
        isResizing = false
        resizeDirection = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }

    // Attach event listeners to all resize handles
    const handles = [
      { ref: resizeRefs.n, dir: 'n' },
      { ref: resizeRefs.s, dir: 's' },
      { ref: resizeRefs.e, dir: 'e' },
      { ref: resizeRefs.w, dir: 'w' },
      { ref: resizeRefs.ne, dir: 'ne' },
      { ref: resizeRefs.se, dir: 'se' },
      { ref: resizeRefs.sw, dir: 'sw' },
      { ref: resizeRefs.nw, dir: 'nw' },
    ]

    const cleanupFunctions = handles.map(({ ref, dir }) => {
      const handle = ref.current
      if (!handle) return null
      
      const handler = (e) => handleResizeStart(e, dir)
      handle.addEventListener('mousedown', handler)
      
      return () => {
        handle.removeEventListener('mousedown', handler)
      }
    }).filter(Boolean)

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [windowId, isMaximized, isMinimized, style, bringToFront, updateWindowSize, updateWindowPosition])

  if (!isVisible) return null

  // Merge base styles and ensure consistent positioning behavior
  // For try-again-window, include position in baseStyle to prevent flash (set before first paint)
  const baseStyle = {
    ...style,
    // Prefer WindowContext z-index; fall back to a high value for the active window
    zIndex: windowData?.zIndex ?? (isActive ? 9999 : undefined),
    display: isMinimized ? 'none' : 'block',
    // Mobile: force fullscreen behavior (position: relative, full width/height)
    // Desktop: use style prop or default to absolute for proper left/top positioning
    position: isMobile ? 'relative' : (style?.position || 'absolute'),
    // Mobile: force fullscreen dimensions (overridden by CSS, but ensures consistency)
    ...(isMobile && !isMinimized ? {
      width: '100vw',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      left: '0',
      top: '0',
      margin: '0',
    } : {}),
    // For try-again-window: use CSS transform centering (simple, no flash)
    ...(windowId === 'try-again-window' && !isMobile && !isMinimized && !isMaximized ? {
      position: 'fixed', // Use fixed positioning for proper centering
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)', // CSS centering - works immediately
      right: 'auto',
      bottom: 'auto',
    } : {}),
    // Deterministic visibility: if mounted and not minimized, it must be visible
    // For try-again-window, visibility is set above to 'hidden' initially, so don't override it here
    ...(windowId !== 'try-again-window' ? { visibility: isMinimized ? 'hidden' : 'visible' } : {}),
    // Opacity: default to 1, but try-again-window overrides above to start at 0
    ...(windowId !== 'try-again-window' ? { opacity: 1 } : {}),
  }
  

  return (
    <div
      id={windowId}
      ref={windowRef}
      className={`window draggable ${className} ${isMinimized ? 'minimized' : ''} ${isActive ? 'active' : ''}`}
      data-nostack={noStack ? 'true' : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${windowId}-title`}
      tabIndex={0}
      onKeyDown={(e) => {
        // Close window with Escape
        if (e.key === 'Escape' && onClose) {
          onClose()
        }
      }}
      style={baseStyle}
    >
      <div className={`title-bar ${!isActive ? 'inactive' : ''}`}>
        <div className="title-bar-text" id={`${windowId}-title`}>
          {iconPath && (
            <img 
              src={iconPath} 
              alt="" 
              className="title-bar-icon"
              onError={(e) => {
                // Hide icon if it fails to load
                e.target.style.display = 'none'
              }}
            />
          )}
          <span>{title}</span>
        </div>
        <div className="title-bar-controls">
          {/* Mobile: Hide minimize/maximize buttons (only show close) */}
          {!isMobile && (
            <>
              <button 
                aria-label={`Minimize ${title}`}
                onClick={handleMinimize}
                onMouseDown={(e) => e.stopPropagation()}
              ></button>
              <button 
                aria-label={`Maximize ${title}`}
                className={isMaximized ? 'maximized' : ''}
                onClick={handleMaximize}
                onMouseDown={(e) => e.stopPropagation()}
              ></button>
            </>
          )}
          <button
            aria-label={`Close ${title}`}
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
          ></button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div 
            className={`window-body ${allowScroll ? 'scroll-allowed' : ''} ${contentAutoHeight ? 'window-body-auto' : ''}`}
            data-content-auto-height={contentAutoHeight ? 'true' : undefined}
          >
            {children}
          </div>
          {/* Resize handles - all edges and corners (desktop only, mobile windows are fullscreen) */}
          {!isMaximized && !isMobile && (
            <>
              {/* Edge handles */}
              <div ref={resizeRefs.n} className="window-resize-handle resize-handle resize-n" aria-label="Resize window (top)" />
              <div ref={resizeRefs.s} className="window-resize-handle resize-handle resize-s" aria-label="Resize window (bottom)" />
              <div ref={resizeRefs.e} className="window-resize-handle resize-handle resize-e" aria-label="Resize window (right)" />
              <div ref={resizeRefs.w} className="window-resize-handle resize-handle resize-w" aria-label="Resize window (left)" />
              {/* Corner handles */}
              <div ref={resizeRefs.ne} className="window-resize-handle resize-handle resize-ne" aria-label="Resize window (top-right)" />
              <div ref={resizeRefs.se} className="window-resize-handle resize-handle resize-se" aria-label="Resize window (bottom-right)" />
              <div ref={resizeRefs.sw} className="window-resize-handle resize-handle resize-sw" aria-label="Resize window (bottom-left)" />
              <div ref={resizeRefs.nw} className="window-resize-handle resize-handle resize-nw" aria-label="Resize window (top-left)" />
            </>
          )}
        </>
      )}
    </div>
  )
}

