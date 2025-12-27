import React from 'react'

const Select = React.forwardRef(({ 
  value, 
  onChange, 
  onInput,
  onKeyDown,
  onFocus,
  onBlur,
  options = [], 
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  return (
    <select
      ref={ref}
      value={value}
      onChange={onChange}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      className={className}
      style={{
        padding: '6px 12px',
        border: '1px inset var(--input-border)',
        background: disabled ? 'var(--input-disabled-face)' : 'var(--input-face)',
        color: disabled ? 'var(--input-disabled-text)' : 'var(--input-text)',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        minHeight: '28px',
        height: '28px',
        lineHeight: '1.4',
        boxSizing: 'border-box',
        ...props.style
      }}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
})

Select.displayName = 'Select'

export default Select

