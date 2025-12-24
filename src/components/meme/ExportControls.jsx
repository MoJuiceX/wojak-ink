import { useState, useRef, useEffect } from 'react'
import { Button } from '../ui'
import Window from '../windows/Window'
import { downloadCanvasAsPNG, copyCanvasToClipboard, canvasToBlob, blobUrlToDataUrl, compressImage } from '../../utils/imageUtils'
import { generateWojakFilename, buildImageName } from '../../utils/filenameUtils'
import { buildCyberTangPrompt } from '../../utils/tangifyPrompts'
import { useToast } from '../../contexts/ToastContext'
import { findExistingOriginalByTraits, generatePairId, isDuplicateImage } from '../../utils/desktopUtils'
import { playSound } from '../../utils/soundManager'

// Try to import screensaver context (may not exist)
// Import at module level to avoid conditional hook calls
let useScreensaver = null
try {
  const screensaverContext = require('../../contexts/ScreensaverContext')
  useScreensaver = screensaverContext.useScreensaver
} catch (e) {
  // Context doesn't exist yet, that's ok
}

// Create a safe wrapper that always returns a consistent structure
const useScreensaverSafe = () => {
  if (!useScreensaver) {
    return { setTangifying: null }
  }
  try {
    return useScreensaver() || { setTangifying: null }
  } catch (e) {
    return { setTangifying: null }
  }
}

