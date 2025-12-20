import { useEffect, useRef } from 'react'

// Animation constants
const CROSSFADE_MS = 60 // Fade duration from prev → next

// Windmill assets
const W_BASE = '/assets/images/banners/w0.png'
const W_OVERLAY_FRAMES = [
  '/assets/images/banners/w1.png',
  '/assets/images/banners/w2.png',
  '/assets/images/banners/w3.png',
  '/assets/images/banners/w4.png',
  '/assets/images/banners/w5.png',
  '/assets/images/banners/w6.png',
  '/assets/images/banners/w7.png',
  '/assets/images/banners/w8.png',
]

// Character overlay frames
const BASE_FRAMES = [
  '/assets/images/banners/base1n.png',
  '/assets/images/banners/base2n.png',
  '/assets/images/banners/base3n.png',
  '/assets/images/banners/base4n.png',
]

export default function ReadmeBanner({ baseIdx = 0 }) {
  const aRef = useRef(null) // Overlay A (base/previous frame)
  const bRef = useRef(null) // Overlay B (incoming/next frame)
  const rafRef = useRef(null)
  const animationStateRef = useRef({
    frameIndexRef: 0, // Current "base overlay" index (0..7 for w1..w8)
    fadeStartRef: null,
    showingARef: true, // true = A is base, false = B is base
    windmillPreloaded: false, // Windmill images (w0-w8) must load before animation
  })
  const prefersReducedMotionRef = useRef(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Preload windmill images (required) and base images (optional/non-blocking)
  useEffect(() => {
    const preloadImages = async () => {
      // Windmill preload (w0-w8): Required, must complete before starting animation
      const windmillImages = [W_BASE, ...W_OVERLAY_FRAMES]
      const windmillPromises = windmillImages.map((src) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = async () => {
            // Decode image if decode() is available
            try {
              if (img.decode) {
                await img.decode()
              }
            } catch (err) {
              // decode() may fail, but image is still loaded
              console.warn('Image decode failed for', src, err)
            }
            resolve()
          }
          img.onerror = () => {
            console.warn('Failed to preload windmill image:', src)
            resolve() // Continue even if one fails
          }
          img.src = src
        })
      })

      // Base preload (BASE_FRAMES): Optional/non-blocking, best-effort
      const basePromises = BASE_FRAMES.map((src) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = async () => {
            try {
              if (img.decode) {
                await img.decode()
              }
            } catch (err) {
              console.warn('Image decode failed for', src, err)
            }
            resolve()
          }
          img.onerror = () => {
            // Base images failing is OK, don't log as warning
            resolve()
          }
          img.src = src
        })
      })

      // Wait for windmill images (required)
      await Promise.all(windmillPromises)
      animationStateRef.current.windmillPreloaded = true

      // Initialize overlay images
      if (aRef.current && bRef.current) {
        // Start with A = w1 (opacity 1), B = w2 (opacity 0)
        aRef.current.src = W_OVERLAY_FRAMES[0]
        bRef.current.src = W_OVERLAY_FRAMES[1]
        aRef.current.style.opacity = '1'
        bRef.current.style.opacity = '0'
      }

      // Start base preload in parallel but don't wait for it
      Promise.all(basePromises).catch(() => {
        // Ignore base preload errors
      })
    }

    preloadImages()
  }, [])

  // Main animation loop with requestAnimationFrame
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotionRef.current = mediaQuery.matches

    const handleChange = (e) => {
      prefersReducedMotionRef.current = e.matches
      if (e.matches) {
        // Disable animation - show only w0.png (or keep w1 at opacity 1 but no animation)
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        // Keep w1 visible but stop animation
        if (aRef.current && bRef.current) {
          aRef.current.style.opacity = '1'
          bRef.current.style.opacity = '0'
        }
      } else {
        // Re-enable animation
        startAnimation()
      }
    }

    // Smoothstep easing function
    const smoothstep = (t) => {
      return t * t * (3 - 2 * t)
    }

    const animate = (timestamp) => {
      const state = animationStateRef.current

      // Wait for windmill images to preload
      if (!state.windmillPreloaded || !aRef.current || !bRef.current) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      // Initialize fade timing
      if (state.fadeStartRef === null) {
        state.fadeStartRef = timestamp
      }

      // Calculate fade progress (0 to 1)
      const t = Math.min(1, (timestamp - state.fadeStartRef) / CROSSFADE_MS)

      // Apply easing
      const easedT = smoothstep(t)

      // Update incoming image opacity
      if (state.showingARef) {
        // A is base, B is incoming
        bRef.current.style.opacity = String(easedT)
      } else {
        // B is base, A is incoming
        aRef.current.style.opacity = String(easedT)
      }

      // Check if fade is complete
      if (t >= 1) {
        // Fade complete: incoming is now fully visible, it becomes the base
        // Swap roles (A/B)
        state.showingARef = !state.showingARef

        // Advance to next frame (wrap 8 → 0)
        state.frameIndexRef = (state.frameIndexRef + 1) % W_OVERLAY_FRAMES.length

        // Set the new "incoming" image src to the next frame and set opacity back to 0
        const nextFrameIndex = (state.frameIndexRef + 1) % W_OVERLAY_FRAMES.length
        if (state.showingARef) {
          // A is now base, B will be incoming
          bRef.current.src = W_OVERLAY_FRAMES[nextFrameIndex]
          bRef.current.style.opacity = '0'
          aRef.current.style.opacity = '1'
        } else {
          // B is now base, A will be incoming
          aRef.current.src = W_OVERLAY_FRAMES[nextFrameIndex]
          aRef.current.style.opacity = '0'
          bRef.current.style.opacity = '1'
        }

        // Reset fade start time
        state.fadeStartRef = timestamp
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      // Reset animation state
      animationStateRef.current.fadeStartRef = null
      rafRef.current = requestAnimationFrame(animate)
    }

    mediaQuery.addEventListener('change', handleChange)

    // Start animation if motion is not reduced
    if (!prefersReducedMotionRef.current) {
      startAnimation()
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  return (
    <div className="readme-banner-wrapper">
      {/* Spacer image to establish wrapper height */}
      <img
        src={W_BASE}
        className="readme-banner-spacer"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {/* Base windmill layer (w0 - always visible) */}
      <img
        className="windmill-base"
        src={W_BASE}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {/* Windmill overlay layer A (w1-w8 - base/previous frame) */}
      <img
        ref={aRef}
        className="windmill-overlay a"
        src={W_OVERLAY_FRAMES[0]}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {/* Windmill overlay layer B (w1-w8 - incoming/next frame) */}
      <img
        ref={bRef}
        className="windmill-overlay b"
        src={W_OVERLAY_FRAMES[1]}
        style={{ opacity: 0 }}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {/* Base character overlay */}
      <img
        src={BASE_FRAMES[baseIdx]}
        className="readme-banner-character"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </div>
  )
}
