import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { APPS, DESKTOP_MAIN_ORDER, DESKTOP_GAMES_ORDER, DESKTOP_LINKS_ORDER } from '../constants/apps'
import AppIcon from './ui/AppIcon'
import { playSound } from '../utils/soundManager'
import { loadIconPositions, getDefaultPosition } from '../utils/iconPositionStorage'
import { useDraggableIcon } from '../hooks/useDraggableIcon'

// Individual draggable icon component - memoized to prevent unnecessary re-renders
const DraggableIcon = memo(function DraggableIcon({ app, index, section, isLink, isMobile, initialPosition, onPositionChange, onAppClick }) {
  // Don't use React state for position - hook manages it entirely via DOM
  // React state causes re-renders that interfere with drag-and-drop
  
  // Use ref to store onPositionChange callback to avoid stale closures
  const onPositionChangeRef = useRef(onPositionChange)
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange
  }, [onPositionChange])

  // Don't update React state during drag - hook manages position entirely via DOM
  // Only update parent state for persistence (localStorage), not for rendering
  const { handleMouseDown, handleTouchStart, iconElementRef } = useDraggableIcon({
    appId: app.id,
    initialPosition: initialPosition, // Use prop directly - no React state
    onPositionChange: useCallback((x, y) => {
      // DON'T update React state - hook manages position via DOM with !important
      // Updating React state causes re-renders that interfere with drag
      // Only notify parent for persistence (localStorage)
      onPositionChangeRef.current(app.id, x, y)
    }, [app.id])
  })
  
  // Check for duplicates after hook has set up the ref
  useEffect(() => {
    // Check for duplicate DOM elements after a longer delay to allow React to finish rendering and cleanup
    // Use requestAnimationFrame to ensure we check after the browser has painted
    const checkDuplicates = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (iconElementRef.current) {
          const iconId = iconElementRef.current.getAttribute('data-icon-id')
          const allIconsWithSameId = document.querySelectorAll(`[data-icon-id="${iconId}"]`)
          if (allIconsWithSameId.length > 1) {
            // Remove duplicates - keep only the first one
            for (let i = 1; i < allIconsWithSameId.length; i++) {
              allIconsWithSameId[i].remove()
            }
          }
        }
      })
    })
    
    return () => {
      cancelAnimationFrame(checkDuplicates)
    }
  }, [app.id, iconElementRef])

  // Prevent onClick if drag occurred (Windows 98 behavior)
  const handleClick = (e) => {
    // If dragging flag is set, prevent click
    if (e.currentTarget.dataset.dragging === 'true') {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    playSound('click')
  }


  return (
    <button
      ref={iconElementRef} // Attach hook's ref
      data-icon-id={app.id}
      onClick={handleClick}
      onDoubleClick={() => onAppClick(app)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDragStart={(e) => e.preventDefault()}
      className={isLink ? 'desktop-icon-button desktop-icon-link' : 'desktop-icon-button'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        fontFamily: "'MS Sans Serif', sans-serif",
        color: '#fff',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
        width: '96px',
        position: 'absolute',
        // Don't set position in style - hook manages it entirely via DOM with !important
        // This prevents React from applying stale position props that conflict with hook's styles
        left: undefined,
        top: undefined,
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: 1,
        pointerEvents: 'auto',
        // Prevent React from overwriting position during drag
        willChange: 'transform',
        // Disable transitions for smooth dragging
        transition: 'none',
      }}
      onMouseEnter={(e) => {
        // Don't change background if dragging
        if (!e.currentTarget.style.opacity || e.currentTarget.style.opacity === '1') {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.style.opacity || e.currentTarget.style.opacity === '1') {
          e.currentTarget.style.background = 'transparent'
        }
      }}
      aria-label={`Open ${app.label}`}
    >
      <div style={{ 
        position: 'relative', 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        minWidth: '32px',
        minHeight: '32px',
        flexShrink: 0,
      }}>
        <AppIcon
          icon={app.icon}
          size={32}
          style={{
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
        {isLink && app.id !== 'CRATE' && app.id !== 'FOLLOW_UPDATES' && (
          <span
            className="desktop-icon-shortcut-arrow"
            aria-hidden="true"
          >
            ▶
          </span>
        )}
      </div>
      {app.id === 'WOJAK_GENERATOR' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: '14px',
            textAlign: 'center',
            width: '96px',
          }}
        >
          <span style={{ display: 'block', height: '14px' }}>WOJAK</span>
          <span style={{ display: 'block', height: '14px', whiteSpace: 'nowrap' }}>GENERATOR.EXE</span>
        </div>
      ) : app.id === 'RARITY_EXPLORER' ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: '14px',
            textAlign: 'center',
            width: '96px',
          }}
        >
          <span style={{ display: 'block', height: '14px' }}>RARITY</span>
          <span style={{ display: 'block', height: '14px' }}>EXPLORER.EXE</span>
        </div>
      ) : (
        <span
          style={{
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '96px',
            width: '96px',
            lineHeight: '14px',
            height: '14px',
            textAlign: 'center',
          }}
        >
          {app.label}
        </span>
      )}
    </button>
  )
}, (prevProps, nextProps) => {
  // Only re-render if app changed or mobile state changed
  // Position is managed by hook via DOM, so we don't need to compare initialPosition
  // This prevents unnecessary re-renders that could cause snap-back glitches
  const shouldSkipRender = (
    prevProps.app.id === nextProps.app.id &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.app === nextProps.app && // Reference equality for app object
    prevProps.onPositionChange === nextProps.onPositionChange &&
    prevProps.onAppClick === nextProps.onAppClick
    // Don't compare initialPosition - hook manages position via DOM, prop is only for initial mount
  )
  return shouldSkipRender
})

