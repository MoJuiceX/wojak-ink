// Shared trait options helper module
// Used by both LayerSelector and ExportControls to ensure consistent label formatting

import { getAllLayerImages } from './memeImageManifest'

// Color tokens for variant grouping (case-insensitive)
export const COLOR_TOKENS = {
  'blue': '#1e5bd7',
  'red': '#d71818',
  'green': '#2a9d3c',
  'pink': '#ff4fd8',
  'purple': '#7a2cff',
  'orange': '#ff8a00',
  'black': '#111111',
  'brown': '#8b5a2b',
  'blond': '#d9b56d',
  'yellow': '#ffd200',
  'grey': '#808080',
  'gray': '#808080',
  'white': '#ffffff',
  'neon green': '#39ff14'
}

/**
 * Parse raw display name to extract base name and color token
 * Returns { base, color, hex } or null if no recognized color found
 * @param {string} rawDisplayName - Raw display name from manifest (before formatting)
 * @returns {Object|null} Parsed result with base, color, and hex, or null
 */
export function parseColorVariant(rawDisplayName) {
  if (!rawDisplayName) return null
  
  const lowerName = rawDisplayName.toLowerCase().trim()
  
  // Pattern 1: "Name (color)" - paren color
  const parenMatch = rawDisplayName.match(/^(.+?)\s*\((.+?)\)\s*$/)
  if (parenMatch) {
    const base = parenMatch[1].trim()
    const colorToken = parenMatch[2].trim().toLowerCase()
    if (COLOR_TOKENS[colorToken]) {
      return { base, color: colorToken, hex: COLOR_TOKENS[colorToken] }
    }
  }
  
  // Pattern 2: "Name, color" - comma color
  const commaMatch = rawDisplayName.match(/^(.+?),\s*(.+?)\s*$/)
  if (commaMatch) {
    const base = commaMatch[1].trim()
    const colorToken = commaMatch[2].trim().toLowerCase()
    if (COLOR_TOKENS[colorToken]) {
      return { base, color: colorToken, hex: COLOR_TOKENS[colorToken] }
    }
  }
  
  // Pattern 3: "Name neon green" - last two tokens (special case)
  if (lowerName.endsWith(' neon green')) {
    const base = rawDisplayName.slice(0, -11).trim()
    if (base) {
      return { base, color: 'neon green', hex: COLOR_TOKENS['neon green'] }
    }
  }
  
  // Pattern 4: "Name color" - last token
  const words = rawDisplayName.trim().split(/\s+/)
  if (words.length >= 2) {
    const lastToken = words[words.length - 1].toLowerCase()
    if (COLOR_TOKENS[lastToken]) {
      const base = words.slice(0, -1).join(' ').trim()
      if (base) {
        return { base, color: lastToken, hex: COLOR_TOKENS[lastToken] }
      }
    }
  }
  
  return null
}

/**
 * Normalize Head layer labels (display only)
 * Fixes capitalization and removes unwanted text
 * @param {string} label - Already formatted label
 * @param {string} layerName - Layer name to check
 * @returns {string} Normalized label
 */
