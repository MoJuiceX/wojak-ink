/**
 * PapaEasterEgg - Session-only Easter egg that triggers at specific juice level thresholds
 * 
 * Papa1: Triggers when juice glass reaches 5% (upward crossing)
 * Papa2: Triggers when juice glass reaches 45% (upward crossing)
 * Papa3: Triggers when juice glass reaches 85% (upward crossing) + rage shake
 * 
 * Each animation plays sound once when it reaches the top
 * Animation durations reduced by 20% for snappier feel (Dec 2025)
 * 
 * MOUNTING: Render in App.jsx inside <main> element, after <OrangeToyLayer /> (around line 226)
 * 
 * Example:
 *   <OrangeToyLayer />
 *   <PapaEasterEgg />
 */

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { useOrangeToy } from '../contexts/OrangeToyContext'
import { useShuffleBag } from '../hooks/useShuffleBag'
import { usePapaEggTriggers } from '../hooks/usePapaEggTriggers'

// Configuration for Papa types
export const PAPA_CONFIG = {
  1: { threshold: 0.05, stayMs: 565, shakeClass: 'calm' },
  2: { threshold: 0.45, stayMs: 885, shakeClass: 'medium' },
  3: { threshold: 0.85, stayMs: 1330, shakeClass: 'raging' },
  timing: { soundDelay: 160, riseMs: 2160, fallMs: 1440, ampUpMs: 280, ampDownMs: 280 }
}

// Image sets for variant selection using shuffle bag system
// Shuffle bag ensures even distribution of variants over time, avoiding streaks
// Note: All sets except Papa are in papaeffect/ subdirectory
const IMAGE_SETS = [
  // Set 0: Original Papa set
  ['/assets/images/Papa1.png', '/assets/images/Papa2.png', '/assets/images/Papa3.png'],
  // Set 1: pt set
  ['/assets/images/papaeffect/pt1.png', '/assets/images/papaeffect/pt2.png', '/assets/images/papaeffect/pt3.png'],
  // Set 2: ph set
  ['/assets/images/papaeffect/ph1.png', '/assets/images/papaeffect/ph2.png', '/assets/images/papaeffect/ph3.png'],
  // Set 3: pmb set
  ['/assets/images/papaeffect/pmb1.png', '/assets/images/papaeffect/pmb2.png', '/assets/images/papaeffect/pmb3.png'],
  // Set 4: ptin set
  ['/assets/images/papaeffect/ptin1.png', '/assets/images/papaeffect/ptin2.png', '/assets/images/papaeffect/ptin3.png'],
  // Set 5: pwiz set
  ['/assets/images/papaeffect/pwiz1.png', '/assets/images/papaeffect/pwiz2.png', '/assets/images/papaeffect/pwiz3.png'],
  // Set 6: pwizB set
  ['/assets/images/papaeffect/pwizB1.png', '/assets/images/papaeffect/pwizB2.png', '/assets/images/papaeffect/pwizB3.png'],
  // Set 7: pwizO set
  ['/assets/images/papaeffect/pwizO1.png', '/assets/images/papaeffect/pwizO2.png', '/assets/images/papaeffect/pwizO3.png'],
  // Set 8: pp set
  ['/assets/images/papaeffect/pp1.png', '/assets/images/papaeffect/pp2.png', '/assets/images/papaeffect/pp3.png'],
  // Set 9: pv set
  ['/assets/images/papaeffect/pv1.png', '/assets/images/papaeffect/pv2.png', '/assets/images/papaeffect/pv3.png'],
  // Set 10: ps set
  ['/assets/images/papaeffect/ps1.png', '/assets/images/papaeffect/ps2.png', '/assets/images/papaeffect/ps3.png'],
  // Set 11: psup set
  ['/assets/images/papaeffect/psup1.png', '/assets/images/papaeffect/psup2.png', '/assets/images/papaeffect/psup3.png'],
  // Set 12: psm set
  ['/assets/images/papaeffect/psm1.png', '/assets/images/papaeffect/psm2.png', '/assets/images/papaeffect/psm3.png'],
  // Set 13: ppr set
  ['/assets/images/papaeffect/ppr1.png', '/assets/images/papaeffect/ppr2.png', '/assets/images/papaeffect/ppr3.png'],
  // Set 14: pc set
  ['/assets/images/papaeffect/pc1.png', '/assets/images/papaeffect/pc2.png', '/assets/images/papaeffect/pc3.png'],
]


