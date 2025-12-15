import React from 'react'

export default function Select({ 
  value, 
  onChange, 
  options = [], 
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
      style={{
        padding: '2px 4px',
        border: '1px inset #c0c0c0',
        background: disabled ? '#d4d0c8' : '#ffffff',
        fontSize: '11px',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...props.style
      }}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

