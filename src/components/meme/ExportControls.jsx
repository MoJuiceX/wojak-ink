import { useState } from 'react'
import { Button } from '../ui'
import { downloadCanvasAsPNG, copyCanvasToClipboard, canvasToBlob } from '../../utils/imageUtils'
import { generateWojakFilename } from '../../utils/filenameUtils'

// iOS detection helper
const isIOS = () => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function ExportControls({ canvasRef, selectedLayers = {}, onRandomize }) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const [showFallbackHint, setShowFallbackHint] = useState(false)

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

  const handleDownload = async () => {
    if (!canvasRef.current || !canDownload) return

    setIsExporting(true)
    setExportStatus('Downloading...')

    try {
      // Generate deterministic filename based on selected traits
      const filename = generateWojakFilename({ selectedLayers })
      await downloadCanvasAsPNG(canvasRef.current, filename)
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
        const newWindow = window.open(url, '_blank')
        
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
      <div className="export-controls-row">
        {onRandomize && (
          <Button onClick={onRandomize}>
            Randomize
          </Button>
        )}
        <Button 
          onClick={handleCopy} 
          disabled={isExporting || !canvasRef.current}
        >
          Copy to Clipboard
        </Button>
        <Button 
          onClick={handleDownload} 
          disabled={isDownloadDisabled}
          className={`generator-download-btn ${!canDownload ? 'is-disabled' : ''}`}
          title={
            !canDownload
              ? 'Select Base, Mouth (Base), and Clothing to download'
              : 'Download'
          }
        >
          Download
        </Button>
        {isIOS() && (
          <Button 
            onClick={handleSaveToPhotos} 
            disabled={isDownloadDisabled}
            className={`generator-save-photos-btn ${!canDownload ? 'is-disabled' : ''}`}
            title={
              !canDownload
                ? 'Select Base, Mouth (Base), and Clothing to save'
                : 'Save to Photos'
            }
          >
            Save to Photos
          </Button>
        )}
        <Button 
          disabled={true}
        >
          Mint
        </Button>
      </div>
      {!canDownload && (
        <p style={{ 
          margin: '4px 0 0 0', 
          fontSize: '9px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          Select Base, Mouth (Base), and Clothing before downloading.
        </p>
      )}
      {exportStatus && (
        <p style={{ 
          margin: '4px 0 0 0', 
          fontSize: '10px', 
          color: exportStatus.includes('Error') ? '#c00' : '#008000' 
        }}>
          {exportStatus}
        </p>
      )}
      {/* Fallback hint - reserve space to prevent layout shift */}
      <div style={{ 
        height: showFallbackHint ? 'auto' : '14px', // Reserve space (approx line height)
        margin: '4px 0 0 0',
        fontSize: '9px',
        color: '#666',
        fontStyle: 'italic',
        visibility: showFallbackHint ? 'visible' : 'hidden',
        lineHeight: '14px'
      }}>
        {showFallbackHint ? 'Long-press image → Save to Photos' : '\u00A0'} {/* Non-breaking space when hidden */}
      </div>
    </div>
  )
}

