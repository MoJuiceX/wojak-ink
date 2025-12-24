import { useState, useRef, memo, useEffect } from 'react'
import { viewImage, downloadImageFromDataUrl } from '../utils/imageUtils'
import { playSound } from '../utils/soundManager'
import { useContextMenu } from '../hooks/useContextMenu'
import { getPairImages } from '../utils/desktopUtils'
import ContextMenu from './ui/ContextMenu'
import AppIcon from './ui/AppIcon'
import './DesktopImageIcons.css'

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
      onMouseDown={(e) => onMouseDown(e, image)}
      onDoubleClick={() => onDoubleClick(imageUrl)}
      onContextMenu={(e) => onContextMenu(e, image)}
      onClick={(e) => onClick(e, image.id)}
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

  const handleDoubleClick = (imageDataUrl) => {
    if (imageDataUrl) {
      viewImage(imageDataUrl)
    }
  }

  // Determine if Recycle Bin is full (has items)
  const isRecycleBinFull = recycleBin.length > 0

  // Calculate Recycle Bin position (bottom right, fixed) - update on window resize
  const [trashBinPos, setTrashBinPos] = useState({ x: window.innerWidth - 116, y: window.innerHeight - 86 })
  
  useEffect(() => {
    const updateTrashBinPos = () => {
      setTrashBinPos({ x: window.innerWidth - 116, y: window.innerHeight - 86 })
    }
    
    window.addEventListener('resize', updateTrashBinPos)
    return () => window.removeEventListener('resize', updateTrashBinPos)
  }, [])

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
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
              onClick={(e) => {
                // Only handle click if not dragging
                if (!isDragging) {
                  handleIconClick(e, image.id)
                }
              }}
              onMouseEnter={setHoveredImageId}
              onMouseLeave={() => setHoveredImageId(null)}
            />
          )
        })}

        {/* Recycle Bin - Fixed position at bottom right */}
        <button
          ref={trashBinRef}
          className={`desktop-icon-button desktop-trash-icon recycle-bin ${dragOverTrash ? 'drag-hover' : ''}`}
          onDoubleClick={() => {
            playSound('click')
            if (onOpenRecycleBin) {
              onOpenRecycleBin()
            }
          }}
          onClick={() => playSound('click')}
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
          style={{
            position: 'absolute',
            left: `${trashBinPos.x}px`,
            top: `${trashBinPos.y}px`,
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
            pointerEvents: 'auto',
            transition: 'background 0.2s, border 0.2s',
            fontFamily: "'MS Sans Serif', sans-serif",
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          }}
          title="Recycle Bin - Drag images here to delete"
          aria-label="Recycle Bin"
        >
          <div style={{ 
            position: 'relative', 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            minWidth: '32px',
            minHeight: '32px',
            flexShrink: 0,
          }}>
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
              color: '#fff',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
              textAlign: 'center',
            }}
          >
            Recycle Bin
          </span>
        </button>
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
