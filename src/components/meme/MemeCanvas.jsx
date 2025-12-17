import { useEffect, useRef, memo, useMemo } from 'react'

const MemeCanvas = memo(function MemeCanvas({ canvasRef, width = 800, height = 800 }) {
  const containerRef = useRef(null)
  const internalRef = useRef(null)
  
  // Use provided ref or fallback to internal ref
  const actualRef = canvasRef || internalRef

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
    border: '2px inset #c0c0c0',
    background: '#ffffff',
    display: 'inline-block',
    padding: '4px',
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
        style={canvasStyle}
      />
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if width or height actually changed
  return (
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.canvasRef === nextProps.canvasRef
  )
})

export default MemeCanvas

