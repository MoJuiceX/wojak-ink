import Window from './Window'
import { useEffect } from 'react'
import { useWindow } from '../../contexts/WindowContext'

export default function TryAgainWindow({ isOpen, claimsCount, onClose }) {
  const { updateWindowPosition, getWindow } = useWindow()

  // Center window when it opens
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

        const left = Math.max(16, (viewportWidth - w) / 2)
        const top = Math.max(48, (availableHeight - h) / 2)

        updateWindowPosition('try-again-window', { x: left, y: top })
      })
    }

    // Center on open with a small delay to ensure window is rendered
    const timeoutId = setTimeout(centerWindow, 50)
    window.addEventListener('resize', centerWindow)

    return () => {
      clearTimeout(timeoutId)
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
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '16px', 
          fontWeight: 'bold',
          fontFamily: "'MS Sans Serif', sans-serif"
        }}>
          Try again!!!
        </h2>
        <img
          src="/images/betterluck.png"
          alt="Better luck"
          style={{ 
            maxWidth: 320, 
            width: "100%", 
            height: "auto", 
            display: "block", 
            margin: "0 auto 16px auto" 
          }}
        />
        <p style={{ 
          margin: '0',
          fontSize: '12px',
          fontFamily: "'MS Sans Serif', sans-serif"
        }}>
          Total claimed prizes: {claimsCount}
        </p>
      </div>
    </Window>
  )
}

