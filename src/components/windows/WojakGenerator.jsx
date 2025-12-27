import Window from './Window'
import { useMemeGenerator } from '../../hooks/useMemeGenerator'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import MemeCanvas from '../meme/MemeCanvas'
import LayerSelector from '../meme/LayerSelector'
import ExportControls from '../meme/ExportControls'
import MobileTraitBottomSheet from '../meme/MobileTraitBottomSheet'
import { Button } from '../ui'
import { useTraitPanelFocus } from '../../hooks/useGlobalKeyboard'
import { useGlobalKeyboardNavigation, useTraitListNavigation } from '../../hooks/useGlobalKeyboardNavigation'
import { useToast } from '../../contexts/ToastContext'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { copyCanvasToClipboard, downloadCanvasAsPNG, canvasToBlob, blobUrlToDataUrl, compressImage } from '../../utils/imageUtils'
import { generateWojakFilename, buildImageName } from '../../utils/filenameUtils'
import { isDuplicateImage, generatePairId, findExistingOriginalByTraits } from '../../utils/desktopUtils'
import { buildCyberTangPrompt } from '../../utils/tangifyPrompts'
import { playSound } from '../../utils/soundManager'

// Custom order for generator dropdowns (different from render order)
const GENERATOR_LAYER_ORDER = ['Head','Eyes','Base','MouthBase','MouthItem','FacialHair','Mask','Clothes','Background']

