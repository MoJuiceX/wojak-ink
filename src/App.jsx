import { useState, useEffect, Suspense, lazy, useRef, useCallback } from 'react'
import { 
  loadDesktopImages, 
  saveDesktopImages, 
  loadRecycleBin, 
  saveRecycleBin,
  isLocalStorageAvailable,
  getStorageUsage,
  exportGallery as exportGalleryUtil,
  importGallery as importGalleryUtil
} from './utils/desktopStorage'
import { enforceDesktopLimit, enforceRecycleBinLimit, isDuplicateImage } from './utils/desktopUtils'
import { useToast } from './contexts/ToastContext'
import { Routes, Route } from 'react-router-dom'
import ReadmeWindow from './components/windows/ReadmeWindow'
import MintInfoWindow from './components/windows/MintInfoWindow'
import GalleryWindow from './components/windows/GalleryWindow'
import FaqWindow from './components/windows/FaqWindow'
import TangGangWindow from './components/windows/TangGangWindow'
import SideStack from './components/SideStack'
import NotifyPopup from './components/windows/NotifyPopup'
import MarketplaceWindow from './components/windows/MarketplaceWindow'
import WojakGenerator from './components/windows/WojakGenerator'
import PaintWindow from './components/windows/PaintWindow'
import PinballWindow from './components/windows/PinballWindow'
import SolitaireWindow from './components/windows/SolitaireWindow'
import MinesweeperWindow from './components/windows/MinesweeperWindow'
import SkiFreeWindow from './components/windows/SkiFreeWindow'
import DesktopIcons from './components/DesktopIcons'
import DesktopImageIcons from './components/DesktopImageIcons'
import RecycleBinWindow from './components/windows/RecycleBinWindow'
import Taskbar from './components/Taskbar'
import BackgroundMusic from './components/BackgroundMusic'
import LoadingSpinner from './components/ui/LoadingSpinner'
import OrangeToyLayer from './components/OrangeToyLayer'
import TryAgainWindowWrapper from './components/windows/TryAgainWindowWrapper'
import EasterEggCoordinator from './components/EasterEggCoordinator'
import StartupSequence from './components/StartupSequence'
import OrangeRain from './components/effects/OrangeRain'
import Clippy from './components/effects/Clippy'
import { checkKonamiCode, trackClockClick, checkSecretWord } from './utils/easterEggs'
import { preloadSounds, playSound } from './utils/soundManager'
import SelectionBox from './components/desktop/SelectionBox'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { viewImage } from './utils/imageUtils'
import { positionTooltip } from './utils/tooltipPositioner'
import SEOHead from './components/SEOHead'

// iOS detection utility
const isIOS = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Lazy load non-critical routes
const AdminPanel = lazy(() => import('./components/windows/AdminPanel'))
const QAPage = lazy(() => import('./components/dev/QAPage'))
import { MarketplaceProvider } from './contexts/MarketplaceContext'
import { WindowProvider } from './contexts/WindowContext'
import { ToastProvider } from './contexts/ToastContext'
import { KeyboardPriorityProvider } from './contexts/KeyboardPriorityContext'
import { OrangeToyProvider } from './contexts/OrangeToyContext'
import { ScreensaverProvider, useScreensaver } from './contexts/ScreensaverContext'
import { useWindowStacking } from './hooks/useWindowStacking'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import Screensaver from './components/Screensaver'
import { useWindow } from './contexts/WindowContext'
import { useContextMenu } from './hooks/useContextMenu'
import ContextMenu from './components/ui/ContextMenu'
import PropertiesWindow from './components/windows/PropertiesWindow'
import DisplayPropertiesWindow from './components/windows/DisplayPropertiesWindow'
import ThemeQAWindow from './components/windows/ThemeQAWindow'

// Wallpaper definitions - exported for use in DisplayPropertiesWindow
export const WALLPAPERS = [
  { id: 'jungle', name: 'Jungle', url: '/wallpapers/jungle.png', color: null },
  { id: 'chia', name: 'Chia', url: '/wallpapers/chia.png', color: null },
  { id: 'orange-waves', name: 'Orange Waves', url: '/wallpapers/orange-waves.png', color: null },
  { id: 'orange-grove', name: 'Orange Grove', url: '/wallpapers/orangeGrove.png', color: null },
  { id: 'tanggang-life', name: 'Tang Gang Life', url: '/wallpapers/tanggang.life.png', color: null },
  { id: 'windows-98', name: 'Windows 98', url: '/wallpapers/windows-98.png', color: null },
  { id: 'windows-98bg', name: 'Windows 98 Background', url: '/wallpapers/windows-98bg.jpg', color: null },
  { id: 'windows-orange', name: 'Windows Orange', url: '/wallpapers/windows-orange.png', color: null },
  { id: 'solid-teal', name: 'Teal (Classic)', url: null, color: '#008080' },
  { id: 'solid-orange', name: 'Orange', url: null, color: '#ff6600' },
  { id: 'solid-black', name: 'Black', url: null, color: '#000000' },
  { id: 'solid-navy', name: 'Navy', url: null, color: '#000080' },
]

