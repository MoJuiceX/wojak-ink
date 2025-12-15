import Window from './Window'
import { useEffect } from 'react'

export default function NotifyPopup({ isOpen, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      const el = document.getElementById('win-notify')
      if (el) {
        // Force layout calculation
        el.style.visibility = 'hidden'
        el.style.display = 'block'
        const w = el.offsetWidth
        const h = el.offsetHeight
        el.style.visibility = 'visible'
        
        // Use viewport-relative positioning (fixed positioning)
        // This ensures it appears centered in the visible viewport, not at bottom of page
        const left = Math.max(12, (window.innerWidth - w) / 2)
        const top = Math.max(12, (window.innerHeight - h) / 2)
        el.style.left = Math.round(left) + 'px'
        el.style.top = Math.round(top) + 'px'
      }
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

