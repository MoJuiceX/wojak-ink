/**
 * BEHAVIOR CHECKLIST - Windows 98 Start Menu
 * 
 * DESKTOP (Mouse):
 * - Start button toggles menu open/close (pressed when open)
 * - Hover highlights items immediately
 * - Submenus open on hover after MENU_SHOW_DELAY_MS (400ms)
 * - Submenus open immediately on click
 * - Diagonal movement into open submenu is "forgiven" (MENU_AIM_GRACE_MS = 250ms)
 * - Clicking outside closes immediately
 * - Esc closes deepest submenu first, then Start menu
 * - Ctrl+Esc toggles Start menu
 * - Overflow panels show scroll arrows and autoscroll on hover
 * 
 * MOBILE/TOUCH:
 * - Tap Start toggles menu
 * - Tap submenu parent opens that submenu immediately
 * - Tap leaf runs action and closes entire Start menu
 * - For small screens: use drill-in panel pattern (replace current panel)
 * - Drill-in shows header with "Back" + submenu title
 * - Back returns to previous menu level
 * - Tap outside closes
 * - Menu content scrollable with native touch scroll
 */

import { useEffect, useRef, useState, useLayoutEffect, useCallback, Fragment } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { APPS } from '../constants/apps'
import AppIcon from './ui/AppIcon'
import { playSound } from '../utils/soundManager'
import { COMMUNITY_LINKS } from './windows/CommunityResourcesWindow'

// Constants
const MENU_SHOW_DELAY_MS = 100  // Reduced for more fluid hover experience
const MENU_CLOSE_DELAY_MS = 250
const MENU_AIM_GRACE_MS = 250
const AUTOSCROLL_INTERVAL_MS = 50
const AUTOSCROLL_STEP_PX = 12
const POINTER_MOVE_THRESHOLD_PX = 3

// Menu structure - represents Programs -> Paint/Games/Links hierarchy
const MENU_STRUCTURE = {
  programs: {
    type: 'submenu',
    label: 'Programs',
    icon: { type: 'img', src: '/icon/directory_closed-0.png' },
    items: [
      // Paint as direct app item
      APPS.PAINT,
      {
        id: 'games',
        label: 'Games',
        icon: { type: 'img', src: '/icon/directory_closed-0.png' },
        type: 'submenu',
        items: Object.values(APPS).filter(app => app.group === 'GAMES')
      },
      {
        id: 'links',
        label: 'Links',
        icon: { type: 'img', src: '/icon/directory_closed-0.png' },
        type: 'submenu',
        items: [
          ...Object.values(APPS).filter(app => app.group === 'LINKS'),
          {
            id: 'community-resources',
            label: 'Community Resources',
            icon: { type: 'img', src: '/icon/directory_closed-0.png' },
            type: 'submenu',
            items: COMMUNITY_LINKS.map(link => ({
              id: `community-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`,
              label: link.name,
              icon: { type: 'img', src: '/icon/notepad-0.png' },
              open: { type: 'external', href: link.url }
            }))
          }
        ]
      }
    ]
  }
}

