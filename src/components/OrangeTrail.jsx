import { useState, useEffect, useRef, useCallback } from 'react'
import TreasureWindow from './windows/TreasureWindow'
import JuiceCanvas from './JuiceCanvas'
import FakeOSMessage from './FakeOSMessage'
import { useOrangeGame } from '../contexts/OrangeGameContext'

/**
 * SHIP_MODE: Safety switch to prevent crashes from breaking the whole site
 * When true (default), all errors are caught, logged, and handled gracefully
 * The game continues running even if individual effects fail
 */
const SHIP_MODE = true // Default: true for production safety

/**
 * OrangeTrail component - spawns orange emoji particles when TangGang window is dragged
 */
export default function OrangeTrail() {
  // Check for safe mode (disable juice chaos)
  const safeMode = import.meta.env.VITE_ORANGE_SAFE_MODE === 'true'
  
  // Get shared game state from context
  const { setSmashed, setGoal, resetGame } = useOrangeGame()
  
  // Separate systems: groundOranges (persistent) vs juiceParticles (temporary with TTL)
  const [groundOranges, setGroundOranges] = useState([]) // Persistent until smashed - no TTL, no fade
  const [juiceParticles, setJuiceParticles] = useState([]) // Temporary with TTL - fade out over time
  const [splashStains, setSplashStains] = useState([])
  
  // Refs to store latest state values for animation loop (prevents stale closures and infinite loops)
  const groundOrangesRef = useRef([])
  const juiceParticlesRef = useRef([])
  const splashStainsRef = useRef([])
  
  // Keep refs in sync with state (but don't trigger re-renders)
  useEffect(() => {
    groundOrangesRef.current = groundOranges
  }, [groundOranges])
  
  useEffect(() => {
    juiceParticlesRef.current = juiceParticles
  }, [juiceParticles])
  
  useEffect(() => {
    splashStainsRef.current = splashStains
  }, [splashStains])
  
  // Dev-only: Track groundOranges count for invariant checking
  const prevGroundOrangesCountRef = useRef(0)
  const [smashedCount, setSmashedCount] = useState(0) // Always start at 0 (no persistence)
  const [smashedScore, setSmashedScore] = useState(0) // Real score state (not local variable)
  const [juice, setJuice] = useState(0) // Always start at 0 (no persistence)
  const [showTreasureWindow, setShowTreasureWindow] = useState(false)
  const [spawnPaused, setSpawnPaused] = useState(false) // Pause spawning when too many oranges (for UI)
  const spawnPausedRef = useRef(false) // Ref version for animation loop (avoids closure issues)
  const [orangeZIndex, setOrangeZIndex] = useState(500) // Start at 500, will be updated dynamically
  const isDraggingRef = useRef(false)
  const spawnRateRef = useRef(0) // Particles per second
  const lastSpawnTimeRef = useRef(0)
  const windowRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const rafIdRef = useRef(null)
  const physicsRafRef = useRef(null) // Ref for dedicated physics loop
  const mousePosRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const pickedUpOrangeRef = useRef(null) // Track which orange is currently picked up
  const isMouseDownRef = useRef(false)
  // Ground oranges persist indefinitely - no cap, no fade, only removed by smash
  const MAX_ORANGES_ON_GROUND = 120 // Stop spawning when this many unsmashed oranges are on ground
  const MAX_DROPLETS = 2000 // Maximum juice droplets (increased for aggressive effects)
  const MAX_STAINS = 80 // Maximum splash stains (increased for aggressive effects)
  const JUICE_MAX = 1000 // Maximum juice capacity
  
  // Sync goal with context on mount
  useEffect(() => {
    setGoal(JUICE_MAX)
  }, [setGoal])
  const LIFT_PX = 40 // Pixels window must be above ground to register as "lifted"
  const SMASH_RADIUS_PX = 160 // Radius around window bottom-center to smash oranges
  
  // Smash detection constants
  const IMPACT_MIN_DY = 18 // Minimum downward movement to trigger smash
  const SMASH_COOLDOWN_MS = 250 // Cooldown between smashes (prevents hold-to-farm)
  const MAX_SMASH_PER_HIT = 35 // Maximum oranges smashed per impact
  
  // Juice effect constants
  const PARTICLES_PER_ORANGE = 12 // Particles spawned per smashed orange
  const MAX_PARTICLES_PER_SMASH = 600 // Hard cap on particles per smash event
  
  // Physics constants for ground oranges - SLOWER FALLING, LESS BOUNCING!
  const GRAVITY = 0.15 // Much slower gravity for gentle falling
  const BOUNCE = 0.3 // Less bouncy (30% energy retention - minimal bouncing)
  const FRICTION = 0.988 // Slightly less air friction for smoother movement
  const GROUND_FRICTION = 0.85 // More ground friction to stop swinging (was 0.90)
  const AIR_FRICTION = 0.99 // Less air friction for smoother falling
  const ROTATION_FRICTION = 0.97 // Slower rotation slowdown for smoother spinning
  const MIN_BOUNCE_VELOCITY = 0.15 // Lower threshold - more bounces!
  const MAX_BOUNCES = 10 // Even more bounces before settling
  const SETTLE_VELOCITY_THRESHOLD = 0.2 // Threshold to stop bouncing faster (less bouncing)
  
  // Track window position for lift-and-slam detection (anti-farming gating)
  // wasLifted: true only when window bottom is at least 40px above ground
  // Prevents farming by requiring lift + slam (not just holding window on oranges)
  const wasLiftedRef = useRef(false) // True only after window is lifted above ground (at least LIFT_PX)
  const lastSlamFrameRef = useRef(0) // Track last frame a slam occurred (prevent multiple slams per frame)
  const lastSmashTimeRef = useRef(0) // Track last smash time for cooldown
  const lastWindowYRef = useRef(null) // Track last window Y position for impact detection
  const lastDragYRef = useRef(null) // Track last drag Y position for smash detection
  const lastDragTimeRef = useRef(0) // Track last drag time
  const prevWindowRectRef = useRef(null) // Track previous window rect for drag end comparison
  const lastSmashCheckTimeRef = useRef(0) // Track last time we checked for smash (cooldown)
  const CONTINUOUS_SMASH_COOLDOWN_MS = 50 // Cooldown between continuous smashes (50ms = 20 smashes/sec max) - faster for better responsiveness

  // Spawn a single orange particle
  const spawnParticle = useCallback(() => {
    // SHIP_MODE: Wrap spawn in try/catch to prevent crashes
    if (SHIP_MODE) {
      try {
        return spawnParticleInternal()
      } catch (error) {
        console.warn('[OrangeTrail] Error in spawnParticle (SHIP_MODE):', error)
        return // Return early, don't throw
      }
    } else {
      return spawnParticleInternal()
    }
    
    function spawnParticleInternal() {
      const windowRect = windowRectRef.current
      if (!windowRect || !windowRect.width || !windowRect.height) return

      // Swarm all around the screen - spawn from wider area
      // Spawn from window area but with wider spread to cover more of the screen
      const spawnSpreadX = windowRect.width * 1.5 // 1.5x window width for wider spread
      const spawnCenterX = windowRect.x + windowRect.width / 2
      const randomX = spawnCenterX + (Math.random() - 0.5) * spawnSpreadX
      
      // Clamp to screen bounds
      const clampedX = Math.max(0, Math.min(randomX, window.innerWidth))
      
      // Start from top of window or slightly above for more screen coverage
      const startY = windowRect.y - 20 + Math.random() * 40 // Spawn from window area with some vertical spread

        // Random velocity - SMOOTHER & FUNNIER with more horizontal movement
        const velocityX = (Math.random() - 0.5) * 6 // -3 to 3 (wider horizontal spread for funnier arcs)
        const velocityY = 0.5 + Math.random() * 1.5 // 0.5 to 2.0 (slower, smoother falling)

        // Random rotation speed
        const rotationSpeed = (Math.random() - 0.5) * 4 // -2 to 2 degrees per frame

        // Random initial rotation
        const initialRotation = Math.random() * 360

        // Ground orange - persistent, no TTL, no fade
        // Use vx/vy for physics compatibility
        const groundOrange = {
          id: Math.random().toString(36).substr(2, 9),
          x: clampedX,
          y: startY,
          vx: velocityX, // Horizontal velocity
          vy: velocityY, // Vertical velocity
          velocityX, // Keep for backward compatibility
          velocityY, // Keep for backward compatibility
          rotation: initialRotation,
          vr: rotationSpeed, // Rotation velocity
          rotationSpeed, // Keep for backward compatibility
          opacity: 1, // Always fully opaque - no fading, no TTL
          hasReachedBottom: false, // Track if orange reached bottom
          isPickedUp: false, // Track if orange is being held
          isSettled: false, // Track if orange has fully settled (stopped moving)
          grounded: false, // Track if orange is on the ground - MUST be false initially so physics applies
          lastMouseX: 0, // For calculating throw velocity
          lastMouseY: 0,
          radius: 28, // Collision radius for oranges
          bounceCount: 0, // Track bounces
          isBouncing: false, // Track if currently bouncing
          smashed: false, // Track if orange has been smashed
          createdAt: Date.now() // Track creation time
          // NO age, NO lifetime, NO TTL - ground oranges persist indefinitely until smashed
        }

      // Add to groundOranges only if spawning is not paused
      // Use functional update to check unsmashed count and prevent stale closures
      setGroundOranges(prev => {
        try {
          // Count unsmashed oranges
          const unsmashedCount = prev.filter(o => !o.smashed).length
          
          // Pause spawning if we've reached the cap
          if (unsmashedCount >= MAX_ORANGES_ON_GROUND) {
            return prev // Don't add new orange
          }
          
          // Spawn new orange
          return [...prev, groundOrange]
        } catch (error) {
          console.warn('[OrangeTrail] Error in setGroundOranges during spawn (SHIP_MODE):', error)
          return prev // Return previous state on error
        }
      })
    }
  }, [])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      // SHIP_MODE: Wrap entire animation loop in try/catch
      if (SHIP_MODE) {
        try {
          animateInternal()
        } catch (error) {
          console.warn('[OrangeTrail] Error in animation loop (SHIP_MODE):', error)
          // Continue animation even on error - schedule next frame
          rafIdRef.current = requestAnimationFrame(animate)
          return
        }
      } else {
        animateInternal()
      }
      
      function animateInternal() {
        const now = Date.now()
        
        // Count unsmashed oranges for spawn gate logic
        // Use ref to get latest value without causing re-renders
        const unsmashedCount = groundOrangesRef.current.filter(o => !o.smashed).length
        
        // Update spawn paused state (both state for UI and ref for animation loop)
        // Stop spawning when unsmashed oranges >= cap, resume when all are smashed
        // CRITICAL: Only update state if it actually changed to prevent infinite loops
        if (unsmashedCount >= MAX_ORANGES_ON_GROUND) {
          if (!spawnPausedRef.current) {
            spawnPausedRef.current = true
            setSpawnPaused(true)
          }
        } else if (unsmashedCount === 0) {
          // Start spawning again when all oranges are smashed
          if (spawnPausedRef.current) {
            spawnPausedRef.current = false
            setSpawnPaused(false)
          }
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
        
        // Lift gating: wasLifted is true ONLY when window bottom is at least LIFT_PX above ground
        // This prevents farming by holding the window on oranges
        if (windowBottomDistanceFromGround >= LIFT_PX) {
          // Window is lifted - set wasLifted to true
          wasLiftedRef.current = true
        } else {
          // Window is NOT lifted (below threshold) - reset wasLifted to false
          // This ensures you must lift again after coming back down
          wasLiftedRef.current = false
        }
        
        // Track window movement for impact detection (downward = positive deltaY)
        const lastWindowBottom = lastWindowYRef.current
        const deltaY = lastWindowBottom !== null ? currentWindowBottom - lastWindowBottom : 0
        lastWindowYRef.current = currentWindowBottom
        
        // Store window movement info for smash detection
        windowRectRef.current = {
          ...windowRectRef.current,
          wasLifted: wasLiftedRef.current,
          deltaY: deltaY,
          windowRect: windowRect
        }
      }

      // Update splash stains (fade out over time)
      // CRITICAL: Only update if there are stains to process (prevents unnecessary state updates)
      const currentStains = splashStainsRef.current
      if (currentStains.length > 0) {
        const updatedStains = currentStains
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
        
        // Only update state if the array actually changed
        if (updatedStains.length !== currentStains.length || 
            updatedStains.some((stain, i) => stain.opacity !== currentStains[i]?.opacity)) {
          setSplashStains(updatedStains)
        }
      }

      // Process juice particles (temporary with TTL - fade out over time)
      // CRITICAL: Only update if there are particles to process (prevents unnecessary state updates)
      const currentParticles = juiceParticlesRef.current
      if (currentParticles.length > 0) {
        const bottomBoundary = viewportHeight - taskbarHeight
        
        const updatedParticles = currentParticles
          .map(particle => {
            // Update age and check lifetime
            const newAge = (particle.age || 0) + 16
            const progress = newAge / particle.lifetime
            const opacity = Math.max(0, 1 - progress)
            
            if (opacity <= 0 || newAge >= particle.lifetime) {
              // Remove expired juice particle
              return null
            }
            
            // Apply gravity to juice particle
            const gravity = particle.gravity || 0.2
            const newVelY = (particle.velocityY || 0) + gravity
            const newVelX = (particle.velocityX || 0) * 0.95
            
            const newX = particle.x + newVelX
            let newY = particle.y + newVelY
            
            // Check if juice particle hits ground
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
          })
          .filter(particle => particle !== null)
          .slice(-MAX_DROPLETS) // Limit juice particles
        
        // Only update state if the array actually changed
        if (updatedParticles.length !== currentParticles.length) {
          setJuiceParticles(updatedParticles)
        }
      }

      // Process ground oranges (persistent - no TTL, no fade)
      // CRASH-PROOF: Wrap entire callback in try/catch
      setGroundOranges(prev => {
        try {
          // Guard: Ensure prev is valid array
          if (!Array.isArray(prev)) {
            console.warn('[OrangeTrail] groundOranges state is not an array, resetting')
            return []
          }
          
          // Dev-only: Invariant check - track initial count
          const initialCount = prev.length
          prevGroundOrangesCountRef.current = initialCount
          
          // Get viewport height for bottom boundary (must be defined inside callback)
          const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
          const taskbarHeight = 30 // Approximate taskbar height
          const bottomBoundary = viewportHeight - taskbarHeight
          const mouseX = mousePosRef.current?.x || 0
          const mouseY = mousePosRef.current?.y || 0
          
          // Work with a copy of ground oranges
          let currentOranges = [...prev]
          let orangesToSmashCount = 0 // Track how many oranges were smashed
        
        // Check if a slam is happening (only once per frame)
        const tanggangWindow = document.getElementById('tanggang')
        let orangesToSmash = []
        let smashCenterX = 0
        let smashCenterY = 0
        
        if (tanggangWindow) {
          // Dev-only: Invariant check - ensure all variables are initialized before use (TDZ check)
          try {
            if (windowRectRef === null || windowRectRef === undefined) {
              console.warn('[INVARIANT] windowRectRef not initialized in smash handler')
            }
            if (lastSlamFrameRef === null || lastSlamFrameRef === undefined) {
              console.warn('[INVARIANT] lastSlamFrameRef not initialized in smash handler')
            }
            if (safeMode === undefined) {
              console.warn('[INVARIANT] safeMode not initialized in smash handler')
            }
          } catch (error) {
            console.warn('[INVARIANT] TDZ error in smash handler:', error.message)
          }
          
          const windowRect = tanggangWindow.getBoundingClientRect()
          const wasLifted = windowRectRef.current?.wasLifted || false
          const deltaYFromRef = windowRectRef.current?.deltaY || 0
          const isMovingDownward = deltaYFromRef > IMPACT_MIN_DY // Must move down at least IMPACT_MIN_DY pixels
          const timeSinceLastSmash = now - lastSmashTimeRef.current
          const cooldownPassed = timeSinceLastSmash >= SMASH_COOLDOWN_MS
          const canSlam = wasLifted && isMovingDownward && cooldownPassed
          
          // Impact detection: smash can ONLY occur if:
          // 1. wasLifted === true (window was lifted at least 40px above ground)
          // 2. isMovingDownward === true (deltaY > IMPACT_MIN_DY, window is moving downward with enough force)
          // 3. cooldownPassed === true (enough time has passed since last smash)
          // This prevents farming by holding the window on oranges
          // On a valid slam, smash up to MAX_SMASH_PER_HIT oranges that intersect the window or are within SMASH_RADIUS_PX
          if (canSlam && lastSlamFrameRef.current !== now) {
            // Window bottom-center point for radius check
            const windowBottomCenterX = windowRect.left + windowRect.width / 2
            const windowBottomCenterY = windowRect.bottom
            const windowLeft = windowRect.left
            const windowRight = windowRect.right
            const windowTop = windowRect.top
            const windowBottom = windowRect.bottom
            
            // Collect oranges that should be smashed in this slam (up to MAX_SMASH_PER_HIT)
            // CRASH-PROOF: Guard against invalid oranges array
            let candidateOranges = []
            if (Array.isArray(currentOranges)) {
              currentOranges.forEach(orange => {
                try {
                  // Guard: Ensure orange is valid object
                  if (!orange || typeof orange !== 'object') return
                  
                  // Skip already smashed oranges
                  if (orange.smashed) return
                  
                  // Skip picked up oranges
                  if (orange.isPickedUp) return
                  
                  // Guard: Ensure orange has valid position
                  if (typeof orange.y !== 'number' || typeof orange.x !== 'number') return
                  
                  // Only smash oranges that have reached the ground
                  const hasReachedBottom = orange.y >= bottomBoundary || orange.hasReachedBottom
                  if (!hasReachedBottom || orange.y < bottomBoundary) return
                  
                  const orangeCenterX = orange.x
                  const orangeCenterY = orange.y
                  const orangeRadius = (typeof orange.radius === 'number' && orange.radius > 0) ? orange.radius : 28
                  
                  // Guard: Ensure window bounds are valid numbers
                  if (typeof windowLeft !== 'number' || typeof windowRight !== 'number' || 
                      typeof windowTop !== 'number' || typeof windowBottom !== 'number') {
                    return
                  }
                  
                  // Check 1: Orange circle intersects window rectangle footprint
                  // Find closest point on rectangle to circle center
                  const closestX = Math.max(windowLeft, Math.min(orangeCenterX, windowRight))
                  const closestY = Math.max(windowTop, Math.min(orangeCenterY, windowBottom))
                  
                  // Calculate distance from circle center to closest point
                  const distanceX = orangeCenterX - closestX
                  const distanceY = orangeCenterY - closestY
                  const distanceSquared = distanceX * distanceX + distanceY * distanceY
                  
                  // Circle intersects rectangle if distance <= radius
                  const overlapsWindow = distanceSquared <= orangeRadius * orangeRadius
                  
                  // Check 2: Orange is within SMASH_RADIUS_PX of window bottom-center
                  // Guard: Ensure windowBottomCenterX/Y are valid
                  if (typeof windowBottomCenterX === 'number' && typeof windowBottomCenterY === 'number') {
                    const distanceToCenter = Math.sqrt(
                      Math.pow(orangeCenterX - windowBottomCenterX, 2) +
                      Math.pow(orangeCenterY - windowBottomCenterY, 2)
                    )
                    const withinRadius = distanceToCenter <= SMASH_RADIUS_PX
                    
                    // Add to candidates if it overlaps window OR is within smash radius
                    if (overlapsWindow || withinRadius) {
                      candidateOranges.push(orange)
                    }
                  } else if (overlapsWindow) {
                    // Fallback: only check overlap if center calculation fails
                    candidateOranges.push(orange)
                  }
                } catch (collisionError) {
                  console.warn('[OrangeTrail] Error in collision detection:', collisionError)
                  // Continue processing other oranges
                }
              })
              
              // Limit to MAX_SMASH_PER_HIT oranges per smash
              orangesToSmash = candidateOranges.slice(0, MAX_SMASH_PER_HIT)
            }
            
            // If we found oranges to smash, process them all at once
            // Multiple oranges can be smashed per slam (fills glass faster)
            // CRASH-PROOF: Wrap entire smash handler in try/catch to prevent errors
            if (orangesToSmash.length > 0) {
              try {
                // Guard: Ensure orangesToSmash is valid array
                if (!Array.isArray(orangesToSmash) || orangesToSmash.length === 0) {
                  console.warn('[OrangeTrail] Invalid orangesToSmash array, skipping smash')
                  return currentOranges
                }
                
                lastSlamFrameRef.current = now
                lastSmashTimeRef.current = now
                
                // Calculate average smash position for juice effect (centered on all smashed oranges)
                let totalX = 0
                let totalY = 0
                orangesToSmash.forEach(orange => {
                  // Guard: Ensure orange has valid x/y
                  if (orange && typeof orange.x === 'number' && typeof orange.y === 'number') {
                    totalX += orange.x
                    totalY += orange.y
                  }
                })
                smashCenterX = totalX / orangesToSmash.length
                smashCenterY = totalY / orangesToSmash.length
                
                // Count before marking as smashed
                const beforeSmashCount = currentOranges.filter(o => !o.smashed).length
                
                // Mark oranges as smashed (don't remove yet - cleanup later)
                const smashedOrangeIds = new Set(orangesToSmash.map(o => o?.id).filter(id => id !== undefined))
                currentOranges = currentOranges.map(o => {
                  if (o && o.id && smashedOrangeIds.has(o.id)) {
                    return { ...o, smashed: true, smashedAt: Date.now() }
                  }
                  return o
                })
                
                // Count after marking as smashed
                const afterSmashCount = currentOranges.filter(o => !o.smashed).length
                orangesToSmashCount = beforeSmashCount - afterSmashCount
                
                // Update score by total number smashed in this slam
                // Each orange smashed = +1 to smashed count and +1 to juice
                setSmashedCount(prev => {
                  if (typeof prev !== 'number') return orangesToSmash.length
                  return prev + orangesToSmash.length
                })
                setJuice(prev => {
                  if (typeof prev !== 'number') return Math.min(orangesToSmash.length, JUICE_MAX)
                  return Math.min(prev + orangesToSmash.length, JUICE_MAX)
                })
                
                // Reset wasLifted after smash - user must lift again before next smash
                // This prevents farming by repeatedly slamming without lifting
                if (wasLiftedRef && wasLiftedRef.current !== undefined) {
                  wasLiftedRef.current = false
                }
                
                // Only trigger juice effects if not in safe mode
                if (!safeMode) {
                  // Guard: Ensure window and CustomEvent are available
                  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                    try {
                      // Trigger extreme juice effect at center of smash
                      window.dispatchEvent(new CustomEvent('orange-smash', {
                        detail: { x: smashCenterX, y: smashCenterY }
                      }))
                    } catch (eventError) {
                      console.warn('[OrangeTrail] Failed to dispatch orange-smash event:', eventError)
                    }
                  }
                  
                  // Create AGGRESSIVE juice particles for each smashed orange
                  const newJuiceParticles = []
                  const allStains = []
                  
                  // Calculate total particles needed (clamped to MAX_PARTICLES_PER_SMASH)
                  const totalParticlesNeeded = Math.min(
                    PARTICLES_PER_ORANGE * orangesToSmash.length,
                    MAX_PARTICLES_PER_SMASH
                  )
                  
                  orangesToSmash.forEach((orange, orangeIndex) => {
                    // Guard: Ensure orange is valid
                    if (!orange || typeof orange.id === 'undefined') return
                    
                    try {
                      // Distribute particles across all smashed oranges
                      const particlesForThisOrange = Math.floor(
                        (totalParticlesNeeded / orangesToSmash.length) + 
                        (orangeIndex < totalParticlesNeeded % orangesToSmash.length ? 1 : 0)
                      )
                      
                      // Guard: Ensure orange has valid x/y
                      const orangeX = typeof orange.x === 'number' ? orange.x : 0
                      const orangeY = typeof orange.y === 'number' ? orange.y : 0
                      
                      for (let i = 0; i < particlesForThisOrange; i++) {
                        // Wide cone upward + sideways for aggressive spread
                        const angle = (Math.PI * 2 * Math.random()) // Full 360 degrees
                        const speed = 8 + Math.random() * 12 // 8-20 (much faster)
                        const upwardBias = -0.7 // Strong upward bias
                        
                        const velX = Math.cos(angle) * speed
                        const velY = Math.sin(angle) * speed + upwardBias * speed
                        
                        newJuiceParticles.push({
                          id: `droplet-${orange.id}-${i}-${Date.now()}-${Math.random()}`,
                          x: orangeX + (Math.cos(angle) * 10), // Wider spawn spread
                          y: orangeY + (Math.sin(angle) * 10),
                          velocityX: velX,
                          velocityY: velY,
                          rotation: Math.random() * 360,
                          rotationSpeed: (Math.random() - 0.5) * 30, // Faster rotation
                          opacity: 1,
                          age: 0,
                          lifetime: 800 + Math.random() * 400, // Longer lifetime
                          hasReachedBottom: false,
                          isPickedUp: false,
                          gravity: 0.25,
                          size: 2 + Math.random() * 3 // Variable size
                        })
                      }
                      
                      // Create 2-6 splash stains per orange (more persistent mess)
                      const stainCount = 2 + Math.floor(Math.random() * 5)
                      for (let i = 0; i < stainCount; i++) {
                        const offsetX = (Math.random() - 0.5) * 100 // Wider spread
                        const offsetY = (Math.random() - 0.5) * 60
                        const size = 40 + Math.random() * 60 // Bigger stains
                        
                        allStains.push({
                          id: `stain-${orange.id}-${i}-${Date.now()}-${Math.random()}`,
                          x: orangeX + offsetX,
                          y: orangeY + offsetY,
                          size: size,
                          opacity: 0.7 + Math.random() * 0.2,
                          age: 0,
                          lifetime: 10000 + Math.random() * 20000, // 10-30 seconds persistence
                          createdAt: Date.now()
                        })
                      }
                    } catch (orangeError) {
                      console.warn('[OrangeTrail] Error processing orange for smash:', orangeError)
                    }
                  })
                  
                  // Add screen shake effect (1-2 pulses, 120ms total)
                  if (typeof window !== 'undefined' && window.dispatchEvent) {
                    try {
                      window.dispatchEvent(new CustomEvent('screen-shake', {
                        detail: { duration: 120, intensity: 3 }
                      }))
                    } catch (shakeError) {
                      console.warn('[OrangeTrail] Failed to trigger screen shake:', shakeError)
                    }
                  }
                  
                  // Add new juice particles - use functional update to avoid mutation
                  if (Array.isArray(newJuiceParticles) && newJuiceParticles.length > 0) {
                    setJuiceParticles(prev => {
                      if (!Array.isArray(prev)) return newJuiceParticles.slice(-MAX_DROPLETS)
                      const combined = [...prev, ...newJuiceParticles]
                      return combined.slice(-MAX_DROPLETS)
                    })
                  }
                  
                  // Add splash stains - use functional update to avoid mutation
                  if (Array.isArray(allStains) && allStains.length > 0) {
                    setSplashStains(prev => {
                      if (!Array.isArray(prev)) return allStains.slice(-MAX_STAINS)
                      const combinedStains = [...prev, ...allStains]
                      return combinedStains.length > MAX_STAINS
                        ? combinedStains.slice(-MAX_STAINS)
                        : combinedStains
                    })
                  }
                }
                
                // Dev-only: Invariant check - groundOranges should only be removed by smash
                if (orangesToSmashCount !== orangesToSmash.length) {
                  console.warn(
                    `[INVARIANT] Ground orange removal mismatch: expected ${orangesToSmash.length} removed, got ${orangesToSmashCount}`,
                    { beforeSmashCount, afterSmashCount, orangesToSmashCount: orangesToSmash.length }
                  )
                }
              } catch (smashError) {
                // CRASH-PROOF: Catch any errors in smash handler and log, don't throw
                console.warn('[OrangeTrail] Error in smash handler:', smashError)
                // Return current oranges unchanged on error
                return currentOranges
              }
            }
          }
        }
        
        // Process remaining ground oranges
        const updated = currentOranges
          .map(orange => {
            // Skip smashed oranges (they'll be cleaned up later)
            if (orange.smashed) {
              return orange
            }
            
            // Handle picked up orange (being held) - skip physics for these
            if (orange.isPickedUp && pickedUpOrangeRef.current === orange.id) {
              // Orange follows mouse cursor
              const newX = mouseX
              const newY = mouseY
              
              // Calculate velocity based on mouse movement for throwing
              const velX = mouseX - orange.lastMouseX
              const velY = mouseY - orange.lastMouseY
              
              return {
                ...orange,
                x: newX,
                y: newY,
                vx: velX * 0.5,
                vy: velY * 0.5,
                velocityX: velX * 0.5, // Store velocity for throwing
                velocityY: velY * 0.5,
                lastMouseX: mouseX,
                lastMouseY: mouseY,
                hasReachedBottom: false, // Can be thrown up
                grounded: false // Can be thrown up
              }
            }

            // Apply physics to ALL non-grounded oranges FIRST
            // This ensures oranges always fall regardless of other flags
            // IMPORTANT: This must run BEFORE any other conditions that might return early
            // Check: if not explicitly grounded (true) and not picked up, apply physics
            // This should catch ALL falling oranges
            if (orange.grounded !== true && !orange.isPickedUp) {
              // Get velocities (use vx/vy if available, fallback to velocityX/Y)
              let vx = orange.vx !== undefined ? orange.vx : (orange.velocityX || 0)
              let vy = orange.vy !== undefined ? orange.vy : (orange.velocityY || 0)
              
              // ALWAYS apply gravity - this is what makes oranges fall
              vy += GRAVITY
              
              // Update position
              let x = orange.x + vx
              let y = orange.y + vy
              
              // Calculate floor Y (adjust for orange size) - MUST be defined here
              const orangeRadius = orange.radius || 28
              const FLOOR_Y = bottomBoundary - orangeRadius
              
              // Floor collision with funnier bounce
              if (y >= FLOOR_Y) {
                y = FLOOR_Y
                vy = -vy * BOUNCE
                vx = vx * GROUND_FRICTION // Use GROUND_FRICTION constant
                
                // Settle if velocity is low (lower threshold for more bounces)
                // Settle if velocity is low (higher threshold = less bouncing)
                if (Math.abs(vy) < 0.4) {
                  vy = 0
                  vx = 0
                  return {
                    ...orange,
                    x,
                    y,
                    vx: 0,
                    vy: 0,
                    velocityX: 0,
                    velocityY: 0,
                    grounded: true,
                    hasReachedBottom: true,
                    isSettled: true
                  }
                }
                
                // Less randomness for smoother, less bouncy physics
                const bounceRandomness = 0.95 + Math.random() * 0.1 // 0.95 to 1.05 multiplier - less variation
                vy = vy * bounceRandomness
              }
              
              // Apply friction
              vx *= FRICTION
              
              // Update rotation
              const vr = orange.vr !== undefined ? orange.vr : (orange.rotationSpeed || 0)
              const newRotation = orange.rotation + vr
              const newVr = vr * ROTATION_FRICTION
              
              return {
                ...orange,
                x,
                y,
                vx,
                vy,
                velocityX: vx,
                velocityY: vy,
                rotation: newRotation,
                vr: newVr,
                rotationSpeed: newVr,
                grounded: false,
                opacity: 1
              }
            }

            // Check if orange reached bottom (must be grounded, not just at bottom Y)
            const hasReachedBottom = (orange.grounded || orange.hasReachedBottom) && orange.y >= bottomBoundary

            // Mouse interaction for oranges on the ground (hover push)
            if (hasReachedBottom && !orange.isPickedUp && orange.grounded) {
              const distance = Math.sqrt(
                Math.pow(orange.x - mouseX, 2) + Math.pow(orange.y - mouseY, 2)
              )
              const interactionRadius = 60 // Pixels - how close mouse needs to be
              
              if (distance < interactionRadius && distance > 0 && !isMouseDownRef.current) {
                // Calculate repulsion force (push away from mouse)
                const force = (interactionRadius - distance) / interactionRadius * 2 // Stronger when closer
                const angle = Math.atan2(orange.y - mouseY, orange.x - mouseX)
                const pushX = Math.cos(angle) * force
                const pushY = Math.sin(angle) * force
                
                // Apply force to orange
                const newX = orange.x + pushX
                let newY = orange.y + pushY
                
                // If pushed up, give it upward velocity and let gravity handle it
                if (newY < bottomBoundary) {
                  // Orange is pushed into the air - give it upward velocity
                  const upwardVelY = pushY * 0.5 // Convert push force to velocity
                  const horizontalVelX = pushX * 0.5
                  
                  return {
                    ...orange,
                    x: newX,
                    y: newY,
                    vx: horizontalVelX,
                    vy: upwardVelY,
                    velocityX: horizontalVelX,
                    velocityY: upwardVelY,
                    hasReachedBottom: false, // Now in air, will fall with gravity
                    isSettled: false, // Reset settled state when pushed
                    isBouncing: false,
                    grounded: false, // Now in air
                    bounceCount: 0 // Reset bounce count for new fall
                  }
                }
                
                // Still on ground, just pushed horizontally
                const newRotation = orange.rotation + (pushX * 2)
                
                return {
                  ...orange,
                  x: newX,
                  y: newY,
                  rotation: newRotation,
                  hasReachedBottom: true
                }
              }
              
              // If not being disrupted, stay in place
              return orange
            }

            
            // Handle oranges that are bouncing (legacy code - should be handled by main physics now)
            // This is kept for backward compatibility but should not be needed
            if (false && orange.isBouncing && !orange.isPickedUp && !orange.isSettled) {
              // Apply gravity
              let newVelY = (orange.velocityY || 0) + GRAVITY
              
              // Apply air friction
              let newVelX = (orange.velocityX || 0) * AIR_FRICTION
              newVelY = newVelY * AIR_FRICTION
              
              // Update position
              const newX = orange.x + newVelX
              let newY = orange.y + newVelY
              const orangeRadius = orange.radius || 28
              
              // Update rotation
              let newRotationSpeed = (orange.rotationSpeed || 0) * ROTATION_FRICTION
              const newRotation = orange.rotation + newRotationSpeed
              
              // Check if orange hits ground again
              if (newY + orangeRadius >= bottomBoundary) {
                newY = bottomBoundary - orangeRadius
                
                const bounceCount = orange.bounceCount || 0
                const impactVelocity = Math.abs(newVelY)
                
                if (bounceCount < MAX_BOUNCES && impactVelocity > MIN_BOUNCE_VELOCITY) {
                  // Bounce again
                  const bounceEnergy = BOUNCE * (1 - bounceCount * 0.15)
                  newVelY = -newVelY * bounceEnergy
                  newVelX = newVelX * GROUND_FRICTION
                  newRotationSpeed = newRotationSpeed * 0.7
                  
                  return {
                    ...orange,
                    x: newX,
                    y: newY,
                    velocityX: newVelX,
                    velocityY: newVelY,
                    rotation: newRotation,
                    rotationSpeed: newRotationSpeed,
                    bounceCount: bounceCount + 1,
                    isBouncing: true
                  }
                } else {
                  // Settle
                  return {
                    ...orange,
                    x: newX,
                    y: newY,
                    hasReachedBottom: true,
                    velocityX: 0,
                    velocityY: 0,
                    rotationSpeed: 0,
                    rotation: newRotation,
                    isBouncing: false,
                    isSettled: true
                  }
                }
              }
              
              // Still bouncing upward
              return {
                ...orange,
                x: newX,
                y: newY,
                velocityX: newVelX,
                velocityY: newVelY,
                rotation: newRotation,
                rotationSpeed: newRotationSpeed,
                opacity: 1
              }
            }
            
            // Orange is on ground and settled - ensure it stays still
            // Ground oranges persist indefinitely - no fade, no TTL
            // Only removed when smashed
            // IMPORTANT: Only apply this to oranges that are actually grounded
            if (orange.grounded && (orange.isSettled || (orange.hasReachedBottom && !orange.isBouncing))) {
              // Check if orange is truly settled (velocity below threshold)
              const totalVelocity = Math.sqrt(
                Math.pow(orange.velocityX || 0, 2) + Math.pow(orange.velocityY || 0, 2)
              )
              
              // Use lower threshold to stop swinging faster
              if (totalVelocity < SETTLE_VELOCITY_THRESHOLD) {
                // Fully settled - COMPLETELY STOP all movement (no swinging!)
                return {
                  ...orange,
                  opacity: 1, // Always fully opaque - never fade
                  hasReachedBottom: true,
                  isSettled: true,
                  grounded: true, // Ensure grounded flag is set
                  velocityX: 0, // Ensure no movement
                  velocityY: 0,
                  vx: 0, // Also set vx/vy to 0
                  vy: 0,
                  rotationSpeed: 0, // Stop rotation
                  vr: 0, // Also set rotation velocity to 0
                  isBouncing: false
                }
              } else {
                // Still has some velocity - apply STRONGER ground friction to stop swinging
                let newVelX = (orange.velocityX || 0) * GROUND_FRICTION
                let newVelY = (orange.velocityY || 0) * GROUND_FRICTION
                let newRotationSpeed = (orange.rotationSpeed || 0) * ROTATION_FRICTION
                
                // If velocities are very small, FORCE to zero immediately (stop swinging)
                if (Math.abs(newVelX) < SETTLE_VELOCITY_THRESHOLD) newVelX = 0
                if (Math.abs(newVelY) < SETTLE_VELOCITY_THRESHOLD) newVelY = 0
                if (Math.abs(newRotationSpeed) < 0.01) newRotationSpeed = 0
                
                // If both velocities are very small, just stop completely
                if (Math.abs(newVelX) < 0.1 && Math.abs(newVelY) < 0.1) {
                  return {
                    ...orange,
                    x: orange.x, // Don't move position
                    y: orange.y,
                    velocityX: 0,
                    velocityY: 0,
                    vx: 0,
                    vy: 0,
                    rotation: orange.rotation, // Keep current rotation
                    rotationSpeed: 0,
                    vr: 0,
                    opacity: 1,
                    hasReachedBottom: true,
                    isSettled: true,
                    grounded: true,
                    isBouncing: false
                  }
                }
                
                const newRotation = orange.rotation + newRotationSpeed
                
                return {
                  ...orange,
                  x: orange.x + newVelX,
                  y: orange.y + newVelY,
                  velocityX: newVelX,
                  velocityY: newVelY,
                  vx: newVelX, // Also update vx/vy
                  vy: newVelY,
                  rotation: newRotation,
                  rotationSpeed: newRotationSpeed,
                  vr: newRotationSpeed,
                  opacity: 1,
                  hasReachedBottom: true,
                  isSettled: newVelX === 0 && newVelY === 0 && newRotationSpeed === 0,
                  grounded: true
                }
              }
            }
            
            // Default: If we reach here and orange isn't grounded, apply physics as fallback
            // This ensures no orange gets stuck without physics
            if (!orange.grounded && !orange.isPickedUp && !orange.smashed) {
              // Fallback physics - apply gravity and update position
              let vx = orange.vx !== undefined ? orange.vx : (orange.velocityX || 0)
              let vy = orange.vy !== undefined ? orange.vy : (orange.velocityY || 0)
              vy += GRAVITY
              let x = orange.x + vx
              let y = orange.y + vy
              const orangeRadius = orange.radius || 28
              const FLOOR_Y = bottomBoundary - orangeRadius
              
              if (y >= FLOOR_Y) {
                y = FLOOR_Y
                vy = -vy * BOUNCE
                vx = vx * 0.92
                if (Math.abs(vy) < SETTLE_VELOCITY_THRESHOLD) {
                  vy = 0
                  vx = 0
                  return { ...orange, x, y, vx: 0, vy: 0, velocityX: 0, velocityY: 0, grounded: true, hasReachedBottom: true, isSettled: true }
                }
              }
              
              vx *= FRICTION
              return { ...orange, x, y, vx, vy, velocityX: vx, velocityY: vy, grounded: false }
            }
            
            // Default: return orange as-is
            return orange
          })
        
          // Note: Smashed oranges cleanup is handled by separate useEffect interval
          // This keeps the main animation loop clean - no cleanup here
          // Ground oranges persist indefinitely - no cap, no fade, only removed by smash
          
          // Dev-only: Invariant check - groundOranges should never decrease except by smash
          const finalUnsmashedCount = updated.filter(o => !o.smashed).length
          const initialUnsmashedCount = prev.filter(o => !o.smashed).length
          const removedOutsideSmash = initialUnsmashedCount - finalUnsmashedCount - orangesToSmashCount
          if (removedOutsideSmash > 0) {
            console.warn(
              `[INVARIANT] Ground oranges removed outside of smash: ${removedOutsideSmash} oranges removed`,
              { initialUnsmashedCount, finalUnsmashedCount, smashedCount: orangesToSmashCount }
            )
          }
          
          return updated
        } catch (error) {
          // CRASH-PROOF: Catch any errors and return previous state unchanged
          console.warn('[OrangeTrail] Error in setGroundOranges callback:', error)
          return prev // Return previous state on error
        }
      })

        rafIdRef.current = requestAnimationFrame(animate)
      }
    }

    rafIdRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [spawnParticle, safeMode])

  // Dedicated physics loop - ensures oranges always fall
  // This runs separately from the main animation loop to guarantee physics updates
  useEffect(() => {
    let running = true

    const GRAVITY = 0.15 // Match main physics - slower falling
    const FLOOR_PAD = 46 // Tune to orange image size
    const BOUNCE = 0.3 // Less bouncy (30% energy retention)
    const FRICTION = 0.988 // Smoother movement

    const physicsLoop = () => {
      // SHIP_MODE: Wrap physics loop in try/catch
      if (SHIP_MODE) {
        try {
          physicsLoopInternal()
        } catch (error) {
          console.warn('[OrangeTrail] Error in physics loop (SHIP_MODE):', error)
          // Continue physics loop even on error - schedule next frame
          if (running) {
            physicsRafRef.current = requestAnimationFrame(physicsLoop)
          }
          return
        }
      } else {
        physicsLoopInternal()
      }
      
      function physicsLoopInternal() {
        const floorY = window.innerHeight - FLOOR_PAD
        
        // Only process if still running
        if (running) {
          setGroundOranges(prev => {
            // SHIP_MODE: Wrap setGroundOranges callback in try/catch
            if (SHIP_MODE) {
              try {
                return physicsUpdateOranges(prev)
              } catch (error) {
                console.warn('[OrangeTrail] Error in physics setGroundOranges (SHIP_MODE):', error)
                return prev // Return previous state on error
              }
            } else {
              return physicsUpdateOranges(prev)
            }
            
            function physicsUpdateOranges(prev) {
              return prev.map(o => {
                // Skip smashed oranges
                if (o.smashed) return o
                
                // Skip picked up oranges (handled elsewhere)
                if (o.isPickedUp) return o
                
                // Don't skip grounded oranges if they're above the floor - fix hanging bug
                // Only skip if they're actually on the ground AND settled AND at floor level
                if (o.grounded === true && o.isSettled === true) {
                  // Double-check they're actually at floor level
                  const orangeRadius = o.radius || 28
                  const floorY = window.innerHeight - FLOOR_PAD
                  if (o.y >= floorY - orangeRadius - 2) {
                    // Ensure settled oranges are completely still (no swinging)
                    return {
                      ...o,
                      vx: 0,
                      vy: 0,
                      velocityX: 0,
                      velocityY: 0,
                      rotationSpeed: 0,
                      vr: 0
                    }
                  }
                  // Otherwise, they're hanging - apply physics!
                }

                let x = o.x ?? 0
                let y = o.y ?? 0
                let vx = o.vx ?? o.velocityX ?? 0
                let vy = o.vy ?? o.velocityY ?? 0

                // Apply gravity
                vy += GRAVITY
                
                // Update position
                x += vx
                y += vy

                // Floor collision - less bouncy
                if (y >= floorY) {
                  y = floorY
                  vy = -vy * BOUNCE
                  vx = vx * 0.90 // Use GROUND_FRICTION value

                  // Settle if velocity is low (higher threshold = less bouncing)
                  if (Math.abs(vy) < 0.4) {
                    vy = 0
                    vx = 0
                    return { ...o, x, y, vx, vy, velocityX: vx, velocityY: vy, grounded: true, hasReachedBottom: true, isSettled: true }
                  }
                  
                  // Less randomness for smoother, less bouncy physics
                  const bounceRandomness = 0.95 + Math.random() * 0.1 // 0.95 to 1.05 multiplier - less variation
                  vy = vy * bounceRandomness
                }

                // Apply friction
                vx *= FRICTION

                return { ...o, x, y, vx, vy, velocityX: vx, velocityY: vy, grounded: false }
              })
            }
          })
        }

        // ALWAYS schedule next frame - even if not running (will be cleaned up by useEffect cleanup)
        if (running) {
          physicsRafRef.current = requestAnimationFrame(physicsLoop)
        }
      }
    }

    // Start the physics loop
    physicsRafRef.current = requestAnimationFrame(physicsLoop)

    return () => {
      running = false
      if (physicsRafRef.current) {
        cancelAnimationFrame(physicsRafRef.current)
      }
    }
  }, []) // Empty deps - run once on mount

  // Cleanup smashed oranges after animation delay
  // This is the ONLY way oranges are removed (never TTL, never fade)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = performance.now()
      setGroundOranges(prev =>
        prev.filter(o => {
          // Keep non-smashed oranges forever
          if (!o.smashed) return true
          // Remove smashed oranges after 0.9s (for splat animation)
          if (o.smashedAt) {
            const timeSinceSmash = now - o.smashedAt
            return timeSinceSmash < 900 // Keep for 0.9s after smash
          }
          return false // Remove if smashed but no timestamp
        })
      )
    }, 200) // Check every 200ms

    return () => clearInterval(cleanupInterval)
  }, [])

  // Track mouse position and handle click/pickup
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseDown = (e) => {
      isMouseDownRef.current = true
      
      // Check if clicking on a ground orange (only ground oranges can be picked up)
      const clickX = e.clientX
      const clickY = e.clientY
      
      setGroundOranges(prev => {
        return prev.map(orange => {
          const distance = Math.sqrt(
            Math.pow(orange.x - clickX, 2) + Math.pow(orange.y - clickY, 2)
          )
          
          // If clicking within 20px of an orange, pick it up
          if (distance < 20 && !orange.isPickedUp) {
            pickedUpOrangeRef.current = orange.id
            return {
              ...orange,
              isPickedUp: true,
              lastMouseX: clickX,
              lastMouseY: clickY,
              velocityX: 0,
              velocityY: 0
            }
          }
          return orange
        })
      })
    }

    const handleMouseUp = (e) => {
      isMouseDownRef.current = false
      
      // Release picked up orange with throw velocity - ALWAYS FALLS AFTER RELEASE
      if (pickedUpOrangeRef.current) {
        setGroundOranges(prev => {
          return prev.map(orange => {
            if (orange.id === pickedUpOrangeRef.current) {
              // Calculate throw velocity from last movement
              const throwVelX = (mousePosRef.current.x - orange.lastMouseX) * 0.3
              const throwVelY = (mousePosRef.current.y - orange.lastMouseY) * 0.3
              
              pickedUpOrangeRef.current = null
              return {
                ...orange,
                isPickedUp: false,
                vx: throwVelX, // Set vx/vy for physics
                vy: throwVelY,
                velocityX: throwVelX,
                velocityY: throwVelY,
                hasReachedBottom: false, // Can be thrown up - will fall again
                isSettled: false, // Reset settled state when thrown
                grounded: false, // CRITICAL: Must be false so physics applies
                isBouncing: false,
                bounceCount: 0 // Reset bounce count for new fall
              }
            }
            return orange
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

  // Smash detection constants
  const SMASH_MIN_DOWN = 22 // Minimum downward movement to count as a slam
  const SMASH_RADIUS_PAD = 8 // Extra forgiveness for collision detection

  // Smash function - called on drag end OR during continuous drag
  const onTangGangSmash = useCallback((windowRect, prevWindowRect, isDragEnd = true) => {
    // SHIP_MODE: Wrap entire smash handler in try/catch
    if (SHIP_MODE) {
      try {
        return onTangGangSmashInternal(windowRect, prevWindowRect, isDragEnd)
      } catch (error) {
        console.warn('[OrangeTrail] Error in onTangGangSmash (SHIP_MODE):', error)
        return // Return early, don't throw
      }
    } else {
      return onTangGangSmashInternal(windowRect, prevWindowRect, isDragEnd)
    }
    
    function onTangGangSmashInternal(windowRect, prevWindowRect, isDragEnd) {
      if (!windowRect) {
        console.log('[OrangeTrail] onTangGangSmash: no windowRect')
        return
      }

      const prevBottom = prevWindowRect?.bottom ?? null
      const deltaDown = prevBottom != null ? (windowRect.bottom - prevBottom) : 0

      // For continuous smashing (while holding), allow position-based smashing (no movement required)
      // For drag end, use higher threshold (original behavior)
      const minDelta = isDragEnd ? SMASH_MIN_DOWN : 0 // 0px for continuous (position-based), 22px for drag end
      
      if (isDragEnd && deltaDown < minDelta) {
        console.log('[OrangeTrail] Smash rejected: deltaDown too small', deltaDown)
        return
      }
      
      // For continuous smashing, we don't require movement - just check if window is over oranges

      // Smash oranges that are actually touched by the window bottom edge - PRECISE COLLISION
      // Only oranges that intersect the window's bottom edge (very small tolerance)
      const windowBottomEdge = windowRect.bottom
      const TOUCH_TOLERANCE = 5 // Small tolerance for "touching" (5px)
      const impactBandTop = windowBottomEdge - TOUCH_TOLERANCE // Just above bottom edge
      const impactBandBottom = windowBottomEdge + TOUCH_TOLERANCE // Just below bottom edge

      // Get bottom boundary to check if orange is on the ground
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
      const taskbarHeight = 30
      const bottomBoundary = viewportHeight - taskbarHeight
      const orangeRadius = 28 // Default orange radius
      const GROUND_TOLERANCE = 5 // Tolerance for "on ground" check

      setGroundOranges(prev => {
        // SHIP_MODE: Wrap setGroundOranges callback in try/catch
        if (SHIP_MODE) {
          try {
            return smashUpdateOranges(prev)
          } catch (error) {
            console.warn('[OrangeTrail] Error in smash setGroundOranges (SHIP_MODE):', error)
            return prev // Return previous state on error
          }
        } else {
          return smashUpdateOranges(prev)
        }
        
        function smashUpdateOranges(prev) {
          let smashedCount = 0

          const next = prev.map(o => {
            if (o.smashed) return o

            // ONLY smash oranges that are on the ground (at bottom of screen)
            const orangeBottomY = o.y + (o.radius || orangeRadius)
            const isOnGround = orangeBottomY >= bottomBoundary - GROUND_TOLERANCE
            
            if (!isOnGround) return o // Skip oranges that aren't on the ground

            // Calculate orange bounds - PRECISE COLLISION (only if actually touched)
            // Orange is centered at o.x, o.y, so we need to account for that
            const orangeRad = o.radius || orangeRadius
            // No extra padding - only smash if window bottom actually touches orange
            const ox1 = o.x - orangeRad // Left edge (no padding)
            const ox2 = o.x + orangeRad // Right edge (no padding)
            const oy1 = o.y - orangeRad // Top edge (no padding)
            const oy2 = o.y + orangeRad // Bottom edge (no padding)

            // Check collision with impact band (window bottom edge)
            const hit =
              ox2 >= windowRect.left &&
              ox1 <= windowRect.right &&
              oy2 >= impactBandTop &&
              oy1 <= impactBandBottom

            if (!hit) return o

            smashedCount++
            return { ...o, smashed: true, smashedAt: performance.now() }
          })

          if (smashedCount > 0) {
            // Score goes up based on smashed oranges
            setSmashedScore(s => s + smashedCount)
            setSmashedCount(s => s + smashedCount)
            // Update juice (clamped to max) and sync to context
            setJuice(prevJuice => {
              const newJuice = Math.min(prevJuice + smashedCount, JUICE_MAX)
              // Sync smashed count to context for banner display
              setSmashed(newJuice)
              return newJuice
            })

            // Trigger juice effects if not in safe mode
            if (!safeMode && typeof window !== 'undefined' && window.dispatchEvent) {
              try {
                // Calculate center of smash for juice effect
                const smashCenterX = windowRect.left + windowRect.width / 2
                const smashCenterY = windowRect.bottom
                window.dispatchEvent(new CustomEvent('orange-smash', {
                  detail: { x: smashCenterX, y: smashCenterY }
                }))
              } catch (error) {
                console.warn('[OrangeTrail] Failed to dispatch orange-smash event:', error)
              }
            }

            console.log('[OrangeTrail] Smash successful!', { deltaDown, smashedCount, totalOranges: prev.length })
          }

          return next
        }
      })
    }
  }, [safeMode, JUICE_MAX, setSmashed])

  // Expose functions to window
  useEffect(() => {
    window.__orangeTrail = {
      startDragging: (windowRect) => {
        isDraggingRef.current = true
        windowRectRef.current = windowRect
        spawnRateRef.current = 50 + Math.random() * 30 // 50-80 particles/sec (faster swarming!)
        lastSpawnTimeRef.current = Date.now()
        // Store initial position for drag tracking - get actual rect
        const tanggangWindow = typeof document !== 'undefined' ? document.getElementById('tanggang') : null
        if (tanggangWindow) {
          const rect = tanggangWindow.getBoundingClientRect()
          lastDragYRef.current = rect.bottom
          lastDragTimeRef.current = performance.now()
          prevWindowRectRef.current = {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }
        } else if (windowRect) {
          // Fallback if window not found
          lastDragYRef.current = windowRect.y + (windowRect.height || 0)
          lastDragTimeRef.current = performance.now()
          prevWindowRectRef.current = {
            left: windowRect.x || 0,
            right: (windowRect.x || 0) + (windowRect.width || 0),
            top: windowRect.y || 0,
            bottom: (windowRect.y || 0) + (windowRect.height || 0),
            width: windowRect.width || 0,
            height: windowRect.height || 0
          }
        }
      },
      updateWindowRect: (windowRect) => {
        windowRectRef.current = windowRect
        // Track drag movement for smash detection - update previous rect
        const tanggangWindow = typeof document !== 'undefined' ? document.getElementById('tanggang') : null
        let currentRect = null
        
        if (tanggangWindow) {
          currentRect = tanggangWindow.getBoundingClientRect()
          lastDragYRef.current = currentRect.bottom
          lastDragTimeRef.current = performance.now()
        } else if (windowRect && windowRect.bottom !== undefined) {
          currentRect = {
            left: windowRect.left || windowRect.x || 0,
            right: windowRect.right || (windowRect.x || 0) + (windowRect.width || 0),
            top: windowRect.top || windowRect.y || 0,
            bottom: windowRect.bottom || (windowRect.y || 0) + (windowRect.height || 0),
            width: windowRect.width || 0,
            height: windowRect.height || 0
          }
          lastDragYRef.current = currentRect.bottom
          lastDragTimeRef.current = performance.now()
        }
        
        // Continuous smash detection during drag (while holding)
        // Check if window is over oranges, regardless of movement - allows smashing while holding still
        if (currentRect) {
          const now = performance.now()
          const timeSinceLastSmash = now - lastSmashCheckTimeRef.current
          
          // Check for smash if cooldown has passed (allows continuous smashing)
          if (timeSinceLastSmash >= CONTINUOUS_SMASH_COOLDOWN_MS) {
            // Always check for continuous smashing - position-based, not movement-based
            // This allows smashing even when holding window still over oranges
            // Use a fake previous rect slightly above current position to ensure deltaDown is positive
            const checkPrevRect = prevWindowRectRef.current || {
              ...currentRect,
              bottom: currentRect.bottom - 10 // Fake 10px above to ensure positive deltaDown
            }
            
            // Call smash function - it will check position, not just movement
            onTangGangSmash(currentRect, checkPrevRect, false) // false = continuous, not drag end
            lastSmashCheckTimeRef.current = now
          }
        }
        
        // Update previous rect for next comparison
        if (currentRect) {
          prevWindowRectRef.current = {
            left: currentRect.left,
            right: currentRect.right,
            top: currentRect.top,
            bottom: currentRect.bottom,
            width: currentRect.width,
            height: currentRect.height
          }
        }
      },
      stopDragging: (windowRect, prevRect) => {
        // SHIP_MODE: Wrap in try/catch
        if (SHIP_MODE) {
          try {
            return stopDraggingInternal(windowRect, prevRect)
          } catch (error) {
            console.warn('[OrangeTrail] Error in stopDragging (SHIP_MODE):', error)
            return
          }
        } else {
          return stopDraggingInternal(windowRect, prevRect)
        }
        
        function stopDraggingInternal(windowRect, prevRect) {
          isDraggingRef.current = false
          spawnRateRef.current = 0
          
          // On drag end, check for smash
          // Use provided prevRect or fallback to stored ref
          const prevWindowRect = prevRect || prevWindowRectRef.current
          if (windowRect && prevWindowRect) {
            const rect = typeof window !== 'undefined' && document.getElementById('tanggang')
              ? document.getElementById('tanggang').getBoundingClientRect()
              : windowRect
            onTangGangSmash(rect, prevWindowRect)
          }
          
          // Reset previous rect
          prevWindowRectRef.current = null
        }
      },
      // Expose prevWindowRectRef for useDraggable to access
      prevWindowRectRef: prevWindowRectRef
    }

    return () => {
      delete window.__orangeTrail
    }
  }, [onTangGangSmash])

  const handleClaimPrize = () => {
    if (juice >= JUICE_MAX) {
      // Note: Prizes claimed is now date-derived (deterministic), not incremented on click
      // The count is computed from calendar days, so clicking claim doesn't change it
      
      setShowTreasureWindow(true)
      // Reset juice (no persistence - resets on page load)
      setJuice(0)
      setSmashedScore(0)
      // Reset banner by resetting smashed count in context
      resetGame()
      // Dispatch event to trigger banner reset animation
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orange-game-reset'))
      }
      // Note: Treasure window always shows "TRY AGAIN" - user can NEVER win
    }
  }

  const juicePercentage = (juice / JUICE_MAX) * 100

  // Dev-only: Invariant check - JuiceCanvas should exist where used
  // Guard: Ensure JuiceCanvas is imported and available
  const canRenderJuiceCanvas = !safeMode && typeof JuiceCanvas !== 'undefined'
  
  return (
    <>
      {/* Juice Canvas for extreme effects - only render if not in safe mode and component exists */}
      {canRenderJuiceCanvas && <JuiceCanvas />}
      
      {/* Fake OS messages for Desktop Destroyer vibes */}
      {!safeMode && <FakeOSMessage />}

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
        {/* Juice Glass with Fill Meter - Windows 98 aesthetic */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Glass container with 3D border effect */}
          <div style={{ 
            position: 'relative',
            width: '40px',
            height: '50px',
            border: '2px outset #c0c0c0', // Windows 98 3D border
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '2px',
            boxShadow: 'inset 1px 1px 0 #000, inset -1px -1px 0 #808080', // Inner shadow for depth
          }}>
            {/* Fill bar - visual fill from 0% to 100% based on juice count */}
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#ff8c00', // Orange juice color
              transform: `scaleY(${juicePercentage / 100})`,
              transformOrigin: 'bottom',
              transition: 'transform 0.2s ease',
              minHeight: juicePercentage > 0 ? '2px' : '0',
              borderTop: juicePercentage > 0 ? '1px solid #ffa500' : 'none', // Highlight at top
            }} />
            {/* Glass icon overlay - always visible */}
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
              opacity: 0.3, // Subtle icon overlay
            }}>
              🧃
            </div>
          </div>
          {/* Juice count display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#000' }}>
              {juice} / {JUICE_MAX}
            </span>
            <span style={{ fontSize: '10px', color: '#666' }}>
              Smashed: {smashedScore}
            </span>
          </div>
        </div>

        {/* CLAIM Button - only shows when juice >= JUICE_MAX */}
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
            CLAIM
          </button>
        )}
      </div>

      {/* Treasure Window - always shows fixed "No luck try again" text */}
      {showTreasureWindow && (
        <TreasureWindow
          isOpen={showTreasureWindow}
          onClose={() => setShowTreasureWindow(false)}
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
        {/* Splash stains - only render if not in safe mode */}
        {!safeMode && splashStains.map(stain => (
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

        {/* Ground oranges - persistent, no TTL, no fade */}
        {groundOranges.map(orange => (
          <span
            key={orange.id}
            style={{
              position: 'absolute',
              left: `${orange.x}px`,
              top: `${orange.y}px`,
              fontSize: '56px',
              opacity: orange.opacity,
              transform: `translate(-50%, -50%) rotate(${orange.rotation || 0}deg)`,
              pointerEvents: orange.hasReachedBottom ? 'auto' : 'none', // Allow interaction only when on ground
              userSelect: 'none',
              willChange: 'transform, opacity',
              cursor: orange.hasReachedBottom ? 'pointer' : 'default',
            }}
          >
            🍊
          </span>
        ))}

        {/* Juice particles - temporary with TTL, fade out - only render if not in safe mode */}
        {!safeMode && juiceParticles.map(particle => (
          <span
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              fontSize: '12px', // Smaller droplets
              opacity: particle.opacity,
              transform: `translate(-50%, -50%) rotate(${particle.rotation || 0}deg)`,
              pointerEvents: 'none', // Juice particles are not interactive
              userSelect: 'none',
              willChange: 'transform, opacity',
            }}
          >
            🧃
          </span>
        ))}
      </div>
    </>
  )
}

