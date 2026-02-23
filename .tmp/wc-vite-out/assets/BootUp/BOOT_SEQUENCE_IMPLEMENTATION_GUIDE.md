# Complete Boot Sequence Implementation Guide

## Overview

The boot sequence consists of three stages:
- **boot0**: Terminal-style boot text with typing animation (PC-boot.mp3 audio)
- **boot1**: Orange logo screen with pulsing animation (Ps1-startup.mp3 audio)
- **boot2**: Loading bar with progress animation (both audios fade out)

## File Structure

Create these files in your React project:

```
src/
  components/
    StartupSequence.jsx
    StartupSequence.css
    BootSequence.jsx
    BootSequence.css
  App.jsx (modify existing)

public/
  assets/
    audio/
      PC-boot.mp3
      Ps1-startup.mp3
```

---

## File 1: `src/components/BootSequence.jsx`

```jsx
import { useState, useEffect, useRef } from 'react'
import './BootSequence.css'

export const TANGY_BOOT_LINES = [
  "CitrusBIOS v1.369 (JuiceBuild)  © 2023–2026 Orange Labs",
  "",
  "",
  "Checking PULP integrity .................................. OK",
  "CPU : Tangium™ 133MHz",
  "RAM : 65536K JUICE",
  "Video : VGA (Very Grapefruit Adapter) ..................... OK",
  "Keyboard : Clicky-Mechanical .............................. OK",
  "Mouse : CitrusTrack v2.1 ................................. OK",
  "",
  "Detecting storange of value...",
  "  Primary Master : ORANGE_CITRUS_SERVER (IDE) ............. OK",
  "  Primary Slave  : PEEL_DRIVE (CD-ROM) .................... OK",
  "  Secondary Master : PULP_CACHE (SCSI) .................... OK",
  "  Accepting Cookies  : <true>",
  "",
  "Loading boot sector...",
  "Peel to peel : TANGBOOT.SYS ................................ OK",
  "Unpacking kernel : CITRUSKERNEL.95 ....................... OK",
  "",
  ">> Mounting Orange Grove...",
  "Mount /WMC Server ............................................. OK",
  "Mount /tanggang .......................................... OK",
  "Mount /hoamis ............................................ OK",
  "",
  "Initializing drivers...",
  "  peel.sys     (peel protection) .......................... OK",
  "  pulp.sys     (pulp acceleration) ........................ OK",
  "  zest.sys     (zest rendering) ........................... OK",
  "  squeeze.sys  (juice compression) ........................ OK",
  "  drip.sys     (liquidity routing) ........................ OK",
  "",
  "Networking...",
  "  DHCP : requesting fresh IP from Orange Citrus Server..... OK",
  "  DNS  : ROYAL.CLUB ..................................... OK",
  "  NTP  : syncing to the Orange Standard ............. OK",
  "",
  "Tang Guard Security...",
  "  TangGang handshake ...................................... PIIP",
  "  Hex Orange Address................................... ENABLED",
  "",
  "Starting graphical shell...",
  "Launching ORANGE.EXE ...................................... OK",
  "Warming up the grove... please wait...",
  "",
  "READY: Electronic Storange of Value Initiated 🍊",
]

export default function BootSequence({ 
  lines = TANGY_BOOT_LINES, 
  onDone, 
  showOnce = true,
  maxVisibleLines = 18,
  typingSpeed = 9, // 15% longer (8 * 1.15 ≈ 9)
  onBootAudioReady // Callback to pass bootAudio reference to parent
}) {
  const [visibleLines, setVisibleLines] = useState([])
  const [completedLines, setCompletedLines] = useState(new Set())
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [showClickPrompt, setShowClickPrompt] = useState(true)
  const containerRef = useRef(null)

  useEffect(() => {
    // Don't start sequence until user clicks
    if (showClickPrompt) {
      return
    }

    // Boot sequence always plays - cannot be skipped

    // Play PC boot sound at the start (20% slower - was 10%, now 20%)
    const bootAudio = new Audio('/assets/audio/PC-boot.mp3')
    bootAudio.volume = 0.5 // 50% volume
    bootAudio.playbackRate = 0.8 // 20% slower (0.8 = 80% speed)
    
    // Pass bootAudio reference to parent so it can control fade out timing
    if (onBootAudioReady) {
      onBootAudioReady(bootAudio)
    }
    
    // PC-boot audio plays at full volume during boot sequence
    // Fade out will be controlled by parent component (StartupSequence)
    
    bootAudio.play().catch(e => {
      console.debug('[BootSequence] Audio play failed (may need user interaction):', e)
    })

    const sequence = async () => {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Empty lines show immediately
        if (line === '') {
          setVisibleLines(prev => [...prev, ''])
          setCompletedLines(prev => new Set([...prev, i]))
          setCurrentLineIndex(i + 1)
          await delay(29) // 15% longer (25 * 1.15 ≈ 29)
          continue
        }

        // Type out the line character by character
        let currentText = ''
        for (let j = 0; j <= line.length; j++) {
          currentText = line.substring(0, j)
          setVisibleLines(prev => {
            const newLines = [...prev]
            if (newLines[i]) {
              newLines[i] = currentText
            } else {
              newLines[i] = currentText
            }
            return newLines
          })
          await delay(typingSpeed)
        }

        // Mark line as completed
        setCompletedLines(prev => new Set([...prev, i]))
        setCurrentLineIndex(i + 1)
        
        // Small delay between lines (15% longer: 13 * 1.15 ≈ 15)
        await delay(15)
      }

      // Boot sequence always plays - no sessionStorage marking
      
      await delay(282) // Brief pause at the end (15% longer: 245 * 1.15 ≈ 282)
      
      // Start fade out
      setIsFading(true)
      await delay(800) // Fade out duration
      
      onDone?.()
    }

    sequence()
  }, [lines, onDone, showOnce, typingSpeed, showClickPrompt, onBootAudioReady])

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [visibleLines])

  const handleClickToStart = () => {
    setShowClickPrompt(false)
  }

  return (
    <div className={`boot-sequence ${isFading ? 'fade-out' : ''}`}>
      {showClickPrompt && (
        <div className="boot-click-prompt" onClick={handleClickToStart}>
          <div className="boot-click-prompt-content">
            <div className="boot-click-prompt-title">ℹ️</div>
            <div className="boot-click-prompt-message">
              Click now for the full immersive experience
            </div>
            <div className="boot-click-prompt-subtitle">
              (Audio and animations require user interaction)
            </div>
          </div>
        </div>
      )}
      <div className="boot-sequence-container" ref={containerRef}>
        {visibleLines.slice(-maxVisibleLines).map((line, displayIndex) => {
          const actualIndex = Math.max(0, visibleLines.length - maxVisibleLines) + displayIndex
          const isComplete = completedLines.has(actualIndex) || line === ''
          const isCurrentLine = actualIndex === currentLineIndex && currentLineIndex < lines.length
          return (
            <div 
              key={actualIndex} 
              className={`boot-line ${isComplete ? 'boot-line-complete' : 'boot-line-typing'} ${isCurrentLine ? 'boot-cursor' : ''}`}
            >
              {(() => {
                // Check if this is the ASCII art orange section (lines 7-20, indices 6-19)
                const isOrangeArt = actualIndex >= 6 && actualIndex <= 19
                if (isOrangeArt && line) {
                  // Render with orange color and green leaf
                  return (
                    <span className="boot-orange-art">
                      {line.split('').map((char, charIndex) => {
                        // Apply specific colors based on character type
                        if (char === '@') {
                          return <span key={charIndex} className="boot-orange-char">{char}</span>
                        } else if (char === '░') {
                          return <span key={charIndex} className="boot-white-char">{char}</span>
                        } else if (char === '|') {
                          return <span key={charIndex} className="boot-brown-char">{char}</span>
                        } else if (char === '^') {
                          return <span key={charIndex} className="boot-leaf">{char}</span>
                        }
                        return <span key={charIndex}>{char}</span>
                      })}
                    </span>
                  )
                }
                return line || '\u00A0'
              })()}
              {isCurrentLine && <span className="boot-cursor-blink">_</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

---

## File 2: `src/components/BootSequence.css`

```css
.boot-sequence {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  z-index: 9999999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  font-family: 'Fixedsys', 'Terminal', 'MS Sans Serif', 'Courier New', monospace;
  overflow: hidden;
  animation: fadeIn 0.5s ease-out;
}

