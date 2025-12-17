import { useState, useEffect } from 'react'
import React from 'react'
import StartMenu from './StartMenu'
import { useWindow } from '../contexts/WindowContext'
import { getWindowIcon } from '../utils/windowIcons'

export default function Taskbar({ onOpenWojakCreator, wojakCreatorOpen }) {
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
      restoreWindow(windowId) // restoreWindow already centers if not moved
    } else {
      bringToFront(windowId) // bringToFront now also centers if not moved
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
  
  // Check if Wojak Creator window is open and active
  const wojakCreatorWindow = allWindows.find(w => w.id === 'wojak-creator')
  const isWojakCreatorActive = wojakCreatorWindow ? isWindowActive('wojak-creator') : false
  const isWojakCreatorMinimized = wojakCreatorWindow ? isWindowMinimized('wojak-creator') : false
  
  const handleWojakGeneratorClick = () => {
    if (wojakCreatorWindow) {
      // Window exists - restore or bring to front
      if (isWojakCreatorMinimized) {
        restoreWindow('wojak-creator')
      } else {
        bringToFront('wojak-creator')
      }
    } else {
      // Window doesn't exist - open it
      if (onOpenWojakCreator) {
        onOpenWojakCreator()
      }
    }
    setStartMenuOpen(false)
  }

  return (
    <>
      <nav className="taskbar" role="toolbar" aria-label="Application toolbar">
        <button 
          className="start-button"
          onClick={handleStartClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleStartClick()
            }
          }}
          aria-label="Start menu"
          aria-expanded={startMenuOpen}
          tabIndex={0}
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
            
            // Insert WOJAK GENERATOR button right after MARKETPLACE
            const shouldInsertWojakGenerator = window.title === 'MARKETPLACE'
            
            return (
              <React.Fragment key={window.id}>
                <button
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
                {shouldInsertWojakGenerator && (
                  <button
                    key="wojak-generator-static"
                    className={`taskbar-window-button ${isWojakCreatorMinimized ? 'minimized' : ''} ${isWojakCreatorActive ? 'active' : ''}`}
                    onClick={handleWojakGeneratorClick}
                    aria-label="WOJAK GENERATOR - Open Wojak Creator"
                    title="WOJAK GENERATOR"
                  >
                    <img 
                      src={getWindowIcon('wojak-creator', 'WOJAK_CREATOR.EXE')} 
                      alt="" 
                      className="taskbar-window-button-icon"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <span className="taskbar-window-button-text">WOJAK GENERATOR</span>
                  </button>
                )}
              </React.Fragment>
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
        onOpenWojakCreator={onOpenWojakCreator}
      />
    </>
  )
}

