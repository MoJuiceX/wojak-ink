import Window from './Window'
import { useMemeGenerator } from '../../hooks/useMemeGenerator'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import MemeCanvas from '../meme/MemeCanvas'
import LayerSelector from '../meme/LayerSelector'
import ExportControls from '../meme/ExportControls'
import MobileTraitBottomSheet from '../meme/MobileTraitBottomSheet'
import { useTraitPanelFocus } from '../../hooks/useGlobalKeyboard'
import { useGlobalKeyboardNavigation, useTraitListNavigation } from '../../hooks/useGlobalKeyboardNavigation'
import { useToast } from '../../contexts/ToastContext'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'

// Custom order for generator dropdowns (different from render order)
const GENERATOR_LAYER_ORDER = ['Head','Eyes','Base','MouthBase','MouthItem','FacialHair','Mask','Clothes','Background']

export default function WojakGenerator({ onClose, onAddDesktopImage, desktopImages = [] }) {
  const {
    selectedLayers,
    selectLayer,
    canvasRef,
    disabledLayers,
    randomizeAllLayers,
    isRendering
  } = useMemeGenerator()
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
  const traitPanelRef = useRef(null)
  const didCenterRef = useRef(false)
  
  // Tangify state (lifted from ExportControls to share with MemeCanvas)
  const [tangifiedImage, setTangifiedImage] = useState(null)
  const [showTangified, setShowTangified] = useState(false)
  
  // Session Gallery state
  const [sessionGallery, setSessionGallery] = useState([])
  const { showToast } = useToast()
  const GALLERY_MAX_ENTRIES = 20
  const GALLERY_WARNING_THRESHOLD = 18
  
  // README window state
  const [showReadme, setShowReadme] = useState(false)
  
  // Welcome modal state with version tracking
  const WELCOME_VERSION = '1.0'
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem('wojak-welcome-version') !== WELCOME_VERSION
  })
  const startButtonRef = useRef(null)
  
  const dismissWelcome = useCallback(() => {
    setShowWelcome(false)
    localStorage.setItem('wojak-welcome-version', WELCOME_VERSION)
  }, [])
  
  const handleToggleView = useCallback(() => {
    setShowTangified(prev => !prev)
  }, [])
  
  // Gallery management functions
  const addToGallery = useCallback((entry) => {
    setSessionGallery(prev => {
      const newGallery = [...prev, entry]
      // Track blob URL if it's a blob URL (shouldn't happen, but safety)
      if (entry.cyberTangImage && entry.cyberTangImage.startsWith('blob:')) {
        blobUrlRef.current.add(entry.cyberTangImage)
      }
      // Remove oldest entries if over limit (includes placeholders)
      // This ensures concurrency works correctly - placeholders count toward limit
      while (newGallery.length > GALLERY_MAX_ENTRIES) {
        const removed = newGallery.shift() // Remove oldest
        // Cleanup any blob URLs if they exist (shouldn't, but safety check)
        if (removed.cyberTangImage && removed.cyberTangImage.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(removed.cyberTangImage)
            blobUrlRef.current.delete(removed.cyberTangImage)
          } catch (e) {
            // Ignore errors
          }
        }
      }
      // Show warning when approaching limit
      if (newGallery.length >= GALLERY_WARNING_THRESHOLD) {
        showToast(
          `Gallery is getting full (${newGallery.length}/${GALLERY_MAX_ENTRIES}). Oldest entries will be removed.`,
          'warning',
          4000
        )
      }
      return newGallery
    })
  }, [showToast])
  
  const updateGalleryEntry = useCallback((id, updates) => {
    setSessionGallery(prev => 
      prev.map(entry => {
        if (entry.id === id) {
          // Cleanup old blob URL if being replaced
          if (updates.cyberTangImage && entry.cyberTangImage && 
              entry.cyberTangImage.startsWith('blob:') && 
              entry.cyberTangImage !== updates.cyberTangImage) {
            try {
              URL.revokeObjectURL(entry.cyberTangImage)
              blobUrlRef.current.delete(entry.cyberTangImage)
            } catch (e) {
              // Ignore errors
            }
          }
          // Track new blob URL if it's a blob URL
          if (updates.cyberTangImage && updates.cyberTangImage.startsWith('blob:')) {
            blobUrlRef.current.add(updates.cyberTangImage)
          }
          return { ...entry, ...updates }
        }
        return entry
      })
    )
  }, [])
  
  const removeGalleryEntry = useCallback((id) => {
    setSessionGallery(prev => {
      const entry = prev.find(e => e.id === id)
      // Cleanup blob URL if exists
      if (entry && entry.cyberTangImage && entry.cyberTangImage.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(entry.cyberTangImage)
          blobUrlRef.current.delete(entry.cyberTangImage)
        } catch (e) {
          // Ignore errors
        }
      }
      return prev.filter(e => e.id !== id)
    })
  }, [])
  
  const clearGallery = useCallback(() => {
    if (window.confirm('Clear all entries from Session Gallery?')) {
      setSessionGallery(prev => {
        // Cleanup all blob URLs before clearing
        prev.forEach(entry => {
          if (entry.cyberTangImage && entry.cyberTangImage.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(entry.cyberTangImage)
              blobUrlRef.current.delete(entry.cyberTangImage)
            } catch (e) {
              // Ignore errors
            }
          }
        })
        return []
      })
      showToast('Gallery cleared', 'info', 2000)
    }
  }, [showToast])
  
  // Track blob URLs for cleanup on unmount
  const blobUrlRef = useRef(new Set())
  
  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup all tracked blob URLs when component unmounts
      blobUrlRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url)
        } catch (e) {
          // Ignore errors
        }
      })
      blobUrlRef.current.clear()
    }
  }, [])

  // Use generator hook's randomize to avoid divergent logic.
  const handleRandomize = useCallback(() => {
    randomizeAllLayers()
  }, [randomizeAllLayers])
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Focus management for trait panel
  const { isFocused, panelRef } = useTraitPanelFocus()
  const combinedPanelRef = (node) => {
    traitPanelRef.current = node
    if (typeof panelRef === 'function') {
      panelRef(node)
    } else if (panelRef) {
      panelRef.current = node
    }
  }

  // Trait list navigation
  const traitNavigation = useTraitListNavigation()

  // Build reordered layer array for generator UI
  const generatorLayerOrder = useMemo(() => {
    // Create a map of layer name to layer object from UI_LAYER_ORDER
    const layerMap = new Map(UI_LAYER_ORDER.map(layer => [layer.name, layer]))
    
    // Build ordered array based on GENERATOR_LAYER_ORDER
    const ordered = GENERATOR_LAYER_ORDER
      .map(name => layerMap.get(name))
      .filter(Boolean) // Filter out any missing ones (defensive)
    
    // Append any remaining UI_LAYER_ORDER layers not in GENERATOR_LAYER_ORDER at the end (optional safety)
    const remaining = UI_LAYER_ORDER.filter(layer => !GENERATOR_LAYER_ORDER.includes(layer.name))
    
    return [...ordered, ...remaining]
  }, [])

  // Global keyboard navigation
  useGlobalKeyboardNavigation({
    isTraitPanelActive: isFocused || isBottomSheetExpanded,
    isModalOpen: false, // Add modal state if needed
    isBottomSheetOpen: isBottomSheetExpanded,
    onTraitNavigation: (direction) => {
      if (direction === 'up' || direction === 'down') {
        traitNavigation.navigateTraits(direction)
      }
    },
    onTraitSelect: () => {
      traitNavigation.selectFocusedOption((layerName, value) => {
        selectLayer(layerName, value)
      })
    },
    onCloseBottomSheet: () => {
      setIsBottomSheetExpanded(false)
    },
    onCloseModal: () => {
      // Handle modal close if needed
    },
  })

  // Calculate centered position for initial render
  const getCenteredPosition = () => {
    // This is only for initial inline style; real centering happens after mount.
    // Keep conservative defaults to avoid off-screen flash.
    // Desktop: use conservative default (950px) for initial positioning only
    const isDesktop = window.innerWidth >= 1025
    const windowWidth = isDesktop ? Math.min(950, window.innerWidth - 40) : Math.min(950, window.innerWidth - 40)
    const windowHeight = Math.min(720, window.innerHeight - 120) // Reduced from 850 to 720 to make window tighter
    const left = Math.max(20, (window.innerWidth - windowWidth) / 2)
    const top = Math.max(40, (window.innerHeight - windowHeight) / 2 - 20) // Move up 20px from center
    return { left: Math.round(left), top: Math.round(top) }
  }

  const centeredPos = getCenteredPosition()

  // Center window after mount (measure actual DOM dimensions and center based on that)
  // Only once per open to avoid fighting user dragging.
  useEffect(() => {
    if (didCenterRef.current) return

    const el = document.getElementById('wojak-generator')
    if (!el) return

    // Defer 1 frame so Window has applied layout + fonts
    const raf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const left = Math.max(20, (window.innerWidth - rect.width) / 2)
      const top = Math.max(40, (window.innerHeight - rect.height) / 2 - 40) // Move up 40px from center (was 20px) to avoid taskbar, min 40px from top

      // Only auto-center if the element is still near the inline initial position.
      // If user already dragged it, don't override.
      const deltaX = Math.abs(rect.left - centeredPos.left)
      const deltaY = Math.abs(rect.top - centeredPos.top)
      const userLikelyMoved = deltaX > 8 || deltaY > 8
      if (userLikelyMoved) return

      el.style.left = `${Math.round(left)}px`
      el.style.top = `${Math.round(top)}px`
      didCenterRef.current = true
    })

    return () => cancelAnimationFrame(raf)
  }, [])

  // Mobile-first layout: Canvas fills screen, controls in bottom sheet
  if (isMobile) {
    return (
      <>
        <Window
          id="wojak-generator"
          title="WOJAK_GENERATOR.EXE"
          noStack={true}
          onClose={onClose}
          style={{ 
            width: '100vw',
            height: '100dvh',
            maxWidth: '100vw',
            maxHeight: '100dvh',
            left: '0',
            top: '0',
            position: 'fixed',
            zIndex: 10000,
          }}
          className="wojak-generator-window wojak-generator-mobile"
        >
          {/* Mobile: Canvas fills screen */}
          <div className="meme-generator-mobile" style={{ 
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            padding: 0,
            margin: 0,
          }}>
            {/* Canvas fills remaining space */}
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
              overflow: 'hidden',
              padding: 'var(--spacing-md)',
              paddingBottom: 'calc(var(--spacing-md) + var(--mobile-sheet-collapsed-height, calc(140px + var(--safe-area-inset-bottom))))', /* Space for collapsed bottom sheet + safe area */
            }}>
              <MemeCanvas 
                canvasRef={canvasRef} 
                width={Math.min(400, window.innerWidth - 32)} 
                height={Math.min(400, window.innerHeight - 240)}
                tangifiedImage={tangifiedImage}
                showTangified={showTangified}
                onToggleView={handleToggleView}
                isRendering={isRendering}
              />
            </div>
          </div>
        </Window>
        
        {/* Mobile Bottom Sheet with Export Controls */}
        <MobileTraitBottomSheet
          selectedLayers={selectedLayers}
          selectLayer={selectLayer}
          disabledLayers={disabledLayers}
          isExpanded={isBottomSheetExpanded}
          onExpandedChange={setIsBottomSheetExpanded}
          canvasRef={canvasRef}
          onRandomize={handleRandomize}
          tangifiedImage={tangifiedImage}
          setTangifiedImage={setTangifiedImage}
          showTangified={showTangified}
          setShowTangified={setShowTangified}
          onAddToGallery={addToGallery}
          onUpdateGalleryEntry={updateGalleryEntry}
          onRemoveGalleryEntry={removeGalleryEntry}
          onAddDesktopImage={onAddDesktopImage}
          desktopImages={desktopImages}
        />
      </>
    )
  }

  // Desktop layout: Side-by-side canvas and controls
  
  // Keyboard support for welcome modal (ESC to close)
  useEffect(() => {
    if (!showWelcome) return
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dismissWelcome()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showWelcome, dismissWelcome])
  
  // Auto-focus welcome modal button when it opens
  useEffect(() => {
    if (showWelcome && startButtonRef.current) {
      startButtonRef.current.focus()
    }
  }, [showWelcome])
  
  return (
    <>
      <Window
        id="wojak-generator"
        title="WOJAK_GENERATOR.EXE"
        noStack={true}
        onClose={onClose}
        style={{ 
          width: '950px', // Reduced from 1000px to reduce wasted space
          minWidth: 0,
          height: 'auto',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100dvh - 100px)', // More space from bottom
          minHeight: '720px', // Reduced from 750px to make window tighter
          left: `${centeredPos.left}px`,
          top: `${centeredPos.top}px`,
          position: 'absolute',
        }}
        className="wojak-generator-window"
      >
        <div className="meme-generator-container meme-generator-desktop">
          {/* Left side: Controls (Trait Selectors) */}
          <div 
            className="meme-generator-controls"
            ref={combinedPanelRef}
            tabIndex={-1}
          >
            <div className="trait-selectors-scroll">
              {/* Flat list (no HEAD/FACE/BODY categories) */}
              {generatorLayerOrder.map((layer) => {
                const originalIndex = generatorLayerOrder.findIndex(l => l.name === layer.name)
                const hasVariants = layer.name === 'Head' || layer.name === 'Eyes' || layer.name === 'Clothes'

                return (
                  <div
                    key={layer.name}
                    className={`trait-row ${hasVariants ? 'has-variants' : ''}`}
                  >
                    <LayerSelector
                      layerName={layer.name}
                      onSelect={selectLayer}
                      selectedValue={selectedLayers[layer.name]}
                      disabled={disabledLayers.includes(layer.name)}
                      selectedLayers={selectedLayers}
                      navigation={traitNavigation}
                      traitIndex={originalIndex}
                      disableTooltip={true}
                    />
                  </div>
                )
              })}
            </div>
            <button 
              className="info-button-bottom win98-tooltip"
              data-tooltip="About Wojak Generator"
              onClick={() => setShowReadme(true)}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="info-icon">ℹ</span>
            </button>
          </div>

          {/* Right side: Generator Preview */}
          <div className="meme-generator-preview">
            <div className="meme-generator-preview-canvas-wrapper">
              <MemeCanvas 
                canvasRef={canvasRef} 
                width={520} 
                height={520}
                tangifiedImage={tangifiedImage}
                showTangified={showTangified}
                onToggleView={handleToggleView}
                isRendering={isRendering}
              />
            </div>
            <div className="export-controls-wrapper export-controls-preview">
              <ExportControls 
                canvasRef={canvasRef} 
                selectedLayers={selectedLayers} 
                onRandomize={randomizeAllLayers}
                tangifiedImage={tangifiedImage}
                setTangifiedImage={setTangifiedImage}
                showTangified={showTangified}
                setShowTangified={setShowTangified}
                onAddToGallery={addToGallery}
                onUpdateGalleryEntry={updateGalleryEntry}
                onRemoveGalleryEntry={removeGalleryEntry}
                onAddDesktopImage={onAddDesktopImage}
                desktopImages={desktopImages}
              />
            </div>
          </div>
        </div>
      </Window>
      
      {/* Welcome Modal */}
      {showWelcome && (
        <div 
          className="welcome-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <div className="welcome-modal">
            <div className="welcome-modal-titlebar">
              <span id="welcome-title">👋 Welcome to Wojak Generator!</span>
              <button 
                onClick={dismissWelcome}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Close welcome modal"
              >
                ✕
              </button>
            </div>
            <div className="welcome-modal-content">
              <h2>🎨 Create Your Own Wojak</h2>
              <p>
                Use the dropdown menus on the left to customize your Wojak's 
                head, eyes, clothes, and more. Mix and match to create the 
                perfect meme character!
              </p>
              
              <h2>⚡ Key Features</h2>
              <ul>
                <li><strong>Randomize</strong> — Generate random trait combinations</li>
                <li><strong>Download</strong> — Save your Wojak as PNG (transparent background!)</li>
                <li><strong>CyberTang</strong> — Transform with AI-powered cyberpunk effects</li>
                <li><strong>Mint</strong> — Coming soon: Mint as NFT on Chia blockchain</li>
              </ul>
              
              <p className="welcome-tip">
                💡 Tip: Your creations save to the desktop automatically!
              </p>
              
              <button 
                ref={startButtonRef}
                className="welcome-start-btn" 
                onClick={dismissWelcome}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Let's Create! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* README Window */}
      {showReadme && (
        <Window 
          id="wojak-readme"
          title="About the Wojak Generator"
          onClose={() => setShowReadme(false)}
          style={{ 
            width: '560px', 
            height: '520px', 
            zIndex: 10000,
            left: '150px',
            top: '40px' // Moved up from 60px
          }}
        >
          <div className="readme-content" style={{ padding: '16px 20px 20px 20px' }}>
            
            <h2>🎨 What is the Wojak Generator?</h2>
            <p>
              The Wojak Generator lets you create your own custom Wojak — the same 
              way I did when I built the 4,200-piece Wojak Farmers Plot collection.
            </p>
            <p>
              For about 4 months straight, I spent up to 14 hours a day picking 
              traits, colors, and combinations one Wojak at a time. I wanted to 
              bring that exact creative experience to the community — so now you 
              can do it too.
            </p>
            <p>
              Pick traits. Experiment. Have fun. <strong>This is what it feels like to be the artist.</strong>
            </p>
            
            <h2>🖼️ Built for Memes</h2>
            <p>
              This tool makes meme creation stupidly easy:
            </p>
            <ul>
              <li>Choose exact traits for your narrative</li>
              <li>Skip backgrounds entirely</li>
              <li>Export a perfectly cut-out Wojak, ready to drop into any meme</li>
            </ul>
            <p>
              No background remover. No extra steps. Just create and post.
            </p>
            
            <h2>🍊 Tang Gang Lore</h2>
            <p>
              The Generator is deeply inspired by Tang Gang and its culture.
            </p>
            <p>
              Traits like the <strong>Military Beret</strong>, <strong>MOG Glasses</strong>, 
              <strong>Ronin fits</strong>, and <strong>Crown</strong> are nods to our 
              shared lore, providence, and community energy. If you know, you know.
            </p>
            <p>
              The original spark came from the World Meme Championship (WMC). I started 
              saving Wojaks on my desktop just to make memes faster… then had a moment of: 
              <em>"Why not turn this into something bigger?"</em>
            </p>
            <p>
              That idea turned into my biggest creative project so far — and seeing the 
              community use these Wojaks as PFPs, memes, and identity has honestly been unreal.
            </p>
            
            <h2>🤖 CyberTang, Gallery & Minting</h2>
            <ul>
              <li>Generate a <strong>CyberTang</strong> → both versions save automatically</li>
              <li>Store up to <strong>20 images</strong> on your desktop (FIFO style)</li>
              <li>Old images move to the Recycle Bin (room for 20 more)</li>
            </ul>
            <p>
              The <strong>Mint button</strong> is currently disabled — but when it goes live, 
              you'll be able to mint your custom Wojak + CyberTang directly as NFTs.
            </p>
            <p className="readme-emphasis">
              No art skills. No coding. No mint credits. Just create → mint → done.
            </p>
            <p>
              This is about creating value for existing holders, Tang Gang, and making it 
              easy to give out NFTs during spaces, events, and future drops.
            </p>
            <p className="readme-teaser">
              More soon 👀
            </p>
            
            <div className="readme-footer">
              Made with 🍊 by MoJuice for the Tang Gang
            </div>
          </div>
        </Window>
      )}
    </>
  )
}

