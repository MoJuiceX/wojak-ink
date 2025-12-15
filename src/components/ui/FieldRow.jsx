import React from 'react'

export default function FieldRow({ 
  children, 
  className = '',
  style = {},
  ...props 
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  )
}

