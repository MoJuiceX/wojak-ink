import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { createPortal } from 'react-dom'
import StartMenu from './StartMenu'
import { useWindow } from '../contexts/WindowContext'
import { useMarketplace } from '../contexts/MarketplaceContext'
import { getWindowIcon } from '../utils/windowIcons'
import { trackClockClick } from '../utils/easterEggs'
import { toggleMute, getMuteState } from '../utils/soundManager'

export default function Taskbar({ onOpenWojakGenerator, wojakGeneratorOpen, onOpenApp, onClockClick, isOnline = true }) {
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMuted, setIsMuted] = useState(getMuteState())
  const { getAllWindows, isWindowMinimized, restoreWindow, bringToFront, isWindowActive, minimizeWindow } = useWindow()
  const startButtonRef = useRef(null)
  const startMenuRef = useRef(null)
  const clockRef = useRef(null)
  const [isStartHovered, setIsStartHovered] = useState(false)
  const [isAutoHintVisible, setIsAutoHintVisible] = useState(false)
  const [autoHintDismissed, setAutoHintDismissed] = useState(false)
  const [startHintPosition, setStartHintPosition] = useState({ top: 0, left: 0 })

  // Update clock every second - use ref to avoid re-renders
  useEffect(() => {
    const timer = setInterval(() => {
      if (clockRef.current) {
        // Direct DOM update to avoid re-render
        const now = new Date()
        const hours = now.getHours()
        const minutes = now.getMinutes()
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const hours12 = hours % 12 || 12
        const minutesStr = minutes.toString().padStart(2, '0')
        clockRef.current.textContent = `${hours12}:${minutesStr} ${ampm}`
      } else {
        // Fallback: update state if ref not available
        setCurrentTime(new Date())
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Sync mute state with localStorage
  useEffect(() => {
    setIsMuted(getMuteState())
  }, [])

  const handleMuteToggle = () => {
    const newMutedState = toggleMute()
    setIsMuted(newMutedState)
  }

  // Read persisted dismissal state on mount (safe-guarded for environments without localStorage)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const hintValue = window.localStorage.getItem('wojak_start_hint_dismissed')
      if (hintValue === '1') {
        setAutoHintDismissed(true)
      }
    } catch (e) {
      // Ignore storage errors – tooltip will simply behave as first-run
      // eslint-disable-next-line no-console
      console.debug('Unable to read wojak_start_hint_dismissed from localStorage', e)
    }
  }, [])

  const isTouchDevice = () => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  const computeStartHintPosition = () => {
    if (!startButtonRef.current) return null
    const rect = startButtonRef.current.getBoundingClientRect()

    // Position the tooltip just above the Start button
    const top = rect.top - 48
    const left = rect.left

    return { top, left }
  }

  const markStartHintDismissed = () => {
    setIsAutoHintVisible(false)
    setAutoHintDismissed(true)

    try {
      if (typeof window === 'undefined') return
      window.localStorage.setItem('wojak_start_hint_dismissed', '1')
    } catch (e) {
      // Ignore storage write failures
      // eslint-disable-next-line no-console
      console.debug('Unable to write wojak_start_hint_dismissed to localStorage', e)
    }
  }

  // Auto-show hint after 3s on desktop if it hasn't been dismissed
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (autoHintDismissed) return
    // TEMP: debug isTouchDevice behavior
    // eslint-disable-next-line no-console
    console.debug('[StartHint] isTouchDevice =', isTouchDevice())
    // if (isTouchDevice()) return

    // Debug logging to verify timer behavior in the console
    // eslint-disable-next-line no-console
    console.debug('[StartHint] timer armed; dismissed =', autoHintDismissed)

    const id = window.setTimeout(() => {
      // eslint-disable-next-line no-console
      console.debug('[StartHint] timer fired')

      // Extra safety: if storage now says dismissed, abort before showing
      try {
        const stored = window.localStorage.getItem('wojak_start_hint_dismissed')
        if (stored === '1') {
          // eslint-disable-next-line no-console
          console.debug('[StartHint] storage now dismissed, aborting show')
          return
        }
      } catch (e) {
        // Ignore storage errors and fall back to state-based guard
      }

      const pos = computeStartHintPosition()
      // eslint-disable-next-line no-console
      console.debug('[StartHint] pos =', pos)
      if (!pos) return
      setStartHintPosition(pos)
      setIsAutoHintVisible(true)
      // eslint-disable-next-line no-console
      console.debug('[StartHint] isAutoHintVisible set TRUE')
    }, 3000)

    return () => window.clearTimeout(id)
  }, [autoHintDismissed])

  // While auto hint is visible, temporarily hide it on any click or Escape (no persistence)
  useEffect(() => {
    if (!isAutoHintVisible) return

    const handlePointerDown = () => {
      setIsAutoHintVisible(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAutoHintVisible(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, { capture: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAutoHintVisible])

  const handleStartHoverIn = () => {
    if (isTouchDevice()) return
    const pos = computeStartHintPosition()
    if (!pos) return

    setStartHintPosition(pos)
    setIsStartHovered(true)
  }

  const handleStartHoverOut = () => {
    setIsStartHovered(false)
  }

  const handleStartClick = () => {
    // Any interaction with Start permanently dismisses the hint for this user
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wojak_start_hint_dismissed', '1')
      }
    } catch (e) {
      // Ignore storage errors
    }

    setAutoHintDismissed(true)
    setIsAutoHintVisible(false)
    setIsStartHovered(false)

    setStartMenuOpen((v) => !v)
  }

  const handleCloseStartMenu = () => {
    setStartMenuOpen(false)
  }

  const handleWindowClick = (windowId) => {

    const minimized = isWindowMinimized(windowId)
    const active = isWindowActive(windowId)

    if (minimized) {
      // Minimized → restore and focus
      restoreWindow(windowId)
    } else if (active) {
      // Active and not minimized → minimize
      minimizeWindow(windowId)
    } else {
      // Inactive but open → bring to front
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
  
  // #region agent log
  // Instrumentation: Check theme state and computed styles for taskbar buttons
  useEffect(() => {
    const htmlEl = document.documentElement
    const themeAttr = htmlEl.getAttribute('data-theme')
    const accentAttr = htmlEl.getAttribute('data-accent')
    
    // Check taskbar button computed styles
    const taskbarButtons = document.querySelectorAll('.taskbar-window-button')
    const taskbarButtonTexts = document.querySelectorAll('.taskbar-window-button-text')
    
    const buttonData = Array.from(taskbarButtons).map((btn, idx) => {
      const textEl = taskbarButtonTexts[idx]
      const computedStyle = window.getComputedStyle(btn)
      const textComputedStyle = textEl ? window.getComputedStyle(textEl) : null
      
      return {
        index: idx,
        className: btn.className,
        buttonColor: computedStyle.color,
        buttonBg: computedStyle.backgroundColor,
        buttonToken: computedStyle.getPropertyValue('--taskbar-btn-text'),
        textColor: textComputedStyle?.color || 'N/A',
        textToken: textComputedStyle?.getPropertyValue('--taskbar-btn-text') || 'N/A',
        hasInlineStyle: btn.hasAttribute('style'),
        textHasInlineStyle: textEl?.hasAttribute('style') || false
      }
    })
    
    if (import.meta.env.DEV) {
      fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Taskbar.jsx:useEffect',message:'Theme state and taskbar button computed styles',data:{themeAttr,accentAttr,taskbarButtonCount:taskbarButtons.length,buttonData,htmlClasses:htmlEl.className},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
  }, [allWindows])
  // #endregion
  
  // Check if Wojak Generator window is open and active
  const wojakGeneratorWindow = allWindows.find(w => w.id === 'wojak-generator')
  const isWojakGeneratorActive = wojakGeneratorWindow ? isWindowActive('wojak-generator') : false
  const isWojakGeneratorMinimized = wojakGeneratorWindow ? isWindowMinimized('wojak-generator') : false
  
  const handleWojakGeneratorClick = () => {
    if (wojakGeneratorWindow) {
      // Window exists - restore or bring to front
      if (isWojakGeneratorMinimized) {
        restoreWindow('wojak-generator')
      } else {
        bringToFront('wojak-generator')
      }
    } else {
      // Window doesn't exist - open it
      if (onOpenWojakGenerator) {
        onOpenWojakGenerator()
      }
    }
    setStartMenuOpen(false)
  }

  const shouldShowStartHint =
    !autoHintDismissed && (isAutoHintVisible || isStartHovered)

  return (
    <>
      <nav className="taskbar" role="toolbar" aria-label="Application toolbar">
        <button 
          className="start-button"
          ref={startButtonRef}
          onClick={handleStartClick}
          onMouseEnter={handleStartHoverIn}
          onMouseLeave={handleStartHoverOut}
          onMouseDown={(e) => e.stopPropagation()}
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
        <div className="taskbar-tray" role="group" aria-label="Open windows">
          {allWindows.map((window, index) => {
            const minimized = isWindowMinimized(window.id)
            const active = isWindowActive(window.id)
            const iconPath = getWindowIcon(window.id, window.title)
            
            return (
              <button
                key={window.id}
                className={`taskbar-window-button ${minimized ? 'minimized' : ''} ${active ? 'active' : ''}`}
                onClick={() => handleWindowClick(window.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleWindowClick(window.id)
                  }
                  // Arrow key navigation
                  if (e.key === 'ArrowLeft' && index > 0) {
                    e.preventDefault()
                    const prevButton = document.querySelectorAll('.taskbar-window-button')[index - 1]
                    prevButton?.focus()
                  }
                  if (e.key === 'ArrowRight' && index < allWindows.length - 1) {
                    e.preventDefault()
                    const nextButton = document.querySelectorAll('.taskbar-window-button')[index + 1]
                    nextButton?.focus()
                  }
                  if (e.key === 'ArrowLeft' && index === 0) {
                    e.preventDefault()
                    startButtonRef.current?.focus()
                  }
                }}
                aria-label={`${window.title} - ${minimized ? 'Restore' : 'Activate'}`}
                title={window.title}
                tabIndex={0}
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
        <div className="taskbar-system-tray">
          {!isOnline && (
            <div
              className="system-tray-icon"
              title="Offline"
              aria-label="Offline"
              style={{ cursor: 'default', opacity: 0.7 }}
            >
              ⚠️
            </div>
          )}
          <button
            className="system-tray-icon"
            onClick={handleMuteToggle}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
        <div 
          ref={clockRef}
          className="taskbar-clock" 
          role="timer" 
          aria-live="polite" 
          aria-label="Current time"
          onClick={onClockClick || undefined}
          style={onClockClick ? { cursor: 'pointer' } : undefined}
        >
          {formatTime(currentTime)}
        </div>
      </nav>
      {shouldShowStartHint && startHintPosition && createPortal(
        <div
          className="start-tip-overlay start-tip-overlay-visible"
          style={{
            top: `${startHintPosition.top}px`,
            left: `${startHintPosition.left}px`,
          }}
          aria-hidden="true"
        >
          <div className="start-tip-bubble">
            <span className="start-tip-text">Click Start to navigate the website.</span>
          </div>
        </div>,
        document.body
      )}
      <StartMenu 
        isOpen={startMenuOpen} 
        onClose={handleCloseStartMenu}
        onOpenPaint={() => {
          window.dispatchEvent(new CustomEvent('openPaintWindow'))
          setStartMenuOpen(false)
        }}
        onOpenWojakGenerator={onOpenWojakGenerator}
        onOpenApp={onOpenApp}
        menuRef={startMenuRef}
        startButtonRef={startButtonRef}
      />
    </>
  )
}

