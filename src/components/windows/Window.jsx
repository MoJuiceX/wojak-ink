import { useDraggable } from '../../hooks/useDraggable'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useWindow } from '../../contexts/WindowContext'
import { getInitialPosition, getCenteredPosition } from '../../utils/windowPosition'
import { getWindowIcon } from '../../utils/windowIcons'
import { getWindowSizeConstraints, clampWindowPosition } from '../../utils/windowPosition'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../../contexts/KeyboardPriorityContext'
import { playSound } from '../../utils/soundManager'
import SystemMenu from '../ui/SystemMenu'

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
  onHelpClick, // NEW: callback for help button click
  showEscapeButton = false, // NEW: show Escape button in title bar
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
  
  // Detect mobile viewport - use matchMedia to match CSS breakpoints
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 640px)').matches
  })
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const checkMobile = (e) => {
      setIsMobile(e.matches)
    }
    // Check immediately
    setIsMobile(mediaQuery.matches)
    // Listen for changes
    mediaQuery.addEventListener('change', checkMobile)
    return () => mediaQuery.removeEventListener('change', checkMobile)
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
        // Clamp window position so it can't end up off-screen
        const win = windowRef.current
        if (win) {
          const rect = win.getBoundingClientRect()
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          const taskbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height')) || 30
          const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0
          
          // Clamp position to keep window visible
          const clampedX = Math.max(0, Math.min(pos.x, viewportWidth - rect.width))
          const clampedY = Math.max(0, Math.min(pos.y, viewportHeight - taskbarHeight - safeAreaBottom - rect.height))
          
          pos = { x: clampedX, y: clampedY }
        }
        
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
  const [systemMenuOpen, setSystemMenuOpen] = useState(false)
  const [systemMenuPosition, setSystemMenuPosition] = useState({ x: 0, y: 0 })
  const [isMinimizing, setIsMinimizing] = useState(false)
  const savedPositionRef = useRef({ x: 0, y: 0 })
  const savedSizeRef = useRef({ width: '', height: '' })
  const justFinishedDragRef = useRef(false) // Track if we just finished dragging to prevent position sync race
  const lastTitleBarClickRef = useRef({ time: 0, target: null }) // Track last click for double-click detection
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

  // Handle double-click on titlebar to maximize/restore
  const handleTitleBarDoubleClick = (e) => {
    // Don't double-click on control buttons
    if (e.target.closest('.title-bar-controls')) return
    // Don't double-click if window is minimized
    if (isMinimized) return
    
    const now = Date.now()
    const lastClick = lastTitleBarClickRef.current
    
    // Check if this is a double-click (within 300ms and same target)
    if (now - lastClick.time < 300 && lastClick.target === e.target) {
      e.preventDefault()
      e.stopPropagation()
      handleMaximize()
      // Reset click tracking after double-click
      lastTitleBarClickRef.current = { time: 0, target: null }
    } else {
      // Update last click time and target
      lastTitleBarClickRef.current = { time: now, target: e.target }
    }
  }

  // Handle right-click on titlebar to show system menu
  const handleTitleBarRightClick = (e) => {
    // Don't show system menu if clicking on control buttons
    if (e.target.closest('.title-bar-controls')) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setSystemMenuPosition({ x: e.clientX, y: e.clientY })
    setSystemMenuOpen(true)
  }

  // Build system menu items based on window state
  const getSystemMenuItems = () => {
    const items = []
    
    // Restore - only if maximized
    if (isMaximized) {
      items.push({
        label: 'Restore',
        shortcut: 'Alt+Space, R',
        action: 'restore',
        disabled: false,
        onClick: () => {
          handleMaximize()
        }
      })
    }
    
    // Move - always enabled (but not functional in web, so we'll just close menu)
    items.push({
      label: 'Move',
      shortcut: 'Alt+Space, M',
      action: 'move',
      disabled: false,
      onClick: () => {
        // Move functionality not implemented in web version
        // In real Windows 98, this would allow moving window with arrow keys
      }
    })
    
    // Size - disabled if maximized
    items.push({
      label: 'Size',
      shortcut: 'Alt+Space, S',
      action: 'size',
      disabled: isMaximized,
      onClick: () => {
        // Size functionality not implemented in web version
        // In real Windows 98, this would allow resizing window with arrow keys
      }
    })
    
    // Minimize - always enabled
    items.push({
      label: 'Minimize',
      shortcut: 'Alt+Space, N',
      action: 'minimize',
      disabled: false,
      onClick: () => {
        handleMinimize()
      }
    })
    
    // Maximize - disabled if maximized
    if (!isMaximized) {
      items.push({
        label: 'Maximize',
        shortcut: 'Alt+Space, X',
        action: 'maximize',
        disabled: false,
        onClick: () => {
          handleMaximize()
        }
      })
    }
    
    // Separator
    items.push({ separator: true })
    
    // Close - always enabled
    items.push({
      label: 'Close',
      shortcut: 'Alt+F4',
      action: 'close',
      disabled: false,
      onClick: () => {
        handleClose()
      }
    })
    
    return items
  }

  // Bring to front when clicked - improved handler
  useEffect(() => {
    const win = windowRef.current
    if (!win) return

    const handleMouseDown = (e) => {
      // Don't bring to front if clicking on control buttons
      if (e.target.closest('.title-bar-controls')) return
      // Don't bring to front if clicking on interactive elements inside window (but allow title bar)
      // Include table elements (table, tbody, tr, td) to prevent title bar issues when clicking on trait rows
      if (e.target.closest('.window-body button, .window-body a, .window-body input, .window-body select, .window-body textarea, .window-body table, .window-body tbody, .window-body tr, .window-body td')) return
      
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
      // Add double-click handler to titlebar
      titleBar.addEventListener('dblclick', handleTitleBarDoubleClick)
      // Add right-click handler to titlebar for system menu
      titleBar.addEventListener('contextmenu', handleTitleBarRightClick)
    }

    return () => {
      win.removeEventListener('mousedown', handleMouseDown, true)
      if (titleBar) {
        titleBar.removeEventListener('mousedown', handleMouseDown, true)
        titleBar.removeEventListener('dblclick', handleTitleBarDoubleClick)
        titleBar.removeEventListener('contextmenu', handleTitleBarRightClick)
      }
    }
  }, [windowId, bringToFront, isMinimized, isMaximized])

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
        // Start minimize animation
        setIsMinimizing(true)
        // After animation completes, actually minimize
        setTimeout(() => {
          minimizeWindow(windowId)
          setIsMinimizing(false)
        }, 200) // Match animation duration
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Window] Error minimizing/restoring window:', error, 'windowId:', windowId)
      }
      setIsMinimizing(false)
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
        // Use viewport-aware clamps with safe-area offsets
        win.style.width = 'calc(100% - 32px)' // Use 100% instead of 100vw to prevent overflow
        win.style.height = 'calc(100dvh - var(--taskbar-height) - var(--safe-area-bottom) - 32px)' // Use dynamic viewport height, account for taskbar and safe area
        win.style.left = '16px'
        win.style.top = '16px'
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
  const MIN_WIDTH = 250
  const MIN_HEIGHT = 200

  // Component-level resize start handler (can be called from inline event handlers)
  const handleResizeStart = (e, direction) => {
    if (isMaximized || isMinimized || isMobile) return
    if (e.button !== 0) return
    
    const win = windowRef.current
    if (!win) return

    e.preventDefault()
    e.stopPropagation()

    const rect = win.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = rect.width
    const startHeight = rect.height
    const startLeft = rect.left
    const startTop = rect.top

    const onMouseMove = (e) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight
      let newLeft = startLeft
      let newTop = startTop

      if (direction.includes('e')) newWidth = Math.max(250, startWidth + deltaX)
      if (direction.includes('w')) {
        const w = startWidth - deltaX
        if (w >= 250) { newWidth = w; newLeft = startLeft + deltaX }
      }
      if (direction.includes('s')) newHeight = Math.max(200, startHeight + deltaY)
      if (direction.includes('n')) {
        const h = startHeight - deltaY
        if (h >= 200) { newHeight = h; newTop = startTop + deltaY }
      }

      win.style.width = newWidth + 'px'
      win.style.height = newHeight + 'px'
      win.style.left = newLeft + 'px'
      win.style.top = newTop + 'px'
    }

    const onMouseUp = () => {
      // Clamp window position and size on resize end
      const rect = win.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const taskbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height')) || 30
      const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0
      
      // Clamp position to keep window visible
      const clampedLeft = Math.max(0, Math.min(rect.left, viewportWidth - rect.width))
      const clampedTop = Math.max(0, Math.min(rect.top, viewportHeight - taskbarHeight - safeAreaBottom - rect.height))
      
      // Clamp size to viewport bounds
      const clampedWidth = Math.min(rect.width, viewportWidth - clampedLeft)
      const clampedHeight = Math.min(rect.height, viewportHeight - taskbarHeight - safeAreaBottom - clampedTop)
      
      win.style.left = clampedLeft + 'px'
      win.style.top = clampedTop + 'px'
      win.style.width = Math.max(250, clampedWidth) + 'px'
      win.style.height = Math.max(200, clampedHeight) + 'px'
      
      // Update window position in context
      updateWindowPosition(windowId, { x: clampedLeft, y: clampedTop })
      updateWindowSize(windowId, { width: Math.max(250, clampedWidth), height: Math.max(200, clampedHeight) })
      
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

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
      width: '100%',
      maxWidth: '100%',
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
      className={`window draggable ${className} ${isMinimized ? 'minimized' : ''} ${isMinimizing ? 'minimizing' : ''} ${isActive ? 'active' : ''}`}
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
          {/* 1. HELP BUTTON [?] - Only show if onHelpClick is provided */}
          {onHelpClick && (
            <button
              aria-label="Help"
              className="title-bar-button title-bar-help-button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onHelpClick()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              onTouchEnd={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onHelpClick()
              }}
            >
              <span aria-hidden="true">?</span>
            </button>
          )}
          
          {/* 2. MINIMIZE BUTTON [−] - Only on desktop, not mobile */}
          {!isMobile && (
            <button
              aria-label={`Minimize ${title}`}
              className="title-bar-button win98-caption-btn win98-caption-btn--min"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleMinimize()
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span aria-hidden="true">−</span>
            </button>
          )}
          
          {/* 3. MAXIMIZE BUTTON [□] - Only on desktop, not mobile */}
          {!isMobile && (
            <button
              aria-label={`Maximize ${title}`}
              className={`title-bar-button win98-caption-btn ${isMaximized ? 'win98-caption-btn--restore' : 'win98-caption-btn--max'}`}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleMaximize()
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span aria-hidden="true">{isMaximized ? '⧉' : '□'}</span>
            </button>
          )}
          
          {/* 3.5. ESCAPE BUTTON [Esc] - Only show if showEscapeButton is true */}
          {showEscapeButton && (
            <button
              aria-label="Escape"
              className="title-bar-button title-bar-escape-button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleClose()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              onTouchEnd={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleClose()
              }}
            >
              <span aria-hidden="true">Esc</span>
            </button>
          )}
          
          {/* 4. CLOSE BUTTON [×] - Always visible */}
          <button
            aria-label={`Close ${title}`}
            className="title-bar-button win98-caption-btn win98-caption-btn--close"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleClose()
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div 
            className={`window-body ${allowScroll ? 'scroll-allowed' : ''} ${contentAutoHeight ? 'window-body-auto' : ''}`}
            data-content-auto-height={contentAutoHeight ? 'true' : undefined}
            tabIndex={isMobile && allowScroll ? 0 : undefined}
          >
            {children}
          </div>
          {/* Resize handles - all edges and corners (desktop only, mobile windows are fullscreen) */}
          {!isMaximized && !isMobile && (
            <>
              {/* Edge handles */}
              <div 
                className="window-resize-handle resize-handle resize-n" 
                onMouseDown={(e) => handleResizeStart(e, 'n')}
                aria-label="Resize window (top)" 
              />
              <div 
                className="window-resize-handle resize-handle resize-s" 
                onMouseDown={(e) => handleResizeStart(e, 's')}
                aria-label="Resize window (bottom)" 
              />
              <div 
                className="window-resize-handle resize-handle resize-e" 
                onMouseDown={(e) => handleResizeStart(e, 'e')}
                aria-label="Resize window (right)" 
              />
              <div 
                className="window-resize-handle resize-handle resize-w" 
                onMouseDown={(e) => handleResizeStart(e, 'w')}
                aria-label="Resize window (left)" 
              />
              {/* Corner handles */}
              <div 
                className="window-resize-handle resize-handle resize-ne" 
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                aria-label="Resize window (top-right)" 
              />
              <div 
                className="window-resize-handle resize-handle resize-se" 
                onMouseDown={(e) => handleResizeStart(e, 'se')}
                aria-label="Resize window (bottom-right)" 
              />
              <div 
                className="window-resize-handle resize-handle resize-sw" 
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                aria-label="Resize window (bottom-left)" 
              />
              <div 
                className="window-resize-handle resize-handle resize-nw" 
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                aria-label="Resize window (top-left)" 
              />
            </>
          )}
        </>
      )}
      {systemMenuOpen && (
        <SystemMenu
          x={systemMenuPosition.x}
          y={systemMenuPosition.y}
          items={getSystemMenuItems()}
          onClose={() => setSystemMenuOpen(false)}
        />
      )}
    </div>
  )
}

