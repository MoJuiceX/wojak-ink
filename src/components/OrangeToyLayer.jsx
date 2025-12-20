import { useEffect, useRef, useState, useCallback } from 'react'
import { useWindow } from '../contexts/WindowContext'
import { useOrangeToy } from '../contexts/OrangeToyContext'
import './OrangeToyLayer.css'

const ORANGE_SIZE = 150
const ORANGE_RADIUS = ORANGE_SIZE / 2
const GRAVITY = 0.8
const BOUNCE_DAMPING = 0.88 // 0.85-0.92 = super bouncy, always stays bouncy
const FRICTION = 0.98
const MOUSE_RADIUS = 20 // Mouse paddle radius
const MOUSE_BOUNCE_RESTITUTION = 0.9 // Very bouncy off mouse paddle
const MOUSE_UPWARD_BONUS = 6 // Upward push to make juggling easier
const MOUSE_BOUNCE_COOLDOWN_MS = 140 // Cooldown between scored bounces
const AIRBORNE_THRESHOLD = 6 // Pixels above floor to be considered airborne
const SETTLE_THRESHOLD = 0.5
const WAKE_UP_DISTANCE = 100 // Distance from mouse to wake up sleeping orange

export default function OrangeToyLayer() {
  const { getWindow, isWindowMinimized } = useWindow()
  const { score, incrementScore, requiredScore, fillPct, orangeExistsRef } = useOrangeToy()
  const orangeRef = useRef(null)
  const rafRef = useRef(null)
  const isSleepingRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const taskbarHeightRef = useRef(48) // Default fallback
  const animationTimeoutsRef = useRef([])
  
  // Combo state refs
  const comboAliveRef = useRef(false) // True if no ground touch since last scored mouse bounce
  const lastScoredBounceAtRef = useRef(0) // performance.now() timestamp of last scored bounce
  const wasInContactRef = useRef(false) // Was mouse in contact last frame
  const airBounceStreakRef = useRef(0) // Counts consecutive mouse bounces since last ground touch
  
  const [orangeExists, setOrangeExists] = useState(false)
  const [splashAnimations, setSplashAnimations] = useState([])
  const [plusOneAnimations, setPlusOneAnimations] = useState([])

  // Orange state: { x, y, vx, vy, rotation }
  const orangeStateRef = useRef(null)

  // Helper function to initialize orange state consistently (always bouncy)
  const initOrangeState = useCallback((spawnX, spawnY) => {
    return {
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 2, // Random small horizontal velocity
      vy: -6, // Upward velocity to start bouncing
      rotation: 0,
      rotationVel: 0
    }
  }, [])

  // Read taskbar height once on mount
  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement)
    const taskbarHeight = parseFloat(rootStyle.getPropertyValue('--taskbar-height')) || 48
    taskbarHeightRef.current = taskbarHeight
  }, [])

  // Check if TangGang window is open
  const tanggangWindow = getWindow('tanggang')
  const isTangGangOpen = tanggangWindow && !isWindowMinimized('tanggang')

  // Spawn orange when TangGang opens and spawnOrange() is called (checks orangeExistsRef)
  useEffect(() => {
    if (isTangGangOpen && !orangeExists && orangeExistsRef?.current) {
      // Spawn at random X position near top, clamped to viewport
      const maxX = window.innerWidth - ORANGE_RADIUS
      const minX = ORANGE_RADIUS
      const spawnX = Math.max(minX, Math.min(maxX, Math.random() * (window.innerWidth - ORANGE_SIZE) + ORANGE_RADIUS))
      const spawnY = 50
      
      // Use consistent initialization (always bouncy)
      orangeStateRef.current = initOrangeState(spawnX, spawnY)
      
      // Reset combo refs on spawn
      comboAliveRef.current = false
      lastScoredBounceAtRef.current = 0
      wasInContactRef.current = false
      airBounceStreakRef.current = 0
      
      setOrangeExists(true)
      // Reset the spawn flag after spawning
      orangeExistsRef.current = false
      // Start animation loop directly
      isSleepingRef.current = false
    }
  }, [isTangGangOpen, orangeExists, orangeExistsRef, initOrangeState])

  // Remove orange when TangGang closes
  useEffect(() => {
    if (!isTangGangOpen && orangeExists) {
      orangeStateRef.current = null
      setOrangeExists(false)
      if (orangeExistsRef) {
        orangeExistsRef.current = false
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isTangGangOpen, orangeExists, orangeExistsRef])

  // Handle mouse bounce callback - defined early so it can be used in animation loop
  const handleMouseBounce = useCallback((x, y) => {
    // Add splash animation
    const splashId = performance.now()
    setSplashAnimations(prev => [...prev, { id: splashId, x, y }])
    const splashTimeout = setTimeout(() => {
      setSplashAnimations(prev => prev.filter(s => s.id !== splashId))
    }, 600)
    animationTimeoutsRef.current.push(splashTimeout)

    // Add +1 animation
    const plusOneId = performance.now() + 1
    setPlusOneAnimations(prev => [...prev, { id: plusOneId, x, y }])
    const plusOneTimeout = setTimeout(() => {
      setPlusOneAnimations(prev => prev.filter(p => p.id !== plusOneId))
    }, 1000)
    animationTimeoutsRef.current.push(plusOneTimeout)

    // Increment score (via context)
    incrementScore()
  }, [incrementScore])

  // Start animation loop - defined before wakeUp
  const startAnimationLoop = useCallback(() => {
    if (rafRef.current) return // Already running

    const animate = () => {
      if (!orangeStateRef.current || !orangeRef.current) {
        rafRef.current = null
        return
      }

      const state = orangeStateRef.current
      const floor = window.innerHeight - taskbarHeightRef.current

      // Check if TangGang window is open (check dynamically, not from closure)
      const tanggangWindow = getWindow('tanggang')
      const isTangGangOpenNow = tanggangWindow && !isWindowMinimized('tanggang')

      // Apply gravity
      state.vy += GRAVITY

      // Update position
      state.x += state.vx
      state.y += state.vy

      // Update rotation based on horizontal velocity
      state.rotationVel = state.vx * 0.1
      state.rotation += state.rotationVel

      // Bounce off side walls
      if (state.x - ORANGE_RADIUS < 0) {
        state.x = ORANGE_RADIUS
        state.vx = -state.vx * BOUNCE_DAMPING
        state.rotationVel *= -0.5
      } else if (state.x + ORANGE_RADIUS > window.innerWidth) {
        state.x = window.innerWidth - ORANGE_RADIUS
        state.vx = -state.vx * BOUNCE_DAMPING
        state.rotationVel *= -0.5
      }

      // Bounce on floor
      const orangeBottom = state.y + ORANGE_RADIUS
      if (orangeBottom >= floor) {
        state.y = floor - ORANGE_RADIUS
        // Always apply bounce damping (keeps orange bouncy forever)
        state.vy = -state.vy * BOUNCE_DAMPING
        state.vx *= FRICTION
        state.rotationVel *= FRICTION
        
        // Ground collision resets combo and juggle streak
        comboAliveRef.current = false
        airBounceStreakRef.current = 0
      }

      // Mouse paddle collision + bounce (always bounces when overlapping)
      const now = performance.now()
      const mouseX = lastMousePosRef.current.x
      const mouseY = lastMousePosRef.current.y
      const dx = state.x - mouseX
      const dy = state.y - mouseY
      const dist = Math.hypot(dx, dy)
      const contactRadius = ORANGE_RADIUS + MOUSE_RADIUS
      const isInContact = dist < contactRadius

      // Wake up sleeping orange if mouse is nearby (during active animation)
      if (isSleepingRef.current && dist < WAKE_UP_DISTANCE) {
        isSleepingRef.current = false
        // Continue animation loop
        rafRef.current = requestAnimationFrame(animate)
        return // Skip rest of frame, will continue next frame
      }

      if (isInContact && dist > 0.001) {
        // Compute collision normal from mouse → orange
        const invDist = 1 / Math.max(dist, 0.001)
        const nx = dx * invDist
        const ny = dy * invDist

        // Resolve penetration so orange is no longer inside mouse paddle (prevents sticking)
        const penetration = contactRadius - dist
        state.x += nx * penetration
        state.y += ny * penetration

        // Bounce velocity (reflect away from paddle) - ALWAYS happens, even if not scoring
        // Compute velocity along normal
        const vn = state.vx * nx + state.vy * ny

        // If moving into paddle, reflect it
        if (vn < 0) {
          state.vx = state.vx - (1 + MOUSE_BOUNCE_RESTITUTION) * vn * nx
          state.vy = state.vy - (1 + MOUSE_BOUNCE_RESTITUTION) * vn * ny
        }

        // Add small "paddle push" upward to make juggling easier
        state.vy -= MOUSE_UPWARD_BONUS

        // 3-hit juggle scoring: only score after 3 consecutive mouse bounces
        const contactEntered = !wasInContactRef.current
        const airborne = orangeBottom < (floor - AIRBORNE_THRESHOLD)
        const cooldownOk = (now - lastScoredBounceAtRef.current) >= MOUSE_BOUNCE_COOLDOWN_MS

        // On valid mouse bounce (contact enter + airborne + cooldown)
        if (contactEntered && airborne && cooldownOk) {
          // Increment juggle streak
          airBounceStreakRef.current += 1

          // Award point only on 3rd consecutive bounce
          if (airBounceStreakRef.current >= 3) {
            incrementScore()
            handleMouseBounce(state.x, state.y)
            // Reset streak after scoring
            airBounceStreakRef.current = 0
          }

          // Activate/continue combo
          comboAliveRef.current = true
          lastScoredBounceAtRef.current = now
        }
      }

      // Update contact state for next frame
      wasInContactRef.current = isInContact

      // Apply friction
      state.vx *= FRICTION

      // Update DOM directly (NO React setState)
      orangeRef.current.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.rotation}deg)`

      // Check for sleep mode
      const totalVelocity = Math.sqrt(state.vx * state.vx + state.vy * state.vy)
      const orangeBottomForSleep = state.y + ORANGE_RADIUS
      const isSettled = totalVelocity < SETTLE_THRESHOLD && 
                       Math.abs(orangeBottomForSleep - floor) < 5

      if (isSettled) {
        isSleepingRef.current = true
        rafRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [orangeExists, getWindow, isWindowMinimized, handleMouseBounce, incrementScore])

  // Wake up function - defined after startAnimationLoop
  const wakeUp = useCallback(() => {
    if (isSleepingRef.current) {
      isSleepingRef.current = false
      startAnimationLoop()
    }
  }, [startAnimationLoop])

  // Lightweight mousemove listener - updates position ref and wakes up sleeping orange
  useEffect(() => {
    const handleMouseMove = (e) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      
      // Wake up sleeping orange if mouse is nearby
      if (isSleepingRef.current && orangeStateRef.current && orangeRef.current) {
        const dx = orangeStateRef.current.x - e.clientX
        const dy = orangeStateRef.current.y - e.clientY
        const dist = Math.hypot(dx, dy)
        
        if (dist < WAKE_UP_DISTANCE) {
          isSleepingRef.current = false
          startAnimationLoop()
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [startAnimationLoop])

  // Start animation when orange exists
  useEffect(() => {
    if (orangeExists && !isSleepingRef.current) {
      startAnimationLoop()
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [orangeExists, startAnimationLoop])


  // Cleanup animation timeouts on unmount
  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      animationTimeoutsRef.current = []
    }
  }, [])

  if (!isTangGangOpen && !orangeExists) {
    return null
  }

  return (
    <div className="orange-toy-layer">
      {orangeExists && (
        <div
          ref={orangeRef}
          className="orange"
          style={{
            position: 'fixed',
            left: '-75px',
            top: '-75px',
            width: `${ORANGE_SIZE}px`,
            height: `${ORANGE_SIZE}px`,
            fontSize: `${ORANGE_SIZE}px`,
            lineHeight: `${ORANGE_SIZE}px`,
            textAlign: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
            willChange: 'transform',
            transform: 'translate(0, 0)',
            zIndex: 10000,
          }}
        >
          🍊
        </div>
      )}

      {/* Splash animations */}
      {splashAnimations.map(splash => (
        <div
          key={splash.id}
          className="splash-animation"
          style={{
            position: 'fixed',
            left: `${splash.x}px`,
            top: `${splash.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10001,
          }}
        >
          <div className="splash-circle"></div>
        </div>
      ))}

      {/* +1 animations */}
      {plusOneAnimations.map(plusOne => (
        <div
          key={plusOne.id}
          className="plus-one-animation"
          style={{
            position: 'fixed',
            left: `${plusOne.x}px`,
            top: `${plusOne.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10002,
          }}
        >
          +1
        </div>
      ))}

      {/* Juice box meter */}
      <div className="orange-game-ui" style={{ zIndex: 10003 }}>
        <div className="juice-meter">
          <div className="juice-meter-label">🧃 Juice</div>
          <div className="juice-meter-bar">
            <div 
              className="juice-meter-fill"
              style={{ width: `${fillPct * 100}%` }}
            />
          </div>
          <div className="juice-meter-text">{score} / {requiredScore}</div>
        </div>
      </div>
    </div>
  )
}
