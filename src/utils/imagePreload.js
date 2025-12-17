/**
 * Image preloading utilities for critical assets
 */

const preloadedImages = new Set()

/**
 * Preload a single image
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>} Promise that resolves with the loaded image
 */
export function preloadImage(src) {
  if (preloadedImages.has(src)) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      preloadedImages.add(src)
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  })
}

/**
 * Preload multiple images
 * @param {string[]} sources - Array of image source URLs
 * @returns {Promise<HTMLImageElement[]>} Promise that resolves when all images are loaded
 */
export function preloadImages(sources) {
  return Promise.all(sources.map(src => preloadImage(src).catch(err => {
    console.warn(`Failed to preload image: ${src}`, err)
    return null
  })))
}

/**
 * Preload critical fonts
 */
export function preloadFonts() {
  if (typeof document === 'undefined') return

  const fontFiles = [
    '/fonts/converted/ms_sans_serif.woff2',
    '/fonts/converted/ms_sans_serif.woff',
    '/fonts/converted/ms_sans_serif_bold.woff2',
    '/fonts/converted/ms_sans_serif_bold.woff',
  ]

  fontFiles.forEach(font => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = font.endsWith('.woff2') ? 'font/woff2' : 'font/woff'
    link.crossOrigin = 'anonymous'
    link.href = font
    document.head.appendChild(link)
  })
}

/**
 * Preload critical images for the app
 * Called on app initialization
 */
export function preloadCriticalAssets() {
  // Preload fonts
  preloadFonts()

  // Preload critical UI images
  const criticalImages = [
    '/icon/minimize.svg',
    '/icon/maximize.svg',
    '/icon/restore.svg',
    '/icon/close.svg',
  ]

  preloadImages(criticalImages).catch(err => {
    console.warn('Failed to preload some critical images:', err)
  })
}


