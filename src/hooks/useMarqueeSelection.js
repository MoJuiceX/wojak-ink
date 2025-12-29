import { useRef, useCallback, useEffect, useState, useMemo } from 'react'

/**
 * Windows 98-style marquee selection hook
 * 
 * CONFIGURATION (tweak these values):
 * - DRAG_THRESHOLD: pixels to move before starting marquee (default: 4px)
 * - LONG_PRESS_DURATION: milliseconds for mobile long-press (default: 350ms)
 */
export function useMarqueeSelection({
  containerRef,
  itemSelector = '[data-icon-id]',
  getItemId = (el) => el?.getAttribute('data-icon-id'),
  onSelectionChange,
  onFocusChange,
  iconElements = null,
}) {
  // All state hooks first
  const [isSelecting, setIsSelecting] = useState(false)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const [marqueeRect, setMarqueeRect] = useState({ left: 0, top: 0, width: 0, height: 0 })
  
  // All refs next (must be in consistent order)
  const isSelectingRef = useRef(false) // Track state in ref to avoid stale closures
  const anchorRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const capturedPointerIdRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0, moved: false })
  const longPressTimerRef = useRef(null)
  const isSelectionModeRef = useRef(false)
  const previousSelectionRef = useRef(new Set())
  const focusedIdRef = useRef(null)
  const rafIdRef = useRef(null)
  // Refs for callbacks (to avoid stale closures)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const getSelectableItemsRef = useRef(null)
  const getItemIdRef = useRef(getItemId)

  const DRAG_THRESHOLD = 4
  const LONG_PRESS_DURATION = 350

  // Sync ref with state
  useEffect(() => {
    isSelectingRef.current = isSelecting
  }, [isSelecting])

  // Update callback refs
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
    getItemIdRef.current = getItemId
  }, [onSelectionChange, getItemId])

  const getSelectableItems = useCallback(() => {
    // Prefer iconElements array if provided (more reliable)
    if (iconElements && Array.isArray(iconElements)) {
      return iconElements.filter(Boolean).filter(el => {
        // Ensure element has data-icon-id attribute
        const getId = getItemIdRef.current || getItemId
        const id = getId(el)
        return id != null
      })
    }
    // Fallback to DOM query
    const container = containerRef?.current
    if (!container) return []
    return Array.from(container.querySelectorAll(itemSelector))
  }, [containerRef, itemSelector, iconElements, getItemId])

  // Update getSelectableItems ref after it's defined
  useEffect(() => {
    getSelectableItemsRef.current = getSelectableItems
  }, [getSelectableItems])

  const isOverIcon = useCallback((clientX, clientY) => {
    const getItems = getSelectableItemsRef.current || getSelectableItems
    const items = getItems()
    for (const item of items) {
      const rect = item.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        const getId = getItemIdRef.current || getItemId
        return { item, id: getId(item) }
      }
    }
    return null
  }, [getSelectableItems, getItemId])

  const isOverEmptyDesktop = useCallback((target) => {
    const container = containerRef?.current
    if (!container) return false
    
    // If target is the container itself, it's empty desktop
    if (target === container) return true
    
    // Check if target is inside container
    if (!container.contains(target)) return false
    
    // Check if target is on an icon, window, taskbar, or start menu
    // Also check for desktop-image-icons container (different container)
    const isOnIcon = target.closest('.desktop-icons button') ||
                     target.closest('.desktop-image-icons button') ||
                     target.closest('.desktop-image-icons-container button') ||
                     target.closest('[data-icon-id]')
    const isOnWindow = target.closest('.window')
    const isOnTaskbar = target.closest('.taskbar')
    const isOnStartMenu = target.closest('.start-menu')
    const isOnDesktopImageIcons = target.closest('.desktop-image-icons-container')
    
    // If clicking on DesktopImageIcons container or its children, don't handle it here
    // (let DesktopImageIcons' own marquee selection handle it)
    if (isOnDesktopImageIcons && isOnIcon) return false
    
    // It's empty desktop if it's in the container but not on any of those elements
    return !isOnIcon && !isOnWindow && !isOnTaskbar && !isOnStartMenu
  }, [containerRef])

  const getIntersectingIcons = useCallback((rect) => {
    // Always use refs to get latest versions (avoids stale closures)
    const getItems = getSelectableItemsRef.current || getSelectableItems
    const getId = getItemIdRef.current || getItemId
    const items = getItems()
    const intersecting = new Set()
    const container = containerRef?.current
    if (!container) return intersecting

    const containerRect = container.getBoundingClientRect()

    items.forEach((item) => {
      const itemRect = item.getBoundingClientRect()
      const itemLeft = itemRect.left - containerRect.left
      const itemTop = itemRect.top - containerRect.top
      const itemRight = itemLeft + itemRect.width
      const itemBottom = itemTop + itemRect.height

      if (
        itemLeft < rect.right &&
        itemRight > rect.left &&
        itemTop < rect.bottom &&
        itemBottom > rect.top
      ) {
        const id = getId(item)
        if (id) intersecting.add(id)
      }
    })

    return intersecting
  }, [containerRef, getSelectableItems, getItemId])

  const updateMarquee = useCallback((clientX, clientY, modifiers) => {
    const container = containerRef?.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const x = clientX - containerRect.left
    const y = clientY - containerRect.top

    currentRef.current = { x, y }

    const left = Math.min(anchorRef.current.x, x)
    const top = Math.min(anchorRef.current.y, y)
    const right = Math.max(anchorRef.current.x, x)
    const bottom = Math.max(anchorRef.current.y, y)

    const newRect = {
      left,
      top,
      width: right - left,
      height: bottom - top,
    }
    
    setMarqueeRect(newRect)

    // Call getIntersectingIcons directly (it uses refs internally)
    const intersecting = getIntersectingIcons({
      left,
      top,
      right,
      bottom,
    })

    // Use ref to get latest version of onSelectionChange
    if (onSelectionChangeRef.current) {
      const isShift = modifiers.shift
      const isCtrl = modifiers.ctrl || modifiers.meta
      const isToggle = isCtrl || (isCtrl && isShift)

      onSelectionChangeRef.current(
        Array.from(intersecting),
        isShift,
        false,
        isToggle
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]) // Only depend on containerRef to avoid infinite loops

  const cancel = useCallback(() => {
    setIsSelecting(false)
    setIsDraggingSelection(false)

    if (capturedPointerIdRef.current !== null) {
      const container = containerRef?.current
      if (container) {
        try {
          container.releasePointerCapture(capturedPointerIdRef.current)
        } catch (e) {
          // Ignore
        }
      }
      capturedPointerIdRef.current = null
    }

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    setMarqueeRect({ left: 0, top: 0, width: 0, height: 0 })
    anchorRef.current = { x: 0, y: 0 }
    currentRef.current = { x: 0, y: 0 }
    dragStartRef.current = { x: 0, y: 0, moved: false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]) // Don't include onSelectionChange to avoid stale closures

  const handlePointerDown = useCallback((e) => {
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Marquee] pointerdown', {
        button: e.button,
        pointerType: e.pointerType,
        target: e.target,
        container: containerRef?.current,
      })
    }

    if (e.button !== undefined && e.button !== 0 && e.pointerType !== 'touch') return

    const target = e.target
    const container = containerRef?.current
    if (!container) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Marquee] No container ref')
      }
      return
    }

    if (target.closest('.window')) return

    const isEmptyDesktop = isOverEmptyDesktop(target)
    const iconHit = isOverIcon(e.clientX, e.clientY)
    const isTouch = e.pointerType === 'touch'

    if (process.env.NODE_ENV === 'development') {
      console.log('[Marquee] pointerdown check', {
        isEmptyDesktop,
        iconHit: !!iconHit,
        isTouch,
      })
    }

    if (isTouch && isEmptyDesktop) {
      longPressTimerRef.current = setTimeout(() => {
        isSelectionModeRef.current = true
        const containerRect = container.getBoundingClientRect()
        const x = e.clientX - containerRect.left
        const y = e.clientY - containerRect.top
        anchorRef.current = { x, y }
        currentRef.current = { x, y }
        setIsSelecting(true)
        capturedPointerIdRef.current = e.pointerId
        try {
          container.setPointerCapture(e.pointerId)
        } catch (err) {}
        e.preventDefault()
      }, LONG_PRESS_DURATION)
      return
    }

    // If clicking on an icon, don't interfere - let the icon handle it
    if (iconHit) {
      // Don't stop propagation - let icon clicks work normally
      return
    }

    if (!isTouch && isEmptyDesktop) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Marquee] Starting marquee selection on empty desktop')
      }

      if (onSelectionChange) {
        const items = getSelectableItems()
        const currentSelected = new Set()
        items.forEach((item) => {
          if (item.classList.contains('selected')) {
            const id = getItemId(item)
            if (id) currentSelected.add(id)
          }
        })
        previousSelectionRef.current = currentSelected
      }

      const containerRect = container.getBoundingClientRect()
      const x = e.clientX - containerRect.left
      const y = e.clientY - containerRect.top

      anchorRef.current = { x, y }
      currentRef.current = { x, y }
      dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false }

      capturedPointerIdRef.current = e.pointerId
      try {
        container.setPointerCapture(e.pointerId)
      } catch (err) {
        // Ignore capture errors
      }

      // Don't prevent default or stop propagation yet - wait until we know it's a drag
      // This allows simple clicks to propagate for deselection
      // Only stop propagation if we're actually starting a drag (will be checked in pointermove)
      return
    }
  }, [containerRef, isOverEmptyDesktop, isOverIcon, getSelectableItems, getItemId, onSelectionChange])

  const handlePointerMove = useCallback((e) => {
    const container = containerRef?.current
    if (!container) return

    const capturedId = capturedPointerIdRef.current
    if (capturedId === e.pointerId) {
      if (!dragStartRef.current.moved) {
        const deltaX = Math.abs(e.clientX - dragStartRef.current.x)
        const deltaY = Math.abs(e.clientY - dragStartRef.current.y)
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          dragStartRef.current.moved = true
          const isEmptyDesktop = isOverEmptyDesktop(e.target)
          const iconHit = isOverIcon(e.clientX, e.clientY)
          // Use ref to check current state (avoids stale closure)
          // Only start marquee if on empty desktop and not over an icon
          if (isEmptyDesktop && !iconHit && !isSelectingRef.current) {
            const containerRect = container.getBoundingClientRect()
            anchorRef.current = {
              x: e.clientX - containerRect.left,
              y: e.clientY - containerRect.top
            }
            setIsSelecting(true)
            // Update marquee immediately
            updateMarquee(e.clientX, e.clientY, {
              shift: e.shiftKey,
              ctrl: e.ctrlKey || e.metaKey,
            })
            // Now that we're dragging, prevent default to stop text selection
            e.preventDefault()
          } else if (iconHit) {
            // If we moved over an icon, cancel marquee and release capture
            cancel()
            return
          }
        }
      }

      // Check if selecting using ref (avoids stale closure)
      if (isSelectingRef.current) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current)
        }
        rafIdRef.current = requestAnimationFrame(() => {
          updateMarquee(e.clientX, e.clientY, {
            shift: e.shiftKey,
            ctrl: e.ctrlKey || e.metaKey,
          })
        })
        e.preventDefault()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]) // Only depend on containerRef

  const handlePointerUp = useCallback((e) => {
    const container = containerRef?.current
    if (!container) return

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Store whether we were selecting and if we moved (before resetting)
    const wasSelecting = isSelectingRef.current
    const pointerId = capturedPointerIdRef.current
    const hadMovedBeforeReset = dragStartRef.current.moved

    // Use ref to avoid stale closure
    if (wasSelecting && pointerId === e.pointerId) {
      const modifiers = {
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
      }
      const isToggle = modifiers.ctrl || (modifiers.ctrl && modifiers.shift)

      const left = Math.min(anchorRef.current.x, currentRef.current.x)
      const top = Math.min(anchorRef.current.y, currentRef.current.y)
      const right = Math.max(anchorRef.current.x, currentRef.current.x)
      const bottom = Math.max(anchorRef.current.y, currentRef.current.y)

      const intersecting = getIntersectingIcons({ left, top, right, bottom })

      if (onSelectionChange) {
        onSelectionChange(
          Array.from(intersecting),
          modifiers.shift,
          true,
          isToggle
        )
      }

      if (intersecting.size > 0 && onFocusChange) {
        const items = getSelectableItems()
        const lastItem = Array.from(items).reverse().find((item) => {
          const id = getItemId(item)
          return id && intersecting.has(id)
        })
        if (lastItem) {
          const focusedId = getItemId(lastItem)
          focusedIdRef.current = focusedId
          onFocusChange(focusedId)
        }
      }

      setIsSelecting(false)
    }

    if (isDraggingSelection && capturedPointerIdRef.current === e.pointerId) {
      setIsDraggingSelection(false)
    }

    if (capturedPointerIdRef.current === e.pointerId) {
      try {
        container.releasePointerCapture(e.pointerId)
      } catch (err) {
        // Ignore
      }
      capturedPointerIdRef.current = null
    }

    // Always reset drag state
    dragStartRef.current = { x: 0, y: 0, moved: false }
    setMarqueeRect({ left: 0, top: 0, width: 0, height: 0 })
    
    // If it was just a simple click (no drag), allow it to propagate for deselection
    if (!wasSelecting && !hadMovedBeforeReset) {
      // This was just a click, not a drag - let it propagate so deselection can work
      // Don't prevent default or stop propagation - return early
      return
    }

    if (isSelectionModeRef.current && e.pointerType === 'touch') {
      setTimeout(() => {
        isSelectionModeRef.current = false
      }, 1000)
    }
  }, [containerRef, getIntersectingIcons, getSelectableItems, getItemId, onSelectionChange, onFocusChange, isSelecting, isDraggingSelection])

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && (isSelecting || isDraggingSelection)) {
      cancel()
      e.preventDefault()
      e.stopPropagation()
    }
  }, [cancel, isSelecting, isDraggingSelection])

  useEffect(() => {
    const container = containerRef?.current
    if (!container) {
      return
    }

    // Use capture phase but check for icons first - if icon is hit, don't interfere
    const handlePointerDownCapture = (e) => {
      // Check if clicking on an icon, button, or interactive element BEFORE doing anything else
      const target = e.target
      const isOnIcon = target.closest('[data-icon-id]') || 
                       target.closest('.desktop-icon-button') ||
                       target.closest('.desktop-image-icon') ||
                       target.closest('button') ||
                       target.closest('a')
      
      if (isOnIcon) {
        // Don't interfere with icon clicks - let them pass through completely
        return
      }
      
      // Also check with isOverIcon for more accurate detection (handles edge cases)
      const iconHit = isOverIcon(e.clientX, e.clientY)
      if (iconHit) {
        // Don't interfere with icon clicks - let them pass through
        return
      }
      
      // Only handle if it's empty desktop
      handlePointerDown(e)
    }

    container.addEventListener('pointerdown', handlePointerDownCapture, true)
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('keydown', handleEscape)

    return () => {
      container.removeEventListener('pointerdown', handlePointerDownCapture, true)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('keydown', handleEscape)
      cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]) // Only depend on containerRef to avoid infinite loops

  return {
    marqueeRect,
    isActive: isSelecting,
    isDraggingSelection,
    cancel,
    focusedId: focusedIdRef.current,
  }
}
