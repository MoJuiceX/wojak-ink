import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { UI_LAYER_ORDER } from '../../lib/memeLayers'
import { getAllLayerImages } from '../../lib/memeImageManifest'
import LayerSelector from './LayerSelector'
import ExportControls from './ExportControls'
import { useGlobalKeyboard } from '../../hooks/useGlobalKeyboard'
import { useKeyboardHandler, KEYBOARD_PRIORITY } from '../../contexts/KeyboardPriorityContext'
import './MobileTraitBottomSheet.css'

// Custom order for generator dropdowns (matches desktop generator)
const GENERATOR_LAYER_ORDER = ['Head','Eyes','Base','MouthBase','MouthItem','FacialHair','Mask','Clothes','Background']

/**
 * Mobile bottom sheet for trait controls
 * - Collapsed: 3 primary buttons + current selected trait summary
 * - Expanded: Full trait list with search
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
  const [searchQuery, setSearchQuery] = useState('')
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

  // Get current trait summary (non-empty selections)
  const getTraitSummary = () => {
    const selected = Object.entries(selectedLayers)
      .filter(([_, value]) => value && value !== '' && value !== 'None')
      .map(([layerName, value]) => {
        const layer = UI_LAYER_ORDER.find(l => l.name === layerName)
        if (!layer) return null
        
        // Extract display name from path
        const fileName = value.split('/').pop() || ''
        const displayName = fileName
          .replace(/\.(png|jpg|jpeg)$/i, '')
          .replace(/^[A-Z_]+_/, '')
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
        
        return { layerName, displayName }
      })
      .filter(Boolean)
    
    return selected
  }

  const traitSummary = getTraitSummary()

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

  // Filter layers by search query
  const filteredLayers = generatorLayerOrder.filter(layer => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return layer.name.toLowerCase().includes(query)
  })

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
        const firstInput = focusableElementsRef.current.find(el => el.tagName === 'INPUT')
        if (firstInput) {
          firstInput.focus()
        } else {
          focusableElementsRef.current[0]?.focus()
        }
      }, 100)
    }

    // Update focusable elements when search query changes (content may change)
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
  }, [isExpanded, searchQuery])

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
          {/* Primary Action Buttons: Traits, Random, Save */}
          <div className="primary-buttons">
            {/* Traits Button - Expands sheet */}
            <button
              className="primary-button primary-button-traits"
              onClick={() => setIsExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsExpanded(true)
                }
              }}
              tabIndex={0}
              aria-label="View all traits"
            >
              <span className="button-label">Traits</span>
            </button>

            {/* Random Button - Randomizes all traits */}
            <button
              className="primary-button primary-button-random"
              onClick={handleRandomize}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleRandomize()
                }
              }}
              tabIndex={0}
              aria-label="Randomize all traits"
            >
              <span className="button-label">Random</span>
            </button>

            {/* Save Button - Triggers export (handled by ExportControls) */}
            <button
              className="primary-button primary-button-save"
              onClick={() => {
                // Trigger download from ExportControls - find the Download PNG button
                const downloadBtn = document.querySelector('.export-controls-mobile button, .export-controls-mobile-expanded button')
                if (downloadBtn && !downloadBtn.disabled) {
                  downloadBtn.click()
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const downloadBtn = document.querySelector('.export-controls-mobile button, .export-controls-mobile-expanded button')
                  if (downloadBtn && !downloadBtn.disabled) {
                    downloadBtn.click()
                  }
                }
              }}
              tabIndex={0}
              aria-label="Save wojak"
            >
              <span className="button-label">Save</span>
            </button>
          </div>

          {/* Trait Summary */}
          {traitSummary.length > 0 && (
            <div className="trait-summary">
              <div className="summary-label">Selected Traits:</div>
              <div className="summary-items">
                {traitSummary.slice(0, 3).map(({ layerName, displayName }) => (
                  <span key={layerName} className="summary-item">
                    {layerName}: {displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName}
                  </span>
                ))}
                {traitSummary.length > 3 && (
                  <span className="summary-more">+{traitSummary.length - 3} more</span>
                )}
              </div>
            </div>
          )}

          {/* Export Controls - Always reachable */}
          {canvasRef && (
            <div className="export-controls-mobile">
              <ExportControls canvasRef={canvasRef} selectedLayers={selectedLayers} />
            </div>
          )}

        </div>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="sheet-expanded">
          {/* Header - Clickable to toggle collapse */}
          <div 
            className="sheet-header"
            onClick={handleHeaderClick}
            role="button"
            tabIndex={0}
            aria-label="Tap to collapse"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleHeaderClick()
              }
            }}
          >
            <h3 className="sheet-title">Select Traits</h3>
            <button
              className="close-button"
              onClick={(e) => {
                e.stopPropagation() // Prevent header click
                setIsExpanded(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsExpanded(false)
                }
              }}
              tabIndex={0}
              aria-label="Close trait selector"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="sheet-search">
            <input
              type="text"
              placeholder="Search traits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Trait List */}
          <div 
            ref={sheetContentRef}
            className="sheet-content scroll-allowed"
          >
            {filteredLayers.length === 0 ? (
              <div className="no-results">No traits found matching "{searchQuery}"</div>
            ) : (
              filteredLayers.map(layer => (
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
              ))
            )}
          </div>

          {/* Export Controls - Always reachable in expanded state too */}
          {canvasRef && (
            <div className="export-controls-mobile-expanded">
              <ExportControls canvasRef={canvasRef} selectedLayers={selectedLayers} />
            </div>
          )}
        </div>
      )}
    </div>
  )

  // Render using portal to ensure it's at the root level (outside Window component)
  return createPortal(sheetContent, document.body)
}

