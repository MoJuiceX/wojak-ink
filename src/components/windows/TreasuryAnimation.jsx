import { useEffect, useRef } from 'react'

/**
 * TreasuryAnimation component
 * Background GIF converted to video for playback speed control
 * Plays at 50% speed (0.5x)
 */
export default function TreasuryAnimation() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set playback rate to 50% (0.5x speed)
    video.playbackRate = 0.5

    // Start playing
    video.play().catch(err => {
      console.warn('[Treasury] Video autoplay prevented:', err)
    })
  }, [])

  return (
    <div className="treasury-animation-wrapper">
      <div className="treasury-animation-container">
        <video
          ref={videoRef}
          src="/images/tresury.gif"
          className="treasury-animation-video"
          loop
          muted
          playsInline
          preload="auto"
        />
        {/* Gradient overlay to blend with background */}
        <div className="treasury-animation-overlay" />
      </div>
    </div>
  )
}