const PapaEasterEgg = forwardRef(function PapaEasterEgg(props, ref) {
  // DEV mode check (Vite-safe expression)
  const isDev = (import.meta?.env?.DEV) ?? (process.env.NODE_ENV === 'development')
  
  // State machine: 'hidden' | 'papa1' | 'papa2' | 'papa3' | 'falling'
  const [state, setState] = useState('hidden')
  const [papa1Opacity, setPapa1Opacity] = useState(0)
  const [papa2Opacity, setPapa2Opacity] = useState(0)
  const [papa3Opacity, setPapa3Opacity] = useState(0)
  // Banana burst effect state
  const [showBananaBurst, setShowBananaBurst] = useState(false)
  const bananaBurstShownRef = useRef(false)
  
  // Refs for tracking and timers
  const timersRef = useRef([])
  const audioRef = useRef(null)
  const bananaPopAudioRef = useRef(null)
  const papa1ImgRef = useRef(null)
  const papa2ImgRef = useRef(null)
  const papa3ImgRef = useRef(null)
  // Current variant indices for this run (used for micro-offset and DEV readout)
  const currentVariant1Ref = useRef(null)
  const currentVariant2Ref = useRef(null)
  const currentVariant3Ref = useRef(null)
  // Entrance and exit directions (randomized per trigger, independent)
  const entranceDirRef = useRef('bottom') // 'bottom' | 'left'
  const exitDirRef = useRef('bottom') // 'bottom' | 'left'
  // Motion amplitude control (0 to 1, smoothly ramped)
  const motionAmpRef = useRef(0)
  const motionAmpRafRef = useRef(null)
  const shakeWrapperRef = useRef(null)
  
  // Get juice level from OrangeToyContext
  const { fillPct } = useOrangeToy()
  
  // Shuffle bag hooks for three independent bags
  const bag1 = useShuffleBag({ bagKey: 'papaEggBag1', lastKey: 'papaEggLast1', N: IMAGE_SETS.length })
  const bag2 = useShuffleBag({ bagKey: 'papaEggBag2', lastKey: 'papaEggLast2', N: IMAGE_SETS.length })
  const bag3 = useShuffleBag({ bagKey: 'papaEggBag3', lastKey: 'papaEggLast3', N: IMAGE_SETS.length })
  
  // State for current image paths (defaults to first set, updated when variant is selected on first trigger)
  const [imagePaths, setImagePaths] = useState(IMAGE_SETS[0]) // Default to first set, will be updated from bag on first trigger
  // State for rarity: 'normal' | 'rare' | 'legendary'
  const [rarity, setRarity] = useState('normal')
  
  // Expose trigger method via ref (for testing)
  useImperativeHandle(ref, () => ({
    trigger: (papaType = 1) => {
      startAnimation(papaType)
    }
  }))
  
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
  
  // Smoothly tween motion amplitude using requestAnimationFrame
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
  
  // Get deterministic micro-offset factor based on variant index (±1.5%)
  const getVariantMicroOffsetFactor = (variantIndex) => {
    if (variantIndex === null || variantIndex === undefined) {
      return 1
    }
    // Deterministic hash-like method for stable offset per variant
    const t = (variantIndex * 9301 + 49297) % 233280
    const r = t / 233280 // 0..1
    return 0.985 + r * (1.015 - 0.985) // Range: 0.985 to 1.015 (±1.5%)
  }
  
  
  // Get sound source path for given papaType
  const getSoundSrcForPapa = (papaType) => `/assets/audio/Gorilla${papaType}.mp3`

  // Play sound for specific papaType (uses existing audio element)
  const playSoundForPapa = (papaType) => {
    try {
      const el = audioRef.current
      if (!el) return
      
      const src = getSoundSrcForPapa(papaType)
      
      // Update src if needed (check if current src doesn't end with the filename)
      if (!el.src.endsWith(`Gorilla${papaType}.mp3`)) {
        el.src = src
        el.load()
      }
      
      el.currentTime = 0
      el.volume = 0.4
      el.play().catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PapaEasterEgg] Audio play failed:', err)
        }
      })
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PapaEasterEgg] Audio error:', err)
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
          console.debug('[PapaEasterEgg] Banana pop sound not available:', err)
        }
      })
    } catch (err) {
      // Gracefully skip if audio creation fails
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PapaEasterEgg] Banana pop audio error:', err)
      }
    }
  }
  
  // Start animation sequence
  const startAnimation = (papaType) => {
    // Clear any existing timers
    clearAllTimers()
    
    // Reset motion amplitude
    motionAmpRef.current = 0
    if (shakeWrapperRef.current) {
      shakeWrapperRef.current.style.setProperty('--amp', '0')
    }
    
    // Reset all opacities
    setPapa1Opacity(0)
    setPapa2Opacity(0)
    setPapa3Opacity(0)
    
    // Reset banana burst flag for new animation
    bananaBurstShownRef.current = false
    setShowBananaBurst(false)
    
    // Get config for this papaType
    const config = PAPA_CONFIG[papaType]
    const stayDuration = config.stayMs
    const imageState = `papa${papaType}`
    
    // Set opacity for the correct papa type
    if (papaType === 1) {
      setPapa1Opacity(1)
    } else if (papaType === 2) {
      setPapa2Opacity(1)
    } else if (papaType === 3) {
      setPapa3Opacity(1)
    }
    
    // Randomly choose entrance direction
    entranceDirRef.current = Math.random() < 0.5 ? 'left' : 'bottom'
    
    // Choose exit direction with 60% bias toward opposite of entrance
    if (Math.random() < 0.6) {
      // 60%: exit opposite of entrance (intentional mismatch)
      exitDirRef.current = entranceDirRef.current === 'left' ? 'bottom' : 'left'
    } else {
      // 40%: exit same as entrance
      exitDirRef.current = entranceDirRef.current
    }
    
    // Set to hidden first with the new entrance direction to ensure correct starting position
    // Set amplitude to 0 immediately before showing
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
        setState('falling')
        
        // After transition completes, go to hidden
        addTimer(() => {
          setState('hidden')
          setPapa1Opacity(0)
          setPapa2Opacity(0)
          setPapa3Opacity(0)
        }, PAPA_CONFIG.timing.fallMs)
      }, PAPA_CONFIG.timing.ampDownMs)
    }, fallStartTime)
  }
  
  // Handle early dismiss (click/tap)
  const handleDismiss = () => {
    if (state === 'hidden') return
    
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
    setPapa1Opacity(0)
    setPapa2Opacity(0)
    setPapa3Opacity(0)
    
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
  
  // Roll rarity on first trigger: 2% rare, 0.3% legendary
  const rollRarity = useCallback(() => {
    if (typeof window === 'undefined') return 'normal'
    
    const roll = Math.random()
    let newRarity = 'normal'
    
    if (roll < 0.003) {
      // 0.3% chance: legendary
      newRarity = 'legendary'
    } else if (roll < 0.023) {
      // 2% chance: rare (0.3% + 1.7% = 2%)
      newRarity = 'rare'
    }
    
    // Store in sessionStorage
    try {
      sessionStorage.setItem('papaEggRarity', newRarity)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PapaEasterEgg] Error saving rarity:', err)
      }
    }
    
    setRarity(newRarity)
    return newRarity
  }, [])
  
  // Helper to select three independent variants (only on first trigger of session)
  const selectThreeVariants = useCallback(() => {
    const N = IMAGE_SETS.length
    
    if (N <= 1) {
      // Fallback: use set 0 for all
      setImagePaths([IMAGE_SETS[0][0], IMAGE_SETS[0][1], IMAGE_SETS[0][2]])
      currentVariant1Ref.current = 0
      currentVariant2Ref.current = 0
      currentVariant3Ref.current = 0
      return
    }
    
    // Select three independent indices using hooks
    const idx1 = bag1.getNextIndex()
    const idx2 = bag2.getNextIndex()
    const idx3 = bag3.getNextIndex()
    
    // Build mixed imagePaths: Papa1 from idx1, Papa2 from idx2, Papa3 from idx3
    setImagePaths([
      IMAGE_SETS[idx1][0], // Papa1 from set idx1
      IMAGE_SETS[idx2][1], // Papa2 from set idx2
      IMAGE_SETS[idx3][2]  // Papa3 from set idx3
    ])
    
    // Store for DEV readout and micro-offset
    currentVariant1Ref.current = idx1
    currentVariant2Ref.current = idx2
    currentVariant3Ref.current = idx3
    
    // Roll rarity on first trigger
    rollRarity()
  }, [bag1, bag2, bag3, rollRarity])
  
  // Handle trigger from usePapaEggTriggers hook
  const handleTrigger = useCallback((papaType, isFirstTrigger) => {
    // Select variants BEFORE marking threshold (critical ordering)
    // Hook ensures isFirstTrigger is computed correctly before marking
    if (isFirstTrigger) {
      selectThreeVariants()
    }
    startAnimation(papaType)
  }, [selectThreeVariants, startAnimation])
  
  // Use hook for threshold detection and session gating
  usePapaEggTriggers(fillPct, PAPA_CONFIG, handleTrigger)
  
  // DEV-only: Test trigger helper (doesn't mark thresholds in sessionStorage)
  const triggerTest = (papaType) => {
    // Always call variant selection and start animation (but don't mark thresholds)
    selectThreeVariants()
    startAnimation(papaType)
  }
  
  // Track previous fillPct for reset detection
  const prevFillPctForRarityRef = useRef(null)
  
  // Load rarity from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = sessionStorage.getItem('papaEggRarity')
      if (stored && ['normal', 'rare', 'legendary'].includes(stored)) {
        setRarity(stored)
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PapaEasterEgg] Error loading rarity:', err)
      }
    }
  }, [])
  
  // Clear rarity when session resets (fillPct goes from >0 to 0)
  useEffect(() => {
    const prevFillPct = prevFillPctForRarityRef.current
    prevFillPctForRarityRef.current = fillPct
    
    // When fillPct goes from > 0 to 0, the prize was claimed and score reset
    if (prevFillPct !== null && prevFillPct > 0 && fillPct === 0) {
      try {
        sessionStorage.removeItem('papaEggRarity')
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PapaEasterEgg] Error clearing rarity:', err)
        }
      }
      setRarity('normal')
    }
  }, [fillPct])
  
  // DEV-only: Clear session gating
  const clearSession = () => {
    try {
      sessionStorage.removeItem('papaEasterEggTriggered')
      sessionStorage.removeItem('papaEggRarity')
      setRarity('normal')
    } catch (err) {
      console.debug('[PapaEasterEgg] Error clearing sessionStorage:', err)
    }
    // Note: Hook will reload on next fillPct change
  }
  
  // DEV-only: Reset variant bags
  const resetVariants = () => {
    // Optional cleanup: Remove old single-bag keys if they exist
    localStorage.removeItem('papaEasterEggVariantBag')
    localStorage.removeItem('papaEasterEggLastVariantIndex')
    
    // Reset all three bags by clearing localStorage
    localStorage.removeItem('papaEggBag1')
    localStorage.removeItem('papaEggLast1')
    localStorage.removeItem('papaEggBag2')
    localStorage.removeItem('papaEggLast2')
    localStorage.removeItem('papaEggBag3')
    localStorage.removeItem('papaEggLast3')
    
    // Force reload by creating new hook instances (component will need to remount to fully reset)
    // For now, just clear localStorage - hooks will regenerate on next use
  }
  
  // Preload images for current variant
  useEffect(() => {
    const currentPaths = imagePaths
    
    // Preload image 1
    papa1ImgRef.current = new Image()
    papa1ImgRef.current.onerror = () => {
      console.warn(`[PapaEasterEgg] Failed to preload image: ${currentPaths[0]}`)
    }
    papa1ImgRef.current.src = currentPaths[0]
    
    // Preload image 2
    papa2ImgRef.current = new Image()
    papa2ImgRef.current.onerror = () => {
      console.warn(`[PapaEasterEgg] Failed to preload image: ${currentPaths[1]}`)
    }
    papa2ImgRef.current.src = currentPaths[1]
    
    // Preload image 3
    papa3ImgRef.current = new Image()
    papa3ImgRef.current.onerror = () => {
      console.warn(`[PapaEasterEgg] Failed to preload image: ${currentPaths[2]}`)
    }
    papa3ImgRef.current.src = currentPaths[2]
  }, [imagePaths])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
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
  
  // Get transform based on state (base Y position) - using translate3d for GPU acceleration
  const getTransform = () => {
    switch (state) {
      case 'hidden':
        // Use entranceDir to determine hidden position (where entrance will start from)
        return entranceDirRef.current === 'left' 
          ? 'translate3d(-120vw, -23px, 0)'  // Off-screen left, same Y as final position
          : 'translate3d(0, 450px, 0)'        // Off-screen bottom
      case 'falling':
        // Use exitDir to determine exit position (where it will exit to)
        return exitDirRef.current === 'left'
          ? 'translate3d(-120vw, -23px, 0)'  // Exit to left
          : 'translate3d(0, 450px, 0)'        // Exit to bottom
      case 'papa1':
      case 'papa2':
      case 'papa3':
        return 'translate3d(-34px, -23px, 0)'  // Final position (moved down 7px from original -30px)
      default:
        return entranceDirRef.current === 'left'
          ? 'translate3d(-120vw, -30px, 0)'
          : 'translate3d(0, 450px, 0)'
    }
  }
  
  // Get transition duration and easing based on state
  const getTransitionStyle = () => {
    if (state === 'papa1' || state === 'papa2' || state === 'papa3') {
      // Rise: smooth ease-out (applies when transitioning from hidden to any papa state)
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
            --rot: 1.5;  // Rotation
            --scale: 1.015;  // Forward lean
          }
          50% { 
            --mx: 0;
            --my: 0;
            --rot: 0;
            --scale: 1.02;  // Stronger forward lean
          }
          75% { 
            --mx: -3;
            --my: 3;
            --rot: -1.5;  // Rotation opposite
            --scale: 1.015;  // Forward lean
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
        
        .papa-easter-egg-wrapper {
          position: fixed;
          left: 30px;
          bottom: 0;
          z-index: 9999; /* Behind taskbar at 10000, above desktop content */
          height: 300px;
          width: auto;
          will-change: transform;
        }
        
        .papa-easter-egg-wrapper.rare {
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 12px rgba(255, 215, 0, 0.4));
        }
        
        .papa-easter-egg-wrapper.legendary {
          filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 140, 0, 0.6)) hue-rotate(5deg);
        }
        
        .papa-easter-egg-shake-wrapper {
          position: relative;
          height: 100%;
          width: 100%;
          will-change: transform;
        }
        
        .papa-easter-egg-shake-wrapper.calm {
          animation: calmBob 1.0s ease-in-out infinite;
          transform: translate3d(
            calc(var(--mx, 0) * var(--amp, 0) * var(--sx, 1) * 1px),
            calc(var(--my, 0) * var(--amp, 0) * var(--sy, 1) * 1px),
            0
          ) rotate(calc(var(--rot, 0) * var(--amp, 0) * 1deg))
          scale(calc(1 + (var(--scale, 1) - 1) * var(--amp, 0)));
        }
        
        .papa-easter-egg-shake-wrapper.medium {
          animation: pulseJitter 0.22s ease-in-out infinite;
          transform: translate3d(
            calc(var(--mx, 0) * var(--amp, 0) * var(--sx, 1) * 1px),
            calc(var(--my, 0) * var(--amp, 0) * var(--sy, 1) * 1px),
            0
          ) rotate(calc(var(--rot, 0) * var(--amp, 0) * 1deg))
          scale(calc(1 + (var(--scale, 1) - 1) * var(--amp, 0)));
        }
        
        .papa-easter-egg-shake-wrapper.raging {
          animation: vibrate 0.1s infinite, ragePulse 0.3s ease-in-out infinite;
          transform: translate3d(
            calc(var(--mx, 0) * var(--amp, 0) * var(--sx, 1) * 1px),
            calc(var(--my, 0) * var(--amp, 0) * var(--sy, 1) * 1px),
            0
          ) rotate(calc(var(--rot, 0) * var(--amp, 0) * 1deg)) scale(calc(var(--pulseScale, 1) * var(--amp, 0) + (1 - var(--amp, 0))));
        }
        
        .papa-easter-egg-inner {
          position: relative;
          height: 100%;
          width: 100%;
        }
        
        .papa-easter-egg-inner img {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: auto;
          object-fit: contain;
          object-position: left bottom;
          display: block;
          transition: opacity 0.2s ease-in-out;
          pointer-events: none;
        }
        
        .papa-easter-egg-inner img.papa1 {
          z-index: 1;
        }
        
        .papa-easter-egg-inner img.papa2 {
          z-index: 2;
        }
        
        .papa-easter-egg-inner img.papa3 {
          z-index: 3;
        }
        
        @media (min-width: 768px) {
          .papa-easter-egg-wrapper {
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
          left: 40px;
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
        className={`papa-easter-egg-wrapper ${rarity !== 'normal' ? rarity : ''}`}
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
        aria-label="Papa Easter Egg"
        tabIndex={state === 'hidden' ? -1 : 0}
      >
        {/* Inner wrapper for shake animation (separate from slide transform) */}
        <div 
          ref={shakeWrapperRef}
          className={`papa-easter-egg-shake-wrapper ${
            state === 'papa1' ? PAPA_CONFIG[1].shakeClass :
            state === 'papa2' ? PAPA_CONFIG[2].shakeClass :
            state === 'papa3' ? PAPA_CONFIG[3].shakeClass : ''
          }`}>
          <div className="papa-easter-egg-inner">
            {/* All three images stacked, opacity controlled for smooth crossfade */}
            {/* Images use current variant's paths from imagePaths state */}
            <img
              src={imagePaths[0]}
              alt="Papa"
              draggable="false"
              className="papa1"
              style={{ opacity: papa1Opacity }}
              onError={(e) => {
                console.warn(`[PapaEasterEgg] Failed to load image: ${imagePaths[0]}`)
              }}
            />
            <img
              src={imagePaths[1]}
              alt=""
              draggable="false"
              className="papa2"
              style={{ opacity: papa2Opacity }}
              aria-hidden="true"
              onError={(e) => {
                console.warn(`[PapaEasterEgg] Failed to load image: ${imagePaths[1]}`)
              }}
            />
            <img
              src={imagePaths[2]}
              alt=""
              draggable="false"
              className="papa3"
              style={{ opacity: papa3Opacity }}
              aria-hidden="true"
              onError={(e) => {
                console.warn(`[PapaEasterEgg] Failed to load image: ${imagePaths[2]}`)
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
      
      {/* DEV-only debug panel */}
      {isDev && (
        <div style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 100000,
          padding: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          fontSize: '12px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          minWidth: '200px',
          maxWidth: '300px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '4px' }}>
            PapaEasterEgg Debug
          </div>
          
          <div style={{ marginBottom: '8px', fontSize: '10px', opacity: 0.8 }}>
            <div>State: {state}</div>
            <div>Entrance: {entranceDirRef.current}</div>
            <div>Exit: {exitDirRef.current}</div>
            <div>Rarity: <span style={{ 
              color: rarity === 'legendary' ? '#ff8c00' : rarity === 'rare' ? '#ffd700' : 'inherit',
              fontWeight: rarity !== 'normal' ? 'bold' : 'normal'
            }}>{rarity}</span></div>
            <div>Papa1: idx {currentVariant1Ref.current}</div>
            <div>Papa2: idx {currentVariant2Ref.current}</div>
            <div>Papa3: idx {currentVariant3Ref.current}</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => triggerTest(1)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                borderRadius: '3px'
              }}
              onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              Test Papa1
            </button>
            <button
              onClick={() => triggerTest(2)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                borderRadius: '3px'
              }}
              onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              Test Papa2
            </button>
            <button
              onClick={() => triggerTest(3)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                borderRadius: '3px'
              }}
              onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              Test Papa3
            </button>
            <button
              onClick={clearSession}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 200, 0, 0.3)',
                border: '1px solid rgba(255, 200, 0, 0.5)',
                color: 'white',
                borderRadius: '3px',
                marginTop: '4px'
              }}
              onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 200, 0, 0.4)'}
              onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 200, 0, 0.3)'}
            >
              Next Session
            </button>
            <button
              onClick={resetVariants}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 100, 100, 0.3)',
                border: '1px solid rgba(255, 100, 100, 0.5)',
                color: 'white',
                borderRadius: '3px'
              }}
              onMouseDown={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 0.4)'}
              onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 0.3)'}
            >
              Reset Variants
            </button>
          </div>
        </div>
      )}
    </>
  )
})

export default PapaEasterEgg

