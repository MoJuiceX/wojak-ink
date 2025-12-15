import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          if (onClose) onClose()
        }, 300) // Wait for fade out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const typeStyles = {
    info: {
      background: '#000080',
      color: 'white',
    },
    success: {
      background: '#008000',
      color: 'white',
    },
    error: {
      background: '#c00',
      color: 'white',
    },
    warning: {
      background: '#ff8c00',
      color: 'white',
    },
  }

  const style = typeStyles[type] || typeStyles.info

  if (!isVisible) return null

  return createPortal(
    <div
      className="toast"
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: style.background,
        color: style.color,
        padding: '16px 24px',
        fontSize: '12px',
        zIndex: 100000,
        boxShadow: '4px 4px 8px rgba(0,0,0,0.5)',
        border: '2px outset #c0c0c0',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        maxWidth: '90%',
        textAlign: 'center',
      }}
    >
      {message}
    </div>,
    document.body
  )
}

