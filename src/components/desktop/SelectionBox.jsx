import { useState, useEffect, useCallback } from 'react'
import './SelectionBox.css'

export default function SelectionBox({ 
  containerRef, 
  icons, 
  onSelectionChange,
  isEnabled = true,
  checkIconInSelection
}) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })

  const getSelectionRect = useCallback(() => {
    return {
      left: Math.min(startPos.x, currentPos.x),
      top: Math.min(startPos.y, currentPos.y),
      width: Math.abs(currentPos.x - startPos.x),
      height: Math.abs(currentPos.y - startPos.y),
      right: Math.max(startPos.x, currentPos.x),
      bottom: Math.max(startPos.y, currentPos.y),
    }
  }, [startPos, currentPos])

  // Use provided checkIconInSelection function or default implementation
  const defaultCheckIconInSelection = useCallback((iconId, selectionRect, containerRect) => {
    // Find the icon element by its data attribute - search in entire document
    // This ensures we find icons regardless of which container they're in
    const iconElement = document.querySelector(`[data-icon-id="${iconId}"]`)
    if (!iconElement) {
      // Try alternative selectors for folder icons
      const folderIcon = document.querySelector(`button[data-icon-id="${iconId}"]`)
      if (!folderIcon) return false
      // Use folderIcon if found
      const iconRect = folderIcon.getBoundingClientRect()
      const iconRectRelative = {
        left: iconRect.left - containerRect.left,
        top: iconRect.top - containerRect.top,
        right: iconRect.right - containerRect.left,
        bottom: iconRect.bottom - containerRect.top,
      }
      const intersects = !(
        iconRectRelative.right < selectionRect.left ||
        iconRectRelative.left > selectionRect.right ||
        iconRectRelative.bottom < selectionRect.top ||
        iconRectRelative.top > selectionRect.bottom
      )
      return intersects
    }

    const iconRect = iconElement.getBoundingClientRect()
    
    // Convert to container-relative coordinates
    const iconRectRelative = {
      left: iconRect.left - containerRect.left,
      top: iconRect.top - containerRect.top,
      right: iconRect.right - containerRect.left,
      bottom: iconRect.bottom - containerRect.top,
    }

    const intersects = !(
      iconRectRelative.right < selectionRect.left ||
      iconRectRelative.left > selectionRect.right ||
      iconRectRelative.bottom < selectionRect.top ||
      iconRectRelative.top > selectionRect.bottom
    )
    return intersects
  }, [containerRef])

  const iconInSelection = checkIconInSelection || defaultCheckIconInSelection

  useEffect(() => {
    if (!isEnabled || !containerRef?.current) return

    const container = containerRef.current

    const handleMouseDown = (e) => {
      // Don't start if clicking on windows or taskbar
      if (e.target.closest('.window') || e.target.closest('.taskbar')) {
        return
      }
      
      // Don't start if clicking directly on an icon button - let icon handle its own clicks
      if (e.target.closest('button[data-icon-id]') || 
          e.target.closest('.desktop-icon-button') ||
          e.target.closest('.desktop-image-icon')) {
        // #region agent log
        console.log('[SelectionBox] MouseDown on icon - not starting selection', { 
          target: e.target.tagName,
          closestIcon: e.target.closest('.desktop-image-icon')?.className
        })
        // #endregion
        return
      }
      
      // Allow starting selection on desktop background or empty container space
      const isOnDesktop = e.target.classList.contains('desktop') || 
                          e.target.classList.contains('bg-fixed') || 
                          e.target.id === 'main-content' ||
                          (e.target.classList.contains('desktop-image-icons-container') && 
                           !e.target.closest('.desktop-image-icon') &&
                           !e.target.closest('.desktop-icon-button'))
      
      if (!isOnDesktop) {
        return
      }
      
      // #region agent log
      console.log('[SelectionBox] Starting marquee selection on empty desktop')
      // #endregion
      
      e.preventDefault()
      e.stopPropagation()
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      setStartPos({ x, y })
      setCurrentPos({ x, y })
      setIsSelecting(true)
    }

    const handleMouseMove = (e) => {
      if (!isSelecting) return
      
      const rect = container.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
      
      setCurrentPos({ x, y })

      // Check which icons are in selection
      const selectionRect = {
        left: Math.min(startPos.x, x),
        top: Math.min(startPos.y, y),
        right: Math.max(startPos.x, x),
        bottom: Math.max(startPos.y, y),
      }

      const selectedIds = icons
        .filter(icon => iconInSelection(icon.id, selectionRect, rect))
        .map(icon => icon.id)
      
      // #region agent log
      // Only log occasionally to avoid spam
      if (Math.random() < 0.1) {
        console.log('[SelectionBox] handleMouseMove - updating selection', {
          selectedIds,
          selectionRect
        })
      }
      // #endregion
      
      onSelectionChange?.(selectedIds)
    }

    const handleMouseUp = (e) => {
      // #region agent log
      const isIconClick = e.target.closest('button[data-icon-id]') || 
                         e.target.closest('.desktop-icon-button') ||
                         e.target.closest('.desktop-image-icon')
      console.log('[SelectionBox] handleMouseUp', {
        isSelecting,
        isIconClick: !!isIconClick,
        target: e.target.tagName,
        targetClass: e.target.className
      })
      // #endregion
      
      // Don't clear selection if clicking on an icon - let icon handle its own clicks
      if (isIconClick && !isSelecting) {
        // Icon click - don't interfere, just reset selecting state
        // #region agent log
        console.log('[SelectionBox] Icon click detected - not interfering')
        // #endregion
        setIsSelecting(false)
        return
      }
      
      // Final selection update on mouse up (only if we were actually selecting)
      if (isSelecting) {
        const rect = container.getBoundingClientRect()
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        
        const selectionRect = {
          left: Math.min(startPos.x, x),
          top: Math.min(startPos.y, y),
          right: Math.max(startPos.x, x),
          bottom: Math.max(startPos.y, y),
        }

        const selectedIds = icons
          .filter(icon => iconInSelection(icon.id, selectionRect, rect))
          .map(icon => icon.id)
        
        // #region agent log
        console.log('[SelectionBox] Final selection update', {
          selectedIds,
          selectionRect,
          iconCount: icons.length
        })
        // #endregion
        
        // Final selection update - this should persist
        onSelectionChange?.(selectedIds)
      } else {
        // #region agent log
        console.log('[SelectionBox] Not selecting - not updating selection')
        // #endregion
      }
      setIsSelecting(false)
    }

    container.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isEnabled, containerRef, isSelecting, startPos, icons, onSelectionChange, iconInSelection])

  if (!isSelecting) return null

  const rect = getSelectionRect()

  return (
    <div 
      className="selection-box"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  )
}

