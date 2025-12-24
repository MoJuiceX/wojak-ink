// Master prompt themes - easily add new themes later
import { getAllLayerImages } from '../lib/memeImageManifest'

/**
 * Get display label for a path from manifest data
 * Reused from promptUtils.js to maintain consistency
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

export const PROMPT_THEMES = {
  tangify: {
    name: 'Tangify',
    emoji: '🍊',
    accessories: [
      'small orange fedora (tilted, comically small)',
      'rainbow Pit Viper sunglasses',
      'gold Cuban link chain'
    ],
    vibes: [
      'orange slices floating in corners',
      'warm orange glow around character',
      'tropical sunset colors',
      'palm tree silhouettes',
      'glass of orange juice'
    ],
    style: 'Citrus energy, tropical paradise vibes, blessed by the orange gods',
    rules: 'Keep original Wojak exactly as-is. Add accessories as overlays only. No text on clothing.'
  },
  
  babyfy: {
    name: 'Babyfy',
    emoji: '👶',
    accessories: [
      'baby bonnet or cute beanie on head',
      'pacifier in mouth or nearby',
      'baby bib around neck'
    ],
    vibes: [
      'soft pastel colors throughout',
      'baby blocks or toys in background',
      'fluffy clouds or stars',
      'cute sparkles and hearts floating',
      'baby bottle somewhere in frame',
      'diaper or onesie style clothing',
      'teddy bear or plushie nearby',
      'soft dreamy glow effect'
    ],
    style: 'Adorable, innocent, soft and cuddly baby energy. Big cute eyes, rosy cheeks, wholesome vibes',
    rules: 'Keep the original Wojak character recognizable. Make features softer and cuter. Add baby accessories as overlays. Maintain the line-art style but softer.'
  },
  
  // Future themes - just add more here!
  // demonize: { ... },
  // wizardfy: { ... },
}

/**
 * Map layer values to readable descriptions using manifest display names
 * Clearly describes hat/head, eyes, expression/mouth, mouth item, clothes, and background
 * @param {Object} selectedLayers - Object mapping layer names to image paths
 * @returns {string} Comma-separated description of the Wojak
 */
function describeWojak(selectedLayers) {
  if (!selectedLayers) return 'a Wojak character'
  
  const descriptions = []
  
  // Helper to check if a layer value is valid
  const isValidLayer = (value) => {
    return value && value !== '' && value !== 'None'
  }
  
  // Head/Hat - clearly state what they're wearing on head
  if (isValidLayer(selectedLayers.Head)) {
    const headLabel = getDisplayLabelForPath('Head', selectedLayers.Head)
    if (headLabel && headLabel.toLowerCase() !== 'none') {
      descriptions.push(`wearing ${headLabel.toLowerCase()} on head`)
    }
  }
  
  // Eyes - clearly state what eyes they have
  if (isValidLayer(selectedLayers.Eyes)) {
    const eyesLabel = getDisplayLabelForPath('Eyes', selectedLayers.Eyes)
    if (eyesLabel && eyesLabel.toLowerCase() !== 'none') {
      descriptions.push(`with ${eyesLabel.toLowerCase()} eyes`)
    }
  }
  
  // Base - face style
  if (isValidLayer(selectedLayers.Base)) {
    const baseLabel = getDisplayLabelForPath('Base', selectedLayers.Base)
    if (baseLabel && baseLabel.toLowerCase() !== 'none') {
      descriptions.push(`${baseLabel.toLowerCase()} style face`)
    }
  }
  
  // Mouth Base - expression/mouth
  if (isValidLayer(selectedLayers.MouthBase)) {
    const mouthLabel = getDisplayLabelForPath('MouthBase', selectedLayers.MouthBase)
    if (mouthLabel && mouthLabel.toLowerCase() !== 'none') {
      descriptions.push(`${mouthLabel.toLowerCase()} expression`)
    }
  }
  
  // Mouth Item - what they're holding in mouth (cig, joint, etc)
  if (isValidLayer(selectedLayers.MouthItem)) {
    const itemLabel = getDisplayLabelForPath('MouthItem', selectedLayers.MouthItem)
    if (itemLabel && itemLabel.toLowerCase() !== 'none') {
      descriptions.push(`holding ${itemLabel.toLowerCase()} in mouth`)
    }
  }
  
  // Facial Hair
  if (isValidLayer(selectedLayers.FacialHair)) {
    const hairLabel = getDisplayLabelForPath('FacialHair', selectedLayers.FacialHair)
    if (hairLabel && hairLabel.toLowerCase() !== 'none') {
      descriptions.push(`with ${hairLabel.toLowerCase()}`)
    }
  }
  
  // Mask
  if (isValidLayer(selectedLayers.Mask)) {
    const maskLabel = getDisplayLabelForPath('Mask', selectedLayers.Mask)
    if (maskLabel && maskLabel.toLowerCase() !== 'none') {
      descriptions.push(`wearing ${maskLabel.toLowerCase()}`)
    }
  }
  
  // Clothes - clearly state what clothes they're wearing
  if (isValidLayer(selectedLayers.Clothes)) {
    const clothesLabel = getDisplayLabelForPath('Clothes', selectedLayers.Clothes)
    if (clothesLabel && clothesLabel.toLowerCase() !== 'none') {
      descriptions.push(`wearing ${clothesLabel.toLowerCase()}`)
    }
  }
  
  // Background - clearly state what background
  if (isValidLayer(selectedLayers.Background)) {
    const bgLabel = getDisplayLabelForPath('Background', selectedLayers.Background)
    if (bgLabel && bgLabel.toLowerCase() !== 'none') {
      descriptions.push(`on ${bgLabel.toLowerCase()} background`)
    }
  }
  
  if (descriptions.length === 0) {
    return 'a Wojak character'
  }
  
  return descriptions.join(', ')
}

