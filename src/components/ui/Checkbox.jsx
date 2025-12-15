import React from 'react'

export default function Checkbox({ 
  checked, 
  onChange, 
  disabled = false,
  label,
  id,
  className = '',
  ...props 
}) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={className}
        style={{
          width: '13px',
          height: '13px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...props.style
        }}
        {...props}
      />
      {label && (
        <label 
          htmlFor={checkboxId}
          style={{
            fontSize: '11px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            userSelect: 'none'
          }}
        >
          {label}
        </label>
      )}
    </div>
  )
}

