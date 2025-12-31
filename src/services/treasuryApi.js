import { fetchWithRetry } from '../utils/apiRetry'
import { TIBETSWAP_API_BASE, SPACESCAN_API_BASE, COINGECKO_API_BASE, WALLET_ADDRESS } from '../utils/treasuryConstants'
import { getCachedData, setCachedData, clearCachedData, CACHE_DURATION } from '../utils/treasuryCache'
import { normalizeWalletBalances } from '../utils/treasuryNormalize'

// Use proxy in development to avoid CORS issues
const isDevelopment = import.meta.env.DEV
const getProxyBase = (baseUrl) => {
  if (!isDevelopment) return baseUrl
  
  // Map API bases to proxy paths
  if (baseUrl.includes('tibetswap.io')) {
    return '/treasury-api'
  }
  if (baseUrl.includes('spacescan.io')) {
    return '/spacescan-api'
  }
  if (baseUrl.includes('coingecko.com')) {
    return '/coingecko-api'
  }
  return baseUrl
}

/**
 * Fetch all pairs from TibetSwap API
 * @param {boolean} bypassCache - If true, bypass cache and fetch fresh data
 * @returns {Promise<Array>} Array of pair objects
 */
export async function fetchTibetSwapPairs(bypassCache = false) {
  // Check cache first
  if (!bypassCache) {
    const cached = getCachedData('tibetswap_pairs')
    if (cached) {
      return cached
    }
  }

  try {
    const apiBase = getProxyBase(TIBETSWAP_API_BASE)
    const apiUrl = `${apiBase}/pairs?limit=500`
    console.log('[Treasury] Fetching TibetSwap pairs from:', apiUrl)
    
    // Fetch pairs with pagination - start with limit of 500
    const response = await fetchWithRetry(
      apiUrl,
      {},
      {
        maxRetries: 1, // Only 1 retry - cache should prevent most failures
        timeout: 30000,
        baseDelay: 2000,
        retryStatuses: [502, 503, 504], // Don't retry on 429 - use cache instead
      }
    )

    console.log('[Treasury] TibetSwap pairs response status:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error(`TibetSwap API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[Treasury] TibetSwap raw response structure:', {
      isArray: Array.isArray(data),
      hasData: !!data.data,
      hasItems: !!data.items,
      keys: Object.keys(data || {})
    })
    
    // If API returns paginated results, we may need to fetch more
    // For now, assume limit=500 covers all pairs
    const pairs = data.data || data.items || data || []
    console.log('[Treasury] TibetSwap pairs count:', pairs.length)
    
    // Cache the result
    setCachedData('tibetswap_pairs', pairs, CACHE_DURATION.TIBETSWAP_PAIRS)
    
    return pairs
  } catch (error) {
    console.error('API Error (TibetSwap pairs):', error)
    
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      // Real rate limit → use cache
      const cached = getCachedData('tibetswap_pairs')
      if (cached) {
        console.warn('Rate limited, using cached pairs data')
        return cached
      }
      throw new Error('Rate limit hit — using cached data soon')
    }
    
    if (error.message.includes('404')) {
      throw new Error('API endpoint not found — check URL or service status')
    }
    
    if (error.message.includes('timeout')) {
      throw new Error('Request timed out. Please try again.')
    }
    if (error.message.includes('offline')) {
      throw new Error('You are offline. Please check your internet connection.')
    }
    
    throw error
  }
}

/**
 * Fetch wallet balances (XCH and CAT tokens) from Spacescan.io
 * @param {string} address - Chia wallet address
 * @param {boolean} bypassCache - If true, bypass cache and fetch fresh data
 * @returns {Promise<Object>} Normalized balance data: { xch: { amount_mojos, amount_xch }, cats: [...], raw }
 */
