import { useEffect, useRef } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { useMarketplace } from '../contexts/MarketplaceContext'
import { getStartMenuIcon } from '../utils/windowIcons'

export default function StartMenu({ isOpen, onClose, onOpenPaint, onOpenWojakCreator, onOpenApp, menuRef, startButtonRef }) {
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront, activeWindowId, isWindowActive } = useWindow()
  const internalMenuRef = useRef(null)
  const resolvedMenuRef = menuRef || internalMenuRef
  const deferredFocusRafRef = useRef(null)

  // Clear any pending deferred focus rAF on unmount
  useEffect(() => {
    return () => {
      if (deferredFocusRafRef.current) {
        cancelAnimationFrame(deferredFocusRafRef.current)
        deferredFocusRafRef.current = null
      }
    }
  }, [])

  // Also clear deferred focus when menu closes, even if component isn't unmounted yet
  useEffect(() => {
    if (!isOpen && deferredFocusRafRef.current) {
      cancelAnimationFrame(deferredFocusRafRef.current)
      deferredFocusRafRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      const target = e.target
      const menuEl = resolvedMenuRef.current
      const startBtnEl = startButtonRef?.current

      // Ignore clicks inside the start menu
      if (menuEl && menuEl.contains(target)) {
        return
      }

      // Ignore clicks on the start button (handled separately)
      if (startBtnEl && startBtnEl.contains(target)) {
        return
      }

      onClose()
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Small delay to prevent immediate close on click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleMenuItemClick = (action) => {
    // Map actions to window IDs
    const actionToWindowId = {
      'scroll-to-readme': 'window-readme-txt',
      'scroll-to-mint': 'window-mint-info-exe',
      'scroll-to-gallery': 'window-gallery',
      'scroll-to-faq': 'window-faq',
      'scroll-to-marketplace': 'window-marketplace',
      'open-tanggang': 'tanggang',
      'open-pinball': 'pinball-window',
    }
    const windowId = actionToWindowId[action]


    // Capture the active window before we start, so we can detect if the user
    // changes focus before our deferred bringToFront runs.
    const priorActiveId = activeWindowId

    if (action === 'open-paint') {
      if (onOpenPaint) {
        onOpenPaint()
      }
      onClose()
      return
    }
    if (windowId) {
      // Check if window exists in the window context
      const allWindows = getAllWindows()
      const windowExists = allWindows.some(w => w.id === windowId)
      
      if (windowExists) {
        // Window is registered - restore or bring to front
        try {
          if (isWindowMinimized(windowId)) {
            restoreWindow(windowId)
          } else {
            bringToFront(windowId)
          }
        } catch (e) {
          console.debug('Error restoring/bringing to front window:', windowId, e)
        }
      } else if (onOpenApp) {
        // Window is not open yet - ask parent to open/mount it
        onOpenApp(windowId)

        // After opening, retry until the window is registered, then restore + bring to front.
        const focusWhenRegistered = (remainingTries) => {
          if (remainingTries <= 0) {
            deferredFocusRafRef.current = null
            return
          }

          deferredFocusRafRef.current = requestAnimationFrame(() => {
            try {
              const allWindowsAfterOpen = getAllWindows()
              const existsNow = allWindowsAfterOpen.some(w => w.id === windowId)

              if (!existsNow) {
                focusWhenRegistered(remainingTries - 1)
                return
              }

              // TEMP DEBUG: verify registration + minimized/position state before restore
              console.log('[focusWhenRegistered]', {
                windowId,
                existsNow,
                minimized: isWindowMinimized(windowId),
                all: allWindowsAfterOpen.map(w => ({
                  id: w.id,
                  pos: w.position,
                  z: w.zIndex,
                })),
              })

              restoreWindow(windowId)
              bringToFront(windowId)
              deferredFocusRafRef.current = null
            } catch (e) {
              console.debug('Error restoring/bringing newly opened window to front:', windowId, e)
              deferredFocusRafRef.current = null
            }
          })
        }

        // Cancel any previous focus attempts before starting a new sequence
        if (deferredFocusRafRef.current) {
          cancelAnimationFrame(deferredFocusRafRef.current)
          deferredFocusRafRef.current = null
        }
        focusWhenRegistered(10)
      }
    }
    
    onClose()
  }

  // Keyboard navigation for menu items
  useEffect(() => {
    if (!isOpen) return

    const menuItems = resolvedMenuRef.current?.querySelectorAll('.start-menu-item')
    if (!menuItems || menuItems.length === 0) return

    let focusedIndex = -1

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusedIndex = focusedIndex < menuItems.length - 1 ? focusedIndex + 1 : 0
        menuItems[focusedIndex]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusedIndex = focusedIndex > 0 ? focusedIndex - 1 : menuItems.length - 1
        menuItems[focusedIndex]?.focus()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (focusedIndex >= 0 && menuItems[focusedIndex]) {
          menuItems[focusedIndex].click()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="start-menu"
      ref={resolvedMenuRef}
      role="menu"
      aria-label="Start menu"
      aria-orientation="vertical"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="start-menu-header">
        <span className="start-menu-title">Wojak Farmers Plot</span>
      </div>
      <div className="start-menu-items">
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('scroll-to-readme')}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('scroll-to-readme')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">README.TXT</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('scroll-to-mint')}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('scroll-to-mint')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">MINT_INFO.EXE</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('scroll-to-gallery')}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('scroll-to-gallery')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">GALLERY</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('scroll-to-faq')}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('scroll-to-faq')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">FAQ</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('scroll-to-marketplace')}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('scroll-to-marketplace')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">MARKETPLACE</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('open-paint')}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('open-paint')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">Paint</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => {
            if (onOpenWojakCreator) {
              onOpenWojakCreator()
            }
            onClose()
          }}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('wojak-creator')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">Wojak Creator</span>
        </button>
        <hr className="start-menu-separator" role="separator" />
        <div 
          className="start-menu-section-header"
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#000',
            background: '#c0c0c0',
            textTransform: 'uppercase',
          }}
        >
          Games
        </div>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('open-tanggang')}
          role="menuitem"
          tabIndex={0}
        >
          <span className="start-menu-item-icon start-menu-emoji-icon" aria-hidden="true">
            🍊
          </span>
          <span className="start-menu-item-text">TangGang</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('open-pinball')}
          role="menuitem"
          tabIndex={0}
        >
          <img 
            src={getStartMenuIcon('open-pinball')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">3D Pinball</span>
        </button>
        <hr className="start-menu-separator" role="separator" />
        <button 
          className="start-menu-item"
          onClick={() => {
            window.open('https://wojakfarmersplot.crate.ink/#/', '_blank')
            onClose()
          }}
          role="menuitem"
          tabIndex={0}
        >
          <span className="start-menu-item-text">Open Crate</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => {
            window.open('https://x.com/MoJuiceX', '_blank')
            onClose()
          }}
          role="menuitem"
          tabIndex={0}
        >
          <span className="start-menu-item-text">Follow Updates</span>
        </button>
      </div>
    </div>
  )
}

