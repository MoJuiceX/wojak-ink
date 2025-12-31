import { useEffect, useRef, memo, useMemo } from 'react'
import { Button } from '../ui'
import { canvasToBlob, blobUrlToDataUrl } from '../../utils/imageUtils'

const MemeCanvas = memo(function MemeCanvas({ 
  canvasRef, 
  width = 800, 
  height = 800,
  tangifiedImage = null,
  showTangified = false,
  onToggleView = null,
  isRendering = false,
  selectedLayers = {},
  onDragStart = null
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
    cursor: 'grab',
  }), [width, height])

  // Handle drag start - make canvas draggable
  const handleDragStart = async (e) => {
    if (!actualRef.current || isRendering) {
      e.preventDefault()
      return
    }

    try {
      // Get the canvas data
      const canvas = actualRef.current
      const blob = await canvasToBlob(canvas, 'image/png')
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Failed to read canvas'))
        reader.readAsDataURL(blob)
      })

      // Create image data for drag
      const imageData = {
        id: `wojak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Wojak Generator',
        dataUrl: dataUrl,
        image: dataUrl,
        type: 'wojak',
        layers: selectedLayers,
        savedAt: new Date().toISOString()
      }

      // Set drag data
      e.dataTransfer.setData('application/json', JSON.stringify(imageData))
      e.dataTransfer.effectAllowed = 'copy'
      e.dataTransfer.setData('text/plain', 'Wojak Generator')

      // Call optional callback
      if (onDragStart) {
        onDragStart(imageData)
      }
    } catch (error) {
      console.error('Error preparing drag data:', error)
      e.preventDefault()
    }
  }

  // Handle drag start for tangified image
  const handleTangifiedDragStart = async (e) => {
    if (!tangifiedImage || isRendering) {
      e.preventDefault()
      return
    }

    try {
      // Convert blob URL to data URL if needed
      let dataUrl = tangifiedImage
      if (tangifiedImage.startsWith('blob:')) {
        dataUrl = await blobUrlToDataUrl(tangifiedImage)
      }

      // Create image data for drag
      const imageData = {
        id: `cybertang-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'CyberTang',
        dataUrl: dataUrl,
        image: dataUrl,
        type: 'cybertang',
        layers: selectedLayers,
        savedAt: new Date().toISOString()
      }

      // Set drag data
      e.dataTransfer.setData('application/json', JSON.stringify(imageData))
      e.dataTransfer.effectAllowed = 'copy'
      e.dataTransfer.setData('text/plain', 'CyberTang')

      // Call optional callback
      if (onDragStart) {
        onDragStart(imageData)
      }
    } catch (error) {
      console.error('Error preparing tangified drag data:', error)
      e.preventDefault()
    }
  }

  return (
    <div style={borderWrapperStyle}>
      <div 
        ref={containerRef}
        style={containerStyle}
      >
        <canvas
          ref={actualRef}
          draggable={!isRendering && !showTangified}
          onDragStart={handleDragStart}
          style={{
            ...canvasStyle,
            display: showTangified ? 'none' : 'block',
          }}
        />
        {showTangified && tangifiedImage && (
          <img
            src={tangifiedImage}
            alt="Tangified Wojak"
            draggable={!isRendering}
            onDragStart={handleTangifiedDragStart}
            style={{
              display: 'block',
              width: `${width}px`,
              height: `${height}px`,
              objectFit: 'contain',
              aspectRatio: `${width} / ${height}`,
              cursor: 'grab',
            }}
          />
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Re-render if width, height, canvasRef, tangifiedImage, showTangified, selectedLayers, or isRendering changed
  return (
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.canvasRef === nextProps.canvasRef &&
    prevProps.tangifiedImage === nextProps.tangifiedImage &&
    prevProps.showTangified === nextProps.showTangified &&
    prevProps.selectedLayers === nextProps.selectedLayers &&
    prevProps.isRendering === nextProps.isRendering
  )
})

export default MemeCanvas

