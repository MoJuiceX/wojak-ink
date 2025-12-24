import { useState, useEffect, useCallback } from 'react'
import './StartupSequence.css'

export default function StartupSequence({ onComplete }) {
  const [stage, setStage] = useState('black') // black, logo, loading, complete
  const [progress, setProgress] = useState(0)
  const [showSkip, setShowSkip] = useState(false)

  const handleSkip = useCallback(() => {
    sessionStorage.setItem('hasSeenStartup', 'true')
    onComplete()
  }, [onComplete])

  useEffect(() => {
    // Check if user has seen startup before (skip on repeat visits)
    const hasSeenStartup = sessionStorage.getItem('hasSeenStartup')
    if (hasSeenStartup) {
      onComplete()
      return
    }

    const sequence = async () => {
      // Show skip button after 1 second
      setTimeout(() => setShowSkip(true), 1000)

      // Stage 1: Black screen (500ms)
      await delay(500)

      // Stage 2: Logo appears (1500ms)
      setStage('logo')
      await delay(1500)

      // Stage 3: Loading bar (3000ms)
      setStage('loading')

      // Animate progress bar
      for (let i = 0; i <= 100; i += 2) {
        setProgress(i)
        await delay(50)
      }

      await delay(500)

      // Stage 4: Complete
      setStage('complete')
      sessionStorage.setItem('hasSeenStartup', 'true')

      await delay(300)
      onComplete()
    }

    sequence()
  }, [onComplete])

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
      {stage === 'black' && (
        <div className="startup-black" />
      )}

      {stage === 'logo' && (
        <div className="startup-logo-screen">
          <div className="startup-logo">
            <span className="startup-logo-emoji">🍊</span>
            <span className="startup-logo-text">Tang Gang</span>
            <span className="startup-logo-subtitle">Wojak Generator</span>
          </div>
        </div>
      )}

      {stage === 'loading' && (
        <div className="startup-loading-screen">
          <div className="startup-logo-small">
            <span>🍊</span> Tang Gang
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
                {Array.from({ length: Math.floor(progress / 3) }).map((_, i) => (
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