export function normalizeHeadLabel(label, layerName) {
  if (!label || layerName !== 'Head') return label
  
  let normalized = label
  
  // Special case: Super Saiyan → Super Saiyan Uniform (for Head layer)
  const labelLower = normalized.toLowerCase()
  if ((labelLower.includes('super') || labelLower.includes('supa')) && labelLower.includes('saiyan')) {
    // Fix "Supa" typo if present, and ensure it's "Super Saiyan Uniform"
    normalized = normalized.replace(/supa/gi, 'Super')
    normalized = normalized.replace(/super\s+saiyan(?:\s+hair)?/gi, 'Super Saiyan Uniform')
  }
  
  // Fix Tupac/2Pac capitalization
  normalized = normalized.replace(/^tupac\b/i, 'Tupac')
  normalized = normalized.replace(/^2pac\b/i, '2Pac')
  
  // SWAT Helmet → SWAT (remove "Helmet" or "Gear" from SWAT items in Head layer)
  if (labelLower.includes('swat')) {
    normalized = normalized.replace(/\bswat\b/gi, 'SWAT')
    // Remove "Helmet" or "Gear" after SWAT
    normalized = normalized.replace(/\bSWAT\s+(Helmet|Gear)\b/gi, 'SWAT')
  } else {
    // Uppercase SWAT in other contexts
    normalized = normalized.replace(/\bswat\b/gi, 'SWAT')
  }
  
  // Remove "man" from Wizard Hat/Head labels (trailing patterns)
  if (normalized.toLowerCase().includes('wizard')) {
    normalized = normalized.replace(/\s*,\s*man\s*$/i, '')
    normalized = normalized.replace(/\s*:\s*man\s*$/i, '')
    normalized = normalized.replace(/\s*\(\s*man\s*\)\s*$/i, '')
    normalized = normalized.replace(/\s+man\s*$/i, '')
  }
  
  return normalized
}

/**
 * Format display label for dropdown options
 * Applies title-case and specific overrides without changing the underlying value
 * @param {string} rawLabel - The raw label from the manifest
 * @returns {string} Formatted display label
 */
