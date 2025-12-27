import { useEffect, useRef, useState } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { useMarketplace } from '../contexts/MarketplaceContext'
import { APPS } from '../constants/apps'
import AppIcon from './ui/AppIcon'
import { playSound } from '../utils/soundManager'

export default function StartMenu({ isOpen, onClose, onOpenPaint, onOpenWojakGenerator, onOpenApp, menuRef, startButtonRef }) {
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront, activeWindowId, isWindowActive } = useWindow()
  const internalMenuRef = useRef(null)
  const resolvedMenuRef = menuRef || internalMenuRef
  const deferredFocusRafRef = useRef(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 640)

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

  // Play menu popup sound when menu opens
  useEffect(() => {
    if (isOpen) {
      playSound('menuPopup')
    }
  }, [isOpen])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      // Listen for both mouse and touch/pointer events to support mobile
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
      document.addEventListener('pointerdown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, resolvedMenuRef, startButtonRef])

  const handleAppClick = (app) => {
    // Play menu command sound when item is clicked
    playSound('menuCommand')
    
    // Capture the active window before we start, so we can detect if the user
    // changes focus before our deferred bringToFront runs.
    const priorActiveId = activeWindowId

    // Switch on app.open.type
    switch (app.open.type) {
      case 'external':
        window.open(app.open.href, '_blank', 'noopener,noreferrer')
        onClose()
        return

      case 'callback':
        if (app.open.name === 'open-paint' && onOpenPaint) {
          onOpenPaint()
        } else if (app.open.name === 'open-wojak-generator' && onOpenWojakGenerator) {
          onOpenWojakGenerator()
        }
        onClose()
        return

      case 'scroll':
      case 'window': {
        // Map scroll targets to window IDs (scroll behavior opens windows)
        const scrollToWindowId = {
          'scroll-to-readme': 'window-readme-txt',
          'scroll-to-mint': 'window-mint-info-exe',
          'scroll-to-gallery': 'window-gallery',
          'scroll-to-faq': 'window-faq',
          'scroll-to-marketplace': 'window-marketplace',
        }
        
        const windowId = app.open.type === 'window' 
          ? app.open.windowId 
          : scrollToWindowId[app.open.target]

        if (!windowId) {
          onClose()
          return
        }

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
        break
      }

      default:
        console.warn('Unknown app.open.type:', app.open.type)
    }
    
    onClose()
  }

  // Keyboard navigation for menu items with improved arrow key support
  useEffect(() => {
    if (!isOpen) return

    const menuItems = resolvedMenuRef.current?.querySelectorAll('.start-menu-item')
    if (!menuItems || menuItems.length === 0) return

    let focusedIndex = -1

    // Focus first item when menu opens
    if (menuItems.length > 0) {
      focusedIndex = 0
      menuItems[0]?.focus()
    }

    const handleKeyDown = (e) => {
      // Only handle if focus is within the menu
      if (!resolvedMenuRef.current?.contains(document.activeElement)) {
        return
      }

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
      } else if (e.key === 'Home') {
        e.preventDefault()
        focusedIndex = 0
        menuItems[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        focusedIndex = menuItems.length - 1
        menuItems[focusedIndex]?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const menuItemsRef = useRef(null)


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
      <div className="start-menu-items" ref={menuItemsRef}>
        {/* MAIN group apps */}
        {Object.values(APPS)
          .filter(app => app.group === 'MAIN' && (!isMobile || app.id !== 'PAINT') && app.id !== 'COMMUNITY_RESOURCES')
          .map(app => (
            <button
              key={app.id}
              className="start-menu-item"
              onClick={() => handleAppClick(app)}
              role="menuitem"
              tabIndex={0}
            >
              <AppIcon
                icon={app.icon}
                className="start-menu-item-icon"
                size={16}
              />
              <span className="start-menu-item-text">{app.label}</span>
            </button>
          ))}
        
        <hr className="start-menu-separator" role="separator" />
        
        {/* GAMES group header */}
        <div
          className="start-menu-section-header"
          style={{
            padding: '4px 8px',
            fontWeight: 'bold',
                    color: 'var(--menu-text)',
                    background: 'var(--menu-bg)',
            textTransform: 'uppercase',
          }}
        >
          Games
        </div>
        
        {/* GAMES group apps */}
        {Object.values(APPS)
          .filter(app => app.group === 'GAMES')
          .map(app => (
            <button
              key={app.id}
              className="start-menu-item"
              onClick={() => handleAppClick(app)}
              role="menuitem"
              tabIndex={0}
            >
              <AppIcon
                icon={app.icon}
                className="start-menu-item-icon"
                size={16}
              />
              <span className="start-menu-item-text">{app.label}</span>
            </button>
          ))}
        
        <hr className="start-menu-separator" role="separator" />
        
        {/* LINKS group header */}
        <div
          className="start-menu-section-header"
          style={{
            padding: '4px 8px',
            fontWeight: 'bold',
                    color: 'var(--menu-text)',
                    background: 'var(--menu-bg)',
            textTransform: 'uppercase',
          }}
        >
          Links
        </div>
        
        {/* LINKS group apps */}
        {Object.values(APPS)
          .filter(app => app.group === 'LINKS')
          .map(app => (
            <button
              key={app.id}
              className="start-menu-item"
              onClick={() => handleAppClick(app)}
              role="menuitem"
              tabIndex={0}
            >
              <AppIcon
                icon={app.icon}
                className="start-menu-item-icon"
                size={16}
              />
              <span className="start-menu-item-text">{app.label}</span>
            </button>
          ))}
        
        {/* Dev Panel - only in development */}
        {import.meta.env.DEV && (
          <>
            <hr className="start-menu-separator" role="separator" />
            <button
              className="start-menu-item"
              onClick={() => {
                onOpenApp('dev-panel')
                onClose()
              }}
              role="menuitem"
              tabIndex={0}
            >
              <AppIcon
                icon="🔧"
                className="start-menu-item-icon"
                size={16}
              />
              <span className="start-menu-item-text">Dev Panel</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

