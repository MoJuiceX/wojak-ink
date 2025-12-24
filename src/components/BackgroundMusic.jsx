import { useRef, useEffect, useState } from 'react'
import { getMuteState, setBackgroundMusic } from '../utils/soundManager'

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
 * - Respects mute state from sound manager
 */
export default function BackgroundMusic() {
  const audioRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(false)
  const listenersAttachedRef = useRef(false)
  const updatePlaybackRef = useRef(null)
  const wasPlayingRef = useRef(false) // Track if music was playing before mute

  useEffect(() => {
    // Skip if already started
    if (hasStarted) return

    const audio = audioRef.current
    if (!audio) return

    // Function to start music on first interaction
    const startMusic = async () => {
      // Only try once per interaction
      if (listenersAttachedRef.current === 'starting') return
      
      // Check if muted - don't start if muted
      if (getMuteState()) {
        return
      }
      
      listenersAttachedRef.current = 'starting'
      
      try {
        // Set volume to low (0.08)
        audio.volume = 0.08
        
        // Check mute state BEFORE playing
        if (getMuteState()) {
          listenersAttachedRef.current = true
          return
        }
        
        // Attempt to play
        await audio.play()
        
        // Success - mark as started and remove listeners
        setHasStarted(true)
        wasPlayingRef.current = true // Track that music is playing
        listenersAttachedRef.current = false
        
        // Ensure it's registered with soundManager
        setBackgroundMusic(audio)
        
        // Double-check mute state after starting
        if (getMuteState()) {
          audio.pause()
          audio.volume = 0
          audio.muted = true
        }
        
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

  // Register background music with soundManager when audio element is ready
  useEffect(() => {
    // Use a small delay to ensure audio element is fully initialized
    const registerAudio = () => {
      const audio = audioRef.current
      if (audio) {
        // Register with soundManager so it can control this
        setBackgroundMusic(audio)
        
        // Set initial volume
        audio.volume = 0.08
        
        // If muted, don't start
        if (getMuteState()) {
          audio.pause()
          audio.volume = 0
          audio.muted = true
        }
      } else {
        // Retry after a short delay
        setTimeout(registerAudio, 100)
      }
    }
    
    // Try immediately
    registerAudio()
    
    // Also try after a short delay to catch late initialization
    const timeoutId = setTimeout(registerAudio, 200)
    
    return () => {
      clearTimeout(timeoutId)
      // Unregister on unmount
      setBackgroundMusic(null)
    }
  }, [])

  // Monitor mute state and pause/resume music accordingly
  // This effect runs independently to always monitor mute state
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Listen for custom mute toggle events (immediate response)
    const handleMuteToggle = (e) => {
      const audio = audioRef.current
      if (!audio) return
      
      // Get mute state from event detail or check directly
      const isMuted = e?.detail?.muted !== undefined ? e.detail.muted : getMuteState()
      
      // Immediately pause or resume based on mute state
      if (isMuted) {
        // Muted - pause immediately and set volume to 0
        if (!audio.paused) {
          wasPlayingRef.current = true // Remember it was playing
        }
        try {
          audio.pause()
          audio.volume = 0
          audio.muted = true
        } catch (err) {
          // Ignore errors but try to set volume
          try {
            audio.volume = 0
            audio.muted = true
          } catch (e2) {
            // Ignore
          }
        }
      } else {
        // Unmuted - restore volume and resume if it was playing before
        try {
          audio.muted = false
          audio.volume = 0.08
          if (audio.paused && wasPlayingRef.current) {
            audio.play().catch(() => {})
          }
        } catch (err) {
          // Ignore errors
        }
      }
    }

    // Listen for storage changes (when mute state is updated via localStorage)
    const handleStorageChange = (e) => {
      if (e.key === 'sound_muted') {
        const isMuted = getMuteState()
        const audio = audioRef.current
        if (!audio) return
        
        if (isMuted) {
          if (!audio.paused) {
            wasPlayingRef.current = true
          }
          audio.pause()
          audio.volume = 0
          audio.muted = true
        } else {
          audio.muted = false
          audio.volume = 0.08
          if (audio.paused && wasPlayingRef.current) {
            audio.play().catch(() => {})
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('muteToggle', handleMuteToggle)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('muteToggle', handleMuteToggle)
    }
  }, []) // Run once on mount, not dependent on hasStarted

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