// iOS detection helper
const isIOS = () => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function ExportControls({ 
  canvasRef, 
  selectedLayers = {}, 
  onRandomize,
  tangifiedImage,
  setTangifiedImage,
  showTangified,
  setShowTangified,
  onAddToGallery,
  onUpdateGalleryEntry,
  onRemoveGalleryEntry,
  onAddDesktopImage,
  desktopImages = [] // Array of current desktop images for duplicate/existing checks
}) {
  const { showToast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const [showFallbackHint, setShowFallbackHint] = useState(false)
  
  // Tangify state
  const [isTangifying, setIsTangifying] = useState(false)
  const [tangifyProgress, setTangifyProgress] = useState(0)
  const [tangifyLabel, setTangifyLabel] = useState('')
  const [originalCanvasData, setOriginalCanvasData] = useState(null)
  const tangifiedImageUrlRef = useRef(null) // Track blob URL for cleanup
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const lastTangifiedTraitsRef = useRef(null) // Track last tangified traits

  // Update screensaver context when tangifying state changes
  // Always call the hook unconditionally to avoid React hooks rule violations
  const screensaverContext = useScreensaverSafe()
  const setTangifying = screensaverContext?.setTangifying || null
  
  useEffect(() => {
    if (setTangifying) {
      setTangifying(isTangifying)
    }
  }, [isTangifying, setTangifying])

  // Require a complete base Wojak before allowing download:
  // - Base
  // - Mouth (Base)
  // - Clothing
  const hasBase =
    selectedLayers['Base'] && selectedLayers['Base'] !== 'None'
  const hasMouthBase =
    selectedLayers['MouthBase'] && selectedLayers['MouthBase'] !== 'None'
  const hasClothes =
    selectedLayers['Clothes'] && selectedLayers['Clothes'] !== 'None'

  const canDownload = hasBase && hasMouthBase && hasClothes
  const isDownloadDisabled =
    !canDownload || isExporting || !canvasRef.current
  
  // Save original canvas state when needed
  useEffect(() => {
    if (canvasRef.current && !originalCanvasData && !showTangified) {
      const canvas = canvasRef.current
      const dataUrl = canvas.toDataURL('image/png')
      setOriginalCanvasData(dataUrl)
    }
  }, [canvasRef, originalCanvasData, showTangified])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (tangifiedImageUrlRef.current) {
        URL.revokeObjectURL(tangifiedImageUrlRef.current)
        tangifiedImageUrlRef.current = null
      }
    }
  }, []) // Empty dependency array - only cleanup on unmount

  // Helper function to compare traits objects
  const areTraitsEqual = (traits1, traits2) => {
    if (!traits1 || !traits2) return false
    const keys1 = Object.keys(traits1).sort()
    const keys2 = Object.keys(traits2).sort()
    if (keys1.length !== keys2.length) return false
    return keys1.every(key => traits1[key] === traits2[key])
  }

  // Reset last tangified traits when selectedLayers change (user changed dropdowns)
  useEffect(() => {
    if (lastTangifiedTraitsRef.current && !areTraitsEqual(selectedLayers, lastTangifiedTraitsRef.current)) {
      lastTangifiedTraitsRef.current = null
    }
  }, [selectedLayers])

  const handleTangify = async () => {
    if (!canvasRef.current || isTangifying) return
    
    // Check if this is a duplicate (same traits as last tangified)
    if (lastTangifiedTraitsRef.current && areTraitsEqual(selectedLayers, lastTangifiedTraitsRef.current)) {
      setShowDuplicateConfirm(true)
      return
    }
    
    // Proceed with tangify
    await performTangify()
  }

  const performTangify = async () => {
    if (!canvasRef.current || isTangifying) return
    
    playSound('ding')
    setIsTangifying(true)
    setTangifyProgress(0)
    setTangifyLabel('Initializing...')
    
    // Capture canvas as base64 before API call
    const canvas = canvasRef.current
    const canvasDataUrl = canvas.toDataURL('image/png')
    
    // Save original canvas before tangify
    if (!originalCanvasData) {
      setOriginalCanvasData(canvasDataUrl)
    }
    
    // Create placeholder entry for gallery with stable unique ID
    let placeholderId = null
    if (onAddToGallery) {
      // Use timestamp + random to ensure uniqueness even with rapid clicks
      placeholderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const placeholderEntry = {
        id: placeholderId,
        originalImage: canvasDataUrl,
        cyberTangImage: null,
        timestamp: new Date().toISOString(),
        traits: { ...selectedLayers },
        status: 'loading'
      }
      onAddToGallery(placeholderEntry)
    }
    
    // Progress simulation
    const stages = [
      { progress: 10, label: 'Capturing Wojak...' },
      { progress: 25, label: 'Connecting to OpenAI...' },
      { progress: 40, label: 'Editing image...' },
      { progress: 55, label: 'Applying cyberpunk style...' },
      { progress: 70, label: 'AI is editing...' },
      { progress: 85, label: 'Finalizing edit...' },
      { progress: 95, label: 'Almost there...' },
    ]
    
    let stageIndex = 0
    const progressInterval = setInterval(() => {
      if (stageIndex < stages.length) {
        setTangifyProgress(stages[stageIndex].progress)
        setTangifyLabel(stages[stageIndex].label)
        stageIndex++
      }
    }, 2000)
    
    try {
      // Convert canvas to Blob (PNG) and capture data URL for original Wojak
      // At this point, canvas definitely has the original Wojak rendered
      const canvas = canvasRef.current
      
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            // Validate blob has reasonable size (not a tiny black image)
            // A valid Wojak PNG should be at least a few KB
            const minBlobSize = 5000 // 5KB minimum for a valid image
            if (blob.size < minBlobSize) {
              console.warn('Canvas blob is suspiciously small - may be black/invalid', blob.size, 'bytes')
            }
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        }, 'image/png')
      })
      
      // Convert blob to data URL - this is more reliable than canvas.toDataURL()
      // because the blob is guaranteed to have valid image data
      const originalCanvasDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        const blobSize = blob.size // Capture blob size before async callback
        const blobType = blob.type // Capture blob type before async callback
        reader.onloadend = () => {
          const result = reader.result
          resolve(result)
        }
        reader.onerror = (error) => {
          reject(new Error('FileReader failed: ' + (error?.message || 'Unknown error')))
        }
        try {
          reader.readAsDataURL(blob)
        } catch (readError) {
          reject(new Error('Failed to read blob: ' + (readError?.message || 'Unknown error')))
        }
      })
      
      // Store in state for later use
      if (!originalCanvasData) {
        setOriginalCanvasData(originalCanvasDataUrl)
      }
      
      // Generate dynamic prompt based on selected layers
      const prompt = buildCyberTangPrompt(selectedLayers)
      
      // Build FormData
      const formData = new FormData()
      formData.append('image', blob, 'wojak.png')
      formData.append('prompt', prompt)
      
      // Call API
      const response = await fetch('/api/tangify', {
        method: 'POST',
        body: formData, // No Content-Type header - browser sets it with boundary
      })
      
      if (!response.ok) {
        let errorMessage = 'CyberTang failed'
        try {
          const errorJson = await response.json()
          errorMessage = errorJson.error || errorMessage
        } catch (e) {
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (e2) {
            // Use default error message
          }
        }
        throw new Error(errorMessage)
      }
      
      // Get PNG blob from response
      const outBlob = await response.blob()
      
      // Clean up old blob URL if it exists
      if (tangifiedImageUrlRef.current) {
        URL.revokeObjectURL(tangifiedImageUrlRef.current)
        tangifiedImageUrlRef.current = null
      }
      
      // Create new blob URL
      const url = URL.createObjectURL(outBlob)
      tangifiedImageUrlRef.current = url
      
      // Convert blob URL to data URL for gallery storage (data URLs don't need cleanup)
      let resultDataUrl = null
      if (onUpdateGalleryEntry && placeholderId) {
        try {
          resultDataUrl = await blobUrlToDataUrl(url)
          // Update the placeholder entry with the final result using the same ID
          onUpdateGalleryEntry(placeholderId, {
            cyberTangImage: resultDataUrl,
            status: 'complete'
          })
        } catch (error) {
          console.error('Failed to convert blob URL to data URL for gallery:', error)
          // If conversion fails, we could store blob URL but need cleanup later
          // For now, mark as error to avoid memory leaks
          onUpdateGalleryEntry(placeholderId, {
            status: 'error'
          })
        }
      }

      // Save to desktop: Check if Original with same traits exists
      if (onAddDesktopImage) {
        try {
          const existingOriginal = findExistingOriginalByTraits(desktopImages, selectedLayers)
          let pairId
          let savedOriginal = false

          if (existingOriginal) {
            // Original exists - use its pairId, don't save Original again
            pairId = existingOriginal.pairId
          } else {
            // Original doesn't exist - save it first, then CyberTang
            pairId = generatePairId()
            // Use originalCanvasDataUrl captured when blob was created (most reliable)
            // Fallback to originalCanvasData state, then canvasDataUrl
            // All of these should have the original Wojak, but originalCanvasDataUrl is captured at the best time
            let originalDataUrl = originalCanvasDataUrl || originalCanvasData || canvasDataUrl
            if (!originalDataUrl || !originalDataUrl.startsWith('data:image/')) {
              // Last resort: try to re-capture from canvas (only if it still shows original)
              if (canvasRef.current && !showTangified) {
                originalDataUrl = canvasRef.current.toDataURL('image/png')
              }
            }
            let originalCompressed
            try {
              originalCompressed = await compressImage(originalDataUrl)
              // Validate compressed result is reasonable size
              if (!originalCompressed || originalCompressed.length < 1000) {
                console.warn('Compression produced suspiciously small result, using uncompressed original', originalCompressed?.length)
                originalCompressed = originalDataUrl // Fallback to uncompressed
              }
            } catch (compressionError) {
              console.warn('Image compression failed, using uncompressed original', compressionError)
              originalCompressed = originalDataUrl // Fallback to uncompressed
            }
            const originalFilename = buildImageName(selectedLayers, 'original')
            onAddDesktopImage(originalCompressed, originalFilename, 'original', selectedLayers, pairId)
            savedOriginal = true
          }

          // Save CyberTang with same pairId
          const cybertangDataUrl = await blobUrlToDataUrl(url)
          const cybertangCompressed = await compressImage(cybertangDataUrl)
          const cybertangFilename = buildImageName(selectedLayers, 'cybertang')
          onAddDesktopImage(cybertangCompressed, cybertangFilename, 'cybertang', selectedLayers, pairId)

          if (savedOriginal) {
            playSound('tada')
            showToast('✅ CyberTang pair saved to desktop!', 'success', 3000)
          } else {
            playSound('tada')
            showToast('✅ CyberTang saved to desktop!', 'success', 3000)
          }
        } catch (error) {
          console.error('Error saving CyberTang to desktop:', error)
          // Don't show error toast - the CyberTang generation succeeded
        }
      }
      
      clearInterval(progressInterval)
      setTangifyProgress(100)
      setTangifyLabel('Complete!')
      
      // Save the traits that were just tangified
      lastTangifiedTraitsRef.current = { ...selectedLayers }
      
      if (setTangifiedImage) {
        setTangifiedImage(url)
      }
      if (setShowTangified) {
        setShowTangified(true)
      }
      
      setTimeout(() => {
        setIsTangifying(false)
      }, 1000)
      
    } catch (error) {
      clearInterval(progressInterval)
      console.error('CyberTang error:', error)
      playSound('error')
      
      // Remove placeholder entry on error
      if (onRemoveGalleryEntry && placeholderId) {
        onRemoveGalleryEntry(placeholderId)
      }
      
      alert('Failed to cyberfy: ' + error.message)
      setIsTangifying(false)
    }
  }
  
  const handleDownload = async () => {
    if (!canvasRef.current || !canDownload) {
      return
    }

    // iOS-specific UX improvement: inform users about Save to Photos option
    if (isIOS()) {
      showToast('💡 On iOS, use "Save to Photos" button for better experience', 'info', 3000)
    }

    setIsExporting(true)
    setExportStatus('Downloading...')

    try {
      // Check for duplicate before saving
      if (isDuplicateImage(desktopImages, selectedLayers, 'original')) {
        showToast('ℹ️ This Wojak is already on your desktop', 'info', 3000)
        setExportStatus('Already saved')
        setTimeout(() => setExportStatus(''), 2000)
        setIsExporting(false)
        return
      }

      // Generate filename using buildImageName for desktop storage
      const filename = buildImageName(selectedLayers, 'original')
      // Use generateWojakFilename for actual download
      const downloadFilename = generateWojakFilename({ selectedLayers })
      
      // Capture canvas as data URL before download
      const canvasDataUrl = canvasRef.current.toDataURL('image/png')
      
      // Download the file
      await downloadCanvasAsPNG(canvasRef.current, downloadFilename)
      
      // Add to desktop icons - compress image before storing
      if (onAddDesktopImage) {
        try {
          const compressedDataUrl = await compressImage(canvasDataUrl)
          const pairId = generatePairId()
          onAddDesktopImage(compressedDataUrl, filename, 'original', selectedLayers, pairId)
          showToast('✅ Wojak saved to desktop!', 'success', 3000)
        } catch (error) {
          console.error('Error compressing/saving to desktop:', error)
          // Still show success for download
          showToast('✅ Wojak downloaded!', 'success', 3000)
        }
      }
      
      setExportStatus('Downloaded!')
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error downloading')
      console.error('Download error:', error)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopy = async () => {
    if (!canvasRef.current) return

    setIsExporting(true)
    setExportStatus('Copying...')

    try {
      await copyCanvasToClipboard(canvasRef.current)
      setExportStatus('Copied to clipboard!')
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error copying')
      console.error('Copy error:', error)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }


  const handleSaveToPhotos = async () => {
    if (!canvasRef.current || !canDownload) return

    setIsExporting(true)
    setExportStatus('Preparing...')
    setShowFallbackHint(false)

    try {
      // Generate deterministic filename based on selected traits
      const filename = generateWojakFilename({ selectedLayers })
      
      // Convert canvas to blob
      const blob = await canvasToBlob(canvasRef.current)
      
      // Create File object for Web Share API
      const file = new File([blob], filename, { type: 'image/png' })

      // Try Web Share API
      if (navigator.share) {
        // Check if files can be shared (canShare may not exist in all browsers)
        const canShareFiles = navigator.canShare ? navigator.canShare({ files: [file] }) : true
        
        if (canShareFiles) {
          try {
            await navigator.share({
              files: [file],
              title: filename
            })
            setExportStatus('Shared!')
            setTimeout(() => setExportStatus(''), 2000)
          } catch (shareError) {
            // User cancelled or share failed - fall through to fallback
            if (shareError.name !== 'AbortError') {
              throw shareError
            }
            // AbortError means user cancelled - just return silently
            setExportStatus('')
            return
          }
        } else {
          // Files cannot be shared - use fallback
          throw new Error('Files cannot be shared')
        }
      } else {
        // Web Share API not available - use fallback
        throw new Error('Web Share API not available')
      }
    } catch (error) {
      // Fallback: open image in new tab
      try {
        const blob = await canvasToBlob(canvasRef.current)
        const url = URL.createObjectURL(blob)
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
        
        if (newWindow) {
          setShowFallbackHint(true)
          setExportStatus('Image opened - long-press to save')
          
          // Clean up URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(url)
          }, 10000)
          
          // Auto-hide hint after 5 seconds
          setTimeout(() => {
            setShowFallbackHint(false)
            setExportStatus('')
          }, 5000)
        } else {
          // Popup blocked
          setExportStatus('Please allow popups to save image')
          setTimeout(() => setExportStatus(''), 3000)
        }
      } catch (fallbackError) {
        setExportStatus('Error saving to Photos')
        console.error('Save to Photos error:', fallbackError)
        setTimeout(() => setExportStatus(''), 3000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <div className="export-controls-row" style={{
        display: 'flex',
        gap: '4px',
        width: '100%',
      }}>
        {onRandomize && (
          <Button 
            className="win98-tooltip"
            data-tooltip="Generate a random combination of traits"
            onClick={onRandomize}
            style={{ flex: 1 }}
          >
            Randomize
          </Button>
        )}
        <Button 
          className="win98-tooltip"
          data-tooltip="Copy your Wojak to clipboard — paste directly into memes!"
          onClick={handleCopy} 
          disabled={isExporting || !canvasRef.current}
          style={{ flex: 1 }}
        >
          Copy to Clipboard
        </Button>
        <Button 
          className={`win98-tooltip generator-download-btn ${!canDownload ? 'is-disabled' : ''}`}
          data-tooltip={
            !canDownload
              ? 'Select Base, Mouth (Base), and Clothing to download'
              : 'Download as PNG with transparent background. Saves to desktop (max 20). Oldest images move to Recycle Bin automatically.'
          }
          onClick={handleDownload} 
          disabled={isDownloadDisabled}
          style={{ flex: 1 }}
        >
          Download
        </Button>
        <Button 
          className="win98-tooltip"
          data-tooltip="Transform your Wojak with AI-powered cyberpunk effects. Both original and CyberTang versions save to desktop automatically."
          onClick={handleTangify}
          disabled={isTangifying || isExporting || !canvasRef.current}
          style={{ flex: 1 }}
        >
          {isTangifying ? 'Cyberfying...' : 'CyberTang'}
        </Button>
        {isIOS() && (
          <Button 
            className={`win98-tooltip generator-save-photos-btn ${!canDownload ? 'is-disabled' : ''}`}
            data-tooltip={
              !canDownload
                ? 'Select Base, Mouth (Base), and Clothing to save'
                : 'Save to Photos'
            }
            onClick={handleSaveToPhotos} 
            disabled={isDownloadDisabled}
            style={{ flex: 1 }}
          >
            Save to Photos
          </Button>
        )}
        <Button 
          className="win98-tooltip"
          data-tooltip="Coming soon! Mint your Wojak as an NFT on Chia. Brings value to Tang Gang and Wojak Farmers Plot holders."
          disabled={true}
          style={{ flex: 1 }}
        >
          Mint
        </Button>
      </div>
      
      {/* Windows 98 Progress Bar */}
      {isTangifying && (
        <div className="tangify-progress-container" style={{ marginTop: '8px', marginBottom: '4px' }}>
          <div className="tangify-progress-label">
            {tangifyLabel}
          </div>
          <div className="tangify-progress-bar">
            <div 
              className="tangify-progress-fill" 
              style={{ width: `${tangifyProgress}%` }}
            >
              {Array.from({ length: Math.floor(tangifyProgress / 4) }).map((_, i) => (
                <div key={i} className="tangify-progress-block" />
              ))}
            </div>
          </div>
          <div className="tangify-progress-percent">
            {Math.round(tangifyProgress)}%
          </div>
        </div>
      )}
      
      {/* Toggle switch for Original/CyberTang view - compact button group aligned with preview */}
      {tangifiedImage && !isTangifying && (
        <div style={{
          marginTop: '4px',
          padding: '2px 4px',
          background: 'var(--surface-1)',
          border: '1px solid',
          borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          justifyContent: 'flex-start',
          width: '100%',
        }}>
          <span className="helper-text" style={{
            fontFamily: 'MS Sans Serif, sans-serif',
            color: 'var(--text-1)',
            marginRight: '2px',
          }}>
            View:
          </span>
          <Button
            onClick={() => {
              if (setShowTangified) setShowTangified(false)
            }}
            style={{
              padding: '2px 6px',
              flex: '0 0 auto',
              background: showTangified ? 'var(--btn-face-pressed)' : 'var(--btn-face-hover)',
              border: showTangified ? '1px inset var(--border-dark)' : '1px outset var(--border-light)',
            }}
          >
            Original
          </Button>
          <Button
            onClick={() => {
              if (setShowTangified) setShowTangified(true)
            }}
            style={{
              padding: '2px 6px',
              flex: '0 0 auto',
              background: showTangified ? 'var(--btn-face-hover)' : 'var(--btn-face-pressed)',
              border: showTangified ? '1px outset var(--border-light)' : '1px inset var(--border-dark)',
            }}
          >
            CyberTang
          </Button>
        </div>
      )}
      
      {!canDownload && (
        <p className="helper-text" style={{ 
          margin: '4px 0 0 0', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          Select Base, Mouth (Base), and Clothing before downloading.
        </p>
      )}
      {exportStatus && (
        <p className="export-status" style={{ 
          margin: '4px 0 0 0', 
          color: exportStatus.includes('Error') ? '#c00' : '#008000' 
        }}>
          {exportStatus}
        </p>
      )}
      {/* Fallback hint - reserve space to prevent layout shift */}
      <div className="helper-text" style={{ 
        height: showFallbackHint ? 'auto' : '14px', // Reserve space (approx line height)
        margin: '4px 0 0 0',
        color: '#666',
        fontStyle: 'italic',
        visibility: showFallbackHint ? 'visible' : 'hidden',
        lineHeight: '14px'
      }}>
        {showFallbackHint ? 'Long-press image → Save to Photos' : '\u00A0'} {/* Non-breaking space when hidden */}
      </div>

      {/* Duplicate CyberTang Confirmation Dialog */}
      {showDuplicateConfirm && (
        <Window
          id="duplicate-cybertang-confirm"
          title="Confirm CyberTang"
          onClose={() => setShowDuplicateConfirm(false)}
          style={{
            width: '400px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            position: 'fixed',
            zIndex: 10001
          }}
        >
          <div className="window-body" style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <p className="error-message-text" style={{
              fontFamily: 'MS Sans Serif, sans-serif',
              color: '#000',
              margin: 0
            }}>
              Do you really want to recreate a CyberTang version of the same Wojak?
            </p>
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              marginTop: '8px'
            }}>
              <Button
                onClick={() => {
                  setShowDuplicateConfirm(false)
                  performTangify()
                }}
                style={{
                  minWidth: '75px'
                }}
              >
                Yes
              </Button>
              <Button
                onClick={() => setShowDuplicateConfirm(false)}
                style={{
                  minWidth: '75px'
                }}
              >
                No
              </Button>
            </div>
          </div>
        </Window>
      )}
    </div>
  )
}


