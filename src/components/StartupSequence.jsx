import { useState, useEffect, useCallback, useRef } from 'react'
import './StartupSequence.css'
import BootSequence, { TANGY_BOOT_LINES } from './BootSequence'

export default function StartupSequence({ onComplete }) {
  const [stage, setStage] = useState('boot') // boot, logo, loading, complete
  const [progress, setProgress] = useState(0)
  const [showSkip, setShowSkip] = useState(false)
  const [logoFading, setLogoFading] = useState(false)
  const [loadingFading, setLoadingFading] = useState(false)
  const [bootDone, setBootDone] = useState(false)
  const ps1AudioRef = useRef(null)

  const handleSkip = useCallback(() => {
    // Stop PS1 audio if playing
    if (ps1AudioRef.current) {
      ps1AudioRef.current.pause()
      ps1AudioRef.current.currentTime = 0
    }
    
    sessionStorage.setItem('hasSeenStartup', 'true')
    sessionStorage.setItem('hasSeenBoot', 'true') // Also skip boot on next visit
    onComplete()
  }, [onComplete])

  useEffect(() => {
    // Check if user has seen startup before (skip on repeat visits)
    const hasSeenStartup = sessionStorage.getItem('hasSeenStartup')
    if (hasSeenStartup) {
      onComplete()
      return
    }
    
    // If boot was already seen, skip directly to logo stage
    const hasSeenBoot = sessionStorage.getItem('hasSeenBoot')
    if (hasSeenBoot) {
      // Start the logo/loading sequence directly
      const sequence = async () => {
        // Play PS1 startup sound for Stage 1 and 2
        if (!ps1AudioRef.current) {
          ps1AudioRef.current = new Audio('/assets/audio/Ps1-startup.mp3')
          ps1AudioRef.current.volume = 0.75 // 75% volume
          ps1AudioRef.current.play().catch(e => {
            console.debug('[StartupSequence] PS1 audio play failed (may need user interaction):', e)
          })
        }
        
        setStage('logo')
        setLogoFading(false)
        await delay(3439) // 15% longer (2990 * 1.15 = 3439)
        
        setLogoFading(true)
        await delay(2579) // 15% longer (2243 * 1.15 = 2579)

        // Smooth transition to Stage 2 (small delay for smoother transition)
        await delay(100)
        
        setStage('loading')
        setLoadingFading(false)

        // Animate progress bar (15% longer: 86ms * 1.15 = 99ms per increment)
        for (let i = 0; i <= 100; i += 2) {
          setProgress(i)
          await delay(99)
        }

        await delay(500)

        // Fade out loading screen and PS1 audio simultaneously
        setLoadingFading(true)
        
        // Fade out PS1 audio over 1 second (same duration as loading screen fade)
        if (ps1AudioRef.current && !ps1AudioRef.current.paused) {
          const fadeOutDuration = 1000
          const startVolume = ps1AudioRef.current.volume
          const startTime = Date.now()
          
          const fadeOut = () => {
            if (!ps1AudioRef.current) return
            
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / fadeOutDuration, 1)
            ps1AudioRef.current.volume = startVolume * (1 - progress)
            
            if (progress < 1) {
              requestAnimationFrame(fadeOut)
            } else {
              // Fade complete, stop audio
              ps1AudioRef.current.pause()
              ps1AudioRef.current.currentTime = 0
            }
          }
          
          fadeOut()
        }
        
        await delay(1000) // Fade out duration

        await delay(500)

        setStage('complete')
        sessionStorage.setItem('hasSeenStartup', 'true')
        
        // Ensure PS1 audio is stopped
        if (ps1AudioRef.current) {
          ps1AudioRef.current.pause()
          ps1AudioRef.current.currentTime = 0
        }
        await delay(300)
        onComplete()
      }
      
      sequence()
    }
  }, [onComplete])

  // Handle boot sequence completion and continue with logo/loading sequence
  useEffect(() => {
    if (!bootDone || stage !== 'boot') return

    const sequence = async () => {
      // Smooth transition to logo (reduced delay for smoother transition)
      await delay(200)
      
      // PS1 audio should already be playing (started when PC-boot ended)
      // If not, start it now as fallback
      if (!ps1AudioRef.current || ps1AudioRef.current.paused) {
        ps1AudioRef.current = new Audio('/assets/audio/Ps1-startup.mp3')
        ps1AudioRef.current.volume = 0.75 // 75% volume
        ps1AudioRef.current.play().catch(e => {
          console.debug('[StartupSequence] PS1 audio play failed (may need user interaction):', e)
        })
      }
      
      // Stage 1: Logo appears (15% longer: 2990 * 1.15 = 3439ms, then fade out: 2243 * 1.15 = 2579ms)
      setStage('logo')
      setLogoFading(false)
      await delay(3439)
      
      // Start fade out
      setLogoFading(true)
      await delay(2579) // Fade out duration (15% longer)

      // Smooth transition to Stage 2 (small delay for smoother transition)
      await delay(100)
      
      // Stage 2: Loading bar (15% longer: 86ms * 1.15 = 99ms per increment)
      setStage('loading')
      setLoadingFading(false)

      // Animate progress bar (15% longer: 86ms * 1.15 = 99ms per increment)
      for (let i = 0; i <= 100; i += 2) {
        setProgress(i)
        await delay(99)
      }

      await delay(500)

      // Fade out loading screen and PS1 audio simultaneously
      setLoadingFading(true)
      
      // Fade out PS1 audio over 1 second (same duration as loading screen fade)
      if (ps1AudioRef.current && !ps1AudioRef.current.paused) {
        const fadeOutDuration = 1000
        const startVolume = ps1AudioRef.current.volume
        const startTime = Date.now()
        
        const fadeOut = () => {
          if (!ps1AudioRef.current) return
          
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / fadeOutDuration, 1)
          ps1AudioRef.current.volume = startVolume * (1 - progress)
          
          if (progress < 1) {
            requestAnimationFrame(fadeOut)
          } else {
            // Fade complete, stop audio
            ps1AudioRef.current.pause()
            ps1AudioRef.current.currentTime = 0
          }
        }
        
        fadeOut()
      }
      
      await delay(1000) // Fade out duration

      // Stage 3: Complete
      setStage('complete')
      sessionStorage.setItem('hasSeenStartup', 'true')
      
      // Ensure PS1 audio is stopped
      if (ps1AudioRef.current) {
        ps1AudioRef.current.pause()
        ps1AudioRef.current.currentTime = 0
      }

      await delay(300)
      onComplete()
    }
    
    sequence()
  }, [bootDone, stage, onComplete])

  // Show skip button after 1 second
  useEffect(() => {
    if (stage !== 'complete') {
      setTimeout(() => setShowSkip(true), 1000)
    }
  }, [stage])

  // Keyboard skip handler
  useEffect(() => {
    const handleKeyDown = () => {
      handleSkip()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSkip])

  if (stage === 'complete') return null

  return (
    <div className="startup-sequence">
      {stage === 'boot' && (
        <BootSequence
          onDone={() => setBootDone(true)}
          lines={TANGY_BOOT_LINES}
          showOnce={true}
          maxVisibleLines={18}
          onAudioEnd={(fadeProgress = 0) => {
            // Start PS1 audio with crossfade from PC-boot
            if (!ps1AudioRef.current) {
              ps1AudioRef.current = new Audio('/assets/audio/Ps1-startup.mp3')
              ps1AudioRef.current.volume = 0 // Start at 0, fade in
              
              // Fade in PS1 audio over 2 seconds
              const fadeInDuration = 2000
              const startTime = Date.now()
              const targetVolume = 0.75 // 75% volume
              
              const fadeIn = () => {
                if (!ps1AudioRef.current) return
                
                const elapsed = Date.now() - startTime
                const progress = Math.min(elapsed / fadeInDuration, 1)
                ps1AudioRef.current.volume = targetVolume * progress
                
                if (progress < 1) {
                  requestAnimationFrame(fadeIn)
                } else {
                  ps1AudioRef.current.volume = targetVolume
                }
              }
              
              ps1AudioRef.current.play().then(() => {
                fadeIn()
              }).catch(e => {
                console.debug('[StartupSequence] PS1 audio play failed (may need user interaction):', e)
              })
            } else if (!ps1AudioRef.current.paused) {
              // If already playing, continue fade in
              const currentVol = ps1AudioRef.current.volume
              const targetVol = 0.75 // 75% volume
              const fadeInDuration = 2000
              const startVol = currentVol
              const startTime = Date.now()
              
              const fadeIn = () => {
                if (!ps1AudioRef.current) return
                
                const elapsed = Date.now() - startTime
                const progress = Math.min(elapsed / fadeInDuration, 1)
                ps1AudioRef.current.volume = startVol + (targetVol - startVol) * progress
                
                if (progress < 1) {
                  requestAnimationFrame(fadeIn)
                } else {
                  ps1AudioRef.current.volume = targetVol
                }
              }
              
              fadeIn()
            }
          }}
        />
      )}

      {(stage === 'logo' || stage === 'loading') && (
        <>
          {stage === 'logo' && (
            <div className={`startup-logo-screen ${logoFading ? 'fade-out' : ''}`}>
              <div className="startup-logo">
                <span className="startup-logo-emoji">🍊</span>
                <span className="startup-logo-text">Tang Gang</span>
              </div>
            </div>
          )}

          {stage === 'loading' && (
            <div className={`startup-loading-screen ${loadingFading ? 'fade-out' : ''}`}>
              <div className="startup-logo-small">
                <span>🍊</span> Orange Grove <span>🍊</span>
              </div>

              <div className="startup-loading-container">
                <div className="startup-loading-text">
                  Starting Tang Gang OS...
                </div>
                <div className="startup-progress-bar">
                  <div
                    className="startup-progress-fill"
                    style={{ width: `${progress}%` }}
                  >
                    {Array.from({ length: Math.floor(progress / 3.5) }).map((_, i) => (
                      <div key={i} className="startup-progress-block" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="startup-copyright">
                © 2024 Tang Gang. All rights reserved.
              </div>
            </div>
          )}

          {/* Persistent subtitle that stays visible from Stage 1 through Stage 2 */}
          {(stage === 'logo' || stage === 'loading') && (
            <div className={`startup-logo-subtitle-container ${loadingFading ? 'fade-out' : ''}`}>
              <div className="startup-loading-subtitle">
                WOJAK_FARMERS_PLOT.EXE
              </div>
            </div>
          )}
        </>
      )}

      {showSkip && stage !== 'complete' && (
        <button className="startup-skip" onClick={handleSkip}>
          Press any key to skip...
        </button>
      )}
    </div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

