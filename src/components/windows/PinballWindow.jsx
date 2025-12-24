import { useState, useRef, useEffect } from 'react'
import Window from './Window'
import { useWindow } from '../../contexts/WindowContext'

export default function PinballWindow({ onClose }) {
  const iframeRef = useRef(null)
  const gameContainerRef = useRef(null)
  const rowContainerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMobileOverlay, setShowMobileOverlay] = useState(false)
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 })
  const [showControlsPopup, setShowControlsPopup] = useState(false)
  const { isWindowActive, getWindow } = useWindow()
  const windowId = 'pinball-window'
  const windowData = getWindow(windowId)
  const isActive = windowData ? isWindowActive(windowId) : false

  // Status bar height constant
  const STATUS_BAR_HEIGHT = 26

  // Check if mobile on mount
  useEffect(() => {
    if (window.innerWidth <= 640) {
      setShowMobileOverlay(true)
    }
  }, [])

  // Show controls popup on first open (if not dismissed)
  useEffect(() => {
    const helpDismissed = localStorage.getItem('pinballHelpDismissed')
    if (helpDismissed !== 'true') {
      setShowControlsPopup(true)
    }
  }, [])

  // Track game area container dimensions with ResizeObserver (row container excludes status bar)
  useEffect(() => {
    const container = rowContainerRef.current
    if (!container) return

    // Initialize size from current dimensions
    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      setWrapperSize({ width: rect.width, height: rect.height })
    }

    // Initial measurement
    updateSize()

    // Use ResizeObserver if available
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          setWrapperSize({ width, height })
        }
      })
      observer.observe(container)
      return () => observer.disconnect()
    } else {
      // Fallback to window resize listener
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }
  }, [])

  // Force layout recalculation when controls panel visibility changes
  useEffect(() => {
    if (rowContainerRef.current) {
      // Force a reflow to ensure flex layout recalculates
      requestAnimationFrame(() => {
        if (rowContainerRef.current) {
          rowContainerRef.current.offsetHeight // Force reflow
        }
      })
    }
  }, [showControlsPopup])

  // #region agent log
  // Debug: Log layout information when controls panel visibility changes
  useEffect(() => {
    if (!rowContainerRef.current) return
    
    const logLayout = () => {
      const rowContainer = rowContainerRef.current
      if (!rowContainer) return
      
      const rowRect = rowContainer.getBoundingClientRect()
      const rowStyles = window.getComputedStyle(rowContainer)
      
      const gameArea = rowContainer.querySelector('[style*="flex:"]')
      let gameRect = null
      let gameStyles = null
      if (gameArea) {
        gameRect = gameArea.getBoundingClientRect()
        gameStyles = window.getComputedStyle(gameArea)
      }
      
      const controlsPanel = rowContainer.querySelector('[style*="flex: 0 0 240px"]')
      let controlsRect = null
      let controlsStyles = null
      if (controlsPanel) {
        controlsRect = controlsPanel.getBoundingClientRect()
        controlsStyles = window.getComputedStyle(controlsPanel)
      }
      
      const logData = {
        location: 'PinballWindow.jsx:useEffect:layout',
        message: 'Layout debug - controls panel visibility changed',
        data: {
          showControlsPopup,
          rowContainer: {
            width: rowRect.width,
            height: rowRect.height,
            left: rowRect.left,
            top: rowRect.top,
            display: rowStyles.display,
            flexDirection: rowStyles.flexDirection,
            position: rowStyles.position,
          },
          gameArea: gameRect ? {
            width: gameRect.width,
            height: gameRect.height,
            left: gameRect.left,
            top: gameRect.top,
            right: gameRect.right,
            flex: gameStyles?.flex,
            position: gameStyles?.position,
            maxWidth: gameStyles?.maxWidth,
          } : null,
          controlsPanel: controlsRect ? {
            width: controlsRect.width,
            height: controlsRect.height,
            left: controlsRect.left,
            top: controlsRect.top,
            right: controlsRect.right,
            flex: controlsStyles?.flex,
            position: controlsStyles?.position,
            zIndex: controlsStyles?.zIndex,
          } : null,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A,B,C,D,E',
      }
      if (import.meta.env.DEV) {
        console.log('[DEBUG]', logData)
        fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logData),
        }).catch((err) => console.error('[DEBUG] Fetch failed:', err))
      }
    }
    
    // Log after a small delay to ensure DOM is updated
    const timeoutId = setTimeout(logLayout, 100)
    return () => clearTimeout(timeoutId)
  }, [showControlsPopup])
  // #endregion

  // Focus iframe when window becomes active (best-effort, cross-origin safe)
  useEffect(() => {
    if (isActive && iframeRef.current) {
      try {
        // Small delay to ensure iframe is ready
        const timeoutId = setTimeout(() => {
          if (iframeRef.current) {
            // Use iframe element focus (cross-origin safe)
            iframeRef.current.focus()
          }
        }, 50)
        return () => clearTimeout(timeoutId)
      } catch (error) {
        // Cross-origin iframe may not allow focus
        console.debug('Could not focus pinball iframe:', error)
      }
    }
  }, [isActive])

  // Handle fullscreen API with browser compatibility
  const requestFullscreen = (element) => {
    if (element.requestFullscreen) {
      return element.requestFullscreen()
    } else if (element.webkitRequestFullscreen) {
      return element.webkitRequestFullscreen()
    } else if (element.mozRequestFullScreen) {
      return element.mozRequestFullScreen()
    } else if (element.msRequestFullscreen) {
      return element.msRequestFullscreen()
    }
    return Promise.reject(new Error('Fullscreen API not supported'))
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      return document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen()
    } else if (document.mozCancelFullScreen) {
      return document.mozCancelFullScreen()
    } else if (document.msExitFullscreen) {
      return document.msExitFullscreen()
    }
    return Promise.reject(new Error('Fullscreen API not supported'))
  }

  const getFullscreenElement = () => {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    )
  }

  // Handle fullscreen button click
  const handleFullscreen = async () => {
    const container = gameContainerRef.current
    if (!container) return

    try {
      if (isFullscreen) {
        await exitFullscreen()
      } else {
        await requestFullscreen(container)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
      // User interaction required or browser restrictions
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = getFullscreenElement()
      setIsFullscreen(fullscreenElement === gameContainerRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  return (
    <Window
      id={windowId}
      title="3D Pinball for Windows - Space Cadet"
      style={{
        width: '1024px',
        height: '768px',
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)',
        minHeight: 'var(--window-min-height)',
      }}
      onClose={onClose}
    >
      {/* Outer column container for window client area */}
      <div
        ref={gameContainerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Fullscreen button - positioned to appear in top-right of window body */}
        <button
          onClick={handleFullscreen}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.currentTarget.style.border = '1px inset var(--border-dark)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.border = '1px outset var(--border-light)'
          }}
          onMouseEnter={(e) => {
            if (e.buttons === 0) {
              e.currentTarget.style.border = '1px outset var(--border-light)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = '1px outset var(--border-light)'
          }}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            zIndex: 1000,
            width: '20px',
            height: '20px',
            border: '1px outset var(--border-light)',
            background: 'var(--btn-face)',
            color: 'var(--btn-text)',
            cursor: 'pointer',
            fontFamily: "'MS Sans Serif', sans-serif",
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            pointerEvents: 'auto',
          }}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? '⤓' : '⤢'}
        </button>

        {/* Row container for game + controls - ResizeObserver target */}
        <div
          ref={(el) => {
            rowContainerRef.current = el
            // #region agent log
            if (el) {
              setTimeout(() => {
                const rect = el.getBoundingClientRect()
                const styles = window.getComputedStyle(el)
            const logData = {
              location: 'PinballWindow.jsx:rowContainerRef',
              message: 'Row container mounted',
              data: {
                width: rect.width,
                height: rect.height,
                computedDisplay: styles.display,
                computedFlexDirection: styles.flexDirection,
                computedPosition: styles.position,
                computedWidth: styles.width,
                inlineStyle: el.getAttribute('style'),
                showControlsPopup,
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'A',
            }
            console.log('[DEBUG]', logData)
            fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(logData),
            }).catch((err) => console.error('[DEBUG] Fetch failed:', err))
              }, 50)
            }
            // #endregion
          }}
          style={{
            flex: '1 1 0%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
            minWidth: 0,
            minHeight: 0,
            boxSizing: 'border-box',
          }}
        >
          {/* Game area - flex: 1 to fill remaining space */}
          <div
            ref={(el) => {
              // #region agent log
              if (el) {
                setTimeout(() => {
                  const rect = el.getBoundingClientRect()
                  const styles = window.getComputedStyle(el)
                  const logData = {
                    location: 'PinballWindow.jsx:gameAreaRef',
                    message: 'Game area mounted',
                    data: {
                      width: rect.width,
                      height: rect.height,
                      left: rect.left,
                      right: rect.right,
                      computedFlex: styles.flex,
                      computedPosition: styles.position,
                      computedMaxWidth: styles.maxWidth,
                      computedWidth: styles.width,
                    },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'run1',
                    hypothesisId: 'C',
                  }
                  console.log('[DEBUG]', logData)
                  fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logData),
                  }).catch((err) => console.error('[DEBUG] Fetch failed:', err))
                }, 50)
              }
              // #endregion
            }}
            onMouseDown={(e) => {
              // Focus iframe when clicking game area (cross-origin safe)
              if (iframeRef.current) {
                iframeRef.current.focus()
              }
            }}
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              height: '100%',
              overflow: 'hidden',
              background: '#000',
              position: 'relative',
              pointerEvents: 'auto',
              boxSizing: 'border-box',
              order: 1,
            }}
          >
            {/* Mobile overlay */}
            {showMobileOverlay && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1002,
                  color: 'var(--text-inverse)',
                  fontFamily: "'MS Sans Serif', sans-serif",
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    background: 'var(--panel-face)',
                    border: '2px outset var(--border-light)',
                    padding: '20px',
                    color: 'var(--text)',
                    maxWidth: '300px',
                  }}
                >
                  <p className="helper-text" style={{ margin: '0 0 16px 0' }}>
                    Best on desktop (keyboard)
                  </p>
                  <button
                    onClick={() => setShowMobileOverlay(false)}
                    onMouseDown={(e) => {
                      e.currentTarget.style.border = '2px inset var(--border-dark)'
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.border = '2px outset var(--border-light)'
                    }}
                    style={{
                      border: '2px outset var(--border-light)',
                      background: 'var(--btn-face)',
                      color: 'var(--btn-text)',
                      padding: '4px 12px',
                      fontFamily: "'MS Sans Serif', sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    Open anyway
                  </button>
                </div>
              </div>
            )}

            {/* Controls button - shows when panel is closed */}
            {!showControlsPopup && (
              <button
                onClick={() => setShowControlsPopup(true)}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.currentTarget.style.border = '1px inset var(--border-dark)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.border = '1px outset var(--border-light)'
                }}
                onMouseEnter={(e) => {
                  if (e.buttons === 0) {
                    e.currentTarget.style.border = '1px outset var(--border-light)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px outset var(--border-light)'
                }}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  zIndex: 100,
                  background: 'var(--btn-face)',
                  color: 'var(--btn-text)',
                  border: '1px outset var(--border-light)',
                  fontFamily: "'MS Sans Serif', sans-serif",
                  padding: '2px 8px',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                Controls
              </button>
            )}

            {/* Compute dynamic zoom (width + height aware) */}
          {(() => {
            const ENABLE_ZOOM = true
            const BASE_ZOOM = 1.40
            const TOP_CROP_PX = 64 // tweakable (start 58–72)
            const w = wrapperSize.width || 0
            const h = wrapperSize.height || 0

            const extraW = Math.min(0.25, Math.max(0, (w - 900) / 2000))
            const extraH = Math.min(0.25, Math.max(0, (h - 650) / 1500))

            const zoomW = BASE_ZOOM + extraW
            const zoomH = BASE_ZOOM + extraH

            const ZOOM = ENABLE_ZOOM
              ? Math.min(1.5, Math.max(1.1, Math.min(zoomW, zoomH)))
              : 1

            return (
              <iframe
                ref={iframeRef}
                src="https://pinball.alula.me/"
                style={{
                  transform: `translateY(-${TOP_CROP_PX}px) scale(${ZOOM})`,
                  transformOrigin: '0 0',
                  width: `calc(100% / ${ZOOM})`,
                  height: `calc((100% + ${TOP_CROP_PX}px) / ${ZOOM})`,
                  border: 0,
                  display: 'block',
                  pointerEvents: 'auto',
                }}
                title="3D Pinball for Windows - Space Cadet"
                allow="fullscreen; gamepad; autoplay"
              />
            )
          })()}
          </div>

          {/* Controls panel - right side Win98 panel */}
          {showControlsPopup && (
            <div
              ref={(el) => {
                // #region agent log
                if (el) {
                  setTimeout(() => {
                    const rect = el.getBoundingClientRect()
                    const styles = window.getComputedStyle(el)
                    const rowContainer = rowContainerRef.current
                    const rowRect = rowContainer?.getBoundingClientRect()
                    const logData = {
                      location: 'PinballWindow.jsx:controlsPanelRef',
                      message: 'Controls panel mounted',
                      data: {
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom,
                        computedFlex: styles.flex,
                        computedPosition: styles.position,
                        computedZIndex: styles.zIndex,
                        computedWidth: styles.width,
                        rowContainerWidth: rowRect?.width,
                        rowContainerLeft: rowRect?.left,
                        rowContainerRight: rowRect?.right,
                        isOverlapping: rowRect ? (rect.left < rowRect.left || rect.right > rowRect.right) : null,
                      },
                      timestamp: Date.now(),
                      sessionId: 'debug-session',
                      runId: 'run1',
                      hypothesisId: 'B,D,E',
                    }
                    console.log('[DEBUG]', logData)
                    fetch('http://127.0.0.1:7243/ingest/caaf9dd8-e863-4d9c-b151-a370d047a715', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(logData),
                    }).catch((err) => console.error('[DEBUG] Fetch failed:', err))
                  }, 50)
                }
                // #endregion
              }}
              style={{
                width: '240px',
                flex: '0 0 240px',
                flexShrink: 0,
                flexGrow: 0,
                height: '100%',
                background: 'var(--panel-face)',
                border: '2px outset var(--border-light)',
                borderLeft: '1px inset var(--border-dark)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'MS Sans Serif', sans-serif",
                color: 'var(--text)',
                position: 'relative',
                order: 2,
              }}
            >
              {/* Header */}
              <div
                className="panel-header"
                style={{
                  background: 'var(--title-active-bg)',
                  color: 'var(--title-active-text)',
                  padding: '6px 8px',
                  fontWeight: 'bold',
                }}
              >
                Controls
              </div>

              {/* Body text */}
              <div
                style={{
                  padding: '12px',
                  lineHeight: '1.6',
                  flex: 1,
                  color: 'var(--text)',
                }}
              >
                <div style={{ marginBottom: '8px' }}>Left flipper: Left Shift or Z</div>
                <div style={{ marginBottom: '8px' }}>Right flipper: Right Shift or /</div>
                <div style={{ marginBottom: '8px' }}>Plunger: Space</div>
                <div style={{ marginBottom: '8px' }}>Nudge: Arrow keys</div>
                <div style={{ marginBottom: '8px' }}>Pause: P</div>
                <div style={{ marginBottom: '8px' }}>Exit: Esc</div>
              </div>

              {/* Buttons */}
              <div
                style={{
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <button
                  onClick={() => {
                    setShowControlsPopup(false)
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.border = '2px inset var(--border-dark)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.border = '2px outset var(--border-light)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '2px outset var(--border-light)'
                  }}
                  style={{
                    border: '2px outset var(--border-light)',
                    background: 'var(--btn-face)',
                    color: 'var(--btn-text)',
                    padding: '4px 16px',
                    fontFamily: "'MS Sans Serif', sans-serif",
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  OK
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('pinballHelpDismissed', 'true')
                    setShowControlsPopup(false)
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.border = '2px inset var(--border-dark)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.border = '2px outset var(--border-light)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '2px outset var(--border-light)'
                  }}
                  style={{
                    border: '2px outset var(--border-light)',
                    background: 'var(--btn-face)',
                    color: 'var(--btn-text)',
                    padding: '4px 16px',
                    fontFamily: "'MS Sans Serif', sans-serif",
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Don't show again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Win98-style controls/status bar at bottom - normal flow */}
        <div
          style={{
            height: `${STATUS_BAR_HEIGHT}px`,
            flexShrink: 0,
            background: 'var(--window-face)',
            borderTop: '1px inset var(--border-dark)',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '8px',
            paddingRight: '8px',
            fontFamily: "'MS Sans Serif', sans-serif",
            color: 'var(--text)',
          }}
        >
          <span style={{ whiteSpace: 'nowrap' }}>
            Controls: Left flipper = Left Shift/Z | Right flipper = Right Shift/ / | Plunger = Space | Nudge = Arrow keys | Pause = P | Exit = Esc
          </span>
        </div>
      </div>
    </Window>
  )
}

