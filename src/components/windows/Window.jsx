import { useDraggable } from '../../hooks/useDraggable'
import { useState, useRef, useEffect } from 'react'
import { useWindow } from '../../contexts/WindowContext'
import { getWindowIcon } from '../../utils/windowIcons'

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
  allowScroll = false, // If true, adds scroll-allowed class to window-body
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
  } = useWindow()
  
  const { windowRef, zIndex, bringToFront: bringToFrontDrag } = useDraggable(noStack)
  const [isVisible, setIsVisible] = useState(true)
  const savedPositionRef = useRef({ x: 0, y: 0 })
  const savedSizeRef = useRef({ width: '', height: '' })
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
            const width = retryWin.style.width || style.width || 'auto'
            const height = retryWin.style.height || style.height || 'auto'
            registerWindow(windowId, {
              title,
              // Don't pass position - let registerWindow center it
              size: { width, height },
              centerOnOpen: true,
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
      const width = win.style.width || style.width || 'auto'
      const height = win.style.height || style.height || 'auto'
      registerWindow(windowId, {
        title,
        // Don't pass position - let registerWindow center it
        size: { width, height },
        centerOnOpen: true,
      })
      hasRegisteredRef.current = true
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

  // Sync z-index with context
  useEffect(() => {
    if (windowData && windowData.zIndex !== zIndex) {
      const win = windowRef.current
      if (win) {
        win.style.zIndex = windowData.zIndex
      }
    }
  }, [windowData, zIndex])

  // Sync position from windowData to DOM element
  // Use requestAnimationFrame to batch updates and prevent glitches on page load
  // IMPORTANT: Skip this effect when window is being dragged to avoid conflicts
  // IMPORTANT: Skip this effect for fixed-positioned windows (like TreasureWindow)
  useEffect(() => {
    const win = windowRef.current
    if (!win || isMaximized || !windowData?.position) return

    // Skip position sync for fixed-positioned windows (they manage their own position)
    if (style?.position === 'fixed') return

    // Check if window is currently being dragged (has dragging class or transform)
    const isDragging = win.classList.contains('dragging') || win.style.transform !== ''
    
    // Don't sync position during drag - let drag handler manage position
    if (isDragging) return

    // Use requestAnimationFrame to ensure DOM is ready and batch updates
    // This prevents visual glitches when multiple windows position at once on page load
    const rafId = requestAnimationFrame(() => {
      // Double-check window still exists and is mounted, and still not dragging
      if (!win || !isMountedRef.current) return
      if (win.classList.contains('dragging') || win.style.transform !== '') return
      
      const { x, y } = windowData.position
      // Only update if position actually changed to avoid unnecessary updates
      const currentLeft = parseInt(win.style.left) || 0
      const currentTop = parseInt(win.style.top) || 0
      
      if (Math.abs(currentLeft - x) > 1 || Math.abs(currentTop - y) > 1) {
        // Apply position directly (no double RAF needed - already in RAF)
        win.style.left = `${x}px`
        win.style.top = `${y}px`
      }
    })

    return () => cancelAnimationFrame(rafId)
  }, [windowData?.position, isMaximized, windowId])

  // Handle window position updates from dragging
  useEffect(() => {
    const win = windowRef.current
    if (!win || isMaximized) return

    // Skip position tracking for fixed-positioned windows (they manage their own position)
    if (style?.position === 'fixed') return

    const observer = new MutationObserver(() => {
      // Don't update position if window is currently being dragged
      if (win.classList.contains('dragging') || win.style.transform !== '') {
        return
      }
      
      const rect = win.getBoundingClientRect()
      updateWindowPosition(windowId, { x: rect.left, y: rect.top })
    })

    observer.observe(win, {
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => observer.disconnect()
  }, [windowId, isMaximized, updateWindowPosition, style?.position])

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
      bringToFrontDrag()
      
      // Also focus the window element
      if (win.tabIndex !== undefined) {
        win.focus()
      }
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
  }, [windowId, bringToFront, bringToFrontDrag])

  const handleClose = () => {
    try {
      setIsVisible(false)
      unregisterWindow(windowId)
      if (onClose) {
        onClose()
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
        restoreWindow(windowId)
      } else {
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
        // Restore
        restoreWindowSize(windowId)
        win.style.width = savedSizeRef.current.width || style.width || 'auto'
        win.style.height = savedSizeRef.current.height || style.height || 'auto'
        win.style.left = `${savedPositionRef.current.x}px`
        win.style.top = `${savedPositionRef.current.y}px`
      } else {
        // Maximize
        const rect = win.getBoundingClientRect()
        savedPositionRef.current = { x: rect.left, y: rect.top }
        savedSizeRef.current = { 
          width: win.style.width || style.width || 'auto', 
          height: win.style.height || style.height || 'auto' 
        }
        maximizeWindow(windowId)
        win.style.width = 'calc(100vw - 40px)'
        win.style.height = 'calc(100vh - 70px)' // Account for taskbar
        win.style.left = '20px'
        win.style.top = '20px'
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Window] Error maximizing/restoring window:', error, 'windowId:', windowId)
      }
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isActive) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  // Handle window resizing from bottom-right corner
  const resizeHandleRef = useRef(null)
  useEffect(() => {
    const win = windowRef.current
    const handle = resizeHandleRef.current
    if (!win || !handle || isMaximized || isMinimized) return

    let isResizing = false
    let startX = 0
    let startY = 0
    let startWidth = 0
    let startHeight = 0
    let startLeft = 0
    let startTop = 0

    const handleMouseDown = (e) => {
      if (e.button !== 0) return // Only left mouse button
      e.preventDefault()
      e.stopPropagation()
      
      isResizing = true
      const rect = win.getBoundingClientRect()
      startX = e.clientX
      startY = e.clientY
      startWidth = rect.width
      startHeight = rect.height
      startLeft = rect.left
      startTop = rect.top

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      bringToFront(windowId)
      bringToFrontDrag()
    }

    const handleMouseMove = (e) => {
      if (!isResizing) return

      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      const minWidth = parseInt(style.minWidth) || 300
      const minHeight = parseInt(style.minHeight) || 200
      const maxWidth = style.maxWidth ? parseInt(style.maxWidth) : window.innerWidth - 40
      const maxHeight = style.maxHeight ? parseInt(style.maxHeight) : window.innerHeight - 70

      let newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
      let newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY))

      win.style.width = `${newWidth}px`
      win.style.height = `${newHeight}px`

      updateWindowSize(windowId, { width: `${newWidth}px`, height: `${newHeight}px` })
    }

    const handleMouseUp = () => {
      if (isResizing) {
        isResizing = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }

    handle.addEventListener('mousedown', handleMouseDown)

    return () => {
      handle.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [windowId, isMaximized, isMinimized, style, bringToFront, bringToFrontDrag, updateWindowSize])

  if (!isVisible) return null

  return (
    <div
      id={windowId}
      ref={windowRef}
      className={`window draggable ${className} ${isMinimized ? 'minimized' : ''} ${isActive ? 'active' : ''}`}
      data-nostack={noStack ? 'true' : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${windowId}-title`}
      tabIndex={-1}
      style={{
        ...style,
        zIndex: windowData?.zIndex || zIndex,
        display: isMinimized ? 'none' : 'block',
        // Only set position: relative if not explicitly set in style prop (for fixed positioning support)
        position: style?.position || 'relative',
      }}
    >
      <div className="title-bar">
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
          <button
            aria-label={`Close ${title}`}
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
          ></button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className={`window-body ${allowScroll ? 'scroll-allowed' : ''}`}>{children}</div>
          {!isMaximized && (
            <div
              ref={resizeHandleRef}
              className="window-resize-handle"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '16px',
                height: '16px',
                cursor: 'nwse-resize',
                zIndex: 1000,
                background: 'transparent',
              }}
              aria-label="Resize window"
            />
          )}
        </>
      )}
    </div>
  )
}

