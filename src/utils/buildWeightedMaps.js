/**
 * Build weighted maps from trait frequencies and image manifests
 * Maps trait frequencies to actual generator layer images
 */

import { TRAIT_FREQUENCIES, normalizeWeights } from './traitFrequencies.js'
import { normalizeKey, canonicalizeTrait } from './traitName.js'
import traitAliases from '../data/traitAliases.json'

/**
 * Get canonical key for an image object
 * Preserves empty string '' as valid path (do NOT treat as falsy)
 * @param {Object} img - Image object with path, id, or displayName
 * @returns {string} Canonical key for weight lookup
 */
export function getImageKey(img) {
  // Check typeof path === 'string' first - preserves empty string '' as valid path
  if (typeof img?.path === 'string') {
    return img.path
  }
  // Fallback to id or displayName
  if (img?.id) {
    return String(img.id)
  }
  if (img?.displayName) {
    return String(img.displayName)
  }
  return ''
}

/**
 * Find matching images in a layer by normalized trait name
 * @param {Array} images - Array of image objects
 * @param {string} traitName - Trait name to match
 * @param {string} layerName - Layer name for canonicalization
 * @returns {Array} Array of matching image objects
 */
function findMatchingImages(images, traitName, layerName) {
  const canonicalTrait = canonicalizeTrait(layerName, traitName, traitAliases)
  const matches = []
  
  for (const img of images) {
    const imgDisplayName = img?.displayName || img?.name || ''
    const normalizedDisplayName = normalizeKey(imgDisplayName)
    
    if (normalizedDisplayName === canonicalTrait) {
      matches.push(img)
    }
  }
  
  return matches
}

/**
 * Route Face Wear trait to appropriate layer (Eyes or Mask)
 * Checks which layer actually contains the matching image
 * @param {string} traitName - Face Wear trait name
 * @param {Array} eyesImages - Images from Eyes layer
 * @param {Array} maskImages - Images from Mask layer
 * @returns {{ layer: 'Eyes'|'Mask'|'Both', imagePath: string|'' }} Routing info
 */
function routeFaceWearTrait(traitName, eyesImages, maskImages) {
  // "No Face Wear" is special - routes to Both (correlated event)
  if (normalizeKey(traitName) === normalizeKey('No Face Wear')) {
    return { layer: 'Both', imagePath: '', trait: traitName }
  }
  
  // Check which layer contains the matching image
  // Priority: Mask > Eyes (if matches both, prefer Mask)
  const maskMatches = findMatchingImages(maskImages, traitName, 'Face Wear')
  if (maskMatches.length > 0) {
    // Sort by path for deterministic selection
    maskMatches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
    return { layer: 'Mask', imagePath: maskMatches[0].path, trait: traitName }
  }
  
  const eyesMatches = findMatchingImages(eyesImages, traitName, 'Face Wear')
  if (eyesMatches.length > 0) {
    // Sort by path for deterministic selection
    eyesMatches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
    return { layer: 'Eyes', imagePath: eyesMatches[0].path, trait: traitName }
  }
  
  // No match found - default to Eyes with empty path
  return { layer: 'Eyes', imagePath: '', trait: traitName }
}

/**
 * Route Mouth trait to appropriate layer
 * Auto-detects by checking which layer contains the trait image
 * Priority order: Mask > FacialHair > MouthItem > MouthBase
 * @param {string} traitName - Mouth trait name
 * @param {Object} manifestsByLayer - Layer manifests
 * @returns {{ layer: string, imagePath: string|'' }} Routing info
 */
function routeMouthTrait(traitName, manifestsByLayer) {
  const layers = ['Mask', 'FacialHair', 'MouthItem', 'MouthBase']
  
  for (const layerName of layers) {
    const images = manifestsByLayer[layerName] || []
    const matches = findMatchingImages(images, traitName, 'Mouth')
    if (matches.length > 0) {
      // Sort by path for deterministic selection
      matches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
      return { layer: layerName, imagePath: matches[0].path, trait: traitName }
    }
  }
  
  // No match found - default to MouthBase
  return { layer: 'MouthBase', imagePath: '', trait: traitName }
}

/**
 * Parse Base+Face from combined image names
 * @param {string} displayName - Display name or filename
 * @returns {{ base: string, face: string }|null} Parsed base and face, or null
 */