/**
 * Describe the user's Wojak based on their selections using path parsing
 * Alternative to describeWojak() that parses paths directly instead of using manifest
 * @param {Object} selectedLayers - Object mapping layer names to image paths
 * @returns {string} Comma-separated description of the Wojak
 */
function describeWojakPathParsing(selectedLayers) {
  if (!selectedLayers) return 'a Wojak character'
  
  const parts = []
  
  if (selectedLayers.Head && !selectedLayers.Head.includes('None')) {
    const head = selectedLayers.Head.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`${head} on head`)
  }
  
  if (selectedLayers.Eyes && !selectedLayers.Eyes.includes('None')) {
    const eyes = selectedLayers.Eyes.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`${eyes} eyes`)
  }
  
  if (selectedLayers.Base && !selectedLayers.Base.includes('None')) {
    const base = selectedLayers.Base.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`${base} face style`)
  }
  
  if (selectedLayers.MouthBase && !selectedLayers.MouthBase.includes('None')) {
    const mouth = selectedLayers.MouthBase.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`${mouth} mouth`)
  }
  
  if (selectedLayers.MouthItem && !selectedLayers.MouthItem.includes('None')) {
    const item = selectedLayers.MouthItem.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`${item} in mouth`)
  }
  
  if (selectedLayers.FacialHair && !selectedLayers.FacialHair.includes('None')) {
    const hair = selectedLayers.FacialHair.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`${hair} facial hair`)
  }
  
  if (selectedLayers.Clothes && !selectedLayers.Clothes.includes('None')) {
    const clothes = selectedLayers.Clothes.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`wearing ${clothes}`)
  }
  
  if (selectedLayers.Background && !selectedLayers.Background.includes('None')) {
    const bg = selectedLayers.Background.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    parts.push(`${bg} background`)
  }
  
  if (parts.length === 0) {
    return 'a Wojak character'
  }
  
  return parts.join(', ')
}

/**
 * Build dynamic cyberpunk prompt with user's selected Wojak traits
 * Conditional effects for Head, Eyes, and Clothes only
 * @param {Object} selectedLayers - Object mapping layer names to image paths
 * @returns {string} Generated prompt (max 1000 characters)
 */
