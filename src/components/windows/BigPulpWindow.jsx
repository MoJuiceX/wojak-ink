import { useState, useEffect } from 'react'
import Window from './Window'
import { getCenteredPosition } from '../../utils/windowPosition'
import './BigPulpWindow.css'

const ALL_IMAGES = [
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

// Trait to image mapping
const TRAIT_TO_IMAGE = {
  'Crown': 'Big-Pulp_Crown.png',
  'Military Beret': 'Big-Pulp_Beret.png',
  'Wizard Hat': 'Big-Pulp_Wiz.png',
  'Wizard Drip': 'Big-Pulp_Wiz.png',
  'Clown': 'Big-Pulp_Clown.png',
  'Clown Nose': 'Big-Pulp_Clown.png',
  'Fedora': 'Big-Pulp_Fedora.png',
  'Neckbeard': 'Big-Pulp_Fedora.png',
  'Tin Foil Hat': 'Big-Pulp_Tin.png',
  'Cowboy Hat': 'Big-Pulp_Cowboy.png',
  'Propeller Hat': 'Big-Pulp_Propella.png',
  'Cap': 'Big-Pulp_Cap.png',
  'Beer Hat': 'Big-Pulp_Cap.png',
}

// Priority order for matching (highest first)
const TRAIT_PRIORITY = [
  'Crown',
  'Military Beret', 
  'Wizard Hat',
  'Wizard Drip',
  'Clown',
  'Clown Nose',
  'Fedora',
  'Neckbeard',
  'Tin Foil Hat',
  'Cowboy Hat',
  'Propeller Hat',
  'Cap',
  'Beer Hat',
]

// Function to select image based on NFT traits
const selectBigPulpImage = (nftTraits) => {
  if (!nftTraits || !Array.isArray(nftTraits)) {
    // No traits provided - return random
    return ALL_IMAGES[Math.floor(Math.random() * ALL_IMAGES.length)]
  }
  
  // Check traits in priority order
  for (const trait of TRAIT_PRIORITY) {
    if (nftTraits.includes(trait)) {
      return TRAIT_TO_IMAGE[trait]
    }
  }
  
  // No match - return random
  return ALL_IMAGES[Math.floor(Math.random() * ALL_IMAGES.length)]
}

const BigPulpWindow = ({ isOpen, onClose, nftId, commentary, nftTraits }) => {
  // Select Big Pulp image based on NFT traits (or random if no match)
  const [bigPulpImage] = useState(() => selectBigPulpImage(nftTraits))
  
  // Track image load state - only show text after image loads
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Position state for right-side placement
  const [position, setPosition] = useState({ left: 0, top: 0 })
  
  // Play sound effect when window opens
  useEffect(() => {
    if (!isOpen) return
    
    const audio = new Audio('/sounds/w98sounds/DING.mp3')
    audio.volume = 0.5 // Adjust volume (0.0 to 1.0)
    audio.play().catch(err => {
      // Ignore autoplay errors (browser may block)
      console.log('Audio autoplay blocked:', err)
    })
  }, [isOpen])
  
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

  // Handle share on X button click
  const handleShareOnX = async () => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Match image dimensions (800 x 1200)
      canvas.width = 800
      canvas.height = 1200
      
      // Load Big Pulp image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = `/images/BigPulp/${bigPulpImage}`
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Image load timeout')), 5000)
      })
      
      // Draw image
      ctx.drawImage(img, 0, 0, 800, 1200)
      
      // Draw text in speech bubble area
      ctx.fillStyle = '#000000'
      ctx.font = '24px "MS Sans Serif", sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      
      // Text area bounds (speech bubble) - matching CSS positioning
      const textX = 64  // 8% of 800
      const textY = 96  // 8% of 1200 (adjusted for better positioning)
      const textWidth = 672  // 84% of 800
      const textHeight = 432 // 36% of 1200
      const lineHeight = 32
      const maxLines = Math.floor(textHeight / lineHeight)
      
      // Word wrap and draw text (replace paragraph breaks with single space for canvas)
      const textForCanvas = commentary.replace(/\n\n/g, ' ').replace(/\n/g, ' ')
      const words = textForCanvas.split(/\s+/).filter(Boolean)
      let line = ''
      let y = textY
      let linesDrawn = 0
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        const testLine = line + (line ? ' ' : '') + word
        const metrics = ctx.measureText(testLine)
        
        if (metrics.width > textWidth && line !== '') {
          ctx.fillText(line, textX, y)
          line = word
          y += lineHeight
          linesDrawn++
          
          if (linesDrawn >= maxLines - 1) {
            // Last line - check if remaining text fits
            const remainingWords = words.slice(i + 1)
            const remainingText = remainingWords.join(' ')
            const lastLine = line + (remainingText ? ' ' + remainingText : '')
            if (ctx.measureText(lastLine).width > textWidth) {
              // Text doesn't fit, add ellipsis
              let ellipsisLine = line
              while (ctx.measureText(ellipsisLine + '...').width > textWidth && ellipsisLine.length > 0) {
                ellipsisLine = ellipsisLine.slice(0, -1)
              }
              ctx.fillText(ellipsisLine + '...', textX, y)
            } else {
              ctx.fillText(lastLine, textX, y)
            }
            break
          }
        } else {
          line = testLine
        }
      }
      
      // Draw remaining text if we haven't exceeded max lines
      if (linesDrawn < maxLines && line.trim()) {
        ctx.fillText(line.trim(), textX, y)
      }
      
      // Add NFT ID badge
      ctx.fillStyle = 'rgba(255, 102, 0, 0.9)'
      ctx.fillRect(680, 1150, 100, 35)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 18px "MS Sans Serif", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`NFT #${nftId}`, 690, 1160)
      
      // Download image
      const link = document.createElement('a')
      link.download = `bigpulp-${nftId}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      // Open Twitter with pre-filled text (after short delay)
      setTimeout(() => {
        const tweetText = encodeURIComponent(
          `Big Pulp's take on my Wojak Farmers Plot #${nftId} 🍊\n\nCheck yours at wojak.ink`
        )
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank')
      }, 500)
    } catch (error) {
      console.error('Error generating share image:', error)
      // Fallback: just open Twitter
      const tweetText = encodeURIComponent(
        `Big Pulp's take on my Wojak Farmers Plot #${nftId} 🍊\n\nCheck yours at wojak.ink`
      )
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank')
    }
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
          {imageLoaded && (
            <button 
              className="big-pulp-share-button"
              onClick={handleShareOnX}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title="Download image and share on X"
            >
              Share on 𝕏
            </button>
          )}
        </div>
      </div>
    </Window>
  )
}

export default BigPulpWindow
