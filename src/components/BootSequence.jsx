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