.boot-sequence.fade-out {
  animation: fadeOut 0.8s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* Click prompt overlay - lightweight orange information box */
.boot-click-prompt {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000000;
  cursor: pointer;
  animation: fadeIn 0.3s ease-out;
}

.boot-click-prompt-content {
  background: #ffaa00;
  border: 2px solid;
  border-color: #ffffff #cc7700 #cc7700 #ffffff;
  padding: 20px 30px;
  text-align: center;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  font-family: 'MS Sans Serif', sans-serif;
}

.boot-click-prompt-title {
  font-size: 32px;
  margin-bottom: 12px;
}

.boot-click-prompt-message {
  font-size: 14px;
  font-weight: bold;
  color: #000;
  margin-bottom: 8px;
  line-height: 1.3;
}

.boot-click-prompt-subtitle {
  font-size: 11px;
  color: #663300;
  font-style: italic;
}

.boot-sequence-container {
  width: 100%;
  max-width: 800px;
  min-height: 100vh;
  height: auto;
  overflow-y: auto;
  padding: 20px;
  padding-top: 40px;
  padding-bottom: 20px;
  font-size: 20px;
  line-height: 1.6;
  text-align: left;
  display: block;
}

.boot-line {
  white-space: pre;
  margin: 0;
  padding: 2px 0;
  min-height: 1.2em;
}

/* Complete lines - green like old boot style */
.boot-line-complete {
  color: #00ff00;
  animation: bootGlitch 0.5s infinite;
}

/* Incomplete/typing lines - red */
.boot-line-typing {
  color: #ff0000;
  animation: bootGlitch 0.4s infinite;
}

.boot-cursor {
  display: inline-block;
}

.boot-cursor-blink {
  animation: bootCursorBlink 1s step-end infinite;
  color: #00ff00;
}

@keyframes bootCursorBlink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* Glitch effect for boot text - very subtle */
@keyframes bootGlitch {
  0%, 100% {
    transform: translate(0);
  }
  50% {
    transform: translate(0.1px, 0);
  }
}

/* Scrollbar styling for boot sequence */
.boot-sequence-container::-webkit-scrollbar {
  width: 8px;
}

.boot-sequence-container::-webkit-scrollbar-track {
  background: #000;
}

.boot-sequence-container::-webkit-scrollbar-thumb {
  background: #00ff00;
  border-radius: 4px;
}

.boot-sequence-container::-webkit-scrollbar-thumb:hover {
  background: #00cc00;
}

/* Stationary image on the right side */
.boot-sequence-right-art {
  position: absolute;
  right: 22px;
  bottom: 22px;
  width: 260px;
  height: auto;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  opacity: 0.95;
  z-index: 1;
  pointer-events: none;
}

/* Orange ASCII art section styling */
.boot-orange-art {
  color: #ff6600;
}

/* Character-specific colors in ASCII art */
.boot-orange-char {
  color: #ff6600;
}

.boot-white-char {
  color: #ffffff;
}

.boot-brown-char {
  color: #8b4513;
}

/* Green leaf parts in the orange */
.boot-leaf {
  color: #00ff00;
}
```

---

## File 3: `src/components/StartupSequence.jsx`

```jsx
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
```

---

## File 4: `src/components/StartupSequence.css`

```css
.startup-sequence {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999999;
  background: #000;
}

.startup-sequence.fade-out-black {
  animation: fadeToWebsite 1.5s ease-in-out forwards;
  pointer-events: none; /* Prevent interaction after fade */
}

@keyframes fadeToWebsite {
  0% {
    opacity: 1;
    background: #000;
  }
  50% {
    opacity: 0.3;
    background: #000; /* Keep black background during fade */
  }
  100% {
    opacity: 0;
    background: #000; /* Keep black background - opacity fade reveals website without white flash */
  }
}

.startup-logo-screen {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.8s ease-out, orangePulse 2s ease-in-out infinite;
  overflow: hidden;
}

.startup-logo-screen::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* Brighter orange background */
  background: linear-gradient(180deg, #ffaa00 0%, #ff7700 100%);
  z-index: 1;
}

.startup-logo-screen::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* Vignette effect - red in center transitioning to black at edges */
  background: radial-gradient(
    ellipse at center,
    rgba(255, 0, 0, 0.2) 0%,
    rgba(255, 0, 0, 0.3) 20%,
    rgba(200, 0, 0, 0.5) 40%,
    rgba(100, 0, 0, 0.7) 60%,
    rgba(0, 0, 0, 0.8) 80%,
    rgba(0, 0, 0, 0.95) 100%
  ),
  /* Black pixel pattern on top */
  repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.2) 0px,
    rgba(0, 0, 0, 0.2) 1px,
    transparent 1px,
    transparent 2px
  ),
  repeating-linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.2) 0px,
    rgba(0, 0, 0, 0.2) 1px,
    transparent 1px,
    transparent 2px
  );
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  z-index: 2;
  pointer-events: none;
}

