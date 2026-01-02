/**
 * Cloudflare Pages Function: Live Offers Proxy
 * 
 * Proxies MintGarden API to fetch live offers with server-side caching.
 * Implements "very slow" API usage policy: 1-hour cache, manual refresh with 60s cooldown.
 * 
 * Endpoint: /api/offers?force=1&ts=timestamp
 * 
 * Cache Strategy:
 * - Normal requests: offers:normal (TTL 3600s)
 * - Forced requests: offers:forced (TTL 60s)
 * - One-flight lock prevents parallel upstream fetches
 */

const SERVER_CACHE_TTL_S = 3600  // 1 hour
const MANUAL_REFRESH_COOLDOWN_S = 60  // 1 minute minimum between forced refreshes

// Configuration (from env or constants)
const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'
const TOKEN_ID = 'xch'
const API_BASE = `https://api.mintgarden.io/collections/${COLLECTION_ID}/nfts/by_offers`

// One-flight lock (best-effort, resets on cold start)
let fetchPromise = null

// Fetch with retry logic
async function fetchWithRetry(url, maxRetries = 5) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      
      if (response.status === 429 || response.status === 503 || response.status === 504) {
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries - 1) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 5000)
        await new Promise(resolve => setTimeout(resolve, backoff))
      }
    }
  }
  throw lastError || new Error('Failed to fetch after retries')
}

// Extract launcher_bech32 from MintGarden item
function extractLauncher(item) {
  if (item.encoded_id && typeof item.encoded_id === 'string' && item.encoded_id.startsWith('nft1')) {
    return item.encoded_id
  }
  if (item.encodedId && typeof item.encodedId === 'string' && item.encodedId.startsWith('nft1')) {
    return item.encodedId
  }
  if (item.launcher_bech32 && typeof item.launcher_bech32 === 'string' && item.launcher_bech32.startsWith('nft1')) {
    return item.launcher_bech32
  }
  if (item.launcherBech32 && typeof item.launcherBech32 === 'string' && item.launcherBech32.startsWith('nft1')) {
    return item.launcherBech32
  }
  if (item.id && typeof item.id === 'string' && item.id.startsWith('nft1')) {
    return item.id
  }
  return null
}

// Extract raw price from item
function extractRawPrice(item) {
  if (item.xch_price !== undefined && item.xch_price !== null) {
    return item.xch_price
  }
  if (item.price?.xch_price !== undefined && item.price.xch_price !== null) {
    return item.price.xch_price
  }
  if (item.price !== undefined && item.price !== null) {
    return item.price
  }
  if (item.amount !== undefined && item.amount !== null) {
    return item.amount
  }
  if (item.listing_price !== undefined && item.listing_price !== null) {
    return item.listing_price
  }
  return null
}

// Normalize price_xch (deterministic)
function normalizePrice(raw) {
  if (raw === null || raw === undefined || isNaN(raw)) return null
  
  const rawNum = typeof raw === 'number' ? raw : parseFloat(raw)
  if (isNaN(rawNum)) return null
  
  // If integer AND >= 1e9, treat as mojos
  if (Number.isInteger(rawNum) && rawNum >= 1e9) {
    return rawNum / 1e12
  }
  
  // Otherwise treat as XCH
  return rawNum
}

// Compute percentiles from sorted array
function computePercentiles(sortedPrices, percentiles) {
  if (sortedPrices.length === 0) return {}
  const result = {}
  for (const p of percentiles) {
    const index = Math.floor((p / 100) * (sortedPrices.length - 1))
    result[`p${p}`] = sortedPrices[index]
  }
  return result
}

