/**
 * Trait name normalization utilities
 * Converts trait names to normalized keys for matching
 */

/**
 * Normalize a string key: lowercase, trim, collapse spaces, remove punctuation
 * @param {string} str - String to normalize
 * @returns {string} Normalized key
 */
export function normalizeKey(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .replace(/[^\w\s]/g, '') // Remove punctuation (keep alphanumeric and spaces)
    .replace(/\s+/g, ''); // Remove remaining spaces
}

/**
 * Canonicalize a trait name by applying aliases per layer
 * @param {string} layerName - Name of the layer (e.g., "Face Wear", "Head", "Mouth")
 * @param {string} traitName - Trait name to canonicalize
 * @param {Object} traitAliases - Alias mappings from traitAliases.json
 * @returns {string} Canonical trait name (normalized key)
 */
export function canonicalizeTrait(layerName, traitName, traitAliases = {}) {
  const normalized = normalizeKey(traitName);
  
  // Check if there's an alias mapping for this layer
  const layerAliases = traitAliases[layerName] || {};
  
  // Check if normalized trait matches any alias
  for (const [canonical, aliases] of Object.entries(layerAliases)) {
    const canonicalNormalized = normalizeKey(canonical);
    const aliasList = Array.isArray(aliases) ? aliases : [aliases];
    
    // Check if trait matches canonical or any alias
    if (normalized === canonicalNormalized) {
      return canonicalNormalized;
    }
    
    for (const alias of aliasList) {
      if (normalized === normalizeKey(alias)) {
        return canonicalNormalized;
      }
    }
  }
  
  // No alias found, return normalized trait name
  return normalized;
}









