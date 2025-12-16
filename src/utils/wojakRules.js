/**
 * Wojak Creator Rules System
 * 
 * This file contains rules that govern which layer combinations are allowed.
 * Rules can disable layers based on selections in other layers.
 * 
 * To add a new rule:
 * 1. Add a new function that checks the condition
 * 2. Add it to the RULES array
 * 3. The function should return an object with:
 *    - disabledLayers: array of layer names to disable
 *    - reason: optional message explaining why
 */

/**
 * Check if a path contains a specific image identifier
 * @param {string} path - Image path
 * @param {string} identifier - Identifier to search for (e.g., "Astronaut")
 * @returns {boolean}
 */
function pathContains(path, identifier) {
  if (!path) return false
  return path.toLowerCase().includes(identifier.toLowerCase())
}

/**
 * Rule: If Astronaut clothes is selected, disable Head layer
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with disabledLayers array
 */
function ruleAstronautNoHead(selectedLayers) {
  const clothesPath = selectedLayers['Clothes']
  
  if (pathContains(clothesPath, 'Astronaut')) {
    return {
      disabledLayers: ['Head'],
      reason: 'Astronaut suit includes helmet - head trait not available'
    }
  }
  
  return { disabledLayers: [] }
}

/**
 * Array of all rules to check
 * Add new rules here as they are created
 */
const RULES = [
  ruleAstronautNoHead,
  // Add more rules here in the future
]

/**
 * Get all disabled layers based on current selections
 * @param {Object} selectedLayers - Object mapping layer names to selected image paths
 * @returns {Object} Object with:
 *   - disabledLayers: Set of layer names that should be disabled
 *   - reasons: Map of layer name to reason message
 */
export function getDisabledLayers(selectedLayers) {
  const disabledSet = new Set()
  const reasons = {}
  
  // Run all rules
  for (const rule of RULES) {
    const result = rule(selectedLayers)
    
    if (result.disabledLayers && result.disabledLayers.length > 0) {
      result.disabledLayers.forEach(layerName => {
        disabledSet.add(layerName)
        if (result.reason) {
          reasons[layerName] = result.reason
        }
      })
    }
  }
  
  return {
    disabledLayers: Array.from(disabledSet),
    reasons
  }
}

/**
 * Check if a specific layer is disabled
 * @param {string} layerName - Name of the layer to check
 * @param {Object} selectedLayers - Current layer selections
 * @returns {boolean}
 */
export function isLayerDisabled(layerName, selectedLayers) {
  const { disabledLayers } = getDisabledLayers(selectedLayers)
  return disabledLayers.includes(layerName)
}

/**
 * Get the reason why a layer is disabled (if any)
 * @param {string} layerName - Name of the layer
 * @param {Object} selectedLayers - Current layer selections
 * @returns {string|null} Reason message or null if not disabled
 */
export function getDisabledReason(layerName, selectedLayers) {
  const { reasons } = getDisabledLayers(selectedLayers)
  return reasons[layerName] || null
}

