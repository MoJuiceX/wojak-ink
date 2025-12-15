import React from 'react'

export default function Button({ 
  children, 
  onClick, 
  disabled = false, 
  type = 'button',
  className = '',
  ...props 
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        padding: '4px 12px',
        border: '1px outset #c0c0c0',
        background: disabled ? '#d4d0c8' : '#c0c0c0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '11px',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
        ...props.style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#d4d0c8'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#c0c0c0'
          e.currentTarget.style.border = '1px outset #c0c0c0'
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.border = '1px inset #c0c0c0'
          e.currentTarget.style.transform = 'scale(0.98)'
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.border = '1px outset #c0c0c0'
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