// Fetch offers from MintGarden (optimized: only first page for floor price)
// MintGarden returns offers sorted by price (lowest first), so first item = floor price
async function fetchAllOffers(reverseMap) {
  const listingsById = {}
  let totalItemsFetched = 0
  
  // Fetch only the first page - floor price is always the first item
  const url = `${API_BASE}?token_id=${TOKEN_ID}&size=100`
  console.log('[Offers API] Fetching first page only (floor price is first item)...')
  
  const response = await fetchWithRetry(url)
  const items = response.items || []
  
  if (items.length === 0) {
    console.log('[Offers API] No items found in first page')
    return { listingsById, totalItemsFetched }
  }
  
  totalItemsFetched = items.length
  let floorPrice = null
  let floorItem = null
  
  // Process items to build listings map
  for (const item of items) {
    const launcher = extractLauncher(item)
    if (!launcher) continue
    
    const rawPrice = extractRawPrice(item)
    if (rawPrice === null) continue
    
    const priceXch = normalizePrice(rawPrice)
    if (priceXch === null || priceXch <= 0) continue
    
    // Track floor price (first valid price = floor, since sorted by price)
    if (floorPrice === null) {
      floorPrice = priceXch
      floorItem = item
      console.log(`[Offers API] Floor price found: ${floorPrice} XCH (first item)`)
    }
    
    // Map launcher to internal ID
    const internalId = reverseMap[launcher]
    if (!internalId) continue
    
    // Create listing object
    const nowIso = new Date().toISOString()
    const listing = {
      price_xch: priceXch,
      timestamp: item.updated_at || item.data?.updated_at || nowIso,
      updated_at: item.updated_at || item.data?.updated_at || nowIso
    }
    
    // Add to listings for this ID
    if (!listingsById[internalId]) {
      listingsById[internalId] = {
        best_listing: null
      }
    }
    
    // Update best_listing (lowest price)
    if (!listingsById[internalId].best_listing || 
        listing.price_xch < listingsById[internalId].best_listing.price_xch) {
      listingsById[internalId].best_listing = listing
    }
  }
  
  console.log(`[Offers API] Processed ${totalItemsFetched} items from first page, floor: ${floorPrice} XCH`)
  
  return { listingsById, totalItemsFetched }
}

// Normalize response to match mintgarden_offers_index_v1.json schema
function normalizeResponse(listingsById, collectionId) {
  // Compute floor
  let floorXch = null
  let floorId = null
  
  for (const [id, data] of Object.entries(listingsById)) {
    if (data.best_listing && data.best_listing.price_xch) {
      if (floorXch === null || data.best_listing.price_xch < floorXch) {
        floorXch = data.best_listing.price_xch
        floorId = id
      }
    }
  }
  
  // Compute market_stats
  const prices = []
  for (const [id, data] of Object.entries(listingsById)) {
    if (data.best_listing && data.best_listing.price_xch) {
      prices.push(data.best_listing.price_xch)
    }
  }
  
  let marketStats = {
    floor_xch: floorXch,
    listed_count: prices.length,
    median_xch: null,
    p10_xch: null,
    p90_xch: null
  }
  
  if (prices.length > 0) {
    const sortedPrices = [...prices].sort((a, b) => a - b)
    const percentiles = computePercentiles(sortedPrices, [10, 50, 90])
    marketStats.median_xch = percentiles.p50 || null
    marketStats.p10_xch = percentiles.p10 || null
    marketStats.p90_xch = percentiles.p90 || null
  }
  
  // Debug logging for floor price calculation
  console.log(`[Offers API] Floor price calculated: ${floorXch} XCH`)
  console.log(`[Offers API] Floor NFT ID: ${floorId}`)
  console.log(`[Offers API] Total listings: ${Object.keys(listingsById).length}`)
  if (floorXch !== null) {
    // Log all prices to see what we're comparing
    const allPrices = []
    for (const [id, data] of Object.entries(listingsById)) {
      if (data.best_listing && data.best_listing.price_xch) {
        allPrices.push({ id, price: data.best_listing.price_xch })
      }
    }
    allPrices.sort((a, b) => a.price - b.price)
    console.log(`[Offers API] Top 5 lowest prices:`, allPrices.slice(0, 5))
  }
  
  return {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    collection_id: collectionId,
    floor_xch: floorXch,
    floor_id: floorId,
    count: Object.keys(listingsById).length,
    market_stats: marketStats,
    listings_by_id: listingsById
  }
}

