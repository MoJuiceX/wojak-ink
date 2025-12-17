import Window from './Window'
import { useMemo, useEffect } from 'react'
import { getPrizesClaimedToday } from '../../lib/prizeCounter'
import { getCenteredPosition } from '../../utils/windowPosition'

/**
 * TreasureWindow - The joke "non-reward" window
 * Always shows "TRY AGAIN" - user can NEVER win
 * Shows deterministic counter based on calendar days with +3, +2 pattern
 * 
 * Positioned fixed within desktop layer, centered with 24px padding, never causes scrollbars
 */
export default function TreasureWindow({ isOpen = false, onClose }) {
  // Safe default for onClose
  const handleClose = onClose || (() => {})
  
  // Compute prizes claimed from date (deterministic, no localStorage)
  const prizesClaimed = useMemo(() => {
    return getPrizesClaimedToday()
  }, [isOpen]) // Re-compute when window opens (in case day changed)

  // Calculate centered position using CSS transform for perfect centering
  const centeredStyle = useMemo(() => {
    const windowWidth = 500
    const padding = 24
    
    return {
      width: `${windowWidth}px`,
      maxWidth: `calc(100vw - ${padding * 2}px)`, // Ensure padding on both sides
      maxHeight: `calc(100vh - ${padding * 2}px)`, // Ensure padding top and bottom
      position: 'fixed', // Fixed positioning within viewport (not document flow)
      left: '50%', // Center horizontally
      top: '50%', // Center vertically
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)', // Perfect centering using transform
      // Ensure window doesn't cause scrollbars
      overflow: 'visible',
      // Ensure it's within desktop layer (z-index handled by Window component)
    }
  }, [isOpen]) // Recalculate when window opens (in case viewport changed)

  // Ensure body/html overflow stays hidden when window opens (prevent scrollbars)
  useEffect(() => {
    if (!isOpen) return
    
    // Force body overflow to stay hidden
    const originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    
    // Also ensure html overflow stays hidden
    const originalHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    
    // Verify no scrollbars appear
    const checkScrollbars = () => {
      // If scrollbars appear, force them off
      if (document.body.scrollHeight > window.innerHeight) {
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
      }
    }
    
    // Check immediately and after a short delay
    checkScrollbars()
    const timeoutId = setTimeout(checkScrollbars, 100)
    
    return () => {
      clearTimeout(timeoutId)
      // Restore original overflow on close (though it should stay hidden)
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <Window
      id="treasure-window"
      title="🎁 TREASURE"
      icon={null}
      style={centeredStyle}
      onClose={handleClose}
    >
      <div className="window-body" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        minHeight: '400px'
      }}>
        {/* Headline - always "TRY AGAIN" - ON TOP OF PICTURE */}
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#000',
          marginBottom: '16px',
          fontFamily: 'MS Sans Serif, sans-serif',
          textTransform: 'uppercase',
        }}>
          TRY AGAIN
        </div>
        
        <img 
          src="/assets/treasure-prize.png" 
          alt="No luck try again"
          style={{
            maxWidth: '100%',
            height: 'auto',
            marginBottom: '20px',
            display: 'block'
          }}
        />
        
        {/* Subtext - dynamic counter from localStorage */}
        <div style={{
          fontSize: '12px',
          color: '#808080', // Muted grey
          marginBottom: '20px',
          fontFamily: 'MS Sans Serif, sans-serif',
        }}>
          Total prizes claimed: {prizesClaimed}
        </div>
        
        <button
          className="button"
          onClick={handleClose}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            fontSize: '12px'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          OK
        </button>
      </div>
    </Window>
  )
}

