import { useEffect, useRef } from 'react'

/**
 * Preloads images and optionally decodes them
 * @param {string[]} imagePaths - Array of image paths to preload
 * @returns {boolean} Whether all images are loaded
 */
export function usePreloadImages(imagePaths) {
  const loadedRef = useRef(false)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current || loadedRef.current) return
    if (!imagePaths || imagePaths.length === 0) return

    loadingRef.current = true

    const preloadImages = async () => {
      const loadPromises = imagePaths.map(path => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = async () => {
            // Decode image if supported (for better rendering performance)
            if (img.decode) {
              try {
                await img.decode()
              } catch (e) {
                // Decode failed, but image is still loaded
                console.warn(`[usePreloadImages] Failed to decode ${path}:`, e)
              }
            }
            resolve(img)
          }
          img.onerror = reject
          img.src = path
        })
      })

      try {
        await Promise.all(loadPromises)
        loadedRef.current = true
        console.log('[usePreloadImages] All images preloaded:', imagePaths)
      } catch (error) {
        console.warn('[usePreloadImages] Some images failed to preload:', error)
        // Still mark as loaded to allow transitions (graceful degradation)
        loadedRef.current = true
      } finally {
        loadingRef.current = false
      }
    }

    preloadImages()
  }, [imagePaths])

  return loadedRef.current
}


