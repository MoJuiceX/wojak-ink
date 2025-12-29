import { useState, useEffect } from 'react'
import Window from './Window'
import { getCenteredPosition } from '../../utils/windowPosition'
import './BigPulpWindow.css'

const BIG_PULP_IMAGES = [
  'Big-Pulp_Beret.png',
  'Big-Pulp_Cap.png', 
  'Big-Pulp_Clown.png',
  'Big-Pulp_Cowboy.png',
  'Big-Pulp_Crown.png',
  'Big-Pulp_Fedora.png',
  'Big-Pulp_Propella.png',
  'Big-Pulp_Tin.png',
  'Big-Pulp_Wiz.png'
]

const BigPulpWindow = ({ isOpen, onClose, nftId, commentary }) => {
  // Select random Big Pulp image on mount
  const [bigPulpImage] = useState(() => {
    const randomIndex = Math.floor(Math.random() * BIG_PULP_IMAGES.length)
    return BIG_PULP_IMAGES[randomIndex]
  })
  
  // Track image load state - only show text after image loads
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Position state for right-side placement
  const [position, setPosition] = useState({ left: 0, top: 0 })
  
  // Reset image loaded state when image changes
  useEffect(() => {
    setImageLoaded(false)
  }, [bigPulpImage])
  
  // Calculate centered position when window opens
  useEffect(() => {
    if (!isOpen) return
    
    // Wait for window to be rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const windowWidth = 480 // Big Pulp window width
        const windowHeight = windowWidth * (1200 / 800) // Calculate height from aspect ratio
        
        // Get centered position with padding
        const centeredPos = getCenteredPosition({
          width: windowWidth,
          height: windowHeight,
          padding: 24, // 24px padding on all sides
          isMobile: false
        })
        
        setPosition({ left: centeredPos.x, top: centeredPos.y })
      })
    })
  }, [isOpen])
  
  // Calculate font size based on text length to fit in bubble
  // Note: These breakpoints may need tuning after testing with actual commentary lengths
  const getFontSize = (text) => {
    if (!text) return '15px'
    const length = text.length
    if (length > 800) return '11px'
    if (length > 600) return '12px'
    if (length > 400) return '13px'
    if (length > 300) return '14px'
    return '15px'
  }

  if (!isOpen) return null

  const displayText = commentary || ''

  return (
    <Window
      id={`big-pulp-window-${nftId}`}
      title="Big Pulp's Take"
      icon="🍊"
      onClose={onClose}
      className="big-pulp-window-no-resize"
      style={{ 
        width: '480px',  // Scaled up for better text visibility in speech bubble
        left: `${position.left}px`,
        top: `${position.top}px`
      }}
    >
      <div className="big-pulp-window-body">
        <div className="big-pulp-image-container">
          <img 
            src={`/images/BigPulp/${bigPulpImage}`}
            alt="Big Pulp"
            className="big-pulp-image"
            draggable={false}
            onLoad={() => setImageLoaded(true)}
          />
          {imageLoaded && displayText && (
            <div 
              className="big-pulp-speech-text"
              style={{ fontSize: getFontSize(displayText) }}
            >
              {displayText.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}
          {imageLoaded && (
            <div className="big-pulp-nft-badge">
              NFT #{nftId}
            </div>
          )}
        </div>
      </div>
    </Window>
  )
}

export default BigPulpWindow
