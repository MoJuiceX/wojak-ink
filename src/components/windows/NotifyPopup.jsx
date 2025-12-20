import Window from './Window'
import { useRef, useLayoutEffect } from 'react'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../../contexts/KeyboardPriorityContext'
import { useWindow } from '../../contexts/WindowContext'
import { clampWindowPosition } from '../../utils/windowPosition'

export default function NotifyPopup({ isOpen, onClose }) {
  // Track if we've centered once (per session)
  const hasCenteredOnceRef = useRef(false)
  const { updateWindowPosition, getWindow } = useWindow()
  const windowId = 'win-notify'

  // Register modal keyboard handler (highest priority)
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      onClose()
      e.preventDefault()
      e.stopPropagation()
    }
  }

  useKeyboardHandler(KEYBOARD_PRIORITY.MODAL, 'notify-popup', handleEscape, isOpen)

  // Center window on first open only
  useLayoutEffect(() => {
    if (!isOpen) return
    if (hasCenteredOnceRef.current) return

    // Wait for window to be rendered and measurable
    // Use double RAF to ensure layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(windowId)
        if (!el) return

        // Check if window already has a saved position from dragging
        const windowData = getWindow(windowId)
        const hasSavedPosition = windowData?.position && 
          (windowData.position.x !== 0 || windowData.position.y !== 0)
        
        if (hasSavedPosition) {
          // Window has been positioned before, don't center
          hasCenteredOnceRef.current = true
          return
        }

        // Batch all layout reads first (prevent layout thrashing)
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        // Measure window dimensions (it should already be visible/rendered)
        const rect = el.getBoundingClientRect()
        const w = rect.width || el.offsetWidth
        const h = rect.height || el.offsetHeight
        
        // Only proceed if we have valid dimensions
        if (w <= 0 || h <= 0) return
        
        // Calculate centered position
        const x = Math.round((viewportWidth - w) / 2)
        const y = Math.round((viewportHeight - h) / 2)
        
        // Clamp to viewport bounds (ensures title bar stays visible)
        const clamped = clampWindowPosition({
          x,
          y,
          width: w,
          height: h,
          isMobile: false
        })
        
        // Since this window uses position: fixed, we need to set DOM directly
        // Also update WindowContext to track the position
        el.style.left = `${clamped.x}px`
        el.style.top = `${clamped.y}px`
        
        // Update position in WindowContext for tracking
        // This marks it as moved, which prevents re-centering on subsequent opens
        updateWindowPosition(windowId, clamped)
        
        // Mark as centered so we don't do this again
        hasCenteredOnceRef.current = true
      })
    })
  }, [isOpen, getWindow, updateWindowPosition, windowId])

  if (!isOpen) return null

  return (
    <Window
      id="win-notify"
      title="NOTIFY_ME"
      noStack={true}
      className="popup"
      style={{
        width: '640px',
        position: 'fixed',
        left: '0px',
        top: '0px',
        zIndex: 1000000,
      }}
      onClose={onClose}
    >
      <div className="popup-body">
        <img
          className="popup-img"
          src="https://bafybeih6vymx7w2xslx6ybmsnlzlyzzr3a5auj5ulw6qlqaiiuzc6poca4.ipfs.w3s.link/remmeber%20it%200666.png"
          alt="Notify image"
        />
      </div>
    </Window>
  )
}

