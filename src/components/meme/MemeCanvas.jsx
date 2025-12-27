import { useEffect, useRef, memo, useMemo } from 'react'
import { Button } from '../ui'

const MemeCanvas = memo(function MemeCanvas({ 
  canvasRef, 
  width = 800, 
  height = 800,
  tangifiedImage = null,
  showTangified = false,
  onToggleView = null,
  isRendering = false
}) {
  const containerRef = useRef(null)
  const internalRef = useRef(null)
  
  // Use provided ref or fallback to internal ref
  const actualRef = canvasRef || internalRef

  // Announce rendering state to screen readers
  useEffect(() => {
    if (actualRef.current) {
      const canvas = actualRef.current
      if (isRendering) {
        canvas.setAttribute('aria-busy', 'true')
        canvas.setAttribute('aria-label', 'Wojak canvas - rendering')
      } else {
        canvas.setAttribute('aria-busy', 'false')
        canvas.setAttribute('aria-label', 'Wojak canvas - ready')
      }
    }
  }, [isRendering, actualRef])

  useEffect(() => {
    const canvas = actualRef.current
    if (canvas) {
      // Only update if size actually changed (prevent unnecessary reflows)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }
  }, [actualRef, width, height])

  // Memoize style objects to prevent re-creation (critical for performance)
  // Outer border wrapper: 610px x 610px (10px larger than canvas, creates 5px light gray on each side)
  const borderWrapperStyle = useMemo(() => ({
    width: `${width + 10}px`,
    height: `${height + 10}px`,
    background: 'var(--surface-1)', // Light gray background
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    aspectRatio: `${width + 10} / ${height + 10}`,
    position: 'relative',
  }), [width, height])

  // Inner container with 3px dark gray border around the canvas
  // Canvas is 600px, border is 3px on each side (6px total), so container is 606px
  const containerStyle = useMemo(() => ({
    border: '3px solid var(--border-dark)', // 3px dark gray border
    background: 'transparent',
    display: 'inline-block',
    padding: 0,
    boxSizing: 'border-box',
    // Set explicit size: canvas (600px) + border (3px * 2 = 6px) = 606px
    width: `${width + 6}px`,
    height: `${height + 6}px`,
    // Prevent layout shift by reserving space (critical for no reflow)
    aspectRatio: `${width + 6} / ${height + 6}`,
    position: 'relative',
    // GPU acceleration for smoother rendering
    willChange: 'contents',
    contain: 'layout style paint',
  }), [width, height])

  const canvasStyle = useMemo(() => ({
    display: 'block',
    width: `${width}px`,
    height: `${height}px`,
    objectFit: 'contain',
    // Prevent layout shift (critical for no reflow)
    aspectRatio: `${width} / ${height}`,
    // GPU acceleration
    willChange: 'contents',
    imageRendering: 'auto',
  }), [width, height])

  return (
    <div style={borderWrapperStyle}>
      <div 
        ref={containerRef}
        style={containerStyle}
      >
        <canvas
          ref={actualRef}
          style={{
            ...canvasStyle,
            display: showTangified ? 'none' : 'block',
          }}
        />
        {showTangified && tangifiedImage && (
          <img
            src={tangifiedImage}
            alt="Tangified Wojak"
            style={{
              display: 'block',
              width: `${width}px`,
              height: `${height}px`,
              objectFit: 'contain',
              aspectRatio: `${width} / ${height}`,
            }}
          />
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Re-render if width, height, canvasRef, tangifiedImage, or showTangified changed
  return (
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.canvasRef === nextProps.canvasRef &&
    prevProps.tangifiedImage === nextProps.tangifiedImage &&
    prevProps.showTangified === nextProps.showTangified
  )
})

export default MemeCanvas