.startup-logo-screen.fade-out {
  animation: fadeOut 1.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.startup-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: logoZoom 1s ease-out;
  position: relative;
  z-index: 3;
}

@keyframes logoZoom {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.startup-logo-emoji {
  font-size: 120px;
  text-shadow: 0 0 50px rgba(255, 165, 0, 0.8);
  animation: pulse 2s ease-in-out infinite;
  margin-bottom: 0px; /* Moved down - was -20px */
  margin-top: 20px; /* Added top margin to push orange down */
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes orangePulse {
  0%, 100% { 
    filter: brightness(1);
  }
  50% { 
    filter: brightness(1.2);
  }
}

@keyframes textPulse {
  0%, 100% { 
    transform: scale(1);
    text-shadow: 3px 3px 0 #000, 0 0 30px rgba(204, 68, 0, 0.7);
  }
  50% { 
    transform: scale(1.05);
    text-shadow: 3px 3px 0 #000, 0 0 50px rgba(204, 68, 0, 0.9);
  }
}


.startup-logo-text {
  font-size: 64px;
  font-weight: bold;
  color: #cc4400;
  text-shadow: 3px 3px 0 #000, 0 0 30px rgba(204, 68, 0, 0.7);
  margin-top: 150px; /* Pushed down more from 100px */
  font-family: 'Arial Black', sans-serif;
  position: relative;
  animation: textPulse 2s ease-in-out infinite; /* Same frequency as emoji */
}

.startup-logo-subtitle {
  font-size: 24px;
  color: #c0c0c0;
  margin-top: 10px;
  animation: textPulse 2s ease-in-out infinite;
}

.startup-loading-screen {
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 40px;
  animation: fadeIn 0.5s ease-out;
  position: relative;
}

.startup-loading-screen.fade-out {
  /* Don't fade the loading screen separately - let the main container handle the fade */
  opacity: 1;
  background: #000 !important; /* Keep black background */
}

.startup-loading-screen.fade-out::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  z-index: -1;
}

@keyframes fadeContentOut {
  from { 
    opacity: 1;
    background: #000;
  }
  to { 
    opacity: 0;
    background: #000; /* Keep black background during fade */
  }
}

.startup-logo-small {
  font-size: 48px; /* 2x bigger (24px * 2 = 48px) */
  color: #ff6600;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px; /* Move down a little bit */
}

.startup-logo-small span {
  font-size: 64px; /* Make emoji bigger (48px * 1.33 ≈ 64px) */
  display: inline-block;
  transform: translateY(8px); /* Move emoji down a little bit */
}

.startup-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: -60px; /* Move loading bar and text up */
}

