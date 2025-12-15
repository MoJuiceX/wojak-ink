import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import ReadmeWindow from './components/windows/ReadmeWindow'
import MintInfoWindow from './components/windows/MintInfoWindow'
import GalleryWindow from './components/windows/GalleryWindow'
import FaqWindow from './components/windows/FaqWindow'
import TangGangWindow from './components/windows/TangGangWindow'
import SideStack from './components/SideStack'
import NotifyPopup from './components/windows/NotifyPopup'
import AdminPanel from './components/windows/AdminPanel'
import MarketplaceWindow from './components/windows/MarketplaceWindow'
import MemeticEnergyGenerator from './components/windows/MemeticEnergyGenerator'
import PaintWindow from './components/windows/PaintWindow'
import Taskbar from './components/Taskbar'
import { MarketplaceProvider } from './contexts/MarketplaceContext'
import { WindowProvider, useWindow } from './contexts/WindowContext'
import { ToastProvider } from './contexts/ToastContext'
import { useWindowStacking } from './hooks/useWindowStacking'

// Component to handle initial window minimization
function WindowInitializer() {
  const { getAllWindows, minimizeWindow } = useWindow()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return

    // Wait a bit for all windows to register, then minimize all except ReadmeWindow
    const timer = setTimeout(() => {
      const allWindows = getAllWindows()
      const readmeWindowId = 'window-readme-txt' // Based on title "README.TXT"
      
      allWindows.forEach((window) => {
        // Don't minimize ReadmeWindow - minimize all others including TangGang
        if (window.id !== readmeWindowId) {
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
      <WindowProvider>
        <WindowInitializer />
        <MarketplaceProvider>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <div className="bg-fixed" aria-hidden="true"></div>
          <main id="main-content" className="desktop" aria-label="Desktop">
            <ReadmeWindow />
            <MintInfoWindow onNotifyClick={() => setNotifyOpen(true)} />
            <GalleryWindow />
            <FaqWindow />
            <TangGangWindow />
            <Routes>
              <Route path="/" element={null} />
              <Route path="/admin-enable" element={<AdminPanel />} />
            </Routes>
            <MarketplaceWindow />
            <SideStack />
            <MemeticEnergyGenerator />
            {paintOpen && <PaintWindow onClose={() => setPaintOpen(false)} />}
            <NotifyPopup isOpen={notifyOpen} onClose={() => setNotifyOpen(false)} />
          </main>
          <Taskbar />
        </MarketplaceProvider>
      </WindowProvider>
    </ToastProvider>
  )
}

export default App

