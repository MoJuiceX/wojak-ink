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

/**
 * Loads an image from a URL
 * @param {string} url - Image URL
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (error) => reject(error)
    img.src = url
  })
}

