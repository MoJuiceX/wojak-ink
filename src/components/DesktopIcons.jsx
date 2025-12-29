import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { APPS, DESKTOP_MAIN_ORDER, DESKTOP_GAMES_ORDER, DESKTOP_LINKS_ORDER } from '../constants/apps'
import AppIcon from './ui/AppIcon'
import { playSound } from '../utils/soundManager'
import { loadIconPositions, getDefaultPosition } from '../utils/iconPositionStorage'
import { useDraggableIcon } from '../hooks/useDraggableIcon'
import MarqueeSelection from './desktop/MarqueeSelection'
import DragGhost from './desktop/DragGhost'

// Helper function to remove .txt and .exe extensions from display names (for desktop icons only)
const removeExtensions = (label) => {
  return label.replace(/\.txt$/i, '').replace(/\.exe$/i, '')
}

// Individual draggable icon component - memoized to prevent unnecessary re-renders
const DraggableIcon = memo(function DraggableIcon({ app, index, section, isLink, isMobile, initialPosition, onPositionChange, onAppClick, isSelected = false, isFocused = false, onSelect, iconElementRef }) {
  // Don't use React state for position - hook manages it entirely via DOM
  // React state causes re-renders that interfere with drag-and-drop
  
  // Use ref to store onPositionChange callback to avoid stale closures
  const onPositionChangeRef = useRef(onPositionChange)
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange
  }, [onPositionChange])

  // Don't update React state during drag - hook manages position entirely via DOM
  // Only update parent state for persistence (localStorage), not for rendering
  const { handleMouseDown, handleTouchStart, iconElementRef: hookIconRef } = useDraggableIcon({
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
  const handleClick = (e, appId, onSelect) => {
    // If dragging flag is set, prevent click
    if (e.currentTarget.dataset.dragging === 'true') {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    // Don't handle selection if marquee is active (let marquee handle it)
    // This prevents conflicts between click selection and marquee selection
    
    // Handle selection
    if (onSelect) {
      if (e.shiftKey) {
        // Shift+click: range selection
        onSelect(appId, false, true)
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+click: toggle selection
        onSelect(appId, true, false)
      } else {
        // Single click: clear and select
        onSelect(appId, false, false)
      }
    }
    
    playSound('click')
  }


  // Sync hook's ref with parent's ref callback
  useEffect(() => {
    if (iconElementRef && hookIconRef.current) {
      iconElementRef(hookIconRef.current)
    }
    return () => {
      if (iconElementRef) {
        iconElementRef(null)
      }
    }
  }, [iconElementRef, hookIconRef])

  return (
    <button
      ref={hookIconRef} // Attach hook's ref
      data-icon-id={app.id}
      onClick={(e) => handleClick(e, app.id, onSelect)}
      onDoubleClick={() => onAppClick(app)}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDragStart={(e) => e.preventDefault()}
      className={`${isLink ? 'desktop-icon-button desktop-icon-link' : 'desktop-icon-button'} ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
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
        width: app.id === '@chubzxmeta' ? '120px' : '96px',
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
          <span style={{ display: 'block', height: '14px', whiteSpace: 'nowrap' }}>GENERATOR</span>
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
          <span style={{ display: 'block', height: '14px' }}>EXPLORER</span>
        </div>
      ) : app.id === '@chubzxmeta' ? (
        <span
          style={{
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'visible',
            textOverflow: 'clip',
            maxWidth: '120px',
            width: '120px',
            lineHeight: '14px',
            height: '14px',
            textAlign: 'center',
          }}
        >
          {app.label}
        </span>
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
          {removeExtensions(app.label)}
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
    prevProps.onAppClick === nextProps.onAppClick &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.onSelect === nextProps.onSelect
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
  const [selectedIcons, setSelectedIcons] = useState(new Set())
  const [focusedIcon, setFocusedIcon] = useState(null) // Track focused icon (last clicked)
  const [isGroupDragging, setIsGroupDragging] = useState(false) // Track if dragging selected group
  const [dragGhostPos, setDragGhostPos] = useState({ x: 0, y: 0 }) // Position for drag ghost
  const [dragGhostInitialPositions, setDragGhostInitialPositions] = useState({}) // Store initial icon positions/dimensions for ghost
  const groupDragStartRef = useRef({ x: 0, y: 0, iconPositions: {} }) // Store initial positions for group drag
  const iconElementRefs = useRef({}) // Store refs to all icon elements for marquee selection

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

  const desktopIconsRef = useRef(null)

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

  const handleIconSelect = useCallback((appId, isMultiSelect, isShiftSelect = false) => {
    setSelectedIcons(prev => {
      const next = new Set(prev)
      if (isShiftSelect && focusedIcon) {
        // Shift+click: select range by icon order
        const allIcons = [...mainIcons, ...gamesIcons, ...linksIcons]
        const focusedIndex = allIcons.findIndex(app => app.id === focusedIcon)
        const clickedIndex = allIcons.findIndex(app => app.id === appId)
        
        if (focusedIndex >= 0 && clickedIndex >= 0) {
          const start = Math.min(focusedIndex, clickedIndex)
          const end = Math.max(focusedIndex, clickedIndex)
          for (let i = start; i <= end; i++) {
            next.add(allIcons[i].id)
          }
        } else {
          next.add(appId)
        }
      } else if (isMultiSelect) {
        // Ctrl/Cmd+click: toggle selection
        if (next.has(appId)) {
          next.delete(appId)
        } else {
          next.add(appId)
        }
      } else {
        // Single click: clear others and select this one
        next.clear()
        next.add(appId)
      }
      return next
    })
    
    // Set focus to clicked icon
    setFocusedIcon(appId)
  }, [focusedIcon, mainIcons, gamesIcons, linksIcons])

  const handleMarqueeSelection = useCallback((selectedIds, isAdditive, isFinal = false, isToggle = false) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DesktopIcons] handleMarqueeSelection', {
        selectedIds,
        isAdditive,
        isFinal,
        isToggle,
      })
    }
    
    setSelectedIcons(prev => {
      if (isToggle) {
        // Ctrl/Ctrl+Shift: toggle intersecting icons
        const next = new Set(prev)
        selectedIds.forEach(id => {
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
        })
        return next
      } else if (isAdditive) {
        // Shift: add to existing selection
        const next = new Set(prev)
        selectedIds.forEach(id => next.add(id))
        return next
      } else {
        // No modifier: replace selection
        return new Set(selectedIds)
      }
    })
  }, [])

  const handleFocusChange = (iconId) => {
    setFocusedIcon(iconId)
  }

  // Handle group drag (dragging selected icons together)
  // Note: This is a simplified implementation. Full group drag would require
  // preventing individual icon drag when multiple are selected, which is complex.
  // For now, group drag works but may conflict with individual drag.
  const isGroupDraggingRef = useRef(false)
  
  useEffect(() => {
    if (selectedIcons.size <= 1) {
      setIsGroupDragging(false)
      isGroupDraggingRef.current = false
      return
    }

    const handleGroupDragStart = (e) => {
      // Only handle if multiple icons are selected
      if (selectedIcons.size <= 1) return
      
      // Check if dragging a selected icon
      const target = e.target.closest('[data-icon-id]')
      if (!target) return
      
      const iconId = target.getAttribute('data-icon-id')
      if (!selectedIcons.has(iconId)) return

      // Get desktop container for coordinate conversion
      const desktop = e.target.closest('.desktop')
      if (!desktop) return
      const desktopRect = desktop.getBoundingClientRect()

      // Store initial positions and dimensions of all selected icons
      // Use desktop-relative coordinates (like useDraggableIcon does)
      const positions = {}
      const iconDimensions = {}
      selectedIcons.forEach(id => {
        const iconEl = iconElementRefs.current[id]
        if (iconEl) {
          const rect = iconEl.getBoundingClientRect()
          // Convert to desktop-relative coordinates (not screen coordinates)
          const desktopRelativeX = rect.left - desktopRect.left
          const desktopRelativeY = rect.top - desktopRect.top
          positions[id] = { x: desktopRelativeX, y: desktopRelativeY }
          // Store dimensions for ghost rendering
          iconDimensions[id] = {
            width: rect.width,
            height: rect.height
          }
        }
      })

      groupDragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        iconPositions: positions,
        iconDimensions: iconDimensions,
        desktopRect: desktopRect, // Store desktop rect for coordinate conversion
      }

      isGroupDraggingRef.current = true
      setIsGroupDragging(true)
      setDragGhostPos({ x: e.clientX, y: e.clientY })
      setDragGhostInitialPositions(iconDimensions) // Store dimensions for ghost rendering
    }

    const handleGroupDragMove = (e) => {
      if (!isGroupDraggingRef.current) return

      const desktopRect = groupDragStartRef.current.desktopRect
      if (!desktopRect) return

      // Calculate delta in desktop-relative coordinates
      const deltaX = e.clientX - groupDragStartRef.current.x
      const deltaY = e.clientY - groupDragStartRef.current.y

      // Update drag ghost position
      setDragGhostPos({ x: e.clientX, y: e.clientY })

      // Move all selected icons together
      selectedIcons.forEach(id => {
        const iconEl = iconElementRefs.current[id]
        if (iconEl && groupDragStartRef.current.iconPositions[id]) {
          const startPos = groupDragStartRef.current.iconPositions[id]
          // Calculate new position in desktop-relative coordinates
          const newX = startPos.x + deltaX
          const newY = startPos.y + deltaY
          
          // Clamp to desktop bounds (like useDraggableIcon does)
          const ICON_WIDTH = 96
          const ICON_HEIGHT = 80
          const TASKBAR_HEIGHT = 46
          const maxX = desktopRect.width - ICON_WIDTH
          const maxY = desktopRect.height - TASKBAR_HEIGHT - ICON_HEIGHT
          const clampedX = Math.max(0, Math.min(newX, maxX))
          const clampedY = Math.max(0, Math.min(newY, maxY))
          
          // Update position via DOM (like useDraggableIcon does)
          iconEl.style.setProperty('left', `${clampedX}px`, 'important')
          iconEl.style.setProperty('top', `${clampedY}px`, 'important')
        }
      })
    }

    const handleGroupDragEnd = () => {
      if (!isGroupDraggingRef.current) return

      // Save final positions for all dragged icons (in desktop-relative coordinates)
      selectedIcons.forEach(id => {
        const iconEl = iconElementRefs.current[id]
        if (iconEl && groupDragStartRef.current.iconPositions[id]) {
          // Get final position from DOM (already set during drag)
          const finalLeft = parseFloat(iconEl.style.left) || groupDragStartRef.current.iconPositions[id].x
          const finalTop = parseFloat(iconEl.style.top) || groupDragStartRef.current.iconPositions[id].y
          
          // Ensure position is saved with !important (like useDraggableIcon does)
          iconEl.style.setProperty('left', `${finalLeft}px`, 'important')
          iconEl.style.setProperty('top', `${finalTop}px`, 'important')
          
          // Force reflow to ensure position is applied
          iconEl.offsetHeight
          
          // Notify parent for persistence (use requestAnimationFrame like useDraggableIcon)
          requestAnimationFrame(() => {
            iconEl.style.setProperty('left', `${finalLeft}px`, 'important')
            iconEl.style.setProperty('top', `${finalTop}px`, 'important')
            requestAnimationFrame(() => {
              handlePositionChange(id, finalLeft, finalTop)
            })
          })
        }
      })

      isGroupDraggingRef.current = false
      setIsGroupDragging(false)
      groupDragStartRef.current = { x: 0, y: 0, iconPositions: {}, iconDimensions: {}, desktopRect: null }
      setDragGhostInitialPositions({}) // Clear ghost data
    }

    const container = desktopIconsRef.current
    if (container) {
      container.addEventListener('pointerdown', handleGroupDragStart, true) // Use capture phase
      document.addEventListener('pointermove', handleGroupDragMove)
      document.addEventListener('pointerup', handleGroupDragEnd)

      return () => {
        container.removeEventListener('pointerdown', handleGroupDragStart, true)
        document.removeEventListener('pointermove', handleGroupDragMove)
        document.removeEventListener('pointerup', handleGroupDragEnd)
      }
    }
  }, [selectedIcons, handlePositionChange])

  // Handle desktop click to deselect
  // Clicking empty desktop should clear selection (but not during drag)
  useEffect(() => {
    const handleDesktopClick = (e) => {
      // Only deselect if clicking on desktop background (not on icons or windows)
      // And only if it's a simple click (not a drag)
      if (!e.target.closest('.desktop-icons button') && 
          !e.target.closest('.window') &&
          !e.target.closest('.desktop-image-icons') &&
          !e.target.closest('.marquee-selection') &&
          !e.target.closest('.taskbar') &&
          !e.target.closest('.start-menu')) {
        
        // Check if this is a simple click (not a drag)
        // We'll use a small timeout to detect if mouse moves
        let isDrag = false
        const startX = e.clientX
        const startY = e.clientY
        
        const handleMouseMove = (moveE) => {
          const deltaX = Math.abs(moveE.clientX - startX)
          const deltaY = Math.abs(moveE.clientY - startY)
          if (deltaX > 3 || deltaY > 3) {
            isDrag = true
          }
        }
        
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
          
          // Only deselect if it wasn't a drag
          if (!isDrag) {
            setSelectedIcons(new Set())
            setFocusedIcon(null)
          }
        }
        
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp, { once: true })
      }
    }

    // Use capture phase but with lower priority (after marquee selection)
    document.addEventListener('mousedown', handleDesktopClick, true)

    return () => {
      document.removeEventListener('mousedown', handleDesktopClick, true)
    }
  }, [])


  // Removed duplicate detection useEffect - it was causing issues and not fixing the problem

  return (
    <div
      ref={desktopIconsRef}
      className="desktop-icons"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: '46px', // Anchor above taskbar
        zIndex: 1,
        pointerEvents: 'auto', // Need pointer events for marquee selection
        // Ensure container can receive events even when empty
        minHeight: '100px',
      }}
      onPointerDown={(e) => {
        // Don't interfere with clicks on DesktopImageIcons
        if (e.target.closest('.desktop-image-icons-container') || 
            e.target.closest('.desktop-image-icons')) {
          return // Let DesktopImageIcons handle it
        }
        // Debug: log when container receives pointer down
        if (process.env.NODE_ENV === 'development' && e.target === desktopIconsRef.current) {
          console.log('[DesktopIcons] Container received pointerdown', e)
        }
      }}
      onContextMenu={(e) => {
        // Only stop propagation if clicking on an actual icon, not empty space
        if (!e.target.closest('.desktop-icon-button') && !e.target.closest('[data-icon-id]')) {
          // Let the event bubble to desktop for context menu
          return
        }
        e.stopPropagation()
      }}
    >
      {/* Main icons */}
      {mainIcons.map((app, index) => {
        const savedPos = iconPositions[app.id]
        let defaultPos = getDefaultPosition(app.id, index, 'main', isMobile)
        
        // Special positioning for CHIA_NETWORK: place to the left of recycle bin
        if (app.id === '@chubzxmeta' && !savedPos) {
          const ICON_WIDTH = 96
          const ICON_HEIGHT = 80
          const TASKBAR_HEIGHT = 46
          const RIGHT_MARGIN = 20
          const BOTTOM_MARGIN = 20
          const ICON_GAP = 20 // Gap between CHIA_NETWORK and recycle bin
          
          // Calculate recycle bin position (bottom right)
          const recycleBinX = window.innerWidth - RIGHT_MARGIN - ICON_WIDTH
          const recycleBinY = window.innerHeight - TASKBAR_HEIGHT - BOTTOM_MARGIN - ICON_HEIGHT
          
          // Position CHIA_NETWORK to the left of recycle bin (same Y, X = recycleBinX - ICON_WIDTH - gap)
          defaultPos = {
            x: recycleBinX - ICON_WIDTH - ICON_GAP,
            y: recycleBinY
          }
        }
        
        const position = savedPos || defaultPos
        // CRITICAL: Ensure key is always a string to prevent React from inferring key={0}
        const uniqueKey = `main-${String(app.id)}`
        // #region agent log
        if (index < 3 || app.id === '@chubzxmeta' || app.id === 0 || app.id === '0') {
          fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DesktopIcons.jsx:757',message:'Main icon key generation',data:{appId:app.id,appIdType:typeof app.id,uniqueKey,uniqueKeyType:typeof uniqueKey,index},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          console.log('[DesktopIcons] Main icon key', { appId: app.id, appIdType: typeof app.id, uniqueKey, uniqueKeyType: typeof uniqueKey, index })
        }
        // #endregion
        return (
          <DraggableIcon
            key={uniqueKey}
            app={app}
            index={index}
            section="main"
            isLink={false}
            isMobile={isMobile}
            initialPosition={position}
            onPositionChange={(x, y) => handlePositionChange(app.id, x, y)}
            onAppClick={handleAppClick}
            isSelected={selectedIcons.has(app.id)}
            isFocused={focusedIcon === app.id}
            onSelect={(isMulti, isShift) => handleIconSelect(app.id, isMulti, isShift)}
            iconElementRef={(el) => {
              if (el) {
                iconElementRefs.current[app.id] = el
              } else {
                delete iconElementRefs.current[app.id]
              }
            }}
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
            onPositionChange={(x, y) => handlePositionChange(app.id, x, y)}
            onAppClick={handleAppClick}
            isSelected={selectedIcons.has(app.id)}
            isFocused={focusedIcon === app.id}
            onSelect={(isMulti, isShift) => handleIconSelect(app.id, isMulti, isShift)}
            iconElementRef={(el) => {
              if (el) {
                iconElementRefs.current[app.id] = el
              } else {
                delete iconElementRefs.current[app.id]
              }
            }}
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
            onPositionChange={(x, y) => handlePositionChange(app.id, x, y)}
            onAppClick={handleAppClick}
            isSelected={selectedIcons.has(app.id)}
            isFocused={focusedIcon === app.id}
            onSelect={(isMulti, isShift) => handleIconSelect(app.id, isMulti, isShift)}
            iconElementRef={(el) => {
              if (el) {
                iconElementRefs.current[app.id] = el
              } else {
                delete iconElementRefs.current[app.id]
              }
            }}
          />
        )
      })}
      <MarqueeSelection
        onSelectionChange={handleMarqueeSelection}
        iconElements={Object.values(iconElementRefs.current).filter(Boolean)}
        containerRef={desktopIconsRef}
        onFocusChange={handleFocusChange}
      />
      {/* Only show drag ghost during actual group drag, not during marquee selection */}
      {isGroupDragging && selectedIcons.size > 0 && (
        <DragGhost
          x={dragGhostPos.x}
          y={dragGhostPos.y}
          count={selectedIcons.size}
          iconElements={Array.from(selectedIcons).map(id => iconElementRefs.current[id]).filter(Boolean)}
          initialPositions={dragGhostInitialPositions}
        />
      )}
    </div>
  )
}

