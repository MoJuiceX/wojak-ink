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
  const containerStyle = useMemo(() => ({
    border: '2px inset var(--border-dark)',
    background: 'var(--input-bg)',
    display: 'inline-block',
    padding: '4px', // Even padding on all sides for Win98 image viewer look
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    // Prevent layout shift by reserving space (critical for no reflow)
    aspectRatio: `${width} / ${height}`,
    position: 'relative',
    // GPU acceleration for smoother rendering
    willChange: 'contents',
    contain: 'layout style paint',
    // Prevent layout reflow during trait switching
    minHeight: `${height}px`,
    minWidth: `${width}px`
  }), [width, height])

  const canvasStyle = useMemo(() => ({
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    objectFit: 'contain',
    // Prevent layout shift (critical for no reflow)
    aspectRatio: `${width} / ${height}`,
    // GPU acceleration
    willChange: 'contents',
    imageRendering: 'auto',
    // Prevent layout reflow
    minHeight: `${height}px`,
    minWidth: `${width}px`
  }), [width, height])

  return (
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
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            objectFit: 'contain',
            aspectRatio: `${width} / ${height}`,
            minHeight: `${height}px`,
            minWidth: `${width}px`,
          }}
        />
      )}
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

