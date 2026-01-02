import { useState, useEffect, useRef } from 'react'
import './StartupSequence.css'
import BootSequence, { TANGY_BOOT_LINES } from './BootSequence'

export default function StartupSequence({ onComplete }) {
  const [stage, setStage] = useState('boot') // boot, logo, loading, complete
  const [progress, setProgress] = useState(0)
  const [logoFading, setLogoFading] = useState(false)
  const [loadingFading, setLoadingFading] = useState(false)
  const [bootDone, setBootDone] = useState(false)
  const ps1AudioRef = useRef(null)
  const bootAudioRef = useRef(null)

  // Handle boot sequence completion and continue with logo/loading sequence
  useEffect(() => {
    if (!bootDone || stage !== 'boot') return

    const sequence = async () => {
      // Smooth transition to logo (reduced delay for smoother transition)
      await delay(200)
      
      // Stage 1: Logo appears (15% longer: 2990 * 1.15 = 3439ms, then fade out: 2243 * 1.15 = 2579ms)
      setStage('logo')
      setLogoFading(false)
      
      // Start PS1 audio when sequence 1 (logo stage) begins
      if (!ps1AudioRef.current) {
        ps1AudioRef.current = new Audio('/assets/audio/Ps1-startup.mp3')
        ps1AudioRef.current.volume = 0.5 // 50% volume
        ps1AudioRef.current.play().then(() => {
          // Skip the first 0.5 seconds of the audio
          ps1AudioRef.current.currentTime = 0.5
        }).catch(e => {
          console.debug('[StartupSequence] PS1 audio play failed (may need user interaction):', e)
        })
      }
      
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

      // Start fading to website immediately when loading bar completes - no delay
      // Set stage to complete first to start the main fade animation
      setStage('complete')
      
      // Fade out loading screen, PS1 audio, and PC-boot audio simultaneously
      setLoadingFading(true)
      
      // Fade out PS1 audio over 1 second (same duration as fade animation)
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
      
      // Fade out PC-boot audio over 1 second (same duration as fade animation)
      // This ensures PC-boot completes its fade out when boot scene 2 ends
      if (bootAudioRef.current && !bootAudioRef.current.paused) {
        const fadeOutDuration = 1000
        const startVolume = bootAudioRef.current.volume
        const startTime = Date.now()
        
        const fadeOut = () => {
          if (!bootAudioRef.current) return
          
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / fadeOutDuration, 1)
          bootAudioRef.current.volume = startVolume * (1 - progress)
          
          if (progress < 1) {
            requestAnimationFrame(fadeOut)
          } else {
            // Fade complete, stop audio
            bootAudioRef.current.pause()
            bootAudioRef.current.currentTime = 0
          }
        }
        
        fadeOut()
      }
      
      // Wait for fade animation to complete (main container fade handles everything)
      await delay(1500) // Match fade animation duration (1.5s)
      
      // Ensure PS1 audio is stopped
      if (ps1AudioRef.current) {
        ps1AudioRef.current.pause()
        ps1AudioRef.current.currentTime = 0
      }
      
      onComplete()
    }
    
    sequence()
  }, [bootDone, stage, onComplete])

  return (
    <div className={`startup-sequence ${stage === 'complete' ? 'fade-out-black' : ''}`}>
      {stage === 'boot' && (
        <BootSequence
          onDone={() => setBootDone(true)}
          lines={TANGY_BOOT_LINES}
          showOnce={true}
          maxVisibleLines={18}
          onBootAudioReady={(bootAudio) => {
            bootAudioRef.current = bootAudio
          }}
        />
      )}

      {(stage === 'logo' || stage === 'loading' || stage === 'complete') && (
        <>
          {stage === 'logo' && (
            <div className={`startup-logo-screen ${logoFading ? 'fade-out' : ''}`}>
              <div className="startup-logo">
                <span className="startup-logo-emoji">🍊</span>
                <span className="startup-logo-text">Tang Gang</span>
              </div>
            </div>
          )}

          {(stage === 'loading' || stage === 'complete') && (
            <div className={`startup-loading-screen ${loadingFading || stage === 'complete' ? 'fade-out' : ''}`}>
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

          {/* Persistent subtitle that stays visible from Stage 1 through Stage 2 and during fade */}
          {(stage === 'logo' || stage === 'loading' || stage === 'complete') && (
            <div className={`startup-logo-subtitle-container ${loadingFading || stage === 'complete' ? 'fade-out' : ''}`}>
              <div className={`startup-loading-subtitle ${stage === 'loading' || stage === 'complete' ? 'no-pulse' : ''}`}>
                WOJAK_FARMERS_PLOT.EXE
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

