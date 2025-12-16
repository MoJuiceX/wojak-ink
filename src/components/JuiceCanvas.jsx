import { useEffect, useRef } from 'react'

const MAX_DROPLETS = 1200
const MAX_SPLATS = 60

export default function JuiceCanvas() {
  const canvasRef = useRef(null)
  const dropletsRef = useRef([])
  const splatsRef = useRef([])
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
    const dropletCount = 150 + Math.floor(Math.random() * 251) // 150-400
    const splatCount = 3 + Math.floor(Math.random() * 6) // 3-8

    // Spawn droplets
    for (let i = 0; i < dropletCount; i++) {
      const angle = (Math.PI * 2 * Math.random())
      const speed = 3 + Math.random() * 8 // 3-11
      const upwardBias = -0.6 // Strong upward bias
      
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
      })
    }

    // Spawn splats
    for (let i = 0; i < splatCount; i++) {
      const offsetX = (Math.random() - 0.5) * 200
      const offsetY = (Math.random() - 0.5) * 150
      const size = 40 + Math.random() * 80 // 40-120px
      
      splatsRef.current.push({
        x: x + offsetX,
        y: y + offsetY,
        size,
        opacity: 0.7 + Math.random() * 0.2, // 0.7-0.9
        age: 0,
        lifetime: 6000 + Math.random() * 6000, // 6-12 seconds
        points: generateSplatShape(size), // Irregular blob shape
      })
    }

    // Enforce limits
    if (dropletsRef.current.length > MAX_DROPLETS) {
      dropletsRef.current = dropletsRef.current.slice(-MAX_DROPLETS)
    }
    if (splatsRef.current.length > MAX_SPLATS) {
      splatsRef.current = splatsRef.current.slice(-MAX_SPLATS)
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
    shakeEndTimeRef.current = Date.now() + 120 // 120ms shake
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

      // Update and draw droplets
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

      // Update and draw splats
      splatsRef.current = splatsRef.current.filter(splat => {
        splat.age += deltaTime
        const progress = splat.age / splat.lifetime
        splat.opacity = Math.max(0, (1 - progress) * splat.opacity)

        if (splat.opacity <= 0 || splat.age >= splat.lifetime) {
          return false
        }

        // Draw splat (irregular blob)
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
        pointerEvents: 'none',
        zIndex: 100, // Above background, below windows
      }}
    />
  )
}

