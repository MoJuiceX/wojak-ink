import { useRef, useEffect, useState } from 'react'
import { clampWindowPosition } from '../utils/windowPosition'

/**
 * Draggable window hook.
 * - Does NOT manage z-index (WindowContext owns that).
 * - Attaches document listeners ONLY while dragging (performance).
 * - Throttles DOM writes with requestAnimationFrame (smooth).
 */
export function useDraggable(noStack = false, options = {}) {
  const { onDragEnd, onActivate } = options

  const windowRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const isDraggingRef = useRef(false)
  const activePointerIdRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const containerRectRef = useRef(null)

  // rAF throttling for transform updates
  const rafRef = useRef(0)
  const pendingDeltaRef = useRef({ dx: 0, dy: 0, has: false })

  useEffect(() => {
    const win = windowRef.current
    if (!win) return

    // Disable dragging if noStack is true (used for mobile)
    // EXCEPTION: TangGang window needs dragging for orange smash game
    const isTangGang = win.id === 'tanggang'
    if (noStack && !isTangGang) return

    const handleEl = win.querySelector('.title-bar')
    if (!handleEl) return

    const cleanupDocumentDrag = () => {
      document.removeEventListener('pointermove', onPointerMove, { capture: false })
      document.removeEventListener('pointerup', onPointerUp, { capture: false })
      document.removeEventListener('pointercancel', onPointerUp, { capture: false })
      window.removeEventListener('blur', onBlurWhileDragging)

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      pendingDeltaRef.current.has = false
    }

    const applyTransformRAF = () => {
      rafRef.current = 0
      const win2 = windowRef.current
      if (!win2) return
      if (!pendingDeltaRef.current.has) return

      const { dx, dy } = pendingDeltaRef.current
      pendingDeltaRef.current.has = false

      win2.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      win2.classList.add('dragging')

      // Keep RAF going if more moves come in
      if (pendingDeltaRef.current.has) {
        rafRef.current = requestAnimationFrame(applyTransformRAF)
      }
    }

    const beginDrag = (e) => {
      // Don’t start drag on window controls
      if (e.target.closest('.title-bar-controls')) return

      // Let WindowContext decide z-index
      if (typeof onActivate === 'function') onActivate()

      activePointerIdRef.current = e.pointerId
      try {
        handleEl.setPointerCapture(e.pointerId)
      } catch {}

      // Store initial touch position for threshold calculation
      win.__touchStartX = e.clientX
      win.__touchStartY = e.clientY
      win.__touchStartTime = Date.now()

      // Batch reads
      const rect = win.getBoundingClientRect()
      const container = win.offsetParent || document.body
      const containerRect = container.getBoundingClientRect()

      win.__containerRef = container

      const isMobile = window.innerWidth <= 768
      win.__isMobile = isMobile

      if (isMobile) {
        containerRectRef.current = containerRect
      } else {
        containerRectRef.current = {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }
      }

      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      win.__dragStartViewportX = rect.left
      win.__dragStartViewportY = rect.top
      win.__originalWidth = rect.width
      win.__originalHeight = rect.height

      // Set initial drag state (but we won’t “move” until threshold exceeded)
      isDraggingRef.current = false

      // Disable native text selection / touch scrolling during drag
      document.documentElement.style.touchAction = 'none'
      document.body.style.userSelect = 'none'

      // Attach document listeners ONLY while pointer is down
      document.addEventListener('pointermove', onPointerMove, { passive: false })
      document.addEventListener('pointerup', onPointerUp, { passive: true })
      document.addEventListener('pointercancel', onPointerUp, { passive: true })
      window.addEventListener('blur', onBlurWhileDragging)

      e.preventDefault()
      e.stopPropagation()
    }

    const onPointerMove = (e) => {
      if (e.pointerId !== activePointerIdRef.current) return

      const win2 = windowRef.current
      if (!win2) return

      // Threshold before we treat as a “real” drag (prevents accidental jitter)
      if (!isDraggingRef.current) {
        const isTouch = e.pointerType === 'touch'
        const threshold = isTouch ? 3 : 1
        const dx0 = Math.abs(e.clientX - win2.__touchStartX)
        const dy0 = Math.abs(e.clientY - win2.__touchStartY)
        if (dx0 <= threshold && dy0 <= threshold) return

        isDraggingRef.current = true
      }

      e.preventDefault()
      e.stopPropagation()

      let targetViewportX = e.clientX - offsetRef.current.x
      let targetViewportY = e.clientY - offsetRef.current.y

      const containerRect = containerRectRef.current
      const isMobile = win2.__isMobile

      if (!isMobile) {
        const clamped = clampWindowPosition({
          x: targetViewportX,
          y: targetViewportY,
          width: win2.__originalWidth,
          height: win2.__originalHeight,
        })
        targetViewportX = clamped.x
        targetViewportY = clamped.y
      } else {
        const minX = 0
        const minY = 0
        const maxX = Math.max(0, containerRect.width - win2.__originalWidth)
        const maxY = Math.max(0, containerRect.height - win2.__originalHeight)
        targetViewportX = Math.max(minX, Math.min(maxX, targetViewportX))
        targetViewportY = Math.max(minY, Math.min(maxY, targetViewportY))
      }

      const dx = targetViewportX - win2.__dragStartViewportX
      const dy = targetViewportY - win2.__dragStartViewportY

      // rAF throttle
      pendingDeltaRef.current = { dx, dy, has: true }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(applyTransformRAF)
      }
    }

    const finishDrag = () => {
      const win2 = windowRef.current
      if (!win2) return

      // Stop pointer capture
      try {
        if (activePointerIdRef.current != null) {
          handleEl.releasePointerCapture(activePointerIdRef.current)
        }
      } catch {}
      activePointerIdRef.current = null

      // Restore global stuff
      document.body.style.userSelect = ''
      document.documentElement.style.touchAction = ''

      cleanupDocumentDrag()

      // Commit final position if we actually dragged
      const transform = win2.style.transform || ''
      const match = transform.match(/translate(?:3d)?\(([-0-9.]+)px[,\s]+([-0-9.]+)px/)
      if (!match) {
        win2.style.transform = ''
        win2.classList.remove('dragging')
        return
      }

      const dx = parseFloat(match[1])
      const dy = parseFloat(match[2])

      const finalViewportX = win2.__dragStartViewportX + dx
      const finalViewportY = win2.__dragStartViewportY + dy

      const containerRect = containerRectRef.current
      const isMobile = win2.__isMobile

      let constrainedViewportX = finalViewportX
      let constrainedViewportY = finalViewportY

      if (!isMobile) {
        const clamped = clampWindowPosition({
          x: finalViewportX,
          y: finalViewportY,
          width: win2.__originalWidth,
          height: win2.__originalHeight,
        })
        constrainedViewportX = clamped.x
        constrainedViewportY = clamped.y
      } else {
        const minX = 0
        const minY = 0
        const maxX = Math.max(0, containerRect.width - win2.__originalWidth)
        const maxY = Math.max(0, containerRect.height - win2.__originalHeight)
        constrainedViewportX = Math.max(minX, Math.min(maxX, constrainedViewportX))
        constrainedViewportY = Math.max(minY, Math.min(maxY, constrainedViewportY))
      }

      // Convert viewport coords -> container-relative coords
      let finalLeft = constrainedViewportX
      let finalTop = constrainedViewportY

      if (win2.__containerRef) {
        const containerBoundingRect = win2.__containerRef.getBoundingClientRect()
        finalLeft =
          constrainedViewportX - containerBoundingRect.left + (win2.__containerRef.scrollLeft || 0)
        finalTop =
          constrainedViewportY - containerBoundingRect.top + (win2.__containerRef.scrollTop || 0)
      }

      requestAnimationFrame(() => {
        const win3 = windowRef.current
        if (!win3) return

        setPosition({ x: finalLeft, y: finalTop })
        win3.style.left = `${finalLeft}px`
        win3.style.top = `${finalTop}px`
        win3.style.transform = ''
        win3.classList.remove('dragging')

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          win3.dataset.userDragged = 'true'
        }

        if (typeof onDragEnd === 'function') {
          onDragEnd({ x: finalLeft, y: finalTop })
        }
      })
    }

    const onPointerUp = (e) => {
      // If we were tracking this pointer, end it
      if (e && e.pointerId != null && e.pointerId !== activePointerIdRef.current) return
      finishDrag()
    }

    const onBlurWhileDragging = () => {
      // Safety: if window loses focus mid-drag, end cleanly
      finishDrag()
    }

    // Hook the start event on title bar
    handleEl.style.cursor = 'move'
    handleEl.style.touchAction = 'none'
    // Prevent native drag on the title bar itself only (so the window doesn't "ghost drag")
    handleEl.addEventListener('dragstart', (e) => e.preventDefault())
    handleEl.addEventListener('pointerdown', beginDrag)

    return () => {
      handleEl.removeEventListener('pointerdown', beginDrag)
      cleanupDocumentDrag()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally mount-only

  return { windowRef, position }
}

