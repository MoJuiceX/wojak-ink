import { useState, useEffect, useRef } from 'react'
import './StartupSequence.css'
import BootSequence, { TANGY_BOOT_LINES } from './BootSequence'
import { prefetchTreasuryWithImages } from '@/services/treasuryApi'

interface StartupSequenceProps {
  onComplete: () => void
}

export default function StartupSequence({ onComplete }: StartupSequenceProps) {
  const [stage, setStage] = useState<'boot' | 'logo' | 'loading' | 'complete'>('boot')
  const [progress, setProgress] = useState(0)
  const [logoFading, setLogoFading] = useState(false)
  const [loadingFading, setLoadingFading] = useState(false)
  const [bootDone, setBootDone] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 480)
  const [isSkipping, setIsSkipping] = useState(false)
  const ps1AudioRef = useRef<HTMLAudioElement | null>(null)
  const bootAudioRef = useRef<HTMLAudioElement | null>(null)

  // Handle skip intro - fade out audio and complete immediately
  const handleSkipIntro = () => {
    if (isSkipping) return
    setIsSkipping(true)

    // Fade out boot audio smoothly over 500ms
    if (bootAudioRef.current) {
      const gainNode = (bootAudioRef.current as unknown as { _gainNode?: GainNode })?._gainNode
      if (gainNode) {
        const currentTime = gainNode.context.currentTime
        const currentGain = gainNode.gain.value
        gainNode.gain.setValueAtTime(currentGain, currentTime)
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.5)
        setTimeout(() => {
          bootAudioRef.current?.pause()
        }, 500)
      } else {
        bootAudioRef.current.pause()
      }
    }

    // Fade out PS1 audio if it's playing
    if (ps1AudioRef.current) {
      const gainNode = (ps1AudioRef.current as unknown as { _gainNode?: GainNode })?._gainNode
      if (gainNode) {
        const currentTime = gainNode.context.currentTime
        const currentGain = gainNode.gain.value
        gainNode.gain.setValueAtTime(currentGain, currentTime)
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.5)
        setTimeout(() => {
          ps1AudioRef.current?.pause()
        }, 500)
      } else {
        ps1AudioRef.current.pause()
      }
    }

    // Skip to app after brief fade
    setStage('complete')
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  // Track screen size for responsive loading bar
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 480)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!bootDone || stage !== 'boot') return

    const sequence = async () => {
      await delay(200)

      setStage('logo')
      setLogoFading(false)

      // START BOOT AUDIO FADEOUT HERE - right when logo appears
      if (bootAudioRef.current) {
        const gainNode = (bootAudioRef.current as unknown as { _gainNode?: GainNode })._gainNode
        if (gainNode) {
          // Use Web Audio API's built-in smooth ramping
          // This is the professional way to fade audio - no clicks or pops
          const currentTime = gainNode.context.currentTime
          gainNode.gain.setValueAtTime(0.11, currentTime)
          // Exponential ramp over 11 seconds to extremely quiet (0.00001 = -100dB)
          gainNode.gain.exponentialRampToValueAtTime(0.00001, currentTime + 11)
          // Then linear ramp to true zero over 2 more seconds for completely silent ending
          gainNode.gain.linearRampToValueAtTime(0, currentTime + 13)
        }
      }

      // Play the pre-created PS1 audio (created during user click in BootSequence)
      if (ps1AudioRef.current) {
        ps1AudioRef.current.currentTime = 0.5 // Skip first 0.5 seconds
        ps1AudioRef.current.play().catch(e => {
          console.debug('[StartupSequence] PS1 audio play failed:', e)
        })
      }

      await delay(3439)

      setLogoFading(true)
      await delay(2579)

      await delay(100)

      setStage('loading')
      setLoadingFading(false)

      let ps1FadeStarted = false
      let prefetchStarted = false

      for (let i = 0; i <= 100; i += 2) {
        setProgress(i)

        // Start treasury prefetch at 10% - loads data while user watches progress bar
        if (i >= 10 && !prefetchStarted) {
          prefetchStarted = true
          prefetchTreasuryWithImages().catch(() => {
            // Silently fail - will retry when user visits Treasury
          })
        }

        // Start PS1 fadeout at 10% for a long obvious fadeout
        if (i >= 10 && !ps1FadeStarted) {
          ps1FadeStarted = true

          // Very long fadeout: ~5.5 seconds for obvious fade
          const ps1FadeOutDuration = 5500
          const startTime = Date.now()

          const fadeOutPs1 = () => {
            if (!ps1AudioRef.current) return

            const elapsed = Date.now() - startTime
            const prog = Math.min(elapsed / ps1FadeOutDuration, 1)

            // Get gainNode each frame (might not be ready at start)
            const gainNode = (ps1AudioRef.current as unknown as { _gainNode?: GainNode })._gainNode
            if (gainNode) {
              // Fade from current max (0.11) to 0
              gainNode.gain.value = 0.11 * (1 - prog)
            }

            if (prog < 1) {
              requestAnimationFrame(fadeOutPs1)
            } else {
              ps1AudioRef.current.pause()
              ps1AudioRef.current.currentTime = 0
            }
          }

          fadeOutPs1()
        }

        await delay(99)
      }

      setStage('complete')
      setLoadingFading(true)

      await delay(1500)

      onComplete()
    }

    sequence()
  }, [bootDone, stage, onComplete])

  return (
    <div className={`startup-sequence ${stage === 'complete' ? 'fade-out-black' : ''}`}>
      {stage === 'boot' && (
        <BootSequence
          onDone={() => setBootDone(true)}
          onSkip={handleSkipIntro}
          lines={TANGY_BOOT_LINES}
          showOnce={true}
          maxVisibleLines={18}
          onBootAudioReady={(bootAudio) => {
            bootAudioRef.current = bootAudio
          }}
          onPs1AudioReady={(ps1Audio) => {
            ps1AudioRef.current = ps1Audio
          }}
        />
      )}

      {(stage === 'logo' || stage === 'loading' || stage === 'complete') && (
        <>
          {/* Skip button for logo/loading stages */}
          {!isSkipping && stage !== 'complete' && (
            <button className="startup-skip-button" onClick={handleSkipIntro}>
              Skip Intro <span className="startup-skip-icon">››</span>
            </button>
          )}

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
                    {Array.from({ length: Math.floor(progress / (isDesktop ? 3.7 : 4.0)) }).map((_, i) => (
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
