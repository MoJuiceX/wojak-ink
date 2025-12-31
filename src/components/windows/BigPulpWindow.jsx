import { useState, useEffect, useRef } from 'react'
import Window from './Window'
import { getCenteredPosition } from '../../utils/windowPosition'
import { ensureOrangeAudioUnlocked, playOrangeClickSound } from '../../utils/orangeSound'
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

const BigPulpWindow = ({ 
  isOpen, 
  onClose, 
  nftId, 
  commentary, 
  nftTraits,
  currentVersion,      // NEW: which version (A, B, or C)
  currentImage,       // NEW: which Big Pulp image to show
  onRotate,           // NEW: callback to rotate version
}) => {
  const [isRotating, setIsRotating] = useState(false)
  
  // Track image load state - only show text after image loads
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Position state for right-side placement
  const [position, setPosition] = useState({ left: 0, top: 0 })
  
  // Dynamic font size state - adjusts to fit text without scrollbar
  const [fontSize, setFontSize] = useState(21)
  const textRef = useRef(null)
  
  
  // Reset image loaded state when image changes
  useEffect(() => {
    // Don't reset imageLoaded to false - keep text visible during image changes
    // The img onLoad will handle setting it to true when new image loads
    if (currentImage) {
      setFontSize(21) // Reset font size when image changes
      // Preload the new image but don't hide text
      const img = new Image()
      img.onload = () => {
        setImageLoaded(true)
      }
      img.onerror = () => {
        setImageLoaded(true) // Still show text even if image fails
      }
      img.src = `/images/BigPulp/${currentImage}`
    }
  }, [currentImage])
  
  // Adjust font size to fit text without scrollbar
  useEffect(() => {
    // Allow font adjustment even if image hasn't loaded yet (text should always be visible)
    if (!textRef.current || !commentary) return
    
    const adjustFontSize = () => {
      const textElement = textRef.current
      if (!textElement) return
      
      // Start with base font size
      let currentSize = 21
      textElement.style.fontSize = `${currentSize}px`
      
      // Check if text overflows
      const checkOverflow = () => {
        // Force reflow
        textElement.offsetHeight
        
        // Check if content overflows
        const hasOverflow = textElement.scrollHeight > textElement.clientHeight
        
        if (hasOverflow && currentSize > 10) {
          // Reduce font size by 1px and check again
          currentSize -= 1
          textElement.style.fontSize = `${currentSize}px`
          // Use requestAnimationFrame to ensure DOM has updated
          requestAnimationFrame(() => {
            requestAnimationFrame(checkOverflow)
          })
        } else {
          // Text fits, save the font size
          setFontSize(currentSize)
        }
      }
      
      // Wait for layout to settle
      requestAnimationFrame(() => {
        requestAnimationFrame(checkOverflow)
      })
    }
    
    // Small delay to ensure element is fully rendered
    const timeout = setTimeout(adjustFontSize, 50)
    
    return () => clearTimeout(timeout)
  }, [imageLoaded, commentary, currentImage, currentVersion])
  
  // Calculate centered position when window opens
  useEffect(() => {
    if (!isOpen) return
    
    // Wait for window to be rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const windowWidth = 500 // Reduced window size
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
  
  // Base font size - will be adjusted dynamically to fit without scrollbar
  const getFontSize = () => {
    return `${fontSize}px`
  }

  // Handle rotation with brief animation
  const handleRotate = () => {
    // Play orange click sound
    ensureOrangeAudioUnlocked().then(() => {
      playOrangeClickSound()
    })
    
    setIsRotating(true)
    // Brief delay for visual feedback
    setTimeout(() => {
      onRotate()
      setIsRotating(false)
    }, 150)
  }

  // Version indicator labels
  const versionLabels = {
    'A': '🔥 Hype Mode',
    'B': '😎 Street Smart',
    'C': '📖 Storyteller',
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
      img.src = `/images/BigPulp/${currentImage}`
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Image load timeout')), 5000)
      })
      
      // Draw image
      ctx.drawImage(img, 0, 0, 800, 1200)
      
      // Draw text in speech bubble area
      // Match CSS positioning exactly:
      // CSS: top: 9.5%, left: 9%, right: 9% (width = 82%), height: 36%, padding: 8px
      // Canvas: 800x1200 dimensions
      ctx.fillStyle = '#000000'
      
      // Use dynamic font size from state (matches what's displayed on screen)
      const canvasFontSize = fontSize
      const canvasLineHeight = canvasFontSize * 1.5 // CSS line-height: 1.5
      
      // Set font with Comic Sans MS to match CSS
      ctx.font = `${canvasFontSize}px "Comic Sans MS", "Comic Sans", cursive, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      
      // Calculate exact positions from CSS percentages + padding
      // textX = (9% × 800) + padding = 72 + 8 = 80px
      const textX = (0.09 * 800) + 8
      // textY = (9.5% × 1200) + padding = 114 + 8 = 122px
      const textY = (0.095 * 1200) + 8
      // textWidth = (82% × 800) - (2 × padding) = 656 - 16 = 640px
      const textWidth = (0.82 * 800) - (2 * 8)
      // textHeight = 36% of 1200 = 432px
      const textHeight = 0.36 * 1200
      const maxLines = Math.floor((textHeight - 8) / canvasLineHeight) // Account for bottom padding
      
      // Preserve paragraph breaks (\n\n) but handle single newlines
      // Split by double newlines first to preserve paragraphs
      const paragraphs = commentary.split(/\n\n+/).filter(p => p.trim())
      
      // Process each paragraph separately to preserve paragraph breaks
      let y = textY
      let linesDrawn = 0
      
      let shouldStop = false
      
      for (let paraIndex = 0; paraIndex < paragraphs.length && !shouldStop; paraIndex++) {
        const paragraph = paragraphs[paraIndex].trim()
        
        // Replace single newlines with spaces within paragraphs
        const textForCanvas = paragraph.replace(/\n/g, ' ')
        const words = textForCanvas.split(/\s+/).filter(Boolean)
        
        // Helper function to draw justified text (matching CSS text-align: justify)
        const drawJustifiedLine = (lineWords, x, yPos, width, isLastLine = false) => {
          if (lineWords.length === 0) return
          
          // For last line of paragraph, use left-align (standard justify behavior)
          if (isLastLine || lineWords.length === 1) {
            ctx.fillText(lineWords.join(' '), x, yPos)
            return
          }
          
          // Calculate total text width
          const text = lineWords.join(' ')
          const textWidthMeasured = ctx.measureText(text).width
          
          // If text is already close to width, just draw it (avoid excessive spacing)
          if (textWidthMeasured >= width * 0.9) {
            ctx.fillText(text, x, yPos)
            return
          }
          
          // Calculate spacing needed between words
          const spaceWidth = ctx.measureText(' ').width
          const totalSpaceNeeded = width - textWidthMeasured
          const spaceCount = lineWords.length - 1
          const spaceBetweenWords = spaceWidth + (totalSpaceNeeded / spaceCount)
          
          // Draw words with justified spacing
          let currentX = x
          for (let i = 0; i < lineWords.length; i++) {
            ctx.fillText(lineWords[i], currentX, yPos)
            const wordWidth = ctx.measureText(lineWords[i]).width
            currentX += wordWidth
            
            // Add spacing between words (except after last word)
            if (i < lineWords.length - 1) {
              currentX += spaceBetweenWords
            }
          }
        }
        
        // Build lines array with word wrapping
        const lines = []
        let currentLine = ''
        
        for (let i = 0; i < words.length && !shouldStop; i++) {
          const word = words[i]
          const testLine = currentLine + (currentLine ? ' ' : '') + word
          const metrics = ctx.measureText(testLine)
          
          if (metrics.width > textWidth && currentLine !== '') {
            // Save this line
            lines.push(currentLine.split(/\s+/).filter(Boolean))
            currentLine = word
            
            // Check if we've exceeded max lines
            if (lines.length >= maxLines) {
              shouldStop = true
              break
            }
          } else {
            currentLine = testLine
          }
        }
        
        // Draw all lines except the last one
        for (let lineIndex = 0; lineIndex < lines.length && !shouldStop; lineIndex++) {
          const isLastLineOfParagraph = (lineIndex === lines.length - 1 && !currentLine.trim())
          drawJustifiedLine(lines[lineIndex], textX, y, textWidth, isLastLineOfParagraph)
          y += canvasLineHeight
          linesDrawn++
        }
        
        // Draw remaining line from this paragraph if we haven't exceeded max lines
        if (!shouldStop && linesDrawn < maxLines && currentLine.trim()) {
          const remainingWords = currentLine.split(/\s+/).filter(Boolean)
          const isLastLineOfParagraph = true
          drawJustifiedLine(remainingWords, textX, y, textWidth, isLastLineOfParagraph)
          y += canvasLineHeight
          linesDrawn++
          
          if (linesDrawn >= maxLines) {
            shouldStop = true
          }
        }
        
        // Add spacing between paragraphs (skip after last paragraph)
        if (!shouldStop && paraIndex < paragraphs.length - 1 && linesDrawn < maxLines - 1) {
          y += canvasLineHeight * 0.5 // Half line height spacing between paragraphs
          // Don't count spacing as a line, but account for the space visually
        }
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
        width: '500px',  // Reduced window size
        left: `${position.left}px`,
        top: `${position.top}px`
      }}
    >
      <div className="big-pulp-window-content">
        {/* Image container - image renders first */}
        <div className="big-pulp-image-container">
          {/* Big Pulp character image - renders first as base layer */}
          <img 
            src={`/images/BigPulp/${currentImage}`}
            alt="Big Pulp"
            className={`big-pulp-character ${isRotating ? 'rotating' : ''}`}
            draggable={false}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Speech bubble text overlay - renders above image */}
          {/* Show text if we have commentary, even if image is still loading */}
          {displayText && (
            <div 
              ref={textRef}
              className={`big-pulp-speech-text ${isRotating ? 'rotating' : ''}`}
              style={{ fontSize: getFontSize() }}
            >
              {displayText}
            </div>
          )}

          {/* Version indicator - bottom left, above buttons */}
          {imageLoaded && currentVersion && (
            <div className="big-pulp-version-indicator">
              {versionLabels[currentVersion]}
            </div>
          )}

          {/* Buttons - bottom left of image */}
          {imageLoaded && (
            <>
              <button
                className="big-pulp-rotate-btn"
                onClick={handleRotate}
                disabled={isRotating}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Get a different take from Big Pulp"
              >
                Ask Big Pulp Again 🔄
              </button>
              <button
                className="big-pulp-share-btn"
                onClick={handleShareOnX}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Share on X (Twitter)"
              >
                Share on 𝕏
              </button>
            </>
          )}

          {/* NFT badge - bottom right */}
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
