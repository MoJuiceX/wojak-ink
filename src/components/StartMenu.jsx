import { useEffect, useRef } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { getStartMenuIcon } from '../utils/windowIcons'

export default function StartMenu({ isOpen, onClose, onOpenPaint, onOpenWojakCreator }) {
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront } = useWindow()
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && 
          !e.target.closest('.start-button')) {
        onClose()
      }
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
    }

    if (action === 'open-paint') {
      if (onOpenPaint) {
        onOpenPaint()
      }
      onClose()
      return
    }

    const windowId = actionToWindowId[action]
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
      } else {
        // Window not registered yet - wait a bit and try again
        // This can happen if the window hasn't registered yet
        const windowElement = document.getElementById(windowId)
        if (windowElement) {
          // Window exists in DOM, wait for registration and then restore
          setTimeout(() => {
            try {
              const retryWindows = getAllWindows()
              const retryExists = retryWindows.some(w => w.id === windowId)
              if (retryExists) {
                if (isWindowMinimized(windowId)) {
                  restoreWindow(windowId)
                } else {
                  bringToFront(windowId)
                }
              } else {
                // Still not registered - force bring to front via DOM
                windowElement.style.display = 'block'
                windowElement.style.zIndex = '9999'
                // Try to trigger a click on the window to bring it to front
                const titleBar = windowElement.querySelector('.title-bar')
                if (titleBar) {
                  titleBar.click()
                }
              }
            } catch (err) {
              console.debug('Could not restore window after retry:', windowId, err)
            }
          }, 100)
        } else {
          // Window doesn't exist in DOM either - log for debugging
          console.debug('Window not found in DOM or context:', windowId)
        }
      }
    }
    
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="start-menu" ref={menuRef} role="menu" aria-label="Start menu" aria-orientation="vertical">
      <div className="start-menu-header">
        <span className="start-menu-title">Wojak Farmers Plot</span>
      </div>
      <div className="start-menu-items">
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('scroll-to-readme')}
          role="menuitem"
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
          onClick={() => handleMenuItemClick('open-tanggang')}
          role="menuitem"
        >
          <img 
            src={getStartMenuIcon('open-tanggang')} 
            alt="" 
            className="start-menu-item-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-menu-item-text">TangGang</span>
        </button>
        <button 
          className="start-menu-item"
          onClick={() => handleMenuItemClick('open-paint')}
          role="menuitem"
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
        <button 
          className="start-menu-item"
          onClick={() => {
            window.open('https://wojakfarmersplot.crate.ink/#/', '_blank')
            onClose()
          }}
          role="menuitem"
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
        >
          <span className="start-menu-item-text">Follow Updates</span>
        </button>
      </div>
    </div>
  )
}

