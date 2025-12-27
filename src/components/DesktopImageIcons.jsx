import React, { useState, useRef, memo, useEffect } from 'react'
import { viewImage, downloadImageFromDataUrl } from '../utils/imageUtils'
import { playSound } from '../utils/soundManager'
import { useContextMenu } from '../hooks/useContextMenu'
import { getPairImages } from '../utils/desktopUtils'
import ContextMenu from './ui/ContextMenu'
import AppIcon from './ui/AppIcon'
import { useDraggableIcon } from '../hooks/useDraggableIcon'
import { loadIconPositions, saveIconPosition } from '../utils/iconPositionStorage'
import { snapToGrid } from '../utils/iconGrid'
import './DesktopImageIcons.css'

// Draggable Folder/Recycle Bin Icon Component
const DraggableFolderIcon = React.forwardRef(function DraggableFolderIcon({ 
  iconId,
  position, 
  onPositionChange,
  onDoubleClick,
  onClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  className,
  style,
  title,
  ariaLabel,
  children,
  iconSrc,
  isRecycleBin = false,
  isRecycleBinFull = false,
  dragOverTrash = false
}, ref) {
  React.useEffect(() => {
    // Component lifecycle tracking removed
  }, [iconId])
  // Remove isDragging state to avoid React re-renders during drag (performance optimization)
  // The hook manages dragging state internally via dataset.dragging and CSS classes
  const buttonElementRef = React.useRef(null)
  const isInitialMountRef = React.useRef(true)
  
  const { handleMouseDown, handleTouchStart, iconElementRef } = useDraggableIcon({
    appId: iconId,
    initialPosition: position,
    // Remove onDragStart/onDragEnd to avoid React re-renders during drag
    // The hook manages dragging state internally via dataset.dragging and CSS classes
    onPositionChange: (x, y) => {
      // Update parent state - hook already set DOM position
      onPositionChange(x, y)
    }
  })

  // Prevent onClick if drag occurred (Windows 98 behavior)
  const handleClick = (e) => {
    // If dragging flag is set, prevent click
    if (e.currentTarget.dataset.dragging === 'true') {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (onClick) {
      onClick(e)
    }
  }
  
  // Wrapper for mouseDown events
  const handleMouseDownWrapper = (e) => {
    if (handleMouseDown) {
      handleMouseDown(e)
    }
  }

  // Use a ref callback to forward ref and store element reference
  // Also set iconElementRef from hook so it can access the DOM element
  const buttonRef = React.useCallback((el) => {
    buttonElementRef.current = el
    iconElementRef.current = el // Set hook's ref
    if (ref) {
      if (typeof ref === 'function') {
        ref(el)
      } else {
        ref.current = el
      }
    }
  }, [ref, iconElementRef])


  return (
    <button
      ref={buttonRef}
      data-icon-type={isRecycleBin ? "recycle-bin" : "folder"}
      data-icon-id={iconId}
      className={className}
      onMouseDown={handleMouseDownWrapper}
      onTouchStart={handleTouchStart}
      onDragStart={(e) => e.preventDefault()}
      onDoubleClick={onDoubleClick}
      onClick={handleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...style,
        position: 'absolute',
        // Set position from prop - hook will update it during drag
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: 'none',
        zIndex: 1, // z-index managed by hook via CSS class
        pointerEvents: 'auto',
      }}
      // Hook manages position during drag via transform, then sets left/top on drag end
      // React's position prop provides the base position
      // Hook adds/removes 'dragging' class directly on the element (no React state needed)
      // This avoids React re-renders during drag for better performance
      title={title}
      aria-label={ariaLabel}
    >
      {children || (
        <>
          <div 
            className="desktop-folder-icon-wrapper"
            style={{ 
              position: 'relative', 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              flexShrink: 0,
              border: 'none',
              outline: 'none',
            }}
          >
            <AppIcon
              icon={{ 
                type: 'img', 
                src: iconSrc || (isRecycleBin 
                  ? (isRecycleBinFull ? '/icon/recycle_bin_full_2k-0.png' : '/icon/recycle_bin_file.png')
                  : '/icon/directory_closed-0.png')
              }}
              size={32}
              className="desktop-folder-icon-image"
              style={{
                imageRendering: 'pixelated',
                display: 'block',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                filter: dragOverTrash ? 'drop-shadow(0 0 8px #ff0000)' : 'none',
                transition: 'filter 0.2s',
              }}
            />
          </div>
        </>
      )}
    </button>
  )
})

