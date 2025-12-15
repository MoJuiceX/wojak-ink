import React from 'react'

export default function LoadingSpinner({ size = 'medium', className = '' }) {
  const sizeStyles = {
    small: { width: '16px', height: '16px', borderWidth: '2px' },
    medium: { width: '24px', height: '24px', borderWidth: '3px' },
    large: { width: '32px', height: '32px', borderWidth: '4px' },
  }

  const style = sizeStyles[size] || sizeStyles.medium

  return (
    <div
      className={`loading-spinner ${className}`}
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: style.width,
        height: style.height,
        border: `${style.borderWidth} solid #d4d0c8`,
        borderTop: `${style.borderWidth} solid #000080`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

