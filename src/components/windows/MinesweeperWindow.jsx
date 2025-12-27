import Window from './Window'
import { useEffect, useRef } from 'react'

export default function MinesweeperWindow({ onClose }) {
  const iframeRef = useRef(null)
  const windowId = 'window-minesweeper'

  // Handle iframe pointer-events during dragging
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    // Get window element by ID
    const getWindowElement = () => {
      return document.getElementById(windowId)
    }

    // Watch for dragging class on window element
    const checkDragging = () => {
      const win = getWindowElement()
      if (!win || !iframe) return
      const isDragging = win.classList.contains('dragging')
      iframe.style.pointerEvents = isDragging ? 'none' : 'auto'
    }

    let observer = null
    let intervalId = null
    let timeoutId = null

    // Use MutationObserver to watch for class changes
    const win = getWindowElement()
    if (win) {
      observer = new MutationObserver(checkDragging)
      observer.observe(win, {
        attributes: true,
        attributeFilter: ['class'],
      })

      // Initial check
      checkDragging()

      // Periodic check as fallback (in case MutationObserver misses something)
      intervalId = setInterval(checkDragging, 100)
    } else {
      // Window not mounted yet, retry after a short delay
      timeoutId = setTimeout(() => {
        const retryWin = getWindowElement()
        if (retryWin) {
          observer = new MutationObserver(checkDragging)
          observer.observe(retryWin, {
            attributes: true,
            attributeFilter: ['class'],
          })
          checkDragging()
          intervalId = setInterval(checkDragging, 100)
        }
      }, 100)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (observer) observer.disconnect()
      if (intervalId) clearInterval(intervalId)
      // Restore pointer events on cleanup
      if (iframe) {
        iframe.style.pointerEvents = 'auto'
      }
    }
  }, [])

  return (
    <Window
      id="window-minesweeper"
      title="MINESWEEPER.EXE"
      style={{
        width: 'clamp(280px, 92vw, 400px)',
        height: 'clamp(400px, 80vh, 500px)',
        maxWidth: 'min(calc(100% - 16px), var(--window-max-width))',
        minWidth: '280px',
        minHeight: '400px',
      }}
      onClose={onClose}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          src="https://98.js.org/programs/minesweeper/"
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
            flex: '1 1 auto',
          }}
          title="Minesweeper"
        />
      </div>
    </Window>
  )
}





