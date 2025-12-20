import { useEffect, useRef, useState } from 'react'

const BAWIND_INTERVAL_MS = 700
const BAWIND_FRAMES = [
  '/assets/images/banners/bawind0.png',
  '/assets/images/banners/bawind1.png',
  '/assets/images/banners/bawind2.png',
  '/assets/images/banners/bawind3.png',
]
const BASE_FRAMES = [
  '/assets/images/banners/base1n.png',
  '/assets/images/banners/base2n.png',
  '/assets/images/banners/base3n.png',
  '/assets/images/banners/base4n.png',
]

export default function ReadmeBanner({ baseIdx = 0 }) {
  const [windIdx, setWindIdx] = useState(0)
  const windDirRef = useRef(1) // +1 for forward, -1 for backward
  const intervalRef = useRef(null)
  const prefersReducedMotionRef = useRef(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Preload all images on mount
  useEffect(() => {
    const allImages = [...BAWIND_FRAMES, ...BASE_FRAMES]
    allImages.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  // Windmill animation with ping-pong logic
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotionRef.current = mediaQuery.matches

    const handleChange = (e) => {
      prefersReducedMotionRef.current = e.matches
      if (e.matches) {
        // Disable animation - freeze at frame 0
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setWindIdx(0)
      } else {
        // Re-enable animation
        startAnimation()
      }
    }

    const startAnimation = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = setInterval(() => {
        setWindIdx((prevIdx) => {
          // Calculate next index
          let nextIdx = prevIdx + windDirRef.current

          // Reverse direction at boundaries
          if (nextIdx >= BAWIND_FRAMES.length) {
            // Hit upper bound (4), reverse direction and go back to 2
            windDirRef.current = -1
            nextIdx = BAWIND_FRAMES.length - 2 // 2
          } else if (nextIdx < 0) {
            // Hit lower bound (-1), reverse direction and go forward to 1
            // This happens when we're at 0 going backward, so we want to show 0, then go to 1
            windDirRef.current = 1
            nextIdx = 0 // Show 0 first, then next tick will go to 1
          }

          return nextIdx
        })
      }, BAWIND_INTERVAL_MS)
    }

    mediaQuery.addEventListener('change', handleChange)

    // Start animation if motion is not reduced
    if (!prefersReducedMotionRef.current) {
      startAnimation()
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return (
    <div className="readme-banner-wrapper">
      {/* Spacer image to establish wrapper height */}
      <img
        src={BAWIND_FRAMES[0]}
        className="readme-banner-spacer"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <img
        src={BAWIND_FRAMES[windIdx]}
        className="readme-banner-windmill"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
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

