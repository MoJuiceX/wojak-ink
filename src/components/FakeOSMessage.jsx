import { useState, useEffect, useRef } from 'react'

// Fake Windows 98 OS messages for Desktop Destroyer vibes
const FAKE_MESSAGES = [
  'System stability compromised',
  'Juice overflow detected',
  'Desktop integrity at risk',
  'Orange.exe has stopped responding',
  'Critical juice level exceeded',
  'Desktop cleanup required',
  'System resources depleted',
  'Warning: Excessive orange activity',
  'Desktop performance degraded',
  'Juice containment failure',
]

export default function FakeOSMessage() {
  const [message, setMessage] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const lastMessageTimeRef = useRef(0)
  const debounceTimeoutRef = useRef(null)

  useEffect(() => {
    const handleSmash = () => {
      try {
        // Debounce: Don't show messages more than once per 3 seconds
        const now = Date.now()
        if (now - lastMessageTimeRef.current < 3000) {
          return
        }
        
        // 10-15% chance to show a fake OS message (random threshold between 0.85 and 0.90)
        const chance = Math.random()
        const threshold = 0.85 + Math.random() * 0.05 // Random between 0.85 and 0.90 (10-15% chance)
        if (chance >= threshold) {
          // Clear any pending debounce timeout
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
          }
          
          const randomMessage = FAKE_MESSAGES[Math.floor(Math.random() * FAKE_MESSAGES.length)]
          setMessage(randomMessage)
          setIsVisible(true)
          lastMessageTimeRef.current = now

          // Auto-dismiss after 2-3 seconds (quick dismissal, doesn't affect gameplay)
          const dismissTime = 2000 + Math.random() * 1000
          debounceTimeoutRef.current = setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => {
              setMessage(null)
            }, 300) // Wait for fade out animation
          }, dismissTime)
        }
      } catch (error) {
        console.warn('[FakeOSMessage] Error in handleSmash:', error)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('orange-smash', handleSmash)
      return () => {
        window.removeEventListener('orange-smash', handleSmash)
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }
      }
    }
  }, [])

  if (!message || !isVisible) return null

  // Simple toast overlay - NOT a window, just a non-intrusive message
  // Positioned at top-center to avoid glitching
  const safeWidth = typeof window !== 'undefined' ? window.innerWidth : 800
  const centerX = safeWidth / 2

  return (
    <div
      style={{
        position: 'fixed',
        left: `${centerX}px`,
        top: '80px',
        transform: 'translateX(-50%)',
        maxWidth: '300px',
        backgroundColor: '#ffffcc', // Yellow background for warning
        border: '2px outset #c0c0c0',
        padding: '8px 12px',
        zIndex: 10001, // Above most things but below critical UI
        pointerEvents: 'none', // Don't block interactions
        fontFamily: 'MS Sans Serif, sans-serif',
        fontSize: '11px',
        color: '#000',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease',
        userSelect: 'none',
        textAlign: 'center',
        boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
      }}
    >
      ⚠ {message}
    </div>
  )
}

