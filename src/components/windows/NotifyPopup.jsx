import Window from './Window'
import { useLayoutEffect } from 'react'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../../contexts/KeyboardPriorityContext'
import { useWindow } from '../../contexts/WindowContext'
import { getCenteredPosition } from '../../utils/windowPosition'

export default function NotifyPopup({ isOpen, onClose }) {
  const { updateWindowPosition } = useWindow()
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

  // Always center window when it opens
  useLayoutEffect(() => {
    if (!isOpen) return

    // Wait for window to be rendered and measurable
    // Use double RAF to ensure layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(windowId)
        if (!el) return

        // Batch all layout reads first (prevent layout thrashing)
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        // Measure window dimensions (it should already be visible/rendered)
        const rect = el.getBoundingClientRect()
        const w = rect.width || el.offsetWidth
        const h = rect.height || el.offsetHeight
        
        // Only proceed if we have valid dimensions
        if (w <= 0 || h <= 0) return
        
        // Calculate centered position using utility function
        const centered = getCenteredPosition({
          width: w,
          height: h,
          isMobile: false
        })
        
        // Since this window uses position: fixed, we need to set DOM directly
        el.style.left = `${centered.x}px`
        el.style.top = `${centered.y}px`
        
        // Update position in WindowContext for tracking
        updateWindowPosition(windowId, centered)
      })
    })
  }, [isOpen, updateWindowPosition, windowId])

  if (!isOpen) return null

  // Calculate initial centered position (approximate, will be fine-tuned by useLayoutEffect)
  const windowWidth = 640
  const estimatedHeight = 500 // Approximate height, will be adjusted
  const initialPos = typeof window !== 'undefined' 
    ? getCenteredPosition({ width: windowWidth, height: estimatedHeight, isMobile: false })
    : { x: 0, y: 0 }

  return (
    <Window
      id="win-notify"
      title="NOTIFY_ME"
      noStack={true}
      className="popup"
      style={{
        width: '640px',
        position: 'fixed',
        left: `${initialPos.x}px`,
        top: `${initialPos.y}px`,
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

