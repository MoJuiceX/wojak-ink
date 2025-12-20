import { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ReadmeWindow from './components/windows/ReadmeWindow'
import MintInfoWindow from './components/windows/MintInfoWindow'
import GalleryWindow from './components/windows/GalleryWindow'
import FaqWindow from './components/windows/FaqWindow'
import TangGangWindow from './components/windows/TangGangWindow'
import SideStack from './components/SideStack'
import NotifyPopup from './components/windows/NotifyPopup'
import MarketplaceWindow from './components/windows/MarketplaceWindow'
import WojakCreator from './components/windows/WojakCreator'
import PaintWindow from './components/windows/PaintWindow'
import PinballWindow from './components/windows/PinballWindow'
import DesktopIcons from './components/DesktopIcons'
import Taskbar from './components/Taskbar'
import BackgroundMusic from './components/BackgroundMusic'
import LoadingSpinner from './components/ui/LoadingSpinner'
import OrangeToyLayer from './components/OrangeToyLayer'
import TryAgainWindowWrapper from './components/windows/TryAgainWindowWrapper'

// Lazy load non-critical routes
const AdminPanel = lazy(() => import('./components/windows/AdminPanel'))
const QAPage = lazy(() => import('./components/dev/QAPage'))
import { MarketplaceProvider } from './contexts/MarketplaceContext'
import { WindowProvider } from './contexts/WindowContext'
import { ToastProvider } from './contexts/ToastContext'
import { KeyboardPriorityProvider } from './contexts/KeyboardPriorityContext'
import { OrangeToyProvider } from './contexts/OrangeToyContext'
import { useWindowStacking } from './hooks/useWindowStacking'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'

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
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      observer.disconnect()
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}

function App() {
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [paintOpen, setPaintOpen] = useState(false)
  const [wojakCreatorOpen, setWojakCreatorOpen] = useState(false)
  const [openWindows, setOpenWindows] = useState({
    'window-readme-txt': false,
    'window-mint-info-exe': false,
    'window-gallery': false,
    'window-faq': false,
    'window-marketplace': false,
    'tanggang': false,
  })

  // Global scroll lock - prevent all page scrolling
  useGlobalScrollLock()
  
  // Use the extracted window stacking hook
  useWindowStacking()

  // Global error logging for uncaught errors and unhandled promise rejections (DEV only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

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
      setPaintOpen(true)
    }
    window.addEventListener('openPaintWindow', handleOpenPaint)
    return () => {
      window.removeEventListener('openPaintWindow', handleOpenPaint)
    }
  }, [])

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
    setOpenWindows(prev => ({
      ...prev,
      [windowId]: true,
    }))
  }

  const closeWindow = (windowId) => {
    setOpenWindows(prev => ({
      ...prev,
      [windowId]: false,
    }))
  }

  return (
    <ToastProvider>
      <KeyboardPriorityProvider>
        <WindowProvider>
          <OrangeToyProvider>
            <GlobalErrorBoundary>
              <MarketplaceProvider>
              {/* Background music - starts after first user interaction */}
              <BackgroundMusic />
              <a href="#main-content" className="skip-link">Skip to main content</a>
              <div className="bg-fixed" aria-hidden="true"></div>
              <main id="main-content" className="desktop" aria-label="Desktop">
                <OrangeToyLayer />
                <DesktopIcons onOpenApp={openWindow} />
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
              {wojakCreatorOpen && <WojakCreator onClose={() => setWojakCreatorOpen(false)} />}
              {paintOpen && <PaintWindow onClose={() => setPaintOpen(false)} />}
              {openWindows['pinball-window'] && (
                <PinballWindow onClose={() => closeWindow('pinball-window')} />
              )}
              <NotifyPopup isOpen={notifyOpen} onClose={() => setNotifyOpen(false)} />
              <TryAgainWindowWrapper />
            </main>
            <Taskbar 
              onOpenWojakCreator={() => setWojakCreatorOpen(true)} 
              wojakCreatorOpen={wojakCreatorOpen}
              onOpenApp={openWindow}
            />
            </MarketplaceProvider>
          </GlobalErrorBoundary>
          </OrangeToyProvider>
        </WindowProvider>
      </KeyboardPriorityProvider>
    </ToastProvider>
  )
}

export default App

