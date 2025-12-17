import { useRef, useEffect, useState } from 'react'

/**
 * BackgroundMusic component - plays background music after first user interaction
 * 
 * Requirements:
 * - Does NOT autoplay on load
 * - Starts ONLY after first user interaction (click/tap or key press)
 * - Plays in a loop at low volume (0.08)
 * - Keeps playing across window opens
 * - No UI visible
 * - Robust error handling
 */
export default function BackgroundMusic() {
  const audioRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(false)
  const listenersAttachedRef = useRef(false)

  useEffect(() => {
    // Skip if already started
    if (hasStarted) return

    const audio = audioRef.current
    if (!audio) return

    // Function to start music on first interaction
    const startMusic = async () => {
      // Only try once per interaction
      if (listenersAttachedRef.current === 'starting') return
      
      listenersAttachedRef.current = 'starting'
      
      try {
        // Set volume to low (0.08)
        audio.volume = 0.08
        
        // Attempt to play
        await audio.play()
        
        // Success - mark as started and remove listeners
        setHasStarted(true)
        listenersAttachedRef.current = false
        
        // Remove event listeners
        window.removeEventListener('pointerdown', startMusic, { capture: true })
        window.removeEventListener('keydown', startMusic, { capture: true })
        window.removeEventListener('touchstart', startMusic, { capture: true })
      } catch (error) {
        // Silently handle play() promise rejection (e.g., autoplay policy)
        // Don't log or throw - just fail silently
        // Reset flag so user can try again on next interaction
        listenersAttachedRef.current = true
      }
    }

    // Attach listeners for first interaction
    // Use capture phase to catch events early
    window.addEventListener('pointerdown', startMusic, { capture: true })
    window.addEventListener('keydown', startMusic, { capture: true })
    window.addEventListener('touchstart', startMusic, { capture: true })
    
    listenersAttachedRef.current = true

    // Cleanup: remove listeners on unmount
    return () => {
      window.removeEventListener('pointerdown', startMusic, { capture: true })
      window.removeEventListener('keydown', startMusic, { capture: true })
      window.removeEventListener('touchstart', startMusic, { capture: true })
      listenersAttachedRef.current = false
    }
  }, [hasStarted])

  return (
    <audio
      ref={audioRef}
      src="/assets/audio/wojakmusic1.mp3"
      preload="auto"
      loop
      // No autoplay - only starts after user interaction
    />
  )
}