export function buildCyberTangPrompt(selectedLayers) {
  const wojakDescription = describeWojakPathParsing(selectedLayers)
  
  // Helper function to check if trait is selected
  const hasTrait = (layer) => {
    return selectedLayers[layer] && 
           !selectedLayers[layer].toLowerCase().includes('none')
  }
  
  // Helper to get clean trait name
  const getTraitName = (layer) => {
    if (!hasTrait(layer)) return null
    return selectedLayers[layer].split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  }
  
  // Build conditional effects for Head, Eyes, Clothes only
  const headEffect = hasTrait('Head') 
    ? `Add neon orange glow around the ${getTraitName('Head')}.`
    : 'Add floating holographic orange crown above head.'
  
  const eyesEffect = hasTrait('Eyes')
    ? `Add neon orange glow around the ${getTraitName('Eyes')}.`
    : 'Add futuristic orange visor with holographic HUD glow.'
  
  const clothesEffect = hasTrait('Clothes')
    ? `Add orange LED strips and neon trim on the ${getTraitName('Clothes')}.`
    : 'Add cyber jacket with orange LED strips.'
  
  // Build effects array
  const effects = [
    'Add neon orange glowing outline around character.',
    headEffect,
    eyesEffect,
    clothesEffect,
    'Add orange circuit tattoos on visible skin.',
    'Add cyberpunk city skyline in background.',
    'Add neon orange signs saying TANG GANG or ORANGE GROVE.',
    'Add orange digital particles floating.',
    'Add dramatic orange rim lighting.',
    'Add wet street reflection at bottom.',
    'Do NOT add random text. Only allowed text: TANG GANG, ORANGE GROVE, CITRUS.'
  ]
  
  const prompt = `EDIT THIS IMAGE: ${wojakDescription}.

EFFECTS TO ADD:
- ${effects.join('\n- ')}

STYLE: Blade Runner meets orange grove. Neon noir cyberpunk. Dystopian legend.

KEEP: Original character recognizable. Layer effects on top.`

  // Ensure under 1000 chars
  if (prompt.length > 990) {
    return prompt.substring(0, 990)
  }
  
  return prompt
}

/**
 * Truncate prompt to stay under character limit
 * Prefers truncating vibes/accessories over core description
 * @param {string} prompt - Full prompt
 * @param {number} maxLength - Maximum length (default 1000)
 * @returns {string} Truncated prompt
 */
function truncatePrompt(prompt, maxLength = 1000) {
  if (prompt.length <= maxLength) {
    return prompt
  }
  
  // Try to truncate at a reasonable point (before last vibe/accessory)
  // Find the last occurrence of "- " and truncate there
  const lastBulletIndex = prompt.lastIndexOf('- ', maxLength - 10)
  if (lastBulletIndex > maxLength * 0.7) {
    // Truncate at last bullet point, add ellipsis
    return prompt.substring(0, lastBulletIndex).trim() + '...'
  }
  
  // Fallback: truncate at maxLength
  return prompt.substring(0, maxLength - 3) + '...'
}

/**
 * Build the final prompt for theme-based editing
 * @param {Object} selectedLayers - Object mapping layer names to image paths
 * @param {string} theme - Theme name (default: 'tangify')
 * @returns {string} Generated prompt (max 1000 characters)
 */
export function buildTangifyPrompt(selectedLayers, theme = 'tangify') {
  const themeConfig = PROMPT_THEMES[theme]
  if (!themeConfig) {
    throw new Error(`Unknown theme: ${theme}`)
  }
  
  let wojakDescription = describeWojak(selectedLayers)
  
  // Special handling for babyfy theme: mention replacing mouth item with pacifier
  if (theme === 'babyfy') {
    const isValidLayer = (value) => value && value !== '' && value !== 'None'
    if (isValidLayer(selectedLayers.MouthItem)) {
      const itemLabel = getDisplayLabelForPath('MouthItem', selectedLayers.MouthItem)
      if (itemLabel && itemLabel.toLowerCase() !== 'none') {
        wojakDescription += `. Replace ${itemLabel.toLowerCase()} with pacifier`
      }
    }
  }
  
  // Pick 2-3 random vibes to add variety
  const shuffledVibes = [...themeConfig.vibes].sort(() => Math.random() - 0.5)
  const selectedVibes = shuffledVibes.slice(0, 3)
  
  // Build prompt
  let prompt = `Edit this Wojak: ${wojakDescription}.

ADD ON TOP (keep original intact):
- ${themeConfig.accessories.join('\n- ')}
- ${selectedVibes.join('\n- ')}

STYLE: ${themeConfig.style}
RULES: ${themeConfig.rules}`

  // Ensure prompt is under 1000 characters
  const truncated = truncatePrompt(prompt, 1000)
  
  if (truncated.length < prompt.length) {
    console.warn(`${theme} prompt truncated from ${prompt.length} to ${truncated.length} characters`)
  }
  
  return truncated
}

