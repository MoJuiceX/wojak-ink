import Window from './Window'
import { useEffect } from 'react'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../../contexts/KeyboardPriorityContext'

export default function NotifyPopup({ isOpen, onClose }) {
  // Register modal keyboard handler (highest priority)
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      onClose()
      e.preventDefault()
      e.stopPropagation()
    }
  }

  useKeyboardHandler(KEYBOARD_PRIORITY.MODAL, 'notify-popup', handleEscape, isOpen)

  useEffect(() => {
    if (!isOpen) return

    const centerPopup = () => {
      // Batch all layout reads, then all writes to prevent layout thrashing
      requestAnimationFrame(() => {
        const el = document.getElementById('win-notify')
        if (!el) return
        
        // Batch all reads first (no writes yet)
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        // Get taskbar height from CSS variable
        const rootStyle = getComputedStyle(document.documentElement)
        const taskbarHeight = parseFloat(rootStyle.getPropertyValue('--taskbar-height')) || 30
        
        // Calculate available height (viewport minus taskbar)
        const availableHeight = viewportHeight - taskbarHeight
        
        // Temporarily make visible to measure (but batch this with writes)
        const wasVisible = el.style.visibility !== 'hidden'
        el.style.visibility = 'hidden'
        el.style.display = 'block'
        
        // Read layout properties (batch all reads)
        const w = el.offsetWidth
        const h = el.offsetHeight
        
        // Calculate positions (no DOM writes yet)
        // Center horizontally
        const left = Math.max(16, (viewportWidth - w) / 2)
        // Center vertically in available space (with gap on top and bottom)
        const top = Math.max(48, (availableHeight - h) / 2)
        
        // Now batch all writes together (after all reads are done)
        requestAnimationFrame(() => {
          const el2 = document.getElementById('win-notify')
          if (!el2) return
          el2.style.visibility = wasVisible ? 'visible' : ''
          el2.style.left = Math.round(left) + 'px'
          el2.style.top = Math.round(top) + 'px'
        })
      })
    }

    // Center on open
    centerPopup()

    // Re-center on resize
    window.addEventListener('resize', centerPopup)
    return () => {
      window.removeEventListener('resize', centerPopup)
    }
  }, [isOpen])

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

