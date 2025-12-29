import { useEffect, useRef } from 'react'
import './SystemMenu.css'
import { playSound } from '../../utils/soundManager'

export default function SystemMenu({ x, y, items, onClose }) {
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

    // Handle keyboard shortcuts (Alt+Space, R, M, S, N, X, Alt+F4)
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'Space') {
        e.preventDefault()
        // Alt+Space opens system menu, but we're already showing it
        // So we just prevent default
      } else if (e.altKey && e.key === 'F4') {
        e.preventDefault()
        const closeItem = items.find(item => item.action === 'close')
        if (closeItem && !closeItem.disabled) {
          closeItem.onClick()
          onClose()
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        const restoreItem = items.find(item => item.action === 'restore')
        if (restoreItem && !restoreItem.disabled) {
          restoreItem.onClick()
          onClose()
        }
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        const moveItem = items.find(item => item.action === 'move')
        if (moveItem && !moveItem.disabled) {
          moveItem.onClick()
          onClose()
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        const sizeItem = items.find(item => item.action === 'size')
        if (sizeItem && !sizeItem.disabled) {
          sizeItem.onClick()
          onClose()
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        const minimizeItem = items.find(item => item.action === 'minimize')
        if (minimizeItem && !minimizeItem.disabled) {
          minimizeItem.onClick()
          onClose()
        }
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        const maximizeItem = items.find(item => item.action === 'maximize')
        if (maximizeItem && !maximizeItem.disabled) {
          maximizeItem.onClick()
          onClose()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, items])

  // Adjust position if menu would go off screen
  const menuWidth = 160
  const itemHeight = 20
  const menuPadding = 2
  const estimatedMenuHeight = items.length * itemHeight + menuPadding
  
  const adjustedX = Math.min(x, window.innerWidth - menuWidth)
  const adjustedY = Math.min(y, window.innerHeight - estimatedMenuHeight)

  return (
    <div
      ref={menuRef}
      className="system-menu"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, index) => (
        item.separator ? (
          <div key={index} className="system-menu-separator" />
        ) : (
          <button
            key={index}
            className={`system-menu-item ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!item.disabled) {
                playSound('menuCommand')
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
          >
            <span className="system-menu-label">{item.label}</span>
            {item.shortcut && <span className="system-menu-shortcut">{item.shortcut}</span>}
          </button>
        )
      ))}
    </div>
  )
}