// Global scroll lock - prevent all page scrolling
function useGlobalScrollLock() {
  useEffect(() => {
    // Ensure body overflow is always hidden
    const ensureBodyLock = () => {
      if (document.body.style.overflow !== 'hidden') {
        document.body.style.overflow = 'hidden'
      }
    }
    
    // Set initially
    ensureBodyLock()
    
    // Watch for any changes to body overflow
    const observer = new MutationObserver(ensureBodyLock)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style']
    })
    
    // Prevent wheel scrolling on document (except in scroll-allowed elements)
    const handleWheel = (e) => {
      // Check if the event target or any parent has scroll-allowed class
      let element = e.target
      let isScrollAllowed = false
      
      while (element && element !== document.body) {
        if (element.classList && element.classList.contains('scroll-allowed')) {
          isScrollAllowed = true
          break
        }
        element = element.parentElement
      }
      
      // Only prevent default if not in a scroll-allowed element
      if (!isScrollAllowed) {
        e.preventDefault()
      }
    }
    
    // Prevent touch scrolling on document (except in scroll-allowed elements)
    // Use passive: true for iOS to avoid performance issues
    const touchMoveOptions = isIOS() ? { passive: true } : { passive: false }
    const handleTouchMove = (e) => {
      let element = e.target
      let isScrollAllowed = false
      
      while (element && element !== document.body) {
        if (element.classList && element.classList.contains('scroll-allowed')) {
          isScrollAllowed = true
          break
        }
        element = element.parentElement
      }
      
      if (!isScrollAllowed) {
        e.preventDefault()
      }
    }
    
    // Prevent keyboard scrolling (arrow keys, space, page up/down)
    const handleKeyDown = (e) => {
      const scrollKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Space', 'PageUp', 'PageDown', 'Home', 'End'
      ]
      
      if (scrollKeys.includes(e.key)) {
        // Check if focus is in a scroll-allowed element
        const activeElement = document.activeElement
        let isScrollAllowed = false
        
        if (activeElement) {
          let element = activeElement
          while (element && element !== document.body) {
            if (element.classList && element.classList.contains('scroll-allowed')) {
              isScrollAllowed = true
              break
            }
            element = element.parentElement
          }
        }
        
        if (!isScrollAllowed) {
          e.preventDefault()
        }
      }
    }
    
    // Attach listeners with passive: false to allow preventDefault
    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, touchMoveOptions)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      observer.disconnect()
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('keydown', handleKeyDown)
      // Clean up iOS overscroll behavior
      if (isIOS()) {
        document.documentElement.style.overscrollBehavior = ''
        document.body.style.overscrollBehavior = ''
      }
    }
  }, [])
}

