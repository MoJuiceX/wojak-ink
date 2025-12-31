/**
 * Weighted random selection utilities
 * Uses crypto RNG when available for better randomness
 */

/**
 * Get a random number between 0 (inclusive) and 1 (exclusive)
 * Uses crypto.getRandomValues when available, falls back to Math.random()
 * @returns {number} Random number in [0, 1)
 */
export function getRand01() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Use crypto RNG for better randomness
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    // Convert to [0, 1) range
    return array[0] / (0xFFFFFFFF + 1);
  }
  // Fallback to Math.random
  return Math.random();
}

/**
 * Pick an item from array using weights
 * Supports any item type (images, strings, objects, etc.)
 * 
 * @param {Array} items - Array of items to pick from (can be any type)
 * @param {Function} getWeight - Function that returns weight for an item: (item) => number
 * @returns {*} Selected item, or first item if all weights are 0 (uniform fallback)
 */
export function weightedPick(items, getWeight) {
  if (!items || items.length === 0) {
    return null;
  }
  
  // Calculate weights and cumulative distribution
  const weights = items.map(getWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  // If all weights are 0 or negative, fallback to uniform random
  if (totalWeight <= 0) {
    const idx = Math.floor(getRand01() * items.length);
    return items[idx];
  }
  
  // Build cumulative distribution
  const cumulative = [];
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += Math.max(0, weights[i]); // Clamp negatives
    cumulative[i] = sum;
  }
  
  // Normalize to [0, 1] range
  const normalized = cumulative.map(c => c / totalWeight);
  
  // Pick random value
  const r = getRand01();
  
  // Find first item where cumulative probability >= r
  for (let i = 0; i < normalized.length; i++) {
    if (r <= normalized[i]) {
      return items[i];
    }
  }
  
  // Fallback to last item (shouldn't happen with proper normalization, but safety)
  return items[items.length - 1];
}










