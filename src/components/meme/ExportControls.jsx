import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '../ui'
import Window from '../windows/Window'
import { downloadCanvasAsPNG, copyCanvasToClipboard, canvasToBlob, blobUrlToDataUrl, compressImage, copyBlobUrlToClipboard, downloadBlobUrlAsPNG } from '../../utils/imageUtils'
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

// Mobile detection helper (for hiding duplicate Save to Photos button)
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 640
}

export default function ExportControls({ 
  canvasRef, 
  selectedLayers = {}, 
  onRandomize,
  onUndo,
  tangifiedImage,
  setTangifiedImage,
  showTangified,
  setShowTangified,
  onAddToGallery,
  onUpdateGalleryEntry,
  onRemoveGalleryEntry,
  onAddDesktopImage,
  desktopImages = [], // Array of current desktop images for duplicate/existing checks
  onSaveToPhotosReady, // Callback to expose handleSaveToPhotos function
  onDownloadReady, // Callback to expose handleDownload function
  onSaveToFavorites // Callback to save wojak to favorites
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
  const saveButtonClickedRef = useRef(false) // Track if Save button was explicitly clicked
  const downloadButtonClickedRef = useRef(false) // Track if Download button was explicitly clicked

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
    // Check prerequisites and provide feedback
    if (!canvasRef.current) {
      showToast('⚠️ Canvas not ready. Please wait a moment and try again.', 'warning', 3000)
      return
    }
    
    if (isTangifying) {
      showToast('⏳ CyberTang generation already in progress...', 'info', 2000)
      return
    }
    
    // Check if required layers are selected
    if (!canDownload) {
      showToast('⚠️ Please select Base, Mouth (Base), and Clothing before creating CyberTang.', 'warning', 4000)
      return
    }
    
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
      
      // Validate canvas before converting
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas is invalid or empty. Please ensure a Wojak is displayed.')
      }
      
      console.log('[CyberTang] Canvas dimensions:', {
        width: canvas.width,
        height: canvas.height
      })
      
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            // Validate blob has reasonable size (not a tiny black image)
            // A valid Wojak PNG should be at least a few KB
            const minBlobSize = 5000 // 5KB minimum for a valid image
            if (blob.size < minBlobSize) {
              console.warn('[CyberTang] Canvas blob is suspiciously small - may be black/invalid', blob.size, 'bytes')
            }
            console.log('[CyberTang] Canvas converted to blob:', {
              size: blob.size,
              type: blob.type
            })
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
      
      // Log request details for debugging
      console.log('[CyberTang] Sending request to /api/tangify', {
        imageSize: blob.size,
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...'
      })
      
      // Call API with better error handling
      let response
      try {
        response = await fetch('/api/tangify', {
          method: 'POST',
          body: formData, // No Content-Type header - browser sets it with boundary
        })
      } catch (fetchError) {
        // Network error - API endpoint not reachable
        console.error('[CyberTang] Network error:', fetchError)
        const isNetworkError = fetchError.name === 'TypeError' || 
                              fetchError.message?.includes('Failed to fetch') ||
                              fetchError.message?.includes('NetworkError')
        
        if (isNetworkError) {
          throw new Error(
            'CyberTang API not available. ' +
            'Make sure you\'re running with Wrangler: ' +
            'npx wrangler pages dev dist --compatibility-date=2024-01-01 ' +
            'and that OPENAI_API_KEY is set in .env file.'
          )
        }
        throw fetchError
      }
      
      if (!response.ok) {
        let errorMessage = 'CyberTang failed'
        
        // Clone response before reading to avoid "body stream already read" error
        const responseClone = response.clone()
        
        try {
          const errorJson = await response.json()
          errorMessage = errorJson.error || errorMessage
          console.error('[CyberTang] API error response:', errorJson)
        } catch (e) {
          // If JSON parsing fails, try text
          try {
            const errorText = await responseClone.text()
            errorMessage = errorText || errorMessage
            console.error('[CyberTang] API error text:', errorText)
          } catch (e2) {
            // If both fail, use status-based error message
            console.error('[CyberTang] Failed to parse error response:', e2)
            // Don't set errorMessage here - let status-based handling below set it
          }
        }
        
        // Provide helpful error messages for common issues
        if (response.status === 503) {
          errorMessage = 'CyberTang API is unavailable. Make sure Wrangler is running: npx wrangler pages dev dist --compatibility-date=2024-01-01\n\nIf using production, check Cloudflare Pages deployment status.'
        } else if (response.status === 500 && errorMessage.includes('API key')) {
          errorMessage = 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file or Cloudflare Pages environment variables.'
        } else if (response.status === 500) {
          errorMessage = `Server error: ${errorMessage || 'Internal server error. Check that OPENAI_API_KEY is set correctly.'}`
        } else if (response.status === 400) {
          errorMessage = `Invalid request: ${errorMessage}`
        } else if (response.status === 0 || response.status === 404) {
          errorMessage = 'CyberTang API endpoint not found. Make sure Wrangler is running: npx wrangler pages dev dist'
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'OpenAI API authentication failed. Check your OPENAI_API_KEY is valid and has proper permissions.'
        } else {
          errorMessage = `CyberTang failed (${response.status}): ${errorMessage}`
        }
        
        throw new Error(errorMessage)
      }
      
      // Get PNG blob from response
      console.log('[CyberTang] Response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        model: response.headers.get('X-Tangify-Model')
      })
      
      const outBlob = await response.blob()
      
      // Validate response blob
      if (!outBlob || outBlob.size === 0) {
        throw new Error('Received empty image from API')
      }
      
      console.log('[CyberTang] Response blob received:', {
        size: outBlob.size,
        type: outBlob.type
      })
      
      // Clean up old blob URL if it exists
      if (tangifiedImageUrlRef.current) {
        URL.revokeObjectURL(tangifiedImageUrlRef.current)
        tangifiedImageUrlRef.current = null
      }
      
      // Create new blob URL
      const url = URL.createObjectURL(outBlob)
      tangifiedImageUrlRef.current = url
      console.log('[CyberTang] Created blob URL:', url.substring(0, 50) + '...')
      
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
      console.error('[CyberTang] Error details:', {
        error: error,
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      playSound('error')
      
      // Remove placeholder entry on error
      if (onRemoveGalleryEntry && placeholderId) {
        onRemoveGalleryEntry(placeholderId)
      }
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Unknown error occurred'
      showToast(`❌ ${errorMessage}`, 'error', 6000)
      
      // Also show alert for critical errors (user might miss toast)
      alert(`CyberTang failed: ${errorMessage}\n\nCheck browser console for details.`)
      setIsTangifying(false)
    }
  }
  
  const handleDownload = useCallback(async () => {
    // Guard: Only proceed if Download button was explicitly clicked
    // This prevents accidental calls from initialization or other triggers
    if (!downloadButtonClickedRef.current) {
      // Silently return - don't log or show any messages
      return
    }
    
    // Reset the flag immediately to prevent accidental re-triggers
    downloadButtonClickedRef.current = false
    
    // Guard: canDownload must be explicitly true (not undefined)
    if (!canvasRef.current || canDownload !== true) {
      showToast('⚠️ Please select Base, Mouth (Base), and Clothing before downloading.', 'warning', 4000)
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
  }, [canDownload, canvasRef, selectedLayers, desktopImages, onAddDesktopImage, showToast])

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

  const handlePaste = async () => {
    setIsExporting(true)
    setExportStatus('Reading clipboard...')

    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        throw new Error('Clipboard API not supported')
      }

      const clipboardItems = await navigator.clipboard.read()
      
      // Find image item in clipboard
      let imageBlob = null
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            imageBlob = await item.getType(type)
            break
          }
        }
        if (imageBlob) break
      }

      if (!imageBlob) {
        throw new Error('No image found in clipboard')
      }

      // Create image from blob
      const imageUrl = URL.createObjectURL(imageBlob)
      const img = new Image()
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Show success message
      setExportStatus('Image found in clipboard!')
      showToast('✅ Image found in clipboard! You can paste it into other apps.', 'success', 3000)
      setTimeout(() => setExportStatus(''), 2000)
      
      // Cleanup
      URL.revokeObjectURL(imageUrl)
    } catch (error) {
      setExportStatus('No image in clipboard')
      console.error('Paste error:', error)
      showToast('No image found in clipboard. Copy an image first!', 'info', 3000)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveToPhotos = useCallback(async () => {
    // Guard: Only proceed if Save button was explicitly clicked
    // This prevents accidental calls from other buttons or initialization
    if (!saveButtonClickedRef.current) {
      // Silently return - don't log or show any messages
      return
    }
    
    // Reset the flag immediately to prevent accidental re-triggers
    saveButtonClickedRef.current = false
    
    // Guard: canDownload must be explicitly true (not undefined)
    if (!canvasRef.current || canDownload !== true) {
      console.warn('handleSaveToPhotos called but conditions not met:', {
        hasCanvas: !!canvasRef.current,
        canDownload
      })
      return
    }

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

      // Try Web Share API (works on all mobile devices, not just iOS)
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
            return // Success - exit early
          } catch (shareError) {
            // User cancelled - just return silently, no download
            if (shareError.name === 'AbortError') {
              setExportStatus('')
              return
            }
            // Share failed after being attempted - offer download as fallback
            setExportStatus('Share failed, downloading instead...')
            const downloadFilename = generateWojakFilename({ selectedLayers })
            await downloadCanvasAsPNG(canvasRef.current, downloadFilename)
            setExportStatus('Downloaded!')
            showToast('✅ Image downloaded! You can save it to your photos from your downloads.', 'success', 3000)
            setTimeout(() => setExportStatus(''), 2000)
            return
          }
        } else {
          // Files cannot be shared - API exists but can't share files
          setExportStatus('Files cannot be shared, downloading instead...')
          const downloadFilename = generateWojakFilename({ selectedLayers })
          await downloadCanvasAsPNG(canvasRef.current, downloadFilename)
          setExportStatus('Downloaded!')
          showToast('✅ Image downloaded! You can save it to your photos from your downloads.', 'success', 3000)
          setTimeout(() => setExportStatus(''), 2000)
          return
        }
      } else {
        // Web Share API not available - return silently
        // User will use Download button instead, no need to inform them
        setExportStatus('')
        return
      }
    } catch (error) {
      // Unexpected error - don't auto-download, just show error
      setExportStatus('Error saving to Photos')
      console.error('Save to Photos error:', error)
      showToast('Failed to save image. Please try the Download button instead.', 'error', 3000)
      setTimeout(() => setExportStatus(''), 3000)
    } finally {
      setIsExporting(false)
    }
  }, [canDownload, canvasRef, selectedLayers, showToast])

  // Wrapper function that sets the flag and calls handleSaveToPhotos
  const handleSaveToPhotosWithFlag = useCallback(() => {
    saveButtonClickedRef.current = true
    handleSaveToPhotos()
  }, [handleSaveToPhotos])

  // Expose handleSaveToPhotos wrapper to parent component
  useEffect(() => {
    if (onSaveToPhotosReady) {
      onSaveToPhotosReady(handleSaveToPhotosWithFlag)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSaveToPhotosReady]) // Remove handleSaveToPhotosWithFlag from deps

  // Wrapper function that sets the flag and calls handleDownload
  const handleDownloadWithFlag = useCallback(() => {
    downloadButtonClickedRef.current = true
    handleDownload()
  }, [handleDownload])

  // Expose handleDownload wrapper to parent component
  useEffect(() => {
    if (onDownloadReady) {
      onDownloadReady(handleDownloadWithFlag)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDownloadReady]) // Remove handleDownloadWithFlag from deps

  const handleShareOnX = async () => {
    if (!canvasRef.current) return

    setIsExporting(true)
    setExportStatus('Copying to clipboard...')

    // Build X URL (needed for both success and fallback)
    const tweetText = "Check out my CyberTang Wojak created with the Wojak Generator @ Wojak.ink 🍊"
    const params = new URLSearchParams({
      text: tweetText
    })
    const twitterUrl = `https://twitter.com/intent/tweet?${params.toString()}`

    try {
      // Copy image to clipboard automatically
      await copyCanvasToClipboard(canvasRef.current)
      setExportStatus('Copied to clipboard!')
      showToast('✅ Image copied to clipboard! Paste it into your X post 🍊', 'success', 4000)
      
      // Open X in new tab (image is already in clipboard)
      window.open(twitterUrl, '_blank', 'noopener,noreferrer')
      
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error copying')
      console.error('Copy to clipboard error:', error)
      
      // On mobile, clipboard often fails - fallback to download
      if (isMobile()) {
        try {
          setExportStatus('Downloading instead...')
          const filename = generateWojakFilename({ selectedLayers })
          await downloadCanvasAsPNG(canvasRef.current, filename)
          setExportStatus('Downloaded!')
          showToast('✅ Image downloaded! You can paste it into your X post 🍊', 'success', 4000)
          // Still open X
          window.open(twitterUrl, '_blank', 'noopener,noreferrer')
          setTimeout(() => setExportStatus(''), 2000)
        } catch (downloadError) {
          setExportStatus('Error')
          console.error('Download error:', downloadError)
          showToast('Failed to copy or download. Please try the Download button.', 'error', 3000)
          setTimeout(() => setExportStatus(''), 2000)
        }
      } else {
        // Desktop: show original error
        showToast('Failed to copy image. Please try the Copy/Paste button first.', 'error', 3000)
        setTimeout(() => setExportStatus(''), 2000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyCyberTang = async () => {
    if (!tangifiedImage) return

    setIsExporting(true)
    setExportStatus('Copying CyberTang...')

    try {
      await copyBlobUrlToClipboard(tangifiedImage)
      setExportStatus('CyberTang copied to clipboard!')
      showToast('✅ CyberTang copied to clipboard!', 'success', 2000)
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error copying CyberTang')
      console.error('Copy CyberTang error:', error)
      showToast('Failed to copy CyberTang to clipboard', 'error', 3000)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadCyberTang = async () => {
    if (!tangifiedImage) return

    setIsExporting(true)
    setExportStatus('Downloading CyberTang...')

    try {
      // Generate filename using buildImageName for consistency with desktop storage
      const filename = buildImageName(selectedLayers, 'cybertang')
      await downloadBlobUrlAsPNG(tangifiedImage, filename)
      setExportStatus('CyberTang downloaded!')
      showToast('✅ CyberTang downloaded!', 'success', 2000)
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error downloading CyberTang')
      console.error('Download CyberTang error:', error)
      showToast('Failed to download CyberTang', 'error', 3000)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveToFavorites = useCallback(async () => {
    if (!canvasRef.current || !canDownload) {
      showToast('⚠️ Please select Base, Mouth (Base), and Clothing before saving to favorites.', 'warning', 4000)
      return
    }

    if (!onSaveToFavorites) {
      showToast('⚠️ Save to favorites is not available', 'error', 3000)
      return
    }

    setIsExporting(true)
    setExportStatus('Saving to favorites...')

    try {
      const canvas = canvasRef.current
      const dataUrl = canvas.toDataURL('image/png')
      const filename = buildImageName(selectedLayers, 'original')
      
      const wojak = {
        id: `wojak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: filename,
        dataUrl: dataUrl,
        selectedLayers: { ...selectedLayers },
        type: 'original',
        savedAt: new Date().toISOString()
      }

      await onSaveToFavorites(wojak)
      setExportStatus('Saved to favorites!')
      showToast('✅ Wojak saved to My Favorite Wojaks!', 'success', 3000)
      setTimeout(() => setExportStatus(''), 2000)
    } catch (error) {
      setExportStatus('Error saving to favorites')
      console.error('Save to favorites error:', error)
      showToast('Failed to save to favorites', 'error', 3000)
      setTimeout(() => setExportStatus(''), 2000)
    } finally {
      setIsExporting(false)
    }
  }, [canvasRef, canDownload, selectedLayers, onSaveToFavorites, showToast])

  return (
    <div>
      <div className="export-controls-row" style={{
        display: 'flex',
        gap: '4px',
        width: '100%',
      }}>
        {/* Row 1: Main Actions */}
        {onRandomize && (
          <Button 
            type="button"
            className="win98-tooltip"
            data-tooltip="Generate a random combination of traits"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRandomize()
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img 
              src="/assets/images/randomemoji.png" 
              alt="Randomize" 
              style={{ 
                width: '18px', 
                height: '18px', 
                objectFit: 'contain',
                imageRendering: 'auto'
              }} 
            />
          </Button>
        )}
        {onUndo && (
          <Button 
            type="button"
            className="win98-tooltip"
            data-tooltip="Revert to previous configuration"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onUndo()
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ⬅️
          </Button>
        )}
        <Button 
          type="button"
          className="win98-tooltip"
          data-tooltip="Copy to clipboard"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleCopy()
          }} 
          disabled={isExporting || !canvasRef.current}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          📎
        </Button>
        {/* Hide Download button on mobile - it's in the first row of MobileTraitBottomSheet */}
        {!isMobile() && (
          <Button 
            type="button"
            className={`win98-tooltip generator-download-btn ${!canDownload ? 'is-disabled' : ''}`}
            data-tooltip={
              !canDownload
                ? 'Select Base, Mouth, and Clothing to download'
                : 'Download as PNG.'
            }
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Mark that Download button was explicitly clicked
              downloadButtonClickedRef.current = true
              handleDownload()
            }} 
            disabled={isDownloadDisabled}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img 
              src="/assets/images/downloadicon.png" 
              alt="Download" 
              style={{ 
                width: '18px', 
                height: '18px', 
                objectFit: 'contain',
                imageRendering: 'auto'
              }} 
            />
          </Button>
        )}
        <Button 
          type="button"
          className="win98-tooltip"
          data-tooltip="Transform your Wojak to a cyberpunk. Both versions save to desktop automatically."
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleTangify()
          }}
          disabled={!canDownload || isTangifying || !canvasRef.current}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          👽
        </Button>
        
        {/* Row 2: Sharing & Other */}
        <Button 
          type="button"
          className="win98-tooltip"
          data-tooltip="Auto-copied to clipboard. Click X Share and paste into your post."
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleShareOnX()
          }}
          disabled={!canvasRef.current || isExporting || isTangifying}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          𝕏
        </Button>
        {/* Only show Save to Photos button on desktop iOS - mobile has its own Save button */}
        {isIOS() && !isMobile() && (
          <Button 
            type="button"
            className={`win98-tooltip generator-save-photos-btn ${!canDownload ? 'is-disabled' : ''}`}
            data-tooltip={
              !canDownload
                ? 'Select Base, Mouth (Base), and Clothing to save'
                : 'Save to Photos'
            }
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Mark that Save button was explicitly clicked
              saveButtonClickedRef.current = true
              handleSaveToPhotos()
            }} 
            disabled={isDownloadDisabled}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Save to Photos
          </Button>
        )}
        {/* Save to My Favorite Wojaks */}
        <Button 
          type="button"
          className="win98-tooltip"
          data-tooltip={
            !canDownload
              ? 'Select Base, Mouth, and Clothing to save to favorites'
              : 'Save to My Favorite Wojaks'
          }
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleSaveToFavorites()
          }}
          disabled={isDownloadDisabled || isExporting || !onSaveToFavorites}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ⭐️
        </Button>
        {/* Mint button - shown on both desktop and mobile */}
        <Button 
          className="win98-tooltip"
          data-tooltip="Soon"
          disabled={true}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          🌱
        </Button>
      </div>
      
      {/* Windows 98 Progress Bar */}
      {isTangifying && (
        <div className="tangify-progress-container" style={{ marginTop: '8px', marginBottom: '4px' }}>
          <div className="tangify-progress-header">
            <div className="tangify-progress-label">
              {tangifyLabel}
            </div>
            <div className="tangify-progress-percent">
              {Math.round(tangifyProgress)}%
            </div>
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


