import { MEMETIC_ENERGY_BASE_PATH, LAYER_FOLDERS } from './constants'

/**
 * Loads all images from a specific layer folder
 * @param {string} layerName - Name of the layer (Background, Base, etc.)
 * @returns {Promise<Object>} Object mapping image names to their paths
 */
export async function loadLayerImages(layerName) {
  const folder = LAYER_FOLDERS[layerName]
  if (!folder) return {}

  // For public folder assets, we need to construct URLs directly
  // Vite serves public folder at root, so /memetic-energy/... works
  return {}
}

/**
 * Gets image path from public folder
 * @param {string} layerName - Name of the layer
 * @param {string} imageName - Name of the image file
 * @returns {string} Public URL path to the image
 */
export function getImagePath(layerName, imageName) {
  const folder = LAYER_FOLDERS[layerName]
  if (!folder || !imageName) return null

  // Handle subfolders (e.g., Background/$CASHTAG/, Background/Plain Backgrounds/, Background/Scene/)
  let fullPath = `${MEMETIC_ENERGY_BASE_PATH}/${folder}`
  
  // Check if image is in a subfolder
  if (imageName.includes('/')) {
    fullPath += `/${imageName}`
  } else {
    // Try to find the image in subfolders
    // For now, we'll use a simple approach and let the component handle subfolder selection
    fullPath += `/${imageName}`
  }

  return fullPath
}

/**
 * Gets all available images for a layer, organized by subfolder
 * @param {string} layerName - Name of the layer
 * @returns {Promise<Object>} Object with subfolder keys and image arrays
 */
// Since Vite's glob doesn't work well with public folder at build time,
// we'll use a runtime approach with a manifest or direct path construction
export async function getLayerImagesBySubfolder(layerName) {
  const folder = LAYER_FOLDERS[layerName]
  if (!folder) return {}

  // For now, return empty and let the component handle loading
  // In production, you'd want to either:
  // 1. Generate a manifest at build time
  // 2. Use a server endpoint to list files
  // 3. Hardcode the known images
  
  // We'll use a simple approach: construct paths based on known structure
  // This is a placeholder - in production you'd want a proper manifest
  return {}
}

// Helper to get image URL from public folder
export function getPublicImageUrl(layerName, subfolder, fileName) {
  const folder = LAYER_FOLDERS[layerName]
  if (!folder) return null
  
  let path = `${MEMETIC_ENERGY_BASE_PATH}/${folder}`
  if (subfolder) {
    path += `/${subfolder}`
  }
  path += `/${fileName}.png`
  
  return path
}

