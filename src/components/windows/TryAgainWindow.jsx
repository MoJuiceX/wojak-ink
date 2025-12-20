import Window from './Window'
import { useEffect } from 'react'
import { useWindow } from '../../contexts/WindowContext'

export default function TryAgainWindow({ isOpen, claimsCount, onClose }) {
  const { updateWindowPosition, getWindow } = useWindow()

  // Center window when it opens - truly centered in the middle of the screen
  useEffect(() => {
    if (!isOpen) return

    const centerWindow = () => {
      requestAnimationFrame(() => {
        const windowData = getWindow('try-again-window')
        if (!windowData) return

        const el = document.getElementById('try-again-window')
        if (!el) return

        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const rootStyle = getComputedStyle(document.documentElement)
        const taskbarHeight = parseFloat(rootStyle.getPropertyValue('--taskbar-height')) || 48
        const availableHeight = viewportHeight - taskbarHeight

        const rect = el.getBoundingClientRect()
        const w = rect.width || 400
        const h = rect.height || 300

        // Truly center in the middle of the screen
        const left = (viewportWidth - w) / 2
        const top = (availableHeight - h) / 2

        updateWindowPosition('try-again-window', { x: left, y: top })
      })
    }

    // Center on open with multiple attempts to ensure it works
    const timeoutId1 = setTimeout(centerWindow, 50)
    const timeoutId2 = setTimeout(centerWindow, 150)
    const timeoutId3 = setTimeout(centerWindow, 300)
    window.addEventListener('resize', centerWindow)

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      clearTimeout(timeoutId3)
      window.removeEventListener('resize', centerWindow)
    }
  }, [isOpen, updateWindowPosition, getWindow])

  if (!isOpen) return null

  return (
    <Window
      id="try-again-window"
      title="Try again!!!"
      icon={null}
      noStack={true}
      style={{
        width: '400px',
        maxWidth: '90vw',
        minWidth: '300px',
        height: 'auto',
      }}
      onClose={onClose}
    >
      <div style={{ padding: "12px 12px 6px 12px", textAlign: "center", display: "flex", flexDirection: "column" }}>
        <div>
          <div style={{ fontWeight: "bold", marginBottom: 10, fontSize: "32px" }}>Try again!!!</div>

          <img
            src="/assets/images/banners/betterluck.png"
            alt="Better luck"
            style={{ maxWidth: 520, width: "100%", height: "auto", display: "block", margin: "0 auto" }}
          />
        </div>
        
        <div style={{ 
          marginTop: 12,
          marginBottom: 6,
          textAlign: "center", 
          color: "#808080",
          fontSize: "12px",
          fontFamily: "'MS Sans Serif', sans-serif"
        }}>
          Total claimed prizes: 13
        </div>
      </div>
    </Window>
  )
}

