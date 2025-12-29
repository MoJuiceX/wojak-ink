import { useMarqueeSelection } from '../../hooks/useMarqueeSelection'
import './MarqueeSelection.css'

/**
 * Windows 98-style marquee selection component
 * 
 * Renders a dotted focus rectangle when dragging on empty desktop.
 * Selects icons that intersect the rectangle.
 * 
 * Supports:
 * - No modifier: clear and select
 * - Shift: add to selection
 * - Ctrl/Cmd: toggle selection
 * - Escape: cancel and restore previous selection
 * - Mobile: long-press to enter selection mode
 */
export default function MarqueeSelection({ 
  onSelectionChange, 
  iconElements, 
  containerRef,
  onFocusChange 
}) {
  const { marqueeRect, isActive, cancel } = useMarqueeSelection({
    containerRef,
    iconElements,
    onSelectionChange,
    onFocusChange,
  })

  // Don't render if not active
  if (!isActive) {
    return null
  }

  // Don't render if rectangle is too small (but allow very small rectangles during initial drag)
  if (marqueeRect.width < 1 && marqueeRect.height < 1) {
    return null
  }

  // Ensure rectangle is positioned relative to container
  const container = containerRef?.current
  if (!container) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MarqueeSelection] No container ref')
    }
    return null
  }

  return (
    <div
      className="marquee-selection"
      style={{
        position: 'absolute',
        left: `${marqueeRect.left}px`,
        top: `${marqueeRect.top}px`,
        width: `${Math.max(marqueeRect.width, 1)}px`,
        height: `${Math.max(marqueeRect.height, 1)}px`,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    />
  )
}
