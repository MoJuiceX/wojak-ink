import React from 'react'

export default function Input({ 
  value,
  onChange,
  type = 'text',
  disabled = false,
  placeholder = '',
  className = '',
  ...props 
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      style={{
        padding: '2px 4px',
        border: '1px inset #c0c0c0',
        background: disabled ? '#d4d0c8' : '#ffffff',
        fontSize: '11px',
        fontFamily: 'inherit',
        ...props.style
      }}
      {...props}
    />
  )
}

