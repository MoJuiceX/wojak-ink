import { useState, useEffect, useRef } from 'react'
import './Tooltip.css'

/**
 * Universal Tooltip Component
 * - Desktop: Shows on hover
 * - Mobile: Shows on long-press (500ms)
 */
export default function Tooltip({ 
  children, 
  content, 
  position = 'top',
  delay = 300,
  longPressDelay = 500 
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const containerRef = useRef(null)
  const tooltipRef = useRef(null)
  const timeoutRef = useRef(null)
  const longPressTimeoutRef = useRef(null)
  const isLongPressRef = useRef(false)
  const isMobile = useRef('ontouchstart' in window || navigator.maxTouchPoints > 0)

  // Calculate tooltip position
  const updatePosition = () => {
    if (!containerRef.current || !tooltipRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = containerRect.top + scrollY - tooltipRect.height - 8
        left = containerRect.left + scrollX + (containerRect.width / 2) - (tooltipRect.width / 2)
        break
      case 'bottom':
        top = containerRect.bottom + scrollY + 8
        left = containerRect.left + scrollX + (containerRect.width / 2) - (tooltipRect.width / 2)
        break
      case 'left':
        top = containerRect.top + scrollY + (containerRect.height / 2) - (tooltipRect.height / 2)
        left = containerRect.left + scrollX - tooltipRect.width - 8
        break
      case 'right':
        top = containerRect.top + scrollY + (containerRect.height / 2) - (tooltipRect.height / 2)
        left = containerRect.right + scrollX + 8
        break
      default:
        top = containerRect.top + scrollY - tooltipRect.height - 8
        left = containerRect.left + scrollX + (containerRect.width / 2) - (tooltipRect.width / 2)
    }

    // Keep tooltip within viewport
    const padding = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (left < padding) left = padding
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding
    }
    if (top < padding) top = padding
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding
    }

    setTooltipPosition({ top, left })
  }

  // Handle mouse enter (desktop)
  const handleMouseEnter = () => {
    if (isMobile.current) return // Skip hover on mobile
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      // Update position after a brief delay to ensure tooltip is rendered
      setTimeout(updatePosition, 10)
    }, delay)
  }

  // Handle mouse leave (desktop)
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  // Handle touch start (mobile - long press)
  const handleTouchStart = (e) => {
    if (!isMobile.current) return
    
    isLongPressRef.current = false
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setIsVisible(true)
      // Prevent default to avoid context menu
      e.preventDefault()
      setTimeout(updatePosition, 10)
    }, longPressDelay)
  }

  // Handle touch end (mobile)
  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    
    // Hide tooltip after a delay if it was shown via long press
    if (isLongPressRef.current) {
      setTimeout(() => {
        setIsVisible(false)
        isLongPressRef.current = false
      }, 2000) // Show for 2 seconds after long press
    }
  }

  // Handle touch move (cancel long press if user moves finger)
  const handleTouchMove = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
  }

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      updatePosition()
      const handleResize = () => updatePosition()
      const handleScroll = () => updatePosition()
      
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isVisible])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
    }
  }, [])

  if (!content) return children

  return (
    <>
      <div
        ref={containerRef}
        className="tooltip-container"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip-${position}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

