import { useEffect } from 'react'

/**
 * Custom hook to handle window stacking on desktop viewports
 * Stacks windows vertically on initial load and handles resize events
 */
export function useWindowStacking() {
  useEffect(() => {
    // Stack windows on load and resize (only on desktop)
    const stackWindows = (margin = 20, force = false) => {
      // Check if mobile viewport
      if (window.innerWidth <= 768) {
        // On mobile, windows are already positioned relatively via CSS
        return
      }

      const draggables = document.querySelectorAll('.window.draggable')
      let top = 20
      draggables.forEach((win) => {
        if (win.dataset.nostack === 'true') return

        // Don't override if user has manually dragged (unless forced on initial load)
        if (!force && win.dataset.userDragged === 'true') return

        win.style.position = 'absolute'
        win.style.left = '20px'
        win.style.top = `${top}px`
        const rect = win.getBoundingClientRect()
        top += rect.height + margin
      })
    }

    // Only stack on initial load
    stackWindows(20, true)

    const handleResize = () => {
      // Only restack if windows haven't been manually dragged
      stackWindows(20, false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
}

