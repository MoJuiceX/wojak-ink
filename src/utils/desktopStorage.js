/**
 * localStorage utilities for desktop images and recycle bin
 * Handles storage, loading, error handling, and export/import functionality
 */

const DESKTOP_IMAGES_KEY = 'wojak_desktop_images'
const RECYCLE_BIN_KEY = 'wojak_recycle_bin'

/**
 * Check if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
export function isLocalStorageAvailable() {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Load desktop images from localStorage
 * @returns {Array} Array of desktop image objects
 */
export function loadDesktopImages() {
  if (!isLocalStorageAvailable()) {
    return []
  }

  try {
    const stored = localStorage.getItem(DESKTOP_IMAGES_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error loading desktop images:', error)
    return []
  }
}

/**
 * Save desktop images to localStorage
 * @param {Array} images - Array of desktop image objects
 * @returns {{ success: boolean, error?: string }} Result object
 */
export function saveDesktopImages(images) {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage not available' }
  }

  try {
    const json = JSON.stringify(images)
    localStorage.setItem(DESKTOP_IMAGES_KEY, json)
    return { success: true }
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      return { success: false, error: 'QuotaExceededError' }
    }
    console.error('Error saving desktop images:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Load recycle bin from localStorage
 * @returns {Array} Array of recycle bin item objects
 */
export function loadRecycleBin() {
  if (!isLocalStorageAvailable()) {
    return []
  }

  try {
    const stored = localStorage.getItem(RECYCLE_BIN_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error loading recycle bin:', error)
    return []
  }
}

/**
 * Save recycle bin to localStorage
 * @param {Array} items - Array of recycle bin item objects
 * @returns {{ success: boolean, error?: string }} Result object
 */
export function saveRecycleBin(items) {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage not available' }
  }

  try {
    const json = JSON.stringify(items)
    localStorage.setItem(RECYCLE_BIN_KEY, json)
    return { success: true }
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      return { success: false, error: 'QuotaExceededError' }
    }
    console.error('Error saving recycle bin:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Calculate storage usage statistics
 * @returns {{ used: number, usedMB: string, limit: number, limitMB: number, percentage: number }}
 */
export function getStorageUsage() {
  if (!isLocalStorageAvailable()) {
    return {
      used: 0,
      usedMB: '0.00',
      limit: 5 * 1024 * 1024,
      limitMB: 5,
      percentage: 0
    }
  }

  let total = 0
  try {
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2 // UTF-16 = 2 bytes per char
      }
    }
  } catch (error) {
    console.error('Error calculating storage usage:', error)
  }

  const limit = 5 * 1024 * 1024 // ~5MB typical limit
  const percentage = Math.round((total / limit) * 100)

  return {
    used: total,
    usedMB: (total / (1024 * 1024)).toFixed(2),
    limit,
    limitMB: 5,
    percentage: Math.min(percentage, 100) // Cap at 100%
  }
}

/**
 * Export gallery (desktop images and recycle bin) as JSON backup
 * @returns {void}
 */
export function exportGallery() {
  try {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      desktopImages: loadDesktopImages(),
      recycleBin: loadRecycleBin()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `wojak-gallery-backup-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting gallery:', error)
    throw error
  }
}

/**
 * Import gallery from backup file
 * @param {File} file - File object to import
 * @returns {Promise<{ success: boolean, count?: number, error?: string }>}
 */
export function importGallery(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        
        if (!data.version || !data.desktopImages) {
          reject(new Error('Invalid backup file format'))
          return
        }

        // Validate version (for future compatibility)
        if (data.version !== 1) {
          reject(new Error(`Unsupported backup version: ${data.version}`))
          return
        }

        // Save imported data
        const desktopResult = saveDesktopImages(data.desktopImages)
        if (!desktopResult.success) {
          reject(new Error(`Failed to save desktop images: ${desktopResult.error}`))
          return
        }

        const binResult = saveRecycleBin(data.recycleBin || [])
        if (!binResult.success) {
          reject(new Error(`Failed to save recycle bin: ${binResult.error}`))
          return
        }

        resolve({
          success: true,
          count: data.desktopImages.length
        })
      } catch (err) {
        reject(new Error(`Failed to parse backup file: ${err.message}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}