export default function WojakGenerator({ onClose, onAddDesktopImage, desktopImages = [], onSaveToFavorites }) {
  const {
    selectedLayers,
    selectLayer,
    canvasRef,
    disabledLayers,
    randomizeAllLayers,
    isRendering,
    undoRandomize,
    canUndo
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
    // History saving happens inside randomizeAllLayers hook
    randomizeAllLayers()
  }, [randomizeAllLayers])

  // Mobile button handlers
  const handleCopy = useCallback(async () => {
    console.log('[Mobile Copy] Handler called', { hasCanvas: !!canvasRef.current })
    if (!canvasRef.current) {
      console.warn('[Mobile Copy] No canvas ref')
      return
    }
    try {
      await copyCanvasToClipboard(canvasRef.current)
      showToast('✅ Copied to clipboard!', 'success', 2000)
    } catch (error) {
      console.error('Copy error:', error)
      showToast('Failed to copy to clipboard', 'error', 3000)
    }
  }, [canvasRef, showToast])
  
  const handleCyberTang = useCallback(async () => {
    // Check if required layers are selected
    const hasBase = selectedLayers['Base'] && selectedLayers['Base'] !== 'None'
    const hasMouthBase = selectedLayers['MouthBase'] && selectedLayers['MouthBase'] !== 'None'
    const hasClothes = selectedLayers['Clothes'] && selectedLayers['Clothes'] !== 'None'
    const canDownload = hasBase && hasMouthBase && hasClothes
    
    if (!canvasRef.current) {
      showToast('⚠️ Canvas not ready. Please wait a moment and try again.', 'warning', 3000)
      return
    }
    
    if (!canDownload) {
      showToast('⚠️ Please select Base, Mouth (Base), and Clothing before creating CyberTang.', 'warning', 4000)
      return
    }
    
    // Start tangify process directly (works on both mobile and desktop)
    try {
      playSound('ding')
      showToast('🎨 Creating CyberTang...', 'info', 2000)
      
      // Capture original canvas
      const canvas = canvasRef.current
      const blob = await canvasToBlob(canvas, 'image/png')
      const originalCanvasDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Failed to read canvas'))
        reader.readAsDataURL(blob)
      })
      
      // Build prompt and send to API
      const prompt = buildCyberTangPrompt(selectedLayers)
      const formData = new FormData()
      formData.append('image', blob, 'wojak.png')
      formData.append('prompt', prompt)
      
      showToast('🤖 AI is transforming your Wojak...', 'info', 3000)
      
      const response = await fetch('/api/tangify', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'CyberTang failed')
      }
      
      const outBlob = await response.blob()
      const url = URL.createObjectURL(outBlob)
      setTangifiedImage(url)
      setShowTangified(true)
      
      // Detect mobile
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
      
      if (isMobile && onSaveToFavorites) {
        // Mobile: Save both original and CyberTang to My Favorite Wojaks
        try {
          const cybertangDataUrl = await blobUrlToDataUrl(url)
          const originalFilename = buildImageName(selectedLayers, 'original')
          const cybertangFilename = buildImageName(selectedLayers, 'cybertang')
          
          // Save original to favorites
          const originalWojak = {
            id: `wojak-original-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: originalFilename,
            dataUrl: originalCanvasDataUrl,
            selectedLayers: { ...selectedLayers },
            type: 'original',
            savedAt: new Date().toISOString()
          }
          await onSaveToFavorites(originalWojak)
          
          // Save CyberTang to favorites
          const cybertangWojak = {
            id: `wojak-cybertang-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: cybertangFilename,
            dataUrl: cybertangDataUrl,
            selectedLayers: { ...selectedLayers },
            type: 'cybertang',
            savedAt: new Date().toISOString()
          }
          await onSaveToFavorites(cybertangWojak)
          
          playSound('tada')
          showToast('✅ CyberTang pair saved to My Favorite Wojaks!', 'success', 3000)
        } catch (error) {
          console.error('Error saving to favorites:', error)
          showToast('✅ CyberTang created! (Save to favorites failed)', 'info', 3000)
        }
      } else if (!isMobile && onAddDesktopImage) {
        // Desktop: Save both original and CyberTang to desktop
        const existingOriginal = findExistingOriginalByTraits(desktopImages, selectedLayers)
        let pairId
        let savedOriginal = false
        
        if (existingOriginal) {
          pairId = existingOriginal.pairId
        } else {
          pairId = generatePairId()
          const originalCompressed = await compressImage(originalCanvasDataUrl).catch(() => originalCanvasDataUrl)
          const originalFilename = buildImageName(selectedLayers, 'original')
          onAddDesktopImage(originalCompressed, originalFilename, 'original', selectedLayers, pairId)
          savedOriginal = true
        }
        
        // Save CyberTang
        const cybertangDataUrl = await blobUrlToDataUrl(url)
        const cybertangCompressed = await compressImage(cybertangDataUrl).catch(() => cybertangDataUrl)
        const cybertangFilename = buildImageName(selectedLayers, 'cybertang')
        onAddDesktopImage(cybertangCompressed, cybertangFilename, 'cybertang', selectedLayers, pairId)
        
        playSound('tada')
        if (savedOriginal) {
          showToast('✅ CyberTang pair saved to desktop!', 'success', 3000)
        } else {
          showToast('✅ CyberTang saved to desktop!', 'success', 3000)
        }
      } else {
        showToast('✅ CyberTang created!', 'success', 3000)
      }
    } catch (error) {
      console.error('CyberTang error:', error)
      showToast(`❌ ${error.message || 'Failed to create CyberTang'}`, 'error', 4000)
    }
  }, [canvasRef, selectedLayers, desktopImages, onAddDesktopImage, showToast, setTangifiedImage, setShowTangified])
  
  const handleShareX = useCallback(async () => {
    console.log('[Mobile ShareX] Handler called', { hasCanvas: !!canvasRef.current })
    if (!canvasRef.current) {
      console.warn('[Mobile ShareX] No canvas ref')
      return
    }
    try {
      await copyCanvasToClipboard(canvasRef.current)
      const tweetText = "Check out my Wojak created with the Wojak Generator @ Wojak.ink 🍊"
      const params = new URLSearchParams({ text: tweetText })
      const twitterUrl = `https://twitter.com/intent/tweet?${params.toString()}`
      showToast('✅ Image copied to clipboard! Opening X...', 'success', 3000)
      window.open(twitterUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Share on X error:', error)
      // Fallback: just open Twitter
      const tweetText = "Check out my Wojak created with the Wojak Generator @ Wojak.ink 🍊"
      const params = new URLSearchParams({ text: tweetText })
      const twitterUrl = `https://twitter.com/intent/tweet?${params.toString()}`
      window.open(twitterUrl, '_blank', 'noopener,noreferrer')
      showToast('Open X and paste your image', 'info', 3000)
    }
  }, [canvasRef, showToast])
  
  // Download handler for mobile
  const handleDownload = useCallback(async () => {
    // Check if download is allowed (Base, MouthBase, Clothes must be selected)
    const hasBase = selectedLayers['Base'] && selectedLayers['Base'] !== 'None'
    const hasMouthBase = selectedLayers['MouthBase'] && selectedLayers['MouthBase'] !== 'None'
    const hasClothes = selectedLayers['Clothes'] && selectedLayers['Clothes'] !== 'None'
    const canDownload = hasBase && hasMouthBase && hasClothes
    
    if (!canvasRef.current || !canDownload) {
      showToast('⚠️ Please select Base, Mouth (Base), and Clothing before downloading.', 'warning', 4000)
      return
    }

    try {
      // Check for duplicate before saving
      if (isDuplicateImage(desktopImages, selectedLayers, 'original')) {
        showToast('ℹ️ This Wojak is already on your desktop', 'info', 3000)
        return
      }

      // Generate filename using buildImageName for desktop storage
      const filename = buildImageName(selectedLayers, 'original')
      // Use generateWojakFilename for actual download
      const downloadFilename = generateWojakFilename({ selectedLayers })
      
      // Capture canvas as data URL before download
      const canvasDataUrl = canvasRef.current.toDataURL('image/png')
      
      // Download the file
      await downloadCanvasAsPNG(canvasRef.current, downloadFilename)
      
      // Add to desktop icons - compress image before storing
      if (onAddDesktopImage) {
        try {
          const compressedDataUrl = await compressImage(canvasDataUrl)
          const pairId = generatePairId()
          onAddDesktopImage(compressedDataUrl, filename, 'original', selectedLayers, pairId)
          showToast('✅ Wojak saved to desktop!', 'success', 3000)
        } catch (error) {
          console.error('Error compressing/saving to desktop:', error)
          // Still show success for download
          showToast('✅ Wojak downloaded!', 'success', 3000)
        }
      } else {
        showToast('✅ Wojak downloaded!', 'success', 3000)
      }
    } catch (error) {
      console.error('Download error:', error)
      showToast('Failed to download image', 'error', 3000)
    }
  }, [canvasRef, selectedLayers, desktopImages, onAddDesktopImage, showToast])
  
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
          onHelpClick={() => setShowReadme(true)}
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
            {/* DevPanel - Test CyberTang button - Mobile */}
            {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <div style={{
                margin: '8px',
                padding: '4px 8px',
                background: 'var(--surface-2)',
                border: '1px solid',
                borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span style={{
                  fontFamily: 'MS Sans Serif, sans-serif',
                  fontSize: '10px',
                  color: 'var(--text-1)',
                  marginRight: '4px',
                }}>
                  Dev:
                </span>
                <Button
                  onClick={() => {
                    // Create a test CyberTang image (colored rectangle for testing)
                    const testCanvas = document.createElement('canvas')
                    testCanvas.width = 500
                    testCanvas.height = 500
                    const ctx = testCanvas.getContext('2d')
                    // Create a test image with gradient
                    const gradient = ctx.createLinearGradient(0, 0, 500, 500)
                    gradient.addColorStop(0, '#ff6600')
                    gradient.addColorStop(1, '#ffaa00')
                    ctx.fillStyle = gradient
                    ctx.fillRect(0, 0, 500, 500)
                    ctx.fillStyle = '#ffffff'
                    ctx.font = '48px Arial'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText('TEST CyberTang', 250, 250)
                    // Convert to blob URL
                    testCanvas.toBlob((blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob)
                        setTangifiedImage(url)
                        setShowTangified(true)
                        showToast('✅ Test CyberTang created!', 'success', 2000)
                      }
                    }, 'image/png')
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                  }}
                >
                  Test CyberTang
                </Button>
              </div>
            )}
            {/* Canvas fills remaining space */}
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
              overflow: 'hidden',
              paddingTop: 'var(--spacing-sm)', /* Reduced top padding to move content higher */
              paddingLeft: 'var(--spacing-md)',
              paddingRight: 'var(--spacing-md)',
              paddingBottom: 'calc(var(--spacing-md) + var(--mobile-sheet-collapsed-height, calc(122px + var(--safe-area-bottom))))', /* Space for collapsed bottom sheet + safe area */
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
        
        {/* Mobile Bottom Sheet */}
        <MobileTraitBottomSheet
          selectedLayers={selectedLayers}
          selectLayer={selectLayer}
          disabledLayers={disabledLayers}
          isExpanded={isBottomSheetExpanded}
          onExpandedChange={setIsBottomSheetExpanded}
          canvasRef={canvasRef}
          onRandomize={handleRandomize}
          onDownload={handleDownload}
          onCyberTang={handleCyberTang}
          onShareX={handleShareX}
          tangifiedImage={tangifiedImage}
          setTangifiedImage={setTangifiedImage}
          showTangified={showTangified}
          setShowTangified={setShowTangified}
          onAddToGallery={addToGallery}
          onUpdateGalleryEntry={updateGalleryEntry}
          onRemoveGalleryEntry={removeGalleryEntry}
          onAddDesktopImage={onAddDesktopImage}
          desktopImages={desktopImages}
          onSaveToFavorites={onSaveToFavorites}
          onUndo={undoRandomize}
        />
      </>
    )
  }

  // Desktop layout: Side-by-side canvas and controls
  
  return (
    <>
      <Window
        id="wojak-generator"
        title="WOJAK_GENERATOR.EXE"
        noStack={true}
        onClose={onClose}
        onHelpClick={() => setShowReadme(true)}
        style={{ 
          width: 'clamp(300px, 85vw, 860px)', // Desktop width with responsive clamp
          minWidth: '300px',
          height: 'auto',
          maxWidth: 'min(calc(100% - 16px), 860px)',
          maxHeight: 'calc(100dvh - var(--taskbar-height) - var(--safe-area-bottom) - 100px)', // More space from bottom
          minHeight: '150px',
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
            {/* DevPanel - Test CyberTang button - Always visible for testing */}
            <div style={{
              marginBottom: '8px',
              marginTop: '4px',
              padding: '6px 8px',
              background: '#ffff00', // Bright yellow to make it obvious
              border: '2px solid #000000',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              width: '100%',
              boxSizing: 'border-box',
              zIndex: 1000,
              position: 'relative',
            }}>
                <span style={{
                  fontFamily: 'MS Sans Serif, sans-serif',
                  fontSize: '10px',
                  color: 'var(--text-1)',
                  marginRight: '4px',
                }}>
                  Dev:
                </span>
                <Button
                  onClick={() => {
                    // Create a test CyberTang image (colored rectangle for testing)
                    const testCanvas = document.createElement('canvas')
                    testCanvas.width = 500
                    testCanvas.height = 500
                    const ctx = testCanvas.getContext('2d')
                    // Create a test image with gradient
                    const gradient = ctx.createLinearGradient(0, 0, 500, 500)
                    gradient.addColorStop(0, '#ff6600')
                    gradient.addColorStop(1, '#ffaa00')
                    ctx.fillStyle = gradient
                    ctx.fillRect(0, 0, 500, 500)
                    ctx.fillStyle = '#ffffff'
                    ctx.font = '48px Arial'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText('TEST CyberTang', 250, 250)
                    // Convert to blob URL
                    testCanvas.toBlob((blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob)
                        setTangifiedImage(url)
                        setShowTangified(true)
                        showToast('✅ Test CyberTang created!', 'success', 2000)
                      }
                    }, 'image/png')
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                  }}
                >
                  Test CyberTang
                </Button>
            </div>
            
            <div className="trait-selectors-scroll">
              {/* Flat list (no HEAD/FACE/BODY categories) */}
              {generatorLayerOrder.map((layer, index) => {
                const originalIndex = generatorLayerOrder.findIndex(l => l.name === layer.name)
                const hasVariants = layer.name === 'Head' || layer.name === 'Eyes' || layer.name === 'Clothes'
                const isFirstRow = index === 0
                const isLastLayer = index === generatorLayerOrder.length - 1 // Background is last

                return (
                  <>
                    <div
                      key={layer.name}
                      className={`trait-row ${hasVariants ? 'has-variants' : ''} ${isFirstRow ? 'trait-row-first' : ''}`}
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
                        isFirstRow={isFirstRow}
                      />
                    </div>
                    {/* Toggle switch for Original/CyberTang view - right after Background dropdown */}
                    {isLastLayer && tangifiedImage && (
                      <div key="view-toggle" style={{
                        marginTop: '0px',
                        padding: '4px 8px',
                        background: 'var(--surface-1)',
                        border: '1px solid',
                        borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'flex-start',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}>
                        <span className="helper-text" style={{
                          fontFamily: 'MS Sans Serif, sans-serif',
                          fontSize: '11px',
                          color: 'var(--text-1)',
                          marginRight: '4px',
                        }}>
                          View:
                        </span>
                        <Button
                          onClick={() => {
                            setShowTangified(false)
                          }}
                          style={{
                            padding: '2px 6px',
                            flex: '0 0 auto',
                            fontSize: '11px',
                            background: showTangified ? 'var(--btn-face-pressed)' : 'var(--btn-face-hover)',
                            border: showTangified ? '1px inset var(--border-dark)' : '1px outset var(--border-light)',
                          }}
                        >
                          Original
                        </Button>
                        <Button
                          onClick={() => {
                            setShowTangified(true)
                          }}
                          style={{
                            padding: '2px 6px',
                            flex: '0 0 auto',
                            fontSize: '11px',
                            background: showTangified ? 'var(--btn-face-hover)' : 'var(--btn-face-pressed)',
                            border: showTangified ? '1px outset var(--border-light)' : '1px inset var(--border-dark)',
                          }}
                        >
                          CyberTang
                        </Button>
                      </div>
                    )}
                  </>
                )
              })}
            </div>
          </div>

          {/* Right side: Generator Preview */}
          <div className="meme-generator-preview">
            <div className="meme-generator-preview-canvas-wrapper">
              <MemeCanvas 
                canvasRef={canvasRef} 
                width={500} 
                height={500}
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
                onRandomize={handleRandomize}
                onUndo={undoRandomize}
                tangifiedImage={tangifiedImage}
                setTangifiedImage={setTangifiedImage}
                showTangified={showTangified}
                setShowTangified={setShowTangified}
                onAddToGallery={addToGallery}
                onUpdateGalleryEntry={updateGalleryEntry}
                onRemoveGalleryEntry={removeGalleryEntry}
                onAddDesktopImage={onAddDesktopImage}
                desktopImages={desktopImages}
                onSaveToFavorites={onSaveToFavorites}
              />
            </div>
          </div>
        </div>
      </Window>
      
      {/* README Window */}
      {showReadme && (
        <Window 
          id="wojak-readme"
          title="About the Wojak Generator"
          onClose={() => setShowReadme(false)}
          style={{ 
            width: 'clamp(280px, 92vw, 560px)', 
            height: 'clamp(400px, 80vh, 520px)', 
            zIndex: 10000,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="readme-content" style={{ 
            padding: '16px 20px 20px 20px',
            overflowY: 'auto',
            overflowX: 'hidden',
            maxHeight: 'calc(100vh - 150px)'
          }}>
            
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