// Load launcher map reverse lookup (from public asset)
async function loadReverseMap(request) {
  try {
    // Construct URL to launcher map asset
    const url = new URL(request.url)
    const origin = url.origin
    const launcherMapUrl = `${origin}/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json`
    
    const response = await fetch(launcherMapUrl)
    if (!response.ok) {
      // Fallback to legacy filename
      const legacyUrl = `${origin}/assets/BigPulp/mintgarden_launcher_map_v1.json`
      const legacyResponse = await fetch(legacyUrl)
      if (!legacyResponse.ok) {
        throw new Error(`Failed to fetch launcher map: ${legacyResponse.status}`)
      }
      const data = await legacyResponse.json()
      if (!data.map) {
        throw new Error('Launcher map has no map field')
      }
      // Build reverse map
      const reverseMap = {}
      for (const [id, launcher] of Object.entries(data.map)) {
        reverseMap[launcher] = id
      }
      return reverseMap
    }
    
    const data = await response.json()
    if (!data.map) {
      throw new Error('Launcher map has no map field')
    }
    
    // Build reverse map from map (id -> launcher)
    const reverseMap = {}
    for (const [id, launcher] of Object.entries(data.map)) {
      reverseMap[launcher] = id
    }
    
    return reverseMap
  } catch (err) {
    console.error('[Offers API] Could not load launcher map:', err.message)
    throw err
  }
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'
  
  // Build clean cache key URL (no query params)
  const cacheKeyUrl = new URL(request.url)
  cacheKeyUrl.search = ''  // Remove all query params
  cacheKeyUrl.pathname = force ? '/__cache/offers/forced' : '/__cache/offers/normal'
  const cacheRequest = new Request(cacheKeyUrl.toString(), { method: 'GET' })
  
  // Check cache first
  const cached = await caches.default.match(cacheRequest)
  if (cached) {
    console.log(`[Offers API] Cache hit (${force ? 'forced' : 'normal'})`)
    // Clone response to add cache status headers
    const headers = new Headers(cached.headers)
    headers.set('X-Offers-Cache', 'HIT')
    headers.set('X-Offers-Key', force ? 'forced' : 'normal')
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: headers
    })
  }
  
  // One-flight lock: if fetch in progress, await it
  if (fetchPromise) {
    console.log('[Offers API] One-flight lock: awaiting existing fetch')
    try {
      const { payloadText, generatedAt } = await fetchPromise
      
      // CRITICAL: If this is a forced request during a normal fetchPromise,
      // we must seed the forced cache key to maintain cooldown protection
      if (force) {
        const forcedKeyUrl = new URL(request.url)
        forcedKeyUrl.search = ''
        forcedKeyUrl.pathname = '/__cache/offers/forced'
        const forcedCacheRequest = new Request(forcedKeyUrl.toString(), { method: 'GET' })
        
        const responseForced = new Response(payloadText, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': `public, max-age=0, s-maxage=${MANUAL_REFRESH_COOLDOWN_S}`,
            'X-Offers-Generated-At': generatedAt,
            'X-Cache-Mode': 'forced',
            'X-Offers-Cache': 'MISS',
            'X-Offers-Key': 'forced'
          }
        })
        
        // Seed forced cache so cooldown protection works under concurrency
        context.waitUntil(caches.default.put(forcedCacheRequest, responseForced.clone()))
        
        return responseForced
      } else {
        // Normal request: return normal response
        return new Response(payloadText, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': `public, max-age=0, s-maxage=${SERVER_CACHE_TTL_S}`,
            'X-Offers-Generated-At': generatedAt,
            'X-Cache-Mode': 'normal',
            'X-Offers-Cache': 'MISS',
            'X-Offers-Key': 'normal'
          }
        })
      }
    } catch (err) {
      // If existing fetch failed, continue to new fetch
      fetchPromise = null
    }
  }
  
  // Start new fetch
  const startTime = Date.now()
  fetchPromise = (async () => {
    try {
      console.log(`[Offers API] Cache miss, fetching from MintGarden (forced: ${force})`)
      
      // Load reverse map from public asset
      const reverseMap = await loadReverseMap(request)
      
      // Fetch all offers
      const { listingsById, totalItemsFetched } = await fetchAllOffers(reverseMap)
      
      // Normalize response
      const collectionId = env?.COLLECTION_ID || COLLECTION_ID
      const normalized = normalizeResponse(listingsById, collectionId)
      
      const duration = Date.now() - startTime
      console.log(`[Offers API] Fetched ${totalItemsFetched} items, ${normalized.count} listings, duration: ${duration}ms`)
      
      const payloadText = JSON.stringify(normalized)
      const generatedAt = normalized.generated_at
      
      // Create responses with different TTLs (s-maxage for edge, max-age=0 for browser)
      const responseForced = new Response(payloadText, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': `public, max-age=0, s-maxage=${MANUAL_REFRESH_COOLDOWN_S}`,
          'X-Offers-Generated-At': generatedAt,
          'X-Cache-Mode': 'forced',
          'X-Offers-Cache': 'MISS',
          'X-Offers-Key': 'forced'
        }
      })
      
      const responseNormal = new Response(payloadText, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': `public, max-age=0, s-maxage=${SERVER_CACHE_TTL_S}`,
          'X-Offers-Generated-At': generatedAt,
          'X-Cache-Mode': 'normal',
          'X-Offers-Cache': 'MISS',
          'X-Offers-Key': 'normal'
        }
      })
      
      // Cache both if forced, only normal if not forced
      // After force=1, next normal request should return same X-Offers-Generated-At as forced.
      if (force) {
        const forcedKeyUrl = new URL(request.url)
        forcedKeyUrl.search = ''
        forcedKeyUrl.pathname = '/__cache/offers/forced'
        const forcedCacheRequest = new Request(forcedKeyUrl.toString(), { method: 'GET' })
        
        const normalKeyUrl = new URL(request.url)
        normalKeyUrl.search = ''
        normalKeyUrl.pathname = '/__cache/offers/normal'
        const normalCacheRequest = new Request(normalKeyUrl.toString(), { method: 'GET' })
        
        await Promise.all([
          caches.default.put(forcedCacheRequest, responseForced.clone()),
          caches.default.put(normalCacheRequest, responseNormal.clone())
        ])
      } else {
        const normalKeyUrl = new URL(request.url)
        normalKeyUrl.search = ''
        normalKeyUrl.pathname = '/__cache/offers/normal'
        const normalCacheRequest = new Request(normalKeyUrl.toString(), { method: 'GET' })
        
        await caches.default.put(normalCacheRequest, responseNormal.clone())
      }
      
      return { payloadText, generatedAt }  // Return object, not Response
    } catch (err) {
      console.error('[Offers API] Error:', err)
      fetchPromise = null
      throw err
    } finally {
      fetchPromise = null
    }
  })()
  
  try {
    const { payloadText, generatedAt } = await fetchPromise
    
    // Create response with correct TTL based on force flag
    if (force) {
      return new Response(payloadText, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': `public, max-age=0, s-maxage=${MANUAL_REFRESH_COOLDOWN_S}`,
          'X-Offers-Generated-At': generatedAt,
          'X-Cache-Mode': 'forced',
          'X-Offers-Cache': 'MISS',
          'X-Offers-Key': 'forced'
        }
      })
    } else {
      return new Response(payloadText, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': `public, max-age=0, s-maxage=${SERVER_CACHE_TTL_S}`,
          'X-Offers-Generated-At': generatedAt,
          'X-Cache-Mode': 'normal',
          'X-Offers-Cache': 'MISS',
          'X-Offers-Key': 'normal'
        }
      })
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch offers',
        message: err.message 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}

