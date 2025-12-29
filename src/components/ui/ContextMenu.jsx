import { useState, useEffect, useRef } from 'react'
import './ContextMenu.css'
import { playSound } from '../../utils/soundManager'

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null)

  // Play menu popup sound when menu appears
  useEffect(() => {
    playSound('menuPopup')
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position if menu would go off screen
  const menuWidth = 160
  const itemHeight = 28
  const menuPadding = 10
  const estimatedMenuHeight = items.length * itemHeight + menuPadding
  
  const adjustedX = Math.min(x, window.innerWidth - menuWidth)
  const adjustedY = Math.min(y, window.innerHeight - estimatedMenuHeight)

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, index) => {
        // Generate a unique key that can never be 0 or a number
        // Use item.label or item.icon if available, otherwise use index with prefix
        const uniqueKey = item.label 
          ? `context-menu-item-${item.label}-${index}` 
          : item.icon 
          ? `context-menu-item-${item.icon}-${index}`
          : `context-menu-item-separator-${index}`
        
        return item.separator ? (
          <div key={uniqueKey} className="context-menu-separator" />
        ) : (
          <button
            key={uniqueKey}
            className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!item.disabled) {
                playSound('menuCommand')
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}

