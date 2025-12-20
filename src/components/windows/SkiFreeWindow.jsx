import Window from './Window'
import { useEffect, useRef } from 'react'

export default function SkiFreeWindow({ onClose }) {
  const iframeRef = useRef(null)
  const windowId = 'window-skifree'

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
      id="window-skifree"
      title="SKIFREE.EXE"
      style={{
        width: '900px',
        height: '700px',
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)',
        minHeight: 'var(--window-min-height)',
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
          src="https://basicallydan.github.io/skifree.js/"
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
            flex: '1 1 auto',
          }}
          title="SkiFree"
        />
      </div>
    </Window>
  )
}

