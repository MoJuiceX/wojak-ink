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
    // Find the icon element by its data attribute
    const iconElement = containerRef.current?.querySelector(`[data-icon-id="${iconId}"]`)
    if (!iconElement) return false

    const iconRect = iconElement.getBoundingClientRect()
    
    // Convert to container-relative coordinates
    const iconRectRelative = {
      left: iconRect.left - containerRect.left,
      top: iconRect.top - containerRect.top,
      right: iconRect.right - containerRect.left,
      bottom: iconRect.bottom - containerRect.top,
    }

    return !(
      iconRectRelative.right < selectionRect.left ||
      iconRectRelative.left > selectionRect.right ||
      iconRectRelative.bottom < selectionRect.top ||
      iconRectRelative.top > selectionRect.bottom
    )
  }, [containerRef])

  const iconInSelection = checkIconInSelection || defaultCheckIconInSelection

  useEffect(() => {
    if (!isEnabled || !containerRef?.current) return

    const container = containerRef.current

    const handleMouseDown = (e) => {
      // Only start selection if clicking directly on desktop (not on icons or windows)
      if (!e.target.classList.contains('desktop') && !e.target.classList.contains('bg-fixed')) return
      
      // Don't start if clicking on windows or icons
      if (e.target.closest('.window') || e.target.closest('.desktop-icons') || e.target.closest('.desktop-image-icons')) {
        return
      }
      
      e.preventDefault()
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
      
      onSelectionChange?.(selectedIds)
    }

    const handleMouseUp = () => {
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

