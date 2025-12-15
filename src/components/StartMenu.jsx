import { useEffect, useRef } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { getStartMenuIcon } from '../utils/windowIcons'

export default function StartMenu({ isOpen, onClose, onOpenPaint }) {
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
      'open-tanggang': 'window-tanggang',
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
      // Always try to restore the window - it should exist since windows are always rendered
      // If minimized, restore it. If not minimized, bring to front.
      try {
        if (isWindowMinimized(windowId)) {
          restoreWindow(windowId)
        } else {
          bringToFront(windowId)
        }
      } catch (e) {
        // If window doesn't exist in context yet, try to find it in DOM and trigger restore
        // This can happen if the window hasn't registered yet
        const windowElement = document.getElementById(windowId)
        if (windowElement) {
          // Window exists in DOM, try to restore it by clicking the taskbar button
          // or directly manipulating it
          setTimeout(() => {
            try {
              restoreWindow(windowId)
            } catch (err) {
              console.debug('Could not restore window:', windowId, err)
            }
          }, 50)
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
        <hr className="start-menu-separator" role="separator" />
        <button 
          className="start-menu-item"
          onClick={() => {
            window.open('https://crate.ink/#/collection-detail/WOJAKFARMERSPLOT', '_blank')
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

