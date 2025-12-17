import React from 'react'

export default function Skeleton({ 
  width = '100%', 
  height = '1em', 
  className = '',
  variant = 'rectangular' // 'rectangular' or 'circular'
}) {
  const baseStyle = {
    width,
    height,
    background: '#d4d0c8',
    borderRadius: variant === 'circular' ? '50%' : '2px',
    position: 'relative',
    overflow: 'hidden',
  }

  return (
    <div
      className={`skeleton ${className}`}
      style={baseStyle}
      aria-hidden="true"
    >
      <div
        className="skeleton-shimmer"
        style={{
          position: 'absolute',
          top: 0,
          transform: 'translateX(-100%)',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  )
}