export function formatDisplayLabel(rawLabel) {
  if (!rawLabel) return rawLabel

  // Special case: Cashtag labels (e.g., $BEPE, $CASTER) - preserve full uppercase
  if (rawLabel.startsWith('$')) {
    return rawLabel.toUpperCase()
  }

  // Special case: Chia Farmer items
  // Note: Chia Farmer variants are extracted before formatting, so this should rarely be called
  // But keep for backward compatibility - return base name without color since variants are grouped
  const chiaFarmerMatch = rawLabel.match(/chia[- ]?farmer/i)
  if (chiaFarmerMatch) {
    // Return base name only - color selection happens via dots, not dropdown
    return 'Chia Farmer'
  }

  // Special case: Mom's Basement (handle special characters like Momyçôs, MomΓÇÖs, etc.)
  if (rawLabel.toLowerCase().includes('mom') && rawLabel.toLowerCase().includes('basement')) {
    return 'Mom Basement'
  }

  // Special case: NYSE labels (preserve NYSE as all caps, handle both "NYSE" and "Nyse")
  const nyseDumpMatch = rawLabel.match(/nyse\s+dump/i)
  if (nyseDumpMatch) {
    return 'NYSE Dump'
  }
  const nysePumpMatch = rawLabel.match(/nyse\s+pump/i)
  if (nysePumpMatch) {
    return 'NYSE Pump'
  }

  // Special case: 2Pac Bandana - ensure proper capitalization (with or without color variant)
  const pacBandanaMatch = rawLabel.match(/^(2pac\s+bandana)(?:\s+(.+))?$/i)
  if (pacBandanaMatch) {
    const colorPart = pacBandanaMatch[2]
    if (colorPart) {
      // Has color variant - format as "2Pac Bandana (Color)"
      const colorCapitalized = colorPart
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return `2Pac Bandana (${colorCapitalized})`
    }
    return '2Pac Bandana'
  }

  // Special case: Wizard Hat Man - remove "Man" and format as "Wizard Hat" (with or without color variant)
  const wizardHatMatch = rawLabel.match(/^(wizard\s+hat(?:\s+man)?)(?:\s+(.+))?$/i)
  if (wizardHatMatch) {
    const colorPart = wizardHatMatch[2]
    if (colorPart) {
      // Has color variant - format as "Wizard Hat (Color)"
      const colorCapitalized = colorPart
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return `Wizard Hat (${colorCapitalized})`
    }
    return 'Wizard Hat'
  }

  // Special case: Tin Foil - format as "Tin Foil Hat"
  const tinFoilMatch = rawLabel.match(/^tin\s+foil(?:\s+(.+))?$/i)
  if (tinFoilMatch) {
    const colorPart = tinFoilMatch[1]
    if (colorPart && !colorPart.toLowerCase().includes('hat')) {
      // Has color variant - format as "Tin Foil Hat (Color)"
      const colorCapitalized = colorPart
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return `Tin Foil Hat (${colorCapitalized})`
    }
    return 'Tin Foil Hat'
  }

  // Special case: Head layer naming adjustments to match marketplace
  const headLabelLower = rawLabel.toLowerCase()
  
  // Anarchy Spikes → Spikes
  if (headLabelLower.includes('anarchy') && headLabelLower.includes('spikes')) {
    const colorPart = rawLabel.match(/anarchy\s+spikes(?:\s+(.+))?$/i)?.[1]
    if (colorPart) {
      const colorCapitalized = colorPart
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return `Spikes (${colorCapitalized})`
    }
    return 'Spikes'
  }
  
  // Comrade Cap → Comrade Hat
  if (headLabelLower.includes('comrade') && headLabelLower.includes('cap')) {
    return 'Comrade Hat'
  }
  
  // Firefigther Helmet → Firefighter Helmet (fix typo)
  if (headLabelLower.includes('firefigther')) {
    return rawLabel.replace(/firefigther/gi, 'Firefighter')
  }
  
  // Piccolo Hat → Piccolo Turban
  if (headLabelLower.includes('piccolo') && headLabelLower.includes('hat')) {
    return 'Piccolo Turban'
  }
  
  // Vikings Hat → Viking Helmet
  if (headLabelLower.includes('vikings') && headLabelLower.includes('hat')) {
    return 'Viking Helmet'
  }
  
  // Super Mario → Super Wojak Hat (with or without color variant)
  const superMarioMatch = rawLabel.match(/^(super\s+mario)(?:\s+(.+))?$/i)
  if (superMarioMatch) {
    const colorPart = superMarioMatch[2]
    if (colorPart) {
      // Has color variant - format as "Super Wojak Hat (Color)"
      const colorCapitalized = colorPart
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return `Super Wojak Hat (${colorCapitalized})`
    }
    return 'Super Wojak Hat'
  }
  
  // SWAT Helmet → SWAT (preserve all caps)
  if (headLabelLower.includes('swat')) {
    return 'SWAT'
  }
  
  // Super Saiyan → Super Saiyan Uniform (preserve formatting)
  if (headLabelLower.includes('super') && headLabelLower.includes('saiyan')) {
    return 'Super Saiyan Uniform'
  }

  // Special case: Wizard Glasses New - remove "New" from display name
  const wizardGlassesLower = rawLabel.toLowerCase()
  if (wizardGlassesLower.includes('wizard') && wizardGlassesLower.includes('glasses') && wizardGlassesLower.includes('new')) {
    // Remove "new" (case-insensitive) from anywhere in the string
    let cleaned = rawLabel.replace(/\s+new\s*/gi, ' ').replace(/\s+new$/gi, '').trim()
    // Apply title-case formatting
    return cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Special case: Eyes/Face Wear layer naming adjustments to match marketplace
  const eyesLabelLower = rawLabel.toLowerCase()
  
  // 3D Glasses - ensure D is capital
  if (eyesLabelLower.includes('3d') && eyesLabelLower.includes('glasses')) {
    return '3D Glasses'
  }
  
  // MOG Glasses - ensure M-O-G are all capitals
  if (eyesLabelLower.includes('mog') && eyesLabelLower.includes('glasses')) {
    return 'MOG Glasses'
  }
  
  // Matrix Lenses - format base name correctly, but preserve color for grouping
  // The grouping logic uses rawLabel, so we need to ensure the base name is correct
  // but not remove the color here (grouping will handle color variants)
  if (eyesLabelLower.includes('matrix') && eyesLabelLower.includes('lenses')) {
    // Don't remove color here - let grouping handle it
    // Just ensure "Matrix" and "Lenses" are properly capitalized
    // The rawLabel will be used for grouping, which will parse the color correctly
    const parsed = parseColorVariant(rawLabel)
    if (parsed && parsed.color) {
      // Has color variant - format as "Matrix Lenses (Color)" for display
      // But grouping will use rawLabel which has the color
      const colorCapitalized = parsed.color.charAt(0).toUpperCase() + parsed.color.slice(1).toLowerCase()
      return `Matrix Lenses (${colorCapitalized})`
    }
    // No color - just return base name
    return 'Matrix Lenses'
  }
  
  // Ninja Turtle mask → Ninja Turtle Mask (capitalize Mask)
  if (eyesLabelLower.includes('ninja') && eyesLabelLower.includes('turtle') && eyesLabelLower.includes('mask')) {
    return 'Ninja Turtle Mask'
  }

  // Special case: Clothes layer naming adjustments to match marketplace
  const clothesLabelLower = rawLabel.toLowerCase()
  
  // Firefigther Uniform → Firefighter Uniform (fix typo)
  if (clothesLabelLower.includes('firefigther')) {
    return rawLabel.replace(/firefigther/gi, 'Firefighter')
  }
  
  // Super Saiyan → Super Saiyan Uniform (add "Uniform")
  if (clothesLabelLower.includes('super') && clothesLabelLower.includes('saiyan') && !clothesLabelLower.includes('uniform')) {
    return 'Super Saiyan Uniform'
  }
  
  // god rope → God's Robe (fix capitalization and add apostrophe)
  if (clothesLabelLower.includes('god') && clothesLabelLower.includes('rope')) {
    return "God's Robe"
  }
  
  // Military Jacket → El Presidente (rename)
  if (clothesLabelLower.includes('military') && clothesLabelLower.includes('jacket')) {
    return 'El Presidente'
  }
  
  // Swat Gear → SWAT Gear (ensure SWAT is fully capitalized and always include "Gear")
  if (clothesLabelLower.includes('swat')) {
    return 'SWAT Gear'
  }

  // Apply specific overrides (case-insensitive whole word or exact match)
  const overrides = {
    'stach': 'Stache',
    'numb': 'Numb',
    'screeming': 'Screaming',
    'neckbeard': 'Neckbeard',
  }

  const lowerLabel = rawLabel.toLowerCase().trim()
  
  // Check for exact matches first (e.g., "numb" -> "Numb")
  if (overrides[lowerLabel]) {
    return overrides[lowerLabel]
  }
  
  // Check for word boundaries (e.g., "stach" in "stach beard" -> "Stache beard")
  for (const [key, value] of Object.entries(overrides)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi')
    if (regex.test(rawLabel)) {
      return rawLabel.replace(regex, value)
    }
  }

  // Title-case words by default (capitalize first letter of each word)
  return rawLabel
    .split(' ')
    .map(word => {
      if (!word) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Parse suit variant to extract suit color, accessory type, and accessory color
 * Pattern: "Suit {suitColor} {accessoryColor} {accessoryType}"
 * Examples: "Suit black blue tie" => {suitColor: "black", accessoryColor: "blue", accessoryType: "tie"}
 * Note: cleanDisplayName converts hyphens to spaces, so "blue-tie" becomes "blue tie"
 * @param {string} rawDisplayName - Raw display name from manifest
 * @returns {Object|null} Parsed result with suitColor, accessoryType, accessoryColor, or null
 */
export function parseSuitVariant(rawDisplayName) {
  if (!rawDisplayName) return null
  
  const lowerName = rawDisplayName.toLowerCase().trim()
  
  // Must start with "suit"
  if (!lowerName.startsWith('suit')) return null
  
  // Pattern: "Suit {suitColor} {accessoryColor} {accessoryType}"
  // Examples: "Suit black blue tie", "Suit orange red bow"
  // Note: cleanDisplayName converts hyphens to spaces, so "blue-tie" becomes "blue tie"
  const match = lowerName.match(/^suit\s+(\w+)\s+(\w+)\s+(tie|bow)$/)
  if (match) {
    const suitColor = match[1].toLowerCase()
    const accessoryColor = match[2].toLowerCase()
    const accessoryType = match[3].toLowerCase()
    
    // Validate suit colors (black, orange)
    if (suitColor !== 'black' && suitColor !== 'orange') return null
    
    // Validate accessory types (tie, bow)
    if (accessoryType !== 'tie' && accessoryType !== 'bow') return null
    
    return {
      suitColor,
      accessoryType,
      accessoryColor
    }
  }
  
  return null
}

/**
 * Parse Chia Farmer variant to extract color
 * Pattern: "Chia-Farmer_{color}" or "Chia Farmer {color}"
 * Examples: "Chia-Farmer_blue" => {color: "blue"}
 * @param {string} path - Image path
 * @param {string} rawDisplayName - Raw display name
 * @returns {Object|null} Parsed result with color, or null
 */
export function parseChiaFarmerVariant(path, rawDisplayName) {
  if (!path && !rawDisplayName) return null
  
  const pathLower = (path || '').toLowerCase()
  const nameLower = (rawDisplayName || '').toLowerCase()
  
  // Must contain "chia" and "farmer"
  if (!pathLower.includes('chia') || !pathLower.includes('farmer')) {
    if (!nameLower.includes('chia') || !nameLower.includes('farmer')) {
      return null
    }
  }
  
  // Extract color from path: "Chia-Farmer_blue", "Chia-Farmer_brown", etc.
  const pathMatch = pathLower.match(/chia[- ]?farmer[-_]?(\w+)/)
  if (pathMatch) {
    const color = pathMatch[1]
    // Validate color (blue, brown, orange, red)
    if (['blue', 'brown', 'orange', 'red'].includes(color)) {
      return { color }
    }
  }
  
  // Fallback: extract from display name
  const nameMatch = nameLower.match(/chia[- ]?farmer[- ]?(\w+)/)
  if (nameMatch) {
    const color = nameMatch[1]
    if (['blue', 'brown', 'orange', 'red'].includes(color)) {
      return { color }
    }
  }
  
  return null
}

/**
 * Get display label for a layer value (path)
 * Resolves the same label that would be shown in the dropdown
 * @param {string} layerName - Layer name (e.g., 'Head', 'Eyes', 'Base')
 * @param {string} value - Image path value from selectedLayers
 * @param {Object} selectedLayers - All selected layers (for context, e.g., ClothesAddon)
 * @returns {string|null} Display label or null if not found
 */
export function getLabelForLayerValue(layerName, value, selectedLayers = {}) {
  if (!value || !layerName) return null

  // Handle Centurion proxy (Head layer) - dropdown shows "Centurion" but value is "__CENTURION__"
  if (layerName === 'Head' && value === '__CENTURION__') {
    return 'Centurion'
  }

  // Handle ClothesAddon (Chia Farmer) - it's shown in Clothes dropdown
  if (layerName === 'Clothes') {
    const clothesAddonPath = selectedLayers['ClothesAddon'] || ''
    if (clothesAddonPath && clothesAddonPath === value) {
      // This is a Chia Farmer item - get from ClothesAddon layer
      const addonImages = getAllLayerImages('ClothesAddon')
      const addonImage = addonImages.find(img => img.path === value)
      if (addonImage) {
        const rawLabel = addonImage.displayName || addonImage.name
        return formatDisplayLabel(rawLabel)
      }
    }
  }

  // Get all images for the layer
  const allImages = getAllLayerImages(layerName)
  
  // Find image with matching path
  const image = allImages.find(img => img.path === value)
  if (!image) return null

  // Get raw label
  const rawLabel = image.displayName || image.name
  if (!rawLabel) return null

  // Apply Head-specific normalization if needed
  let normalizedLabel = rawLabel
  if (layerName === 'Head') {
    normalizedLabel = normalizeHeadLabel(rawLabel, layerName)
  }

  // Format the label
  const formattedLabel = formatDisplayLabel(normalizedLabel)
  
  return formattedLabel || null
}

