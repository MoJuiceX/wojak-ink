# Treasury Feature - Complete Code and Problem Analysis

## Overview: What is the Treasury Feature?

The Treasury is a React component that displays real-time portfolio value for a Chia blockchain wallet. It shows:

1. **Liquidity Provider (LP) Positions** - Tracks LP token holdings in TibetSwap (Chia's AMM)
2. **Raw CAT Token Holdings** - Displays balances for 12 specific CAT tokens
3. **XCH Balance** - Shows native Chia (XCH) balance
4. **Total Portfolio Value** - Calculates total value in both XCH and USD

The component fetches data from three external APIs:
- **TibetSwap API** (`api.v2.tibetswap.io`) - For trading pair information and LP data
- **Spacescan.io API** (`api.spacescan.io`) - For wallet balances (XCH and CAT tokens)
- **CoinGecko API** (`api.coingecko.com`) - For XCH/USD price conversion

The feature includes:
- Auto-refresh every 5 minutes
- Manual refresh button
- localStorage caching to reduce API calls
- Rate limit error handling with countdown timer
- Windows 98-style UI with animated coin background

---

## Current Problem: Rate Limit Errors (429)

**Observed Error:**
```
Failed to load resource: the server responded with a status of 429 (Too Many Requests)
Failed to fetch wallet balances: Error: HTTP 429: Too Many Requests
Rate limit exceeded. Please wait a moment and try again.
```

**Expected Behavior:**
- Caching should prevent most API calls
- Only fetch fresh data every 5 minutes (auto-refresh) or on manual refresh
- Cache durations are: 4min (balances), 10min (pairs), 15min (price)
- Should never hit rate limits with this usage pattern

---

## Root Cause Thesis

### Primary Hypothesis:
**The cache is not being checked/used properly on the first API call, OR the proxy routes are causing the requests to fail before cache can be utilized.**

### Supporting Evidence:

1. **404 Error Before 429:** The console shows a 404 error for the Spacescan API proxy path, then a 429 error. This suggests:
   - The Vite proxy might not be routing correctly
   - The proxy path `/spacescan-api/v0.1/xch/balances/address/...` might be incorrectly formatted
   - The API call is reaching the proxy but the proxy can't forward it correctly

2. **Cache Check Logic:**
   - Cache is checked at the START of each API function
   - But if cache is empty (first load), it makes the API call
   - If that API call fails with 429, it tries to fall back to cache
   - But if cache was empty to begin with, the fallback fails too

3. **Parallel API Calls:**
   - All three APIs are called in parallel with `Promise.all`
   - If one fails (429), the whole Promise.all fails
   - Cache fallback only happens in the catch block, not before Promise.all

4. **Window Opening Behavior:**
   - When window opens, `fetchTreasuryData(false)` is called immediately
   - If no cache exists, all 3 APIs are called immediately
   - If user opens/closes/opens window quickly, multiple API calls happen

5. **Proxy Path Construction:**
   - The proxy uses `/spacescan-api/v0.1/...` 
   - But `SPACESCAN_API_BASE` already includes `/v0.1`
   - This might cause path duplication or incorrect routing

---

## All Code Files

### 1. Main Component: `src/components/windows/TreasuryWindow.jsx`

```javascript
import Window from './Window'
import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchTibetSwapPairs, fetchWalletBalances, fetchXCHPrice } from '../../services/treasuryApi'
import { WALLET_ADDRESS, CAT_TOKENS, XCH_DECIMALS } from '../../utils/treasuryConstants'
import {
  formatAmount,
  calculateLPValue,
  calculateTokenPrice,
  calculateTotalPortfolioValue,
  formatNumber,
  formatCurrency,
} from '../../utils/treasuryCalculations'
import LoadingSpinner from '../ui/LoadingSpinner'
import TreasuryAnimation from './TreasuryAnimation'
import RateLimitError from './RateLimitError'
import { clearAllCache } from '../../utils/treasuryCache'
import '../../styles/treasury.css'

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MIN_REQUEST_INTERVAL = 3000 // 3 seconds minimum between requests (prevent rapid clicks)

export default function TreasuryWindow({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [treasuryData, setTreasuryData] = useState(null)
  const [xchPriceUSD, setXchPriceUSD] = useState(0)
  const [isRateLimitError, setIsRateLimitError] = useState(false)
  const lastRequestTimeRef = useRef(0)
  const refreshTimeoutRef = useRef(null)

  const fetchTreasuryData = useCallback(async (bypassCache = false) => {
    // Enforce minimum interval between requests (prevent rapid clicks)
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && lastRequestTimeRef.current > 0) {
      // Too soon since last request, skip this request
      console.log('Request skipped - too soon since last request')
      return
    }
    
    lastRequestTimeRef.current = Date.now()
    
    setLoading(true)
    setError(null)
    setIsRateLimitError(false)

    try {
      // Fetch all data in parallel (with cache bypass option)
      const [pairs, balances, price] = await Promise.all([
        fetchTibetSwapPairs(bypassCache),
        fetchWalletBalances(WALLET_ADDRESS, bypassCache),
        fetchXCHPrice(bypassCache),
      ])

      // ... data processing code ...
      
    } catch (err) {
      console.error('Failed to fetch treasury data:', err)
      const errorMessage = err.message || 'Failed to load treasury data'
      setError(errorMessage)
      
      // Check if this is a rate limit error
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        setIsRateLimitError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced refresh handler
  const handleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    clearAllCache()
    refreshTimeoutRef.current = setTimeout(() => {
      fetchTreasuryData(true) // bypassCache = true for manual refresh
    }, 300) // 300ms debounce
  }, [fetchTreasuryData])

  // Handle retry from rate limit error
  const handleRetry = useCallback(() => {
    clearAllCache()
    fetchTreasuryData(true) // bypassCache = true when retrying after rate limit
  }, [fetchTreasuryData])

  // Fetch data on mount and when window opens (cache will be used if available)
  useEffect(() => {
    if (isOpen) {
      fetchTreasuryData(false)
      
      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }
      }
    } else {
      setIsRateLimitError(false)
      setError(null)
    }
  }, [isOpen, fetchTreasuryData])

  // Auto-refresh every 5 minutes (don't bypass cache for auto-refresh)
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      if (!loading && !error) {
        fetchTreasuryData(false) // Use cache for auto-refresh
      }
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [isOpen, fetchTreasuryData, loading, error])

  // ... render code ...
}
```

### 2. API Service: `src/services/treasuryApi.js`

```javascript
import { fetchWithRetry } from '../utils/apiRetry'
import { TIBETSWAP_API_BASE, SPACESCAN_API_BASE, COINGECKO_API_BASE, WALLET_ADDRESS } from '../utils/treasuryConstants'
import { getCachedData, setCachedData, clearCachedData, CACHE_DURATION } from '../utils/treasuryCache'

// Use proxy in development to avoid CORS issues
const isDevelopment = import.meta.env.DEV
const getProxyBase = (baseUrl) => {
  if (!isDevelopment) return baseUrl
  
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
    const response = await fetchWithRetry(
      `${apiBase}/pairs?limit=500`,
      {},
      {
        maxRetries: 1,
        timeout: 15000,
        baseDelay: 2000,
        retryStatuses: [502, 503, 504], // Don't retry on 429 - use cache instead
      }
    )

    if (!response.ok) {
      throw new Error(`TibetSwap API error: ${response.status}`)
    }

    const data = await response.json()
    const pairs = data.data || data.items || data || []
    
    setCachedData('tibetswap_pairs', pairs, CACHE_DURATION.TIBETSWAP_PAIRS)
    return pairs
  } catch (error) {
    console.error('Failed to fetch TibetSwap pairs:', error)
    
    if (error.message.includes('429') || error.message.includes('Rate limit')) {
      const cached = getCachedData('tibetswap_pairs')
      if (cached) {
        console.warn('Rate limited, using cached pairs data')
        return cached
      }
      throw new Error('Rate limit exceeded. Please wait a moment and try again.')
    }
    
    throw error
  }
}

export async function fetchWalletBalances(address, bypassCache = false) {
  // Check cache first
  if (!bypassCache) {
    const cached = getCachedData('wallet_balances', address)
    if (cached) {
      return cached
    }
  }

  try {
    let apiUrl
    if (isDevelopment) {
      apiUrl = `/spacescan-api/v0.1/xch/balances/address/${address}`
    } else {
      apiUrl = `${SPACESCAN_API_BASE}/xch/balances/address/${address}`
    }
    
    const response = await fetchWithRetry(
      apiUrl,
      {},
      {
        maxRetries: 1,
        timeout: 15000,
        baseDelay: 2000,
        retryStatuses: [502, 503, 504], // Don't retry on 429 - use cache instead
      }
    )

    if (!response.ok) {
      throw new Error(`Spacescan API error: ${response.status}`)
    }

    const data = await response.json()
    const balances = {
      xchBalance: data.xch_balance || data.xchBalance || '0',
      catBalances: data.cat_balances || data.catBalances || [],
    }
    
    setCachedData('wallet_balances', balances, CACHE_DURATION.WALLET_BALANCES, address)
    return balances
  } catch (error) {
    console.error('Failed to fetch wallet balances:', error)
    
    if (error.message.includes('429') || error.message.includes('Rate limit')) {
      const cached = getCachedData('wallet_balances', address)
      if (cached) {
        console.warn('Rate limited, using cached wallet balances')
        return cached
      }
      throw new Error('Rate limit exceeded. Please wait a moment and try again.')
    }
    
    throw error
  }
}

export async function fetchXCHPrice(bypassCache = false) {
  // Check cache first
  if (!bypassCache) {
    const cached = getCachedData('xch_price')
    if (cached !== null) {
      return cached
    }
  }

  try {
    let apiUrl
    if (isDevelopment) {
      apiUrl = `/coingecko-api/api/v3/simple/price?ids=chia&vs_currencies=usd`
    } else {
      apiUrl = `${COINGECKO_API_BASE}/simple/price?ids=chia&vs_currencies=usd`
    }
    
    const response = await fetchWithRetry(
      apiUrl,
      {},
      {
        maxRetries: 1,
        timeout: 10000,
        baseDelay: 2000,
        retryStatuses: [502, 503, 504], // Don't retry on 429 - use cache instead
      }
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    const price = data.chia?.usd || 0
    
    setCachedData('xch_price', price, CACHE_DURATION.XCH_PRICE)
    return price
  } catch (error) {
    console.error('Failed to fetch XCH price:', error)
    
    if (error.message.includes('429') || error.message.includes('Rate limit')) {
      const cached = getCachedData('xch_price')
      if (cached !== null) {
        console.warn('Rate limited, using cached XCH price')
        return cached
      }
      console.warn('Rate limited and no cache available, using 0 for USD calculations')
      return 0
    }
    
    // Return 0 if price fetch fails - we can still show XCH values
    const cached = getCachedData('xch_price')
    if (cached !== null) {
      console.warn('XCH price fetch failed, using cached value')
      return cached
    }
    console.warn('XCH price unavailable, using 0 for USD calculations')
    return 0
  }
}
```

### 3. Cache Utility: `src/utils/treasuryCache.js`

```javascript
const CACHE_DURATION = {
  WALLET_BALANCES: 4 * 60 * 1000, // 4 minutes
  TIBETSWAP_PAIRS: 10 * 60 * 1000, // 10 minutes
  XCH_PRICE: 15 * 60 * 1000, // 15 minutes
}

const CACHE_PREFIX = 'treasury_cache_'

function getCacheKey(endpoint, params = '') {
  const key = params ? `${endpoint}_${params}` : endpoint
  return `${CACHE_PREFIX}${key}`
}

export function getCachedData(endpoint, params = '') {
  try {
    const key = getCacheKey(endpoint, params)
    const cached = localStorage.getItem(key)
    
    if (!cached) return null
    
    const parsed = JSON.parse(cached)
    const now = Date.now()
    
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
    try {
      clearExpiredCache()
      localStorage.setItem(key, JSON.stringify(cacheEntry))
    } catch (retryError) {
      console.error('Failed to write cache even after cleanup:', retryError)
    }
  }
}

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
```

### 4. Retry Utility: `src/utils/apiRetry.js`

```javascript
export async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const {
    maxRetries = 3,
    timeout = 10000,
    baseDelay = 1000,
    retryStatuses = [429, 502, 503, 504]
  } = retryConfig

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Network request failed: You are offline')
  }

  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
      })

      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ])

      if (retryStatuses.includes(response.status)) {
        const retryAfter = response.headers.get('Retry-After')
        let delay = baseDelay * Math.pow(2, attempt)

        if (response.status === 429) {
          const rateLimitDelays = [5000, 10000, 20000]
          delay = rateLimitDelays[Math.min(attempt, rateLimitDelays.length - 1)]
          delay = Math.min(delay, 60000)
        }

        if (retryAfter) {
          delay = Math.min(parseInt(retryAfter, 10) * 1000, 60000)
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }

      if (!response.ok && !retryStatuses.includes(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response

    } catch (error) {
      lastError = error

      if (error.message.includes('timeout') || error.message.includes('offline')) {
        throw error
      }

      if (attempt >= maxRetries) {
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Request failed after all retries')
}
```

### 5. Constants: `src/utils/treasuryConstants.js`

```javascript
export const WALLET_ADDRESS = 'xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk'

export const TIBETSWAP_API_BASE = 'https://api.v2.tibetswap.io'
export const SPACESCAN_API_BASE = 'https://api.spacescan.io/v0.1'
export const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

export const XCH_DECIMALS = 12

export const CAT_TOKENS = [
  // ... 12 CAT tokens defined ...
]
```

### 6. Vite Proxy Config: `vite.config.js`

```javascript
proxy: {
  '/treasury-api': {
    target: 'https://api.v2.tibetswap.io',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/treasury-api/, ''),
  },
  '/spacescan-api': {
    target: 'https://api.spacescan.io',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/spacescan-api/, ''),
  },
  '/coingecko-api': {
    target: 'https://api.coingecko.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/coingecko-api/, ''),
  },
}
```

---

## Identified Problems

### Problem 1: Proxy Path Construction Bug

**Location:** `src/services/treasuryApi.js` - `fetchWalletBalances()`

**Issue:**
```javascript
if (isDevelopment) {
  apiUrl = `/spacescan-api/v0.1/xch/balances/address/${address}`
} else {
  apiUrl = `${SPACESCAN_API_BASE}/xch/balances/address/${address}`
}
```

The proxy path includes `/v0.1` but the proxy rewrite removes `/spacescan-api`, resulting in:
- Request: `/spacescan-api/v0.1/xch/balances/address/...`
- After rewrite: `/v0.1/xch/balances/address/...`
- Target: `https://api.spacescan.io`
- Final URL: `https://api.spacescan.io/v0.1/xch/balances/address/...`

But `SPACESCAN_API_BASE` already includes `/v0.1`, so the correct URL should be:
`https://api.spacescan.io/v0.1/xch/balances/address/...`

However, the proxy target is `https://api.spacescan.io` (without `/v0.1`), so the path should be:
`/v0.1/xch/balances/address/...`

**The bug:** The proxy path construction is correct, but if the proxy isn't working, the request goes directly to the API and fails with CORS or 429.

### Problem 2: Cache Not Populated on First Load

**Issue:** When the window opens for the first time, cache is empty, so all 3 APIs are called immediately. If any API returns 429, the cache fallback can't help because cache was empty.

**Solution Needed:** Need to check if this is the very first load and handle it gracefully, OR ensure cache is pre-populated, OR show cached data from a previous session.

### Problem 3: Promise.all Fails Entirely

**Location:** `src/components/windows/TreasuryWindow.jsx`

**Issue:**
```javascript
const [pairs, balances, price] = await Promise.all([
  fetchTibetSwapPairs(bypassCache),
  fetchWalletBalances(WALLET_ADDRESS, bypassCache),
  fetchXCHPrice(bypassCache),
])
```

If one API fails with 429, the entire Promise.all fails. The individual catch blocks in each API function try to use cache, but if Promise.all fails, we never get to use the cache fallback.

**Solution Needed:** Use `Promise.allSettled` instead, or catch errors individually and use cache for failed requests.

### Problem 4: Rate Limit Error Detection

**Issue:** The error message check `error.message.includes('429')` might not catch all 429 errors. The fetchWithRetry function throws `HTTP 429: Too Many Requests`, which should be caught, but the check happens after Promise.all fails.

### Problem 5: No Graceful Degradation

**Issue:** If one API fails, the entire component shows an error. There's no partial data display. If pairs and price load but balances fail, we could still show LP positions with "balance unavailable".

---

## Recommended Solutions

### Solution 1: Fix Proxy Path (CRITICAL)

Verify the proxy is actually routing requests. The 404 error suggests the proxy might not be working. Check:
1. Is Vite dev server running?
2. Are proxy routes correctly configured?
3. Is the proxy actually forwarding requests?

### Solution 2: Use Promise.allSettled

Change `Promise.all` to `Promise.allSettled` to handle partial failures gracefully:

```javascript
const results = await Promise.allSettled([
  fetchTibetSwapPairs(bypassCache),
  fetchWalletBalances(WALLET_ADDRESS, bypassCache),
  fetchXCHPrice(bypassCache),
])

const pairs = results[0].status === 'fulfilled' ? results[0].value : null
const balances = results[1].status === 'fulfilled' ? results[1].value : null
const price = results[2].status === 'fulfilled' ? results[2].value : 0

// Use cache for failed requests
if (!pairs) {
  pairs = getCachedData('tibetswap_pairs') || []
}
if (!balances) {
  balances = getCachedData('wallet_balances', WALLET_ADDRESS) || { xchBalance: '0', catBalances: [] }
}
if (!price) {
  price = getCachedData('xch_price') || 0
}
```

### Solution 3: Pre-check Cache Before API Calls

Before making any API calls, check if ALL required data is in cache. If yes, use cache entirely. Only make API calls for missing data.

### Solution 4: Add Request Debouncing at Component Level

Prevent multiple rapid window opens from triggering multiple API calls. Use a global flag or debounce the `fetchTreasuryData` function more aggressively.

### Solution 5: Graceful Error Handling

Show partial data if some APIs succeed. Don't show error UI if we have cached data to display.

---

## Testing Checklist

1. [ ] Verify proxy routes are working (check Network tab in DevTools)
2. [ ] Test with empty cache (first load)
3. [ ] Test with populated cache (subsequent loads)
4. [ ] Test rapid window open/close
5. [ ] Test manual refresh button
6. [ ] Test auto-refresh after 5 minutes
7. [ ] Test with network offline
8. [ ] Test with one API failing (should show partial data)
9. [ ] Verify cache expiration times
10. [ ] Check localStorage for cache entries

---

## Additional Notes

- The cache durations are longer than the auto-refresh interval, which is good
- The retry logic excludes 429 from retries, which is correct
- The error UI shows a countdown timer, which is good UX
- The proxy is only used in development, production uses direct API calls

The main issue is likely that the proxy isn't working correctly, OR the first API call happens before cache can help, OR multiple rapid calls are happening despite the debouncing.

