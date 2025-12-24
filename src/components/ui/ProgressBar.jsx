import React from 'react'

/**
 * Windows 98 style segmented progress bar component
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} status - Status message to display
 */
export default function ProgressBar({ progress = 0, status = '' }) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress))
  
  // Calculate number of segments (20 segments for Windows 98 style)
  const totalSegments = 20
  const filledSegments = Math.floor((clampedProgress / 100) * totalSegments)
  
  return (
    <div style={{
      width: '100%',
      marginTop: '8px',
    }}>
      {/* Progress bar container */}
      <div style={{
        border: '2px inset #c0c0c0',
        background: '#c0c0c0',
        padding: '2px',
        height: '20px',
        display: 'flex',
        gap: '1px',
        boxSizing: 'border-box',
      }}>
        {/* Segments */}
        {Array.from({ length: totalSegments }).map((_, index) => {
          const isFilled = index < filledSegments
          return (
            <div
              key={index}
              style={{
                flex: 1,
                background: isFilled ? '#008080' : '#d4d0c8',
                border: isFilled 
                  ? '1px inset #008080' 
                  : '1px inset #d4d0c8',
                boxSizing: 'border-box',
              }}
            />
          )
        })}
      </div>
      
      {/* Status message */}
      {status && (
        <div style={{
          marginTop: '4px',
          fontSize: '10px',
          color: '#000000',
          fontFamily: 'MS Sans Serif, sans-serif',
          textAlign: 'left',
        }}>
          {status}
        </div>
      )}
    </div>
  )
}