export default function StartMenu({ isOpen, onClose, onOpenPaint, onOpenWojakGenerator, onOpenApp, menuRef, startButtonRef }) {
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront, activeWindowId } = useWindow()
  const internalMenuRef = useRef(null)
  const resolvedMenuRef = menuRef || internalMenuRef
  const deferredFocusRafRef = useRef(null)
  
  // Detect pointer type and viewport
  const [pointerType, setPointerType] = useState(() => {
    if (typeof window === 'undefined') return 'mouse'
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches ? 'mouse' : 'touch'
  })
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 640)
  const [useDrillIn, setUseDrillIn] = useState(false)
  
  // State machine
  const [activePath, setActivePath] = useState([]) // Array of indices representing open submenu chain
  const [selectedIndexByDepth, setSelectedIndexByDepth] = useState({}) // Depth -> selected item index
  const [pendingOpen, setPendingOpen] = useState(null)
  const [submenuPositionsReady, setSubmenuPositionsReady] = useState({}) // Track which submenus have positions calculated
  
  // Keyboard navigation state
  const [keyboardFocusDepth, setKeyboardFocusDepth] = useState(0)
  const [keyboardFocusIndex, setKeyboardFocusIndex] = useState(0)
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
  
  // Overflow scrolling state
  const [scrollStateByPanel, setScrollStateByPanel] = useState({})
  
  // Timers
  const hoverTimerRef = useRef(null)
  const hoverCloseTimerRef = useRef(null)
  const aimGraceTimerRef = useRef(null)
  
  // Mouse position tracking for diagonal forgiveness
  const mousePositionsRef = useRef([])
  const MAX_MOUSE_POSITIONS = 3
  
  // Refs for menu panels and items
  const rootMenuRef = useRef(null)
  const submenuRefs = useRef({})
  const itemRefs = useRef({})
  const submenuPositionsRef = useRef({}) // Store calculated positions for flyout submenus
  
  // Overflow scrolling state
  const autoscrollIntervalRef = useRef(null)
  const autoscrollDirectionRef = useRef(null)
  const autoscrollTargetRef = useRef(null)

  // Detect pointer type on interaction
  const handlePointerInteraction = useCallback((e) => {
    if (e.pointerType === 'mouse') {
      setPointerType('mouse')
    } else if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      setPointerType('touch')
    }
  }, [])

  // Detect mobile viewport and decide on drill-in
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth
      setIsMobile(width <= 640)
      setUseDrillIn(width < 500)
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  // Play menu popup sound when menu opens and focus root menu
  useEffect(() => {
    if (isOpen) {
      playSound('menuPopup')
      // Focus root menu for keyboard navigation
      if (rootMenuRef.current) {
        rootMenuRef.current.focus()
      }
      // Reset keyboard state
      setKeyboardFocusDepth(0)
      setKeyboardFocusIndex(0)
      setIsKeyboardMode(false)
    }
  }, [isOpen])

  // Reset state when menu closes
  useEffect(() => {
    if (!isOpen) {
      setActivePath([])
      setSelectedIndexByDepth({})
      setPendingOpen(null)
      setSubmenuPositionsReady({})
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current)
        hoverCloseTimerRef.current = null
      }
      if (aimGraceTimerRef.current) {
        clearTimeout(aimGraceTimerRef.current)
        aimGraceTimerRef.current = null
      }
      if (autoscrollIntervalRef.current) {
        clearInterval(autoscrollIntervalRef.current)
        autoscrollIntervalRef.current = null
      }
      mousePositionsRef.current = []
      setKeyboardFocusDepth(0)
      setKeyboardFocusIndex(0)
      setIsKeyboardMode(false)
      setScrollStateByPanel({})
    }
  }, [isOpen])

  // Track mouse positions for diagonal forgiveness (mouse only)
  useEffect(() => {
    if (!isOpen) return

    const handlePointerMove = (e) => {
      // Only track mouse movements
      if (e.pointerType && e.pointerType !== 'mouse') return
      
      const now = Date.now()
      mousePositionsRef.current.push({ x: e.clientX, y: e.clientY, time: now })
      
      if (mousePositionsRef.current.length > MAX_MOUSE_POSITIONS) {
        mousePositionsRef.current.shift()
      }
      
      const cutoff = now - 500
      mousePositionsRef.current = mousePositionsRef.current.filter(pos => pos.time > cutoff)
    }

    document.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => document.removeEventListener('pointermove', handlePointerMove)
  }, [isOpen])

  // Click outside to close - use click event in bubble phase so it fires AFTER button clicks
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (e) => {
      const path = e.composedPath()
      const menuEl = resolvedMenuRef.current
      const startBtnEl = startButtonRef?.current
      
      // Check if click is inside any menu panel or menu item
      const isInsideMenu = path.some(node => {
        if (!node) return false
        if (node === menuEl) return true
        if (node.classList) {
          return node.classList.contains('start-menu-panel-flyout') ||
                 node.classList.contains('start-menu-panel-root') ||
                 node.classList.contains('start-menu-panel-drill') ||
                 node.classList.contains('start-menu') ||
                 node.classList.contains('start-menu-content') ||
                 node.classList.contains('start-menu-items') ||
                 node.classList.contains('start-menu-panel-items') ||
                 node.classList.contains('start-menu-item') ||
                 node.classList.contains('start-menu-header')
        }
        // Also check if it's a button inside a menu
        if (node.tagName === 'BUTTON') {
          const closestMenu = node.closest && (node.closest('.start-menu') || node.closest('.start-menu-panel-flyout'))
          if (closestMenu) return true
        }
        return false
      })
      
      if (isInsideMenu) return
      if (startBtnEl && path.includes(startBtnEl)) return
      
      onClose()
    }

    // Use click event in bubble phase (not capture) so button clicks execute first
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick, false)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClick, false)
    }
  }, [isOpen, onClose, resolvedMenuRef, startButtonRef])

  // Build menu items structure (defined early for use in other callbacks)
  const buildMenuItems = useCallback(() => {
    const mainApps = Object.values(APPS).filter(
      app => app.group === 'MAIN' && (!isMobile || app.id !== 'PAINT') && app.id !== 'COMMUNITY_RESOURCES' && app.id !== '@chubzxmeta'
    )

    return [
      ...mainApps.map(app => ({ type: 'app', app })),
      { type: 'separator' },
      { type: 'submenu', submenu: MENU_STRUCTURE.programs, id: 'programs' },
      ...(import.meta.env.DEV ? [
        { type: 'separator' },
        { type: 'app', app: { id: 'dev-panel', label: 'Dev Panel', icon: '🔧', open: { type: 'window', windowId: 'dev-panel' } } }
      ] : [])
    ]
  }, [isMobile])

  // Get items for a given depth
  const getItemsAtDepth = useCallback((depth, items = null) => {
    if (depth === 0) {
      return items || buildMenuItems()
    }
    
    let currentItems = buildMenuItems()
    for (let i = 0; i < depth; i++) {
      const pathIndex = activePath[i]
      if (pathIndex === undefined) return []
      
      const item = currentItems[pathIndex]
      if (!item || item.type !== 'submenu') return []
      
      currentItems = item.submenu.items.map((subItem, subIndex) => {
        if (subItem.type === 'submenu' || subItem.id) {
          return { type: 'submenu', submenu: subItem, id: subItem.id || `submenu-${subIndex}` }
        }
        return { type: 'app', app: subItem }
      })
    }
    
    return currentItems
  }, [activePath, buildMenuItems])

  // Get next valid index in direction (skip separators)
  const getNextValidIndex = useCallback((items, currentIndex, direction) => {
    if (items.length === 0) return currentIndex
    
    let nextIndex = currentIndex + direction
    const maxIndex = items.length - 1
    
    // Wrap around
    if (nextIndex < 0) nextIndex = maxIndex
    if (nextIndex > maxIndex) nextIndex = 0
    
    // Skip separators
    let attempts = 0
    while (items[nextIndex]?.type === 'separator' && attempts < items.length) {
      nextIndex += direction
      if (nextIndex < 0) nextIndex = maxIndex
      if (nextIndex > maxIndex) nextIndex = 0
      attempts++
    }
    
    return nextIndex
  }, [])

  // Keyboard handling: Full navigation support
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      // Track keyboard usage
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) {
        setIsKeyboardMode(true)
      }

      if (e.key === 'Escape') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onClose()
        } else {
          e.preventDefault()
          if (activePath.length > 0) {
            const newDepth = activePath.length - 1
            setActivePath(prev => prev.slice(0, -1))
            setSelectedIndexByDepth(prev => {
              const next = { ...prev }
              delete next[newDepth + 1]
              return next
            })
            setKeyboardFocusDepth(newDepth)
            // Keep focus index at the parent item
            if (newDepth >= 0) {
              setKeyboardFocusIndex(activePath[newDepth] ?? 0)
            }
          } else {
            onClose()
          }
        }
        return
      }

      // Arrow navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        
        const currentDepth = keyboardFocusDepth
        const currentIndex = keyboardFocusIndex
        const items = getItemsAtDepth(currentDepth)
        
        if (e.key === 'ArrowUp') {
          const nextIndex = getNextValidIndex(items, currentIndex, -1)
          setKeyboardFocusIndex(nextIndex)
          setSelectedIndexByDepth(prev => ({ ...prev, [currentDepth]: nextIndex }))
        } else if (e.key === 'ArrowDown') {
          const nextIndex = getNextValidIndex(items, currentIndex, 1)
          setKeyboardFocusIndex(nextIndex)
          setSelectedIndexByDepth(prev => ({ ...prev, [currentDepth]: nextIndex }))
        } else if (e.key === 'ArrowRight') {
          const item = items[currentIndex]
          if (item && item.type === 'submenu') {
            // Open submenu
            const newDepth = currentDepth + 1
            setActivePath(prev => {
              const newPath = [...prev]
              newPath[currentDepth] = currentIndex
              return newPath.slice(0, newDepth)
            })
            setKeyboardFocusDepth(newDepth)
            setKeyboardFocusIndex(0)
            setSelectedIndexByDepth(prev => ({ ...prev, [currentDepth]: currentIndex, [newDepth]: 0 }))
          }
        } else if (e.key === 'ArrowLeft') {
          if (currentDepth > 0) {
            // Close submenu and move to parent
            const newDepth = currentDepth - 1
            setActivePath(prev => prev.slice(0, newDepth))
            setKeyboardFocusDepth(newDepth)
            setSelectedIndexByDepth(prev => {
              const next = { ...prev }
              delete next[currentDepth]
              return next
            })
          }
        }
        return
      }

      // Enter key - works with keyboard focus or mouse selection
      if (e.key === 'Enter') {
        e.preventDefault()
        
        let depth, index
        
        if (isKeyboardMode) {
          // Use keyboard focus
          depth = keyboardFocusDepth
          index = keyboardFocusIndex
        } else {
          // Use mouse selection - find the deepest selected item
          const depths = Object.keys(selectedIndexByDepth).map(Number).sort((a, b) => b - a)
          if (depths.length > 0) {
            depth = depths[0]
            index = selectedIndexByDepth[depth]
          } else {
            // Fallback to root menu, first item
            depth = 0
            index = 0
          }
        }
        
        if (depth === undefined || index === undefined) return
        
        const items = getItemsAtDepth(depth)
        const item = items[index]
        
        if (!item) return
        
        if (item.type === 'submenu') {
          // Open submenu
          const newDepth = depth + 1
          setActivePath(prev => {
            const newPath = [...prev]
            newPath[depth] = index
            return newPath.slice(0, newDepth)
          })
          setKeyboardFocusDepth(newDepth)
          setKeyboardFocusIndex(0)
          setSelectedIndexByDepth(prev => ({ ...prev, [depth]: index, [newDepth]: 0 }))
        } else if (item.type === 'app') {
          // Run action
          if (handleAppClickRef.current) {
            handleAppClickRef.current(item.app)
          }
        }
        return
      }

    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activePath, onClose, keyboardFocusDepth, keyboardFocusIndex, getItemsAtDepth, getNextValidIndex])

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current)
      if (aimGraceTimerRef.current) clearTimeout(aimGraceTimerRef.current)
      if (autoscrollIntervalRef.current) clearInterval(autoscrollIntervalRef.current)
      if (deferredFocusRafRef.current) {
        cancelAnimationFrame(deferredFocusRafRef.current)
      }
    }
  }, [])

  // Check if mouse is heading toward submenu (diagonal forgiveness) - improved angle-based calculation
  const isMouseHeadingTowardSubmenu = useCallback((parentItemEl, submenuEl) => {
    if (!parentItemEl || !submenuEl || mousePositionsRef.current.length < 2) return false

    const submenuRect = submenuEl.getBoundingClientRect()
    const parentRect = parentItemEl.getBoundingClientRect()
    const recentPositions = mousePositionsRef.current.slice(-2)
    
    if (recentPositions.length < 2) return false
    
    const [prevPos, currPos] = recentPositions
    const timeDelta = currPos.time - prevPos.time
    
    // Ignore micro movements
    if (timeDelta < 10) return false
    
    const dx = currPos.x - prevPos.x
    const dy = currPos.y - prevPos.y
    
    // Must be moving right (toward submenu)
    if (dx <= POINTER_MOVE_THRESHOLD_PX) return false
    
    // Calculate angle of movement
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    // Calculate direction vector to submenu center from current position
    const submenuCenterX = submenuRect.left + submenuRect.width / 2
    const submenuCenterY = submenuRect.top + submenuRect.height / 2
    const toSubmenuDx = submenuCenterX - currPos.x
    const toSubmenuDy = submenuCenterY - currPos.y
    const toSubmenuAngle = Math.atan2(toSubmenuDy, toSubmenuDx) * (180 / Math.PI)
    
    // Check if movement angle is within 45 degrees of direction to submenu
    const angleDiff = Math.abs(angle - toSubmenuAngle)
    const normalizedAngleDiff = Math.min(angleDiff, 360 - angleDiff)
    
    if (normalizedAngleDiff > 45) return false
    
    // Project future position
    const velocity = Math.sqrt(dx * dx + dy * dy) / timeDelta
    const projectionTime = 150 // ms
    const projectedX = currPos.x + (dx / timeDelta) * projectionTime
    const projectedY = currPos.y + (dy / timeDelta) * projectionTime
    
    // Check if projected position intersects with submenu (with tolerance)
    const tolerance = 30
    return (
      projectedX >= submenuRect.left - tolerance &&
      projectedX <= submenuRect.right + tolerance &&
      projectedY >= submenuRect.top - tolerance &&
      projectedY <= submenuRect.bottom + tolerance
    )
  }, [])

  // Calculate flyout submenu position
  const calculateSubmenuPosition = useCallback((parentItemEl, submenuEl) => {
    if (!parentItemEl || !submenuEl) return { left: 0, top: 0 }

    const parentRect = parentItemEl.getBoundingClientRect()
    const submenuRect = submenuEl.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const taskbarHeight = 30

    // Position submenu directly adjacent to parent (1px overlap for authentic Win98 look)
    let left = parentRect.right - 1
    let top = parentRect.top

    if (left + submenuRect.width > viewportWidth) {
      // If opening to the right would overflow, open to the left instead
      left = parentRect.left - submenuRect.width + 1
    }

    const maxTop = viewportHeight - taskbarHeight - submenuRect.height - 2
    if (top > maxTop) {
      top = Math.max(2, maxTop)
    }
    if (top < 2) {
      top = 2
    }

    return { left, top }
  }, [])

  // Handle item hover (mouse only)
  const handleItemPointerEnter = useCallback((depth, index, itemKey, hasSubmenu, e) => {
    handlePointerInteraction(e)
    // Only apply hover behavior for mouse, not touch
    const isMouse = e.pointerType === 'mouse' || (!e.pointerType && pointerType === 'mouse')
    if (!isMouse) return

    // Cancel any pending close timers
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }

    setIsKeyboardMode(false)
    setSelectedIndexByDepth(prev => ({ ...prev, [depth]: index }))

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    if (hasSubmenu) {
      console.log('Hovering over submenu item, scheduling open:', { depth, index, itemKey })
      const parentItemEl = itemRefs.current[itemKey]
      const currentSubmenuKey = activePath.length > depth ? `${depth}-${activePath[depth]}` : null
      const currentSubmenuEl = currentSubmenuKey ? submenuRefs.current[currentSubmenuKey] : null

      if (currentSubmenuEl && isMouseHeadingTowardSubmenu(parentItemEl, currentSubmenuEl)) {
        setPendingOpen({ depth, index })
        aimGraceTimerRef.current = setTimeout(() => {
          setActivePath(prev => {
            const newPath = [...prev]
            newPath[depth] = index
            return newPath.slice(0, depth + 1)
          })
          setPendingOpen(null)
        }, MENU_AIM_GRACE_MS)
      } else {
        setPendingOpen({ depth, index })
        hoverTimerRef.current = setTimeout(() => {
          console.log('Hover timer fired, opening submenu:', { depth, index })
          setActivePath(prev => {
            const newPath = [...prev]
            newPath[depth] = index
            const finalPath = newPath.slice(0, depth + 1)
            console.log('Setting activePath to:', finalPath)
            return finalPath
          })
          setPendingOpen(null)
        }, MENU_SHOW_DELAY_MS)
      }
    } else {
      // Close deeper submenus when hovering a leaf item
      setActivePath(prev => prev.slice(0, depth + 1))
      setPendingOpen(null)
    }
  }, [pointerType, activePath, isMouseHeadingTowardSubmenu, handlePointerInteraction])

  // Handle item pointer leave (for close delay)
  const handleItemPointerLeave = useCallback((depth, index, hasSubmenu) => {
    // Only apply close delay for mouse, not touch
    if (pointerType !== 'mouse') return
    
    // Only schedule close if this item has an open submenu
    if (!hasSubmenu) return
    
    const isSubmenuOpen = activePath[depth] === index
    if (!isSubmenuOpen) return

    // Schedule close after delay
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
    }
    
    hoverCloseTimerRef.current = setTimeout(() => {
      // Only close if submenu is still open and pointer hasn't entered submenu
      if (activePath[depth] === index) {
        const newPath = activePath.slice(0, depth)
        setActivePath(newPath)
        setSelectedIndexByDepth(prev => {
          const next = { ...prev }
          delete next[depth]
          // Ensure parent menu item selection is preserved
          if (depth > 0 && newPath.length > 0) {
            const parentDepth = depth - 1
            const parentIndex = newPath[parentDepth]
            if (parentIndex !== undefined) {
              next[parentDepth] = parentIndex
            }
          }
          return next
        })
      }
      hoverCloseTimerRef.current = null
    }, MENU_CLOSE_DELAY_MS)
  }, [pointerType, activePath])

  // Handle submenu panel pointer enter (cancel close delay and preserve selection)
  const handleSubmenuPanelEnter = useCallback((depth) => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
    // Preserve the selection for this depth's parent menu item
    // When entering a submenu panel, ensure the parent item that opened it remains selected
    if (depth > 0 && activePath.length >= depth) {
      const parentDepth = depth - 1
      const parentIndex = activePath[parentDepth]
      if (parentIndex !== undefined) {
        setSelectedIndexByDepth(prev => ({
          ...prev,
          [parentDepth]: parentIndex
        }))
      }
    }
  }, [activePath])

  // Handle submenu panel pointer leave (schedule close delay)
  const handleSubmenuPanelLeave = useCallback((depth) => {
    // Only apply close delay for mouse, not touch
    if (pointerType !== 'mouse') return
    
    // Only schedule close if there's a submenu open at this depth or deeper
    if (activePath.length <= depth) return
    
    // Schedule close after delay
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
    }
    
    hoverCloseTimerRef.current = setTimeout(() => {
      // Only close if submenu is still open at this depth or deeper
      if (activePath.length > depth) {
        const newPath = activePath.slice(0, depth)
        setActivePath(newPath)
        setSelectedIndexByDepth(prev => {
          const next = { ...prev }
          // Remove selections for the closed depth and all deeper depths
          Object.keys(next).forEach(key => {
            const keyDepth = parseInt(key)
            if (keyDepth >= depth) {
              delete next[key]
            }
          })
          // Ensure parent menu item selection is preserved
          // If we're closing depth 2, preserve depth 1's selection (which should match activePath[1])
          if (depth > 0 && newPath.length > 0) {
            const parentDepth = depth - 1
            const parentIndex = newPath[parentDepth]
            if (parentIndex !== undefined) {
              next[parentDepth] = parentIndex
            }
          }
          return next
        })
      }
      hoverCloseTimerRef.current = null
    }, MENU_CLOSE_DELAY_MS)
  }, [pointerType, activePath])

  // Handle root menu panel pointer enter (check if hovering over submenu parent item)
  const handleRootMenuPanelEnter = useCallback((e) => {
    // Only apply for mouse, not touch
    if (pointerType !== 'mouse') return
    
    // If there's a submenu open at depth 1 (Programs submenu), check if we're hovering over Programs item
    if (activePath.length > 0 && activePath[0] !== undefined) {
      const programsItemIndex = activePath[0]
      // Check if the mouse is actually over the Programs item
      const programsItemKey = `root-${programsItemIndex}`
      const programsItemEl = itemRefs.current[programsItemKey]
      
      if (programsItemEl) {
        const itemRect = programsItemEl.getBoundingClientRect()
        const mouseX = e.clientX
        const mouseY = e.clientY
        
        // Check if mouse is over the Programs item
        const isOverProgramsItem = (
          mouseX >= itemRect.left &&
          mouseX <= itemRect.right &&
          mouseY >= itemRect.top &&
          mouseY <= itemRect.bottom
        )
        
        if (!isOverProgramsItem) {
          // Mouse is in root menu but NOT over Programs item - start close timer
          if (hoverCloseTimerRef.current) {
            clearTimeout(hoverCloseTimerRef.current)
          }
          
          hoverCloseTimerRef.current = setTimeout(() => {
            // Close Programs submenu if still open (this will also close all nested submenus)
            if (activePath.length > 0 && activePath[0] === programsItemIndex) {
              setActivePath([])
              setSelectedIndexByDepth({}) // Clear all selections when closing root submenu
            }
            hoverCloseTimerRef.current = null
          }, MENU_CLOSE_DELAY_MS)
        } else {
          // Mouse is over Programs item - cancel any close timer
          if (hoverCloseTimerRef.current) {
            clearTimeout(hoverCloseTimerRef.current)
            hoverCloseTimerRef.current = null
          }
        }
      }
    }
  }, [pointerType, activePath])

  // Handle root menu pointer leave (schedule close for all submenus when mouse leaves Start Menu)
  // Note: This will be cancelled if mouse enters a submenu panel
  const handleRootMenuLeave = useCallback(() => {
    // Only apply for mouse, not touch
    if (pointerType !== 'mouse') return
    
    // Only schedule close if there are open submenus
    if (activePath.length === 0) return
    
    // Schedule close after delay (will be cancelled if mouse enters submenu)
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
    }
    
    hoverCloseTimerRef.current = setTimeout(() => {
      // Only close if submenus are still open
      if (activePath.length > 0) {
        setActivePath([])
        setSelectedIndexByDepth({})
      }
      hoverCloseTimerRef.current = null
    }, MENU_CLOSE_DELAY_MS)
  }, [pointerType, activePath])

  // Handle overflow scroll arrow hover
  const handleScrollArrowEnter = useCallback((panelKey, direction, depth) => {
    if (autoscrollIntervalRef.current) {
      clearInterval(autoscrollIntervalRef.current)
    }
    
    autoscrollDirectionRef.current = direction
    autoscrollTargetRef.current = panelKey
    
    const panelEl = depth === 0 ? rootMenuRef.current : submenuRefs.current[panelKey]
    if (!panelEl) return
    
    const itemsContainer = panelEl.querySelector('.start-menu-items, .start-menu-panel-items')
    if (!itemsContainer) return
    
    autoscrollIntervalRef.current = setInterval(() => {
      if (itemsContainer) {
        const scrollAmount = direction === 'up' ? -AUTOSCROLL_STEP_PX : AUTOSCROLL_STEP_PX
        itemsContainer.scrollTop += scrollAmount
        
        // Update scroll state
        setScrollStateByPanel(prev => ({
          ...prev,
          [panelKey]: {
            scrollTop: itemsContainer.scrollTop,
            scrollHeight: itemsContainer.scrollHeight,
            clientHeight: itemsContainer.clientHeight
          }
        }))
      }
    }, AUTOSCROLL_INTERVAL_MS)
  }, [])

  // Handle overflow scroll arrow leave
  const handleScrollArrowLeave = useCallback(() => {
    if (autoscrollIntervalRef.current) {
      clearInterval(autoscrollIntervalRef.current)
      autoscrollIntervalRef.current = null
    }
    autoscrollDirectionRef.current = null
    autoscrollTargetRef.current = null
  }, [])

  // Calculate scroll state for a panel
  const calculateScrollState = useCallback((panelKey, depth) => {
    const panelEl = depth === 0 ? rootMenuRef.current : submenuRefs.current[panelKey]
    if (!panelEl) return null
    
    const itemsContainer = panelEl.querySelector('.start-menu-items, .start-menu-panel-items')
    if (!itemsContainer) return null
    
    const scrollTop = itemsContainer.scrollTop
    const scrollHeight = itemsContainer.scrollHeight
    const clientHeight = itemsContainer.clientHeight
    
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      canScrollUp: scrollTop > 0,
      canScrollDown: scrollTop < scrollHeight - clientHeight - 1
    }
  }, [])

  // Update scroll state when panels render
  useEffect(() => {
    if (!isOpen) return
    
    const updateScrollStates = () => {
      const newStates = {}
      
      // Root menu
      const rootState = calculateScrollState('root', 0)
      if (rootState) {
        newStates['root'] = rootState
      }
      
      // Submenus
      Object.keys(submenuRefs.current).forEach(panelKey => {
        const parts = panelKey.split('-')
        const depth = parts.length - 1
        const state = calculateScrollState(panelKey, depth)
        if (state) {
          newStates[panelKey] = state
        }
      })
      
      setScrollStateByPanel(newStates)
    }
    
    // Update after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(updateScrollStates, 50)
    
    // Also update on scroll
    const handleScroll = () => {
      updateScrollStates()
    }
    
    document.addEventListener('scroll', handleScroll, true)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, activePath, calculateScrollState])

  // Store handleAppClick in ref for keyboard handler
  const handleAppClickRef = useRef(null)

  // Handle app click (defined first so handleItemClick can reference it)
  const handleAppClick = useCallback((app) => {
    console.log('handleAppClick called with:', app)
    if (!app || !app.open) {
      console.warn('handleAppClick: invalid app object', app)
      return
    }
    
    playSound('menuCommand')
    
    switch (app.open?.type) {
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
        const scrollToWindowId = {
          'scroll-to-readme': 'window-readme-txt',
          'scroll-to-mint': 'window-mint-info-exe',
          'scroll-to-gallery': 'window-gallery',
          'scroll-to-faq': 'window-faq',
          'scroll-to-marketplace': 'window-marketplace',
          'scroll-to-roadmap': 'roadmap-window',
        }
        
        const windowId = app.open.type === 'window' 
          ? app.open.windowId 
          : scrollToWindowId[app.open.target]

        if (!windowId) {
          onClose()
          return
        }

        const allWindows = getAllWindows()
        const windowExists = allWindows.some(w => w.id === windowId)
        
        if (windowExists) {
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
          console.log('Calling onOpenApp with windowId:', windowId)
          onOpenApp(windowId)

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

                restoreWindow(windowId)
                bringToFront(windowId)
                deferredFocusRafRef.current = null
              } catch (e) {
                console.debug('Error restoring/bringing newly opened window to front:', windowId, e)
                deferredFocusRafRef.current = null
              }
            })
          }

          if (deferredFocusRafRef.current) {
            cancelAnimationFrame(deferredFocusRafRef.current)
            deferredFocusRafRef.current = null
          }
          focusWhenRegistered(10)
        }
        break
      }

      default:
        console.warn('Unknown app.open.type:', app.open?.type)
        onClose()
        return
    }
    
    // Only close menu if we didn't already return early
    // For window/scroll types, we close after handling
    onClose()
  }, [onClose, onOpenPaint, onOpenWojakGenerator, onOpenApp, getAllWindows, isWindowMinimized, restoreWindow, bringToFront])

  // Update ref when handleAppClick changes
  useEffect(() => {
    handleAppClickRef.current = handleAppClick
  }, [handleAppClick])

  // Handle item click (defined after handleAppClick)
  const handleItemClick = useCallback((depth, index, item, hasSubmenu) => {
    // Clear all timers on click
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = null
    }
    if (aimGraceTimerRef.current) {
      clearTimeout(aimGraceTimerRef.current)
      aimGraceTimerRef.current = null
    }
    
    if (hasSubmenu) {
      // Open submenu immediately on click
      setActivePath(prev => {
        const newPath = [...prev]
        newPath[depth] = index
        return newPath.slice(0, depth + 1)
      })
      setSelectedIndexByDepth(prev => ({ ...prev, [depth]: index }))
      setPendingOpen(null)
    } else {
      // Run action for leaf item - ensure item is an app object
      console.log('handleItemClick: leaf item clicked', { item, depth, index, hasSubmenu })
      if (item && item.open) {
        // Call handleAppClick immediately
        console.log('Calling handleAppClick with item:', item)
        handleAppClick(item)
      } else {
        console.warn('handleItemClick: item is not a valid app object', item, { depth, index, hasSubmenu })
      }
    }
  }, [handleAppClick])

  // Update submenu positions on layout changes
  useLayoutEffect(() => {
    if (!isOpen || useDrillIn) {
      submenuPositionsRef.current = {}
      return
    }

    // Recalculate positions for all open submenus
    const recalculatePositions = () => {
      Object.keys(submenuRefs.current).forEach(panelKey => {
        const submenuEl = submenuRefs.current[panelKey]
        if (!submenuEl) return

        // Parse depth from panelKey (format: "root-0-1" for depth 2, index path [0,1])
        const parts = panelKey.split('-')
        if (parts.length < 2) return
        
        const depth = parts.length - 1
        if (depth === 0) return // Root menu doesn't need positioning

        // Find parent item: for panelKey "root-0", parent is at depth 0, index 0
        let parentKey = 'root'
        let parentIndex = 0
        
        if (depth === 1) {
          parentIndex = parseInt(parts[1]) || 0
        } else {
          // For deeper submenus, parent is one level up
          const parentParts = parts.slice(0, -1)
          parentKey = parentParts.join('-')
          parentIndex = parseInt(parts[parts.length - 1]) || 0
        }

        const parentItemKey = `${parentKey}-${parentIndex}`
        const parentItemEl = itemRefs.current[parentItemKey]

        if (parentItemEl) {
          const pos = calculateSubmenuPosition(parentItemEl, submenuEl)
          submenuPositionsRef.current[panelKey] = pos
          // Mark this submenu as having a calculated position
          setSubmenuPositionsReady(prev => ({ ...prev, [panelKey]: true }))
        }
      })
    }

    // Use double RAF to ensure DOM is ready and measured
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recalculatePositions()
      })
    })
  }, [isOpen, activePath, useDrillIn, calculateSubmenuPosition])

  // Render menu panel
  const renderMenuPanel = useCallback((
    items,
    depth,
    panelKey,
    title,
    onBack
  ) => {
    const selectedIndex = selectedIndexByDepth[depth] ?? null
    const shouldShow = depth === 0 || activePath.length >= depth

    if (!shouldShow && depth > 0) return null

    const position = depth > 0 && !useDrillIn ? submenuPositionsRef.current[panelKey] : null
    const scrollState = scrollStateByPanel[panelKey] || calculateScrollState(panelKey, depth)
    const showScrollUp = scrollState?.canScrollUp && !useDrillIn
    const showScrollDown = scrollState?.canScrollDown && !useDrillIn

    // Always render submenu - position will be calculated and updated
    // Use a default position if not calculated yet to avoid top-left flash
    const defaultPosition = depth > 0 && !useDrillIn && !position ? { left: 200, top: 100 } : position

    return (
      <div
        key={panelKey}
        ref={el => { 
          if (el && depth > 0) {
            submenuRefs.current[panelKey] = el
          }
        }}
        className={depth === 0 ? 'start-menu-panel-root' : useDrillIn ? 'start-menu-panel-drill' : 'start-menu-panel-flyout'}
        style={defaultPosition ? { 
          position: 'fixed', 
          left: `${defaultPosition.left}px`, 
          top: `${defaultPosition.top}px`, 
          zIndex: 10000 + depth
        } : undefined}
        onPointerEnter={depth > 0 ? () => handleSubmenuPanelEnter(depth) : depth === 0 ? handleRootMenuPanelEnter : undefined}
        onPointerLeave={depth > 0 ? () => handleSubmenuPanelLeave(depth) : undefined}
      >
        {depth > 0 && useDrillIn && (
          <div className="start-menu-drill-header">
            <button
              className="start-menu-drill-back"
              onClick={onBack}
              onPointerDown={(e) => e.stopPropagation()}
            >
              ← Back
            </button>
            <span className="start-menu-drill-title">{title}</span>
          </div>
        )}

        {showScrollUp && (
          <div
            className="start-menu-scroll-arrow start-menu-scroll-arrow-up"
            onPointerEnter={() => handleScrollArrowEnter(panelKey, 'up', depth)}
            onPointerLeave={handleScrollArrowLeave}
          >
            ▲
          </div>
        )}

        <div className={depth === 0 ? 'start-menu-items' : 'start-menu-panel-items'}>
          {items.map((item, index) => {
            if (item.type === 'separator') {
              return <hr key={`sep-${index}`} className="start-menu-separator" role="separator" />
            }

            if (item.type === 'app') {
              const app = item.app
              const itemKey = `${panelKey}-${index}`
              const isSelected = selectedIndex === index

              return (
                <button
                  key={itemKey}
                  ref={el => { if (el) itemRefs.current[itemKey] = el }}
                  className={`start-menu-item ${isSelected ? 'selected' : ''} ${isKeyboardMode && keyboardFocusDepth === depth && keyboardFocusIndex === index ? 'keyboard-focus' : ''}`}
                  onPointerEnter={(e) => handleItemPointerEnter(depth, index, itemKey, false, e)}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('App button clicked:', app.label, app, { depth, index })
                    handleItemClick(depth, index, app, false)
                  }}
                  onMouseDown={(e) => {
                    // Also handle mousedown as backup
                    if (e.button === 0) {
                      e.stopPropagation()
                      console.log('App button mousedown:', app.label)
                      handleItemClick(depth, index, app, false)
                    }
                  }}
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
              )
            }

            if (item.type === 'submenu') {
              const submenu = item.submenu
              const itemKey = `${panelKey}-${index}`
              const isSelected = selectedIndex === index
              const isSubmenuOpen = activePath[depth] === index

              return (
                <Fragment key={itemKey}>
                  <button
                    ref={el => { if (el) itemRefs.current[itemKey] = el }}
                    className={`start-menu-item start-menu-folder ${isSelected ? 'selected' : ''} ${isKeyboardMode && keyboardFocusDepth === depth && keyboardFocusIndex === index ? 'keyboard-focus' : ''}`}
                    onPointerEnter={(e) => handleItemPointerEnter(depth, index, itemKey, true, e)}
                    onPointerLeave={() => handleItemPointerLeave(depth, index, true)}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Submenu button clicked:', submenu.label, { depth, index, submenu })
                      handleItemClick(depth, index, submenu, true)
                    }}
                  onMouseDown={(e) => {
                    // Also handle mousedown as backup
                    if (e.button === 0) {
                      e.stopPropagation()
                      console.log('Submenu button mousedown:', submenu.label)
                      handleItemClick(depth, index, submenu, true)
                    }
                  }}
                    role="menuitem"
                    tabIndex={0}
                  >
                    <AppIcon
                      icon={submenu.icon}
                      className="start-menu-item-icon"
                      size={16}
                    />
                    <span className="start-menu-item-text">{submenu.label}</span>
                    <span className="start-menu-arrow">▶</span>
                  </button>
                  
                  {isSubmenuOpen && submenu.items && (
                    renderMenuPanel(
                      submenu.items.map((subItem, subIndex) => {
                        // Check if this is a nested submenu (like Games/Links within Programs)
                        // Only check type, not id, because apps also have ids
                        if (subItem.type === 'submenu') {
                          return { type: 'submenu', submenu: subItem, id: subItem.id || `submenu-${subIndex}` }
                        }
                        // Otherwise it's an app
                        return { type: 'app', app: subItem }
                      }),
                      depth + 1,
                      `${panelKey}-${index}`,
                      submenu.label,
                      () => {
                        setActivePath(prev => prev.slice(0, depth))
                        setSelectedIndexByDepth(prev => {
                          const next = { ...prev }
                          delete next[depth]
                          return next
                        })
                      }
                    )
                  )}
                </Fragment>
              )
            }

            return null
          })}
        </div>

        {showScrollDown && (
          <div
            className="start-menu-scroll-arrow start-menu-scroll-arrow-down"
            onPointerEnter={() => handleScrollArrowEnter(panelKey, 'down', depth)}
            onPointerLeave={handleScrollArrowLeave}
          >
            ▼
          </div>
        )}
      </div>
    )
  }, [activePath, selectedIndexByDepth, useDrillIn, handleItemPointerEnter, handleItemClick, handleItemPointerLeave, handleSubmenuPanelEnter, handleSubmenuPanelLeave, handleRootMenuPanelEnter, handleScrollArrowEnter, handleScrollArrowLeave, isKeyboardMode, keyboardFocusDepth, keyboardFocusIndex, scrollStateByPanel, calculateScrollState])

  if (!isOpen) return null

  const rootItems = buildMenuItems()

  return (
    <div
      className="start-menu"
      ref={resolvedMenuRef}
      role="menu"
      aria-label="Start menu"
      onPointerDown={(e) => {
        // Only stop propagation if not clicking on a menu item button
        if (!e.target.closest('.start-menu-item')) {
          e.stopPropagation()
        }
      }}
      onClick={(e) => {
        // Only stop propagation if not clicking on a menu item button
        if (!e.target.closest('.start-menu-item')) {
          e.stopPropagation()
        }
      }}
      onPointerLeave={handleRootMenuLeave}
    >
      <div className="start-menu-header">
        <span className="start-menu-title">Wojak Farmers Plot</span>
      </div>
      <div ref={rootMenuRef} className="start-menu-content" tabIndex={-1}>
        {renderMenuPanel(rootItems, 0, 'root')}
      </div>
    </div>
  )
}
