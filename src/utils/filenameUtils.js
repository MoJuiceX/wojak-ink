// Shared filename generation utility for Wojak exports
// Ensures consistent filename generation across desktop and mobile

import { getAllLayerImages } from '../lib/memeImageManifest'
import { parseSuitVariant, parseChiaFarmerVariant, parseColorVariant, formatDisplayLabel, normalizeHeadLabel, getLabelForLayerValue } from '../lib/traitOptions'

// Custom order for generator dropdowns (matches desktop generator)
// Filename order: Head, Eyes, MouthBase, MouthItem, FacialHair, Mask, Clothes, Background
// Note: Base is excluded from filename but still used for rendering
const GENERATOR_LAYER_ORDER = ['Head','Eyes','MouthBase','MouthItem','FacialHair','Mask','Clothes','Background']

/**
 * Convert layer name to filename format (lowercase with hyphens)
 * @param {string} layerName - Layer name (e.g., 'MouthBase', 'FacialHair')
 * @returns {string} Formatted layer name (e.g., 'mouth-base', 'face-hair')
 */
function layerNameToFilename(layerName) {
  if (!layerName) return ''
  
  // Special cases
  const mapping = {
    'Head': 'head',
    'Eyes': 'eye',
    'MouthBase': 'mouth-base',
    'MouthItem': 'mouth-item',
    'FacialHair': 'face-hair',
    'Mask': 'mask',
    'Clothes': 'clothes',
    'Background': 'background'
  }
  
  if (mapping[layerName]) {
    return mapping[layerName]
  }
  
  // Default: convert camelCase to kebab-case
  return layerName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

// Use the formatted display label function from traitOptions to match dropdown labels
// This ensures filename uses the exact same label shown in the dropdown menu

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
  
  // Handle Centurion proxy (Head layer) - dropdown shows "Centurion" but value is "__CENTURION__"
  if (layerName === 'Head' && value === '__CENTURION__') {
    return 'Centurion'
  }
  
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
      // Get raw label for parsing (need to get from manifest directly)
      const addonImages = getAllLayerImages('ClothesAddon')
      const addonImage = addonImages.find(img => img.path === clothesAddonPath)
      const chiaFarmerRawLabel = addonImage ? (addonImage.displayName || addonImage.name) : null
      if (chiaFarmerRawLabel) {
        const chiaParsed = parseChiaFarmerVariant(clothesAddonPath, chiaFarmerRawLabel)
        if (chiaParsed) {
          // Format: "ChiaFarmer-{color}"
          // Title case: "ChiaFarmer" capitalized, color title-cased
          return `ChiaFarmer-${toTitleCase(chiaParsed.color)}`
        }
      }
    }
    
    // Check if this is a Suit variant - get raw label for parsing
    const clothesImages = getAllLayerImages(layerName)
    const clothesImage = clothesImages.find(img => img.path === value)
    if (clothesImage) {
      const rawLabel = clothesImage.displayName || clothesImage.name
      const suitParsed = parseSuitVariant(rawLabel)
      if (suitParsed) {
        // Format: "Suit-{suitColor}-{accessoryType}-{accessoryColor}"
        // Title case: "Suit" capitalized, all variants title-cased
        return `Suit-${toTitleCase(suitParsed.suitColor)}-${toTitleCase(suitParsed.accessoryType)}-${toTitleCase(suitParsed.accessoryColor)}`
      }
    }
  }
  
  // Get formatted display label from dropdown (same as what user sees in dropdown)
  const displayLabel = getLabelForLayerValue(layerName, value, selectedLayers)
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
  
  // Build parts array: [layer1, trait1, layer2, trait2, ...]
  // Each layer contributes 2 parts: layer name and trait token
  const parts = []
  const layerIndices = [] // Track which layer each part pair belongs to
  
  // Iterate through GENERATOR_LAYER_ORDER
  for (const layerName of GENERATOR_LAYER_ORDER) {
    const value = selectedLayers[layerName]
    
    // Get token for this layer
    const token = getFilenameTokenForLayer(layerName, value, selectedLayers)
    
    // Skip if token is null or empty
    if (token && token.trim() !== '') {
      const layerFilename = layerNameToFilename(layerName)
      parts.push(layerFilename)
      parts.push(token)
      layerIndices.push(layerName) // Track which layer this pair belongs to
    }
  }
  
  // Build filename: Wojak_{layer1}_{trait1}_{layer2}_{trait2}..._{layerN}_{traitN}.png
  const base = parts.length > 0 ? `Wojak_${parts.join('_')}` : 'Wojak'
  let filename = `${base}.png`
  
  // Length cap: cap base name (without .png) to 120 chars
  const baseName = filename.replace(/\.png$/, '')
  if (baseName.length > 120) {
    // Drop tokens from END (Background first, then Clothes, then Mask...)
    const reverseOrder = ['Background', 'Clothes', 'Mask', 'FacialHair', 'MouthItem', 'MouthBase', 'Eyes', 'Head']
    let remainingParts = [...parts]
    let remainingLayers = [...layerIndices]
    
    for (const layerName of reverseOrder) {
      // Find last occurrence of this layer in remainingLayers
      const lastIndex = remainingLayers.lastIndexOf(layerName)
      if (lastIndex >= 0) {
        // Remove both layer name and token (2 elements at position lastIndex * 2)
        const startIndex = lastIndex * 2
        remainingParts.splice(startIndex, 2) // Remove layer name and token
        remainingLayers.splice(lastIndex, 1) // Remove layer from tracking
        
        const truncatedBase = remainingParts.length > 0 ? `Wojak_${remainingParts.join('_')}` : 'Wojak'
        const testFilename = `${truncatedBase}.png`
        if (testFilename.replace(/\.png$/, '').length <= 120) {
          filename = testFilename
          break
        }
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

/**
 * Build image name from selected layers for desktop storage
 * Simpler format than generateWojakFilename - just trait names joined with underscores
 * Format: "Wojak_[traits].png" or "CyberTang_[traits].png"
 * @param {Object} selectedLayers - Object mapping layer names to image paths
 * @param {string} type - Image type: 'original' or 'cybertang'
 * @returns {string} Filename
 */
export function buildImageName(selectedLayers, type = 'original') {
  if (!selectedLayers) {
    return type === 'cybertang' ? 'CyberTang.png' : 'Wojak.png'
  }

  const prefix = type === 'cybertang' ? 'CyberTang' : 'Wojak'
  const traits = []

  // Extract trait names from each layer
  for (const layerName of GENERATOR_LAYER_ORDER) {
    const value = selectedLayers[layerName]
    if (!value || value === '' || value === 'None') continue
    
    // Check if filename contains 'none' (case-insensitive)
    const basename = value.split('/').pop() || ''
    if (basename.toLowerCase().includes('none')) continue

    // Get formatted display label from dropdown (same as what user sees)
    const displayLabel = getLabelForLayerValue(layerName, value, selectedLayers)
    if (!displayLabel || displayLabel.toLowerCase() === 'none') continue

    // Format trait name: remove spaces, special chars, keep alphanumeric and hyphens
    let traitName = displayLabel
      .replace(/\([^)]+\)/g, '') // Remove parentheses and content
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '') // Remove spaces
      .replace(/-+/g, '') // Remove hyphens
    
    if (traitName && traitName.length > 0) {
      traits.push(traitName)
    }
  }

  // Build filename
  let filename = traits.length > 0 
    ? `${prefix}_${traits.join('_')}` 
    : prefix

  // Limit filename length to 50 characters (excluding extension)
  if (filename.length > 50) {
    filename = filename.substring(0, 50)
  }

  return `${filename}.png`
}

