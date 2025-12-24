import React from 'react'

export default function Input({ 
  value,
  onChange,
  type = 'text',
  disabled = false,
  placeholder = '',
  className = '',
  invalid = false,
  errorMessageId = null,
  required = false,
  ...props 
}) {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`
  const errorId = errorMessageId || `${inputId}-error`
  
  return (
    <>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        aria-invalid={invalid ? 'true' : 'false'}
        aria-describedby={invalid && errorMessageId ? errorId : undefined}
        aria-required={required ? 'true' : undefined}
        style={{
          padding: '2px 4px',
          border: invalid 
            ? '1px inset var(--state-error)' 
            : '1px inset var(--input-border)',
          background: disabled ? 'var(--input-disabled-face)' : 'var(--input-face)',
          color: disabled ? 'var(--input-disabled-text)' : 'var(--input-text)',
          fontSize: '11px',
          fontFamily: 'inherit',
          ...props.style
        }}
        {...props}
      />
      {invalid && errorMessageId && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{
            fontSize: '11px',
            color: 'var(--state-error)',
            marginTop: '4px',
          }}
        >
          {/* Error message will be provided by parent component */}
        </div>
      )}
    </>
  )
}

