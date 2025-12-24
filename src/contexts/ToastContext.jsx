import { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/ui/Toast'
import { playSound } from '../utils/soundManager'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, duration }])
    
    // Play sound based on toast type
    switch (type) {
      case 'success':
        playSound('notify')
        break
      case 'error':
        playSound('error')
        break
      case 'warning':
        playSound('exclamation')
        break
      case 'info':
        playSound('asterisk')
        break
      default:
        playSound('notify')
    }
    
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

