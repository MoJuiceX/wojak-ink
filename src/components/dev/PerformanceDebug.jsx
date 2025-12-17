import { useState, useEffect } from 'react'
import { toggleFPSMonitoring, isMonitoringActive } from '../../utils/performance'
import './PerformanceDebug.css'

/**
 * Performance Debug Toggle Component
 * Only visible in development mode
 */
export default function PerformanceDebug() {
  const [isActive, setIsActive] = useState(false)
  const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development'

  useEffect(() => {
    if (!isDev) return
    
    // Check if monitoring was already active
    setIsActive(isMonitoringActive())
  }, [isDev])

  if (!isDev) return null

  const handleToggle = () => {
    const newState = toggleFPSMonitoring()
    setIsActive(newState)
  }

  return (
    <button
      className="performance-debug-toggle"
      onClick={handleToggle}
      title={isActive ? 'Disable FPS Monitor' : 'Enable FPS Monitor'}
      aria-label={isActive ? 'Disable FPS Monitor' : 'Enable FPS Monitor'}
    >
      {isActive ? '🔴 FPS' : '⚪ FPS'}
    </button>
  )
}


