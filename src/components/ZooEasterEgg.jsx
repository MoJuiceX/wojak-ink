/**
 * ZooEasterEgg - Session-only Easter egg that triggers at specific juice level thresholds
 * 
 * Zoo appears on the RIGHT side of the screen, rises from bottom, exits down, and faces LEFT (images already face left).
 * Uses the same trigger thresholds as Papa (5%, 45%, 85%) but is selected randomly per trigger.
 * 
 * Zoo1: Triggers when juice glass reaches 5% (upward crossing)
 * Zoo2: Triggers when juice glass reaches 45% (upward crossing)
 * Zoo3: Triggers when juice glass reaches 85% (upward crossing) + rage shake
 * 
 * Each animation plays sound once when it reaches the top
 * Animation durations same as Papa (reduced by 20% for snappier feel)
 * 
 * MOUNTING: Rendered via EasterEggCoordinator in App.jsx
 */

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { useShuffleBag } from '../hooks/useShuffleBag'
import { PAPA_CONFIG } from './PapaEasterEgg'

// Zoo image sets - all sets have 3 frames (*1, *2, *3)
const IMAGE_SETS_ZOO = [
  ['/assets/images/papaeffect/zoo/Zoo1.png', '/assets/images/papaeffect/zoo/Zoo2.png', '/assets/images/papaeffect/zoo/Zoo3.png'],
  ['/assets/images/papaeffect/zoo/ZooB1.png', '/assets/images/papaeffect/zoo/ZooB2.png', '/assets/images/papaeffect/zoo/ZooB3.png'],
  ['/assets/images/papaeffect/zoo/ZooC1.png', '/assets/images/papaeffect/zoo/ZooC2.png', '/assets/images/papaeffect/zoo/ZooC3.png'],
  ['/assets/images/papaeffect/zoo/ZooCap1.png', '/assets/images/papaeffect/zoo/ZooCap2.png', '/assets/images/papaeffect/zoo/ZooCap3.png'],
  ['/assets/images/papaeffect/zoo/ZooCow1.png', '/assets/images/papaeffect/zoo/ZooCow2.png', '/assets/images/papaeffect/zoo/ZooCow3.png'],
  ['/assets/images/papaeffect/zoo/ZooF1.png', '/assets/images/papaeffect/zoo/ZooF2.png', '/assets/images/papaeffect/zoo/ZooF3.png'],
  ['/assets/images/papaeffect/zoo/ZooField1.png', '/assets/images/papaeffect/zoo/ZooField2.png', '/assets/images/papaeffect/zoo/ZooField3.png'],
  ['/assets/images/papaeffect/zoo/ZooFire1.png', '/assets/images/papaeffect/zoo/ZooFire2.png', '/assets/images/papaeffect/zoo/ZooFire3.png'],
  ['/assets/images/papaeffect/zoo/ZooH1.png', '/assets/images/papaeffect/zoo/ZooH2.png', '/assets/images/papaeffect/zoo/ZooH3.png'],
  ['/assets/images/papaeffect/zoo/ZooHH1.png', '/assets/images/papaeffect/zoo/ZooHH2.png', '/assets/images/papaeffect/zoo/ZooHH3.png'],
  ['/assets/images/papaeffect/zoo/Zoox2p1.png', '/assets/images/papaeffect/zoo/Zoox2p2.png', '/assets/images/papaeffect/zoo/Zoox2p3.png'],
]