export default function DesktopIcons({ onOpenApp }) {
  useEffect(() => {
    // Clean up any duplicate icons on mount - this handles cases where old DOM elements weren't cleaned up
    const cleanupDuplicates = setTimeout(() => {
      const allIcons = document.querySelectorAll('[data-icon-id]')
      const iconIds = new Map()
      allIcons.forEach(icon => {
        const iconId = icon.getAttribute('data-icon-id')
        if (!iconIds.has(iconId)) {
          iconIds.set(iconId, [])
        }
        iconIds.get(iconId).push(icon)
      })
      
      // Remove duplicates, keeping only the first one
      iconIds.forEach((icons, iconId) => {
        if (icons.length > 1) {
          for (let i = 1; i < icons.length; i++) {
            icons[i].remove()
          }
        }
      })
    }, 200)
    
    return () => {
      clearTimeout(cleanupDuplicates)
    }
  }, [])
  
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront } = useWindow()
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 640)
  const [iconPositions, setIconPositions] = useState({})

  // Memoize handleAppClick to prevent unnecessary re-renders
  const handleAppClick = useCallback((app) => {
    // Switch on app.open.type
    switch (app.open.type) {
      case 'external':
        window.open(app.open.href, '_blank', 'noopener,noreferrer')
        return

      case 'callback':
        // Desktop doesn't support callbacks (Paint, Wojak Generator)
        // These are handled via Start Menu only
        console.warn('Callback actions not supported on desktop:', app.open.name)
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

        if (!windowId || !onOpenApp) return

        // Check if window is already open
        const allWindows = getAllWindows()
        const windowExists = allWindows.some(w => w.id === windowId)

        if (windowExists) {
          // Window exists - restore or bring to front
          if (isWindowMinimized(windowId)) {
            restoreWindow(windowId)
          } else {
            bringToFront(windowId)
          }
        } else {
          // Window not open - open it
          onOpenApp(windowId)
        }
        break
      }

      default:
        console.warn('Unknown app.open.type:', app.open.type)
    }
  }, [getAllWindows, isWindowMinimized, restoreWindow, bringToFront, onOpenApp])

  // Load icon positions on mount
  useEffect(() => {
    const saved = loadIconPositions()
    setIconPositions(saved)
  }, [])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Build desktop icons from order arrays (filter out PAINT on mobile)
  // Use useMemo to prevent recreating arrays on every render
  const mainIcons = React.useMemo(() => {
    const icons = DESKTOP_MAIN_ORDER
      .filter(appId => !isMobile || appId !== 'PAINT')
      .map(appId => APPS[appId])
      .filter(Boolean)
    // Check for duplicate IDs
    const ids = icons.map(i => i.id)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    if (duplicates.length > 0) {
      console.error('[DesktopIcons] Duplicate app IDs found:', duplicates)
    }
    return icons
  }, [isMobile])
  
  const gamesIcons = React.useMemo(() => {
    const icons = DESKTOP_GAMES_ORDER.map(appId => APPS[appId]).filter(Boolean)
    return icons
  }, [])
  
  const linksIcons = React.useMemo(() => {
    const icons = DESKTOP_LINKS_ORDER.map(appId => APPS[appId]).filter(Boolean)
    return icons
  }, [])

  const handlePositionChange = (appId, x, y) => {
    // Use direct state update like Recycle Bin does - simpler and faster
    setIconPositions(prev => {
      // Only update if position actually changed to avoid unnecessary re-renders
      if (prev[appId]?.x === x && prev[appId]?.y === y) {
        return prev // Return same object if no change
      }
      const newPositions = { ...prev, [appId]: { x, y } }
      return newPositions
    })
  }


  // Removed duplicate detection useEffect - it was causing issues and not fixing the problem

  return (
    <div
      className="desktop-icons"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: '46px', // Anchor above taskbar
        zIndex: 1,
        pointerEvents: 'none', // Allow clicks to pass through container to icons
      }}
    >
      {/* Main icons */}
      {mainIcons.map((app, index) => {
        const savedPos = iconPositions[app.id]
        const defaultPos = getDefaultPosition(app.id, index, 'main', isMobile)
        const position = savedPos || defaultPos
        return (
          <DraggableIcon
            key={app.id}
            app={app}
            index={index}
            section="main"
            isLink={false}
            isMobile={isMobile}
            initialPosition={position}
            onPositionChange={handlePositionChange}
            onAppClick={handleAppClick}
          />
        )
      })}

      {/* Games icons */}
      {gamesIcons.map((app, index) => {
        const savedPos = iconPositions[app.id]
        const defaultPos = getDefaultPosition(app.id, index, 'games', isMobile)
        const position = savedPos || defaultPos
        const uniqueKey = `games-${app.id}`
        return (
          <DraggableIcon
            key={uniqueKey}
            app={app}
            index={index}
            section="games"
            isLink={false}
            isMobile={isMobile}
            initialPosition={position}
            onPositionChange={handlePositionChange}
            onAppClick={handleAppClick}
          />
        )
      })}

      {/* Links icons */}
      {linksIcons.map((app, index) => {
        const savedPos = iconPositions[app.id]
        const defaultPos = getDefaultPosition(app.id, index, 'links', isMobile)
        const position = savedPos || defaultPos
        const uniqueKey = `links-${app.id}`
        return (
          <DraggableIcon
            key={uniqueKey}
            app={app}
            index={index}
            section="links"
            isLink={true}
            isMobile={isMobile}
            initialPosition={position}
            onPositionChange={handlePositionChange}
            onAppClick={handleAppClick}
          />
        )
      })}
    </div>
  )
}

