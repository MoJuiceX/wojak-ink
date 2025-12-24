import { useState, useEffect, useRef, useCallback } from 'react'
import './Screensaver.css'

import { playSound } from '../utils/soundManager'

const EMOJIS = ['🍊', '🍋', '🥤', '🌴', '☀️', '🧡', '🔶', '🟠', '🌅', '🏝️']

// Calculate emoji count based on screen size
const getEmojiCount = () => {
  const width = window.innerWidth
  if (width < 768) return 8   // Mobile
  if (width < 1200) return 12 // Tablet
  return 20                    // Desktop
}

export default function Screensaver({ 
  idleTimeout: propIdleTimeout = 120000, // 2 minutes default
  disabled = false,
  onDismiss 
}) {
  const [isActive, setIsActive] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [oranges, setOranges] = useState([])
  const animationRef = useRef(null)
  const timeoutRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const [emojiCount, setEmojiCount] = useState(getEmojiCount)
  
  // Get screensaver timeout from localStorage, fallback to prop
  const getIdleTimeout = () => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('screensaverTimeout')
        if (stored) {
          const timeout = parseInt(stored, 10)
          return timeout > 0 ? timeout : null // null means disabled
        }
      }
    } catch (e) {
      // localStorage not available
    }
    return propIdleTimeout
  }
  
  const [idleTimeout, setIdleTimeout] = useState(() => getIdleTimeout())
  
  // Check user preference to disable screensaver
  const [userDisabled, setUserDisabled] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('screensaverDisabled') === 'true'
      }
    } catch (e) {
      // localStorage not available
    }
    return false
  })
  
  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = () => {
      const newTimeout = getIdleTimeout()
      setIdleTimeout(newTimeout)
      setUserDisabled(localStorage.getItem('screensaverDisabled') === 'true')
      // Reset timer if settings changed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (!isActive && !disabled && !userDisabled && newTimeout) {
        lastActivityRef.current = Date.now()
        timeoutRef.current = setTimeout(() => {
          const timeSinceActivity = Date.now() - lastActivityRef.current
          if (timeSinceActivity >= newTimeout && !disabled && !userDisabled) {
            setIsActive(true)
          }
        }, newTimeout)
      }
    }
    
    window.addEventListener('screensaverSettingsChanged', handleSettingsChange)
    return () => window.removeEventListener('screensaverSettingsChanged', handleSettingsChange)
  }, [isActive, disabled, userDisabled])
  
  // Combine disabled prop with user preference
  const isDisabled = disabled || userDisabled || !idleTimeout

  // Update emoji count on window resize
  useEffect(() => {
    const handleResize = () => {
      setEmojiCount(getEmojiCount())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Initialize oranges with random positions, velocities, rotations, sizes, and emojis
  // Ensure oranges start within viewport bounds
  const initializeOranges = useCallback(() => {
    const oranges = []
    const viewWidth = window.innerWidth
    const viewHeight = window.innerHeight
    const count = getEmojiCount()
    
    for (let i = 0; i < count; i++) {
      const size = 40 + Math.random() * 40
      const maxX = Math.max(0, viewWidth - size)
      const maxY = Math.max(0, viewHeight - size)
      
      oranges.push({
        id: i,
        x: Math.random() * maxX,
        y: Math.random() * maxY,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
        size: size,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      })
    }
    
    return oranges
  }, [])

  // Reset timer function
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    lastActivityRef.current = Date.now()
    
    if (!isDisabled && idleTimeout) {
      timeoutRef.current = setTimeout(() => {
        const timeSinceActivity = Date.now() - lastActivityRef.current
        if (timeSinceActivity >= idleTimeout && !isDisabled && idleTimeout) {
          setIsActive(true)
        }
      }, idleTimeout)
    }
  }, [idleTimeout, isDisabled])

  // Track user activity and manage idle timeout
  useEffect(() => {
    if (isDisabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (isActive) {
        setIsActive(false)
        setShowHint(false)
      }
      return
    }

    // Only track these events - DO NOT track scroll or visibilitychange
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart']
    
    const handleActivity = () => {
      // If screensaver is active, don't reset timer - just let dismiss handlers take care of it
      if (isActive) {
        return
      }
      // Otherwise, reset the timer
      resetTimer()
    }

    // Initial timer setup
    resetTimer()

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [disabled, resetTimer])

  // Initialize oranges when screensaver becomes active
  useEffect(() => {
    if (isActive) {
      const initialOranges = initializeOranges()
      setOranges(initialOranges)
      setShowHint(false) // Reset hint when screensaver activates
      setIsDismissing(false) // Reset dismiss state
      
      // Play activation sound (optional - screensaver activation is usually silent)
    } else {
      setOranges([])
      setShowHint(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isActive, initializeOranges])

  // Show hint after 2 seconds of screensaver being active
  useEffect(() => {
    if (isActive) {
      const hintTimeout = setTimeout(() => {
        setShowHint(true)
      }, 2000)
      return () => clearTimeout(hintTimeout)
    } else {
      setShowHint(false)
    }
  }, [isActive])

  // Pause animation when tab is hidden
  useEffect(() => {
    if (!isActive) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause animation by canceling the current frame
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
      }
      // Animation will automatically resume when tab becomes visible
      // because the main animation loop checks !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive])

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    if (!isActive || oranges.length === 0 || document.hidden) return

    const animate = () => {
      setOranges(prevOranges => {
        return prevOranges.map(orange => {
          let { x, y, vx, vy, rotation, rotationSpeed, size } = orange
          
          // Update position
          x += vx
          y += vy
          rotation += rotationSpeed
          
          // Bounce off screen edges
          if (x <= 0 || x >= window.innerWidth - size) {
            vx *= -1
            x = Math.max(0, Math.min(window.innerWidth - size, x))
          }
          if (y <= 0 || y >= window.innerHeight - size) {
            vy *= -1
            y = Math.max(0, Math.min(window.innerHeight - size, y))
          }
          
          return {
            ...orange,
            x,
            y,
            vx,
            vy,
            rotation,
          }
        })
      })
      
      if (!document.hidden) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    if (!document.hidden) {
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isActive, oranges.length])

  // Handle window resize - recalculate orange positions and handle rapid resizing
  useEffect(() => {
    if (!isActive) return

    let resizeTimeout
    const handleResize = () => {
      // Debounce rapid window resizing
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        setOranges(prevOranges => {
          const viewWidth = window.innerWidth
          const viewHeight = window.innerHeight
          
          return prevOranges.map(orange => {
            // Keep oranges within bounds
            const maxX = Math.max(0, viewWidth - orange.size)
            const maxY = Math.max(0, viewHeight - orange.size)
            
            // If orange is out of bounds, reposition it
            let newX = Math.min(Math.max(0, orange.x), maxX)
            let newY = Math.min(Math.max(0, orange.y), maxY)
            
            // If completely out of bounds, reposition randomly
            if (newX !== orange.x && Math.abs(newX - orange.x) > orange.size) {
              newX = Math.random() * maxX
            }
            if (newY !== orange.y && Math.abs(newY - orange.y) > orange.size) {
              newY = Math.random() * maxY
            }
            
            return {
              ...orange,
              x: newX,
              y: newY,
            }
          })
        })
      }, 100) // Debounce resize handling
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [isActive])

  // Handle dismiss - memoized to prevent recreation
  const handleDismiss = useCallback(() => {
    if (!isActive) return // Only dismiss if active
    
    playSound('click')
    setIsActive(false)
    setShowHint(false)
    lastActivityRef.current = Date.now()
    // Reset timer after dismissing
    resetTimer()
    if (onDismiss) {
      onDismiss()
    }
  }, [isActive, onDismiss, resetTimer])

  // Handle keyboard dismissal - ignore modifier keys only
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e) => {
      // Ignore modifier keys only (Control, Alt, Shift, Meta)
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return
      }
      handleDismiss()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, handleDismiss])

  // Dismiss on mouse/touch interaction
  useEffect(() => {
    if (!isActive) return

    const events = ['mousedown', 'mousemove', 'touchstart', 'click']
    events.forEach(event => {
      window.addEventListener(event, handleDismiss, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleDismiss)
      })
    }
  }, [isActive, handleDismiss])

  // Remove duplicate handleDismiss function

  if (!isActive) return null

  return (
    <div 
      className={`screensaver ${isDismissing ? 'dismissing' : ''}`}
      onClick={handleDismiss} 
      onMouseMove={handleDismiss}
      aria-hidden="true"
    >
      <div className="screensaver-content">
        {/* Floating oranges */}
        {oranges.map(orange => (
          <div
            key={orange.id}
            className="screensaver-orange"
            style={{
              left: orange.x,
              top: orange.y,
              fontSize: orange.size,
              transform: `rotate(${orange.rotation}deg)`,
            }}
          >
            {orange.emoji}
          </div>
        ))}
        
        {/* Bouncing "Tang Gang" text */}
        <div className="screensaver-text">
          🍊 Tang Gang 🍊
        </div>
      </div>
      
      {/* Hint text - only show after 2 seconds */}
      {showHint && (
        <div className="screensaver-hint">
          Click or press any key to return
        </div>
      )}
    </div>
  )
}
