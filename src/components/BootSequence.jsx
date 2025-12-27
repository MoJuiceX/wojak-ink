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
  "  Accepting Cookies  : <none>",
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
  onAudioEnd
}) {
  const [visibleLines, setVisibleLines] = useState([])
  const [completedLines, setCompletedLines] = useState(new Set())
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    // Check if already shown (if showOnce is true)
    if (showOnce) {
      const hasSeenBoot = sessionStorage.getItem('hasSeenBoot')
      if (hasSeenBoot) {
        onDone?.()
        return
      }
    }

    // Play PC boot sound at the start (10% slower)
    const bootAudio = new Audio('/assets/audio/PC-boot.mp3')
    bootAudio.volume = 0.7
    bootAudio.playbackRate = 0.9 // 10% slower (0.9 = 90% speed)
    
    // Get audio duration and start crossfade earlier so PS1 is fully faded in before PC-boot ends
    bootAudio.addEventListener('loadedmetadata', () => {
      const originalDuration = bootAudio.duration
      const adjustedDuration = originalDuration / 0.9 // Adjust for slower playback rate (10% slower = longer duration)
      const fadeStartTime = adjustedDuration - 4000 // Start fade 4 seconds before end (500ms earlier, gives PS1 time to fully fade in)
      const fadeDuration = 3000 // 3 second fade (PS1 needs 2 seconds to fade in, starting 4s before end ensures it's done)
      
      // Start crossfade when we reach fade start time
      const checkFade = () => {
        const currentTime = bootAudio.currentTime
        
        if (currentTime >= fadeStartTime && currentTime < adjustedDuration) {
          const fadeProgress = (currentTime - fadeStartTime) / fadeDuration
          bootAudio.volume = 0.7 * (1 - fadeProgress) // Fade out PC-boot
          
          // Trigger PS1 audio fade in immediately when fade starts
          if (onAudioEnd && fadeProgress > 0) {
            onAudioEnd(fadeProgress) // Pass fade progress for crossfade
          }
        }
        
        if (!bootAudio.paused && currentTime < adjustedDuration) {
          requestAnimationFrame(checkFade)
        }
      }
      
      bootAudio.addEventListener('play', () => {
        if (bootAudio.currentTime >= fadeStartTime) {
          checkFade()
        } else {
          setTimeout(() => checkFade(), (fadeStartTime - bootAudio.currentTime) * 1000)
        }
      })
    })
    
    // When PC-boot ends, ensure PS1 audio is at full volume
    bootAudio.addEventListener('ended', () => {
      if (onAudioEnd) {
        onAudioEnd(1) // Full fade complete
      }
    })
    
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

      // Mark as seen
      if (showOnce) {
        sessionStorage.setItem('hasSeenBoot', 'true')
      }
      
      await delay(282) // Brief pause at the end (15% longer: 245 * 1.15 ≈ 282)
      
      // Start fade out
      setIsFading(true)
      await delay(800) // Fade out duration
      
      onDone?.()
    }

    sequence()
  }, [lines, onDone, showOnce, typingSpeed])

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [visibleLines])

  return (
    <div className={`boot-sequence ${isFading ? 'fade-out' : ''}`}>
      <img
        className="boot-sequence-right-art"
        src="/assets/penguin_win95_256.png"
        alt=""
        aria-hidden="true"
      />
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

