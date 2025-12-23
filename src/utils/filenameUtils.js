// Shared filename generation utility for Wojak exports
// Ensures consistent filename generation across desktop and mobile

import { getAllLayerImages } from '../lib/memeImageManifest'
import { parseSuitVariant, parseChiaFarmerVariant, parseColorVariant } from '../lib/traitOptions'

// Custom order for generator dropdowns (matches desktop generator)
const GENERATOR_LAYER_ORDER = ['Head','Eyes','Base','MouthBase','MouthItem','FacialHair','Mask','Clothes','Background']

/**
 * Get display label for a path from manifest data
 * @param {string} layerName - Layer name (e.g., 'Head', 'Eyes', 'Base')
 * @param {string} path - Image path
 * @returns {string|null} Display label or null if not found
 */
function getDisplayLabelForPath(layerName, path) {
  if (!path) return null
  
  // Get all images for this layer from manifest
  const images = getAllLayerImages(layerName)
  if (!images || images.length === 0) return null
  
  // Find the image with matching path
  const image = images.find(img => img.path === path)
  if (!image) return null
  
  // Return display name (already formatted by manifest)
  return image.displayName || image.name || null
}

/**
 * Format a token for filename (replace spaces with hyphens, preserve case)
 * @param {string} token - Token to format
 * @returns {string} Formatted token
 */
function formatTokenForFilename(token) {
  if (!token) return ''
  
  // Replace spaces with hyphens
  let formatted = token.replace(/\s+/g, '-')
  
  // Remove parentheses and their contents, but keep the content as part of the token
  // Example: "Cap (Red)" -> "Cap-Red"
  formatted = formatted.replace(/\(([^)]+)\)/g, '-$1')
  
  // Clean up multiple hyphens
  formatted = formatted.replace(/-+/g, '-')
  
  // Remove leading/trailing hyphens
  formatted = formatted.replace(/^-+|-+$/g, '')
  
  return formatted
}

/**
 * Convert a string to title case (first letter of each word capitalized)
 * @param {string} str - String to convert
 * @returns {string} Title-cased string
 */
