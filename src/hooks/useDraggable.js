import { useRef, useEffect, useState, useCallback } from 'react'
import { clampWindowPosition } from '../utils/windowPosition'

export function useDraggable(noStack = false) {
  const windowRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [zIndex, setZIndex] = useState(1)
  const isDraggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const containerRectRef = useRef(null)

  const bringToFront = () => {
    const win = windowRef.current
    if (!win) return
    
    const allWindows = document.querySelectorAll('.window.draggable')
    const maxZ = Array.from(allWindows).reduce((max, w) => {
      const z = parseInt(getComputedStyle(w).zIndex || '0', 10)
      return Math.max(max, z)
    }, 0)
    const newZIndex = maxZ + 1
    setZIndex(newZIndex)
    // Also directly set on the DOM element to override any inline styles
    win.style.zIndex = newZIndex.toString()
  }

  useEffect(() => {
    const win = windowRef.current
    if (!win) return

    // Disable dragging if noStack is true (used for mobile)
    // EXCEPTION: TangGang window needs dragging for orange smash game
    const isTangGang = win.id === 'tanggang'
    if (noStack && !isTangGang) return

    const handle = win.querySelector('.title-bar')
    if (!handle) return

    const preventDrag = (ev) => ev.preventDefault()
    let activePointerId = null
    
    // Document-level handler to bring windows to front when clicked
    const handleDocumentClick = (e) => {
      // Don't process if clicking on control buttons
      if (e.target.closest('.title-bar-controls')) {
        return
      }
      
      // Don't process if we're currently dragging
      if (isDraggingRef.current) {
        return
      }
      
      // Check which window is at the click point
      const clickX = e.clientX
      const clickY = e.clientY
      const elementsAtPoint = document.elementsFromPoint(clickX, clickY)
      
      // Find the topmost window at this point
      let clickedWindow = null
      let topmostZ = -1
      
      elementsAtPoint.forEach(el => {
        const windowEl = el.closest('.window.draggable')
        if (windowEl) {
          const z = parseInt(getComputedStyle(windowEl).zIndex || '0', 10)
          if (z > topmostZ) {
            topmostZ = z
            clickedWindow = windowEl
          }
        }
      })
      
      // If this window was clicked (even if behind others), bring it to front
      if (clickedWindow === win) {
        bringToFront()
      }
    }

    const handlePointerDown = (e) => {
      // Don't start drag if clicking control buttons - check this FIRST before any event handling
      if (e.target.closest('.title-bar-controls')) {
        return
      }

      activePointerId = e.pointerId
      handle.setPointerCapture(activePointerId)

      // Store initial touch position for threshold calculation
      win.__touchStartX = e.clientX
      win.__touchStartY = e.clientY
      win.__touchStartTime = Date.now()

      bringToFront()

      // Batch all layout reads first (prevent layout thrashing)
      const rect = win.getBoundingClientRect()
      const container = win.offsetParent || document.body
      const containerRect = container.getBoundingClientRect()
      
      // Store container reference
      win.__containerRef = container
      
      // Use viewport for desktop, container for mobile
      const isMobile = window.innerWidth <= 768
      win.__isMobile = isMobile
      
      if (isMobile) {
        containerRectRef.current = containerRect
      } else {
        // Use viewport dimensions for desktop
        containerRectRef.current = {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight
        }
      }

      // Store initial mouse offset from window top-left (cached for performance)
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      // Store initial viewport position (for transform calculations)
      win.__dragStartViewportX = rect.left
      win.__dragStartViewportY = rect.top
      
      // Store initial container-relative position (for final positioning) - simplified calculation
      const currentLeft = parseFloat(win.style.left) || rect.left - containerRect.left
      const currentTop = parseFloat(win.style.top) || rect.top - containerRect.top
      win.__dragStartLeft = currentLeft
      win.__dragStartTop = currentTop

      // Store original dimensions (cached)
      win.__originalWidth = rect.width
      win.__originalHeight = rect.height

      // Disable native drag behavior
      document.addEventListener('dragstart', preventDrag)
      document.documentElement.style.touchAction = 'none'
      win.__preventDrag = preventDrag

      win.style.transform = 'translate(0px, 0px)'
      isDraggingRef.current = true
      document.body.style.userSelect = 'none'
      
      // Check if this is the TangGang window and start orange trail
      if (win.id === 'tanggang' && window.__orangeTrail) {
        window.__orangeTrail.startDragging({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        })
      }
      
      e.preventDefault()
      e.stopPropagation()
    }

    const handlePointerMove = (e) => {
      if (e.pointerId !== activePointerId) return

      // Check if we should start dragging (minimal threshold for immediate response)
      if (!isDraggingRef.current) {
        const isTouch = e.pointerType === 'touch'
        const threshold = isTouch ? 3 : 1 // Minimal threshold - almost immediate drag start
        const dx = Math.abs(e.clientX - win.__touchStartX)
        const dy = Math.abs(e.clientY - win.__touchStartY)
        
        if (dx > threshold || dy > threshold) {
          isDraggingRef.current = true
          // Disable native drag behavior
          document.addEventListener('dragstart', preventDrag)
          document.documentElement.style.touchAction = 'none'
          win.__preventDrag = preventDrag
          document.body.style.userSelect = 'none'
        } else {
          return // Haven't moved enough to start dragging
        }
      }

      e.preventDefault()
      e.stopPropagation()

      // Direct DOM update for maximum performance - no RAF delay
      // Calculate target position in viewport coordinates
      const targetViewportX = e.clientX - offsetRef.current.x
      const targetViewportY = e.clientY - offsetRef.current.y
      
      const containerRect = containerRectRef.current
      const isMobile = win.__isMobile
      
      // Use strict clamping utility for desktop (ensures title bar is always reachable)
      if (!isMobile) {
        const clamped = clampWindowPosition({
          x: targetViewportX,
          y: targetViewportY,
          width: win.__originalWidth,
          height: win.__originalHeight,
          isMobile: false
        })
        targetViewportX = clamped.x
        targetViewportY = clamped.y
      } else {
        // Mobile: simple bounds checking
        const taskbarHeight = 40
        const minX = 0
        const minY = 0
        const maxX = Math.max(0, containerRect.width - win.__originalWidth)
        const maxY = Math.max(0, containerRect.height - win.__originalHeight)
        
        targetViewportX = Math.max(minX, Math.min(maxX, targetViewportX))
        targetViewportY = Math.max(minY, Math.min(maxY, targetViewportY))
      }

      const constrainedViewportX = targetViewportX
      const constrainedViewportY = targetViewportY

      // Calculate transform offset from initial viewport position
      const dx = constrainedViewportX - win.__dragStartViewportX
      const dy = constrainedViewportY - win.__dragStartViewportY

      // Direct DOM update - no RAF, immediate response
      win.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      win.classList.add('dragging')
      
      // Update orange trail window position if this is TangGang
      if (win.id === 'tanggang' && window.__orangeTrail) {
        const rect = win.getBoundingClientRect()
        window.__orangeTrail.updateWindowRect({
          x: constrainedViewportX,
          y: constrainedViewportY,
          width: win.__originalWidth,
          height: win.__originalHeight,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        })
      }
    }

    const endDrag = (e) => {
      if (!isDraggingRef.current || (e && e.pointerId !== activePointerId)) return
      
      const win = windowRef.current
      if (!win) return
      
      // Release pointer capture FIRST to fix mouse sticking issue
      try {
        if (activePointerId !== null) {
          handle.releasePointerCapture(activePointerId)
        }
      } catch (err) {}
      activePointerId = null
      
      // Reset drag state
      isDraggingRef.current = false
      document.body.style.userSelect = ''
      document.documentElement.style.touchAction = ''
      if (win.__preventDrag) {
        document.removeEventListener('dragstart', win.__preventDrag)
        delete win.__preventDrag
      }

      const transform = win.style.transform || ''
      // Match both translate and translate3d formats
      const match = transform.match(/translate(?:3d)?\(([-0-9.]+)px[,\s]+([-0-9.]+)px/)
      
      let constrainedViewportX = 0
      let constrainedViewportY = 0
      
      if (match) {
        const dx = parseFloat(match[1])
        const dy = parseFloat(match[2])
        
        // Calculate final viewport position
        const finalViewportX = win.__dragStartViewportX + dx
        const finalViewportY = win.__dragStartViewportY + dy
        
        // Constrain to viewport bounds using strict clamping utility
        const containerRect = containerRectRef.current
        const isMobile = win.__isMobile
        
        if (!isMobile) {
          // Desktop: use strict clamping (ensures title bar is always reachable)
          const clamped = clampWindowPosition({
            x: finalViewportX,
            y: finalViewportY,
            width: win.__originalWidth,
            height: win.__originalHeight,
            isMobile: false
          })
          constrainedViewportX = clamped.x
          constrainedViewportY = clamped.y
        } else {
          // Mobile: simple bounds checking
          const taskbarHeight = 40
          const minX = 0
          const minY = 0
          const maxX = Math.max(0, containerRect.width - win.__originalWidth)
          const maxY = Math.max(0, containerRect.height - win.__originalHeight)
          
          constrainedViewportX = Math.max(minX, Math.min(maxX, finalViewportX))
          constrainedViewportY = Math.max(minY, Math.min(maxY, finalViewportY))
        }
        
        // Batch all layout reads first (prevent layout thrashing)
        let containerBoundingRect = null
        if (win.__containerRef) {
          const container = win.__containerRef
          containerBoundingRect = container.getBoundingClientRect()
        }
        
        // Calculate final positions (no DOM writes yet)
        let finalLeft, finalTop
        if (win.__containerRef && containerBoundingRect) {
          finalLeft = constrainedViewportX - containerBoundingRect.left + (win.__containerRef.scrollLeft || 0)
          finalTop = constrainedViewportY - containerBoundingRect.top + (win.__containerRef.scrollTop || 0)
        } else {
          finalLeft = constrainedViewportX
          finalTop = constrainedViewportY
        }
        
        // Store orange trail rect read (batch all reads)
        let orangeTrailRect = null
        if (win.id === 'tanggang' && window.__orangeTrail) {
          orangeTrailRect = win.getBoundingClientRect()
        }
        
        // Now batch all DOM writes together (after all reads are done)
        // Use requestAnimationFrame to batch with other DOM updates
        requestAnimationFrame(() => {
          const win2 = windowRef.current
          if (!win2) return
          
          setPosition({ x: finalLeft, y: finalTop })
          win2.style.left = `${finalLeft}px`
          win2.style.top = `${finalTop}px`
          win2.style.transform = ''
          win2.classList.remove('dragging')
          
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            win2.dataset.userDragged = 'true'
          }
          
          // Stop orange trail if this is TangGang - trigger smash on drag end
          if (win2.id === 'tanggang' && window.__orangeTrail && orangeTrailRect) {
            // Get previous rect from orange trail ref
            const prevRect = window.__orangeTrail.prevWindowRectRef?.current || null
            window.__orangeTrail.stopDragging({
              x: constrainedViewportX,
              y: constrainedViewportY,
              width: win2.__originalWidth,
              height: win2.__originalHeight,
              left: orangeTrailRect.left,
              right: orangeTrailRect.right,
              top: orangeTrailRect.top,
              bottom: orangeTrailRect.bottom
            }, prevRect)
          }
        })
      } else {
        // No transform - just clean up
        win.style.transform = ''
        win.classList.remove('dragging')
      }
    }

    handle.style.cursor = 'move'
    handle.style.touchAction = 'none'
    handle.addEventListener('dragstart', (e) => e.preventDefault())
    handle.addEventListener('pointerdown', handlePointerDown)

    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    handle.addEventListener('pointerup', endDrag)
    handle.addEventListener('pointercancel', endDrag)
    window.addEventListener('pointerup', endDrag)

    // Add document-level click handler to bring windows to front
    // Use capture phase to ensure we catch clicks before other handlers
    document.addEventListener('mousedown', handleDocumentClick, true)
    document.addEventListener('pointerdown', handleDocumentClick, true)
    
    // Also handle clicks on the window itself to bring to front
    const handleWindowClick = (e) => {
      // Don't process if clicking on control buttons or interactive elements
      if (e.target.closest('.title-bar-controls') || 
          e.target.closest('button, a, input, select, textarea')) {
        return
      }
      // Don't process if we're currently dragging
      if (isDraggingRef.current) {
        return
      }
      bringToFront()
    }
    
    win.addEventListener('mousedown', handleWindowClick, true)

    return () => {
      handle.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointermove', handlePointerMove)
      handle.removeEventListener('pointerup', endDrag)
      handle.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('pointerup', endDrag)
      document.removeEventListener('mousedown', handleDocumentClick, true)
      document.removeEventListener('pointerdown', handleDocumentClick, true)
      if (win) {
        win.removeEventListener('mousedown', handleWindowClick, true)
      }
    }
  }, [])

  return { windowRef, position, zIndex, bringToFront }
}