.startup-loading-text {
  color: #c0c0c0;
  font-size: 14px;
}

.startup-progress-bar {
  width: 400px;
  height: 24px;
  background: #000;
  border: 2px solid;
  border-color: #808080 #ffffff #ffffff #808080;
  padding: 3px;
}

.startup-progress-fill {
  height: 100%;
  display: flex;
  gap: 2px;
}

.startup-progress-block {
  width: 12px;
  height: 100%;
  background: #ff6600;
  flex-shrink: 0;
}

.startup-loading-subtitle {
  font-size: 24px;
  color: #c0c0c0;
  animation: textPulse 2s ease-in-out infinite;
}

.startup-loading-subtitle.no-pulse {
  animation: none; /* Stop pulsing when loading bar appears (Scene 2) */
}

/* Subtitle container for Stage 1 (logo) - positioned to match Stage 2 */
.startup-logo-subtitle-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, calc(-50% + 70px)); /* Moved down a bit more for sequence 1 */
  z-index: 99999999;
  pointer-events: none;
}

.startup-logo-subtitle-container.fade-out {
  animation: fadeOut 1s ease-out forwards;
}

.startup-copyright {
  color: #808080;
  font-size: 11px;
}

.startup-skip {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: none;
  border: none;
  color: #808080;
  font-size: 12px;
  cursor: pointer;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.startup-skip:hover {
  color: var(--text-inverse);
}
```

---

## File 5: Integration in `src/App.jsx`

### Step 1: Add Import

Add this import at the top with your other imports:

```jsx
import StartupSequence from './components/StartupSequence'
```

### Step 2: Add State Variable

Add this state variable (typically near the top of your component, with other useState calls):

```jsx
const [isStartupComplete, setIsStartupComplete] = useState(false)
```

### Step 3: Add StartupSequence Component

Add this in your JSX return (typically near the beginning, before your main content):

```jsx
{!isStartupComplete && (
  <StartupSequence onComplete={() => setIsStartupComplete(true)} />
)}
```

### Step 4: Wrap Main Content

Wrap your main content in a div that fades in after startup:

```jsx
{/* Render desktop behind startup sequence so it's ready when fade completes */}
<div style={{ 
  opacity: isStartupComplete ? 1 : 0, 
  pointerEvents: isStartupComplete ? 'auto' : 'none',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: isStartupComplete ? 1 : 0,
  transition: 'opacity 0.3s ease-in',
  visibility: isStartupComplete ? 'visible' : 'hidden'
}}>
  {/* Your main app content here */}
</div>
```

---

## File 6: Audio Files

Place these audio files in your `public` folder:

- `public/assets/audio/PC-boot.mp3` - PC boot sound (plays during boot0)
- `public/assets/audio/Ps1-startup.mp3` - PlayStation startup sound (plays during boot1)

**Note:** You'll need to source these audio files. The paths in the code reference `/assets/audio/` which maps to `public/assets/audio/` in a typical React/Vite setup.

---

## Important Implementation Details

### 1. Audio Settings
- **PC-boot.mp3**: 50% volume, 0.8x playback speed (20% slower)
- **Ps1-startup.mp3**: 50% volume, starts at 0.5 seconds
- Both audios fade out over 1 second when loading completes

### 2. Timing (15% longer than original)
- Logo stage: 3439ms display, 2579ms fade out
- Loading bar: 99ms per 2% increment
- Final fade: 1500ms

### 3. User Interaction
- Click prompt appears first (required for audio)
- Boot sequence cannot be skipped
- Audio requires user interaction to play

### 4. Z-index Hierarchy
- Startup sequence: `z-index: 9999999`
- Click prompt: `z-index: 10000000`
- Subtitle: `z-index: 99999999`

### 5. Dependencies
- React (useState, useEffect, useRef)
- No external libraries required

---

## Testing Checklist

- [ ] Boot sequence shows click prompt first
- [ ] After click, boot text types out character by character
- [ ] PC-boot.mp3 plays during boot text
- [ ] Logo screen appears with orange emoji and "Tang Gang" text
- [ ] Ps1-startup.mp3 plays during logo screen
- [ ] Loading bar animates from 0% to 100%
- [ ] Both audios fade out when loading completes
- [ ] Final fade to website is smooth (black background maintained)
- [ ] Main content appears after startup completes

---

## Summary

This guide contains everything needed to recreate the boot sequence exactly as implemented. The sequence consists of:

1. **boot0**: Boot text sequence with typing animation and PC-boot audio
2. **boot1**: Logo screen with orange emoji, pulsing animation, and PS1 startup audio
3. **boot2**: Loading bar with progress animation and simultaneous audio fade-out

All files are self-contained and only require React hooks (no external dependencies). The audio files need to be sourced separately and placed in the `public/assets/audio/` directory.

