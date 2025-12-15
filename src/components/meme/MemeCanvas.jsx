import { useEffect, useRef } from 'react'

export default function MemeCanvas({ canvasRef, width = 800, height = 800 }) {
  const containerRef = useRef(null)
  const internalRef = useRef(null)
  
  // Use provided ref or fallback to internal ref
  const actualRef = canvasRef || internalRef

  useEffect(() => {
    const canvas = actualRef.current
    if (canvas) {
      canvas.width = width
      canvas.height = height
    }
  }, [actualRef, width, height])

  return (
    <div 
      ref={containerRef}
      style={{
        border: '2px inset #c0c0c0',
        background: '#ffffff',
        display: 'inline-block',
        padding: '4px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      <canvas
        ref={actualRef}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  )
}

