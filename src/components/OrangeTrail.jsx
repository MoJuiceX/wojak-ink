import { useState, useEffect, useRef, useCallback } from 'react'
import TreasureWindow from './windows/TreasureWindow'
import JuiceCanvas from './JuiceCanvas'

/**
 * OrangeTrail component - spawns orange emoji particles when TangGang window is dragged
 */
export default function OrangeTrail() {
  const [particles, setParticles] = useState([])
  const [splashStains, setSplashStains] = useState([])
  const [smashedCount, setSmashedCount] = useState(0) // Always start at 0 (no persistence)
  const [juice, setJuice] = useState(0) // Always start at 0 (no persistence)
  const [prizesClaimed, setPrizesClaimed] = useState(0) // Not persisted (treasure text is fixed)
  const [showTreasureWindow, setShowTreasureWindow] = useState(false)
  const [spawnPaused, setSpawnPaused] = useState(false) // Pause spawning when too many oranges (for UI)
  const spawnPausedRef = useRef(false) // Ref version for animation loop (avoids closure issues)
  const [orangeZIndex, setOrangeZIndex] = useState(500) // Start at 500, will be updated dynamically
  const isDraggingRef = useRef(false)
  const spawnRateRef = useRef(0) // Particles per second
  const lastSpawnTimeRef = useRef(0)
  const windowRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const rafIdRef = useRef(null)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const pickedUpOrangeRef = useRef(null) // Track which orange is currently picked up
  const isMouseDownRef = useRef(false)
  // Ground oranges persist indefinitely - no cap, no fade, only removed by smash
  const MAX_GROUND_ORANGES_ON_GROUND = 120 // Stop spawning when this many oranges are on ground
  const MAX_DROPLETS = 200 // Maximum juice droplets
  const MAX_STAINS = 30 // Maximum splash stains
  const JUICE_MAX = 10000 // Maximum juice capacity
  const LIFT_PX = 40 // Pixels window must be above ground to register as "lifted"
  const SMASH_RADIUS_PX = 160 // Radius around window bottom-center to smash oranges
  
  // Track window position for lift-and-slam detection
  const wasLiftedRef = useRef(false) // True only after window is lifted above ground
  const prevWindowBottomRef = useRef(null) // Previous window bottom Y position
  const lastSlamFrameRef = useRef(0) // Track last frame a slam occurred (prevent multiple slams per frame)

  // Spawn a single orange particle
  const spawnParticle = useCallback(() => {
    const windowRect = windowRectRef.current
    if (!windowRect.width || !windowRect.height) return

    // Random X along the bottom edge of the window
    const randomX = windowRect.x + Math.random() * windowRect.width
    
    // Start slightly behind the window (at the bottom edge)
    const startY = windowRect.y + windowRect.height

    // Random velocity (falling down with some horizontal drift)
    const velocityX = (Math.random() - 0.5) * 2 // -1 to 1
    const velocityY = 0.5 + Math.random() * 1.5 // 0.5 to 2 (falling down)

    // Random rotation speed
    const rotationSpeed = (Math.random() - 0.5) * 4 // -2 to 2 degrees per frame

    // Random initial rotation
    const initialRotation = Math.random() * 360

    const particle = {
      id: Math.random().toString(36).substr(2, 9),
      x: randomX,
      y: startY,
      velocityX,
      velocityY,
      rotation: initialRotation,
      rotationSpeed,
      opacity: 1, // Always fully opaque - no fading
      age: 0,
      hasReachedBottom: false, // Track if particle reached bottom
      isPickedUp: false, // Track if orange is being held
      gravity: 0.15, // Reduced gravity acceleration (was 0.3)
      lastMouseX: 0, // For calculating throw velocity
      lastMouseY: 0,
      radius: 28, // Collision radius for oranges
      bounceCount: 0, // Track bounces
      isBouncing: false // Track if currently bouncing
    }

    setParticles(prev => {
      // Separate oranges from splash droplets
      const oranges = prev.filter(p => !p.isSplash)
      const droplets = prev.filter(p => p.isSplash)
      
      // Add new orange (no cap - ground oranges persist indefinitely)
      const newOranges = [...oranges, particle]
      
      // Limit droplets (these fade out naturally)
      const limitedDroplets = droplets.length > MAX_DROPLETS
        ? droplets.slice(-MAX_DROPLETS)
        : droplets
      
      return [...newOranges, ...limitedDroplets]
    })
  }, [])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now()
      
      // Count ground oranges for spawn gate logic
      const groundOrangesCount = particles.filter(p => !p.isSplash && p.hasReachedBottom).length
      
      // Update spawn paused state (both state for UI and ref for animation loop)
      if (groundOrangesCount >= MAX_GROUND_ORANGES_ON_GROUND) {
        spawnPausedRef.current = true
        setSpawnPaused(true)
      } else if (groundOrangesCount === 0) {
        spawnPausedRef.current = false
        setSpawnPaused(false)
      }
      
      // Spawn particles while dragging (only if not paused)
      if (isDraggingRef.current && spawnRateRef.current > 0 && !spawnPausedRef.current) {
        const timeSinceLastSpawn = now - lastSpawnTimeRef.current
        const spawnInterval = 1000 / spawnRateRef.current // ms between spawns
        
        if (timeSinceLastSpawn >= spawnInterval) {
          spawnParticle()
          lastSpawnTimeRef.current = now
        }
      }

      // Get viewport height for bottom boundary
      const viewportHeight = window.innerHeight
      const taskbarHeight = 30 // Approximate taskbar height
      const bottomBoundary = viewportHeight - taskbarHeight
      
      // Track window position for lift-and-slam detection
      const tanggangWindow = document.getElementById('tanggang')
      if (tanggangWindow) {
        const windowRect = tanggangWindow.getBoundingClientRect()
        const currentWindowBottom = windowRect.bottom
        const windowBottomDistanceFromGround = bottomBoundary - currentWindowBottom
        
        // Check if window is lifted (at least LIFT_PX above ground)
        if (windowBottomDistanceFromGround >= LIFT_PX) {
          wasLiftedRef.current = true
        }
        
        // Track window movement (downward = positive deltaY)
        const prevBottom = prevWindowBottomRef.current
        const deltaY = prevBottom !== null ? currentWindowBottom - prevBottom : 0
        prevWindowBottomRef.current = currentWindowBottom
        
        // Store window movement info for smash detection
        windowRectRef.current.wasLifted = wasLiftedRef.current
        windowRectRef.current.deltaY = deltaY
        windowRectRef.current.currentBottom = currentWindowBottom
      }

      // Update splash stains (fade out over time)
      setSplashStains(prev => {
        return prev
          .map(stain => {
            const newAge = (stain.age || 0) + 16
            const progress = newAge / stain.lifetime
            const opacity = Math.max(0, (stain.opacity || 0.7) * (1 - progress))
            
            if (opacity <= 0 || newAge >= stain.lifetime) {
              return null
            }
            
            return {
              ...stain,
              age: newAge,
              opacity
            }
          })
          .filter(stain => stain !== null)
      })

      // Update existing particles
      setParticles(prev => {
        const bottomBoundary = viewportHeight - taskbarHeight
        const mouseX = mousePosRef.current.x
        const mouseY = mousePosRef.current.y
        
        // Work with a copy of particles
        let currentParticles = [...prev]
        
        // Check if a slam is happening (only once per frame)
        const tanggangWindow = document.getElementById('tanggang')
        let orangesToSmash = []
        let smashCenterX = 0
        let smashCenterY = 0
        
        if (tanggangWindow) {
          const windowRect = tanggangWindow.getBoundingClientRect()
          const wasLifted = windowRectRef.current?.wasLifted || false
          const deltaY = windowRectRef.current?.deltaY || 0
          const isMovingDownward = deltaY > 0
          const canSlam = wasLifted && isMovingDownward
          
          if (canSlam && lastSlamFrameRef.current !== now) {
            // Window bottom-center point for radius check
            const windowBottomCenterX = windowRect.left + windowRect.width / 2
            const windowBottomCenterY = windowRect.bottom
            const windowLeft = windowRect.left
            const windowRight = windowRect.right
            const windowTop = windowRect.top
            const windowBottom = windowRect.bottom
            
            // Collect all oranges that should be smashed
            currentParticles.forEach(particle => {
              if (particle.isPickedUp || particle.isSplash) return
              
              const hasReachedBottom = particle.y >= bottomBoundary || particle.hasReachedBottom
              if (!hasReachedBottom || particle.y < bottomBoundary) return
              
              const orangeCenterX = particle.x
              const orangeCenterY = particle.y
              const orangeRadius = particle.radius || 28
              
              // Check 1: Orange overlaps window rectangle
              const overlapsWindow = orangeCenterX >= windowLeft - orangeRadius &&
                orangeCenterX <= windowRight + orangeRadius &&
                orangeCenterY >= windowTop - orangeRadius &&
                orangeCenterY <= windowBottom + orangeRadius
              
              // Check 2: Orange is within SMASH_RADIUS_PX of window bottom-center
              const distanceToCenter = Math.sqrt(
                Math.pow(orangeCenterX - windowBottomCenterX, 2) +
                Math.pow(orangeCenterY - windowBottomCenterY, 2)
              )
              const withinRadius = distanceToCenter <= SMASH_RADIUS_PX
              
              if (overlapsWindow || withinRadius) {
                orangesToSmash.push(particle)
              }
            })
            
            // If we found oranges to smash, process them all at once
            if (orangesToSmash.length > 0) {
              lastSlamFrameRef.current = now
              
              // Calculate average smash position for juice effect
              let totalX = 0
              let totalY = 0
              orangesToSmash.forEach(orange => {
                totalX += orange.x
                totalY += orange.y
              })
              smashCenterX = totalX / orangesToSmash.length
              smashCenterY = totalY / orangesToSmash.length
              
              // Update score by number smashed
              setSmashedCount(prev => prev + orangesToSmash.length)
              setJuice(prev => Math.min(prev + orangesToSmash.length, JUICE_MAX))
              
              // Reset wasLifted so user must lift again
              wasLiftedRef.current = false
              
              // Trigger extreme juice effect at center of smash
              window.dispatchEvent(new CustomEvent('orange-smash', {
                detail: { x: smashCenterX, y: smashCenterY }
              }))
              
              // Create juice droplets for each smashed orange
              const allSplashParticles = []
              const allStains = []
              
              orangesToSmash.forEach(orange => {
                const dropletCount = 20 + Math.floor(Math.random() * 21) // 20-40 per orange
                
                for (let i = 0; i < dropletCount; i++) {
                  const angle = (Math.PI * 2 * Math.random())
                  const speed = 4 + Math.random() * 6 // 4-10
                  const upwardBias = -0.4
                  
                  const velX = Math.cos(angle) * speed
                  const velY = Math.sin(angle) * speed + upwardBias * speed
                  
                  allSplashParticles.push({
                    id: `droplet-${orange.id}-${i}-${Date.now()}-${Math.random()}`,
                    x: orange.x + (Math.cos(angle) * 5),
                    y: orange.y + (Math.sin(angle) * 5),
                    velocityX: velX,
                    velocityY: velY,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 20,
                    opacity: 1,
                    age: 0,
                    lifetime: 600 + Math.random() * 300,
                    isSplash: true,
                    hasReachedBottom: false,
                    isPickedUp: false,
                    gravity: 0.3
                  })
                }
                
                // Create 1-3 splash stains per orange
                const stainCount = 1 + Math.floor(Math.random() * 3)
                for (let i = 0; i < stainCount; i++) {
                  const offsetX = (Math.random() - 0.5) * 60
                  const offsetY = (Math.random() - 0.5) * 40
                  const size = 30 + Math.random() * 40
                  
                  allStains.push({
                    id: `stain-${orange.id}-${i}-${Date.now()}-${Math.random()}`,
                    x: orange.x + offsetX,
                    y: orange.y + offsetY,
                    size: size,
                    opacity: 0.6 + Math.random() * 0.3,
                    age: 0,
                    lifetime: 2000 + Math.random() * 3000,
                  })
                }
              })
              
              // Remove all smashed oranges and add splash particles
              const smashedOrangeIds = new Set(orangesToSmash.map(o => o.id))
              const oranges = currentParticles.filter(p => !p.isSplash && !smashedOrangeIds.has(p.id))
              const droplets = currentParticles.filter(p => p.isSplash)
              const newDroplets = [...droplets, ...allSplashParticles]
              const limitedDroplets = newDroplets.length > MAX_DROPLETS
                ? newDroplets.slice(-MAX_DROPLETS)
                : newDroplets
              
              // Add splash stains
              setSplashStains(prev => {
                const combinedStains = [...prev, ...allStains]
                return combinedStains.length > MAX_STAINS
                  ? combinedStains.slice(-MAX_STAINS)
                  : combinedStains
              })
              
              // Update currentParticles (oranges removed, droplets added)
              currentParticles = [...oranges, ...limitedDroplets]
            }
          }
        }
        
        // Now process remaining particles normally
        const updated = currentParticles
          .map(particle => {
            // Handle picked up orange (being held)
            if (particle.isPickedUp && pickedUpOrangeRef.current === particle.id) {
              // Orange follows mouse cursor
              const newX = mouseX
              const newY = mouseY
              
              // Calculate velocity based on mouse movement for throwing
              const velX = mouseX - particle.lastMouseX
              const velY = mouseY - particle.lastMouseY
              
              return {
                ...particle,
                x: newX,
                y: newY,
                velocityX: velX * 0.5, // Store velocity for throwing
                velocityY: velY * 0.5,
                lastMouseX: mouseX,
                lastMouseY: mouseY,
                hasReachedBottom: false // Can be thrown up
              }
            }

            // Check if particle reached bottom
            const hasReachedBottom = particle.y >= bottomBoundary || particle.hasReachedBottom

            // Mouse interaction for oranges on the ground (hover push)
            if (hasReachedBottom && !particle.isPickedUp) {
              const distance = Math.sqrt(
                Math.pow(particle.x - mouseX, 2) + Math.pow(particle.y - mouseY, 2)
              )
              const interactionRadius = 60 // Pixels - how close mouse needs to be
              
              if (distance < interactionRadius && distance > 0 && !isMouseDownRef.current) {
                // Calculate repulsion force (push away from mouse)
                const force = (interactionRadius - distance) / interactionRadius * 2 // Stronger when closer
                const angle = Math.atan2(particle.y - mouseY, particle.x - mouseX)
                const pushX = Math.cos(angle) * force
                const pushY = Math.sin(angle) * force
                
                // Apply force to particle
                const newX = particle.x + pushX
                let newY = particle.y + pushY
                
                // If pushed up, give it upward velocity and let gravity handle it
                if (newY < bottomBoundary) {
                  // Orange is pushed into the air - give it upward velocity
                  const upwardVelY = pushY * 0.5 // Convert push force to velocity
                  const horizontalVelX = pushX * 0.5
                  
                  return {
                    ...particle,
                    x: newX,
                    y: newY,
                    velocityX: horizontalVelX,
                    velocityY: upwardVelY,
                    hasReachedBottom: false // Now in air, will fall with gravity
                  }
                }
                
                // Still on ground, just pushed horizontally
                const newRotation = particle.rotation + (pushX * 2)
                
                return {
                  ...particle,
                  x: newX,
                  y: newY,
                  rotation: newRotation,
                  hasReachedBottom: true
                }
              }
              
              // If not being disrupted, stay in place
              return particle
            }

            // Update position for falling particles (not on ground, not picked up)
            if (!hasReachedBottom && !particle.isPickedUp) {
              // Handle splash particles (orange juice) - they fade out
              if (particle.isSplash) {
                const newAge = (particle.age || 0) + 16
                const progress = newAge / particle.lifetime
                const opacity = Math.max(0, 1 - progress)
                
                if (opacity <= 0 || newAge >= particle.lifetime) {
                  // Remove faded splash
                  return null
                }
                
                // Apply gravity to splash
                const gravity = particle.gravity || 0.2
                const newVelY = (particle.velocityY || 0) + gravity
                const newVelX = (particle.velocityX || 0) * 0.95
                
                const newX = particle.x + newVelX
                let newY = particle.y + newVelY
                
                // Check if splash hits ground
                if (newY >= bottomBoundary) {
                  newY = bottomBoundary
                }
                
                const newRotation = (particle.rotation || 0) + (particle.rotationSpeed || 0)
                
                return {
                  ...particle,
                  x: newX,
                  y: newY,
                  velocityX: newVelX,
                  velocityY: newVelY,
                  rotation: newRotation,
                  opacity,
                  age: newAge,
                  hasReachedBottom: newY >= bottomBoundary
                }
              }
              
              // Regular falling orange with bounce physics
              // Apply gravity (reduced strength)
              const gravity = particle.gravity || 0.15
              let newVelY = (particle.velocityY || 0) + gravity
              
              // Apply friction to horizontal velocity
              let newVelX = (particle.velocityX || 0) * 0.98
              
              const newX = particle.x + newVelX
              let newY = particle.y + newVelY
              const orangeRadius = particle.radius || 28
              
              // Check if particle hits ground (with bounce)
              if (newY + orangeRadius >= bottomBoundary) {
                newY = bottomBoundary - orangeRadius
                
                // Bounce logic
                const bounceCount = particle.bounceCount || 0
                if (bounceCount < 2 && Math.abs(newVelY) > 0.5) {
                  // Bounce with decreasing energy
                  const bounceDamping = 0.4 - (bounceCount * 0.1) // Less bounce each time
                  newVelY = -newVelY * bounceDamping
                  newVelX = newVelX * 0.8 // Reduce horizontal on bounce
                  
                  return {
                    ...particle,
                    x: newX,
                    y: newY,
                    velocityX: newVelX,
                    velocityY: newVelY,
                    bounceCount: bounceCount + 1,
                    isBouncing: true,
                    hasReachedBottom: false // Still bouncing
                  }
                } else {
                  // Settle on ground
                  return {
                    ...particle,
                    x: newX,
                    y: newY,
                    hasReachedBottom: true,
                    velocityX: 0,
                    velocityY: 0,
                    rotationSpeed: 0, // Stop rotation when settled
                    isBouncing: false
                  }
                }
              }
              
              // Still falling
              const newRotation = particle.rotation + (newVelX * 0.5)

              return {
                ...particle,
                x: newX,
                y: newY,
                velocityX: newVelX,
                velocityY: newVelY,
                rotation: newRotation,
                opacity: 1, // Always fully opaque - no fading
                isBouncing: false
              }
            }
            
            // Particle is on ground and not being interacted with
            // Ground oranges persist indefinitely - no fade, no TTL
            // Only removed when smashed or when cap exceeded (handled in spawnParticle)
            return {
              ...particle,
              opacity: 1, // Always fully opaque - never fade
              hasReachedBottom: true, // Ensure it stays marked as on ground
              velocityX: 0, // Ensure no movement
              velocityY: 0,
              rotationSpeed: 0 // Stop rotation
            }
          })
          .filter(particle => particle !== null) // Remove null particles (smashed oranges or faded droplets)
        
        // Ground oranges persist indefinitely - no cap, no fade, only removed by smash
        // (Droplets fade naturally and are handled separately)
        return updated
      })

      rafIdRef.current = requestAnimationFrame(animate)
    }

    rafIdRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [spawnParticle])

  // Track mouse position and handle click/pickup
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseDown = (e) => {
      isMouseDownRef.current = true
      
      // Check if clicking on an orange
      const clickX = e.clientX
      const clickY = e.clientY
      
      setParticles(prev => {
        return prev.map(particle => {
          const distance = Math.sqrt(
            Math.pow(particle.x - clickX, 2) + Math.pow(particle.y - clickY, 2)
          )
          
          // If clicking within 20px of an orange, pick it up
          if (distance < 20 && !particle.isPickedUp) {
            pickedUpOrangeRef.current = particle.id
            return {
              ...particle,
              isPickedUp: true,
              lastMouseX: clickX,
              lastMouseY: clickY,
              velocityX: 0,
              velocityY: 0
            }
          }
          return particle
        })
      })
    }

    const handleMouseUp = (e) => {
      isMouseDownRef.current = false
      
      // Release picked up orange with throw velocity
      if (pickedUpOrangeRef.current) {
        setParticles(prev => {
          return prev.map(particle => {
            if (particle.id === pickedUpOrangeRef.current) {
              // Calculate throw velocity from last movement
              const throwVelX = (mousePosRef.current.x - particle.lastMouseX) * 0.3
              const throwVelY = (mousePosRef.current.y - particle.lastMouseY) * 0.3
              
              pickedUpOrangeRef.current = null
              return {
                ...particle,
                isPickedUp: false,
                velocityX: throwVelX,
                velocityY: throwVelY,
                hasReachedBottom: false // Can be thrown
              }
            }
            return particle
          })
        })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Update z-index to be behind TangGang but above other windows
  useEffect(() => {
    const updateZIndex = () => {
      const tanggangWindow = document.getElementById('tanggang')
      if (tanggangWindow) {
        const tanggangZIndex = parseInt(getComputedStyle(tanggangWindow).zIndex || '1000', 10)
        // Set oranges to be just below TangGang (but above other windows which start at 1000)
        const newZIndex = Math.max(500, tanggangZIndex - 1)
        setOrangeZIndex(newZIndex)
        // Also update container directly for immediate effect
        if (containerRef.current) {
          containerRef.current.style.zIndex = newZIndex
        }
      } else {
        // If TangGang not found, use a high z-index but below typical window z-index (1000+)
        setOrangeZIndex(500)
        if (containerRef.current) {
          containerRef.current.style.zIndex = 500
        }
      }
    }

    // Update initially and on window changes
    updateZIndex()
    const interval = setInterval(updateZIndex, 100) // Check every 100ms

    return () => clearInterval(interval)
  }, [])

  // Expose functions to window
  useEffect(() => {
    window.__orangeTrail = {
      startDragging: (windowRect) => {
        isDraggingRef.current = true
        windowRectRef.current = windowRect
        spawnRateRef.current = 40 + Math.random() * 20 // 40-60 particles/sec (more oranges!)
        lastSpawnTimeRef.current = Date.now()
      },
      updateWindowRect: (windowRect) => {
        windowRectRef.current = windowRect
      },
      stopDragging: () => {
        isDraggingRef.current = false
        spawnRateRef.current = 0
      }
    }

    return () => {
      delete window.__orangeTrail
    }
  }, [])

  const handleClaimPrize = () => {
    if (juice >= JUICE_MAX) {
      setShowTreasureWindow(true)
      // Reset juice (no persistence - resets on page load)
      setJuice(0)
      // Increment prizes claimed (not persisted - treasure text is fixed)
      setPrizesClaimed(prev => prev + 1)
    }
  }

  const juicePercentage = (juice / JUICE_MAX) * 100

  return (
    <>
      {/* Juice Canvas for extreme effects */}
      <JuiceCanvas />

      {/* Spawn gate hint - only show when paused */}
      {spawnPaused && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ffff00',
            border: '2px solid #000',
            padding: '8px 16px',
            fontFamily: 'MS Sans Serif, sans-serif',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 9999,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          ORANGE OVERLOAD 🍊 Smash them all to continue!
        </div>
      )}

      {/* HUD - Top right corner */}
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10000, // Above everything
          backgroundColor: '#c0c0c0',
          border: '2px outset #c0c0c0',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: 'MS Sans Serif, sans-serif',
          fontSize: '14px',
          pointerEvents: 'auto', // Allow button clicks
          userSelect: 'none',
          minWidth: '120px',
        }}
      >
        {/* Juice Glass with Fill Meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            position: 'relative',
            width: '40px',
            height: '50px',
            border: '2px solid #000',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '2px',
          }}>
            {/* Fill bar */}
            <div style={{
              width: '100%',
              height: `${juicePercentage}%`,
              backgroundColor: '#ff8c00', // Orange color
              transition: 'height 0.2s ease',
              minHeight: juicePercentage > 0 ? '2px' : '0',
            }} />
            {/* Glass icon overlay */}
            <div style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              bottom: '2px',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              🧃
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
              {juice} / {JUICE_MAX}
            </span>
            <span style={{ fontSize: '10px', color: '#666' }}>
              Smashed: {smashedCount}
            </span>
          </div>
        </div>

        {/* CLAIM PRIZE Button */}
        {juice >= JUICE_MAX && (
          <button
            className="button"
            onClick={handleClaimPrize}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              width: '100%',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            CLAIM PRIZE
          </button>
        )}
      </div>

      {/* Treasure Window */}
      {showTreasureWindow && (
        <TreasureWindow
          isOpen={showTreasureWindow}
          onClose={() => setShowTreasureWindow(false)}
          prizesClaimed={prizesClaimed} // Show current count
        />
      )}

      {/* Orange trail container */}
      <div 
        ref={containerRef}
        className="orange-trail-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Container doesn't capture events, but individual oranges can
          zIndex: orangeZIndex, // Dynamically set to be behind TangGang but above other windows
        }}
      >
        {/* Splash stains */}
        {splashStains.map(stain => (
          <div
            key={stain.id}
            style={{
              position: 'absolute',
              left: `${stain.x}px`,
              top: `${stain.y}px`,
              width: `${stain.size}px`,
              height: `${stain.size}px`,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 165, 0, 0.4)', // Orange with transparency
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              opacity: stain.opacity,
            }}
          />
        ))}

        {/* Particles (oranges and droplets) */}
        {particles.map(particle => (
          <span
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              fontSize: particle.isSplash ? '12px' : '56px', // Smaller droplets, bigger oranges
              opacity: particle.opacity,
              transform: `translate(-50%, -50%) rotate(${particle.rotation || 0}deg)`,
              pointerEvents: particle.hasReachedBottom && !particle.isSplash ? 'auto' : 'none', // Allow interaction only when on ground (not splash)
              userSelect: 'none',
              willChange: 'transform, opacity',
              cursor: particle.hasReachedBottom && !particle.isSplash ? 'pointer' : 'default',
            }}
          >
            {particle.isSplash ? '🧃' : '🍊'}
          </span>
        ))}
      </div>
    </>
  )
}