// Memoized Desktop Icon Component (defined outside to avoid recreation)
const DesktopIcon = memo(({ 
  image, 
  isSelected, 
  isDragging, 
  isHovered, 
  onMouseDown, 
  onDoubleClick, 
  onContextMenu, 
  onClick, 
  onMouseEnter, 
  onMouseLeave 
}) => {
  const imageUrl = image.image || image.imageDataUrl
  const imageName = image.name || image.filename
  const position = image.position || { x: 0, y: 0 }
  
  return (
    <button
      key={image.id}
      data-icon-id={image.id}
      onMouseDown={(e) => {
        e.stopPropagation()
        onMouseDown(e, image)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onDoubleClick(imageUrl, imageName)
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
        onContextMenu(e, image)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e, image.id)
      }}
      onMouseEnter={() => onMouseEnter(image.id)}
      onMouseLeave={onMouseLeave}
      draggable={false}
      className={`desktop-image-icon ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        background: isSelected ? 'rgba(0, 0, 128, 0.3)' : (isHovered ? 'rgba(255, 255, 255, 0.1)' : 'transparent'),
        border: 'none',
        cursor: isDragging ? 'grabbing' : 'pointer',
        padding: '4px',
        fontFamily: "'MS Sans Serif', sans-serif",
        color: '#fff',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
        width: '80px',
        boxSizing: 'border-box',
        opacity: isDragging ? 0.7 : 1,
        transition: isDragging ? 'none' : 'background 0.2s, opacity 0.2s',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
      title={`${imageName}\nDouble-click to view`}
      aria-label={`Image: ${imageName}`}
    >
      <div
        className="desktop-image-icon-thumbnail"
        style={{
          width: '48px',
          height: '48px',
          border: isSelected ? '2px solid var(--accent)' : 'none',
          background: 'var(--input-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={imageUrl}
          alt={imageName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            imageRendering: 'auto',
            display: 'block',
            pointerEvents: 'none',
          }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
          draggable={false}
        />
      </div>
      <span
        className="desktop-image-icon-label"
          style={{
          color: '#fff',
          textShadow: '1px 1px 1px black',
          textAlign: 'center',
          marginTop: '4px',
          wordBreak: 'break-word',
          maxWidth: '80px',
          lineHeight: '14px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {imageName.length > 12 ? imageName.substring(0, 12) + '...' : imageName}
      </span>
    </button>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if this specific icon changed
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.position?.x === nextProps.image.position?.x &&
    prevProps.image.position?.y === nextProps.image.position?.y &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isHovered === nextProps.isHovered
  )
})

DesktopIcon.displayName = 'DesktopIcon'

export default function DesktopImageIcons({ 
  desktopImages = [], 
  onRemoveImage,
  onUpdatePosition,
  onOpenRecycleBin,
  onOpenFavoriteWojaks,
  onOpenMemeticEnergy,
  onOpenCommunityResources,
  onViewImage,
  selectedIconIds = [],
  setSelectedIconIds,
  onShowProperties,
  recycleBin = [] // Pass recycleBin to determine empty/full state
}) {
  const [draggedImageId, setDraggedImageId] = useState(null)
  const [dragOverTrash, setDragOverTrash] = useState(false)
  const [hoveredImageId, setHoveredImageId] = useState(null)
  const [isRecycleBinHovered, setIsRecycleBinHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [draggingIconId, setDraggingIconId] = useState(null)
  const dragRef = useRef({ startX: 0, startY: 0, iconX: 0, iconY: 0 })
  const trashBinRef = useRef(null) // Ref to Recycle Bin element for hit testing
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu()

  const handleDownload = async (image) => {
    // Helper function to validate image data is valid
    const isValidImageData = (imageData) => {
      if (!imageData || typeof imageData !== 'string') {
        return false
      }
      // Check if it's a valid data URL (starts with data:image/)
      // Or a valid blob URL (starts with blob:)
      // Or a valid http/https URL
      if (imageData.startsWith('data:image/')) {
        // Validate data URL has actual base64 data (not empty)
        const base64Data = imageData.split(',')[1]
        return base64Data && base64Data.length > 0
      }
      if (imageData.startsWith('blob:') || imageData.startsWith('http://') || imageData.startsWith('https://')) {
        return true
      }
      return false
    }

    // Helper function to check if image data URL appears to be a valid non-black image
    // by checking if it has sufficient base64 content length (black images are often smaller)
    const appearsToBeValidImage = async (imageData) => {
      if (!isValidImageData(imageData)) {
        return false
      }
      
      // For data URLs, check minimum size (black/corrupt images are often very small)
      // A valid PNG with actual content should be at least a few KB in base64
      if (imageData.startsWith('data:image/')) {
        const base64Data = imageData.split(',')[1]
        // Minimum reasonable size: ~5000 chars base64 = ~3.7KB raw (very small image)
        // Black or corrupt images are often much smaller
        if (base64Data && base64Data.length > 5000) {
          return true
        }
        // Even smaller images might be valid, so we'll still try to download
        // but this helps filter obvious corrupt/black images
        return base64Data && base64Data.length > 100
      }
      
      // For blob/http URLs, assume valid (can't check without fetching)
      return true
    }

    // Helper function to validate and download a single image
    const downloadSingleImage = (img) => {
      const imageData = img.image || img.imageDataUrl
      if (!isValidImageData(imageData)) {
        console.warn('Cannot download image: invalid or missing image data', img.id, img.name)
        return false
      }
      
      const filename = img.name || img.filename || 'wojak.png'
      downloadImageFromDataUrl(imageData, filename)
      return true
    }

    // Download the clicked image first
    const downloaded = downloadSingleImage(image)
    if (!downloaded) {
      return // Can't download if no image data
    }

    // If this is a CyberTang with a pairId, also download the paired original
    if (image.type === 'cybertang' && image.pairId) {
      const { original } = getPairImages(desktopImages, image.pairId)
      
      if (original) {
        // Validate original image has valid data before downloading
        const originalImageData = original.image || original.imageDataUrl
        const isValid = await appearsToBeValidImage(originalImageData)
        if (isValid) {
          // Add a small delay to prevent browser from blocking multiple downloads
          setTimeout(() => {
            downloadSingleImage(original)
          }, 100)
        } else {
          console.warn('Paired original image exists but appears to have invalid/black image data - skipping download', original.id, original.name)
        }
      }
    }
    
    // If this is an original with a pairId, also download the paired CyberTang
    if (image.type === 'original' && image.pairId) {
      const { cybertang } = getPairImages(desktopImages, image.pairId)
      
      if (cybertang) {
        // Validate CyberTang image has valid data before downloading
        const cybertangImageData = cybertang.image || cybertang.imageDataUrl
        if (isValidImageData(cybertangImageData)) {
          // Add a small delay to prevent browser from blocking multiple downloads
          setTimeout(() => {
            downloadSingleImage(cybertang)
          }, 100)
        } else {
          console.warn('Paired CyberTang image exists but has invalid image data - skipping download', cybertang.id, cybertang.name)
        }
      }
    }
  }

  const handleIconClick = (e, imageId) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedIconIds(prev => {
        if (prev.includes(imageId)) {
          return prev.filter(id => id !== imageId)
        } else {
          return [...prev, imageId]
        }
      })
    } else {
      // Select single
      setSelectedIconIds([imageId])
    }
  }

  const handleContextMenu = (e, image) => {
    e.preventDefault()
    e.stopPropagation()
    showContextMenu(e, [
      { 
        icon: '📂', 
        label: 'Open', 
        onClick: () => handleDoubleClick(image.image || image.imageDataUrl) 
      },
      { 
        icon: '💾', 
        label: 'Download', 
        onClick: () => handleDownload(image) 
      },
      { separator: true },
      { 
        icon: '✏️', 
        label: 'Rename', 
        onClick: () => {
          // TODO: Implement rename
          console.log('Rename:', image.id)
        }, 
        disabled: true 
      },
      { 
        icon: '🗑️', 
        label: 'Delete', 
        onClick: () => {
          playSound('trash')
          onRemoveImage(image.id)
        }, 
        shortcut: 'Del' 
      },
      { separator: true },
      { 
        icon: '📋', 
        label: 'Properties', 
        onClick: () => {
          if (onShowProperties) {
            onShowProperties(image)
          }
        }
      },
    ])
  }

  // Helper function to check if point is over Recycle Bin
  const isOverRecycleBin = (x, y) => {
    if (!trashBinRef.current) return false
    const rect = trashBinRef.current.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  // Handle mouse down for drag-to-position
  const handleMouseDown = (e, icon) => {
    // Don't start drag on right-click (context menu) or if modifier keys are pressed
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) {
      return
    }
    
    // Don't prevent default - allow normal click behavior for selection
    // Only start dragging after mouse moves
    let hasMoved = false
    const startX = e.clientX
    const startY = e.clientY
    const threshold = 5 // pixels to move before starting drag
    let wasOverTrash = false
    
    setIsDragging(true)
    setDraggingIconId(icon.id)
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      iconX: icon.position?.x || 0,
      iconY: icon.position?.y || 0
    }
    
    const handleMouseMove = (e) => {
      const deltaX = Math.abs(e.clientX - startX)
      const deltaY = Math.abs(e.clientY - startY)
      
      // Only start dragging if mouse moved beyond threshold
      if (!hasMoved && (deltaX > threshold || deltaY > threshold)) {
        hasMoved = true
        e.preventDefault()
        e.stopPropagation()
      }
      
      if (hasMoved) {
        // Check if over Recycle Bin
        const overTrash = isOverRecycleBin(e.clientX, e.clientY)
        if (overTrash !== wasOverTrash) {
          wasOverTrash = overTrash
          setDragOverTrash(overTrash)
        }
        
        const moveDeltaX = e.clientX - dragRef.current.startX
        const moveDeltaY = e.clientY - dragRef.current.startY
        
        const newX = dragRef.current.iconX + moveDeltaX
        const newY = dragRef.current.iconY + moveDeltaY
        
        // Clamp to viewport bounds
        const clampedX = Math.max(0, Math.min(newX, window.innerWidth - 100))
        const clampedY = Math.max(0, Math.min(newY, window.innerHeight - 100))
        
        if (onUpdatePosition) {
          onUpdatePosition(icon.id, clampedX, clampedY)
        }
      }
    }
    
    const handleMouseUp = (e) => {
      // Check if dropped over Recycle Bin
      if (hasMoved && isOverRecycleBin(e.clientX, e.clientY)) {
        // Delete the icon(s) - support multi-select
        const iconsToDelete = selectedIconIds.includes(icon.id) && selectedIconIds.length > 1
          ? selectedIconIds
          : [icon.id]
        
        // Play sound once per delete operation
        playSound('recycleBin')
        
        // Delete all selected icons
        iconsToDelete.forEach(id => {
          if (onRemoveImage) {
            onRemoveImage(id)
          }
        })
        
        // Clear selection
        if (setSelectedIconIds) {
          setSelectedIconIds([])
        }
      }
      
      setIsDragging(false)
      setDraggingIconId(null)
      setDragOverTrash(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDoubleClick = (imageDataUrl, filename) => {
    if (!imageDataUrl) {
      console.warn('[DesktopImageIcons] No image data URL provided')
      return
    }
    
    // Validate it's a data URL
    if (!imageDataUrl.startsWith('data:image/')) {
      console.warn('[DesktopImageIcons] Invalid image data URL format:', imageDataUrl?.substring(0, 50))
      return
    }
    
    // On mobile, open directly in new tab for better save functionality
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640
    if (isMobile) {
      // Open image in new tab - mobile browsers can save via long-press
      const newWindow = window.open('', '_blank', 'noopener,noreferrer')
      if (newWindow) {
        const doc = newWindow.document
        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename || 'Image'}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  background: #000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  padding: 20px;
                }
                img {
                  max-width: 100%;
                  max-height: 100vh;
                  object-fit: contain;
                  display: block;
                }
              </style>
            </head>
            <body>
              <img src="${imageDataUrl}" alt="${filename || 'Image'}" />
            </body>
          </html>
        `)
        doc.close()
      }
    } else {
      // Desktop: use window component
      if (onViewImage) {
        onViewImage(imageDataUrl, filename)
      } else {
        // Fallback to old method if onViewImage not provided
        viewImage(imageDataUrl)
      }
    }
  }
  
  // Detect mobile for single-click support
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640

  // Determine if Recycle Bin is full (has items)
  const isRecycleBinFull = recycleBin.length > 0

  // Constants for positioning
  const ICON_WIDTH = 96
  const ICON_HEIGHT = 80 // 32px icon + ~48px label + gap
  const TASKBAR_HEIGHT = 46
  const GRID_SIZE_Y = 80 // Vertical grid spacing
  const RIGHT_MARGIN = 20 // Margin from right edge
  const BOTTOM_MARGIN = 20 // Margin from bottom (above taskbar)
  
  // Load saved positions
  const savedPositions = loadIconPositions()
  
  // Calculate default positions from bottom right corner
  // Order from bottom to top: Recycle Bin (bottom), Community Resources, My Favorite Wojaks, Memetic Energy (top)
  const calculateDefaultPositions = () => {
    // Recycle Bin (bottom) - positioned at bottom right
    const recycleBinY = window.innerHeight - TASKBAR_HEIGHT - BOTTOM_MARGIN - ICON_HEIGHT
    const recycleBinX = window.innerWidth - RIGHT_MARGIN - ICON_WIDTH
    
    // Community Resources (above Recycle Bin)
    const communityResourcesY = recycleBinY - GRID_SIZE_Y
    
    // My Favorite Wojaks (above Community Resources)
    const favoriteWojaksY = communityResourcesY - GRID_SIZE_Y
    
    // Memetic Energy (top)
    const memeticEnergyY = favoriteWojaksY - GRID_SIZE_Y
    
    return {
      trashBin: snapToGrid(recycleBinX, recycleBinY),
      communityResources: snapToGrid(recycleBinX, communityResourcesY),
      favoriteWojaks: snapToGrid(recycleBinX, favoriteWojaksY),
      memeticEnergy: snapToGrid(recycleBinX, memeticEnergyY),
    }
  }
  
  const defaultPositions = calculateDefaultPositions()
  
  const [memeticEnergyPos, setMemeticEnergyPos] = useState(
    savedPositions.MEMETIC_ENERGY || defaultPositions.memeticEnergy
  )
  const [communityResourcesPos, setCommunityResourcesPos] = useState(
    savedPositions.COMMUNITY_RESOURCES || defaultPositions.communityResources
  )
  const [favoriteWojaksPos, setFavoriteWojaksPos] = useState(
    savedPositions.MY_FAVORITE_WOJAKS || defaultPositions.favoriteWojaks
  )
  const [trashBinPos, setTrashBinPos] = useState(
    savedPositions.RECYCLE_BIN || defaultPositions.trashBin
  )
  
  // Update positions on window resize if they haven't been manually moved (not saved)
  useEffect(() => {
    const handleResize = () => {
      // Only update if position hasn't been saved (user hasn't moved it)
      if (!savedPositions.MEMETIC_ENERGY) {
        const newDefaults = calculateDefaultPositions()
        setMemeticEnergyPos(newDefaults.memeticEnergy)
      }
      if (!savedPositions.COMMUNITY_RESOURCES) {
        const newDefaults = calculateDefaultPositions()
        setCommunityResourcesPos(newDefaults.communityResources)
      }
      if (!savedPositions.MY_FAVORITE_WOJAKS) {
        const newDefaults = calculateDefaultPositions()
        setFavoriteWojaksPos(newDefaults.favoriteWojaks)
      }
      if (!savedPositions.RECYCLE_BIN) {
        const newDefaults = calculateDefaultPositions()
        setTrashBinPos(newDefaults.trashBin)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [savedPositions])

  // Always render container - use relative positioning for absolute children
  return (
    <>
      {/* Desktop Icons Container - relative positioning for absolute children */}
      <div
        className="desktop-image-icons-container"
        onClick={(e) => {
          // Prevent deselecting when clicking inside the icons container
          e.stopPropagation()
        }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: '46px', // Above taskbar
          zIndex: 10,
          pointerEvents: 'none', // Let clicks pass through, children will have pointer-events
        }}
      >
        {/* Render each icon with absolute positioning - using memoized component */}
        {desktopImages.map((image, index) => {
          const isIconDragging = draggingIconId === image.id
          const isHovered = hoveredImageId === image.id
          const isSelected = selectedIconIds.includes(image.id)
          
          // Use position from image object, with fallback for backward compatibility
          // Don't mutate - create new object with position
          const position = image.position || { 
            x: window.innerWidth - 120, 
            y: 20 + (index * 100) 
          }
          const imageWithPosition = { ...image, position }

          return (
            <DesktopIcon
              key={image.id}
              image={imageWithPosition}
              isSelected={isSelected}
              isDragging={isIconDragging}
              isHovered={isHovered}
              onMouseDown={handleMouseDown}
              onDoubleClick={(imageUrl, filename) => {
                if (!isDragging && imageUrl) {
                  handleDoubleClick(imageUrl, filename || image.filename)
                }
              }}
              onContextMenu={handleContextMenu}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                // Only handle click if not dragging
                if (!isDragging) {
                  // On mobile, single click opens the image (double-click doesn't work well)
                  if (isMobile && (image.image || image.imageDataUrl)) {
                    handleDoubleClick(image.image || image.imageDataUrl, image.filename)
                  } else {
                    handleIconClick(e, image.id)
                  }
                }
              }}
              onMouseEnter={setHoveredImageId}
              onMouseLeave={() => setHoveredImageId(null)}
            />
          )
        })}

        {/* Memetic Energy - Draggable folder */}
        <DraggableFolderIcon
          key="MEMETIC_ENERGY"
          iconId="MEMETIC_ENERGY"
          position={memeticEnergyPos}
          onPositionChange={(x, y) => {
            setMemeticEnergyPos({ x, y })
            saveIconPosition('MEMETIC_ENERGY', x, y)
          }}
          onDoubleClick={() => {
            playSound('click')
            if (onOpenMemeticEnergy) {
              onOpenMemeticEnergy()
            }
          }}
          onClick={() => {
            playSound('click')
            if (onOpenMemeticEnergy) {
              onOpenMemeticEnergy()
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            showContextMenu(e, [
              { 
                icon: '📂', 
                label: 'Open', 
                onClick: () => {
                  if (onOpenMemeticEnergy) {
                    onOpenMemeticEnergy()
                  }
                }
              },
            ])
          }}
          className="desktop-icon-button desktop-folder-icon"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            width: '96px',
            fontFamily: "'MS Sans Serif', sans-serif",
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          }}
          title="MEMETIC ENERGY - Double-click to open"
          ariaLabel="MEMETIC ENERGY"
          iconSrc="/icon/directory_closed-0.png"
        >
          <div 
            className="desktop-folder-icon-wrapper"
            style={{ 
              position: 'relative', 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              flexShrink: 0,
              border: 'none',
              outline: 'none',
            }}
          >
            <AppIcon
              icon={{ 
                type: 'img', 
                src: '/icon/directory_closed-0.png'
              }}
              size={32}
              className="desktop-folder-icon-image"
              style={{
                imageRendering: 'pixelated',
                display: 'block',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: '14px',
              textAlign: 'center',
              width: '96px',
            }}
          >
            <span style={{ display: 'block', height: '14px', lineHeight: '14px' }}>MEMETIC</span>
            <span style={{ display: 'block', height: '14px', lineHeight: '14px' }}>ENERGY</span>
          </div>
        </DraggableFolderIcon>

        {/* Community Resources - Draggable folder */}
        <DraggableFolderIcon
          key="COMMUNITY_RESOURCES"
          iconId="COMMUNITY_RESOURCES"
          position={communityResourcesPos}
          onPositionChange={(x, y) => {
            setCommunityResourcesPos({ x, y })
            saveIconPosition('COMMUNITY_RESOURCES', x, y)
          }}
          onDoubleClick={() => {
            playSound('click')
            if (onOpenCommunityResources) {
              onOpenCommunityResources()
            }
          }}
          onClick={() => {
            playSound('click')
            if (onOpenCommunityResources) {
              onOpenCommunityResources()
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            showContextMenu(e, [
              { 
                icon: '📂', 
                label: 'Open', 
                onClick: () => {
                  if (onOpenCommunityResources) {
                    onOpenCommunityResources()
                  }
                }
              },
            ])
          }}
          className="desktop-icon-button desktop-folder-icon"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            width: '96px',
            fontFamily: "'MS Sans Serif', sans-serif",
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          }}
          title="COMMUNITY RESOURCES - Double-click to open"
          ariaLabel="COMMUNITY RESOURCES"
          iconSrc="/icon/notepad-0.png"
        >
          <div 
            className="desktop-folder-icon-wrapper"
            style={{ 
              position: 'relative', 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              flexShrink: 0,
              border: 'none',
              outline: 'none',
            }}
          >
            <AppIcon
              icon={{ 
                type: 'img', 
                src: '/icon/notepad-0.png'
              }}
              size={32}
              className="desktop-folder-icon-image"
              style={{
                imageRendering: 'pixelated',
                display: 'block',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: '14px',
              textAlign: 'center',
              width: '96px',
            }}
          >
            <span style={{ 
              display: 'block', 
              height: '14px', 
              lineHeight: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '96px',
            }}>COMMUNITY</span>
            <span style={{ 
              display: 'block', 
              height: '14px', 
              lineHeight: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '96px',
            }}>RESOURCES.TXT</span>
          </div>
        </DraggableFolderIcon>

        {/* My Favorite Wojaks - Draggable folder */}
        <DraggableFolderIcon
          key="MY_FAVORITE_WOJAKS"
          iconId="MY_FAVORITE_WOJAKS"
          position={favoriteWojaksPos}
          onPositionChange={(x, y) => {
            setFavoriteWojaksPos({ x, y })
            saveIconPosition('MY_FAVORITE_WOJAKS', x, y)
          }}
          onDoubleClick={() => {
            playSound('click')
            if (onOpenFavoriteWojaks) {
              onOpenFavoriteWojaks()
            }
          }}
          onClick={() => {
            playSound('click')
            if (onOpenFavoriteWojaks) {
              onOpenFavoriteWojaks()
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            showContextMenu(e, [
              { 
                icon: '📂', 
                label: 'Open', 
                onClick: () => {
                  if (onOpenFavoriteWojaks) {
                    onOpenFavoriteWojaks()
                  }
                }
              },
            ])
          }}
          className="desktop-icon-button desktop-folder-icon"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            width: '96px',
            fontFamily: "'MS Sans Serif', sans-serif",
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          }}
          title="MY FAVORITE WOJAKS - Double-click to open"
          ariaLabel="MY FAVORITE WOJAKS"
          iconSrc="/icon/directory_closed-0.png"
        >
          <div 
            className="desktop-folder-icon-wrapper"
            style={{ 
              position: 'relative', 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              flexShrink: 0,
              border: 'none',
              outline: 'none',
            }}
          >
            <AppIcon
              icon={{ 
                type: 'img', 
                src: '/icon/directory_closed-0.png'
              }}
              size={32}
              className="desktop-folder-icon-image"
              style={{
                imageRendering: 'pixelated',
                display: 'block',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: '14px',
              textAlign: 'center',
              width: '96px',
            }}
          >
            <span style={{ display: 'block', height: '14px', lineHeight: '14px' }}>MY FAVORITE</span>
            <span style={{ display: 'block', height: '14px', lineHeight: '14px' }}>WOJAKS</span>
          </div>
        </DraggableFolderIcon>

        {/* Recycle Bin - Draggable */}
        <DraggableFolderIcon
          key="RECYCLE_BIN"
          ref={trashBinRef}
          iconId="RECYCLE_BIN"
          position={trashBinPos}
          onPositionChange={(x, y) => {
            setTrashBinPos({ x, y })
            saveIconPosition('RECYCLE_BIN', x, y)
          }}
          onDoubleClick={() => {
            playSound('click')
            if (onOpenRecycleBin) {
              onOpenRecycleBin()
            }
          }}
          onClick={() => {
            playSound('click')
            if (onOpenRecycleBin) {
              onOpenRecycleBin()
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            showContextMenu(e, [
              { 
                icon: '📂', 
                label: 'Open', 
                onClick: () => {
                  if (onOpenRecycleBin) {
                    onOpenRecycleBin()
                  }
                }
              },
              { separator: true },
              {
                icon: '🗑️',
                label: 'Empty Recycle Bin',
                onClick: () => {
                  if (onOpenRecycleBin) {
                    onOpenRecycleBin()
                  }
                }
              },
            ])
          }}
          onMouseEnter={() => setIsRecycleBinHovered(true)}
          onMouseLeave={() => setIsRecycleBinHovered(false)}
          className={`desktop-icon-button desktop-trash-icon recycle-bin ${dragOverTrash ? 'drag-hover' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: dragOverTrash 
              ? 'rgba(255, 0, 0, 0.3)' 
              : (isRecycleBinHovered ? 'rgba(255, 255, 255, 0.1)' : 'transparent'),
            border: dragOverTrash ? '2px dashed var(--state-error)' : 'none',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            width: '96px',
            transition: 'background 0.2s, border 0.2s',
            fontFamily: "'MS Sans Serif', sans-serif",
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          }}
          title="Recycle Bin - Drag images here to delete"
          ariaLabel="Recycle Bin"
          isRecycleBin={true}
          isRecycleBinFull={isRecycleBinFull}
          dragOverTrash={dragOverTrash}
        >
          <div 
            className="desktop-folder-icon-wrapper"
            style={{ 
              position: 'relative', 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              flexShrink: 0,
              border: 'none',
              outline: 'none',
            }}
          >
            <AppIcon
              icon={{ 
                type: 'img', 
                src: isRecycleBinFull 
                  ? '/icon/recycle_bin_full_2k-0.png' 
                  : '/icon/recycle_bin_file.png' 
              }}
              size={32}
              style={{
                imageRendering: 'pixelated',
                display: 'block',
                filter: dragOverTrash ? 'drop-shadow(0 0 8px #ff0000)' : 'none',
                transition: 'filter 0.2s',
              }}
            />
          </div>
          <span
            style={{
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '96px',
              width: '96px',
              lineHeight: '14px',
              height: '14px',
              textAlign: 'center',
              color: '#fff',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
            }}
          >
            RECYCLE BIN
          </span>
        </DraggableFolderIcon>
      </div>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={hideContextMenu}
        />
      )}
    </>
  )
}
