import React from 'react'
import { playSound } from '../../utils/soundManager'

export default function Button({ 
  children, 
  onClick, 
  disabled = false, 
  type = 'button',
  className = '',
  ...props 
}) {
  const handleClick = (e) => {
    if (!disabled) {
      playSound('click')
      onClick?.(e)
    }
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={className}
      style={{
        padding: '4px 12px',
        border: `1px outset var(--border-light)`,
        background: disabled ? 'var(--btn-disabled)' : 'var(--btn-face)',
        color: 'var(--btn-text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        transition: 'transform 0.2s ease, opacity 0.2s ease',
        position: className.includes('win98-tooltip') ? 'relative' : undefined, // Ensure tooltips work
        ...props.style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'var(--btn-face-hover)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'var(--btn-face)'
          e.currentTarget.style.border = '1px outset var(--border-light)'
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.border = '1px inset var(--border-dark)'
          e.currentTarget.style.transform = 'scale(0.98)'
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.border = '1px outset var(--border-light)'
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
      onTouchStart={(e) => {
        if (!disabled) {
          // Only handle if touch started on this exact element or its children
          if (e.target !== e.currentTarget && !e.currentTarget.contains(e.target)) {
            return
          }
          // Visual feedback for touch
          e.currentTarget.style.background = 'var(--btn-face-hover)'
          e.currentTarget.style.border = '1px inset var(--border-dark)'
          e.currentTarget.style.transform = 'scale(0.98)'
        }
      }}
      onTouchEnd={(e) => {
        if (!disabled) {
          // Only handle if touch ended on this exact element or its children
          if (e.target !== e.currentTarget && !e.currentTarget.contains(e.target)) {
            return
          }
          // Reset visual feedback
          e.currentTarget.style.background = 'var(--btn-face)'
          e.currentTarget.style.border = '1px outset var(--border-light)'
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

