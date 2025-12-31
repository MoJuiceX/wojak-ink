import { useState, useEffect } from 'react'

/**
 * RateLimitError component
 * Displays rate limit error with countdown timer and auto-retry
 */
export default function RateLimitError({ onRetry, errorMessage = 'Rate limit exceeded' }) {
  const [countdown, setCountdown] = useState(30) // Start with 30 seconds
  const [canRetryNow, setCanRetryNow] = useState(false)

  useEffect(() => {
    // Start countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanRetryNow(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Auto-retry when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && canRetryNow) {
      // Small delay before auto-retry to ensure API has reset
      const timeoutId = setTimeout(() => {
        if (onRetry) {
          onRetry()
        }
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [countdown, canRetryNow, onRetry])

  const handleRetryClick = () => {
    if (canRetryNow && onRetry) {
      onRetry()
    }
  }

  return (
    <div className="treasury-error" style={{ position: 'relative', zIndex: 2 }}>
      <div className="treasury-error-message">
        {errorMessage}
        {countdown > 0 && (
          <div className="treasury-error-countdown" style={{ marginTop: '12px', fontSize: '14px', opacity: 0.9 }}>
            Retry in {countdown} second{countdown !== 1 ? 's' : ''}...
          </div>
        )}
        {countdown === 0 && (
          <div className="treasury-error-retry-available" style={{ marginTop: '12px', fontSize: '14px', color: '#4CAF50' }}>
            Ready to retry
          </div>
        )}
      </div>
      <button
        className="treasury-error-button"
        onClick={handleRetryClick}
        disabled={!canRetryNow}
        style={{
          opacity: canRetryNow ? 1 : 0.6,
          cursor: canRetryNow ? 'pointer' : 'not-allowed',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {canRetryNow ? 'Retry Now' : `Retry (${countdown}s)`}
      </button>
    </div>
  )
}

