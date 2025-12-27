import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import { getAllLayerImages } from '../../lib/memeImageManifest'
import LayerSelector from './LayerSelector'
import ExportControls from './ExportControls'
import { Button } from '../ui'
import { useGlobalKeyboard } from '../../hooks/useGlobalKeyboard'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../../contexts/KeyboardPriorityContext'
import { useToast } from '../../contexts/ToastContext'
import { buildImageName } from '../../utils/filenameUtils'
import './MobileTraitBottomSheet.css'

// Custom order for generator dropdowns (matches desktop generator)
const GENERATOR_LAYER_ORDER = ['Head','Eyes','Base','MouthBase','MouthItem','FacialHair','Mask','Clothes','Background']

/**
 * Mobile bottom sheet for trait controls
 * - Collapsed: 3 primary buttons (Traits, Random, Save)
 * - Expanded: Full trait list
 * - Prevents background scrolling when open
 */
export default function MobileTraitBottomSheet({
  selectedLayers,
  selectLayer,
  disabledLayers = [],
  isExpanded: controlledIsExpanded,
  onExpandedChange,
  canvasRef,
  onRandomize,
  onDownload,
  onCyberTang,
  onShareX,
  // ExportControls props for CyberTang functionality
  tangifiedImage,
  setTangifiedImage,
  showTangified,
  setShowTangified,
  onAddToGallery,
  onUpdateGalleryEntry,
  onRemoveGalleryEntry,
  onAddDesktopImage,
  desktopImages = [],
  onSaveToFavorites,
  onUndo,
}) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false)
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded
  const setIsExpanded = (value) => {
    if (onExpandedChange) {
      onExpandedChange(value)
    } else {
      setInternalIsExpanded(value)
    }
  }
  const sheetRef = useRef(null)
  const dragStartY = useRef(0)
  const currentY = useRef(0)
  const isDragging = useRef(false)
  const isScrolling = useRef(false)
  const scrollTimeoutRef = useRef(null)
  const sheetContentRef = useRef(null)
  const focusableElementsRef = useRef([])

  // Prevent background scrolling when sheet is open
  useEffect(() => {
    if (isExpanded) {
      // Lock body scroll
      const originalOverflow = document.body.style.overflow
      const originalPosition = document.body.style.position
      const scrollY = window.scrollY

      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`

      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.position = originalPosition
        document.body.style.width = ''
        document.body.style.top = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isExpanded])

  const { showToast } = useToast()

  // Check if required layers are selected for download/save
  const hasBase = selectedLayers['Base'] && selectedLayers['Base'] !== 'None'
  const hasMouthBase = selectedLayers['MouthBase'] && selectedLayers['MouthBase'] !== 'None'
  const hasClothes = selectedLayers['Clothes'] && selectedLayers['Clothes'] !== 'None'
  const canDownload = hasBase && hasMouthBase && hasClothes

  // Randomize all traits
  const handleRandomize = () => {
    if (onRandomize) {
      onRandomize()
    } else {
      // Fallback: randomize using getAllLayerImages
      UI_LAYER_ORDER.forEach(layer => {
        const images = getAllLayerImages(layer.name)
        if (images.length > 0) {
          // Filter out "None" option if it exists
          const validImages = images.filter(img => 
            img.path && 
            !img.path.toLowerCase().includes('none') &&
            !img.displayName.toLowerCase().includes('none')
          )
          if (validImages.length > 0) {
            const randomImage = validImages[Math.floor(Math.random() * validImages.length)]
            selectLayer(layer.name, randomImage.path)
          }
        }
      })
    }
  }

  // Handle save to favorites
  const handleSaveToFavorites = useCallback(async () => {
    if (!canvasRef.current || !canDownload) {
      showToast('⚠️ Please select Base, Mouth (Base), and Clothing before saving to favorites.', 'warning', 4000)
      return
    }

    if (!onSaveToFavorites) {
      showToast('⚠️ Save to favorites is not available', 'error', 3000)
      return
    }

    try {
      const canvas = canvasRef.current
      const dataUrl = canvas.toDataURL('image/png')
      const filename = buildImageName(selectedLayers, 'original')
      
      const wojak = {
        id: `wojak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: filename,
        dataUrl: dataUrl,
        selectedLayers: { ...selectedLayers },
        type: 'original',
        savedAt: new Date().toISOString()
      }

      await onSaveToFavorites(wojak)
      showToast('✅ Wojak saved to My Favorite Wojaks!', 'success', 3000)
    } catch (error) {
      console.error('Save to favorites error:', error)
      showToast('Failed to save to favorites', 'error', 3000)
    }
  }, [canvasRef, canDownload, selectedLayers, onSaveToFavorites, showToast])

  // Build reordered layer array for generator UI (matches desktop generator)
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

  // Global keyboard handler for bottom sheet (legacy, kept for compatibility)
  useGlobalKeyboard({
    isActive: false, // Disabled - using priority system instead
    onEscape: () => {
      setIsExpanded(false)
    },
  })

  // Register bottom sheet keyboard handler (priority 2)
  const handleBottomSheetKeyboard = (e) => {
    if (!isExpanded) return

    // Don't interfere with input fields
    const target = e.target
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('input, textarea, [contenteditable="true"]')
    ) {
      // Allow normal input, but handle Esc
      if (e.key === 'Escape') {
        setIsExpanded(false)
        e.preventDefault()
        e.stopPropagation()
      }
      return
    }

    // Handle Escape to close
    if (e.key === 'Escape') {
      setIsExpanded(false)
      e.preventDefault()
      e.stopPropagation()
    }
  }

  useKeyboardHandler(KEYBOARD_PRIORITY.BOTTOM_SHEET, 'mobile-bottom-sheet', handleBottomSheetKeyboard, isExpanded)

  // Prevent accidental close while scrolling
  useEffect(() => {
    if (!isExpanded || !sheetContentRef.current) return

    const handleScroll = () => {
      isScrolling.current = true
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Reset scrolling flag after scroll ends (200ms debounce)
      scrollTimeoutRef.current = setTimeout(() => {
        isScrolling.current = false
      }, 200)
    }

    const contentEl = sheetContentRef.current
    contentEl.addEventListener('scroll', handleScroll, { passive: true })
    contentEl.addEventListener('touchmove', handleScroll, { passive: true })

    return () => {
      contentEl.removeEventListener('scroll', handleScroll)
      contentEl.removeEventListener('touchmove', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isExpanded])

  // Focus trap when expanded
  useEffect(() => {
    if (!isExpanded || !sheetRef.current) return

    const sheet = sheetRef.current
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const updateFocusableElements = () => {
      focusableElementsRef.current = Array.from(sheet.querySelectorAll(focusableSelectors))
        .filter(el => {
          const style = window.getComputedStyle(el)
          return style.display !== 'none' && style.visibility !== 'hidden'
        })
    }

    updateFocusableElements()

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      // Update focusable elements in case DOM changed (e.g., search results)
      updateFocusableElements()

      const focusableElements = focusableElementsRef.current
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement || !sheet.contains(document.activeElement)) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement || !sheet.contains(document.activeElement)) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Focus first element when sheet opens
    if (focusableElementsRef.current.length > 0) {
      // Small delay to ensure sheet is fully rendered
      setTimeout(() => {
        updateFocusableElements() // Refresh before focusing
        focusableElementsRef.current[0]?.focus()
      }, 100)
    }

    // Update focusable elements when content changes
    const observer = new MutationObserver(() => {
      updateFocusableElements()
    })

    observer.observe(sheet, {
      childList: true,
      subtree: true,
    })

    document.addEventListener('keydown', handleTabKey)

      return () => {
        observer.disconnect()
        document.removeEventListener('keydown', handleTabKey)
      }
    }, [isExpanded])

  // Handle drag to close
  useEffect(() => {
    if (!isExpanded) return

    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      
      // Don't allow drag if user is scrolling
      if (isScrolling.current) {
        isDragging.current = false
        if (sheetRef.current) {
          sheetRef.current.style.transform = ''
        }
        return
      }
      
      const deltaY = e.clientY - dragStartY.current
      
      // Only allow downward drag
      if (deltaY > 0) {
        currentY.current = deltaY
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(${deltaY}px)`
        }
      }
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return
      
      const threshold = 100 // pixels to drag before closing
      if (currentY.current > threshold) {
        setIsExpanded(false)
      }
      
      // Reset transform
      if (sheetRef.current) {
        sheetRef.current.style.transform = ''
      }
      
      isDragging.current = false
      currentY.current = 0
    }

    const handleTouchMove = (e) => {
      if (!isDragging.current) return
      
      // Don't allow drag if user is scrolling
      if (isScrolling.current) {
        isDragging.current = false
        if (sheetRef.current) {
          sheetRef.current.style.transform = ''
        }
        return
      }
      
      const clientY = e.touches[0].clientY
      const deltaY = clientY - dragStartY.current
      
      // Only allow downward drag
      if (deltaY > 0) {
        currentY.current = deltaY
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(${deltaY}px)`
        }
      }
      
      e.preventDefault()
    }

    const handleTouchEnd = () => {
      if (!isDragging.current) return
      
      const threshold = 100 // pixels to drag before closing
      if (currentY.current > threshold) {
        setIsExpanded(false)
      }
      
      // Reset transform
      if (sheetRef.current) {
        sheetRef.current.style.transform = ''
      }
      
      isDragging.current = false
      currentY.current = 0
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isExpanded])

  const handleDragStart = (e) => {
    if (!isExpanded) return
    
    // Don't start drag if user is scrolling
    if (isScrolling.current) return
    
    isDragging.current = true
    dragStartY.current = e.touches ? e.touches[0].clientY : e.clientY
    currentY.current = 0
    
    e.preventDefault()
    e.stopPropagation()
  }

  const handleHeaderClick = () => {
    if (isExpanded) {
      setIsExpanded(false)
    } else {
      setIsExpanded(true)
    }
  }


  const sheetContent = (
    <div 
      className={`mobile-trait-sheet ${isExpanded ? 'expanded' : 'collapsed'}`}
      ref={sheetRef}
    >
      {/* Draggable Handle - Always visible when expanded */}
      {isExpanded && (
        <div
          className="sheet-handle"
          onTouchStart={handleDragStart}
          onMouseDown={handleDragStart}
          role="button"
          tabIndex={0}
          aria-label="Drag to close"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsExpanded(false)
            }
          }}
        >
          <div className="handle-bar" />
        </div>
      )}

      {/* Collapsed State */}
      {!isExpanded && (
        <div className="sheet-collapsed">
          {/* All buttons in one row */}
          <div className="mobile-button-row">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsExpanded(true)
              }}
              className="mobile-action-button"
              aria-label="View all traits"
            >
              👕
            </Button>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRandomize()
              }}
              className="mobile-action-button"
              aria-label="Randomize all traits"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <img 
                src="/assets/images/randomemoji.png" 
                alt="Randomize" 
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  objectFit: 'contain',
                  imageRendering: 'auto'
                }} 
              />
            </Button>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onDownload) onDownload()
              }}
              className="mobile-action-button"
              aria-label="Download wojak"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <img 
                src="/assets/images/downloadicon.png" 
                alt="Download" 
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  objectFit: 'contain',
                  imageRendering: 'auto'
                }} 
              />
            </Button>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onCyberTang) onCyberTang()
              }}
              className="mobile-action-button"
              aria-label="Create CyberTang"
            >
              👽
            </Button>

            <Button
              type="button"
              onClick={(e) => {
                console.log('[MobileTraitBottomSheet] ShareX button clicked')
                e.preventDefault()
                e.stopPropagation()
                if (onShareX) {
                  console.log('[MobileTraitBottomSheet] Calling onShareX handler')
                  onShareX()
                } else {
                  console.warn('[MobileTraitBottomSheet] onShareX handler not provided')
                }
              }}
              className="mobile-action-button"
              aria-label="Share on X"
            >
              𝕏
            </Button>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSaveToFavorites()
              }}
              className="mobile-action-button win98-tooltip"
              data-tooltip={
                !canDownload
                  ? 'Select Base, Mouth, and Clothing to save to favorites'
                  : 'Save to My Favorite Wojaks'
              }
              disabled={!canDownload || !onSaveToFavorites}
              aria-label="Save to My Favorite Wojaks"
            >
              ⭐️
            </Button>

            <Button
              type="button"
              className="mobile-action-button win98-tooltip"
              data-tooltip="Soon"
              disabled={true}
              aria-label="Mint"
            >
              🌱
            </Button>
          </div>
        </div>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="sheet-expanded">
          {/* Header removed on mobile - users can swipe down to close */}
          {/* Trait List - starts immediately for more space */}
          <div 
            ref={sheetContentRef}
            className="sheet-content scroll-allowed"
          >
            {generatorLayerOrder.map(layer => (
              <div
                key={layer.name}
                id={`trait-${layer.name}`}
                className="trait-item"
              >
                <LayerSelector
                  layerName={layer.name}
                  onSelect={selectLayer}
                  selectedValue={selectedLayers[layer.name]}
                  disabled={disabledLayers.includes(layer.name)}
                  selectedLayers={selectedLayers}
                  disableTooltip={true}
                />
              </div>
            ))}
            
            {/* Only Randomizer and Back buttons when expanded */}
            <div style={{ 
              marginTop: '16px', 
              padding: '8px',
              display: 'flex',
              gap: '8px',
              justifyContent: 'center'
            }}>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleRandomize()
                }}
                className="mobile-action-button"
                aria-label="Randomize all traits"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img 
                  src="/assets/images/randomemoji.png" 
                  alt="Randomize" 
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    objectFit: 'contain',
                    imageRendering: 'auto'
                  }} 
                />
              </Button>

              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsExpanded(false)
                }}
                className="mobile-action-button"
                aria-label="Back"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ⬅️
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render using portal to ensure it's at the root level (outside Window component)
  return createPortal(sheetContent, document.body)
}