function parseBaseFace(displayName) {
  // Base images have format like "Base-Wojak_classic" or "Base-Wojak_bleeding-bags"
  // Try to parse base archetype and face variant
  const normalized = normalizeKey(displayName)
  
  // Pattern: base-(wojak|soyjak|waifu|...)_(classic|rekt|...)
  // Or: (alien|bepe)-(wojak|soyjak|...)
  const patterns = [
    /^(base|alien|bepe)?(wojak|soyjak|waifu|baddie|monkeyzoo|papatang)$/,
    /^(alien|bepe)?(wojak|soyjak|waifu|baddie)(classic|rekt|bleedingbags|rugged|terminator|npc)$/
  ]
  
  // For now, return null - will handle separately if needed
  // The manifest shows Base layer has combined images like "Base-Wojak_classic"
  return null
}

/**
 * Build weighted maps for all layers
 * @param {Object} manifestsByLayer - Object mapping layer names to image arrays
 * @returns {{ imageWeightByLayer: Map, faceWearTraitWeights: Map, faceWearToLayerRouting: Map, reports: Object }}
 */
export function buildWeightedMaps({ manifestsByLayer }) {
  const imageWeightByLayer = {}
  const reports = {
    unmappedTraits: {},
    zeroWeightImages: {},
    coverage: {}
  }
  
  // 1. Face Wear Meta-Layer Decision
  const faceWearTraitWeights = new Map()
  const faceWearToLayerRouting = new Map()
  const faceWearFreqs = TRAIT_FREQUENCIES['Face Wear'] || {}
  
  const eyesImages = manifestsByLayer.Eyes || []
  const maskImages = manifestsByLayer.Mask || []
  
  for (const [traitName, freq] of Object.entries(faceWearFreqs)) {
    faceWearTraitWeights.set(traitName, freq)
    const routing = routeFaceWearTrait(traitName, eyesImages, maskImages)
    faceWearToLayerRouting.set(traitName, routing)
  }
  
  // Normalize Face Wear weights (should already sum to 1, but ensure)
  const normalizedFaceWear = normalizeWeights(Object.fromEntries(faceWearTraitWeights))
  faceWearTraitWeights.clear()
  for (const [trait, weight] of Object.entries(normalizedFaceWear)) {
    faceWearTraitWeights.set(trait, weight)
  }
  
  // 2. Mouth Routing
  const mouthFreqs = TRAIT_FREQUENCIES['Mouth'] || {}
  const mouthRouting = {} // trait -> { layer, imagePath }
  const layerTraitWeights = {
    Mask: {},
    FacialHair: {},
    MouthItem: {},
    MouthBase: {}
  }
  
  for (const [traitName, freq] of Object.entries(mouthFreqs)) {
    const routing = routeMouthTrait(traitName, manifestsByLayer)
    mouthRouting[traitName] = routing
    
    // Accumulate weights per layer
    if (routing.layer && layerTraitWeights[routing.layer]) {
      if (!layerTraitWeights[routing.layer][traitName]) {
        layerTraitWeights[routing.layer][traitName] = 0
      }
      layerTraitWeights[routing.layer][traitName] += freq
    }
  }
  
  // Calculate None weights and normalize for each layer
  // Mask None (from Mouth only - Face Wear handled separately)
  const maskFromMouthSum = Object.values(layerTraitWeights.Mask).reduce((sum, w) => sum + w, 0)
  layerTraitWeights.Mask[''] = Math.max(0, 1 - maskFromMouthSum)
  const maskWeights = normalizeWeights(layerTraitWeights.Mask)
  
  // FacialHair None
  const facialHairSum = Object.values(layerTraitWeights.FacialHair).reduce((sum, w) => sum + w, 0)
  layerTraitWeights.FacialHair[''] = Math.max(0, 1 - facialHairSum)
  let facialHairWeights = normalizeWeights(layerTraitWeights.FacialHair)
  
  // Override FacialHair weights with custom distribution:
  // 70% None, 15% Neck Beard, 15% Stache
  // Note: Using "stach" (image filename) which will match via alias to "Stache"
  facialHairWeights = {
    '': 0.70,        // None: 70%
    'Neckbeard': 0.15,  // Neck Beard: 15%
    'stach': 0.15      // Stache/stach: 15% (alias maps Stache -> stach)
  }
  // Ensure it's normalized (should already sum to 1, but safety check)
  facialHairWeights = normalizeWeights(facialHairWeights)
  
  // MouthItem None (if needed)
  const mouthItemSum = Object.values(layerTraitWeights.MouthItem).reduce((sum, w) => sum + w, 0)
  layerTraitWeights.MouthItem[''] = Math.max(0, 1 - mouthItemSum)
  const mouthItemWeights = normalizeWeights(layerTraitWeights.MouthItem)
  
  // MouthBase weights (no None needed - always has something or empty string handled separately)
  const mouthBaseWeights = normalizeWeights(layerTraitWeights.MouthBase)
  
  // 3. Build weight maps for each layer
  const layers = ['Background', 'Base', 'Clothes', 'Head', 'Eyes', 'Mask', 'MouthBase', 'MouthItem', 'FacialHair']
  
  for (const layerName of layers) {
    const images = manifestsByLayer[layerName] || []
    const weightMap = new Map()
    
    // Handle special layers
    if (layerName === 'Mask') {
      // Build from maskWeights + route Face Wear mask traits
      for (const [traitName, weight] of Object.entries(maskWeights)) {
        if (traitName === '') {
          weightMap.set('', weight)
        } else {
          // Find matching images for this trait
          const matches = findMatchingImages(images, traitName, 'Mouth')
          if (matches.length > 0) {
            // Sort by path for deterministic variant distribution
            matches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
            const variantWeight = weight / matches.length
            for (const img of matches) {
              const key = getImageKey(img)
              const existing = weightMap.get(key) || 0
              weightMap.set(key, existing + variantWeight)
            }
          }
        }
      }
      
      // Add Face Wear mask traits
      for (const [traitName, weight] of faceWearTraitWeights.entries()) {
        const routing = faceWearToLayerRouting.get(traitName)
        if (routing && routing.layer === 'Mask' && routing.imagePath) {
          const key = routing.imagePath
          const existing = weightMap.get(key) || 0
          weightMap.set(key, existing + weight)
        }
      }
      
      // Renormalize after adding Face Wear
      const total = Array.from(weightMap.values()).reduce((sum, w) => sum + w, 0)
      if (total > 0) {
        for (const [key, weight] of weightMap.entries()) {
          weightMap.set(key, weight / total)
        }
      }
    } else if (layerName === 'FacialHair') {
      // Build from facialHairWeights
      for (const [traitName, weight] of Object.entries(facialHairWeights)) {
        if (traitName === '') {
          weightMap.set('', weight)
        } else {
          const matches = findMatchingImages(images, traitName, 'Mouth')
          if (matches.length > 0) {
            matches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
            const variantWeight = weight / matches.length
            for (const img of matches) {
              const key = getImageKey(img)
              const existing = weightMap.get(key) || 0
              weightMap.set(key, existing + variantWeight)
            }
          }
        }
      }
    } else if (layerName === 'MouthItem') {
      // Build from mouthItemWeights
      for (const [traitName, weight] of Object.entries(mouthItemWeights)) {
        if (traitName === '') {
          weightMap.set('', weight)
        } else {
          const matches = findMatchingImages(images, traitName, 'Mouth')
          if (matches.length > 0) {
            matches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
            const variantWeight = weight / matches.length
            for (const img of matches) {
              const key = getImageKey(img)
              const existing = weightMap.get(key) || 0
              weightMap.set(key, existing + variantWeight)
            }
          }
        }
      }
    } else if (layerName === 'MouthBase') {
      // Build from mouthBaseWeights
      for (const [traitName, weight] of Object.entries(mouthBaseWeights)) {
        const matches = findMatchingImages(images, traitName, 'Mouth')
        if (matches.length > 0) {
          matches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
          const variantWeight = weight / matches.length
          for (const img of matches) {
            const key = getImageKey(img)
            const existing = weightMap.get(key) || 0
            weightMap.set(key, existing + variantWeight)
          }
        }
      }
    } else if (layerName === 'Eyes') {
      // Build from Face Wear eyes traits only
      for (const [traitName, weight] of faceWearTraitWeights.entries()) {
        const routing = faceWearToLayerRouting.get(traitName)
        if (routing && routing.layer === 'Eyes') {
          if (routing.imagePath) {
            const key = routing.imagePath
            const existing = weightMap.get(key) || 0
            weightMap.set(key, existing + weight)
          } else if (routing.layer === 'Both') {
            // "No Face Wear" - weight already handled, but set None
            weightMap.set('', (weightMap.get('') || 0) + weight)
          }
        } else if (routing && routing.layer === 'Both') {
          // "No Face Wear" sets Eyes to None
          weightMap.set('', (weightMap.get('') || 0) + weight)
        }
      }
    } else {
      // Direct mapping layers: Background, Base, Clothes, Head
      const traitGroupName = layerName
      const traitFreqs = TRAIT_FREQUENCIES[traitGroupName] || {}
      
      // Special handling for Base + Face if combined
      if (layerName === 'Base') {
        // Check if Base layer has combined Base+Face images
        // Pattern: "Base-Wojak_classic", "Base-Wojak_rekt", etc.
        const hasCombined = images.some(img => {
          const name = (img.displayName || img.name || '').toLowerCase()
          return name.includes('base-wojak') || name.includes('base-soyjak') || name.includes('base-waifu')
        })
        
        if (hasCombined) {
          // Build combined Base × Face weights
          const baseFreqs = TRAIT_FREQUENCIES['Base'] || {}
          const faceFreqs = TRAIT_FREQUENCIES['Face'] || {}
          
          for (const img of images) {
            const displayName = img.displayName || img.name || ''
            // Try to match base archetype and face variant
            let matchedBase = null
            let matchedFace = null
            
            for (const baseName of Object.keys(baseFreqs)) {
              if (normalizeKey(displayName).includes(normalizeKey(baseName))) {
                matchedBase = baseName
                break
              }
            }
            
            for (const faceName of Object.keys(faceFreqs)) {
              if (normalizeKey(displayName).includes(normalizeKey(faceName))) {
                matchedFace = faceName
                break
              }
            }
            
            if (matchedBase && matchedFace) {
              const baseWeight = baseFreqs[matchedBase] || 0
              const faceWeight = faceFreqs[matchedFace] || 0
              const combinedWeight = baseWeight * faceWeight
              
              if (combinedWeight > 0) {
                const key = getImageKey(img)
                const existing = weightMap.get(key) || 0
                weightMap.set(key, existing + combinedWeight)
              }
            }
          }
          
          // Normalize within Base layer
          const total = Array.from(weightMap.values()).reduce((sum, w) => sum + w, 0)
          if (total > 0) {
            for (const [key, weight] of weightMap.entries()) {
              weightMap.set(key, weight / total)
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.warn('[buildWeightedMaps] Base+Face combined distribution uses independence approximation')
          }
        } else {
          // Separate Base layer - use traitFreqs (which is already TRAIT_FREQUENCIES['Base'])
          for (const [traitName, freq] of Object.entries(traitFreqs)) {
            const matches = findMatchingImages(images, traitName, 'Base')
            if (matches.length > 0) {
              matches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
              const variantWeight = freq / matches.length
              for (const img of matches) {
                const key = getImageKey(img)
                const existing = weightMap.get(key) || 0
                weightMap.set(key, existing + variantWeight)
              }
            } else {
              // Track unmapped traits
              if (!reports.unmappedTraits[layerName]) {
                reports.unmappedTraits[layerName] = []
              }
              reports.unmappedTraits[layerName].push(traitName)
            }
          }
        }
      } else {
        // Regular direct mapping
        for (const [traitName, freq] of Object.entries(traitFreqs)) {
          const matches = findMatchingImages(images, traitName, traitGroupName)
          if (matches.length > 0) {
            // Sort by path for deterministic variant distribution
            matches.sort((a, b) => (a.path || '').localeCompare(b.path || ''))
            const variantWeight = freq / matches.length
            for (const img of matches) {
              const key = getImageKey(img)
              const existing = weightMap.get(key) || 0
              weightMap.set(key, existing + variantWeight)
            }
          } else {
            // Track unmapped traits
            if (!reports.unmappedTraits[layerName]) {
              reports.unmappedTraits[layerName] = []
            }
            reports.unmappedTraits[layerName].push(traitName)
          }
        }
      }
    }
    
    imageWeightByLayer[layerName] = weightMap
    
    // Calculate coverage
    const totalImages = images.length
    const mappedImages = Array.from(weightMap.keys()).filter(key => key !== '').length
    reports.coverage[layerName] = totalImages > 0 ? (mappedImages / totalImages) * 100 : 0
    
    // Track zero-weight images
    const zeroWeight = images.filter(img => {
      const key = getImageKey(img)
      return key !== '' && (!weightMap.has(key) || weightMap.get(key) === 0)
    })
    if (zeroWeight.length > 0) {
      reports.zeroWeightImages[layerName] = zeroWeight.map(img => getImageKey(img))
    }
  }
  
  // Print dev reports
  if (process.env.NODE_ENV === 'development') {
    console.log('[buildWeightedMaps] Reports:', reports)
  }
  
  return {
    imageWeightByLayer,
    faceWearTraitWeights,
    faceWearToLayerRouting,
    reports
  }
}

