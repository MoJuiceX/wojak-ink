import Window from './Window'
import { useState, useEffect, useRef } from 'react'
import { useOrangeGame } from '../../contexts/OrangeGameContext'
import { usePreloadImages } from '../../hooks/usePreloadImages'

/**
 * SHIP_MODE: Safety switch to prevent banner glitches in production
 * When true, forces banner to always show base1.png (bypasses progression)
 */
const SHIP_MODE = false // Set to false to enable banner progression based on smashed oranges

/**
 * Get the base overlay stage (1-4) based on smashed count
 * @param {number} smashed - Current smashed count
 * @returns {number} Base overlay stage (1-4)
 */
function getBaseStage(smashed) {
  // SHIP_MODE: Always return stage 1 if SHIP_MODE is enabled (production-safe fallback)
  if (SHIP_MODE) {
    return 1
  }
  
  // Thresholds for goal of 1000 (evenly spaced)
  // 0-249 → stage 1, 250-499 → stage 2, 500-749 → stage 3, 750+ → stage 4
  if (smashed < 250) {
    return 1
  } else if (smashed < 500) {
    return 2
  } else if (smashed < 750) {
    return 3
  } else {
    return 4 // 750+ shows stage 4
  }
}

/**
 * Get the base overlay image path
 * @param {number} stage - Base overlay stage (1-4)
 * @returns {string} Base overlay image path
 */
function getBasePath(stage) {
  return `/assets/images/banners/base${stage}.png`
}

const CONSTANT_BANNER_PATH = '/assets/images/banners/NEWconstantbanner1.png'
const BANNER_IMAGES = [
  CONSTANT_BANNER_PATH,
  getBasePath(1),
  getBasePath(2),
  getBasePath(3),
  getBasePath(4),
]

/**
 * BannerComposite component with double-buffer crossfade
 */
function BannerComposite({ smashed, onReset }) {
  const [currentStage, setCurrentStage] = useState(1)
  const [nextStage, setNextStage] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [nextOpacity, setNextOpacity] = useState(0)
  const transitionTimerRef = useRef(null)
  const lastStageChangeRef = useRef(0)
  const transitionCooldownRef = useRef(false)
  
  // Preload all banner images on mount
  const imagesPreloaded = usePreloadImages(BANNER_IMAGES)
  
  // Fixed banner height to prevent layout shift
  const [bannerHeight, setBannerHeight] = useState(200)
  
  // Calculate target stage with throttling
  // Use useMemo to ensure it recalculates when smashed changes
  const targetStage = (() => {
    const stage = getBaseStage(smashed)
    
    // Throttle: ignore stage changes during transition cooldown
    if (transitionCooldownRef.current) {
      return currentStage
    }
    
    // Only change if stage actually changed
    if (stage !== currentStage && !isTransitioning) {
      return stage
    }
    
    return currentStage
  })()
  
  // Debug: log when smashed changes
  useEffect(() => {
    const stage = getBaseStage(smashed)
    console.log('[BannerComposite] Smashed count changed:', { smashed, calculatedStage: stage, currentStage })
  }, [smashed, currentStage])

  // Handle stage transitions with double-buffer crossfade
  useEffect(() => {
    // Skip if already showing target or if images aren't preloaded
    if (targetStage === currentStage || !imagesPreloaded) {
      return
    }
    
    // Skip if already transitioning
    if (isTransitioning) {
      return
    }
    
    console.log('[BannerComposite] Stage changing:', {
      smashed,
      from: currentStage,
      to: targetStage
    })
    
    // Cancel any pending transition
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    
    // Set next stage and prepare for crossfade
    setNextStage(targetStage)
    setNextOpacity(0)
    setIsTransitioning(true)
    transitionCooldownRef.current = true
    lastStageChangeRef.current = Date.now()
    
    // Wait for image to load/decode (should be instant if preloaded)
    const nextImg = new Image()
    nextImg.onload = async () => {
      // Decode if supported
      if (nextImg.decode) {
        try {
          await nextImg.decode()
        } catch (e) {
          // Continue even if decode fails
        }
      }
      
      // Wait for next image to be rendered in DOM (even at opacity 0)
      // This ensures smooth transition without flicker
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Now start the fade-in transition
          setNextOpacity(1) // Fade in next
          
          // After transition completes, commit next as current
            transitionTimerRef.current = setTimeout(() => {
              setCurrentStage(targetStage)
              setNextStage(null)
              setNextOpacity(0)
              setIsTransitioning(false)
              transitionTimerRef.current = null
              
              // Release cooldown after transition
              setTimeout(() => {
                transitionCooldownRef.current = false
              }, 200) // 200ms cooldown after transition
            }, 200) // 200ms crossfade duration
        })
      })
    }
    nextImg.src = getBasePath(targetStage)
    
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
        transitionTimerRef.current = null
      }
    }
  }, [targetStage, currentStage, isTransitioning, smashed, imagesPreloaded])

  // Handle reset to stage 1
  useEffect(() => {
    if (!onReset) return
    
    const handleReset = () => {
      console.log('[BannerComposite] Resetting to stage 1')
      
      // Cancel any ongoing transition
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
        transitionTimerRef.current = null
      }
      
      if (currentStage !== 1) {
        setNextStage(1)
        setNextOpacity(0)
        setIsTransitioning(true)
        transitionCooldownRef.current = true
        
        const nextImg = new Image()
        nextImg.onload = async () => {
          if (nextImg.decode) {
            try {
              await nextImg.decode()
            } catch (e) {
              // Continue
            }
          }
          
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setNextOpacity(1)
              
              transitionTimerRef.current = setTimeout(() => {
                setCurrentStage(1)
                setNextStage(null)
                setNextOpacity(0)
                setIsTransitioning(false)
                transitionTimerRef.current = null
                
                setTimeout(() => {
                  transitionCooldownRef.current = false
                }, 200)
              }, 200) // 200ms crossfade duration
            })
          })
        }
        nextImg.src = getBasePath(1)
      }
    }
    
    window.addEventListener('orange-game-reset', handleReset)
    return () => {
      window.removeEventListener('orange-game-reset', handleReset)
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
    }
  }, [currentStage, onReset])

  const currentPath = getBasePath(currentStage)
  const nextPath = nextStage ? getBasePath(nextStage) : null

  return (
    <div 
      className="banner" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: `${bannerHeight}px`, // Fixed height to prevent layout shift
        overflow: 'hidden',
        backgroundColor: '#c0c0c0',
        isolation: 'isolate', // Create new stacking context for smoother transitions
      }}
    >
      {/* Layer A: Constant background banner (always visible) */}
      <img
        src={CONSTANT_BANNER_PATH}
        alt="Wojak Farmers Plot banner background"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          zIndex: 1,
          imageRendering: 'auto',
        }}
        onLoad={(e) => {
          // Set container height based on image's natural height (maintain aspect ratio)
          const img = e.target
          if (img.naturalHeight > 0) {
            const aspectRatio = img.naturalWidth / img.naturalHeight
            const containerWidth = img.offsetWidth || 800
            const calculatedHeight = containerWidth / aspectRatio
            setBannerHeight(calculatedHeight)
          }
        }}
        onError={(e) => {
          console.error('[BannerComposite] Failed to load constant banner:', CONSTANT_BANNER_PATH)
        }}
      />
      
      {/* Layer B: Current base overlay (always rendered) */}
      <img
        src={currentPath}
        alt="Wojak Farmers Plot banner overlay"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: isTransitioning ? 0 : 1,
          transition: isTransitioning ? 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          zIndex: 3,
          imageRendering: 'auto',
          filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.25))',
          willChange: isTransitioning ? 'opacity' : 'auto',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        onError={(e) => {
          console.warn(`[BannerComposite] Failed to load current overlay: ${currentPath}, falling back to base1`)
          const base1Path = getBasePath(1)
          if (currentStage !== 1) {
            e.target.src = base1Path
            setCurrentStage(1)
          }
        }}
      />
      
      {/* Layer C: Next base overlay (during transition) - double-buffer */}
      {/* Always render next image when transitioning, even at opacity 0, to ensure it's ready */}
      {isTransitioning && nextPath && (
        <img
          src={nextPath}
          alt="Wojak Farmers Plot banner overlay"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: nextOpacity,
            transition: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 4, // Always above current during transition
            imageRendering: 'auto',
            filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.25))',
            willChange: 'opacity',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          onError={(e) => {
            console.warn(`[BannerComposite] Failed to load next overlay: ${nextPath}, falling back to base1`)
            const base1Path = getBasePath(1)
            if (nextStage !== 1) {
              e.target.src = base1Path
              setNextStage(1)
            }
          }}
        />
      )}
    </div>
  )
}

