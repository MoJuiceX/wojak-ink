import { useState, useEffect, useRef } from 'react'
import './BootSequence.css'

// Boot lines exported separately for component fast refresh
const TANGY_BOOT_LINES = [
  "CitrusBIOS v1.369 (JuiceBuild)",
  "© 2023–2026 Orange Labs",
  "",
  "Checking PULP integrity .............. OK",
  "CPU : Tangium™ 133MHz",
  "RAM : 65536K JUICE",
  "Video : VGA (Grapefruit Adapter) ..... OK",
  "Keyboard : Clicky-Mechanical ......... OK",
  "Mouse : CitrusTrack v2.1 ............. OK",
  "",
  "Detecting storange of value...",
  "  Primary Master : ORANGE_CITRUS ..... OK",
  "  Primary Slave  : PEEL_DRIVE ........ OK",
  "  Secondary Master : PULP_CACHE ...... OK",
  "  Accepting Cookies  : <true>",
  "",
  "Loading boot sector...",
  "Peel to peel : TANGBOOT.SYS .......... OK",
  "Unpacking kernel : CITRUSKERNEL.95 ... OK",
  "",
  ">> Mounting Orange Grove...",
  "Mount /WMC Server ................... OK",
  "Mount /tanggang ..................... OK",
  "Mount /hoamis ....................... OK",
  "",
  "Initializing drivers...",
  "  peel.sys     (peel protection) .... OK",
  "  pulp.sys     (pulp acceleration) .. OK",
  "  zest.sys     (zest rendering) ..... OK",
  "  squeeze.sys  (juice compression) .. OK",
  "  drip.sys     (liquidity routing) .. OK",
  "",
  "Networking...",
  "  DHCP : requesting fresh IP ........ OK",
  "  DNS  : ROYAL.CLUB ................ OK",
  "  NTP  : syncing to Orange Standard . OK",
  "",
  "Tang Guard Security...",
  "  TangGang handshake .............. PIIP",
  "  Hex Orange Address............. ENABLED",
  "",
  "Starting graphical shell...",
  "Launching ORANGE.EXE ................ OK",
  "Warming up the grove... please wait...",
  "",
  "READY: Storange of Value Initiated 🍊",
]

interface BootSequenceProps {
  lines?: string[]
  onDone?: () => void
  onSkip?: () => void
  showOnce?: boolean
  maxVisibleLines?: number
  typingSpeed?: number
  onBootAudioReady?: (audio: HTMLAudioElement) => void
  onPs1AudioReady?: (audio: HTMLAudioElement) => void
}

export default function BootSequence({
  lines = TANGY_BOOT_LINES,
  onDone,
  onSkip,
  showOnce = true,
  maxVisibleLines = 18,
  typingSpeed = 10,
  onBootAudioReady,
  onPs1AudioReady
}: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [completedLines, setCompletedLines] = useState<Set<number>>(new Set())
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [showClickPrompt, setShowClickPrompt] = useState(false)
  const [sequenceStarted, setSequenceStarted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Always show click prompt - required for both mobile and desktop
  useEffect(() => {
    setShowClickPrompt(true)
  }, [])

  useEffect(() => {
    if (!sequenceStarted) {
      return
    }

    // Use Web Audio API for proper volume attenuation (can go below 0dB)
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const bootAudio = new Audio('/assets/BootUp/PC-boot.mp3')
    bootAudio.playbackRate = 0.8

    // Pass reference immediately so fadeout can work later
    if (onBootAudioReady) {
      onBootAudioReady(bootAudio)
    }

    // Wait for audio to be ready, then connect Web Audio API and play
    bootAudio.addEventListener('canplaythrough', () => {
      // Only set up once
      if ((bootAudio as HTMLAudioElement & { _gainNode?: GainNode })._gainNode) return

      // Create audio source and gain node for precise volume control
      const source = audioContext.createMediaElementSource(bootAudio)
      const gainNode = audioContext.createGain()

      // Start at target volume
      gainNode.gain.value = 0.11

      // Connect: source -> gain -> destination
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Store gainNode reference on the audio element for later access
      ;(bootAudio as HTMLAudioElement & { _gainNode?: GainNode; _audioContext?: AudioContext })._gainNode = gainNode
      ;(bootAudio as HTMLAudioElement & { _gainNode?: GainNode; _audioContext?: AudioContext })._audioContext = audioContext

      // Now play
      bootAudio.play().catch(() => {
        // Audio autoplay may be blocked
      })
    }, { once: true })

    // Start loading
    bootAudio.load()

    const sequence = async () => {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line === '') {
          setVisibleLines(prev => [...prev, ''])
          setCompletedLines(prev => new Set([...prev, i]))
          setCurrentLineIndex(i + 1)
          await delay(29)
          continue
        }

        let currentText = ''
        for (let j = 0; j <= line.length; j++) {
          currentText = line.substring(0, j)
          setVisibleLines(prev => {
            const newLines = [...prev]
            newLines[i] = currentText
            return newLines
          })
          await delay(typingSpeed)
        }

        setCompletedLines(prev => new Set([...prev, i]))
        setCurrentLineIndex(i + 1)
        await delay(15)
      }

      await delay(100)
      setIsFading(true)
      await delay(200)
      onDone?.()
    }

    sequence()
  }, [lines, onDone, showOnce, typingSpeed, sequenceStarted, onBootAudioReady])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [visibleLines])

  const handleClickToStart = () => {
    // Pre-create PS1 audio with Web Audio API during user interaction
    if (onPs1AudioReady) {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const ps1Audio = new Audio('/assets/BootUp/Ps1-startup.mp3')

      // Pass reference immediately
      onPs1AudioReady(ps1Audio)

      // Wait for audio to be ready, then connect Web Audio API
      ps1Audio.addEventListener('canplaythrough', () => {
        // Only set up once
        if ((ps1Audio as HTMLAudioElement & { _gainNode?: GainNode })._gainNode) return

        // Create gain node for precise volume control
        const source = audioContext.createMediaElementSource(ps1Audio)
        const gainNode = audioContext.createGain()

        // Set volume
        gainNode.gain.value = 0.11

        // Connect: source -> gain -> destination
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Store references for later access
        ;(ps1Audio as HTMLAudioElement & { _gainNode?: GainNode; _audioContext?: AudioContext })._gainNode = gainNode
        ;(ps1Audio as HTMLAudioElement & { _gainNode?: GainNode; _audioContext?: AudioContext })._audioContext = audioContext
      }, { once: true })

      // Start loading
      ps1Audio.load()
    }
    setShowClickPrompt(false)
    setSequenceStarted(true)
  }

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the click prompt
    onSkip?.()
  }

  return (
    <div className={`boot-sequence ${isFading ? 'fade-out' : ''}`}>
      {showClickPrompt && (
        <div className="boot-click-prompt" onClick={handleClickToStart}>
          <div className="boot-click-prompt-content">
            <div className="boot-click-prompt-title">ℹ️</div>
            <div className="boot-click-prompt-message">
              Tap for the Full Immersive Experience
            </div>
            <div className="boot-click-prompt-subtitle">
              Audio playback requires user interaction.
            </div>
          </div>
        </div>
      )}

      {/* Skip Intro Button - always visible, subtle at bottom */}
      {onSkip && !isFading && (
        <button type="button" className="boot-skip-button" onClick={handleSkip}>
          Skip Intro <span className="boot-skip-icon">››</span>
        </button>
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
              {line || '\u00A0'}
              {isCurrentLine && <span className="boot-cursor-blink">_</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Re-export for use in other components
export { TANGY_BOOT_LINES }