export async function fetchWalletBalances(address, bypassCache = false) {
  // Check cache first
  if (!bypassCache) {
    const cached = getCachedData('wallet_balances', address)
    if (cached) {
      if (isDevelopment) {
        console.log('[Treasury] Using cached wallet data')
      }
      return cached
    }
  }

  // Define endpoints to try in order
  // In development, use local Vite proxies
  // In production, use Cloudflare function which has its own fallbacks
  const endpoints = isDevelopment
    ? [
        `/xchscan-api/address/${address}`, // PRIMARY - XCHScan via Vite proxy
        `/spacescan-api/1/xch/address/balance/${address}`, // FALLBACK - Spacescan api2 via Vite proxy
        `/api/wallet-balances?address=${encodeURIComponent(address)}`, // Cloudflare function as final fallback
      ]
    : [
        `/api/wallet-balances?address=${encodeURIComponent(address)}`, // Cloudflare function (has its own fallbacks)
      ]
  
  const triedEndpoints = []
  let successfulData = null

  // Try each endpoint until one succeeds
  for (const endpoint of endpoints) {
    try {
      if (isDevelopment) {
        console.log(`[Treasury] Trying endpoint: ${endpoint}`)
      }
      
      const response = await fetchWithRetry(
        endpoint,
        {},
        {
          maxRetries: 0, // Don't retry - we'll try next endpoint instead
          timeout: 10000,
          baseDelay: 1000,
          retryStatuses: [], // Don't retry - try next endpoint
        }
      )
      
      // Track this attempt
      const attemptInfo = {
        endpoint: endpoint,
        status: response.status,
        statusText: response.statusText,
      }
      triedEndpoints.push(attemptInfo)

      // Success!
      if (response.ok) {
        // Try to parse JSON response
        let data
        try {
          data = await response.json()
        } catch (parseError) {
          attemptInfo.error = `Invalid JSON: ${parseError.message}`
          continue // Try next endpoint
        }
        
        // Check if the proxy returned an error response (from our function)
        if (data.success === false || (data.error && data.lastStatus)) {
          // This is an error response from our proxy function
          attemptInfo.error = data.error || 'Proxy returned error'
          attemptInfo.status = data.lastStatus || response.status
          
          // If rate limited, continue to next endpoint (don't stop)
          if (data.lastStatus === 429 || (data.tried && data.tried.some(e => e.status === 429))) {
            if (isDevelopment) {
              console.log(`[Treasury] ⏸️ Rate limited: ${endpoint}`)
            }
            continue // Try next endpoint
          }
          
          // Other error from proxy, continue to next endpoint
          if (isDevelopment) {
            console.log(`[Treasury] ❌ Failed: ${endpoint} (${data.lastStatus || response.status})`)
          }
          continue
        }
        
        // Success! We got valid data
        if (isDevelopment) {
          console.log(`[Treasury] ✅ Success from: ${endpoint}`)
        }
        
        successfulData = data
        break // Exit loop, we have data
      }
      
      // Rate limited - try next endpoint (don't stop)
      if (response.status === 429) {
        attemptInfo.error = 'Rate Limited'
        if (isDevelopment) {
          console.log(`[Treasury] ⏸️ Rate limited: ${endpoint}`)
        }
        // Wait 1 second before trying next endpoint (be nice to APIs)
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue // Try next endpoint
      }
      
      // Server errors (500+) - wait then try next endpoint
      if (response.status >= 500) {
        attemptInfo.error = `${response.status}: ${response.statusText}`
        if (isDevelopment) {
          console.log(`[Treasury] ❌ Server error: ${endpoint} (${response.status})`)
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue // Try next endpoint
      }
      
      // Other error - try next endpoint
      attemptInfo.error = `${response.status}: ${response.statusText}`
      if (isDevelopment) {
        console.log(`[Treasury] ❌ Failed: ${endpoint} (${response.status})`)
      }
      continue // Try next endpoint
      
    } catch (err) {
      // Network or fetch error
      triedEndpoints.push({
        endpoint: endpoint,
        status: null,
        statusText: null,
        error: err.message || 'Network error'
      })
      if (isDevelopment) {
        console.error(`[Treasury] ❌ Network error: ${endpoint}`, err)
      }
      continue // Try next endpoint
    }
  }

  // If we got successful data, normalize and cache it
  if (successfulData) {
    // Normalize the response using the helper function
    const normalized = normalizeWalletBalances(successfulData)
    
    if (isDevelopment) {
      console.log('[Treasury] Normalized balances:', {
        xch_xch: normalized.xch.amount_xch,
        cats_count: normalized.cats.length,
      })
    }
    
    // Cache the normalized result
    setCachedData('wallet_balances', normalized, CACHE_DURATION.WALLET_BALANCES, address)
    
    return normalized
  }

  // All endpoints failed - check cache one more time before throwing
  const cached = getCachedData('wallet_balances', address)
  if (cached) {
    if (isDevelopment) {
      console.warn('[Treasury] All endpoints failed, using cached wallet balances')
    }
    return cached
  }

  // All endpoints failed and no cache - throw structured error
  const allRateLimited = triedEndpoints.length > 0 && triedEndpoints.every(e => e.status === 429)
  const errorWithContext = {
    message: 'All API endpoints failed',
    endpoint: 'Multiple endpoints tried',
    status: allRateLimited ? 429 : null,
    triedEndpoints: triedEndpoints,
    hint: allRateLimited
      ? 'All endpoints rate limited. Wait 5-10 minutes and try again.'
      : 'API may be down. Check https://spacescan.io status.'
  }
  throw new Error(JSON.stringify(errorWithContext))
}

/**
 * Fetch XCH/USD price from CoinGecko
 * @param {boolean} bypassCache - If true, bypass cache and fetch fresh data
 * @returns {Promise<number>} XCH price in USD
 */
export async function fetchXCHPrice(bypassCache = false) {
  // Check cache first
  if (!bypassCache) {
    const cached = getCachedData('xch_price')
    if (cached !== null) {
      return cached
    }
  }

  try {
    // COINGECKO_API_BASE already includes /api/v3, so handle proxy path correctly
    let apiUrl
    if (isDevelopment) {
      // In development, use proxy - remove the base URL and use proxy path
      apiUrl = `/coingecko-api/api/v3/simple/price?ids=chia&vs_currencies=usd`
    } else {
      apiUrl = `${COINGECKO_API_BASE}/simple/price?ids=chia&vs_currencies=usd`
    }
    
    console.log('[Treasury] Fetching XCH price from:', apiUrl)
    
    const response = await fetchWithRetry(
      apiUrl,
      {},
      {
        maxRetries: 1, // Only 1 retry - cache should prevent most failures
        timeout: 10000,
        baseDelay: 2000,
        retryStatuses: [502, 503, 504], // Don't retry on 429 - use cache instead
      }
    )

    console.log('[Treasury] CoinGecko price response status:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[Treasury] CoinGecko raw response:', JSON.stringify(data, null, 2))
    
    // CoinGecko returns: { chia: { usd: 123.45 } }
    const price = data.chia?.usd || 0
    console.log('[Treasury] Parsed XCH price:', price)
    
    // Cache the result
    setCachedData('xch_price', price, CACHE_DURATION.XCH_PRICE)
    
    return price
  } catch (error) {
    console.error('API Error (XCH price):', error)
    
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      // Real rate limit → use cache
      const cached = getCachedData('xch_price')
      if (cached !== null) {
        console.warn('Rate limited, using cached XCH price')
        return cached
      }
      console.warn('Rate limited and no cache available, using 0 for USD calculations')
      return 0
    }
    
    if (error.message.includes('404')) {
      // For price, return cached value or 0 rather than throwing
      const cached = getCachedData('xch_price')
      if (cached !== null) {
        console.warn('Price API endpoint not found, using cached value')
        return cached
      }
      console.warn('Price API endpoint not found, using 0 for USD calculations')
      return 0
    }
    
    if (error.message.includes('timeout')) {
      // Try cached value on timeout
      const cached = getCachedData('xch_price')
      if (cached !== null) {
        console.warn('Price request timed out, using cached value')
        return cached
      }
      return 0
    }
    if (error.message.includes('offline')) {
      // Try cached value when offline
      const cached = getCachedData('xch_price')
      if (cached !== null) {
        console.warn('Offline, using cached XCH price')
        return cached
      }
      return 0
    }
    
    // Other errors: try cached value
    const cached = getCachedData('xch_price')
    if (cached !== null) {
      console.warn('XCH price fetch failed, using cached value')
      return cached
    }
    console.warn('XCH price unavailable, using 0 for USD calculations')
    return 0
  }
}

