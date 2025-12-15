import React from 'react'

export default function Label({ 
  htmlFor,
  children, 
  className = '',
  style = {},
  ...props 
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={className}
      style={{
        fontSize: '11px',
        display: 'block',
        marginBottom: '4px',
        ...style
      }}
      {...props}
    >
      {children}
    </label>
  )
}