export default function ReadmeWindow() {
  const { smashed } = useOrangeGame()

  return (
    <Window
      title="README.TXT"
      style={{ 
        width: 'var(--window-size-readme)', 
        maxWidth: 'var(--window-max-width)',
        minWidth: 'var(--window-min-width)'
      }}
      className="readme-window"
      allowScroll={true}
    >
      <BannerComposite smashed={smashed} />

      <p>
        <b>Wojak Farmers Plot — Art for the Grove 🍊</b>
      </p>
      <p>
        Wojak Farmers Plot is my personal contribution to TangGang culture — a
        collection built from my journey inside this community. These NFTs are
        handcrafted one by one, made with intention, humour, and a lot of love
        for the culture we're all building together.
      </p>

      <p>
        The art explores many different sides of crypto culture. Some pieces are
        playful, some are more cyberpunk, some are pure meme energy — but every
        single NFT tells a story. And they're meant to be used. Meme them.
        Screenshot them. Right-click save them. That's the point. Memes are
        cultural weapons, and this collection gives the community more tools to
        express this. This is my way of adding to the lore of the TangGang.
      </p>

      <p>
        <b>The goal is simple:</b>
        <br />
        Create art, share it with the gang, and bring it back to the grove. This
        is how we build user aligned incentives.
      </p>

      <ul>
        <li>
          <b>Supply:</b> 4200
        </li>
        <li>
          <b>Chain:</b>{' '}
          <a href="https://www.chia.net/" target="_blank" rel="noreferrer">
            Chia.net
          </a>
        </li>
        <li>
          <b>Mint:</b> Friday Dec 19th, 2025
        </li>
      </ul>

      <hr />

      <p>
        <b>Marketplace</b>
      </p>
      <p>
        View the collection on Crate:
        <a
          href="https://wojakfarmersplot.crate.ink/#/"
          target="_blank"
          rel="noreferrer"
        >
          https://wojakfarmersplot.crate.ink/#/
        </a>
      </p>

      <p>
        <b>X / Twitter</b>
      </p>
      <p>
        Follow updates here:
        <a href="https://x.com/MoJuiceX" target="_blank" rel="noreferrer">
          https://x.com/MoJuiceX
        </a>
      </p>

      <hr />
    </Window>
  )
}

