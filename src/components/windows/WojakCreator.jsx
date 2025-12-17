import Window from './Window'
import { useMemeGenerator } from '../../hooks/useMemeGenerator'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import { getAllLayerImages } from '../../lib/memeImageManifest'
import MemeCanvas from '../meme/MemeCanvas'
import LayerSelector from '../meme/LayerSelector'
import ExportControls from '../meme/ExportControls'
import MobileTraitBottomSheet from '../meme/MobileTraitBottomSheet'
import { useTraitPanelFocus } from '../../hooks/useGlobalKeyboard'
import { useGlobalKeyboardNavigation, useTraitListNavigation } from '../../hooks/useGlobalKeyboardNavigation'
import { useEffect, useState, useRef, useCallback } from 'react'

export default function WojakCreator({ onClose }) {
  const {
    selectedLayers,
    selectLayer,
    canvasRef,
    disabledLayers
  } = useMemeGenerator()
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
  const traitPanelRef = useRef(null)

  // Randomize all traits function
  const handleRandomize = useCallback(() => {
    UI_LAYER_ORDER.forEach(layer => {
      // Skip disabled layers
      if (disabledLayers.includes(layer.name)) {
        return
      }

      const images = getAllLayerImages(layer.name)
      if (images.length > 0) {
        // Filter out "None" and invalid options
        const validImages = images.filter(img => 
          img.path && 
          !img.path.toLowerCase().includes('none') &&
          !img.displayName.toLowerCase().includes('none') &&
          img.path.trim() !== ''
        )
        
        if (validImages.length > 0) {
          const randomImage = validImages[Math.floor(Math.random() * validImages.length)]
          selectLayer(layer.name, randomImage.path)
        }
      }
    })
  }, [selectLayer, disabledLayers])
  
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
    // Desktop: wider window (1200px), mobile/tablet: narrower
    const isDesktop = window.innerWidth >= 1025
    const windowWidth = isDesktop ? Math.min(1200, window.innerWidth - 40) : Math.min(1000, window.innerWidth - 40)
    const windowHeight = Math.min(800, window.innerHeight - 100)
    const left = Math.max(20, (window.innerWidth - windowWidth) / 2)
    const top = Math.max(20, (window.innerHeight - windowHeight) / 2)
    return { left: Math.round(left), top: Math.round(top) }
  }

  const centeredPos = getCenteredPosition()

  // Center window after mount (fallback in case initial style doesn't apply)
  useEffect(() => {
    const win = document.getElementById('wojak-creator')
    if (!win) return

    const rect = win.getBoundingClientRect()
    const currentLeft = rect.left
    const currentTop = rect.top
    
    // Only center if window is at default position (top-left corner)
    if (currentLeft <= 40 && currentTop <= 40) {
      const windowWidth = rect.width || Math.min(1000, window.innerWidth - 40)
      const windowHeight = rect.height || Math.min(800, window.innerHeight - 100)
      const left = Math.max(20, (window.innerWidth - windowWidth) / 2)
      const top = Math.max(20, (window.innerHeight - windowHeight) / 2)
      
      win.style.left = `${Math.round(left)}px`
      win.style.top = `${Math.round(top)}px`
    }
  }, [])

  // Mobile-first layout: Canvas fills screen, controls in bottom sheet
  if (isMobile) {
    return (
      <>
        <Window
          id="wojak-creator"
          title="WOJAK_CREATOR.EXE"
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
          className="wojak-creator-window wojak-creator-mobile"
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
            {/* Minimal header area (just title bar) */}
            <div style={{ 
              flexShrink: 0,
              height: 'var(--window-title-bar-height)',
              minHeight: 'var(--window-title-bar-height)',
            }} />
            
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
      id="wojak-creator"
      title="WOJAK_CREATOR.EXE"
      noStack={true}
      onClose={onClose}
      style={{ 
        width: '1200px',
        height: 'auto',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: '90dvh',
        left: `${centeredPos.left}px`,
        top: `${centeredPos.top}px`,
        position: 'absolute',
      }}
      className="wojak-creator-window"
    >
      <div className="meme-generator-container meme-generator-desktop">
        {/* Left side: Controls (Trait Selectors) */}
        <div 
          className="meme-generator-controls"
          ref={combinedPanelRef}
          tabIndex={-1}
        >
          <p className="panel-label">Select Layers:</p>
          <div className="trait-selectors-scroll">
            {UI_LAYER_ORDER.map((layer, index) => (
              <LayerSelector
                key={layer.name}
                layerName={layer.name}
                onSelect={selectLayer}
                selectedValue={selectedLayers[layer.name]}
                disabled={disabledLayers.includes(layer.name)}
                selectedLayers={selectedLayers}
                navigation={traitNavigation}
                traitIndex={index}
              />
            ))}
          </div>
        </div>

        {/* Right side: Generator Preview */}
        <div className="meme-generator-preview">
          <p className="panel-label">Meme Preview:</p>
          <MemeCanvas canvasRef={canvasRef} width={400} height={400} />
          <div className="export-controls-wrapper">
            <ExportControls canvasRef={canvasRef} selectedLayers={selectedLayers} />
          </div>
        </div>
      </div>

      <div style={{ 
        margin: '0',
        padding: '12px',
        backgroundColor: '#f0f0f0', 
        borderTop: '1px inset #c0c0c0',
        fontSize: '11px',
        lineHeight: '1.4',
        flexShrink: 0
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '12px' }}>
          Custom Wojak Minting Coming Soon
        </p>
        <p style={{ margin: '0', color: '#000000' }}>
          Create your custom Wojak meme by selecting layers. Export as PNG or copy to clipboard. 
          <strong> Custom Wojak NFT will be available after the initial collection mints out.</strong> Some proceeds from custom Wojak mints will be reinvested back into the collection to support the community.
        </p>
      </div>
    </Window>
  )
}