function AppContent() {
  const { isTangifying, isInputFocused } = useScreensaver()
  const { activeWindowId, getAllWindows } = useWindow()
  const [isStartupComplete, setIsStartupComplete] = useState(false)
  const [showOrangeRain, setShowOrangeRain] = useState(false)
  const [showClippy, setShowClippy] = useState(false)
  const [secretWallpaper, setSecretWallpaper] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [desktopImages, setDesktopImages] = useState([])
  const [recycleBin, setRecycleBin] = useState([])
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false)
  const [lastAction, setLastAction] = useState(null) // { type: 'delete', item: {...}, timestamp: Date.now() }
  const [selectedIconIds, setSelectedIconIds] = useState([])
  const [isLoadingGallery, setIsLoadingGallery] = useState(true)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [propertiesIcon, setPropertiesIcon] = useState(null)
  
  // Initialize theme and accent on app load
  useEffect(() => {
    try {
      const theme = localStorage.getItem('theme') || 'classic'
      const accent = localStorage.getItem('accent') || 'default'
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.setAttribute('data-accent', accent)
      
      // #region agent log
      // Instrumentation: Log theme initialization (DEV only)
      if (import.meta.env.DEV) {
        const htmlEl = document.documentElement
        const actualTheme = htmlEl.getAttribute('data-theme')
        const actualAccent = htmlEl.getAttribute('data-accent')
        const taskbarBtnTextToken = getComputedStyle(htmlEl).getPropertyValue('--taskbar-btn-text')
        fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:useEffect',message:'Theme initialization',data:{storedTheme:theme,storedAccent:accent,actualTheme,actualAccent,taskbarBtnTextToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      }
      // #endregion
    } catch (e) {
      // localStorage not available, use defaults
      document.documentElement.setAttribute('data-theme', 'classic')
      document.documentElement.setAttribute('data-accent', 'default')
      
      // #region agent log
      if (import.meta.env.DEV) {
        fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:useEffect',message:'Theme initialization failed, using defaults',data:{error:e.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      }
      // #endregion
    }
    
    // Listen for theme changes
    const handleThemeChange = (e) => {
      document.documentElement.setAttribute('data-theme', e.detail.theme)
      
      // #region agent log
      // Instrumentation: Log theme change and check token resolution (including green scheme)
      const htmlEl = document.documentElement
      const actualTheme = htmlEl.getAttribute('data-theme')
      const taskbarBtnTextToken = getComputedStyle(htmlEl).getPropertyValue('--taskbar-btn-text')
      const taskbarBtnFaceToken = getComputedStyle(htmlEl).getPropertyValue('--taskbar-btn-face')
      const taskbarBgToken = getComputedStyle(htmlEl).getPropertyValue('--taskbar-bg')
      const windowFaceToken = getComputedStyle(htmlEl).getPropertyValue('--window-face')
      const btnFaceToken = getComputedStyle(htmlEl).getPropertyValue('--btn-face')
      
      // Check a taskbar button if it exists
      const firstButton = document.querySelector('.taskbar-window-button')
      const firstButtonText = document.querySelector('.taskbar-window-button-text')
      const taskbar = document.querySelector('.taskbar')
      const buttonComputed = firstButton ? getComputedStyle(firstButton) : null
      const textComputed = firstButtonText ? getComputedStyle(firstButtonText) : null
      const taskbarComputed = taskbar ? getComputedStyle(taskbar) : null
      
      if (import.meta.env.DEV) {
        fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleThemeChange',message:'Theme changed - checking green scheme application',data:{newTheme:e.detail.theme,actualTheme,taskbarBtnTextToken,taskbarBtnFaceToken,taskbarBgToken,windowFaceToken,btnFaceToken,buttonColor:buttonComputed?.color,textColor:textComputed?.color,buttonBg:buttonComputed?.backgroundColor,taskbarBg:taskbarComputed?.backgroundColor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'GREEN_SCHEME'})}).catch(()=>{});
      }
      // #endregion
      
      // Dev helper: log theme changes
      if (import.meta.env.DEV) {
        console.log(`[Theme] Changed to: ${e.detail.theme}`, {
          currentAttribute: document.documentElement.getAttribute('data-theme'),
          computedStyle: getComputedStyle(document.documentElement).getPropertyValue('--surface-1')
        })
      }
    }
    
    // Listen for accent changes
    const handleAccentChange = (e) => {
      document.documentElement.setAttribute('data-accent', e.detail.accent)
    }
    
    window.addEventListener('themeChanged', handleThemeChange)
    window.addEventListener('accentChanged', handleAccentChange)
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
      window.removeEventListener('accentChanged', handleAccentChange)
    }
  }, [])
  
  // Offline detection state
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine
    }
    return true
  })

  const [wallpaper, setWallpaper] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('wallpaper') || 'jungle'
      }
    } catch (e) {
      // localStorage not available
    }
    return 'jungle'
  })
  const [isDisplayPropertiesOpen, setIsDisplayPropertiesOpen] = useState(false)
  const { showToast } = useToast()
  
  // Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast('Back online', 'success', 2000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      showToast('You are offline', 'warning', 3000)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showToast])

  // Selection handlers
  const selectIcon = (iconId, addToSelection = false) => {
    if (addToSelection) {
      setSelectedIconIds(prev =>
        prev.includes(iconId)
          ? prev.filter(id => id !== iconId)
          : [...prev, iconId]
      )
    } else {
      setSelectedIconIds([iconId])
    }
  }

  const deselectAll = () => {
    setSelectedIconIds([])
  }
  const [openWindows, setOpenWindows] = useState({
    'window-readme-txt': false,
    'window-mint-info-exe': false,
    'window-gallery': false,
    'window-faq': false,
    'window-marketplace': false,
    'tanggang': false,
    'wojak-generator': false,
    'paint': false,
    'theme-qa-window': false,
  })

  // Check if modal/dialog is open
  const isModalOpen = notifyOpen // Add other modal states here as needed
  
  // Screensaver should only be disabled when there are actively focused windows
  // When desktop is focused (activeWindowId === null), screensaver can activate
  // But if ANY window is open and focused, disable screensaver
  const hasActiveWindows = activeWindowId !== null

  const { setInputFocused } = useScreensaver()
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu()
  const desktopRef = useRef(null)

  // Desktop context menu handler
  const handleDesktopContextMenu = (e) => {
    // Only if clicking on desktop itself, not on icons, windows, or other elements
    const target = e.target
    
    // Check if we clicked on desktop background or bg-fixed element
    const isDesktopBackground = 
      target.classList.contains('desktop') || 
      target.classList.contains('bg-fixed') ||
      (target.tagName === 'MAIN' && target.id === 'main-content')
    
    if (isDesktopBackground) {
      // Double-check: ensure we're not clicking on child elements (icons, windows, etc.)
      // Windows have z-index, icons are positioned, so if we hit desktop or bg-fixed, it's safe
      const clickedElement = document.elementFromPoint(e.clientX, e.clientY)
      const isActuallyDesktop = 
        clickedElement &&
        (clickedElement.classList.contains('desktop') ||
         clickedElement.classList.contains('bg-fixed') ||
         clickedElement.id === 'main-content') &&
        !clickedElement.closest('.window') &&
        !clickedElement.closest('.desktop-icons') &&
        !clickedElement.closest('.desktop-image-icons') &&
        !clickedElement.closest('.taskbar')
      
      if (isActuallyDesktop) {
        showContextMenu(e, [
          { 
            icon: '🔄', 
            label: 'Refresh', 
            onClick: () => window.location.reload(), 
            shortcut: 'F5' 
          },
          { separator: true },
          {
            icon: '📐',
            label: 'Arrange Icons',
            onClick: () => {
              // TODO: Implement arrange icons
              console.log('Arrange icons')
            },
            disabled: true
          },
          { separator: true },
          { 
            icon: '📁', 
            label: 'New Folder', 
            onClick: () => {
              // TODO: Implement new folder
              console.log('New folder')
            }, 
            disabled: true 
          },
          { separator: true },
          { 
            icon: '⚙️', 
            label: 'Properties', 
            onClick: () => {
              setIsDisplayPropertiesOpen(true)
            }
          },
        ])
      }
    }
  }

  // Track input focus
  useEffect(() => {
    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        setInputFocused(true)
      }
    }

    const handleFocusOut = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Check if focus moved to another input/textarea
        setTimeout(() => {
          const activeElement = document.activeElement
          if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
            setInputFocused(false)
          }
        }, 0)
      }
    }

    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
    }
  }, [setInputFocused])

  // Global scroll lock - prevent all page scrolling
  useGlobalScrollLock()
  
  // Use the extracted window stacking hook
  useWindowStacking()

  // Global error logging for uncaught errors and unhandled promise rejections (DEV only)
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const handleWindowError = (event) => {
      // eslint-disable-next-line no-console
      console.error('[window.onerror]', event.message, event.error || event)
    }

    const handleUnhandledRejection = (event) => {
      // eslint-disable-next-line no-console
      console.error('[unhandledrejection]', event.reason || event)
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Listen for paint window open event
  useEffect(() => {
    const handleOpenPaint = () => {
      setOpenWindows(prev => ({
        ...prev,
        'paint': true,
      }))
    }
    window.addEventListener('openPaintWindow', handleOpenPaint)
    return () => {
      window.removeEventListener('openPaintWindow', handleOpenPaint)
    }
  }, [])

  // Load desktop images and recycle bin from localStorage on mount
  useEffect(() => {
    // Check localStorage availability
    if (!isLocalStorageAvailable()) {
      setStorageAvailable(false)
      showToast('⚠️ Storage unavailable. Images will not persist after refresh.', 'warning', 5000)
      setIsLoadingGallery(false)
      return
    }
    
    setIsLoadingGallery(true)
    
    // Use setTimeout to prevent blocking UI
    setTimeout(() => {
      try {
        const loaded = loadDesktopImages()
        const loadedBin = loadRecycleBin()
        setDesktopImages(loaded)
        setRecycleBin(loadedBin)
      } catch (error) {
        console.error('Failed to load gallery:', error)
        showToast('⚠️ Failed to load gallery', 'error', 3000)
      } finally {
        setIsLoadingGallery(false)
      }
    }, 0)
  }, [showToast])

  // Ensure README.TXT window is open when the app loads
  // We intentionally avoid relying on localStorage here so that
  // the README is always visible, even in browsers/environments
  // where storage access is blocked or throws.
  useEffect(() => {
    setOpenWindows(prev => ({
      ...prev,
      'window-readme-txt': true,
    }))
  }, [])

  const openWindow = (windowId) => {
    // Backward compatibility: map old wojak-creator to wojak-generator
    if (windowId === 'wojak-creator') {
      windowId = 'wojak-generator'
    }
    setOpenWindows(prev => ({
      ...prev,
      [windowId]: true,
    }))
  }

  const closeWindow = (windowId) => {
    // Backward compatibility: map old wojak-creator to wojak-generator
    if (windowId === 'wojak-creator') {
      windowId = 'wojak-generator'
    }
    setOpenWindows(prev => ({
      ...prev,
      [windowId]: false,
    }))
  }

  const addDesktopImage = useCallback((imageDataUrl, filename, type = 'original', selectedLayers = {}, pairId = null) => {
    if (!imageDataUrl) {
      return
    }

    // Use functional update to ensure we get the latest state
    setDesktopImages(prev => {
      // Check for duplicates as a safety measure
      if (isDuplicateImage(prev, selectedLayers, type)) {
        showToast('ℹ️ This Wojak is already on your desktop', 'info', 3000)
        return prev // Don't add duplicate
      }

      // Generate pairId if not provided
      const finalPairId = pairId || `pair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Calculate initial position with smart placement
      // Ensure icons stay visible on screen and wrap to left side when right side is full
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const iconWidth = 90
      const iconHeight = 100 // Approximate height per icon (icon + label + spacing)
      const taskbarHeight = 46 // Taskbar height
      const padding = 20 // Top padding
      const rightSideX = screenWidth - 120 // Right side, 120px from edge
      const leftSideX = 20 // Left side, 20px from edge
      
      // Calculate max Y position to keep icon visible (above taskbar)
      // maxY is the maximum top Y position - icon bottom must be above taskbar
      const maxVisibleY = screenHeight - taskbarHeight - iconHeight
      const maxY = Math.max(padding, maxVisibleY)
      
      // Find first available position by checking existing icons
      // Try right side first, then left side, finding the lowest available Y in each column
      const findAvailablePosition = (xPosition) => {
        // Get all icons at this X position (within tolerance)
        const iconsAtX = prev.filter(img => {
          const imgX = img.position?.x || 0
          return Math.abs(imgX - xPosition) < 50 // 50px tolerance for "same column"
        })
        
        // Sort by Y position
        iconsAtX.sort((a, b) => {
          const yA = a.position?.y || 0
          const yB = b.position?.y || 0
          return yA - yB
        })
        
        // Try to find a gap or use the next position after the last icon
        let candidateY = padding
        
        for (const icon of iconsAtX) {
          const iconY = icon.position?.y || 0
          // If there's enough space above this icon, we can use it
          if (candidateY + iconHeight <= iconY) {
            break // Found a gap, use candidateY
          }
          // Move candidate to below this icon
          candidateY = iconY + iconHeight
        }
        
        // Ensure position is visible
        if (candidateY > maxY) {
          return null // No space in this column
        }
        
        return candidateY
      }
      
      // Try right side first
      let startX = rightSideX
      let startY = findAvailablePosition(rightSideX)
      
      // If right side is full, try left side
      if (startY === null) {
        startX = leftSideX
        startY = findAvailablePosition(leftSideX)
      }
      
      // If both sides are full, use right side at maxY (will be clamped/visible)
      if (startY === null) {
        startX = rightSideX
        startY = maxY
      }
      
      // Final clamp to ensure visibility
      startY = Math.min(startY, maxY)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:520',message:'Final icon position',data:{screenWidth,screenHeight,prevLength:prev.length,startX,startY,maxY,maxVisibleY,iconHeight,taskbarHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      const newImage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${type}`,
        type,
        pairId: finalPairId,
        image: imageDataUrl, // Store compressed thumbnail (already compressed from ExportControls)
        name: filename,
        traits: selectedLayers,
        createdAt: new Date().toISOString(),
        position: { x: startX, y: startY }
      }
      const updated = [...prev, newImage]
      
      // Enforce desktop limit (20 icons = 10 pairs)
      const { updatedImages, movedToBin } = enforceDesktopLimit(updated, 20)
      
      // If items were moved to bin, update recycle bin
      if (movedToBin.length > 0) {
        setRecycleBin(bin => {
          const { updatedBin } = enforceRecycleBinLimit([...bin, ...movedToBin], 20)
          // Save to localStorage
          if (storageAvailable) {
            const result = saveRecycleBin(updatedBin)
            if (!result.success && result.error === 'QuotaExceededError') {
              // Auto-delete oldest items to make space
              let retryBin = [...updatedBin]
              for (let i = 0; i < 5 && retryBin.length > 0; i++) {
                retryBin.shift() // Remove oldest
              }
              saveRecycleBin(retryBin)
              showToast('⚠️ Storage full - some items were permanently deleted', 'warning', 4000)
            }
          }
          return updatedBin
        })
        showToast('⚠️ Desktop full - oldest image moved to Recycle Bin', 'warning', 3000)
      }
      
      // Save to localStorage
      if (storageAvailable) {
        const result = saveDesktopImages(updatedImages)
        if (!result.success && result.error === 'QuotaExceededError') {
          // Auto-delete oldest recycle bin items to make space
          setRecycleBin(bin => {
            let retryBin = [...bin]
            for (let i = 0; i < 5 && retryBin.length > 0; i++) {
              retryBin.shift()
            }
            const binResult = saveRecycleBin(retryBin)
            // Retry save
            const retryResult = saveDesktopImages(updatedImages)
            if (!retryResult.success) {
              showToast('⚠️ Storage full! Some images may not be saved.', 'warning', 4000)
            }
            return retryBin
          })
        }
      }
      
      return updatedImages
    })

    // Show toast based on type
    if (type === 'original') {
      // Toast already shown in ExportControls
    } else if (type === 'cybertang') {
      // Toast already shown in ExportControls
    }
  }, [storageAvailable, showToast])

  // Update icon position after drag
  const updateIconPosition = useCallback((id, x, y) => {
    setDesktopImages(prev => {
      const updated = prev.map(img => 
        img.id === id ? { ...img, position: { x, y } } : img
      )
      return updated
    })
  }, [])

  // Save desktopImages to localStorage whenever it changes (skip initial load)
  const isInitialLoadRef = useRef(true)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      return // Skip saving on initial mount (data loaded from localStorage)
    }
    if (storageAvailable) {
      saveDesktopImages(desktopImages)
    }
  }, [desktopImages, storageAvailable])

  const removeDesktopImage = (imageId) => {
    setDesktopImages(prev => prev.filter(img => img.id !== imageId))
  }

  // Wallpaper management
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wallpaper', wallpaper)
      }
    } catch (e) {
      // localStorage not available, ignore
    }
  }, [wallpaper])

  // Apply wallpaper to desktop
  const getWallpaperStyle = () => {
    const wp = WALLPAPERS.find(w => w.id === wallpaper)
    if (!wp) return { background: '#008080' }
    if (wp.url) {
      return {
        backgroundImage: `url(${wp.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    }
    return { background: wp.color }
  }

  const handleWallpaperChange = (newWallpaper) => {
    setWallpaper(newWallpaper)
  }

  // Move desktop image to recycle bin
  const moveToRecycleBin = useCallback((imageId) => {
    setDesktopImages(prev => {
      const image = prev.find(img => img.id === imageId)
      if (!image) return prev

      // Track action for undo
      setLastAction({
        type: 'delete',
        item: { ...image, deletedAt: new Date().toISOString() },
        timestamp: Date.now()
      })

      // Move to recycle bin
      setRecycleBin(bin => {
        const newBin = [...bin, { ...image, deletedAt: new Date().toISOString() }]
        const { updatedBin } = enforceRecycleBinLimit(newBin, 20)
        
        if (storageAvailable) {
          const result = saveRecycleBin(updatedBin)
          if (!result.success && result.error === 'QuotaExceededError') {
            // Auto-delete oldest items
            let retryBin = [...updatedBin]
            for (let i = 0; i < 5 && retryBin.length > 0; i++) {
              retryBin.shift()
            }
            saveRecycleBin(retryBin)
            return retryBin
          }
        }
        
        return updatedBin
      })

      // Save desktop images
      const updated = prev.filter(img => img.id !== imageId)
      if (storageAvailable) {
        saveDesktopImages(updated)
      }

      showToast('🗑️ Image moved to Recycle Bin', 'info', 3000)
      return updated
    })
  }, [storageAvailable, showToast])

  // Restore item from recycle bin to desktop
  const restoreFromRecycleBin = useCallback((itemId) => {
    setRecycleBin(prev => {
      const item = prev.find(i => i.id === itemId)
      if (!item) return prev

      // Remove deletedAt before restoring
      const { deletedAt, ...restoredItem } = item

      // Check if desktop has space
      setDesktopImages(desktop => {
        const updated = [...desktop, restoredItem]

        const { updatedImages, movedToBin } = enforceDesktopLimit(updated, 20)
        
        // If items were moved to bin, add them to recycle bin
        if (movedToBin.length > 0) {
          setRecycleBin(bin => {
            const newBin = [...bin, ...movedToBin]
            const { updatedBin } = enforceRecycleBinLimit(newBin, 20)
            if (storageAvailable) {
              saveRecycleBin(updatedBin)
            }
            return updatedBin
          })
        }

        if (storageAvailable) {
          saveDesktopImages(updatedImages)
        }

        showToast('✅ Image restored to desktop', 'success', 3000)
        return updatedImages
      })

      // Remove from recycle bin
      const updated = prev.filter(i => i.id !== itemId)
      if (storageAvailable) {
        saveRecycleBin(updated)
      }
      return updated
    })
  }, [storageAvailable, showToast])

  // Permanently delete from recycle bin
  const deleteForever = useCallback((itemId) => {
    setRecycleBin(prev => {
      const item = prev.find(i => i.id === itemId)
      if (!item) return prev

      // Track action for undo
      setLastAction({
        type: 'delete',
        item,
        timestamp: Date.now()
      })

      const updated = prev.filter(i => i.id !== itemId)
      if (storageAvailable) {
        saveRecycleBin(updated)
      }

      showToast('🗑️ Image permanently deleted', 'info', 3000)
      return updated
    })
  }, [storageAvailable, showToast])

  // Empty recycle bin
  const emptyRecycleBin = useCallback(() => {
    if (window.confirm('Permanently delete all items in Recycle Bin?')) {
      playSound('emptyTrash')
      setRecycleBin([])
      if (storageAvailable) {
        saveRecycleBin([])
      }
      showToast('🗑️ Recycle Bin emptied', 'info', 3000)
    }
  }, [storageAvailable, showToast])

  // Undo last delete action
  const undoLastAction = useCallback(() => {
    if (!lastAction || lastAction.type !== 'delete') return
    if (Date.now() - lastAction.timestamp > 30000) {
      // 30 seconds expired
      setLastAction(null)
      return
    }

    // Restore item
    const item = lastAction.item
    
    // Check if item is still in recycle bin
    setRecycleBin(currentBin => {
      const inRecycleBin = currentBin.some(binItem => binItem.id === item.id)
      
      if (inRecycleBin) {
        // Item is in recycle bin - restore it
        restoreFromRecycleBin(item.id)
        setLastAction(null)
        return currentBin
      } else if (item.deletedAt) {
        // Item was permanently deleted - can't restore
        setLastAction(null)
        showToast('⚠️ Cannot undo - item was permanently deleted', 'warning', 3000)
        return currentBin
      } else {
        // Item was on desktop - add back directly
        setDesktopImages(prev => {
          const updated = [...prev, item]
          const { updatedImages } = enforceDesktopLimit(updated, 20)
          if (storageAvailable) {
            saveDesktopImages(updatedImages)
          }
          return updatedImages
        })
        setLastAction(null)
        showToast('↩️ Undo successful', 'success', 3000)
        return currentBin
      }
    })
  }, [lastAction, storageAvailable, showToast, restoreFromRecycleBin])

  // Batch delete selected icons
  const deleteSelectedIcons = useCallback(() => {
    if (selectedIconIds.length === 0) return

    const confirmed = selectedIconIds.length > 1
      ? window.confirm(`Delete ${selectedIconIds.length} items?`)
      : true

    if (confirmed) {
      selectedIconIds.forEach(id => moveToRecycleBin(id))
      setSelectedIconIds([])
      showToast(`🗑️ ${selectedIconIds.length} items moved to Recycle Bin`, 'info', 3000)
    }
  }, [selectedIconIds, moveToRecycleBin, showToast])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedIcons: selectedIconIds,
    onDelete: deleteSelectedIcons,
    onSelectAll: () => {
      setSelectedIconIds(desktopImages.map(img => img.id))
    },
    onDeselectAll: deselectAll,
    onRefresh: () => window.location.reload(),
    onOpen: (iconId) => {
      const icon = desktopImages.find(img => img.id === iconId)
      if (icon) {
        const imageUrl = icon.image || icon.imageDataUrl
        viewImage(imageUrl)
      }
    },
    onUndo: undoLastAction,
    onRename: (iconId) => {
      // TODO: Implement rename
      console.log('Rename:', iconId)
    },
    isWindowFocused: activeWindowId === null, // Only active when desktop is focused (no active windows)
  })

  // Export gallery
  const exportGallery = useCallback(() => {
    try {
      exportGalleryUtil()
      showToast('✅ Gallery exported successfully', 'success', 3000)
    } catch (error) {
      console.error('Error exporting gallery:', error)
      showToast('❌ Failed to export gallery', 'error', 3000)
    }
  }, [showToast])

  // Import gallery
  const importGallery = useCallback((file) => {
    importGalleryUtil(file)
      .then((result) => {
        // Reload from localStorage
        const loaded = loadDesktopImages()
        const loadedBin = loadRecycleBin()
        setDesktopImages(loaded)
        setRecycleBin(loadedBin)
        showToast(`✅ Gallery imported: ${result.count} images`, 'success', 3000)
      })
      .catch((error) => {
        console.error('Error importing gallery:', error)
        showToast(`❌ Failed to import: ${error.message}`, 'error', 3000)
      })
  }, [showToast])

  // Clock click handler for easter egg
  const handleClockClick = () => {
    trackClockClick(() => {
      // Mini game or secret feature
      alert('🎮 You found the secret! Mini-game coming soon...')
    })
  }

  // Preload sounds on mount
  useEffect(() => {
    preloadSounds()
  }, [])

  // Play startup sound when startup completes (only after user interaction)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true)
    }
    
    // Listen for user interaction (using { once: true } auto-removes listeners)
    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })
    document.addEventListener('touchstart', handleUserInteraction, { once: true })
    
    // Cleanup function (though { once: true } handles removal automatically)
    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [])
  
  useEffect(() => {
    if (isStartupComplete && hasUserInteracted) {
      // Startup sound removed - this is a website, not a computer booting
    }
  }, [isStartupComplete, hasUserInteracted])

  // Global tooltip positioning - prevent clipping
  useEffect(() => {
    const handleMouseEnter = (e) => {
      const element = e.target.closest('.win98-tooltip')
      if (element) {
        positionTooltip(element)
      }
    }

    // Mobile: Show tooltips on touch (long-press or tap)
    const handleTouchStart = (e) => {
      const element = e.target.closest('.win98-tooltip')
      if (element && element.dataset.tooltip) {
        // Mark as touched to show tooltip
        element.dataset.tooltipTouched = 'true'
        positionTooltip(element)
        
        // Hide after 3 seconds
        setTimeout(() => {
          element.dataset.tooltipTouched = 'false'
        }, 3000)
      }
    }

    // Use event delegation on document
    document.addEventListener('mouseenter', handleMouseEnter, true)
    document.addEventListener('touchstart', handleTouchStart, { passive: true })

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true)
      document.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  // Konami code and secret word listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger easter eggs when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }

      checkKonamiCode(e.key, () => {
        setSecretWallpaper(true)
        // TODO: Uncomment when sound manager is implemented (PROMPT 1)
        // playSound('success')
        alert('🍊 Secret wallpaper unlocked!')
      })

      checkSecretWord(e.key, 
        () => setShowOrangeRain(true),  // "tang" typed
        () => setShowClippy(true)       // "orange" typed
      )
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <OrangeToyProvider>
      <GlobalErrorBoundary>
        <MarketplaceProvider>
              <SEOHead />
              {!isStartupComplete && (
                <StartupSequence onComplete={() => setIsStartupComplete(true)} />
              )}

              {isStartupComplete && (
                <>
                  {/* Background music - starts after first user interaction */}
                  <BackgroundMusic />
              <a href="#main-content" className="skip-link">Skip to main content</a>
              <div className="bg-fixed" aria-hidden="true" style={getWallpaperStyle()}></div>
              <main 
                id="main-content" 
                className="desktop" 
                aria-label="Desktop"
                style={getWallpaperStyle()}
                onContextMenu={handleDesktopContextMenu}
                onClick={(e) => {
                  // Click on desktop background to deselect icons
                  const target = e.target
                  if (
                    target.classList.contains('desktop') || 
                    target.id === 'main-content' ||
                    target.classList.contains('bg-fixed')
                  ) {
                    // Double-check: ensure we're not clicking on child elements
                    const clickedElement = document.elementFromPoint(e.clientX, e.clientY)
                    const isActuallyDesktop = 
                      clickedElement &&
                      (clickedElement.classList.contains('desktop') ||
                       clickedElement.classList.contains('bg-fixed') ||
                       clickedElement.id === 'main-content') &&
                      !clickedElement.closest('.window') &&
                      !clickedElement.closest('.desktop-icons') &&
                      !clickedElement.closest('.desktop-image-icons') &&
                      !clickedElement.closest('.taskbar')
                    
                    if (isActuallyDesktop) {
                      deselectAll()
                    }
                  }
                }}
              >
                <OrangeToyLayer />
                <EasterEggCoordinator />
                {isLoadingGallery && (
                  <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#c0c0c0',
                    border: '2px outset #c0c0c0',
                    padding: '16px 24px',
                    zIndex: 10000,
                    fontFamily: 'MS Sans Serif, sans-serif',
                    fontSize: '12px'
                  }}>
                    Loading gallery...
                  </div>
                )}
                <SelectionBox
                  containerRef={desktopRef}
                  icons={desktopImages.map(img => ({ id: img.id }))}
                  onSelectionChange={(selectedIds) => setSelectedIconIds(selectedIds)}
                  isEnabled={!isLoadingGallery}
                />
                <DesktopIcons onOpenApp={openWindow} />
                <DesktopImageIcons 
                  desktopImages={desktopImages}
                  onRemoveImage={moveToRecycleBin}
                  onUpdatePosition={updateIconPosition}
                  onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
                  selectedIconIds={selectedIconIds}
                  setSelectedIconIds={setSelectedIconIds}
                  onShowProperties={setPropertiesIcon}
                  recycleBin={recycleBin}
                />
                {openWindows['window-readme-txt'] && (
                  <ReadmeWindow onClose={() => closeWindow('window-readme-txt')} />
                )}
                {openWindows['window-mint-info-exe'] && (
                  <MintInfoWindow
                    onNotifyClick={() => setNotifyOpen(true)}
                    onClose={() => closeWindow('window-mint-info-exe')}
                  />
                )}
                {openWindows['window-gallery'] && (
                  <GalleryWindow onClose={() => closeWindow('window-gallery')} />
                )}
                {openWindows['window-faq'] && (
                  <FaqWindow onClose={() => closeWindow('window-faq')} />
                )}
                {openWindows['tanggang'] && (
                  <TangGangWindow onClose={() => closeWindow('tanggang')} />
                )}
              <Routes>
                <Route path="/" element={null} />
                <Route 
                  path="/admin-enable" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdminPanel />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/dev/qa" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <QAPage />
                    </Suspense>
                  } 
                />
              </Routes>
              {openWindows['window-marketplace'] && (
                <MarketplaceWindow onClose={() => closeWindow('window-marketplace')} />
              )}
              <SideStack />
              {openWindows['wojak-generator'] && (
                <WojakGenerator 
                  onClose={() => closeWindow('wojak-generator')}
                  onAddDesktopImage={addDesktopImage}
                  desktopImages={desktopImages}
                />
              )}
              {isRecycleBinOpen && (
                <RecycleBinWindow
                  isOpen={isRecycleBinOpen}
                  onClose={() => setIsRecycleBinOpen(false)}
                  recycleBin={recycleBin}
                  onRestore={restoreFromRecycleBin}
                  onDeleteForever={deleteForever}
                  onEmptyBin={emptyRecycleBin}
                  onExport={exportGallery}
                  onImport={importGallery}
                />
              )}
              {openWindows['paint'] && <PaintWindow onClose={() => closeWindow('paint')} />}
              {openWindows['pinball-window'] && (
                <PinballWindow onClose={() => closeWindow('pinball-window')} />
              )}
              {openWindows['window-solitaire'] && (
                <SolitaireWindow onClose={() => closeWindow('window-solitaire')} />
              )}
              {openWindows['window-minesweeper'] && (
                <MinesweeperWindow onClose={() => closeWindow('window-minesweeper')} />
              )}
              {openWindows['window-skifree'] && (
                <SkiFreeWindow onClose={() => closeWindow('window-skifree')} />
              )}
              <NotifyPopup isOpen={notifyOpen} onClose={() => setNotifyOpen(false)} />
              <TryAgainWindowWrapper />
              {propertiesIcon && (
                <PropertiesWindow
                  isOpen={propertiesIcon !== null}
                  onClose={() => setPropertiesIcon(null)}
                  icon={propertiesIcon}
                />
              )}
              {isDisplayPropertiesOpen && (
                <DisplayPropertiesWindow
                  isOpen={isDisplayPropertiesOpen}
                  onClose={() => setIsDisplayPropertiesOpen(false)}
                  currentWallpaper={wallpaper}
                  onChangeWallpaper={handleWallpaperChange}
                />
              )}
              {openWindows['theme-qa-window'] && (
                <ThemeQAWindow
                  isOpen={openWindows['theme-qa-window']}
                  onClose={() => closeWindow('theme-qa-window')}
                />
              )}
            </main>
                  <Taskbar 
                    onOpenWojakGenerator={() => openWindow('wojak-generator')} 
                    wojakGeneratorOpen={!!openWindows['wojak-generator']}
                    onOpenApp={openWindow}
                    onClockClick={handleClockClick}
                    isOnline={isOnline}
                  />
                  <Screensaver
                    idleTimeout={(() => {
                      try {
                        const stored = localStorage.getItem('screensaverTimeout')
                        return stored ? parseInt(stored, 10) : 120000
                      } catch (e) {
                        return 120000
                      }
                    })()}
                    disabled={isTangifying || isModalOpen || isInputFocused || hasActiveWindows}
                    onDismiss={() => {
                      // Screensaver dismissed
                    }}
                  />
                  <OrangeRain 
                    isActive={showOrangeRain} 
                    onComplete={() => setShowOrangeRain(false)} 
                  />
                  <Clippy 
                    isVisible={showClippy}
                    onClose={() => setShowClippy(false)}
                  />
                  {contextMenu && (
                    <ContextMenu
                      x={contextMenu.x}
                      y={contextMenu.y}
                      items={contextMenu.items}
                      onClose={hideContextMenu}
                    />
                  )}
                </>
              )}
        </MarketplaceProvider>
      </GlobalErrorBoundary>
    </OrangeToyProvider>
  )
}

function App() {
  return (
    <ScreensaverProvider>
      <ToastProvider>
        <KeyboardPriorityProvider>
          <WindowProvider>
            <AppContent />
          </WindowProvider>
        </KeyboardPriorityProvider>
      </ToastProvider>
    </ScreensaverProvider>
  )
}

export default App

