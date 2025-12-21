/**
 * PapaEasterEgg - Session-only Easter egg that triggers at specific juice level thresholds
 * 
 * Papa1: Triggers when juice glass reaches 15% (upward crossing)
 * Papa2: Triggers when juice glass reaches 60% (upward crossing)
 * Papa3: Triggers when juice glass reaches 90% (upward crossing) + rage shake
 * 
 * Each animation plays sound once when it reaches the top
 * 
 * MOUNTING: Render in App.jsx inside <main> element, after <OrangeToyLayer /> (around line 226)
 * 
 * Example:
 *   <OrangeToyLayer />
 *   <PapaEasterEgg />
 */

import { useState, useEffect, useRef } from 'react'
import { useOrangeToy } from '../contexts/OrangeToyContext'

export default function PapaEasterEgg() {
  // State machine: 'hidden' | 'papa1' | 'papa2' | 'papa3' | 'falling'
  const [state, setState] = useState('hidden')
  const [papa1Opacity, setPapa1Opacity] = useState(0)
  const [papa2Opacity, setPapa2Opacity] = useState(0)
  const [papa3Opacity, setPapa3Opacity] = useState(0)
  
  // Refs for tracking and timers
  const prevFillPctRef = useRef(null)
  const timersRef = useRef([])
  const audioRef = useRef(null)
  const triggeredThresholdsRef = useRef(new Set())
  const imagesLoadedRef = useRef(false)
  const papa1ImgRef = useRef(null)
  const papa2ImgRef = useRef(null)
  const papa3ImgRef = useRef(null)
  
  // Get juice level from OrangeToyContext
  const { fillPct } = useOrangeToy()
  
  // Clear all timers helper
  const clearAllTimers = () => {
    timersRef.current.forEach(timer => {
      if (timer) clearTimeout(timer)
    })
    timersRef.current = []
  }
  
  // Play sound helper function (creates new Audio instance for overlapping sounds)
  const playSound = () => {
    try {
      const audio = new Audio('/assets/audio/grunt.mp3')
      audio.volume = 0.4
      audio.play().catch(err => {
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
  
  // Start animation sequence
  const startAnimation = (papaType) => {
    // Clear any existing timers
    clearAllTimers()
    
    // Reset all opacities
    setPapa1Opacity(0)
    setPapa2Opacity(0)
    setPapa3Opacity(0)
    
    // Determine stay duration and image based on papaType
    let stayDuration = 1350 // Papa1: 1.35s (10% shorter from 1.5s)
    let imageState = 'papa1'
    
    if (papaType === 1) {
      // Papa1: 1.35s stay (10% shorter from 1.5s)
      setPapa1Opacity(1)
      imageState = 'papa1'
      stayDuration = 1350
    } else if (papaType === 2) {
      // Papa2: 1.8s stay (10% shorter from 2s)
      setPapa2Opacity(1)
      imageState = 'papa2'
      stayDuration = 1800
    } else if (papaType === 3) {
      // Papa3: 2.7s stay (10% shorter from 3s)
      setPapa3Opacity(1)
      imageState = 'papa3'
      stayDuration = 2700
    }
    
    setState(imageState)
    
    // 0-2.7s: Rise up (10% shorter from 3s)
    // Sound: Play shortly after animation starts (at 0.5s)
    const soundTimer = setTimeout(() => {
      playSound()
    }, 500)
    timersRef.current.push(soundTimer)
    
    // Start slide down after stay duration (2.7s rise + stay duration)
    const fallStartTime = 2700 + stayDuration
    const timer3 = setTimeout(() => {
      setState('falling')
      
      // After transition completes, go to hidden
      const timer4 = setTimeout(() => {
        setState('hidden')
        setPapa1Opacity(0)
        setPapa2Opacity(0)
        setPapa3Opacity(0)
      }, 1800) // 1.8s transition duration (10% shorter from 2s)
      timersRef.current.push(timer4)
    }, fallStartTime)
    timersRef.current.push(timer3)
  }
  
  // Handle early dismiss (click/tap)
  const handleDismiss = () => {
    if (state === 'hidden') return
    
    // Clear all timers
    clearAllTimers()
    
    // Reset opacities
    setPapa1Opacity(0)
    setPapa2Opacity(0)
    setPapa3Opacity(0)
    
    // Start slide-down immediately
    setState('falling')
    
    // After transition completes, go to hidden
    const timer = setTimeout(() => {
      setState('hidden')
    }, 1800) // 1.8s transition duration (10% shorter from 2s)
    timersRef.current.push(timer)
  }
  
  // Watch for juice level crossing thresholds (15%, 60%, 90%)
  useEffect(() => {
    // Always update prevFillPctRef (even if already shown) to prevent getting stuck
    const prevFillPct = prevFillPctRef.current
    prevFillPctRef.current = fillPct
    
    // Check if we've already shown this session (SSR-safe)
    if (typeof window === 'undefined') return
    
    // Clear triggered thresholds when score resets (prize claimed)
    // When fillPct goes from > 0 to 0, the prize was claimed and score reset
    if (prevFillPct !== null && prevFillPct > 0 && fillPct === 0) {
      triggeredThresholdsRef.current.clear()
      try {
        sessionStorage.removeItem('papaEasterEggTriggered')
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PapaEasterEgg] sessionStorage clear error:', err)
        }
      }
      return
    }
    
    // Load triggered thresholds from sessionStorage (only if not already loaded)
    if (triggeredThresholdsRef.current.size === 0) {
      try {
        const stored = sessionStorage.getItem('papaEasterEggTriggered')
        if (stored) {
          const thresholds = JSON.parse(stored)
          triggeredThresholdsRef.current = new Set(thresholds)
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PapaEasterEgg] sessionStorage error:', err)
        }
      }
    }
    
    // Check for Papa1 trigger: 15% threshold (upward crossing)
    if (!triggeredThresholdsRef.current.has('15') && prevFillPct !== null && prevFillPct < 0.15 && fillPct >= 0.15) {
      triggeredThresholdsRef.current.add('15')
      try {
        sessionStorage.setItem('papaEasterEggTriggered', JSON.stringify(Array.from(triggeredThresholdsRef.current)))
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PapaEasterEgg] sessionStorage set error:', err)
        }
      }
      startAnimation(1) // Papa1
      return
    }
    
    // Check for Papa2 trigger: 60% threshold (upward crossing)
    if (!triggeredThresholdsRef.current.has('60') && prevFillPct !== null && prevFillPct < 0.60 && fillPct >= 0.60) {
      triggeredThresholdsRef.current.add('60')
      try {
        sessionStorage.setItem('papaEasterEggTriggered', JSON.stringify(Array.from(triggeredThresholdsRef.current)))
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PapaEasterEgg] sessionStorage set error:', err)
        }
      }
      startAnimation(2) // Papa2
      return
    }
    
    // Check for Papa3 trigger: 90% threshold (upward crossing)
    if (!triggeredThresholdsRef.current.has('90') && prevFillPct !== null && prevFillPct < 0.90 && fillPct >= 0.90) {
      triggeredThresholdsRef.current.add('90')
      try {
        sessionStorage.setItem('papaEasterEggTriggered', JSON.stringify(Array.from(triggeredThresholdsRef.current)))
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PapaEasterEgg] sessionStorage set error:', err)
        }
      }
      startAnimation(3) // Papa3
      return
    }
  }, [fillPct])
  
  // Preload all images
  useEffect(() => {
    if (imagesLoadedRef.current) return
    
    let loadedCount = 0
    const totalImages = 3
    
    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === totalImages) {
        imagesLoadedRef.current = true
      }
    }
    
    // Preload Papa1
    papa1ImgRef.current = new Image()
    papa1ImgRef.current.onload = checkAllLoaded
    papa1ImgRef.current.onerror = checkAllLoaded
    papa1ImgRef.current.src = '/assets/images/Papa1.png'
    
    // Preload Papa2
    papa2ImgRef.current = new Image()
    papa2ImgRef.current.onload = checkAllLoaded
    papa2ImgRef.current.onerror = checkAllLoaded
    papa2ImgRef.current.src = '/assets/images/Papa2.png'
    
    // Preload Papa3
    papa3ImgRef.current = new Image()
    papa3ImgRef.current.onload = checkAllLoaded
    papa3ImgRef.current.onerror = checkAllLoaded
    papa3ImgRef.current.src = '/assets/images/Papa3.png'
  }, [])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [])
  
  
  // Get transform based on state (base Y position) - using translate3d for GPU acceleration
  const getTransform = () => {
    switch (state) {
      case 'hidden':
        return 'translate3d(0, 450px, 0)'
      case 'falling':
        return 'translate3d(0, 450px, 0)'
      case 'papa1':
      case 'papa2':
      case 'papa3':
        return 'translate3d(-34px, -30px, 0)'  // 2px more to the left
      default:
        return 'translate3d(0, 450px, 0)'
    }
  }
  
  // Get transition duration and easing based on state
  const getTransitionStyle = () => {
    if (state === 'papa1' || state === 'papa2' || state === 'papa3') {
      // Rise: smooth ease-out (applies when transitioning from hidden to any papa state)
      // 10% shorter: 2.7s (was 3s)
      return {
        duration: '2.7s',
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
    if (state === 'falling') {
      // Fall: snappy ease-in
      // 10% shorter: 1.8s (was 2s)
      return {
        duration: '1.8s',
        easing: 'cubic-bezier(0.7, 0, 0.84, 0)'
      }
    }
    // Instant for state changes that don't involve movement
    return {
      duration: '0s',
      easing: 'ease'
    }
  }
  
  // Check if rage shake should be active (only for Papa3)
  const isRaging = state === 'papa3'
  
  return (
    <>
      <style>{`
        @keyframes vibrate {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          10% { transform: translate3d(-2px, 1px, 0) rotate(-0.5deg); }
          20% { transform: translate3d(2px, -1px, 0) rotate(0.5deg); }
          30% { transform: translate3d(-2px, -1px, 0) rotate(-0.5deg); }
          40% { transform: translate3d(2px, 1px, 0) rotate(0.5deg); }
          50% { transform: translate3d(-1px, 0, 0) rotate(-0.3deg); }
          60% { transform: translate3d(1px, 0, 0) rotate(0.3deg); }
          70% { transform: translate3d(-2px, 1px, 0) rotate(-0.5deg); }
          80% { transform: translate3d(2px, -1px, 0) rotate(0.5deg); }
          90% { transform: translate3d(-1px, 0, 0) rotate(-0.3deg); }
        }
        
        .papa-easter-egg-wrapper {
          position: fixed;
          left: 30px;
          bottom: 0;
          z-index: 10001; /* Above taskbar at 10000, below open windows when active */
          height: 300px;
          width: auto;
          will-change: transform;
        }
        
        .papa-easter-egg-shake-wrapper {
          position: relative;
          height: 100%;
          width: 100%;
          will-change: transform;
        }
        
        .papa-easter-egg-shake-wrapper.raging {
          animation: vibrate 0.1s infinite;
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
        
      `}</style>
      
      <div
        className="papa-easter-egg-wrapper"
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
        <div className={`papa-easter-egg-shake-wrapper ${isRaging ? 'raging' : ''}`}>
          <div className="papa-easter-egg-inner">
            {/* All three images stacked, opacity controlled for smooth crossfade */}
            <img
              src="/assets/images/Papa1.png"
              alt="Papa"
              draggable="false"
              className="papa1"
              style={{ opacity: papa1Opacity }}
              onError={(e) => {
                console.error('[PapaEasterEgg] Failed to load Papa1.png', e)
              }}
            />
            <img
              src="/assets/images/Papa2.png"
              alt=""
              draggable="false"
              className="papa2"
              style={{ opacity: papa2Opacity }}
              aria-hidden="true"
              onError={(e) => {
                console.error('[PapaEasterEgg] Failed to load Papa2.png', e)
              }}
            />
            <img
              src="/assets/images/Papa3.png"
              alt=""
              draggable="false"
              className="papa3"
              style={{ opacity: papa3Opacity }}
              aria-hidden="true"
              onError={(e) => {
                console.error('[PapaEasterEgg] Failed to load Papa3.png', e)
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Preload audio */}
      <audio
        ref={audioRef}
        src="/assets/audio/grunt.mp3"
        preload="auto"
      />
    </>
  )
}

