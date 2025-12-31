/**
 * Desktop image management utilities
 * Handles pair detection, FIFO logic, and duplicate detection
 */

/**
 * Find existing Original image with matching traits
 * @param {Array} desktopImages - Array of desktop image objects
 * @param {Object} selectedLayers - Selected layers object
 * @returns {Object|null} Existing Original image or null
 */
export function findExistingOriginalByTraits(desktopImages, selectedLayers) {
  const existingOriginal = desktopImages.find(img => 
    img.type === 'original' && 
    JSON.stringify(img.traits) === JSON.stringify(selectedLayers)
  )
  return existingOriginal || null
}

/**
 * Generate a unique pair ID
 * @returns {string} Unique pair ID
 */
export function generatePairId() {
  return `pair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get both Original and CyberTang images for a pair
 * @param {Array} desktopImages - Array of desktop image objects
 * @param {string} pairId - Pair ID to find
 * @returns {{ original: Object|null, cybertang: Object|null }}
 */
export function getPairImages(desktopImages, pairId) {
  const original = desktopImages.find(img => img.pairId === pairId && img.type === 'original') || null
  const cybertang = desktopImages.find(img => img.pairId === pairId && img.type === 'cybertang') || null
  return { original, cybertang }
}

/**
 * Check if a pair is complete (both Original and CyberTang exist)
 * @param {Array} desktopImages - Array of desktop image objects
 * @param {string} pairId - Pair ID to check
 * @returns {boolean} True if both images exist
 */
export function isPairComplete(desktopImages, pairId) {
  const { original, cybertang } = getPairImages(desktopImages, pairId)
  return original !== null && cybertang !== null
}

/**
 * Check if an image with the same traits and type already exists
 * @param {Array} desktopImages - Array of desktop image objects
 * @param {Object} traits - Traits object to check
 * @param {string} type - Image type ('original' or 'cybertang')
 * @returns {boolean} True if duplicate exists
 */
export function isDuplicateImage(desktopImages, traits, type) {
  return desktopImages.some(img => 
    img.type === type && 
    JSON.stringify(img.traits) === JSON.stringify(traits)
  )
}

/**
 * Enforce desktop icon limit using FIFO
 * Moves oldest icons to recycle bin if limit exceeded
 * @param {Array} desktopImages - Current desktop images
 * @param {number} maxIcons - Maximum number of icons (default: 20)
 * @returns {{ updatedImages: Array, movedToBin: Array }}
 */
export function enforceDesktopLimit(desktopImages, maxIcons = 20) {
  if (desktopImages.length < maxIcons) {
    return { updatedImages: desktopImages, movedToBin: [] }
  }

  // Sort by createdAt (oldest first)
  const sorted = [...desktopImages].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0)
    const dateB = new Date(b.createdAt || 0)
    return dateA - dateB
  })

  // Calculate how many to move
  const toMove = desktopImages.length - maxIcons + 1 // +1 because we're about to add one
  const movedToBin = sorted.slice(0, toMove).map(img => ({
    ...img,
    deletedAt: new Date().toISOString()
  }))

  // Keep the rest
  const updatedImages = sorted.slice(toMove)

  return { updatedImages, movedToBin }
}

/**
 * Enforce recycle bin limit using FIFO
 * Permanently deletes oldest items if limit exceeded
 * @param {Array} recycleBin - Current recycle bin items
 * @param {number} maxItems - Maximum number of items (default: 20)
 * @returns {{ updatedBin: Array, deletedForever: Array }}
 */
export function enforceRecycleBinLimit(recycleBin, maxItems = 20) {
  if (recycleBin.length < maxItems) {
    return { updatedBin: recycleBin, deletedForever: [] }
  }

  // Sort by deletedAt (oldest first)
  const sorted = [...recycleBin].sort((a, b) => {
    const dateA = new Date(a.deletedAt || 0)
    const dateB = new Date(b.deletedAt || 0)
    return dateA - dateB
  })

  // Calculate how many to delete
  const toDelete = recycleBin.length - maxItems + 1 // +1 because we're about to add one
  const deletedForever = sorted.slice(0, toDelete)

  // Keep the rest
  const updatedBin = sorted.slice(toDelete)

  return { updatedBin, deletedForever }
}

















