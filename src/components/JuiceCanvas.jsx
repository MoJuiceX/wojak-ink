import { useEffect, useRef } from 'react'

// Performance caps - hard limits for droplets, splats, and drip trails
const MAX_DROPLETS = 2000 // Increased from 1200 for more extreme effects
const MAX_SPLATS = 80 // Increased from 60 for more extreme effects
const MAX_DRIP_TRAILS = 100 // Cap for drip trails (slow downward drips from splats)

/**
 * JuiceCanvas - Full-screen canvas overlay for extreme juice effects
 * - pointer-events: none (doesn't block interactions)
 * - Uses requestAnimationFrame for smooth rendering
 * - Draws droplets and splats with hard performance caps
 */
export default function JuiceCanvas() {
  const canvasRef = useRef(null)
  const dropletsRef = useRef([])
  const splatsRef = useRef([])
  const dripTrailsRef = useRef([]) // Drip trails from splats (slow downward drips)
  const shakeOffsetRef = useRef({ x: 0, y: 0 })
  const shakeEndTimeRef = useRef(0)
  const rafIdRef = useRef(null)

  // Listen for smash events
  useEffect(() => {
    const handleSmash = (event) => {
      const { x, y } = event.detail
      triggerBigSplurt(x, y)
      triggerScreenShake()
    }

    window.addEventListener('orange-smash', handleSmash)
    return () => window.removeEventListener('orange-smash', handleSmash)
  }, [])

  const triggerBigSplurt = (x, y) => {
    // Ridiculous droplet count: 500-1200 per smash (increased from 150-400)
    const dropletCount = 500 + Math.floor(Math.random() * 701) // 500-1200
    
    // Ridiculous splat count: 8-20 normal splats + occasional mega splat
    const splatCount = 8 + Math.floor(Math.random() * 13) // 8-20
    const hasMegaSplat = Math.random() < 0.3 // 30% chance for mega splat

    // Spawn droplets with higher velocity and wider spread
    for (let i = 0; i < dropletCount; i++) {
      // Wider angle spread for more chaotic effect
      const angle = (Math.PI * 2 * Math.random())
      // Higher velocity: 5-15 (increased from 3-11) - droplets fly farther
      const speed = 5 + Math.random() * 10
      // Stronger upward bias for more dramatic effect
      const upwardBias = -0.7 // Increased from -0.6
      
      const velX = Math.cos(angle) * speed
      const velY = Math.sin(angle) * speed + upwardBias * speed

      dropletsRef.current.push({
        x,
        y,
        velocityX: velX,
        velocityY: velY,
        radius: 2 + Math.random() * 3, // 2-5px
        opacity: 0.8 + Math.random() * 0.2, // 0.8-1.0
        age: 0,
        lifetime: 2000 + Math.random() * 2000, // 2-4 seconds
        gravity: 0.2 + Math.random() * 0.1, // 0.2-0.3
        drag: 0.98 + Math.random() * 0.01, // 0.98-0.99
        createdAt: Date.now(), // Track creation time for oldest-first removal
      })
    }

    // Spawn normal splats (8-20) with optional drip trails
    for (let i = 0; i < splatCount; i++) {
      const offsetX = (Math.random() - 0.5) * 200
      const offsetY = (Math.random() - 0.5) * 150
      const size = 40 + Math.random() * 80 // 40-120px
      
      const splatX = x + offsetX
      const splatY = y + offsetY
      
      splatsRef.current.push({
        x: splatX,
        y: splatY,
        size,
        opacity: 0.7 + Math.random() * 0.2, // 0.7-0.9
        age: 0,
        lifetime: 6000 + Math.random() * 6000, // 6-12 seconds (slow fade for persistent mess)
        points: generateSplatShape(size), // Irregular blob shape
        createdAt: Date.now(), // Track creation time for oldest-first removal
      })
      
      // Spawn optional drip trails from splat (30% chance, 1-3 drips per splat)
      if (Math.random() < 0.3) {
        const dripCount = 1 + Math.floor(Math.random() * 3) // 1-3 drips
        for (let j = 0; j < dripCount; j++) {
          // Drip starts from bottom edge of splat
          const dripOffsetX = (Math.random() - 0.5) * (size * 0.5)
          const dripStartX = splatX + dripOffsetX
          const dripStartY = splatY + (size * 0.3) // Start from lower part of splat
          
          dripTrailsRef.current.push({
            x: dripStartX,
            y: dripStartY,
            startY: dripStartY, // Track where drip started
            length: 0, // Current length of drip trail
            maxLength: 50 + Math.random() * 100, // 50-150px max length
            speed: 0.1 + Math.random() * 0.2, // 0.1-0.3 pixels per frame (slow)
            opacity: 0.5 + Math.random() * 0.3, // 0.5-0.8
            width: 1 + Math.random() * 2, // 1-3px width
            age: 0,
            lifetime: 10000 + Math.random() * 5000, // 10-15 seconds (persistent)
            createdAt: Date.now(),
          })
        }
      }
    }

    // Spawn occasional mega splat (30% chance) with more drip trails
    if (hasMegaSplat) {
      const megaOffsetX = (Math.random() - 0.5) * 150
      const megaOffsetY = (Math.random() - 0.5) * 100
      const megaSize = 150 + Math.random() * 100 // 150-250px (much larger!)
      
      const megaSplatX = x + megaOffsetX
      const megaSplatY = y + megaOffsetY
      
      splatsRef.current.push({
        x: megaSplatX,
        y: megaSplatY,
        size: megaSize,
        opacity: 0.8 + Math.random() * 0.15, // 0.8-0.95 (more opaque)
        age: 0,
        lifetime: 8000 + Math.random() * 4000, // 8-12 seconds (longer lasting, slow fade)
        points: generateSplatShape(megaSize), // Irregular blob shape
        createdAt: Date.now(),
      })
      
      // Mega splats spawn more drip trails (50% chance, 2-5 drips)
      if (Math.random() < 0.5) {
        const megaDripCount = 2 + Math.floor(Math.random() * 4) // 2-5 drips
        for (let j = 0; j < megaDripCount; j++) {
          const dripOffsetX = (Math.random() - 0.5) * (megaSize * 0.6)
          const dripStartX = megaSplatX + dripOffsetX
          const dripStartY = megaSplatY + (megaSize * 0.3)
          
          dripTrailsRef.current.push({
            x: dripStartX,
            y: dripStartY,
            startY: dripStartY,
            length: 0,
            maxLength: 80 + Math.random() * 120, // 80-200px max length (longer for mega splats)
            speed: 0.1 + Math.random() * 0.2,
            opacity: 0.6 + Math.random() * 0.3, // 0.6-0.9 (more visible)
            width: 2 + Math.random() * 2, // 2-4px width (thicker)
            age: 0,
            lifetime: 12000 + Math.random() * 6000, // 12-18 seconds (more persistent)
            createdAt: Date.now(),
          })
        }
      }
    }

    // Enforce limits - drop oldest first
    if (dropletsRef.current.length > MAX_DROPLETS) {
      // Sort by creation time (oldest first) and keep only the newest MAX_DROPLETS
      dropletsRef.current.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      dropletsRef.current = dropletsRef.current.slice(-MAX_DROPLETS)
    }
    if (splatsRef.current.length > MAX_SPLATS) {
      // Sort by creation time (oldest first) and keep only the newest MAX_SPLATS
      splatsRef.current.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      splatsRef.current = splatsRef.current.slice(-MAX_SPLATS)
    }
    if (dripTrailsRef.current.length > MAX_DRIP_TRAILS) {
      // Sort by creation time (oldest first) and keep only the newest MAX_DRIP_TRAILS
      dripTrailsRef.current.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      dripTrailsRef.current = dripTrailsRef.current.slice(-MAX_DRIP_TRAILS)
    }
  }

  const generateSplatShape = (size) => {
    const pointCount = 8 + Math.floor(Math.random() * 8) // 8-15 points
    const points = []
    for (let i = 0; i < pointCount; i++) {
      const angle = (Math.PI * 2 * i) / pointCount
      const radius = size * (0.6 + Math.random() * 0.4) // Vary radius for irregularity
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      })
    }
    return points
  }

  const triggerScreenShake = () => {
    // Small screen shake on smash (120ms duration)
    shakeEndTimeRef.current = Date.now() + 120
  }

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let lastTime = Date.now()
    
    const animate = () => {
      const now = Date.now()
      const deltaTime = now - lastTime
      lastTime = now
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update screen shake
      if (now < shakeEndTimeRef.current) {
        const intensity = (shakeEndTimeRef.current - now) / 120
        shakeOffsetRef.current = {
          x: (Math.random() - 0.5) * 8 * intensity,
          y: (Math.random() - 0.5) * 8 * intensity,
        }
      } else {
        shakeOffsetRef.current = { x: 0, y: 0 }
      }

      // Apply shake offset
      ctx.save()
      ctx.translate(shakeOffsetRef.current.x, shakeOffsetRef.current.y)

      // Update and draw droplets (with hard performance cap)
      dropletsRef.current = dropletsRef.current.filter(droplet => {
        droplet.age += deltaTime
        const progress = droplet.age / droplet.lifetime
        droplet.opacity = Math.max(0, (1 - progress) * droplet.opacity)

        if (droplet.opacity <= 0 || droplet.age >= droplet.lifetime) {
          return false
        }

        // Apply physics
        droplet.velocityY += droplet.gravity
        droplet.velocityX *= droplet.drag
        droplet.velocityY *= droplet.drag
        droplet.x += droplet.velocityX
        droplet.y += droplet.velocityY

        // Draw droplet
        ctx.fillStyle = `rgba(255, 140, 0, ${droplet.opacity})` // Orange color
        ctx.beginPath()
        ctx.arc(droplet.x, droplet.y, droplet.radius, 0, Math.PI * 2)
        ctx.fill()

        return true
      })
      
      // Enforce hard cap on droplets - drop oldest first
      if (dropletsRef.current.length > MAX_DROPLETS) {
        // Sort by creation time (oldest first) and keep only the newest MAX_DROPLETS
        dropletsRef.current.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        dropletsRef.current = dropletsRef.current.slice(-MAX_DROPLETS)
      }

      // Update and draw splats (with hard performance cap)
      // Splats fade slowly over 6-12 seconds for persistent "mess" feel
      splatsRef.current = splatsRef.current.filter(splat => {
        splat.age += deltaTime
        const progress = splat.age / splat.lifetime
        // Slow fade - opacity decreases gradually over lifetime
        splat.opacity = Math.max(0, (1 - progress) * (splat.opacity || 0.7))

        if (splat.opacity <= 0 || splat.age >= splat.lifetime) {
          return false
        }

        // Draw splat (irregular blob) - persistent stain
        ctx.fillStyle = `rgba(255, 140, 0, ${splat.opacity * 0.6})` // Semi-transparent orange
        ctx.beginPath()
        ctx.moveTo(splat.x + splat.points[0].x, splat.y + splat.points[0].y)
        for (let i = 1; i < splat.points.length; i++) {
          ctx.lineTo(splat.x + splat.points[i].x, splat.y + splat.points[i].y)
        }
        ctx.closePath()
        ctx.fill()

        return true
      })
      
      // Enforce hard cap on splats - drop oldest first
      if (splatsRef.current.length > MAX_SPLATS) {
        // Sort by creation time (oldest first) and keep only the newest MAX_SPLATS
        splatsRef.current.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        splatsRef.current = splatsRef.current.slice(-MAX_SPLATS)
      }

      // Update and draw drip trails (slow downward drips from splats)
      const viewportHeight = window.innerHeight
      const taskbarHeight = 30
      const bottomBoundary = viewportHeight - taskbarHeight
      
      dripTrailsRef.current = dripTrailsRef.current.filter(drip => {
        drip.age += deltaTime
        const progress = drip.age / drip.lifetime
        
        // Drip slowly extends downward
        if (drip.length < drip.maxLength) {
          drip.length += drip.speed * (deltaTime / 16) // Scale by frame time
          drip.length = Math.min(drip.length, drip.maxLength)
        }
        
        // Update drip position (slowly falls)
        drip.y += drip.speed * (deltaTime / 16)
        
        // Fade opacity over time
        drip.opacity = Math.max(0, (1 - progress) * (drip.opacity || 0.6))
        
        // Remove if faded, expired, or reached bottom
        if (drip.opacity <= 0 || drip.age >= drip.lifetime || drip.y >= bottomBoundary) {
          return false
        }

        // Draw drip trail (vertical line that extends downward)
        const dripEndY = drip.y + drip.length
        const gradient = ctx.createLinearGradient(drip.x, drip.y, drip.x, dripEndY)
        gradient.addColorStop(0, `rgba(255, 140, 0, ${drip.opacity * 0.8})`) // More opaque at top
        gradient.addColorStop(1, `rgba(255, 140, 0, ${drip.opacity * 0.3})`) // Fades at bottom
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = drip.width
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(drip.x, drip.y)
        ctx.lineTo(drip.x, dripEndY)
        ctx.stroke()

        return true
      })
      
      // Enforce hard cap on drip trails - drop oldest first
      if (dripTrailsRef.current.length > MAX_DRIP_TRAILS) {
        // Sort by creation time (oldest first) and keep only the newest MAX_DRIP_TRAILS
        dripTrailsRef.current.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        dripTrailsRef.current = dripTrailsRef.current.slice(-MAX_DRIP_TRAILS)
      }

      ctx.restore()

      rafIdRef.current = requestAnimationFrame(animate)
    }

    rafIdRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Full-screen overlay that doesn't block interactions
        zIndex: 100, // Above background, below windows (windows typically start at 1000+)
      }}
    />
  )
}

