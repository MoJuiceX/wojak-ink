import { useRef, useEffect, useState } from 'react'
import Window from './Window'
import { useOrangeToy } from '../../contexts/OrangeToyContext'
import { useWindow } from '../../contexts/WindowContext'
import OrangeGlassWindow from '../orange/OrangeGlassWindow'

export default function TangGangWindow({ onClose }) {
  const { 
    score, 
    requiredScore, 
    canClaim, 
    claimsCount,
    claimPrize, 
    spawnOrange,
    orangeExistsRef 
  } = useOrangeToy()
  
  const { updateWindowPosition, getWindow, isWindowMinimized, hasUserMoved } = useWindow()
  
  const floatVelocityRef = useRef({ 
    vx: 0.3 + Math.random() * 0.2, // 0.3-0.5
    vy: 0.2 + Math.random() * 0.2  // 0.2-0.4
  })
  const floatIntervalRef = useRef(null)
  const userDraggedRef = useRef(false)
  const dragPauseTimeoutRef = useRef(null)
  const hasSpawnedRef = useRef(false)
  const prevHasUserMovedRef = useRef(false)

  // Spawn orange on first open if none exists
  useEffect(() => {
    if (!hasSpawnedRef.current && (!orangeExistsRef || !orangeExistsRef.current)) {
      spawnOrange()
      hasSpawnedRef.current = true
    }
  }, [spawnOrange, orangeExistsRef])

  // Floating behavior
  useEffect(() => {
    const isMinimized = isWindowMinimized('tanggang')
    if (isMinimized) {
      // Pause floating when minimized
      if (floatIntervalRef.current) {
        clearInterval(floatIntervalRef.current)
        floatIntervalRef.current = null
      }
      return
    }

    // Don't float if user just dragged
    if (userDraggedRef.current) {
      return
    }

    // Start floating animation
    floatIntervalRef.current = setInterval(() => {
      // Check for user drag detection
      const currentHasUserMoved = hasUserMoved.get('tanggang') || false
      if (!prevHasUserMovedRef.current && currentHasUserMoved) {
        // User just dragged - pause floating
        userDraggedRef.current = true
        if (dragPauseTimeoutRef.current) {
          clearTimeout(dragPauseTimeoutRef.current)
        }
        dragPauseTimeoutRef.current = setTimeout(() => {
          userDraggedRef.current = false
        }, 4000) // 4 seconds
      }
      prevHasUserMovedRef.current = currentHasUserMoved

      // Don't continue if user just dragged (pause was set above)
      if (userDraggedRef.current) {
        return
      }

      const windowData = getWindow('tanggang')
      if (!windowData || !windowData.position) return

      const currentX = windowData.position.x
      const currentY = windowData.position.y
      const velocity = floatVelocityRef.current

      // Get window size from DOM or windowData
      const windowElement = document.getElementById('tanggang')
      let windowWidth = 400 // Default fallback
      let windowHeight = 300 // Default fallback

      if (windowElement) {
        const rect = windowElement.getBoundingClientRect()
        if (rect.width > 0) windowWidth = rect.width
        if (rect.height > 0) windowHeight = rect.height
      } else if (windowData.size) {
        // Fallback to stored size
        if (typeof windowData.size.width === 'number') {
          windowWidth = windowData.size.width
        } else if (typeof windowData.size.width === 'string' && windowData.size.width.includes('px')) {
          windowWidth = parseInt(windowData.size.width, 10) || 400
        }
        if (typeof windowData.size.height === 'number') {
          windowHeight = windowData.size.height
        } else if (typeof windowData.size.height === 'string' && windowData.size.height.includes('px')) {
          windowHeight = parseInt(windowData.size.height, 10) || 300
        }
      }

      // Get taskbar height
      const rootStyle = getComputedStyle(document.documentElement)
      const taskbarHeight = parseFloat(rootStyle.getPropertyValue('--taskbar-height')) || 48
      const padding = 8

      // Calculate new position
      let newX = currentX + velocity.vx
      let newY = currentY + velocity.vy

      // Calculate viewport bounds (clamp to [0, max])
      const minX = 0
      const minY = 0
      const maxX = window.innerWidth - windowWidth
      const maxY = window.innerHeight - taskbarHeight - windowHeight

      // Clamp position to viewport bounds
      newX = Math.max(minX, Math.min(maxX, newX))
      newY = Math.max(minY, Math.min(maxY, newY))

      // Bounce off edges (detect when hitting padding zone)
      if (newX <= padding || newX >= maxX - padding) {
        velocity.vx = -velocity.vx
        // Re-clamp after bounce to prevent going offscreen
        newX = Math.max(minX, Math.min(maxX, newX))
      }

      if (newY <= padding || newY >= maxY - padding) {
        velocity.vy = -velocity.vy
        // Re-clamp after bounce to prevent going offscreen
        newY = Math.max(minY, Math.min(maxY, newY))
      }

      // Update window position
      updateWindowPosition('tanggang', { x: newX, y: newY })
    }, 40) // ~40ms interval

    return () => {
      if (floatIntervalRef.current) {
        clearInterval(floatIntervalRef.current)
        floatIntervalRef.current = null
      }
      if (dragPauseTimeoutRef.current) {
        clearTimeout(dragPauseTimeoutRef.current)
      }
    }
  }, [updateWindowPosition, getWindow, isWindowMinimized, hasUserMoved])

  // Handle window resize - re-clamp position to new viewport bounds
  useEffect(() => {
    const handleResize = () => {
      const windowData = getWindow('tanggang')
      if (!windowData || !windowData.position) return

      const windowElement = document.getElementById('tanggang')
      let windowWidth = 400 // Default fallback
      let windowHeight = 300 // Default fallback

      if (windowElement) {
        const rect = windowElement.getBoundingClientRect()
        if (rect.width > 0) windowWidth = rect.width
        if (rect.height > 0) windowHeight = rect.height
      } else if (windowData.size) {
        // Fallback to stored size
        if (typeof windowData.size.width === 'number') {
          windowWidth = windowData.size.width
        } else if (typeof windowData.size.width === 'string' && windowData.size.width.includes('px')) {
          windowWidth = parseInt(windowData.size.width, 10) || 400
        }
        if (typeof windowData.size.height === 'number') {
          windowHeight = windowData.size.height
        } else if (typeof windowData.size.height === 'string' && windowData.size.height.includes('px')) {
          windowHeight = parseInt(windowData.size.height, 10) || 300
        }
      }

      // Get taskbar height
      const rootStyle = getComputedStyle(document.documentElement)
      const taskbarHeight = parseFloat(rootStyle.getPropertyValue('--taskbar-height')) || 48

      // Calculate viewport bounds
      const minX = 0
      const minY = 0
      const maxX = window.innerWidth - windowWidth
      const maxY = window.innerHeight - taskbarHeight - windowHeight

      // Clamp current position to new viewport bounds
      const currentX = windowData.position.x
      const currentY = windowData.position.y
      const clampedX = Math.max(minX, Math.min(maxX, currentX))
      const clampedY = Math.max(minY, Math.min(maxY, currentY))

      // Only update if position changed (avoid unnecessary updates)
      if (clampedX !== currentX || clampedY !== currentY) {
        updateWindowPosition('tanggang', { x: clampedX, y: clampedY })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [getWindow, updateWindowPosition])

  const handleClaimPrize = () => {
    claimPrize()
  }

  return (
    <Window
      id="tanggang"
      title="🍊 TangGang"
      icon={null}
      noStack={true}
      style={{ 
        // Don't set left/top - let centerOnOpen handle positioning
        width: 'var(--window-size-tanggang)',
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)',
        minHeight: '300px', // Stable height for accurate centering
        height: 'auto'
      }}
      onClose={onClose}
    >
      <div>
        <div className="hoa-logo-wrapper">
          <img
            src="https://bafybeihbaqn7omk55qi3vfrht76qa53kz4dx75anzwtjkcggi2v3jql4tm.ipfs.w3s.link/?filename=HOA+logo.png"
            alt="TangGang"
            className="hoa-logo-img"
          />
          <div className="hoa-glass-overlay" aria-hidden="true">
            <OrangeGlassWindow variant="overlay" />
          </div>
        </div>
        <div style={{ padding: '12px', textAlign: 'center' }}>
          {canClaim && (
            <button 
              onClick={handleClaimPrize}
              style={{
                background: '#c0c0c0',
                border: '2px outset #c0c0c0',
                padding: '8px 16px',
                fontFamily: "'MS Sans Serif', sans-serif",
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Claim Prize
            </button>
          )}
        </div>
      </div>
    </Window>
  )
}