const ZooEasterEgg = forwardRef(function ZooEasterEgg(props, ref) {
  // DEV mode check (Vite-safe expression)
  const isDev = (import.meta?.env?.DEV) ?? (process.env.NODE_ENV === 'development')
  
  // State machine: 'hidden' | 'zoo1' | 'zoo2' | 'zoo3' | 'falling'
  const [state, setState] = useState('hidden')
  const [zoo1Opacity, setZoo1Opacity] = useState(0)
  const [zoo2Opacity, setZoo2Opacity] = useState(0)
  const [zoo3Opacity, setZoo3Opacity] = useState(0)
  // Banana burst effect state (reused from Papa)
  const [showBananaBurst, setShowBananaBurst] = useState(false)
  const bananaBurstShownRef = useRef(false)
  
  // Refs for tracking and timers
  const timersRef = useRef([])
  const audioRef = useRef(null)
  const bananaPopAudioRef = useRef(null)
  // Audio fade-out refs
  const fadeRafRef = useRef(null)
  const fadeTimeoutRef = useRef(null)
  const zoo1ImgRef = useRef(null)
  const zoo2ImgRef = useRef(null)
  const zoo3ImgRef = useRef(null)
  // Current variant index for this session (used for DEV readout)
  const currentVariantRef = useRef(null)
  // Motion amplitude control (0 to 1, smoothly ramped)
  const motionAmpRef = useRef(0)
  const motionAmpRafRef = useRef(null)
  const shakeWrapperRef = useRef(null)
  
  // Shuffle bag hook for Zoo set selection (one bag for all types, simpler than Papa)
  const bag = useShuffleBag({ bagKey: 'zooEggBag', lastKey: 'zooEggLast', N: IMAGE_SETS_ZOO.length })
  
  // State for current image paths (defaults to first set, updated when variant is selected on first trigger)
  const [imagePaths, setImagePaths] = useState(IMAGE_SETS_ZOO[0])
  
  // Expose trigger and selectVariant methods via ref (for coordinator)
  const selectZooVariant = useCallback(() => {
    const N = IMAGE_SETS_ZOO.length
    
    if (N <= 1) {
      // Fallback: use set 0 for all
      setImagePaths(IMAGE_SETS_ZOO[0])
      currentVariantRef.current = 0
      return
    }
    
    // Select one index using shuffle bag
    const idx = bag.getNextIndex()
    
    // Build imagePaths: Zoo1 from idx, Zoo2 from idx, Zoo3 from idx (all from same set)
    setImagePaths([
      IMAGE_SETS_ZOO[idx][0], // Zoo1 from set idx
      IMAGE_SETS_ZOO[idx][1], // Zoo2 from set idx
      IMAGE_SETS_ZOO[idx][2]  // Zoo3 from set idx
    ])
    
    // Store for DEV readout
    currentVariantRef.current = idx
  }, [bag])
  
  useImperativeHandle(ref, () => ({
    trigger: (papaType = 1) => {
      startAnimation(papaType)
    },
    selectVariant: () => {
      selectZooVariant()
    }
  }), [selectZooVariant])
  
  // Timer helper: track all timers for cleanup
  const addTimer = (cb, delay) => {
    const id = setTimeout(cb, delay)
    timersRef.current.push(id)
    return id
  }
  
  // Clear all timers helper
  const clearAllTimers = () => {
    timersRef.current.forEach(timer => {
      if (timer) clearTimeout(timer)
    })
    timersRef.current = []
  }
  
  // Smoothly tween motion amplitude using requestAnimationFrame (same as Papa)
  const setMotionAmpSmooth = (target, duration = PAPA_CONFIG.timing.ampUpMs) => {
    // Cancel any existing animation
    if (motionAmpRafRef.current) {
      cancelAnimationFrame(motionAmpRafRef.current)
    }
    
    const startValue = motionAmpRef.current
    const startTime = performance.now()
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease in-out curve
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      const currentValue = startValue + (target - startValue) * eased
      motionAmpRef.current = currentValue
      
      // Update CSS variable on shake wrapper
      if (shakeWrapperRef.current) {
        shakeWrapperRef.current.style.setProperty('--amp', String(currentValue))
      }
      
      if (progress < 1) {
        motionAmpRafRef.current = requestAnimationFrame(animate)
      } else {
        motionAmpRef.current = target
        if (shakeWrapperRef.current) {
          shakeWrapperRef.current.style.setProperty('--amp', String(target))
        }
        motionAmpRafRef.current = null
      }
    }
    
    motionAmpRafRef.current = requestAnimationFrame(animate)
  }
  
  // Audio fade-out helpers (same as Papa)
  const cancelAudioFades = () => {
    if (fadeRafRef.current) {
      cancelAnimationFrame(fadeRafRef.current)
      fadeRafRef.current = null
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current)
      fadeTimeoutRef.current = null
    }
  }
  
  const fadeAudioTo = (el, targetVolume, durationMs) => {
    cancelAudioFades()
    const startVol = el.volume
    const start = performance.now()
    const step = (t) => {
      const p = Math.min((t - start) / durationMs, 1)
      el.volume = startVol + (targetVolume - startVol) * p
      if (p < 1) {
        fadeRafRef.current = requestAnimationFrame(step)
      } else {
        fadeRafRef.current = null
      }
    }
    fadeRafRef.current = requestAnimationFrame(step)
  }
  
  const scheduleEndFade = (el, baseVolume, fadeMs) => {
    cancelAudioFades()
    // Wait until metadata is available; duration can be NaN at first
    const setup = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return
      // remaining time until we should start fade
      const remainingMs = Math.max(0, (el.duration - el.currentTime) * 1000)
      const startFadeInMs = Math.max(0, remainingMs - fadeMs)
      fadeTimeoutRef.current = setTimeout(() => {
        // fade to 0 over fadeMs
        fadeAudioTo(el, 0, fadeMs)
      }, startFadeInMs)
    }
    // If duration is ready now, schedule immediately; otherwise wait for metadata
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setup()
    } else {
      const onMeta = () => {
        el.removeEventListener('loadedmetadata', onMeta)
        setup()
      }
      el.addEventListener('loadedmetadata', onMeta)
    }
    // Ensure volume starts at baseVolume
    el.volume = baseVolume
  }
  
  // Get sound source path for given papaType (Zoo uses same sounds as Papa)
  const getSoundSrcForPapa = (papaType) => `/assets/audio/Gorilla${papaType}.mp3`

  // Audio fade constants
  const BASE_VOL = 0.4
  const FADE_MS = 300

  // Play sound for specific papaType (uses existing audio element, same as Papa)
  const playSoundForPapa = (papaType) => {
    try {
      const el = audioRef.current
      if (!el) return
      
      // Cancel any existing fades
      cancelAudioFades()
      
      const src = getSoundSrcForPapa(papaType)
      
      // Update src if needed (check if current src doesn't end with the filename)
      if (!el.src.endsWith(`Gorilla${papaType}.mp3`)) {
        el.src = src
        el.load()
      }
      
      el.currentTime = 0
      el.volume = BASE_VOL
      el.play().then(() => {
        // Schedule end fade after play starts
        scheduleEndFade(el, BASE_VOL, FADE_MS)
      }).catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ZooEasterEgg] Audio play failed:', err)
        }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ZooEasterEgg] Audio error:', err)
      }
    }
  }
  
  // Play banana pop sound (optional, graceful failure if file doesn't exist)
  const playBananaPopSound = () => {
    try {
      if (!bananaPopAudioRef.current) {
        bananaPopAudioRef.current = new Audio('/assets/audio/bananaPop.mp3')
        bananaPopAudioRef.current.volume = 0.5
      }
      const el = bananaPopAudioRef.current
      el.currentTime = 0
      el.play().catch(err => {
        // Gracefully skip if file doesn't exist or play fails
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ZooEasterEgg] Banana pop sound not available:', err)
        }
      })
    } catch (err) {
      // Gracefully skip if audio creation fails
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ZooEasterEgg] Banana pop audio error:', err)
      }
    }
  }
  
  // Start animation sequence
  const startAnimation = (papaType) => {
    // Clear any existing timers
    clearAllTimers()
    
    // Cancel any existing audio fades
    cancelAudioFades()
    
    // Reset motion amplitude
    motionAmpRef.current = 0
    if (shakeWrapperRef.current) {
      shakeWrapperRef.current.style.setProperty('--amp', '0')
    }
    
    // Reset all opacities
    setZoo1Opacity(0)
    setZoo2Opacity(0)
    setZoo3Opacity(0)
    
    // Reset banana burst flag for new animation
    bananaBurstShownRef.current = false
    setShowBananaBurst(false)
    
    // Get config for this papaType
    const config = PAPA_CONFIG[papaType]
    const stayDuration = config.stayMs
    const imageState = `zoo${papaType}`
    
    // Set opacity for the correct zoo type
    if (papaType === 1) {
      setZoo1Opacity(1)
    } else if (papaType === 2) {
      setZoo2Opacity(1)
    } else if (papaType === 3) {
      setZoo3Opacity(1)
    }
    
    // Generate random seed for shake direction intensity (0.7 to 1.3 range for variation)
    const seedX = 0.7 + Math.random() * 0.6 // 0.7 to 1.3
    const seedY = 0.7 + Math.random() * 0.6 // 0.7 to 1.3
    
    if (shakeWrapperRef.current) {
      shakeWrapperRef.current.style.setProperty('--amp', '0')
      shakeWrapperRef.current.style.setProperty('--sx', String(seedX))
      shakeWrapperRef.current.style.setProperty('--sy', String(seedY))
    }
    setState('hidden')
    
    // Use requestAnimationFrame to ensure the transform is applied before transitioning to visible state
    requestAnimationFrame(() => {
      setState(imageState)
      // Start ramping amplitude to 1 after state is visible
      setMotionAmpSmooth(1, PAPA_CONFIG.timing.ampUpMs)
    })
    
    // Sound: Play shortly after animation starts
    addTimer(() => {
      playSoundForPapa(papaType)
    }, PAPA_CONFIG.timing.soundDelay)
    
    // Start slide down after stay duration (rise + stay duration)
    const fallStartTime = PAPA_CONFIG.timing.riseMs + stayDuration
    addTimer(() => {
      // Ramp amplitude down before exit
      setMotionAmpSmooth(0, PAPA_CONFIG.timing.ampDownMs)
      
      // Wait for motion amplitude to ramp down before changing state to falling
      // This prevents the jump - let the shake settle first
      addTimer(() => {
        // Fade out audio when falling starts
        const el = audioRef.current
        if (el) {
          fadeAudioTo(el, 0, 250)
        }
        setState('falling')
        
        // After transition completes, go to hidden
        addTimer(() => {
          setState('hidden')
          setZoo1Opacity(0)
          setZoo2Opacity(0)
          setZoo3Opacity(0)
        }, PAPA_CONFIG.timing.fallMs)
      }, PAPA_CONFIG.timing.ampDownMs)
    }, fallStartTime)
  }
  
  // Handle early dismiss (click/tap)
  const handleDismiss = () => {
    if (state === 'hidden') return
    
    // Fade out audio immediately on dismiss
    const el = audioRef.current
    if (el) {
      fadeAudioTo(el, 0, 250)
    }
    
    // On first click, show banana burst effect
    if (!bananaBurstShownRef.current) {
      bananaBurstShownRef.current = true
      setShowBananaBurst(true)
      playBananaPopSound()
      
      // Clean up burst after animation completes (450ms)
      const burstTimer = addTimer(() => {
        setShowBananaBurst(false)
      }, 450)
      
      // Dismiss after burst animation
      addTimer(() => {
        performDismiss()
      }, 450)
      
      return
    }
    
    // Subsequent clicks or if burst already shown, dismiss immediately
    performDismiss()
  }
  
  // Perform the actual dismiss logic
  const performDismiss = () => {
    // Clear all timers
    clearAllTimers()
    
    // Hide burst if still visible
    setShowBananaBurst(false)
    
    // Reset opacities
    setZoo1Opacity(0)
    setZoo2Opacity(0)
    setZoo3Opacity(0)
    
    // Ramp amplitude down before exit
    setMotionAmpSmooth(0, PAPA_CONFIG.timing.ampDownMs)
    
    // Wait for motion amplitude to ramp down before changing state to falling
    addTimer(() => {
      setState('falling')
      
      // After transition completes, go to hidden
      addTimer(() => {
        setState('hidden')
        // Reset burst flag for next session
        bananaBurstShownRef.current = false
        setShowBananaBurst(false)
      }, PAPA_CONFIG.timing.fallMs)
    }, PAPA_CONFIG.timing.ampDownMs)
  }
  
  
  // Preload images for current variant
  useEffect(() => {
    const currentPaths = imagePaths
    
    // Preload image 1
    zoo1ImgRef.current = new Image()
    zoo1ImgRef.current.onerror = () => {
      console.warn(`[ZooEasterEgg] Failed to preload image: ${currentPaths[0]}`)
    }
    zoo1ImgRef.current.src = currentPaths[0]
    
    // Preload image 2
    zoo2ImgRef.current = new Image()
    zoo2ImgRef.current.onerror = () => {
      console.warn(`[ZooEasterEgg] Failed to preload image: ${currentPaths[1]}`)
    }
    zoo2ImgRef.current.src = currentPaths[1]
    
    // Preload image 3
    zoo3ImgRef.current = new Image()
    zoo3ImgRef.current.onerror = () => {
      console.warn(`[ZooEasterEgg] Failed to preload image: ${currentPaths[2]}`)
    }
    zoo3ImgRef.current.src = currentPaths[2]
  }, [imagePaths])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
      cancelAudioFades()
    }
  }, [])
  
  // Initialize motion amplitude CSS variable and cleanup rAF on unmount
  useEffect(() => {
    if (shakeWrapperRef.current) {
      shakeWrapperRef.current.style.setProperty('--amp', '0')
    }
    return () => {
      // Cancel any pending animation frame on unmount
      if (motionAmpRafRef.current) {
        cancelAnimationFrame(motionAmpRafRef.current)
        motionAmpRafRef.current = null
      }
    }
  }, [])
  
  // Get transform based on state (base Y position) - Zoo ALWAYS uses bottom entrance/exit
  const getTransform = () => {
    switch (state) {
      case 'hidden':
        return 'translate3d(0, 450px, 0)'  // Off-screen bottom
      case 'falling':
        return 'translate3d(0, 450px, 0)'   // Exit to bottom
      case 'zoo1':
      case 'zoo2':
      case 'zoo3':
        return 'translate3d(35px, -23px, 0)'   // Final position (positive X moves further right)
      default:
        return 'translate3d(0, 450px, 0)'
    }
  }
  
  // Get transition duration and easing based on state (same as Papa)
  const getTransitionStyle = () => {
    if (state === 'zoo1' || state === 'zoo2' || state === 'zoo3') {
      // Rise: smooth ease-out (applies when transitioning from hidden to any zoo state)
      return {
        duration: `${PAPA_CONFIG.timing.riseMs / 1000}s`,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
    if (state === 'falling') {
      // Fall: snappy ease-in
      return {
        duration: `${PAPA_CONFIG.timing.fallMs / 1000}s`,
        easing: 'cubic-bezier(0.7, 0, 0.84, 0)'
      }
    }
    // Instant for state changes that don't involve movement
    return {
      duration: '0s',
      easing: 'ease'
    }
  }
  
  return (
    <>
      <style>{`
        @property --mx { syntax: '<number>'; inherits: false; initial-value: 0; }
        @property --my { syntax: '<number>'; inherits: false; initial-value: 0; }
        @property --rot { syntax: '<number>'; inherits: false; initial-value: 0; }
        @property --scale { syntax: '<number>'; inherits: false; initial-value: 1; }
        @property --pulseScale { syntax: '<number>'; inherits: false; initial-value: 1; }
        @property --amp { syntax: '<number>'; inherits: false; initial-value: 0; }
        @property --sx { syntax: '<number>'; inherits: false; initial-value: 1; }
        @property --sy { syntax: '<number>'; inherits: false; initial-value: 1; }
        
        @keyframes calmBob {
          0% { 
            --mx: 0;
            --my: 0;
            --rot: -0.6;
            --scale: 1.000;
          }
          22% { 
            --mx: 0.6;
            --my: -3.2;
            --rot: 1.1;
            --scale: 1.003;
          }
          48% { 
            --mx: -0.3;
            --my: -4.1;
            --rot: 0.2;
            --scale: 1.006;
          }
          73% { 
            --mx: -0.7;
            --my: -2.8;
            --rot: -1.0;
            --scale: 1.003;
          }
          100% { 
            --mx: 0;
            --my: 0;
            --rot: -0.6;
            --scale: 1.000;
          }
        }
        
        @keyframes pulseJitter {
          0%, 100% { 
            --mx: 0;
            --my: 0;
            --rot: 0;
            --scale: 1.00;
          }
          25% { 
            --mx: 3;
            --my: -3;
            --rot: 1.5;
            --scale: 1.015;
          }
          50% { 
            --mx: 0;
            --my: 0;
            --rot: 0;
            --scale: 1.02;
          }
          75% { 
            --mx: -3;
            --my: 3;
            --rot: -1.5;
            --scale: 1.015;
          }
        }
        
        @keyframes vibrate {
          0%, 100% { 
            --mx: 0;
            --my: 0;
            --rot: 0;
          }
          10% { 
            --mx: -2;
            --my: 1;
            --rot: -0.5;
          }
          20% { 
            --mx: 2;
            --my: -1;
            --rot: 0.5;
          }
          30% { 
            --mx: -2;
            --my: -1;
            --rot: -0.5;
          }
          40% { 
            --mx: 2;
            --my: 1;
            --rot: 0.5;
          }
          50% { 
            --mx: -1;
            --my: 0;
            --rot: -0.3;
          }
          60% { 
            --mx: 1;
            --my: 0;
            --rot: 0.3;
          }
          70% { 
            --mx: -2;
            --my: 1;
            --rot: -0.5;
          }
          80% { 
            --mx: 2;
            --my: -1;
            --rot: 0.5;
          }
          90% { 
            --mx: -1;
            --my: 0;
            --rot: -0.3;
          }
        }
        
        @keyframes ragePulse {
          0%, 100% { 
            --pulseScale: 1.00;
          }
          50% { 
            --pulseScale: 1.03;
          }
        }
        
        .zoo-easter-egg-wrapper {
          position: fixed;
          right: 30px;
          bottom: 0;
          left: auto;
          z-index: 9999; /* Behind taskbar at 10000, above desktop content */
          height: 300px;
          width: auto;
          max-width: calc(100vw - 60px); /* Prevent overflow on small screens */
          will-change: transform;
        }
        
        .zoo-easter-egg-shake-wrapper {
          position: relative;
          height: 100%;
          width: 100%;
          will-change: transform;
        }
        
        .zoo-easter-egg-shake-wrapper.calm {
          animation: calmBob 1.0s ease-in-out infinite;
          transform: translate3d(
            calc(var(--mx, 0) * var(--amp, 0) * var(--sx, 1) * 1px),
            calc(var(--my, 0) * var(--amp, 0) * var(--sy, 1) * 1px),
            0
          ) rotate(calc(var(--rot, 0) * var(--amp, 0) * 1deg))
          scale(calc(1 + (var(--scale, 1) - 1) * var(--amp, 0)));
        }
        
        .zoo-easter-egg-shake-wrapper.medium {
          animation: pulseJitter 0.22s ease-in-out infinite;
          transform: translate3d(
            calc(var(--mx, 0) * var(--amp, 0) * var(--sx, 1) * 1px),
            calc(var(--my, 0) * var(--amp, 0) * var(--sy, 1) * 1px),
            0
          ) rotate(calc(var(--rot, 0) * var(--amp, 0) * 1deg))
          scale(calc(1 + (var(--scale, 1) - 1) * var(--amp, 0)));
        }
        
        .zoo-easter-egg-shake-wrapper.raging {
          animation: vibrate 0.1s infinite, ragePulse 0.3s ease-in-out infinite;
          transform: translate3d(
            calc(var(--mx, 0) * var(--amp, 0) * var(--sx, 1) * 1px),
            calc(var(--my, 0) * var(--amp, 0) * var(--sy, 1) * 1px),
            0
          ) rotate(calc(var(--rot, 0) * var(--amp, 0) * 1deg)) scale(calc(var(--pulseScale, 1) * var(--amp, 0) + (1 - var(--amp, 0))));
        }
        
        .zoo-easter-egg-inner {
          position: relative;
          height: 100%;
          width: 100%;
          /* Zoo images already face left, no mirroring needed */
        }
        
        .zoo-easter-egg-inner img {
          position: absolute;
          top: 0;
          right: 0;
          left: auto;
          height: 100%;
          width: auto;
          object-fit: contain;
          object-position: right bottom;
          display: block;
          transition: opacity 0.2s ease-in-out;
          pointer-events: none;
        }
        
        .zoo-easter-egg-inner img.zoo1 {
          z-index: 1;
        }
        
        .zoo-easter-egg-inner img.zoo2 {
          z-index: 2;
        }
        
        .zoo-easter-egg-inner img.zoo3 {
          z-index: 3;
        }
        
        @media (min-width: 768px) {
          .zoo-easter-egg-wrapper {
            height: 450px;
          }
        }
        
        @keyframes bananaBurst1 {
          0% {
            opacity: 1;
            transform: scale(0) translate(0, 0) rotate(0deg);
          }
          30% {
            opacity: 1;
            transform: scale(1.3) translate(-8px, -15px) rotate(-15deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.3) translate(-30px, -50px) rotate(-45deg);
          }
        }
        
        @keyframes bananaBurst2 {
          0% {
            opacity: 1;
            transform: scale(0) translate(0, 0) rotate(0deg);
          }
          30% {
            opacity: 1;
            transform: scale(1.2) translate(5px, -18px) rotate(20deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.25) translate(25px, -55px) rotate(50deg);
          }
        }
        
        @keyframes bananaBurst3 {
          0% {
            opacity: 1;
            transform: scale(0) translate(0, 0) rotate(0deg);
          }
          30% {
            opacity: 1;
            transform: scale(1.1) translate(-12px, -12px) rotate(-30deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.2) translate(-35px, -45px) rotate(-60deg);
          }
        }
        
        @keyframes bananaBurst4 {
          0% {
            opacity: 1;
            transform: scale(0) translate(0, 0) rotate(0deg);
          }
          30% {
            opacity: 1;
            transform: scale(1.15) translate(8px, -20px) rotate(25deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.25) translate(30px, -60px) rotate(55deg);
          }
        }
        
        .banana-burst {
          position: absolute;
          bottom: 20px;
          right: 40px;
          width: 32px;
          height: 32px;
          pointer-events: none;
          z-index: 10000;
        }
        
        .banana-burst::before,
        .banana-burst::after,
        .banana-burst .particle1,
        .banana-burst .particle2 {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, #ffd700 0%, #ffa500 60%, transparent 100%);
          border-radius: 50%;
          box-shadow: 
            0 0 8px rgba(255, 215, 0, 0.9),
            0 0 16px rgba(255, 165, 0, 0.7),
            0 0 24px rgba(255, 140, 0, 0.5);
        }
        
        .banana-burst::before {
          animation: bananaBurst1 450ms ease-out forwards;
        }
        
        .banana-burst::after {
          animation: bananaBurst2 450ms ease-out forwards;
        }
        
        .banana-burst .particle1 {
          animation: bananaBurst3 450ms ease-out forwards;
        }
        
        .banana-burst .particle2 {
          animation: bananaBurst4 450ms ease-out forwards;
        }
        
      `}</style>
      
      <div
        className="zoo-easter-egg-wrapper"
        style={{
          transform: getTransform(),
          transitionProperty: 'transform',
          transitionDuration: getTransitionStyle().duration,
          transitionTimingFunction: getTransitionStyle().easing,
          pointerEvents: state === 'hidden' ? 'none' : 'auto',
        }}
        onClick={handleDismiss}
        onTouchStart={handleDismiss}
        role="button"
        aria-label="Zoo Easter Egg"
        tabIndex={state === 'hidden' ? -1 : 0}
      >
        {/* Inner wrapper for shake animation (separate from slide transform) */}
        <div 
          ref={shakeWrapperRef}
          className={`zoo-easter-egg-shake-wrapper ${
            state === 'zoo1' ? PAPA_CONFIG[1].shakeClass :
            state === 'zoo2' ? PAPA_CONFIG[2].shakeClass :
            state === 'zoo3' ? PAPA_CONFIG[3].shakeClass : ''
          }`}>
          <div className="zoo-easter-egg-inner">
            {/* All three images stacked, opacity controlled for smooth crossfade */}
            {/* Images use current variant's paths from imagePaths state */}
            <img
              src={imagePaths[0]}
              alt="Zoo"
              draggable="false"
              className="zoo1"
              style={{ opacity: zoo1Opacity }}
              onError={(e) => {
                console.warn(`[ZooEasterEgg] Failed to load image: ${imagePaths[0]}`)
              }}
            />
            <img
              src={imagePaths[1]}
              alt=""
              draggable="false"
              className="zoo2"
              style={{ opacity: zoo2Opacity }}
              aria-hidden="true"
              onError={(e) => {
                console.warn(`[ZooEasterEgg] Failed to load image: ${imagePaths[1]}`)
              }}
            />
            <img
              src={imagePaths[2]}
              alt=""
              draggable="false"
              className="zoo3"
              style={{ opacity: zoo3Opacity }}
              aria-hidden="true"
              onError={(e) => {
                console.warn(`[ZooEasterEgg] Failed to load image: ${imagePaths[2]}`)
              }}
            />
          </div>
        </div>
        
        {/* Banana burst effect */}
        {showBananaBurst && (
          <div className="banana-burst">
            <div className="particle1" />
            <div className="particle2" />
          </div>
        )}
      </div>
      
      {/* Preload audio - src set dynamically per papaType */}
      <audio
        ref={audioRef}
        preload="auto"
      />
    </>
  )
})

export default ZooEasterEgg

