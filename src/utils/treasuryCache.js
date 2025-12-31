/**
 * Treasury API response caching utility
 * Caches API responses in localStorage to reduce API calls and handle rate limits
 */

// Cache duration constants (in milliseconds)
// These durations ensure we rarely need to hit the API
const CACHE_DURATION = {
  WALLET_BALANCES: 4 * 60 * 1000, // 4 minutes (longer than auto-refresh interval)
  TIBETSWAP_PAIRS: 10 * 60 * 1000, // 10 minutes (pairs don't change often)
  XCH_PRICE: 15 * 60 * 1000, // 15 minutes (price updates are less critical)
}

// Cache key prefixes
const CACHE_PREFIX = 'treasury_cache_'

/**
 * Generate cache key for an endpoint
 * @param {string} endpoint - Endpoint identifier (e.g., 'wallet_balances', 'tibetswap_pairs')
 * @param {string} params - Additional parameters for uniqueness (e.g., wallet address)
 * @returns {string} Cache key
 */
function getCacheKey(endpoint, params = '') {
  const key = params ? `${endpoint}_${params}` : endpoint
  return `${CACHE_PREFIX}${key}`
}

/**
 * Get cached data if it exists and is still valid
 * @param {string} endpoint - Endpoint identifier
 * @param {string} params - Additional parameters
 * @returns {any|null} Cached data or null if not found/expired
 */
export function getCachedData(endpoint, params = '') {
  try {
    const key = getCacheKey(endpoint, params)
    const cached = localStorage.getItem(key)
    
    if (!cached) return null
    
    const parsed = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is expired
    if (parsed.timestamp + parsed.expiresIn < now) {
      localStorage.removeItem(key)
      return null
    }
    
    return parsed.data
  } catch (error) {
    console.error('Error reading cache:', error)
    return null
  }
}

/**
 * Set cached data with expiration
 * @param {string} endpoint - Endpoint identifier
 * @param {any} data - Data to cache
 * @param {number} expiresIn - Expiration time in milliseconds
 * @param {string} params - Additional parameters
 */
export function setCachedData(endpoint, data, expiresIn, params = '') {
  try {
    const key = getCacheKey(endpoint, params)
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      expiresIn,
    }
    localStorage.setItem(key, JSON.stringify(cacheEntry))
  } catch (error) {
    console.error('Error writing cache:', error)
    // If storage is full, try to clear old cache entries
    try {
      clearExpiredCache()
      localStorage.setItem(key, JSON.stringify(cacheEntry))
    } catch (retryError) {
      console.error('Failed to write cache even after cleanup:', retryError)
    }
  }
}

/**
 * Clear cached data for a specific endpoint
 * @param {string} endpoint - Endpoint identifier
 * @param {string} params - Additional parameters
 */
export function clearCachedData(endpoint, params = '') {
  try {
    const key = getCacheKey(endpoint, params)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

/**
 * Clear all treasury cache entries
 */
export function clearAllCache() {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Error clearing all cache:', error)
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache() {
  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed = JSON.parse(cached)
            if (parsed.timestamp + parsed.expiresIn < now) {
              localStorage.removeItem(key)
            }
          }
        } catch (e) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key)
        }
      }
    })
  } catch (error) {
    console.error('Error clearing expired cache:', error)
  }
}

/**
 * Cache durations for different endpoints
 */
export { CACHE_DURATION }

