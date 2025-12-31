// Prompt generation utility for Tangify feature
// Converts selected layers into descriptive text prompts for DALL-E 3

import { getAllLayerImages } from '../lib/memeImageManifest'
import { parseSuitVariant, parseChiaFarmerVariant, parseColorVariant } from '../lib/traitOptions'

// Custom order for prompt generation (matches generator layer order)
const PROMPT_LAYER_ORDER = ['Head', 'Eyes', 'Base', 'MouthBase', 'MouthItem', 'FacialHair', 'Mask', 'Clothes', 'Background']

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
 * Format a layer description for the prompt
 * @param {string} layerName - Layer name
 * @param {string} value - Image path value from selectedLayers
 * @param {Object} selectedLayers - All selected layers (for context)
 * @returns {string|null} Formatted description or null if should be skipped
 */
function getPromptDescriptionForLayer(layerName, value, selectedLayers) {
  if (!value || value === '' || value === 'None') return null
  
  // Check if filename contains 'none' (case-insensitive)
  const basename = value.split('/').pop() || ''
  if (basename.toLowerCase().includes('none')) {
    return null
  }
  
  // Special handling for Clothes layer
  if (layerName === 'Clothes') {
    // Check if Chia Farmer is selected (stored in ClothesAddon, shown in Clothes dropdown)
    const clothesAddonPath = selectedLayers['ClothesAddon'] || ''
    if (clothesAddonPath) {
      const chiaFarmerRawLabel = getDisplayLabelForPath('ClothesAddon', clothesAddonPath)
      if (chiaFarmerRawLabel) {
        const chiaParsed = parseChiaFarmerVariant(clothesAddonPath, chiaFarmerRawLabel)
        if (chiaParsed) {
          return `wearing a ${chiaParsed.color} Chia Farmer outfit`
        }
      }
    }
    
    // Check if this is a Suit variant
    const rawLabel = getDisplayLabelForPath(layerName, value)
    if (rawLabel) {
      const suitParsed = parseSuitVariant(rawLabel)
      if (suitParsed) {
        return `wearing a ${suitParsed.suitColor} suit with ${suitParsed.accessoryType} in ${suitParsed.accessoryColor}`
      }
    }
  }
  
  // Get display label from dropdown
  const displayLabel = getDisplayLabelForPath(layerName, value)
  if (!displayLabel || displayLabel.toLowerCase() === 'none') {
    return null
  }
  
  // Handle color variants (Head/Eyes layers with color variants)
  const colorParsed = parseColorVariant(displayLabel)
  if (colorParsed && colorParsed.color) {
    // Has color variant - format as "base name in color"
    const baseName = colorParsed.base.trim().toLowerCase()
    const color = colorParsed.color.toLowerCase()
    return `${baseName} in ${color}`
  }
  
  // Regular item - convert to lowercase and format naturally
  return displayLabel.toLowerCase()
}

/**
 * Generate a descriptive prompt for DALL-E 3 from selected layers
 * @param {Object} selectedLayers - Object mapping layer names to image paths
 * @returns {string} Generated prompt for DALL-E 3
 */
export function generateTangifyPrompt(selectedLayers) {
  if (!selectedLayers) {
    return 'A photorealistic, realistic version of a wojak character. High quality, detailed, professional photography style.'
  }
  
  const descriptions = []
  
  // Build descriptions for each layer in order
  for (const layerName of PROMPT_LAYER_ORDER) {
    const value = selectedLayers[layerName]
    const description = getPromptDescriptionForLayer(layerName, value, selectedLayers)
    
    if (description) {
      // Format based on layer type
      if (layerName === 'Head') {
        descriptions.push(`with ${description} on their head`)
      } else if (layerName === 'Eyes') {
        descriptions.push(`with ${description} eyes`)
      } else if (layerName === 'Base') {
        descriptions.push(`a ${description} character`)
      } else if (layerName === 'MouthBase') {
        descriptions.push(`with ${description} mouth`)
      } else if (layerName === 'MouthItem') {
        descriptions.push(`holding ${description} in their mouth`)
      } else if (layerName === 'FacialHair') {
        descriptions.push(`with ${description}`)
      } else if (layerName === 'Mask') {
        descriptions.push(`wearing ${description}`)
      } else if (layerName === 'Clothes') {
        descriptions.push(description) // Already includes "wearing"
      } else if (layerName === 'Background') {
        descriptions.push(`with ${description} background`)
      } else {
        descriptions.push(`with ${description}`)
      }
    }
  }
  
  // Build the final prompt
  let prompt = 'A photorealistic, realistic version of '
  
  // Start with base character description
  const baseDesc = getPromptDescriptionForLayer('Base', selectedLayers['Base'], selectedLayers)
  if (baseDesc) {
    prompt += `a ${baseDesc} character`
  } else {
    prompt += 'a wojak character'
  }
  
  // Add other descriptions
  if (descriptions.length > 0) {
    prompt += ' ' + descriptions.join(', ')
  }
  
  // Add quality/style suffix
  prompt += '. High quality, detailed, professional photography style, realistic lighting, sharp focus.'
  
  return prompt
}

















