import { useState, useEffect } from 'react'
import StartMenu from './StartMenu'
import { useWindow } from '../contexts/WindowContext'
import { getWindowIcon } from '../utils/windowIcons'

export default function Taskbar() {
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront, isWindowActive } = useWindow()

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleStartClick = () => {
    setStartMenuOpen(!startMenuOpen)
  }

  const handleCloseStartMenu = () => {
    setStartMenuOpen(false)
  }

  const handleWindowClick = (windowId) => {
    if (isWindowMinimized(windowId)) {
      restoreWindow(windowId)
    } else {
      bringToFront(windowId)
    }
    setStartMenuOpen(false)
  }

  const formatTime = (date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    const minutesStr = minutes.toString().padStart(2, '0')
    return `${hours12}:${minutesStr} ${ampm}`
  }

  const allWindows = getAllWindows()

  return (
    <>
      <nav className="taskbar" role="toolbar" aria-label="Application toolbar">
        <button 
          className="start-button"
          onClick={handleStartClick}
          aria-label="Start menu"
          aria-expanded={startMenuOpen}
        >
          <img 
            src="/BASE_Wojak_Sports Jacket.png" 
            alt="" 
            className="start-button-icon"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="start-button-text">Start</span>
        </button>
        <div className="taskbar-tray">
          {allWindows.map((window) => {
            const minimized = isWindowMinimized(window.id)
            const active = isWindowActive(window.id)
            const iconPath = getWindowIcon(window.id, window.title)
            return (
              <button
                key={window.id}
                className={`taskbar-window-button ${minimized ? 'minimized' : ''} ${active ? 'active' : ''}`}
                onClick={() => handleWindowClick(window.id)}
                aria-label={`${window.title} - ${minimized ? 'Restore' : 'Activate'}`}
                title={window.title}
              >
                {iconPath && (
                  <img 
                    src={iconPath} 
                    alt="" 
                    className="taskbar-window-button-icon"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
                <span className="taskbar-window-button-text">{window.title}</span>
              </button>
            )
          })}
        </div>
        <div className="taskbar-clock" role="timer" aria-live="polite" aria-label="Current time">
          {formatTime(currentTime)}
        </div>
      </nav>
      <StartMenu 
        isOpen={startMenuOpen} 
        onClose={handleCloseStartMenu}
        onOpenPaint={() => {
          window.dispatchEvent(new CustomEvent('openPaintWindow'))
          setStartMenuOpen(false)
        }}
      />
    </>
  )
}