function toTitleCase(str) {
  if (!str) return ''
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Get filename token for a single layer
 * Handles special cases: Suit, Chia Farmer, color variants, regular items
 * @param {string} layerName - Layer name
 * @param {string} value - Image path value from selectedLayers
 * @param {Object} selectedLayers - All selected layers (for context)
 * @returns {string|null} Formatted token or null if should be skipped
 */
function getFilenameTokenForLayer(layerName, value, selectedLayers) {
  if (!value || value === '' || value === 'None') return null
  
  // Check if filename contains 'none' (case-insensitive)
  const basename = value.split('/').pop() || ''
  if (basename.toLowerCase().includes('none')) {
    return null
  }
  
  // Special handling for Clothes layer
  if (layerName === 'Clothes') {
    // Check if Chia Farmer is selected (stored in ClothesAddon, shown in Clothes dropdown)
    // Chia Farmer takes priority over Suit
    const clothesAddonPath = selectedLayers['ClothesAddon'] || ''
    if (clothesAddonPath) {
      const chiaFarmerRawLabel = getDisplayLabelForPath('ClothesAddon', clothesAddonPath)
      if (chiaFarmerRawLabel) {
        const chiaParsed = parseChiaFarmerVariant(clothesAddonPath, chiaFarmerRawLabel)
        if (chiaParsed) {
          // Format: "ChiaFarmer-{color}"
          // Title case: "ChiaFarmer" capitalized, color title-cased
          return `ChiaFarmer-${toTitleCase(chiaParsed.color)}`
        }
      }
    }
    
    // Check if this is a Suit variant
    const rawLabel = getDisplayLabelForPath(layerName, value)
    if (rawLabel) {
      const suitParsed = parseSuitVariant(rawLabel)
      if (suitParsed) {
        // Format: "Suit-{suitColor}-{accessoryType}-{accessoryColor}"
        // Title case: "Suit" capitalized, all variants title-cased
        return `Suit-${toTitleCase(suitParsed.suitColor)}-${toTitleCase(suitParsed.accessoryType)}-${toTitleCase(suitParsed.accessoryColor)}`
      }
    }
  }
  
  // Get display label from dropdown (uses getDisplayLabelForPath which handles formatting)
  const displayLabel = getDisplayLabelForPath(layerName, value)
  if (!displayLabel || displayLabel.toLowerCase() === 'none') {
    return null
  }
  
  // Handle color variants (Head/Eyes layers with color variants)
  // Display label format: "Cap (Red)" or "Matrix Lenses (Green)"
  // We want: "Cap-Red" or "Matrix-Lenses-Green" (title case: base title case, color title case)
  if (!displayLabel) return null
  const colorParsed = parseColorVariant(displayLabel)
  if (colorParsed && colorParsed.color) {
    // Has color variant - format as "BaseName-Color"
    // Title case: base name title case, color title case
    const baseName = colorParsed.base.trim()
    const color = colorParsed.color
    // Format base name with title case
    const baseTitleCased = toTitleCase(baseName)
    const baseFormatted = formatTokenForFilename(baseTitleCased)
    return `${baseFormatted}-${toTitleCase(color)}`
  }
  
  // Regular item - use display label, format for filename with title case
  // Example: "Wizard Glasses New" -> "Wizard-Glasses-New"
  const titleCased = toTitleCase(displayLabel)
  const formatted = formatTokenForFilename(titleCased)
  return formatted || null
}

/**
 * Generates a deterministic filename for Wojak Generator exports based on selected traits
 * Uses dropdown display labels in the exact dropdown order
 * Format: "Wojak_{trait1}_{trait2}_{trait3}..._{traitN}.png"
 * @param {Object} options - Options object
 * @param {Object} options.selectedLayers - Object mapping layer names to image paths
 * @returns {string} Filename in format: Wojak_<tokens...>.png
 */
export function generateWojakFilename({ selectedLayers }) {
  if (!selectedLayers) return 'Wojak.png'
  
  const tokens = []
  const tokenLayers = [] // Track which layer each token came from
  
  // Iterate through GENERATOR_LAYER_ORDER
  for (const layerName of GENERATOR_LAYER_ORDER) {
    const value = selectedLayers[layerName]
    
    // Get token for this layer
    const token = getFilenameTokenForLayer(layerName, value, selectedLayers)
    
    // Skip if token is null or empty
    if (token && token.trim() !== '') {
      tokens.push(token)
      tokenLayers.push(layerName)
    }
  }
  
  // Build filename: Wojak_{trait1}_{trait2}_{trait3}..._{traitN}.png
  const base = tokens.length > 0 ? `Wojak_${tokens.join('_')}` : 'Wojak'
  let filename = `${base}.png`
  
  // Length cap: cap base name (without .png) to 120 chars
  const baseName = filename.replace(/\.png$/, '')
  if (baseName.length > 120) {
    // Drop tokens from END (Background first, then Clothes, then Mask...)
    const reverseOrder = ['Background', 'Clothes', 'Mask', 'FacialHair', 'MouthItem', 'MouthBase', 'Base', 'Eyes', 'Head']
    let remainingTokens = [...tokens]
    let remainingLayers = [...tokenLayers]
    
    for (const layerName of reverseOrder) {
      // Find last occurrence of this layer's token
      for (let i = remainingTokens.length - 1; i >= 0; i--) {
        if (remainingLayers[i] === layerName) {
          remainingTokens.splice(i, 1)
          remainingLayers.splice(i, 1)
          const truncatedBase = remainingTokens.length > 0 ? `Wojak_${remainingTokens.join('_')}` : 'Wojak'
          const testFilename = `${truncatedBase}.png`
          if (testFilename.replace(/\.png$/, '').length <= 120) {
            filename = testFilename
            break
          }
        }
      }
      if (filename.replace(/\.png$/, '').length <= 120) {
        break
      }
    }
    
    // If still too long after dropping all optional tokens, truncate and append "_etc"
    const finalBaseName = filename.replace(/\.png$/, '')
    if (finalBaseName.length > 120) {
      const maxLength = 120 - '_etc'.length
      const truncated = finalBaseName.slice(0, maxLength).replace(/[-_]+$/, '')
      filename = `${truncated}_etc.png`
    }
  }
  
  // Ensure filename never ends with '-' or '_' (defensive)
  return filename.replace(/[-_]+\.png$/, '.png')
}

