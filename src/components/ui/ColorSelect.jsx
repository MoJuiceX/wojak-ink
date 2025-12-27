import { useState, useRef, useEffect } from 'react'

/**
 * ColorSelect - A custom dropdown that displays color squares instead of text
 * Matches Windows 98 Select component styling exactly
 */
export default function ColorSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  id,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)
  const dropdownRef = useRef(null)

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value) || options[0]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = (optionValue) => {
    if (onChange) {
      // Create a synthetic event to match native select onChange
      const syntheticEvent = {
        target: { value: optionValue }
      }
      onChange(syntheticEvent)
    }
    setIsOpen(false)
  }

  // Get color square style for an option
  const getColorSquareStyle = (option) => {
    if (option.hex) {
      return {
        backgroundColor: option.hex,
        width: '20px',
        height: '20px',
        border: '2px solid #808080',
        borderRadius: '0',
        display: 'inline-block',
        flexShrink: 0
      }
    } else if (option.isBase) {
      // Base variant - light gray with border
      return {
        backgroundColor: '#e0e0e0',
        width: '20px',
        height: '20px',
        border: '2px solid #808080',
        borderRadius: '0',
        display: 'inline-block',
        flexShrink: 0
      }
    } else {
      // Default - transparent or placeholder
      return {
        backgroundColor: 'transparent',
        width: '20px',
        height: '20px',
        border: '2px solid #808080',
        borderRadius: '0',
        display: 'inline-block',
        flexShrink: 0
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Selected value display - looks like a select button */}
      <button
        ref={selectRef}
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        className={className}
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          height: '32px',
          minHeight: '32px',
          padding: '6px 12px',
          border: '1px inset var(--input-border)',
          background: disabled ? 'var(--input-disabled-face)' : 'var(--input-face)',
          color: disabled ? 'var(--input-disabled-text)' : 'var(--input-text)',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          ...props.style
        }}
        {...props}
      >
        {selectedOption && (
          <span style={getColorSquareStyle(selectedOption)} />
        )}
        <span style={{ flex: 1, textAlign: 'left' }}></span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'var(--input-face)',
            border: '1px inset var(--input-border)',
            boxShadow: 'none',
            marginTop: '2px',
            maxHeight: '200px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                disabled={option.disabled}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  border: 'none',
                  background: isSelected 
                    ? 'var(--selection-bg)' 
                    : option.disabled 
                    ? 'transparent' 
                    : 'transparent',
                  color: isSelected 
                    ? 'var(--selection-text)' 
                    : option.disabled 
                    ? 'var(--input-disabled-text)' 
                    : 'var(--input-text)',
                  fontFamily: 'inherit',
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minHeight: '32px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (!option.disabled && !isSelected) {
                    e.currentTarget.style.background = 'var(--state-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                  } else {
                    e.currentTarget.style.background = 'var(--selection-bg)'
                  }
                }}
              >
                <span className="color-square-select" style={getColorSquareStyle(option)} />
                <span style={{ flex: 1 }}></span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

