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
import Taskbar from './components/Taskbar'
import OrangeTrail from './components/OrangeTrail'
import OrangeGameErrorBoundary from './components/OrangeGameErrorBoundary'
import BackgroundMusic from './components/BackgroundMusic'
import LoadingSpinner from './components/ui/LoadingSpinner'
import PerformanceDebug from './components/dev/PerformanceDebug'

// Lazy load non-critical routes
const AdminPanel = lazy(() => import('./components/windows/AdminPanel'))
const QAPage = lazy(() => import('./components/dev/QAPage'))
import { MarketplaceProvider } from './contexts/MarketplaceContext'
import { WindowProvider, useWindow } from './contexts/WindowContext'
import { ToastProvider } from './contexts/ToastContext'
import { OrangeGameProvider } from './contexts/OrangeGameContext'
import { KeyboardPriorityProvider } from './contexts/KeyboardPriorityContext'
import { useWindowStacking } from './hooks/useWindowStacking'

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

// Component to handle initial window minimization
function WindowInitializer() {
  const { getAllWindows, minimizeWindow } = useWindow()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return

    // Wait a bit for all windows to register, then minimize all except ReadmeWindow and TangGang
    const timer = setTimeout(() => {
      const allWindows = getAllWindows()
      const readmeWindowId = 'window-readme-txt' // Based on title "README.TXT"
      const tanggangWindowId = 'tanggang' // TangGang window ID
      
      allWindows.forEach((window) => {
        // Don't minimize ReadmeWindow or TangGang - minimize all others
        if (window.id !== readmeWindowId && window.id !== tanggangWindowId) {
          minimizeWindow(window.id)
        }
      })
      
      setInitialized(true)
    }, 100) // Small delay to ensure all windows are registered

    return () => clearTimeout(timer)
  }, [getAllWindows, minimizeWindow, initialized])

  return null
}

function App() {
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [paintOpen, setPaintOpen] = useState(false)
  const [wojakCreatorOpen, setWojakCreatorOpen] = useState(false)

  // Global scroll lock - prevent all page scrolling
  useGlobalScrollLock()
  
  // Use the extracted window stacking hook
  useWindowStacking()

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

  return (
    <ToastProvider>
      <KeyboardPriorityProvider>
        <WindowProvider>
          <WindowInitializer />
          <MarketplaceProvider>
            <OrangeGameProvider>
            {/* Background music - starts after first user interaction */}
            <BackgroundMusic />
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <div className="bg-fixed" aria-hidden="true"></div>
            <main id="main-content" className="desktop" aria-label="Desktop">
              {/* Orange game layer wrapped in error boundary - if it crashes, show error window and disable game */}
              <OrangeGameErrorBoundary>
                <OrangeTrail />
              </OrangeGameErrorBoundary>
              <ReadmeWindow />
            <MintInfoWindow onNotifyClick={() => setNotifyOpen(true)} />
            <GalleryWindow />
            <FaqWindow />
            <TangGangWindow />
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
            <MarketplaceWindow />
            <SideStack />
            {wojakCreatorOpen && <WojakCreator onClose={() => setWojakCreatorOpen(false)} />}
            {paintOpen && <PaintWindow onClose={() => setPaintOpen(false)} />}
            <NotifyPopup isOpen={notifyOpen} onClose={() => setNotifyOpen(false)} />
            <PerformanceDebug />
          </main>
            <Taskbar 
              onOpenWojakCreator={() => setWojakCreatorOpen(true)} 
              wojakCreatorOpen={wojakCreatorOpen}
            />
            </OrangeGameProvider>
          </MarketplaceProvider>
        </WindowProvider>
      </KeyboardPriorityProvider>
    </ToastProvider>
  )
}

export default App

