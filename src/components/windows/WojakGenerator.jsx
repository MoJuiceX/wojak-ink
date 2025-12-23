import Window from './Window'
import { useMemeGenerator } from '../../hooks/useMemeGenerator'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import MemeCanvas from '../meme/MemeCanvas'
import LayerSelector from '../meme/LayerSelector'
import ExportControls from '../meme/ExportControls'
import MobileTraitBottomSheet from '../meme/MobileTraitBottomSheet'
import { useTraitPanelFocus } from '../../hooks/useGlobalKeyboard'
import { useGlobalKeyboardNavigation, useTraitListNavigation } from '../../hooks/useGlobalKeyboardNavigation'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'

// Custom order for generator dropdowns (different from render order)
const GENERATOR_LAYER_ORDER = ['Head','Eyes','Base','MouthBase','MouthItem','FacialHair','Mask','Clothes','Background']

export default function WojakGenerator({ onClose }) {
  const {
    selectedLayers,
    selectLayer,
    canvasRef,
    disabledLayers,
    randomizeAllLayers
  } = useMemeGenerator()
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
  const traitPanelRef = useRef(null)
  const didCenterRef = useRef(false)

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
    // Desktop: use conservative default (920px) for initial positioning only
    const isDesktop = window.innerWidth >= 1025
    const windowWidth = isDesktop ? Math.min(920, window.innerWidth - 40) : Math.min(1000, window.innerWidth - 40)
    const windowHeight = Math.min(800, window.innerHeight - 100)
    const left = Math.max(20, (window.innerWidth - windowWidth) / 2)
    const top = Math.max(20, (window.innerHeight - windowHeight) / 2)
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
      const top = Math.max(20, (window.innerHeight - rect.height) / 2)

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
        />
      </>
    )
  }

  // Desktop layout: Side-by-side canvas and controls
  return (
    <Window
      id="wojak-generator"
      title="WOJAK_GENERATOR.EXE"
      noStack={true}
      onClose={onClose}
      style={{ 
        width: '920px',
        minWidth: 0,
        height: 'auto',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: '90dvh',
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
        </div>

        {/* Right side: Generator Preview */}
        <div className="meme-generator-preview">
          <div className="meme-generator-preview-canvas-wrapper">
            <MemeCanvas canvasRef={canvasRef} width={560} height={560} />
          </div>
          <div className="export-controls-wrapper export-controls-preview">
            <ExportControls canvasRef={canvasRef} selectedLayers={selectedLayers} onRandomize={randomizeAllLayers} />
          </div>
        </div>
      </div>

      <div className="wojak-generator-status-bar">
        Custom Wojak Minting Coming Soon — Create your custom Wojak meme by selecting layers. Export as PNG or copy to clipboard.
      </div>
    </Window>
  )
}

