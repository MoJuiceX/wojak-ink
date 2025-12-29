import { useMemo } from 'react'
import './DragGhost.css'

/**
 * Windows 98-style drag ghost for selected icons
 * Shows offset icon ghosts and a count badge
 * 
 * @param {number} x - Mouse X position (clientX)
 * @param {number} y - Mouse Y position (clientY)
 * @param {number} count - Number of selected icons
 * @param {Array} iconElements - Array of icon DOM elements
 * @param {Object} initialPositions - Map of iconId -> {x, y, width, height} at drag start
 */
export default function DragGhost({ 
  x, 
  y, 
  count, 
  iconElements,
  initialPositions = {}
}) {
  if (count === 0 || !iconElements || iconElements.length === 0) {
    return null
  }

  // Show 2-3 offset icon ghosts (Win98 style: 2-3 stacked icons)
  const ghostCount = Math.min(count, 3)
  const selectedIcons = iconElements.slice(0, ghostCount)

  // Calculate icon dimensions (use first icon as reference, or from initialPositions)
  const iconDimensions = useMemo(() => {
    // Try to get dimensions from initialPositions first (more stable during drag)
    if (selectedIcons[0]) {
      const iconId = selectedIcons[0].getAttribute('data-icon-id')
      if (iconId && initialPositions[iconId]) {
        return {
          width: initialPositions[iconId].width || 96,
          height: initialPositions[iconId].height || 80
        }
      }
      // Fallback to current rect (may change during drag)
      const rect = selectedIcons[0].getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }
    return { width: 96, height: 80 } // Default icon size
  }, [selectedIcons, initialPositions])

  // Offset for stacked effect (Win98 style: icons offset by 4px each)
  const STACK_OFFSET = 4

  return (
    <div 
      className="drag-ghost-container"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: 'none',
        zIndex: 10000,
        transform: 'translate(-16px, -16px)', // Offset to center on mouse (approximate icon center)
      }}
    >
      {/* Simplified Win98 drag ghost - just show count badge for cleaner look */}
      {/* Optionally show 1-2 simple icon outlines for visual feedback */}
      {ghostCount > 0 && (
        <div
          className="drag-ghost-icon"
          style={{
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: `${iconDimensions.width}px`,
            height: `${iconDimensions.height}px`,
            opacity: 0.5,
            // Simple dashed outline - Win98 style
            border: '2px dashed #000000',
            background: 'rgba(192, 192, 192, 0.2)',
            boxShadow: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}
      
      {/* Count badge - positioned to the right of stacked icons */}
      {count > 1 && (
        <div
          className="drag-ghost-count"
          style={{
            position: 'absolute',
            left: `${(ghostCount * STACK_OFFSET) + iconDimensions.width + 4}px`,
            top: `${(ghostCount * STACK_OFFSET) / 2}px`,
            background: '#000080',
            color: '#ffffff',
            padding: '2px 6px',
            borderRadius: '2px',
            fontSize: '11px',
            fontFamily: "'MS Sans Serif', sans-serif",
            fontWeight: 'bold',
            border: '1px solid #000000',
            whiteSpace: 'nowrap',
            boxShadow: 'none',
            lineHeight: '1.2',
            transform: 'translateY(-50%)',
          }}
        >
          ({count})
        </div>
      )}
    </div>
  )
}

