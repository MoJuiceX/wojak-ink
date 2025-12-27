import { useRef, useCallback, useEffect } from 'react'
import { snapToGrid, isGridSnappingEnabled } from '../utils/iconGrid'
import { saveIconPosition } from '../utils/iconPositionStorage'

const ICON_WIDTH = 96
const ICON_HEIGHT = 80
const TASKBAR_HEIGHT = 46

/**
 * Custom hook for draggable desktop icons
 * @param {string} appId - App ID for the icon
 * @param {Object} initialPosition - Initial position {x, y}
 * @param {Function} onPositionChange - Callback when position changes (x, y)
 * @param {Function} onDragStart - Callback when drag starts
 * @param {Function} onDragEnd - Callback when drag ends
 * @returns {Object} Drag handlers and state
 */
export function useDraggableIcon({
  appId,
  initialPosition,
  onPositionChange,
  onDragStart,
  onDragEnd
}) {
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false) // Track if actual drag movement occurred
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const previousPositionRef = useRef(initialPosition)
  const iconElementRef = useRef(null)
  const hasSetInitialPositionRef = useRef(false)

  // Set initial position when element is mounted (only once)
  // After mount, hook manages position entirely via DOM - don't sync with React state
  // React state is only used for persistence, not for rendering
  useEffect(() => {
    const icon = iconElementRef.current
    if (icon && !hasSetInitialPositionRef.current) {
      // Check if element already has a position set (from previous mount or drag)
      // This prevents icons from jumping when component re-mounts during re-renders
      const existingLeft = icon.style.left ? parseFloat(icon.style.left) : null
      const existingTop = icon.style.top ? parseFloat(icon.style.top) : null
      
      let finalPosition
      if (existingLeft !== null && existingTop !== null && !isNaN(existingLeft) && !isNaN(existingTop)) {
        // Element already has a position - preserve it and ensure !important is set
        finalPosition = { x: existingLeft, y: existingTop }
        icon.style.setProperty('left', `${finalPosition.x}px`, 'important')
        icon.style.setProperty('top', `${finalPosition.y}px`, 'important')
      } else {
        // No existing position - use initialPosition prop
        finalPosition = { x: initialPosition.x, y: initialPosition.y }
        // Set position with !important to prevent React from overwriting
        icon.style.setProperty('left', `${finalPosition.x}px`, 'important')
        icon.style.setProperty('top', `${finalPosition.y}px`, 'important')
      }
      
      previousPositionRef.current = finalPosition
      hasSetInitialPositionRef.current = true
    }
    // Only run once on mount - don't re-run when initialPosition changes
    // The hook manages position via DOM after mount, React state is only for persistence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Constrain position to desktop bounds
   */
  const constrainToBounds = useCallback((x, y, desktopRect) => {
    const maxX = desktopRect.width - ICON_WIDTH
    const maxY = desktopRect.height - TASKBAR_HEIGHT - ICON_HEIGHT

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    }
  }, [])

  /**
   * Check if drop target is valid (not recycle bin or folder)
   */
  const isValidDropTarget = useCallback((clientX, clientY) => {
    // Get the icon being dragged
    const draggedIcon = iconElementRef.current
    if (!draggedIcon) return true

    // Check recycle bin (but exclude the icon being dragged)
    const recycleBin = document.querySelector('[data-icon-id="RECYCLE_BIN"]')
    if (recycleBin && recycleBin !== draggedIcon) {
      const binRect = recycleBin.getBoundingClientRect()
      if (
        clientX >= binRect.left &&
        clientX <= binRect.right &&
        clientY >= binRect.top &&
        clientY <= binRect.bottom
      ) {
        return false
      }
    }

    // Check folders (but exclude the icon being dragged)
    const folders = document.querySelectorAll('[data-icon-type="folder"]')
    for (const folder of folders) {
      if (folder === draggedIcon) continue // Skip the icon being dragged
      const folderRect = folder.getBoundingClientRect()
      if (
        clientX >= folderRect.left &&
        clientX <= folderRect.right &&
        clientY >= folderRect.top &&
        clientY <= folderRect.bottom
      ) {
        return false
      }
    }

    return true
  }, [])

  /**
   * Handle mouse down - start drag
   */
  const handleMouseDown = useCallback((e) => {
    // Only left mouse button
    if (e.button !== 0) {
      return
    }

    // Don't start drag on double-click
    if (e.detail === 2) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const icon = e.currentTarget
    iconElementRef.current = icon
    const desktop = icon.closest('.desktop')
    if (!desktop) {
      return
    }

    const desktopRect = desktop.getBoundingClientRect()
    const iconRect = icon.getBoundingClientRect()

    // Calculate offset from icon top-left to mouse position
    const offsetX = e.clientX - iconRect.left
    const offsetY = e.clientY - iconRect.top

    // Get actual current position from rendered position (getBoundingClientRect) relative to desktop
    // This is more reliable than reading style.left/top which might be empty or incorrect
    const currentLeft = iconRect.left - desktopRect.left
    const currentTop = iconRect.top - desktopRect.top

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX,
      offsetY,
      desktopRect,
      updateScheduled: false
    }
    
    previousPositionRef.current = {
      x: currentLeft,
      y: currentTop
    }

    isDraggingRef.current = true
    hasDraggedRef.current = false // Reset drag flag

    // Store base position for transform calculation
    dragStartRef.current.baseX = currentLeft
    dragStartRef.current.baseY = currentTop

    // Prevent text selection during drag
    icon.style.userSelect = 'none'
    icon.style.cursor = 'grabbing'
    icon.style.opacity = '0.8'
    // Disable transitions for smooth dragging
    icon.style.transition = 'none'
    // GPU acceleration (will-change is set, transform will be applied during drag)
    icon.style.willChange = 'transform'
    icon.style.backfaceVisibility = 'hidden'
    
    // Mark that we're starting a potential drag to prevent click
    icon.dataset.dragging = 'true'
    // Add dragging class for CSS styling (without triggering React re-render)
    icon.classList.add('dragging')
    
    // Set initial position using left/top with !important to prevent React from overwriting during drag
    icon.style.setProperty('left', `${currentLeft}px`, 'important')
    icon.style.setProperty('top', `${currentTop}px`, 'important')

    if (onDragStart) {
      onDragStart()
    }

    // Use requestAnimationFrame to throttle position updates for smooth 60fps dragging
    let rafId = null
    let pendingPosition = null

    const updatePosition = () => {
      if (!isDraggingRef.current || !pendingPosition) {
        rafId = null
        return
      }

      const icon = iconElementRef.current
      if (!icon) {
        rafId = null
        return
      }

      const { constrained, baseX, baseY } = pendingPosition
      const transformDeltaX = constrained.x - baseX
      const transformDeltaY = constrained.y - baseY
      
      // Use transform for smooth dragging (React won't overwrite this)
      icon.style.transform = `translate(${transformDeltaX}px, ${transformDeltaY}px)`
      // Set base position with !important to prevent React from overwriting during drag
      icon.style.setProperty('left', `${baseX}px`, 'important')
      icon.style.setProperty('top', `${baseY}px`, 'important')
      
      // Store the actual position for drag end
      dragStartRef.current.currentX = constrained.x
      dragStartRef.current.currentY = constrained.y

      pendingPosition = null
      rafId = null
    }

    // Add document-level listeners
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return

      const { offsetX, offsetY, desktopRect, x: startX, y: startY, baseX, baseY } = dragStartRef.current

      // Check if mouse has moved enough to consider it a drag (threshold: 5px)
      const moveDeltaX = Math.abs(e.clientX - startX)
      const moveDeltaY = Math.abs(e.clientY - startY)
      const threshold = 5

      if (moveDeltaX > threshold || moveDeltaY > threshold) {
        hasDraggedRef.current = true // Mark that actual drag occurred
      }

      // Calculate new position (optimized - use cached desktopRect)
      const newX = e.clientX - desktopRect.left - offsetX
      const newY = e.clientY - desktopRect.top - offsetY

      // Constrain to bounds (optimized - desktopRect is cached)
      const constrained = constrainToBounds(newX, newY, desktopRect)

      // Store pending update (baseX/baseY are already cached in dragStartRef)
      pendingPosition = { constrained, baseX, baseY }

      // Schedule update via requestAnimationFrame for smooth 60fps dragging
      if (rafId === null) {
        rafId = requestAnimationFrame(updatePosition)
      }

      // DON'T update React state during drag - this causes lag and snap-back
      // Only update on drag end after final position is set with !important
    }

    const handleMouseUp = (e) => {
      if (!isDraggingRef.current) return

      isDraggingRef.current = false

      const icon = iconElementRef.current
      if (!icon) return

      const desktop = icon.closest('.desktop')
      if (!desktop) return

      const desktopRect = desktop.getBoundingClientRect()

      // Check if drop target is valid (only prevents dropping INTO folders/bin, not dragging folders/bin themselves)
      const isValid = isValidDropTarget(e.clientX, e.clientY)

      // Remove transform first
      icon.style.transform = ''

      let finalX, finalY

      // If no actual drag occurred (just a click), always revert to previous position
      if (!hasDraggedRef.current) {
        finalX = previousPositionRef.current.x
        finalY = previousPositionRef.current.y
      } else {
        // Actual drag occurred - get the current position from transform or stored position
        const currentX = dragStartRef.current.currentX || previousPositionRef.current.x
        const currentY = dragStartRef.current.currentY || previousPositionRef.current.y

        if (!isValid) {
          // Revert to previous position (only if dropping INTO a folder/bin, not if dragging the folder/bin itself)
          finalX = previousPositionRef.current.x
          finalY = previousPositionRef.current.y
        } else {
          finalX = currentX
          finalY = currentY
        }
      }
      
      // Apply grid snapping if enabled (only if actual drag occurred)
      if (hasDraggedRef.current && isGridSnappingEnabled()) {
        const snapped = snapToGrid(finalX, finalY)
        finalX = snapped.x
        finalY = snapped.y
      }

      // Constrain final position to bounds (always, even for clicks)
      const constrained = constrainToBounds(finalX, finalY, desktopRect)
      finalX = constrained.x
      finalY = constrained.y

      // Set final position IMMEDIATELY with !important BEFORE any React re-renders
      // This prevents the visual snap-back glitch
      icon.style.setProperty('left', `${finalX}px`, 'important')
      icon.style.setProperty('top', `${finalY}px`, 'important')
      
      // Force a synchronous reflow to ensure the position is applied before React renders
      // This prevents the snap-back visual glitch
      icon.offsetHeight // Trigger reflow

      // Only save position and notify if actual drag occurred (not just a click)
      if (hasDraggedRef.current) {
        // Save position
        saveIconPosition(appId, finalX, finalY)

        // Update previous position ref so next render uses correct position
        previousPositionRef.current = { x: finalX, y: finalY }

        // Notify position change on drag end - use double requestAnimationFrame to ensure
        // DOM position is painted before React state update causes re-render
        if (onPositionChange) {
          // Use double requestAnimationFrame to ensure position is painted before React re-renders
          // First frame: ensure position is committed to DOM
          requestAnimationFrame(() => {
            // Re-apply !important flag to be absolutely sure
            icon.style.setProperty('left', `${finalX}px`, 'important')
            icon.style.setProperty('top', `${finalY}px`, 'important')
            // Second frame: call onPositionChange after position is painted
            requestAnimationFrame(() => {
              onPositionChange(finalX, finalY)
            })
          })
        }
      } else {
        // Just a click - position should already be at previousPositionRef, but ensure it's set correctly
        // Update previous position ref to ensure it's in sync (though it shouldn't have changed)
        previousPositionRef.current = { x: finalX, y: finalY }
      }

      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      pendingPosition = null

      // Restore icon styles
      icon.style.userSelect = ''
      icon.style.cursor = 'pointer'
      icon.style.opacity = '1'
      icon.style.transition = ''
      icon.style.willChange = ''
      icon.style.backfaceVisibility = ''

        // Remove document listeners
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)

      // Remove dragging class
      icon.classList.remove('dragging')

      // Prevent click event if drag occurred
      if (hasDraggedRef.current) {
        // Use a small timeout to prevent the click event
        setTimeout(() => {
          icon.dataset.dragging = 'false'
        }, 0)
        // Prevent click by stopping propagation on next click event
        const preventClick = (e) => {
          e.stopPropagation()
          e.preventDefault()
          icon.removeEventListener('click', preventClick, true)
        }
        icon.addEventListener('click', preventClick, true)
      } else {
        icon.dataset.dragging = 'false'
      }

      if (onDragEnd) {
        onDragEnd()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [
    appId,
    initialPosition,
    onPositionChange,
    onDragStart,
    onDragEnd,
    constrainToBounds,
    isValidDropTarget
  ])

  /**
   * Handle touch events for mobile
   */
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return

    e.preventDefault()
    e.stopPropagation()

    const icon = e.currentTarget
    iconElementRef.current = icon
    const desktop = icon.closest('.desktop')
    if (!desktop) return

    const desktopRect = desktop.getBoundingClientRect()
    const iconRect = icon.getBoundingClientRect()
    const touch = e.touches[0]

    const offsetX = touch.clientX - iconRect.left
    const offsetY = touch.clientY - iconRect.top

    // Get actual current position from rendered position (getBoundingClientRect) relative to desktop
    // This is more reliable than reading style.left/top which might be empty or incorrect
    const currentLeft = iconRect.left - desktopRect.left
    const currentTop = iconRect.top - desktopRect.top

    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      offsetX,
      offsetY,
      desktopRect
    }
    
    previousPositionRef.current = {
      x: currentLeft,
      y: currentTop
    }

    isDraggingRef.current = true
    hasDraggedRef.current = false // Reset drag flag

    // Store base position for transform calculation
    dragStartRef.current.baseX = currentLeft
    dragStartRef.current.baseY = currentTop
    dragStartRef.current.currentX = currentLeft
    dragStartRef.current.currentY = currentTop

    icon.style.userSelect = 'none'
    icon.style.cursor = 'grabbing'
    icon.style.opacity = '0.8'
    icon.dataset.dragging = 'true'
    // Add dragging class for CSS styling (without triggering React re-render)
    icon.classList.add('dragging')
    
    // Set initial position using left/top with !important to prevent React from overwriting during drag
    icon.style.setProperty('left', `${currentLeft}px`, 'important')
    icon.style.setProperty('top', `${currentTop}px`, 'important')

    if (onDragStart) {
      onDragStart()
    }

    const handleTouchMove = (e) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return

      e.preventDefault()

      const touch = e.touches[0]
      const { offsetX, offsetY, desktopRect, x: startX, y: startY } = dragStartRef.current

      // Check if touch has moved enough to consider it a drag
      const moveDeltaX = Math.abs(touch.clientX - startX)
      const moveDeltaY = Math.abs(touch.clientY - startY)
      const threshold = 5

      if (moveDeltaX > threshold || moveDeltaY > threshold) {
        hasDraggedRef.current = true
      }

      const newX = touch.clientX - desktopRect.left - offsetX
      const newY = touch.clientY - desktopRect.top - offsetY

      const constrained = constrainToBounds(newX, newY, desktopRect)

      // Use transform for smooth dragging (React won't overwrite this)
      const baseX = dragStartRef.current.baseX || previousPositionRef.current.x
      const baseY = dragStartRef.current.baseY || previousPositionRef.current.y
      const transformDeltaX = constrained.x - baseX
      const transformDeltaY = constrained.y - baseY
      
      icon.style.transform = `translate(${transformDeltaX}px, ${transformDeltaY}px)`
      // Set base position with !important to prevent React from overwriting during drag
      icon.style.setProperty('left', `${baseX}px`, 'important')
      icon.style.setProperty('top', `${baseY}px`, 'important')
      
      // Store the actual position for drag end
      dragStartRef.current.currentX = constrained.x
      dragStartRef.current.currentY = constrained.y

      // DON'T update React state during drag - this causes snap-back because
      // React re-renders with stale position prop, then applies it, overwriting our transform
      // Instead, only update on drag end (after transform is removed and final position is set)
    }

    const handleTouchEnd = (e) => {
      if (!isDraggingRef.current) return

      isDraggingRef.current = false

      const icon = iconElementRef.current
      if (!icon) return

      const desktop = icon.closest('.desktop')
      if (!desktop) return

      const desktopRect = desktop.getBoundingClientRect()
      
      const touch = e.changedTouches[0]
      const isValid = isValidDropTarget(touch.clientX, touch.clientY)

      // Remove transform
      icon.style.transform = ''

      let finalX, finalY

      // If no actual drag occurred (just a tap), always revert to previous position
      if (!hasDraggedRef.current) {
        finalX = previousPositionRef.current.x
        finalY = previousPositionRef.current.y
      } else {
        // Actual drag occurred - get the current position from transform or stored position
        const currentX = dragStartRef.current.currentX || previousPositionRef.current.x
        const currentY = dragStartRef.current.currentY || previousPositionRef.current.y

        if (!isValid) {
          // Revert to previous position (only if dropping INTO a folder/bin, not if dragging the folder/bin itself)
          finalX = previousPositionRef.current.x
          finalY = previousPositionRef.current.y
        } else {
          finalX = currentX
          finalY = currentY
        }
      }

      // Apply grid snapping if enabled (only if actual drag occurred)
      if (hasDraggedRef.current && isGridSnappingEnabled()) {
        const snapped = snapToGrid(finalX, finalY)
        finalX = snapped.x
        finalY = snapped.y
      }

      // Constrain final position to bounds (always, even for taps)
      const constrained = constrainToBounds(finalX, finalY, desktopRect)
      finalX = constrained.x
      finalY = constrained.y

      // Set final position using left/top with !important
      icon.style.setProperty('left', `${finalX}px`, 'important')
      icon.style.setProperty('top', `${finalY}px`, 'important')
      
      // Force a synchronous reflow to ensure the position is applied before React renders
      icon.offsetHeight // Trigger reflow

      // Only save position and notify if actual drag occurred (not just a tap)
      if (hasDraggedRef.current) {
        // Save position
        saveIconPosition(appId, finalX, finalY)

        // Update previous position ref so next render uses correct position
        previousPositionRef.current = { x: finalX, y: finalY }

        // Notify position change on drag end - use requestAnimationFrame to ensure
        // DOM position is set before React re-renders and applies position prop
        if (onPositionChange) {
          // Use requestAnimationFrame to ensure DOM is updated before React re-renders
          requestAnimationFrame(() => {
            // Re-apply !important flag in case React tried to overwrite it
            icon.style.setProperty('left', `${finalX}px`, 'important')
            icon.style.setProperty('top', `${finalY}px`, 'important')
            onPositionChange(finalX, finalY)
          })
        }
      } else {
        // Just a tap - position should already be at previousPositionRef, but ensure it's set correctly
        // Update previous position ref to ensure it's in sync (though it shouldn't have changed)
        previousPositionRef.current = { x: finalX, y: finalY }
      }

      icon.style.userSelect = ''
      icon.style.cursor = 'pointer'
      icon.style.opacity = '1'

      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)

      // Prevent click event if drag occurred (touch)
      if (hasDraggedRef.current) {
        setTimeout(() => {
          icon.dataset.dragging = 'false'
        }, 0)
        const preventClick = (e) => {
          e.stopPropagation()
          e.preventDefault()
          icon.removeEventListener('click', preventClick, true)
        }
        icon.addEventListener('click', preventClick, true)
      } else {
        icon.dataset.dragging = 'false'
      }

      if (onDragEnd) {
        onDragEnd()
      }
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)
  }, [
    appId,
    initialPosition,
    onPositionChange,
    onDragStart,
    onDragEnd,
    constrainToBounds,
    isValidDropTarget
  ])

  return {
    handleMouseDown,
    handleTouchStart,
    iconElementRef, // Return ref so components can attach it
    isDragging: isDraggingRef.current
  }
}

