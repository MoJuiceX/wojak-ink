/**
 * Converts canvas to blob
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} type - MIME type (default: 'image/png')
 * @param {number} quality - Quality for JPEG (0-1)
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, type = 'image/png', quality = 1) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      type,
      quality
    )
  })
}

/**
 * Downloads canvas as PNG image
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} filename - Filename (default: 'wojak-meme-{timestamp}.png')
 */
export async function downloadCanvasAsPNG(canvas, filename = null) {
  try {
    const blob = await canvasToBlob(canvas)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `wojak-meme-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading canvas:', error)
    throw error
  }
}

/**
 * Copies canvas image to clipboard
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Promise<void>}
 */
export async function copyCanvasToClipboard(canvas) {
  try {
    const blob = await canvasToBlob(canvas, 'image/png')
    
    // Ensure blob has correct MIME type
    const imageBlob = blob.type === 'image/png' 
      ? blob 
      : new Blob([blob], { type: 'image/png' })
    
    if (navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ 'image/png': imageBlob })
      await navigator.clipboard.write([item])
    } else {
      // Fallback for older browsers
      throw new Error('Clipboard API not supported')
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    throw error
  }
}

/**
 * Copies an image from a blob URL to clipboard
 * @param {string} blobUrl - Blob URL of the image to copy
 * @returns {Promise<void>}
 */
export async function copyBlobUrlToClipboard(blobUrl) {
  try {
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch image')
    }
    const blob = await response.blob()
    
    // Ensure blob has correct MIME type
    const imageBlob = blob.type.startsWith('image/') 
      ? blob 
      : new Blob([blob], { type: 'image/png' })
    
    if (navigator.clipboard && navigator.clipboard.write) {
      // Create ClipboardItem with explicit PNG type
      const item = new ClipboardItem({ 'image/png': imageBlob })
      await navigator.clipboard.write([item])
    } else {
      throw new Error('Clipboard API not supported')
    }
  } catch (error) {
    console.error('Error copying blob URL to clipboard:', error)
    throw error
  }
}

// Image cache to prevent reloading the same images
// LRU cache with size limit to prevent memory issues
const imageCache = new Map()
const MAX_CACHE_SIZE = 100 // Maximum number of images to cache
const accessOrder = new Map() // Track access order for LRU eviction
let accessCounter = 0

// Evict least recently used images when cache exceeds limit
function evictLRU() {
  if (imageCache.size <= MAX_CACHE_SIZE) return
  
  // Sort by access order (oldest first)
  const entries = Array.from(accessOrder.entries())
    .sort((a, b) => a[1] - b[1])
  
  // Remove oldest 10% of entries
  const toRemove = Math.ceil(imageCache.size * 0.1)
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    const [url] = entries[i]
    imageCache.delete(url)
    accessOrder.delete(url)
  }
}

/**
 * Loads an image from a URL with caching
 * @param {string} url - Image URL
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(url) {
  if (!url) {
    return Promise.reject(new Error('Image URL is required'))
  }

  // Return cached image if available and loaded
  if (imageCache.has(url)) {
    const cached = imageCache.get(url)
    // Update access order for LRU
    accessCounter++
    accessOrder.set(url, accessCounter)
    // If cached image is already loaded, clone it for reuse
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached)
    }
    // If still loading, wait for it
    return new Promise((resolve, reject) => {
      cached.onload = () => resolve(cached)
      cached.onerror = reject
    })
  }

  // Load new image
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    const cleanup = () => {
      img.onload = null
      img.onerror = null
    }
    
    img.onload = () => {
      cleanup()
      // Cache the image
      accessCounter++
      imageCache.set(url, img)
      accessOrder.set(url, accessCounter)
      // Evict LRU if cache is too large
      evictLRU()
      resolve(img)
    }
    
    img.onerror = (error) => {
      cleanup()
      // Don't cache failed images
      reject(error)
    }
    
    img.src = url
  })
}

/**
 * Preload images for faster rendering
 * @param {string[]} urls - Array of image URLs to preload
 * @returns {Promise<void>}
 */
export async function preloadImages(urls) {
  const promises = urls.map(url => {
    if (!imageCache.has(url)) {
      return loadImage(url).catch(() => {
        // Silently fail for preload - individual loads will handle errors
      })
    }
    return Promise.resolve()
  })
  await Promise.all(promises)
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearImageCache() {
  imageCache.clear()
}

/**
 * Downloads an image from a data URL
 * @param {string} dataUrl - Data URL of the image
 * @param {string} filename - Filename for download
 */
export function downloadImageFromDataUrl(dataUrl, filename = 'image.png') {
  try {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error downloading image:', error)
    throw error
  }
}

/**
 * Downloads an image from a blob URL
 * @param {string} blobUrl - Blob URL of the image
 * @param {string} filename - Filename for download
 * @returns {Promise<void>}
 */
export async function downloadBlobUrlAsPNG(blobUrl, filename = 'image.png') {
  try {
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch blob')
    }
    const blob = await response.blob()
    
    // Ensure blob has correct MIME type
    const imageBlob = blob.type.startsWith('image/') 
      ? blob 
      : new Blob([blob], { type: 'image/png' })
    
    const url = URL.createObjectURL(imageBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up object URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)
  } catch (error) {
    console.error('Error downloading blob URL:', error)
    throw error
  }
}

/**
 * Opens an image in a new window
 * @param {string} dataUrl - Data URL of the image
 */
export function viewImage(dataUrl) {
  try {
    // Validate dataUrl is actually a data URL
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid image data')
    }
    
    // Ensure it's a data URL (starts with data:image/)
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image format - must be a data URL')
    }
    
    // Additional validation: ensure it's a valid base64 data URL format
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/
    if (!dataUrlPattern.test(dataUrl)) {
      throw new Error('Invalid data URL format')
    }
    
    const newWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (newWindow) {
      // Use safer DOM manipulation instead of document.write
      const doc = newWindow.document
      doc.open()
      
      // Create elements safely
      const html = doc.createElement('html')
      const head = doc.createElement('head')
      const title = doc.createElement('title')
      title.textContent = 'Image Viewer'
      head.appendChild(title)
      
      const body = doc.createElement('body')
      body.style.margin = '0'
      body.style.padding = '0'
      body.style.background = '#000'
      body.style.display = 'flex'
      body.style.alignItems = 'center'
      body.style.justifyContent = 'center'
      body.style.height = '100vh'
      
      const img = doc.createElement('img')
      img.src = dataUrl // Safe - already validated as data URL
      img.style.maxWidth = '100%'
      img.style.maxHeight = '100%'
      img.style.objectFit = 'contain'
      img.alt = 'Image viewer'
      
      body.appendChild(img)
      html.appendChild(head)
      html.appendChild(body)
      doc.appendChild(html)
      doc.close()
    }
  } catch (error) {
    console.error('Error viewing image:', error)
    throw error
  }
}

/**
 * Formats a timestamp to relative time string
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Relative time string (e.g., "2 min ago", "1 hour ago")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown'
  
  const now = new Date()
  const then = new Date(timestamp)
  
  // Handle invalid dates
  if (isNaN(then.getTime())) return 'Unknown'
  
  const diffMs = now - then
  
  // Handle future dates (shouldn't happen, but safety check)
  if (diffMs < 0) return 'just now'
  
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSecs < 10) {
    return 'just now'
  } else if (diffSecs < 60) {
    return `${diffSecs} sec${diffSecs !== 1 ? 's' : ''} ago`
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }
}

/**
 * Converts a blob URL to a data URL
 * @param {string} blobUrl - Blob URL to convert
 * @returns {Promise<string>} Promise that resolves to data URL string
 */
export async function blobUrlToDataUrl(blobUrl) {
  try {
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch blob')
    }
    const blob = await response.blob()
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting blob URL to data URL:', error)
    throw error
  }
}

/**
 * Formats traits object for display in tooltip
 * @param {Object} traits - Object with layer names as keys and image paths as values
 * @returns {string} Formatted string (e.g., "Base: Wojak, Eyes: Happy, Clothes: T-Shirt")
 */
export function formatTraitsForDisplay(traits) {
  if (!traits || typeof traits !== 'object') return 'No traits'
  
  const formatted = []
  const layerOrder = ['Background', 'Base', 'Head', 'Eyes', 'MouthBase', 'MouthItem', 'FacialHair', 'Mask', 'Clothes']
  
  for (const layerName of layerOrder) {
    const traitValue = traits[layerName]
    // Exclude None, empty strings, null, undefined
    if (traitValue && traitValue !== 'None' && traitValue !== 'none' && traitValue.trim() !== '') {
      // Extract display name from path
      const path = String(traitValue)
      let displayName = layerName
      
      // Try to extract a meaningful name from the path
      const pathParts = path.split('/')
      const fileName = pathParts[pathParts.length - 1] || ''
      const nameWithoutExt = fileName.replace(/\.(png|jpg|jpeg)$/i, '')
      
      // Try to clean up the name
      if (nameWithoutExt) {
        // Remove common prefixes and clean up
        displayName = nameWithoutExt
          .replace(/^[A-Z_]+_/, '') // Remove prefixes like "BASE_", "HEAD_"
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize words
          .trim()
      }
      
      // Truncate long names to prevent tooltip overflow
      if (displayName.length > 20) {
        displayName = displayName.substring(0, 17) + '...'
      }
      
      formatted.push(`${layerName}: ${displayName}`)
    }
  }
  
  return formatted.length > 0 ? formatted.join(', ') : 'No traits selected'
}

/**
 * Compress an image for storage
 * @param {string} dataUrl - Source image data URL
 * @param {number} quality - JPEG quality (0-1, default: 0.7)
 * @param {number} maxWidth - Maximum width/height in pixels (default: 512)
 * @returns {Promise<string>} Compressed image data URL
 */
export async function compressImage(dataUrl, quality = 0.7, maxWidth = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Use JPEG for smaller size (except if transparency needed)
        // For thumbnails, JPEG is fine and much smaller
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'))
    }
    
    img.src = dataUrl
  })
}
