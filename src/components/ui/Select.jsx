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
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
})

Select.displayName = 'Select'

export default Select

