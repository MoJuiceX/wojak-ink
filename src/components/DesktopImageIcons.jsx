import React, { useState, useRef, memo, useEffect, useMemo } from 'react'
import { viewImage, downloadImageFromDataUrl, downloadBlobUrlAsPNG, blobUrlToDataUrl } from '../utils/imageUtils'
import { addFavoriteWojak } from '../utils/desktopStorage'
import { playSound } from '../utils/soundManager'
import { useContextMenu } from '../hooks/useContextMenu'
import { getPairImages } from '../utils/desktopUtils'
import ContextMenu from './ui/ContextMenu'
import AppIcon from './ui/AppIcon'
import { useDraggableIcon } from '../hooks/useDraggableIcon'
import { loadIconPositions, saveIconPosition } from '../utils/iconPositionStorage'
import { snapToGrid, isGridSnappingEnabled } from '../utils/iconGrid'
import MarqueeSelection from './desktop/MarqueeSelection'
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
  dragOverTrash = false,
  selectedIconIds = [], // Pass selectedIconIds to check for group drag
  isGroupDragging = false, // Pass group drag state
  setSelectedIconIds = null, // Pass setSelectedIconIds directly for mousedown handling
  onDragOver = null, // Optional drag over handler
  onDrop = null, // Optional drop handler
  onDragLeave = null // Optional drag leave handler
}, ref) {
  React.useEffect(() => {
    // Component lifecycle tracking removed
  }, [iconId])
  // Remove isDragging state to avoid React re-renders during drag (performance optimization)
  // The hook manages dragging state internally via dataset.dragging and CSS classes
  const buttonElementRef = React.useRef(null)
  const isInitialMountRef = React.useRef(true)
  
  // Track if HTML5 drag is in progress to prevent positioning drag interference
  const html5DragRef = React.useRef(false)

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
    console.log('[DesktopImageIcons] DraggableFolderIcon handleClick ENTRY', { iconId, target: e.target.tagName, currentTarget: e.currentTarget?.tagName, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, hasSetSelectedIconIds: !!setSelectedIconIds })
    
    // Get the button element - use currentTarget (the button) not target (might be child element)
    const buttonEl = e.currentTarget
    // Also try to find the button by climbing up from target if currentTarget isn't the button
    const actualButton = buttonEl?.tagName === 'BUTTON' ? buttonEl : e.target.closest('button[data-icon-id]')
    
    // Check modifier keys from the click event (they should be present here)
    const clickShiftKey = e.shiftKey
    const clickCtrlKey = e.ctrlKey
    const clickMetaKey = e.metaKey
    const clickIsMultiSelectKey = clickShiftKey || clickCtrlKey || clickMetaKey
    
    // Also check stored modifier keys from mousedown (as fallback)
    const storedModifierKeys = typeof window !== 'undefined' && window.__lastMousedownModifierKeys
    const storedIsMultiSelectKey = storedModifierKeys && (
      storedModifierKeys.shiftKey || storedModifierKeys.ctrlKey || storedModifierKeys.metaKey
    ) && storedModifierKeys.iconId === iconId && (Date.now() - storedModifierKeys.timestamp) < 1000
    
    // Use click event modifier keys first, fallback to stored if click doesn't have them
    const finalIsMultiSelectKey = clickIsMultiSelectKey || storedIsMultiSelectKey
    
    const logData = {
      iconId,
      isDragging: buttonEl?.dataset.dragging === 'true',
      selectionHandledInMousedown: buttonEl?.dataset.selectionHandledInMousedown === 'true',
      actualButtonSelectionHandled: actualButton?.dataset.selectionHandledInMousedown === 'true',
      hasOnClick: !!onClick,
      target: e.target.tagName,
      currentTarget: e.currentTarget?.tagName,
      actualButtonTag: actualButton?.tagName,
      clickShiftKey,
      clickCtrlKey,
      clickMetaKey,
      clickIsMultiSelectKey,
      storedIsMultiSelectKey,
      finalIsMultiSelectKey,
      timestamp: Date.now()
    }
    console.log('[DesktopImageIcons] DraggableFolderIcon handleClick', logData)
    
    // If dragging flag is set, prevent click
    if (buttonEl?.dataset.dragging === 'true') {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    // CRITICAL: If modifier keys are present in click event, handle selection here
    // This is the same approach as image icons - check modifier keys in click, not mousedown
    // IMPORTANT: We handle selection here, NOT in the parent's onClick prop
    // This prevents double-handling of selection
    if (finalIsMultiSelectKey && setSelectedIconIds) {
      console.log('[DesktopImageIcons] Multi-select key detected in click - handling selection in DraggableFolderIcon', { iconId, finalIsMultiSelectKey, clickIsMultiSelectKey, storedIsMultiSelectKey })
      // Handle selection directly - toggle this icon in the selection
      setSelectedIconIds(prev => {
        const newSelection = prev.includes(iconId)
          ? prev.filter(id => id !== iconId)
          : [...prev, iconId]
        console.log('[DesktopImageIcons] Multi-select update in click - DraggableFolderIcon', { iconId, prevSelection: prev, newSelection, wasIncluded: prev.includes(iconId), newSelectionLength: newSelection.length, isFolderIcon: true })
        return newSelection
      })
      // Stop propagation to prevent desktop onClick from clearing selection
      e.stopPropagation()
      // CRITICAL: Don't call parent's onClick prop - we've already handled selection here
      // The parent's onClick handlers also try to handle selection, which would cause conflicts
      return
    }
    
    // If no modifier keys, check if this is a single click for selection
    // Only handle single selection if setSelectedIconIds is available and onClick prop doesn't handle it
    // But actually, the parent's onClick handlers handle single selection, so we should call them
    // However, we need to ensure the parent's onClick doesn't interfere with multi-select
    // For now, let's always call the parent's onClick for single clicks (no modifier keys)
    
    // If selection was already handled in mousedown (when modifier keys were pressed), skip it here
    // Check both buttonEl and actualButton to handle cases where target is a child element
    const selectionHandled = buttonEl?.dataset.selectionHandledInMousedown === 'true' || 
                             actualButton?.dataset.selectionHandledInMousedown === 'true'
    if (selectionHandled) {
      console.log('[DesktopImageIcons] Selection already handled in mousedown - skipping onClick', { iconId, selectionHandled, buttonElFlag: buttonEl?.dataset.selectionHandledInMousedown, actualButtonFlag: actualButton?.dataset.selectionHandledInMousedown })
      // Clear the flag on both elements
      if (buttonEl) buttonEl.dataset.selectionHandledInMousedown = 'false'
      if (actualButton) actualButton.dataset.selectionHandledInMousedown = 'false'
      // Selection was already handled in mousedown, so don't call onClick again
      // But still stop propagation to prevent desktop onClick from clearing selection
      e.stopPropagation()
      return
    }
    if (onClick) {
      onClick(e)
    }
  }
  
  // Wrapper for mouseDown events
  const handleMouseDownWrapper = (e) => {
    // Check modifier keys from the event AND from global keyboard state (as fallback)
    // Sometimes the event doesn't have modifier keys, but we can check the global state
    const eventShiftKey = e.shiftKey
    const eventCtrlKey = e.ctrlKey
    const eventMetaKey = e.metaKey
    // Fallback: check global keyboard state (this is a workaround for when event doesn't have modifier keys)
    const globalShiftKey = typeof window !== 'undefined' && (window.event?.shiftKey || false)
    const globalCtrlKey = typeof window !== 'undefined' && (window.event?.ctrlKey || false)
    const globalMetaKey = typeof window !== 'undefined' && (window.event?.metaKey || false)
    // Use event keys first, fallback to global if event keys are false
    const shiftKey = eventShiftKey || globalShiftKey
    const ctrlKey = eventCtrlKey || globalCtrlKey
    const metaKey = eventMetaKey || globalMetaKey
    const isMultiSelectKey = shiftKey || ctrlKey || metaKey
    
    const selectedCount = selectedIconIds?.length || 0
    const isThisIconSelected = selectedIconIds?.includes(iconId)
    const hasSetSelectedIconIds = !!setSelectedIconIds
    const logData = {
      iconId,
      selectedCount,
      isThisIconSelected,
      isGroupDragging,
      isMultiSelectKey,
      hasSetSelectedIconIds,
      eventShiftKey,
      eventCtrlKey,
      eventMetaKey,
      globalShiftKey,
      globalCtrlKey,
      globalMetaKey,
      finalShiftKey: shiftKey,
      finalCtrlKey: ctrlKey,
      finalMetaKey: metaKey,
      willStartIndividualDrag: selectedCount <= 1 || !isThisIconSelected || isGroupDragging,
      willHandleMultiSelect: isMultiSelectKey && hasSetSelectedIconIds,
      timestamp: Date.now()
    }
    console.log('[DesktopImageIcons] DraggableFolderIcon handleMouseDownWrapper', logData)
    
    // If multiple icons are selected and this icon is selected, don't start individual drag
    // Let group drag handle it instead (group drag uses capture phase so it fires first)
    if (selectedCount > 1 && isThisIconSelected && !isGroupDragging) {
      console.log('[DesktopImageIcons] Skipping individual drag - group drag will handle', { iconId, selectedCount })
      // Don't call handleMouseDown - let group drag handle it
      // Don't stop propagation - let the group drag capture phase listener catch it
      return
    }
    
    // CRITICAL FIX: Store modifier key state for use in click handler
    // Even if modifier keys aren't detected in mousedown, they might be in click
    if (typeof window !== 'undefined') {
      window.__lastMousedownModifierKeys = {
        shiftKey: shiftKey,
        ctrlKey: ctrlKey,
        metaKey: metaKey,
        iconId: iconId,
        timestamp: Date.now()
      }
    }
    
    // CRITICAL: If modifier keys are detected, skip handleMouseDown to allow click to fire
    // useDraggableIcon's handleMouseDown calls e.preventDefault(), which prevents click events
    if (isMultiSelectKey) {
      console.log('[DesktopImageIcons] Multi-select key detected in mousedown - skipping handleMouseDown to allow click event', { iconId, isMultiSelectKey, shiftKey, ctrlKey, metaKey })
      // Don't call handleMouseDown - this allows the click event to fire with modifier keys
      // The handleClick will handle the selection (like image icons do)
      // If the user actually drags, the group drag handler will catch it
      return
    }
    
    // CRITICAL: Even if modifier keys aren't detected in mousedown, they might be in click
    // But if we call handleMouseDown, it will call e.preventDefault() and prevent the click
    // Solution: Skip handleMouseDown if we think this might be a selection click
    // We can detect this by checking if other icons are already selected
    // If other icons are selected, user is likely trying to multi-select
    const mightBeSelectionClick = selectedCount > 0 || isThisIconSelected
    
    if (mightBeSelectionClick && !isGroupDragging) {
      console.log('[DesktopImageIcons] Might be selection click - skipping handleMouseDown to allow click', { iconId, mightBeSelectionClick, selectedCount, isThisIconSelected })
      // Don't call handleMouseDown - allow click to fire
      // If user actually drags, group drag will handle it
      return
    }
    
    // CRITICAL FIX: Always allow click events to fire, even when dragging might occur
    // The problem: useDraggableIcon's handleMouseDown calls e.preventDefault(), which prevents click events
    // Solution: Store modifier key state in a ref, and check it in handleClick
    // This way, even if handleMouseDown is called, we can still handle selection in click
    // Store modifier key state for use in click handler
    if (typeof window !== 'undefined') {
      window.__lastMousedownModifierKeys = {
        shiftKey: shiftKey,
        ctrlKey: ctrlKey,
        metaKey: metaKey,
        iconId: iconId,
        timestamp: Date.now()
      }
    }
    
    // If modifier keys are detected, don't call handleMouseDown to allow click to fire
    // But if modifier keys aren't detected in mousedown, we still need to allow click to check them
    // So we'll always allow click to fire, but skip handleMouseDown if modifier keys are present
    if (isMultiSelectKey) {
      console.log('[DesktopImageIcons] Multi-select key detected in mousedown - skipping handleMouseDown to allow click event', { iconId, isMultiSelectKey, shiftKey, ctrlKey, metaKey })
      // Don't call handleMouseDown - this allows the click event to fire with modifier keys
      // The onClick handler will handle the selection (like image icons do)
      // If the user actually drags, the group drag handler will catch it
      return
    }
    
    // Even if modifier keys aren't detected in mousedown, they might be in click
    // So we need to ensure click can fire. But useDraggableIcon's handleMouseDown calls e.preventDefault()
    // Solution: Don't call handleMouseDown if we want to allow clicks for selection
    // But we still need drag to work... so we need a different approach
    
    // NEW APPROACH: Always call handleMouseDown, but modify useDraggableIcon to not prevent default
    // Actually, that's not possible without modifying the hook. So instead:
    // Check if this might be a selection click (no drag movement) and skip handleMouseDown
    // But we can't know if it's a click vs drag until mouseup...
    
    // BETTER APPROACH: Check modifier keys in click event, not mousedown
    // But click won't fire if handleMouseDown calls e.preventDefault()
    // So we need to conditionally call handleMouseDown based on whether we think it's a selection click
    
    // For now, let's try: if no modifier keys detected, call handleMouseDown normally
    // But also store the modifier key state so click can check it
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


  // Track drag over state for visual feedback
  const [isDragOver, setIsDragOver] = React.useState(false)

  // Handle drag over
  const handleDragOver = (e) => {
    if (onDragOver) {
      onDragOver(e)
    } else {
      // Default behavior: allow drop if it's image data
      const hasImageData = e.dataTransfer.types.includes('application/json') || 
                          e.dataTransfer.types.includes('text/plain')
      if (hasImageData) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
        setIsDragOver(true)
      }
    }
  }

  // Handle drag leave
  const handleDragLeave = (e) => {
    if (onDragLeave) {
      onDragLeave(e)
    } else {
      // Only clear drag over if we're actually leaving the button
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setIsDragOver(false)
      }
    }
  }

  // Handle drop
  const handleDrop = (e) => {
    setIsDragOver(false)
    if (onDrop) {
      onDrop(e)
    }
  }

  return (
    <button
      ref={buttonRef}
      data-icon-type={isRecycleBin ? "recycle-bin" : "folder"}
      data-icon-id={iconId}
      className={className}
      onMouseDown={handleMouseDownWrapper}
      onTouchStart={handleTouchStart}
      onDragStart={(e) => e.preventDefault()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        backgroundColor: isDragOver ? 'rgba(0, 120, 215, 0.3)' : (style?.backgroundColor || 'transparent'),
        transition: isDragOver ? 'background-color 0.2s' : 'none',
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
  // Track if HTML5 drag is in progress to prevent positioning drag interference
  const html5DragRef = React.useRef(false)
  
  const imageUrl = image.image || image.imageDataUrl
  const imageName = image.name || image.filename
  const position = image.position || { x: 0, y: 0 }
  const renderLogData = {
    imageId: image.id,
    hasImageUrl: !!imageUrl,
    imageUrlType: typeof imageUrl,
    hasImage: !!image.image,
    hasImageDataUrl: !!image.imageDataUrl,
    hasOnDoubleClick: !!onDoubleClick,
    hasOnClick: !!onClick,
    hasOnMouseDown: !!onMouseDown,
    position: position,
    timestamp: Date.now()
  }
  
  // CRITICAL: Don't set key here - the parent component (DesktopImageIcons) sets the key
  // Setting key here can cause duplicate key errors if multiple icons have the same id
  // We only need data-icon-id for selection/drag functionality
  const iconId = image.id !== undefined && image.id !== null && image.id !== ''
    ? image.id 
    : `icon-${image.name || 'unknown'}`
  
  return (
    <button
      // NO KEY HERE - parent handles key uniqueness
      data-icon-id={iconId}
      onMouseDown={(e) => {
        // Check if the click originated from the image (which handles HTML5 drag)
        // If so, don't start the positioning drag - let HTML5 drag work
        const target = e.target
        const isImageClick = target.tagName === 'IMG' || 
                            target.closest('.desktop-image-icon-thumbnail img') ||
                            target.closest('img')
        if (isImageClick || html5DragRef.current) {
          // Image will handle its own HTML5 drag - don't interfere with positioning drag
          // Don't call onMouseDown which would start the positioning drag and prevent HTML5 drag
          // Don't stop propagation here - let the image's handler do it
          return
        }
        // Don't stop propagation immediately - let handleMouseDown decide
        // This allows double-click events to work properly
        onMouseDown(e, image)
        // Only stop propagation if we're actually starting a drag (handled in handleMouseDown)
      }}
      onDoubleClick={(e) => {
        console.log('[DesktopIcon] onDoubleClick fired', { imageId: image.id, hasOnDoubleClick: !!onDoubleClick, hasImageUrl: !!imageUrl, imageUrlType: typeof imageUrl, hasImage: !!image.image, hasImageDataUrl: !!image.imageDataUrl, image: image });
        
        // CRITICAL: Mark that double-click occurred to prevent drag
        // This must happen BEFORE calling the parent callback
        // Use window global to communicate with handleMouseMove
        if (typeof window !== 'undefined') {
          window.__lastDoubleClickIconId = image.id
          window.__lastDoubleClickTime = Date.now()
          console.log('[DesktopIcon] Marked double-click in window', { imageId: image.id });
        }
        
        e.stopPropagation()
        e.preventDefault() // Prevent default to ensure our handler runs
        
        // Get the actual image URL from the image object directly (don't rely on imageUrl prop)
        // This ensures we always have the URL even if imageUrl is undefined
        const actualImageUrl = imageUrl || image.image || image.imageDataUrl
        const actualImageName = imageName || image.name || image.filename
        
        console.log('[DesktopIcon] Resolved image data', { imageId: image.id, actualImageUrl: actualImageUrl?.substring(0, 50), actualImageName, hasActualImageUrl: !!actualImageUrl });
        
        // Always call onDoubleClick - pass the resolved URL
        if (onDoubleClick) {
          console.log('[DesktopIcon] Calling onDoubleClick callback', { imageId: image.id, actualImageUrl: actualImageUrl?.substring(0, 50), actualImageName });
          // Pass the resolved URL - parent will use it directly
          onDoubleClick(actualImageUrl, actualImageName)
        } else {
          console.warn('[DesktopIcon] onDoubleClick callback not provided', { imageId: image.id });
        }
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
        onContextMenu(e, image)
      }}
      onClick={(e) => {
        const logData = {
          imageId: image.id,
          hasOnClick: !!onClick,
          target: e.target.tagName,
          currentTarget: e.currentTarget?.tagName,
          targetClass: e.target.className,
          currentTargetClass: e.currentTarget?.className,
          isImageIcon: true,
          detail: e.detail,
          timestamp: Date.now()
        }
        console.log('[DesktopIcon] onClick fired', logData)
        // Don't stop propagation - let the parent handle it
        // The parent's handleIconClick will manage selection
        // If this is part of a double-click, don't process as single click
        if (e.detail === 2) {
          console.log('[DesktopIcon] onClick skipped - part of double-click', { imageId: image.id })
          return
        }
        if (onClick) {
          onClick(e, image.id)
        } else {
        }
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
            pointerEvents: 'auto',
            cursor: 'grab',
          }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
          draggable={true}
          onMouseDown={(e) => {
            // Mark that we're starting HTML5 drag to prevent positioning drag
            html5DragRef.current = true
            // Stop propagation so button's onMouseDown doesn't interfere
            e.stopPropagation()
            // Don't prevent default - we need the native drag behavior to work
            // Reset the flag after a short delay in case drag doesn't start
            setTimeout(() => {
              if (!e.currentTarget.dataset.dragging) {
                html5DragRef.current = false
              }
            }, 100)
          }}
          onDragStart={(e) => {
            // Store the image data in dataTransfer for dropping into folders
            const imageData = {
              id: image.id,
              name: image.name || image.filename,
              image: image.image || image.imageDataUrl,
              dataUrl: image.imageDataUrl || image.image,
              type: image.type || 'wojak',
              layers: image.layers,
              pairId: image.pairId
            }
            e.dataTransfer.setData('application/json', JSON.stringify(imageData))
            e.dataTransfer.effectAllowed = 'copy'
            // Also set text/plain for compatibility
            e.dataTransfer.setData('text/plain', image.name || image.id)
            e.stopPropagation() // Don't interfere with icon positioning
            // Mark that HTML5 drag is active
            html5DragRef.current = true
            if (e.currentTarget) {
              e.currentTarget.dataset.html5Drag = 'true'
            }
          }}
          onDragEnd={(e) => {
            // Clean up drag state
            e.stopPropagation()
            html5DragRef.current = false
            if (e.currentTarget) {
              delete e.currentTarget.dataset.html5Drag
            }
          }}
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
  onRemoveFromDesktop = null, // Optional callback to remove from desktop without recycling
  onUpdatePosition,
  onOpenRecycleBin,
  onOpenFavoriteWojaks,
  onOpenMemeticEnergy,
  onOpenCommunityResources,
  onViewImage,
  selectedIconIds = [],
  setSelectedIconIds,
  onShowProperties,
  recycleBin = [], // Pass recycleBin to determine empty/full state
  onSelectIcon, // Optional callback for icon selection
  onAddToFavorites = null // Optional callback to add wojak to favorites
}) {
  useEffect(() => {
    
    // Check DOM element visibility and position
    const checkVisibility = (label) => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      const desktop = document.querySelector('.desktop');
      const desktopWrapper = desktop?.parentElement;
    };
    
    // Check immediately
    checkVisibility('on mount');
    
    // Monitor for position/visibility changes using MutationObserver and ResizeObserver
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          checkVisibility(`mutation: ${mutation.attributeName}`);
        }
      });
    });
    
    const resizeObserver = new ResizeObserver(() => {
      checkVisibility('resize detected');
    });
    
    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true
      });
      resizeObserver.observe(containerRef.current);
    }
    
    // Also observe desktop container for changes
    const desktop = document.querySelector('.desktop');
    if (desktop) {
      mutationObserver.observe(desktop, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      resizeObserver.observe(desktop);
    }
    
    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);
  
  useEffect(() => {
    
    // Check visibility when desktopImages changes
    if (containerRef.current) {
      setTimeout(() => {
        const el = containerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
        }
      }, 100);
    }
  }, [desktopImages]);
  const [draggedImageId, setDraggedImageId] = useState(null)
  const [dragOverTrash, setDragOverTrash] = useState(false)
  const [hoveredImageId, setHoveredImageId] = useState(null)
  const [isRecycleBinHovered, setIsRecycleBinHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [draggingIconId, setDraggingIconId] = useState(null)
  const [isGroupDragging, setIsGroupDragging] = useState(false) // Track if dragging selected group
  const dragRef = useRef({ startX: 0, startY: 0, iconX: 0, iconY: 0 })
  const trashBinRef = useRef(null) // Ref to Recycle Bin element for hit testing
  const containerRef = useRef(null) // Ref to container for marquee selection
  const desktopRefForGroupDrag = useRef(null) // Ref to desktop element for group drag (passed from parent)
  const folderIconRefs = useRef({}) // Refs to folder icons for marquee selection
  const groupDragStartRef = useRef({ x: 0, y: 0, iconPositions: {}, desktopRect: null }) // Store initial positions for group drag
  const isGroupDraggingRef = useRef(false)
  const lastClickRef = useRef({ time: 0, iconId: null }) // Track last click for double-click detection
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
    const logData = {
      imageId,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      currentSelection: selectedIconIds,
      timestamp: Date.now()
    }
    console.log('[DesktopImageIcons] handleIconClick called', logData)
    
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedIconIds(prev => {
        const newSelection = prev.includes(imageId)
          ? prev.filter(id => id !== imageId)
          : [...prev, imageId]
        console.log('[DesktopImageIcons] Multi-select toggle', {
          imageId,
          wasSelected: prev.includes(imageId),
          oldSelection: prev,
          newSelection
        })
        return newSelection
      })
    } else {
      // Select single
      console.log('[DesktopImageIcons] Single select', {
        imageId,
        newSelection: [imageId]
      })
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
    // Don't start drag on right-click (context menu)
    // Allow modifier keys for multi-select (they're handled in onClick)
    if (e.button !== 0) {
      console.log('[DesktopImageIcons] handleMouseDown early return - right click', { iconId: icon.id });
      return
    }
    
    // CRITICAL FIX: Don't start drag on double-click
    // Check if this is a potential double-click by looking at timing
    const now = Date.now()
    const lastClick = lastClickRef.current
    const timeSinceLastClick = now - lastClick.time
    const isPotentialDoubleClick = timeSinceLastClick < 400 && lastClick.iconId === icon.id
    
    if (isPotentialDoubleClick) {
      console.log('[DesktopImageIcons] handleMouseDown early return - potential double-click detected', { iconId: icon.id, timeSinceLastClick, lastClickIconId: lastClick.iconId });
      // Don't set up drag listeners - let double-click event fire naturally
      // Reset click tracking so double-click can be handled
      lastClickRef.current = { time: 0, iconId: null }
      return
    }
    
    // Don't start individual drag if multiple icons are selected and this icon is selected
    // (let group drag handle it)
    if (selectedIconIds.length > 1 && selectedIconIds.includes(icon.id)) {
      console.log('[DesktopImageIcons] handleMouseDown early return - group drag', { iconId: icon.id });
      return
    }
    
    // Update last click time for double-click detection
    // This happens after we've confirmed it's not a potential double-click
    // 'now' was already declared in the double-click detection block above
    lastClickRef.current = { time: now, iconId: icon.id }
    
    // Don't prevent default - allow normal click behavior for selection
    // Only start dragging after mouse moves
    let hasMoved = false
    const startX = e.clientX
    const startY = e.clientY
    const threshold = 5 // pixels to move before starting drag
    let wasOverTrash = false
    
    // DON'T set isDragging immediately - only set it after mouse moves
    // This allows clicks to work properly
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      iconX: icon.position?.x || 0,
      iconY: icon.position?.y || 0,
      iconId: icon.id // Store icon ID for double-click detection
    }
    
    const handleMouseMove = (e) => {
      // Check if double-click occurred for this icon - if so, cancel drag
      if (typeof window !== 'undefined' && 
          window.__lastDoubleClickIconId === icon.id && 
          Date.now() - (window.__lastDoubleClickTime || 0) < 500) {
        console.log('[DesktopImageIcons] handleMouseMove - double-click detected, canceling drag', { iconId: icon.id });
        // Clean up listeners
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        // Clear double-click flag
        window.__lastDoubleClickIconId = null
        window.__lastDoubleClickTime = 0
        return
      }
      
      const deltaX = Math.abs(e.clientX - startX)
      const deltaY = Math.abs(e.clientY - startY)
      
      // Only start dragging if mouse moved beyond threshold
      if (!hasMoved && (deltaX > threshold || deltaY > threshold)) {
        hasMoved = true
        setIsDragging(true)
        setDraggingIconId(icon.id)
        e.preventDefault()
        e.stopPropagation()
        // Now stop propagation on the original mousedown event
        // This prevents clicks from firing when dragging
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
        let clampedX = Math.max(0, Math.min(newX, window.innerWidth - 100))
        let clampedY = Math.max(0, Math.min(newY, window.innerHeight - 100))
        
        // Apply grid snapping
        if (isGridSnappingEnabled()) {
          const snapped = snapToGrid(clampedX, clampedY)
          clampedX = Math.round(snapped.x)
          clampedY = Math.round(snapped.y)
        }
        
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
      
      // Only reset dragging state if we were actually dragging
      if (hasMoved) {
        setIsDragging(false)
        setDraggingIconId(null)
        setDragOverTrash(false)
      } else {
        // If we didn't move, this was just a click - update last click time for double-click detection
        const now = Date.now()
        lastClickRef.current = { time: now, iconId: icon.id }
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDoubleClick = (imageDataUrl, filename) => {
    console.log('[DesktopImageIcons] handleDoubleClick called', { hasImageDataUrl: !!imageDataUrl, imageDataUrlType: typeof imageDataUrl, imageDataUrlLength: imageDataUrl?.length, filename });
    if (!imageDataUrl) {
      console.warn('[DesktopImageIcons] handleDoubleClick - no imageDataUrl provided', { filename });
      console.warn('[DesktopImageIcons] No image data URL provided')
      return
    }
    
    // Validate it's an image URL (data URL, blob URL, or regular URL)
    // Don't be too strict - allow blob URLs and regular URLs too
    const isImageUrl = imageDataUrl.startsWith('data:image/') || 
                       imageDataUrl.startsWith('blob:') ||
                       imageDataUrl.startsWith('http://') ||
                       imageDataUrl.startsWith('https://') ||
                       imageDataUrl.startsWith('/')
    
    if (!isImageUrl) {
      console.warn('[DesktopImageIcons] Invalid image URL format:', imageDataUrl?.substring(0, 50))
      // Don't return - try to open it anyway, might still work
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
      // Desktop: download the image automatically
      const downloadFilename = filename || 'wojak.png'
      
      if (imageDataUrl.startsWith('blob:')) {
        // Handle blob URLs
        downloadBlobUrlAsPNG(imageDataUrl, downloadFilename).catch((error) => {
          console.error('Error downloading blob URL:', error)
          // Fallback: try to convert to data URL first
          blobUrlToDataUrl(imageDataUrl).then((dataUrl) => {
            downloadImageFromDataUrl(dataUrl, downloadFilename)
          }).catch((err) => {
            console.error('Error converting blob to data URL:', err)
          })
        })
      } else if (imageDataUrl.startsWith('data:image/')) {
        // Handle data URLs
        downloadImageFromDataUrl(imageDataUrl, downloadFilename)
      } else {
        // Handle regular URLs - fetch and download
        fetch(imageDataUrl)
          .then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = downloadFilename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
          })
          .catch((error) => {
            console.error('Error downloading image from URL:', error)
          })
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
  
  // Calculate default positions from bottom right corner
  // Layout: Recycle Bin (bottom), Memetic Energy (above Recycle Bin), My Favorite Wojaks (top)
  // Community Resources is now positioned under Roadmap on the left side (handled in DesktopIcons)
  // Positions are calculated relative to viewport so icons stay visible when console opens
  const calculateDefaultPositions = () => {
    // Recycle Bin (bottom) - positioned at bottom right
    const recycleBinY = window.innerHeight - TASKBAR_HEIGHT - BOTTOM_MARGIN - ICON_HEIGHT
    const recycleBinX = window.innerWidth - RIGHT_MARGIN - ICON_WIDTH
    
    // Memetic Energy (above Recycle Bin - swapped with My Favorite Wojaks)
    const memeticEnergyY = recycleBinY - GRID_SIZE_Y
    
    // My Favorite Wojaks (above Memetic Energy - swapped position, now at top)
    const favoriteWojaksY = memeticEnergyY - GRID_SIZE_Y
    
    return {
      trashBin: snapToGrid(recycleBinX, recycleBinY),
      favoriteWojaks: snapToGrid(recycleBinX, favoriteWojaksY),
      memeticEnergy: snapToGrid(recycleBinX, memeticEnergyY),
    }
  }
  
  // Initialize state with saved positions from localStorage, preventing recalculation on remount
  // Load saved positions in lazy initializer to ensure we always use persisted positions if they exist
  // Also save default positions immediately if they don't exist, to prevent position changes on remount
  const [memeticEnergyPos, setMemeticEnergyPos] = useState(() => {
    const saved = loadIconPositions()
    if (saved.MEMETIC_ENERGY) {
      // Normalize loaded position to grid
      const normalized = snapToGrid(saved.MEMETIC_ENERGY.x, saved.MEMETIC_ENERGY.y)
      return { x: Math.round(normalized.x), y: Math.round(normalized.y) }
    }
    const defaults = calculateDefaultPositions()
    // Save default position immediately to prevent recalculation on remount
    saveIconPosition('MEMETIC_ENERGY', defaults.memeticEnergy.x, defaults.memeticEnergy.y)
    return defaults.memeticEnergy
  })
  // Community Resources is now handled by DesktopIcons (moved to left side under Roadmap)
  const [favoriteWojaksPos, setFavoriteWojaksPos] = useState(() => {
    const saved = loadIconPositions()
    if (saved.MY_FAVORITE_WOJAKS) {
      // Normalize loaded position to grid
      const normalized = snapToGrid(saved.MY_FAVORITE_WOJAKS.x, saved.MY_FAVORITE_WOJAKS.y)
      return { x: Math.round(normalized.x), y: Math.round(normalized.y) }
    }
    const defaults = calculateDefaultPositions()
    // Save default position immediately to prevent recalculation on remount
    saveIconPosition('MY_FAVORITE_WOJAKS', defaults.favoriteWojaks.x, defaults.favoriteWojaks.y)
    return defaults.favoriteWojaks
  })
  const [trashBinPos, setTrashBinPos] = useState(() => {
    const saved = loadIconPositions()
    if (saved.RECYCLE_BIN) {
      // Normalize loaded position to grid
      const normalized = snapToGrid(saved.RECYCLE_BIN.x, saved.RECYCLE_BIN.y)
      return { x: Math.round(normalized.x), y: Math.round(normalized.y) }
    }
    const defaults = calculateDefaultPositions()
    // Save default position immediately to prevent recalculation on remount
    saveIconPosition('RECYCLE_BIN', defaults.trashBin.x, defaults.trashBin.y)
    return defaults.trashBin
  })
  
  // Load saved positions for resize handler (reload on every check to get latest)
  const savedPositions = loadIconPositions()

  // Update positions on window resize if they haven't been manually moved (not saved)
  // This ensures icons stay visible when console opens or viewport changes
  // Throttle resize handler to prevent icon positions from jumping when windows open
  useEffect(() => {
    let resizeTimeout = null
    let lastResizeTime = 0
    const RESIZE_THROTTLE_MS = 300 // Throttle resize events to prevent icon jumping
    
    const handleResize = () => {
      const now = Date.now()
      const timeSinceLastResize = now - lastResizeTime
      
      // Clear any pending resize
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      
      // Only process if enough time has passed or throttle period elapsed
      if (timeSinceLastResize >= RESIZE_THROTTLE_MS) {
        lastResizeTime = now
        // Only update if position hasn't been saved (user hasn't moved it)
        if (!savedPositions.MEMETIC_ENERGY) {
          const newDefaults = calculateDefaultPositions()
          setMemeticEnergyPos(newDefaults.memeticEnergy)
        }
        // Community Resources is now handled by DesktopIcons
        if (!savedPositions.MY_FAVORITE_WOJAKS) {
          const newDefaults = calculateDefaultPositions()
          setFavoriteWojaksPos(newDefaults.favoriteWojaks)
        }
        if (!savedPositions.RECYCLE_BIN) {
          const newDefaults = calculateDefaultPositions()
          setTrashBinPos(newDefaults.trashBin)
        }
      } else {
        // Throttle: wait until the throttle period has elapsed
        resizeTimeout = setTimeout(() => {
          lastResizeTime = Date.now()
          // Only update if position hasn't been saved (user hasn't moved it)
          if (!savedPositions.MEMETIC_ENERGY) {
            const newDefaults = calculateDefaultPositions()
            setMemeticEnergyPos(newDefaults.memeticEnergy)
          }
          // Community Resources is now handled by DesktopIcons
          if (!savedPositions.MY_FAVORITE_WOJAKS) {
            const newDefaults = calculateDefaultPositions()
            setFavoriteWojaksPos(newDefaults.favoriteWojaks)
          }
          if (!savedPositions.RECYCLE_BIN) {
            const newDefaults = calculateDefaultPositions()
            setTrashBinPos(newDefaults.trashBin)
          }
        }, RESIZE_THROTTLE_MS - timeSinceLastResize)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
    }
  }, [savedPositions])

  // Handle group drag (dragging selected icons together)
  useEffect(() => {
    if (selectedIconIds.length <= 1) {
      setIsGroupDragging(false)
      isGroupDraggingRef.current = false
      return
    }

    const handleGroupDragStart = (e) => {
      // Only handle if multiple icons are selected
      if (selectedIconIds.length <= 1) return
      
      // Check if dragging a selected icon
      const target = e.target.closest('[data-icon-id]')
      if (!target) return
      
      const iconId = target.getAttribute('data-icon-id')
      console.log('[DesktopImageIcons] Group drag start - checking icon', { iconId, selectedIconIds, isSelected: selectedIconIds.includes(iconId), selectedCount: selectedIconIds.length, isFolderIcon: ['MEMETIC_ENERGY','MY_FAVORITE_WOJAKS','RECYCLE_BIN'].includes(iconId) })
      if (!selectedIconIds.includes(iconId)) return
      
      console.log('[DesktopImageIcons] Group drag start detected', { iconId, selectedIconIds, selectedCount: selectedIconIds.length })
      
      // Prevent individual drag from starting - group drag will handle it
      e.stopPropagation()
      e.preventDefault()

      // Get desktop container for coordinate conversion
      const desktop = e.target.closest('.desktop') || e.target.closest('#main-content')
      if (!desktop) return
      const desktopRect = desktop.getBoundingClientRect()

      // Store initial positions of all selected icons
      const positions = {}
      const foundIcons = []
      const missingIcons = []
      selectedIconIds.forEach(id => {
        // Check both image icons and folder icons
        const iconEl = document.querySelector(`[data-icon-id="${id}"]`)
        if (iconEl) {
          foundIcons.push(id)
          const rect = iconEl.getBoundingClientRect()
          // Convert to desktop-relative coordinates
          const desktopRelativeX = rect.left - desktopRect.left
          const desktopRelativeY = rect.top - desktopRect.top
          positions[id] = { x: desktopRelativeX, y: desktopRelativeY }
        } else {
          missingIcons.push(id)
        }
      })
      
      console.log('[DesktopImageIcons] Group drag start - icon positions stored', { selectedIconIds, foundIcons, missingIcons, iconPositionsCount: Object.keys(positions).length, isFolderIcon: ['MEMETIC_ENERGY','MY_FAVORITE_WOJAKS','RECYCLE_BIN'].some(id => selectedIconIds.includes(id)) })

      groupDragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        iconPositions: positions,
        desktopRect: desktopRect,
      }

      isGroupDraggingRef.current = true
      setIsGroupDragging(true)
    }

    const handleGroupDragMove = (e) => {
      if (!isGroupDraggingRef.current) return

      const desktopRect = groupDragStartRef.current.desktopRect
      if (!desktopRect) return

      // Calculate delta
      const deltaX = e.clientX - groupDragStartRef.current.x
      const deltaY = e.clientY - groupDragStartRef.current.y

      // Move all selected icons together
      selectedIconIds.forEach(id => {
        const iconEl = document.querySelector(`[data-icon-id="${id}"]`)
        if (iconEl && groupDragStartRef.current.iconPositions[id]) {
          const startPos = groupDragStartRef.current.iconPositions[id]
          const newX = startPos.x + deltaX
          const newY = startPos.y + deltaY
          
          // Clamp to desktop bounds
          const ICON_WIDTH = 96
          const ICON_HEIGHT = 80
          const TASKBAR_HEIGHT = 46
          const maxX = desktopRect.width - ICON_WIDTH
          const maxY = desktopRect.height - TASKBAR_HEIGHT - ICON_HEIGHT
          const clampedX = Math.max(0, Math.min(newX, maxX))
          const clampedY = Math.max(0, Math.min(newY, maxY))
          
          // Update position via DOM
          iconEl.style.setProperty('left', `${clampedX}px`, 'important')
          iconEl.style.setProperty('top', `${clampedY}px`, 'important')
        }
      })
    }

    const handleGroupDragEnd = () => {
      if (!isGroupDraggingRef.current) return

      // Save final positions for all dragged icons
      selectedIconIds.forEach(id => {
        const iconEl = document.querySelector(`[data-icon-id="${id}"]`)
        if (iconEl && groupDragStartRef.current.iconPositions[id]) {
          let finalLeft = parseFloat(iconEl.style.left) || groupDragStartRef.current.iconPositions[id].x
          let finalTop = parseFloat(iconEl.style.top) || groupDragStartRef.current.iconPositions[id].y
          
          // Apply grid snapping
          if (isGridSnappingEnabled()) {
            const snapped = snapToGrid(finalLeft, finalTop)
            finalLeft = Math.round(snapped.x)
            finalTop = Math.round(snapped.y)
          }
          
          // Update position
          iconEl.style.setProperty('left', `${finalLeft}px`, 'important')
          iconEl.style.setProperty('top', `${finalTop}px`, 'important')
          
          // Notify parent for persistence
          requestAnimationFrame(() => {
            if (onUpdatePosition) {
              onUpdatePosition(id, finalLeft, finalTop)
            }
            // Also update folder icon positions if needed
            if (id === 'MEMETIC_ENERGY' || 
                id === 'MY_FAVORITE_WOJAKS' || id === 'RECYCLE_BIN') {
              saveIconPosition(id, finalLeft, finalTop)
            }
          })
        }
      })

      isGroupDraggingRef.current = false
      setIsGroupDragging(false)
      groupDragStartRef.current = { x: 0, y: 0, iconPositions: {}, desktopRect: null }
    }

    // Attach to document instead of container since container has pointerEvents: 'none'
    // Use capture phase to catch events before they reach individual icon handlers
    document.addEventListener('pointerdown', handleGroupDragStart, true)
    document.addEventListener('pointermove', handleGroupDragMove)
    document.addEventListener('pointerup', handleGroupDragEnd)

    return () => {
      document.removeEventListener('pointerdown', handleGroupDragStart, true)
      document.removeEventListener('pointermove', handleGroupDragMove)
      document.removeEventListener('pointerup', handleGroupDragEnd)
    }
  }, [selectedIconIds, onUpdatePosition])

  // Always render container - use relative positioning for absolute children
  console.log('[DesktopImageIcons] Rendering component', {
    desktopImagesLength: desktopImages.length,
    folderIconsCount: 3, // MEMETIC_ENERGY, MY_FAVORITE_WOJAKS, RECYCLE_BIN (COMMUNITY_RESOURCES moved to DesktopIcons)
    hasContextMenu: !!contextMenu
  })
  
  // CRITICAL: Check if any desktopImages have id: 0 or duplicate ids
  const imageIds = desktopImages.map(img => img.id)
  const zeroIds = imageIds.filter(id => id === 0 || id === '0')
  const duplicateIds = imageIds.filter((id, idx) => imageIds.indexOf(id) !== idx)
  if (zeroIds.length > 0 || duplicateIds.length > 0) {
    console.error('[DesktopImageIcons] PROBLEM DETECTED:', {
      zeroIds,
      duplicateIds,
      allImageIds: imageIds
    })
  }
  
  // CRITICAL: Don't use Fragment - React might be inferring keys from Fragment children
  // Instead, wrap everything in a single div container
  // NOTE: Root element should NOT have a key - keys are only for elements in arrays
  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {/* Desktop Icons Container - relative positioning for absolute children */}
      {/* NOTE: Container div should NOT have a key - keys are only for elements in arrays */}
      <div
        ref={containerRef}
        className="desktop-image-icons-container"
        // REMOVED all event handlers - container has pointerEvents: 'none' so clicks pass through to icons
        // Icons handle their own clicks, and SelectionBox handles empty space clicks via desktopRef
        // REMOVED onMouseDown handler - it was interfering with icon clicks
        // SelectionBox handles empty space clicks, and icons handle their own clicks
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: '46px', // Above taskbar
          zIndex: 10,
          pointerEvents: 'none', // Let clicks pass through to icons - SelectionBox handles empty space via desktopRef
          // Icons have pointerEvents: 'auto' so they receive clicks
          /* Ensure desktop icons are always visible - they should be below windows (z-index 1000+) but visible */
        }}
      >
        {/* Render each icon with absolute positioning - using memoized component */}
        {/* Render desktop images - use conditional render instead of IIFE to avoid key inference issues */}
        {/* #region agent log */}
        {(() => {
          const logData = {
            desktopImagesLength: desktopImages.length,
            willRender: desktopImages.length > 0,
            containerChildrenCount: 'unknown',
            timestamp: Date.now()
          }
          console.log('[DesktopImageIcons] About to render desktop images', logData)
          return null
        })()}
        {/* #endregion */}
        {/* Render desktop images - use direct .map() result */}
        {/* CRITICAL: Filter out any images with id: 0 or undefined/null before mapping to prevent key conflicts */}
        {/* CRITICAL: Empty array from .map() is fine - React handles it correctly */}
        {/* CRITICAL: When desktopImages is empty, .map() returns empty array [] which React treats as no children */}
        {/* CRITICAL: To prevent React from inferring keys, we need to ensure the container's children are not treated as an array */}
        {/* #region agent log */}
        {(() => {
          const willRender = desktopImages.length > 0
          const filteredCount = willRender ? desktopImages.filter(img => img && img.id !== undefined && img.id !== null && img.id !== 0 && img.id !== '0').length : 0
          return null
        })()}
        {/* #endregion */}
        {/* Wrap in Fragment with explicit key to prevent React from inferring keys */}
        <React.Fragment key="desktop-images-wrapper">
          {desktopImages.length > 0 ? desktopImages
            .filter(img => img && img.id !== undefined && img.id !== null && img.id !== 0 && img.id !== '0')
            .map((image, index) => {
          if (index === 0) {
            console.log('[DesktopImageIcons] Rendering desktop images array', {
              count: desktopImages.length,
              imageIds: desktopImages.map(img => ({ id: img.id, idType: typeof img.id }))
            })
          }
          
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

          // CRITICAL: Use index-based key that's ALWAYS unique and ALWAYS a string
          // This fixes React warning about duplicate keys (some images might have id: 0 or duplicate ids)
          // Index is always unique in the array, so use it as the primary identifier
          // Use a prefix that can NEVER be parsed as a number, even by React's internal logic
          const renderKey = `desktop-img-${String(index)}-${String(desktopImages.length)}`
          
          if (index < 3) {
            console.log('[DesktopImageIcons] Key generated', { 
              index, 
              imageId: image.id, 
              renderKey,
              keyType: typeof renderKey
            })
          }
          
          return (
            <DesktopIcon
              key={renderKey}
              image={imageWithPosition}
              isSelected={isSelected}
              isDragging={isIconDragging}
              isHovered={isHovered}
              onMouseDown={handleMouseDown}
              onDoubleClick={(imageUrl, filename) => {
                console.log('[DesktopImageIcons] Parent onDoubleClick callback', { imageId: image.id, imageUrl: imageUrl?.substring(0, 50), filename, hasImage: !!image.image, hasImageDataUrl: !!image.imageDataUrl });
                // Always allow double-click to open - don't check dragging state
                // Make sure we have a valid image URL - check all possible sources
                const urlToUse = imageUrl || image.image || image.imageDataUrl
                console.log('[DesktopImageIcons] urlToUse result', { urlToUse: urlToUse?.substring(0, 50), hasUrlToUse: !!urlToUse, imageId: image.id });
                if (urlToUse) {
                  console.log('[DesktopImageIcons] Calling handleDoubleClick', { urlToUse: urlToUse?.substring(0, 50), filename: filename || image.filename });
                  handleDoubleClick(urlToUse, filename || image.filename)
                } else {
                  console.error('[DesktopImageIcons] No image URL found for icon', { imageId: image.id, image: image, imageUrl, hasImage: !!image.image, hasImageDataUrl: !!image.imageDataUrl });
                }
              }}
              onContextMenu={handleContextMenu}
              onClick={(e) => {
                const logData = {
                  imageId: image.id,
                  draggingIconId,
                  isDraggingThisIcon: draggingIconId === image.id,
                  isMobile,
                  shiftKey: e.shiftKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                  detail: e.detail, // 1 for single click, 2 for double click
                  target: e.target.tagName,
                  currentTarget: e.currentTarget?.tagName,
                  timestamp: Date.now()
                }
                console.log('[DesktopImageIcons] Parent onClick fired', logData)
                
                // Don't handle clicks if this is part of a double-click
                // e.detail === 2 means this click is part of a double-click
                if (e.detail === 2) {
                  console.log('[DesktopImageIcons] onClick ignored - part of double-click', { imageId: image.id })
                  return
                }
                
                // Don't stop propagation - let selection box work
                // Only handle click if not currently dragging this specific icon
                // Allow clicks even if isDragging is true (might be dragging another icon)
                if (draggingIconId !== image.id) {
                  console.log('[DesktopImageIcons] onClick handler executing', { 
                    imageId: image.id, 
                    isMobile, 
                    hasImage: !!(image.image || image.imageDataUrl)
                  })
                  // On mobile, single click opens the image (double-click doesn't work well)
                  if (isMobile && (image.image || image.imageDataUrl)) {
                    handleDoubleClick(image.image || image.imageDataUrl, image.filename)
                  } else {
                    // Handle selection - don't prevent default, let it bubble
                    handleIconClick(e, image.id)
                  }
                } else {
                  console.log('[DesktopImageIcons] onClick handler blocked - icon is dragging', { imageId: image.id })
                }
              }}
              onMouseEnter={setHoveredImageId}
              onMouseLeave={() => setHoveredImageId(null)}
            />
          )
        }) : null}
        </React.Fragment>

        {/* Folder icons - render directly without Fragment to prevent React from inferring keys */}
        {/* Memetic Energy - Draggable folder */}
        {/* #region agent log */}
        {(() => {
          const logData = {
            keys: ['MEMETIC_ENERGY', 'MY_FAVORITE_WOJAKS', 'RECYCLE_BIN'],
            desktopImagesLength: desktopImages.length,
            willRenderDesktopImages: desktopImages.length > 0,
            timestamp: Date.now()
          }
          console.log('[DesktopImageIcons] Rendering folder icons with keys:', logData)
          return null
        })()}
        {/* #endregion */}
        <DraggableFolderIcon
          key="MEMETIC_ENERGY"
          iconId="MEMETIC_ENERGY"
          position={memeticEnergyPos}
          selectedIconIds={selectedIconIds}
          isGroupDragging={isGroupDragging}
          setSelectedIconIds={setSelectedIconIds}
          ref={(el) => {
            if (el) {
              folderIconRefs.current['MEMETIC_ENERGY'] = el
            } else {
              delete folderIconRefs.current['MEMETIC_ENERGY']
            }
          }}
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
          onClick={(e) => {
            const logData = {
              iconId: 'MEMETIC_ENERGY',
              target: e.target.tagName,
              currentTarget: e.currentTarget?.tagName,
              hasSetSelectedIconIds: !!setSelectedIconIds,
              shiftKey: e.shiftKey,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              currentSelection: selectedIconIds,
              selectionHandledInMousedown: e.currentTarget?.dataset.selectionHandledInMousedown === 'true',
              timestamp: Date.now()
            }
            console.log('[DesktopImageIcons] DraggableFolderIcon onClick - MEMETIC_ENERGY', logData)
            
            // If selection was already handled in mousedown, skip it here
            if (e.currentTarget?.dataset.selectionHandledInMousedown === 'true') {
              // Clear the flag
              e.currentTarget.dataset.selectionHandledInMousedown = 'false'
              // Stop propagation to prevent desktop onClick from clearing selection
              e.stopPropagation()
              return
            }
            
            // Stop propagation to prevent desktop onClick from clearing selection
            e.stopPropagation()
            // CRITICAL: Selection is now handled in DraggableFolderIcon's handleClick
            // So we don't need to handle it here in the parent's onClick
            // Just call onSelectIcon if provided (for other purposes)
            if (onSelectIcon) {
              onSelectIcon('MEMETIC_ENERGY', e.shiftKey || e.ctrlKey || e.metaKey)
            }
          }}
          onMouseEnter={(e) => {
            // Don't change background if dragging
            if (!e.currentTarget.style.opacity || e.currentTarget.style.opacity === '1') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.style.opacity || e.currentTarget.style.opacity === '1') {
              e.currentTarget.style.background = 'transparent'
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
          className={`desktop-icon-button desktop-folder-icon ${selectedIconIds.includes('MEMETIC_ENERGY') ? 'selected' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: selectedIconIds.includes('MEMETIC_ENERGY') ? 'rgba(0, 0, 128, 0.3)' : 'transparent',
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

        {/* Community Resources is now handled by DesktopIcons (moved to left side under Roadmap) */}

        {/* My Favorite Wojaks - Draggable folder */}
        <DraggableFolderIcon
          key="MY_FAVORITE_WOJAKS"
          iconId="MY_FAVORITE_WOJAKS"
          position={favoriteWojaksPos}
          selectedIconIds={selectedIconIds}
          isGroupDragging={isGroupDragging}
          setSelectedIconIds={setSelectedIconIds}
          ref={(el) => {
            if (el) {
              folderIconRefs.current['MY_FAVORITE_WOJAKS'] = el
            } else {
              delete folderIconRefs.current['MY_FAVORITE_WOJAKS']
            }
          }}
          onPositionChange={(x, y) => {
            setFavoriteWojaksPos({ x, y })
            saveIconPosition('MY_FAVORITE_WOJAKS', x, y)
          }}
          onDragOver={(e) => {
            // Allow drop if it contains image data
            const hasImageData = e.dataTransfer.types.includes('application/json') || 
                               e.dataTransfer.types.includes('text/plain')
            if (hasImageData) {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'copy'
            }
          }}
          onDrop={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            playSound('click')

            try {
              // Get the image data from dataTransfer
              const jsonData = e.dataTransfer.getData('application/json')
              if (!jsonData) {
                console.warn('No image data found in drop event')
                return
              }

              const imageData = JSON.parse(jsonData)
              
              // Check if this is a desktop image (has an ID that exists in desktopImages)
              const isDesktopImage = imageData.id && desktopImages.some(img => img.id === imageData.id)
              
              // Convert to favorite wojak format
              let dataUrl = imageData.dataUrl || imageData.image
              
              // If it's a blob URL, convert to data URL
              if (dataUrl && dataUrl.startsWith('blob:')) {
                dataUrl = await blobUrlToDataUrl(dataUrl)
              }

              // Validate data URL
              if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                console.warn('Invalid image data format')
                return
              }

              const wojak = {
                id: imageData.id || `wojak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: imageData.name || 'Favorite Wojak',
                dataUrl: dataUrl,
                type: imageData.type || 'wojak',
                layers: imageData.layers,
                savedAt: new Date().toISOString()
              }

              // Call callback to add to favorites
              if (onAddToFavorites) {
                onAddToFavorites(wojak)
                playSound('tada')
              } else {
                console.warn('onAddToFavorites callback not provided')
              }

              // If this was a desktop image, remove it from desktop (without moving to recycle bin)
              if (isDesktopImage) {
                if (onRemoveFromDesktop) {
                  onRemoveFromDesktop(imageData.id)
                } else if (onRemoveImage) {
                  // Fallback to onRemoveImage if onRemoveFromDesktop not provided
                  onRemoveImage(imageData.id)
                }
              }
            } catch (error) {
              console.error('Error handling drop:', error)
            }
          }}
          onDoubleClick={() => {
            playSound('click')
            if (onOpenFavoriteWojaks) {
              onOpenFavoriteWojaks()
            }
          }}
          onClick={(e) => {
            const logData = {
              iconId: 'MY_FAVORITE_WOJAKS',
              target: e.target.tagName,
              currentTarget: e.currentTarget?.tagName,
              hasSetSelectedIconIds: !!setSelectedIconIds,
              shiftKey: e.shiftKey,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              currentSelection: selectedIconIds,
              selectionHandledInMousedown: e.currentTarget?.dataset.selectionHandledInMousedown === 'true',
              timestamp: Date.now()
            }
            console.log('[DesktopImageIcons] DraggableFolderIcon onClick - MY_FAVORITE_WOJAKS', logData)
            
            // If selection was already handled in mousedown, skip it here
            if (e.currentTarget?.dataset.selectionHandledInMousedown === 'true') {
              e.currentTarget.dataset.selectionHandledInMousedown = 'false'
              e.stopPropagation()
              return
            }
            
            // Stop propagation to prevent desktop onClick from clearing selection
            e.stopPropagation()
            // CRITICAL: Selection is now handled in DraggableFolderIcon's handleClick
            // So we don't need to handle it here in the parent's onClick
            // Just call onSelectIcon if provided (for other purposes)
            if (onSelectIcon) {
              onSelectIcon('MY_FAVORITE_WOJAKS', e.shiftKey || e.ctrlKey || e.metaKey)
            }
          }}
          onMouseEnter={(e) => {
            // Don't change background if dragging
            if (!e.currentTarget.style.opacity || e.currentTarget.style.opacity === '1') {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.style.opacity || e.currentTarget.style.opacity === '1') {
              e.currentTarget.style.background = 'transparent'
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
          className={`desktop-icon-button desktop-folder-icon ${selectedIconIds.includes('MY_FAVORITE_WOJAKS') ? 'selected' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: selectedIconIds.includes('MY_FAVORITE_WOJAKS') ? 'rgba(0, 0, 128, 0.3)' : 'transparent',
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
          selectedIconIds={selectedIconIds}
          isGroupDragging={isGroupDragging}
          setSelectedIconIds={setSelectedIconIds}
          ref={(el) => {
            trashBinRef.current = el
            if (el) {
              folderIconRefs.current['RECYCLE_BIN'] = el
            } else {
              delete folderIconRefs.current['RECYCLE_BIN']
            }
          }}
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
          onClick={(e) => {
            const logData = {
              iconId: 'RECYCLE_BIN',
              target: e.target.tagName,
              currentTarget: e.currentTarget?.tagName,
              hasSetSelectedIconIds: !!setSelectedIconIds,
              shiftKey: e.shiftKey,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              currentSelection: selectedIconIds,
              selectionHandledInMousedown: e.currentTarget?.dataset.selectionHandledInMousedown === 'true',
              timestamp: Date.now()
            }
            console.log('[DesktopImageIcons] DraggableFolderIcon onClick - RECYCLE_BIN', logData)
            
            // If selection was already handled in mousedown, skip it here
            if (e.currentTarget?.dataset.selectionHandledInMousedown === 'true') {
              e.currentTarget.dataset.selectionHandledInMousedown = 'false'
              e.stopPropagation()
              return
            }
            
            // Stop propagation to prevent desktop onClick from clearing selection
            e.stopPropagation()
            // CRITICAL: Selection is now handled in DraggableFolderIcon's handleClick
            // So we don't need to handle it here in the parent's onClick
            // Just call onSelectIcon if provided (for other purposes)
            if (onSelectIcon) {
              onSelectIcon('RECYCLE_BIN', e.shiftKey || e.ctrlKey || e.metaKey)
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
          onDragOver={(e) => {
            // Allow drop if it contains image data
            const hasImageData = e.dataTransfer.types.includes('application/json') || 
                               e.dataTransfer.types.includes('text/plain')
            if (hasImageData) {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              setDragOverTrash(true)
            }
          }}
          onDragLeave={(e) => {
            // Only clear drag over if we're actually leaving the button
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setDragOverTrash(false)
            }
          }}
          onDrop={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragOverTrash(false)
            playSound('click')

            try {
              // Get the image data from dataTransfer
              const jsonData = e.dataTransfer.getData('application/json')
              if (!jsonData) {
                console.warn('No image data found in drop event')
                return
              }

              const imageData = JSON.parse(jsonData)
              
              // Check if this is a desktop image (has an ID that exists in desktopImages)
              const isDesktopImage = imageData.id && desktopImages.some(img => img.id === imageData.id)
              
              // If this was a desktop image, move it to recycle bin
              if (isDesktopImage && onRemoveImage) {
                onRemoveImage(imageData.id)
              }
            } catch (error) {
              console.error('Error handling drop:', error)
            }
          }}
          onMouseEnter={() => setIsRecycleBinHovered(true)}
          onMouseLeave={() => setIsRecycleBinHovered(false)}
          className={`desktop-icon-button desktop-trash-icon recycle-bin ${dragOverTrash ? 'drag-hover' : ''} ${selectedIconIds.includes('RECYCLE_BIN') ? 'selected' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: dragOverTrash 
              ? 'rgba(255, 0, 0, 0.3)' 
              : (selectedIconIds.includes('RECYCLE_BIN') 
                ? 'rgba(0, 0, 128, 0.3)' 
                : (isRecycleBinHovered ? 'rgba(255, 255, 255, 0.1)' : 'transparent')),
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

        {/* Marquee Selection for DesktopImageIcons */}
        <MarqueeSelection
          onSelectionChange={(selectedIds, isAdditive, isFinal, isToggle) => {
            if (setSelectedIconIds) {
              if (isToggle) {
                // Toggle selection
                setSelectedIconIds(prev => {
                  const next = new Set(prev)
                  selectedIds.forEach(id => {
                    if (next.has(id)) {
                      next.delete(id)
                    } else {
                      next.add(id)
                    }
                  })
                  return Array.from(next)
                })
              } else if (isAdditive) {
                // Add to selection
                setSelectedIconIds(prev => {
                  const next = new Set([...prev, ...selectedIds])
                  return Array.from(next)
                })
              } else {
                // Replace selection
                setSelectedIconIds(selectedIds)
              }
            }
          }}
          iconElements={[
            // Get all icon elements from the container using querySelector
            ...(containerRef.current ? Array.from(containerRef.current.querySelectorAll('[data-icon-id]')) : []),
            ...Object.values(folderIconRefs.current).filter(Boolean)
          ]}
          containerRef={containerRef}
          onFocusChange={(iconId) => {
            // Optional: handle focus change
          }}
        />
      </div>
      
      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={hideContextMenu}
        />
      ) : null}
    </div>
  )
}
