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
    const blob = await canvasToBlob(canvas)
    
    if (navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ 'image/png': blob })
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

// Image cache to prevent reloading the same images
const imageCache = new Map()

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
      imageCache.set(url, img)
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
