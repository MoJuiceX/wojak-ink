/**
 * Big Pulp: Build MintGarden Offers Index
 *
 * Generates mintgarden_offers_index_v1.json mapping internal NFT numbers (1-4200)
 * to MintGarden active listing prices.
 *
 * Inputs:
 * - public/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json (for reverse_map)
 * - MintGarden API: https://api.mintgarden.io/collections/{collection_id}/nfts/by_offers
 *
 * Outputs:
 * - public/assets/BigPulp/mintgarden_offers_index_v1.json
 *
 * Usage:
 *   node scripts/build_mintgarden_offers_index.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'
const API_BASE = `https://api.mintgarden.io/collections/${COLLECTION_ID}/nfts/by_offers`
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=chia&vs_currencies=usd'

const FILES = {
  launcherMap: path.join(ROOT, 'public/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json'),
  output: path.join(ROOT, 'public/assets/BigPulp/mintgarden_offers_index_v1.json'),
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`)
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  } catch (err) {
    throw new Error(`Failed to write ${filePath}: ${err.message}`)
  }
}

// Sort object keys numerically (for deterministic output)
function sortObjectKeys(obj) {
  const sorted = {}
  const keys = Object.keys(obj).sort((a, b) => {
    const numA = parseInt(a, 10)
    const numB = parseInt(b, 10)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    return a.localeCompare(b)
  })
  for (const key of keys) {
    sorted[key] = obj[key]
  }
  return sorted
}

// Fetch with retry logic
async function fetchWithRetry(url, maxRetries = 5) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      
      if (response.status === 429 || response.status === 503 || response.status === 504) {
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.log(`  ⚠ Rate limited (${response.status}), retrying in ${backoff}ms... (attempt ${attempt + 1}/${maxRetries})`)
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

// Extract encoded_id for future trade scanning
function extractEncodedId(item) {
  if (item.encoded_id) return item.encoded_id
  if (item.encodedId) return item.encodedId
  if (item.id) return item.id
  return null
}

// Extract raw price from item
function extractRawPrice(item, priceFieldUsage) {
  if (item.xch_price !== undefined && item.xch_price !== null) {
    priceFieldUsage.xch_price = (priceFieldUsage.xch_price || 0) + 1
    return item.xch_price
  }
  if (item.price?.xch_price !== undefined && item.price.xch_price !== null) {
    priceFieldUsage['price.xch_price'] = (priceFieldUsage['price.xch_price'] || 0) + 1
    return item.price.xch_price
  }
  if (item.price !== undefined && item.price !== null) {
    priceFieldUsage.price = (priceFieldUsage.price || 0) + 1
    return item.price
  }
  if (item.amount !== undefined && item.amount !== null) {
    priceFieldUsage.amount = (priceFieldUsage.amount || 0) + 1
    return item.amount
  }
  if (item.listing_price !== undefined && item.listing_price !== null) {
    priceFieldUsage.listing_price = (priceFieldUsage.listing_price || 0) + 1
    return item.listing_price
  }
  priceFieldUsage.other = (priceFieldUsage.other || 0) + 1
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

// Fetch XCH/USD price from CoinGecko
async function fetchXCHPrice() {
  try {
    const response = await fetch(COINGECKO_API)
    if (!response.ok) {
      console.warn('⚠ Failed to fetch XCH/USD price from CoinGecko')
      return null
    }
    const data = await response.json()
    const price = data.chia?.usd || null
    if (price) {
      console.log(`✓ XCH/USD price: $${price.toFixed(2)}`)
    }
    return price
  } catch (err) {
    console.warn('⚠ Failed to fetch XCH/USD price:', err.message)
    return null
  }
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

// Compute depth points (cumulative count and value)
function computeDepthPoints(listings) {
  if (listings.length === 0) return []
  
  // Sort by price ascending
  const sorted = [...listings].sort((a, b) => a.price_xch - b.price_xch)
  
  // Downsample if too many points (target: <= 600)
  let points = sorted
  if (sorted.length > 600) {
    const step = Math.ceil(sorted.length / 600)
    points = []
    for (let i = 0; i < sorted.length; i += step) {
      points.push(sorted[i])
    }
    // Always include last point
    if (points[points.length - 1] !== sorted[sorted.length - 1]) {
      points.push(sorted[sorted.length - 1])
    }
  }
  
  // Build cumulative points
  let cumCount = 0
  let cumValue = 0
  const depthPoints = []
  
  for (const listing of points) {
    cumCount++
    cumValue += listing.price_xch
    depthPoints.push({
      price_xch: listing.price_xch,
      cum_count: cumCount,
      cum_value_xch: cumValue
    })
  }
  
  return depthPoints
}

// Compute "nice" step for binning
function computeNiceStep(min, max, binCount) {
  const range = max - min
  if (range <= 0) return 1
  
  const rawStep = range / binCount
  
  // Find nice step (0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  
  let niceNormalized
  if (normalized <= 0.25) niceNormalized = 0.25
  else if (normalized <= 0.5) niceNormalized = 0.5
  else if (normalized <= 1) niceNormalized = 1
  else if (normalized <= 2) niceNormalized = 2
  else if (normalized <= 5) niceNormalized = 5
  else niceNormalized = 10
  
  return niceNormalized * magnitude
}

// Compute XCH bins with nice rounding
function computeBinsXCH(prices, binCount) {
  if (prices.length === 0) return []
  
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  
  if (min === max) {
    // All prices are the same, create single bin
    return [{
      lo: min,
      hi: max,
      count: prices.length
    }]
  }
  
  const step = computeNiceStep(min, max, binCount)
  const bins = []
  
  // Round min down and max up to nice boundaries
  const startBin = Math.floor(min / step) * step
  const endBin = Math.ceil(max / step) * step
  
  for (let i = 0; i < binCount; i++) {
    const lo = startBin + (i * (endBin - startBin) / binCount)
    const hi = startBin + ((i + 1) * (endBin - startBin) / binCount)
    
    // Count prices in this bin (lo <= price < hi, except last bin includes hi)
    const count = prices.filter(p => {
      if (i === binCount - 1) {
        return p >= lo && p <= hi
      }
      return p >= lo && p < hi
    }).length
    
    bins.push({
      lo: parseFloat(lo.toFixed(6)),
      hi: parseFloat(hi.toFixed(6)),
      count
    })
  }
  
  return bins.filter(b => b.count > 0) // Remove empty bins
}

// Compute floor-multiple bins
function computeBinsFloorMultiple(prices, floor) {
  if (prices.length === 0 || !floor || floor <= 0) return []
  
  const bins = [
    { lo: 1.0, hi: 1.1 },
    { lo: 1.1, hi: 1.25 },
    { lo: 1.25, hi: 1.5 },
    { lo: 1.5, hi: 2.0 },
    { lo: 2.0, hi: 3.0 },
    { lo: 3.0, hi: 5.0 },
    { lo: 5.0, hi: 10.0 },
    { lo: 10.0, hi: null } // Last bin: 10.0+
  ]
  
  return bins.map(bin => {
    const count = prices.filter(p => {
      const multiple = p / floor
      if (bin.hi === null) {
        return multiple >= bin.lo
      }
      return multiple >= bin.lo && multiple < bin.hi
    }).length
    
    return {
      lo: bin.lo,
      hi: bin.hi,
      count
    }
  }).filter(b => b.count > 0) // Remove empty bins
}

async function main() {
  console.log('[MintGarden Offers] Building offers index...\n')
  
  // Check for global fetch (Node 18+)
  if (typeof fetch === 'undefined') {
    console.error('✗ Error: global fetch is not available. This script requires Node.js 18+')
    process.exit(1)
  }
  
  // Step 1: Fetch XCH/USD price
  console.log('[Step 1] Fetching XCH/USD price...')
  const xchUsdAtBuild = await fetchXCHPrice()
  
  // Step 2: Load launcher map
  console.log('\n[Step 2] Loading launcher map...')
  let reverseMap = {}
  try {
    const launcherMapData = readJson(FILES.launcherMap)
    
    // Runtime map only has map (id -> launcher), build reverse_map
    if (launcherMapData.map) {
      // Build reverse map from map
      for (const [id, launcher] of Object.entries(launcherMapData.map)) {
        reverseMap[launcher] = id
      }
      console.log(`✓ Built reverse_map from runtime map (${Object.keys(reverseMap).length} entries)`)
    } else {
      throw new Error('Launcher map has no map field')
    }
  } catch (err) {
    console.error(`✗ Failed to load launcher map: ${err.message}`)
    process.exit(1)
  }
  
  // Step 3: Fetch all offers from MintGarden
  console.log('\n[Step 3] Fetching offers from MintGarden API...')
  const listingsById = {} // id -> { listings: [], best_listing: {} }
  const unresolvedListings = []
  const priceFieldUsage = {}
  const seenListingKeys = new Set() // For deduplication: launcher_raw_item_id or encoded_id_raw_item_id
  let duplicatesDropped = 0
  
  let pageCursor = null
  let totalItemsFetched = 0
  let totalListingsFound = 0
  
  while (true) {
    let url = `${API_BASE}?token_id=xch&size=100`
    if (pageCursor) {
      url += `&page=${encodeURIComponent(pageCursor)}`
    }
    
    try {
      console.log(`  Fetching ${pageCursor ? 'next page' : 'first page'}...`)
      const response = await fetchWithRetry(url)
      
      const items = response.items || []
      const next = response.next
      
      if (items.length === 0) {
        console.log('  No more items, stopping')
        break
      }
      
      totalItemsFetched += items.length
      
      for (const item of items) {
        totalListingsFound++
        
        const launcher = extractLauncher(item)
        const encodedId = extractEncodedId(item)
        
        if (!launcher) {
          unresolvedListings.push({
            launcher: null,
            encoded_id: encodedId,
            price_raw: extractRawPrice(item, priceFieldUsage),
            price_xch: normalizePrice(extractRawPrice(item, priceFieldUsage)),
            hint: {
              name: item.name || null,
              edition: item.edition_number || null,
              xch_price: item.xch_price || null,
              encoded_id: encodedId,
            }
          })
          continue
        }
        
        const rawPrice = extractRawPrice(item, priceFieldUsage)
        if (rawPrice === null) {
          unresolvedListings.push({
            launcher,
            encoded_id: encodedId,
            price_raw: null,
            price_xch: null,
            hint: {
              name: item.name || null,
              edition: item.edition_number || null,
              xch_price: null,
              encoded_id: encodedId,
            }
          })
          continue
        }
        
        const priceXch = normalizePrice(rawPrice)
        if (priceXch === null || priceXch <= 0) {
          continue
        }
        
        // Deduplication: create unique key
        const rawItemId = item.id || item.item_id || ''
        const dedupeKey = rawItemId ? `${launcher}_${rawItemId}` : (encodedId ? `${encodedId}_${rawItemId}` : launcher)
        
        if (seenListingKeys.has(dedupeKey)) {
          duplicatesDropped++
          continue
        }
        seenListingKeys.add(dedupeKey)
        
        // Map launcher to internal ID
        const internalId = reverseMap[launcher]
        if (!internalId) {
          unresolvedListings.push({
            launcher,
            encoded_id: encodedId,
            price_raw: rawPrice,
            price_xch: priceXch,
            hint: {
              name: item.name || null,
              edition: item.edition_number || null,
              xch_price: rawPrice,
              encoded_id: encodedId,
            }
          })
          continue
        }
        
        // Create listing object
        const listing = {
          launcher,
          encoded_id: encodedId,
          price_raw: rawPrice,
          price_xch: priceXch,
          price_usd: xchUsdAtBuild ? priceXch * xchUsdAtBuild : null,
          source_type: 'offer',
          token_id: item.token_id || 'xch',
          updated_at: item.updated_at || item.data?.updated_at || null,
          created_at: item.created_at || item.data?.created_at || null,
          raw_item_id: rawItemId || null,
          last_seen_at: new Date().toISOString(),
          is_active: true,
        }
        
        // Add to listings for this ID
        if (!listingsById[internalId]) {
          listingsById[internalId] = {
            listings: [],
            best_listing: null,
          }
        }
        
        listingsById[internalId].listings.push(listing)
      }
      
      console.log(`  ✓ Fetched ${items.length} items, ${Object.keys(listingsById).length} IDs mapped so far`)
      
      if (!next) {
        console.log('  No next cursor, stopping')
        break
      }
      
      pageCursor = next
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (err) {
      console.error(`✗ Error fetching: ${err.message}`)
      throw err
    }
  }
  
  console.log(`\n✓ Fetched ${totalItemsFetched} items from MintGarden`)
  console.log(`✓ Found ${totalListingsFound} listings`)
  console.log(`✓ Dropped ${duplicatesDropped} duplicates`)
  console.log(`✓ Mapped ${Object.keys(listingsById).length} IDs`)
  console.log(`✓ Unresolved: ${unresolvedListings.length}`)
  
  // Step 4: Post-processing - compute best_listing and floor
  console.log('\n[Step 4] Post-processing listings...')
  let floorXch = null
  let floorId = null
  
  for (const [id, data] of Object.entries(listingsById)) {
    // Filter to xch listings only
    const xchListings = data.listings.filter(l => l.token_id === 'xch')
    
    if (xchListings.length === 0) {
      // No xch listings, remove from results
      delete listingsById[id]
      continue
    }
    
    // Compute best_listing (lowest price)
    const bestListing = xchListings.reduce((best, current) => {
      if (!best) return current
      return current.price_xch < best.price_xch ? current : best
    }, null)
    
    data.best_listing = bestListing
    data.listings = xchListings // Only keep xch listings
    
    // Update floor
    if (floorXch === null || bestListing.price_xch < floorXch) {
      floorXch = bestListing.price_xch
      floorId = id
    }
  }
  
  const listingsMapped = Object.keys(listingsById).length
  const unresolvedCount = Math.min(unresolvedListings.length, 200)
  const unresolvedListingsCapped = unresolvedListings.slice(0, 200)
  
  console.log(`✓ Processed ${listingsMapped} IDs with listings`)
  if (floorXch !== null) {
    console.log(`✓ Floor price: ${floorXch.toFixed(2)} XCH (ID: ${floorId})`)
  }
  
  // Step 4.5: Compute market_stats
  console.log('\n[Step 4.5] Computing market statistics...')
  let marketStats = null
  
  if (listingsMapped > 0) {
    // Collect all best_listing prices
    const prices = []
    for (const [id, data] of Object.entries(listingsById)) {
      if (data.best_listing && data.best_listing.price_xch) {
        prices.push(data.best_listing.price_xch)
      }
    }
    
    if (prices.length > 0) {
      const sortedPrices = [...prices].sort((a, b) => a - b)
      const listedCount = prices.length
      const minXch = sortedPrices[0]
      const maxXch = sortedPrices[sortedPrices.length - 1]
      
      // Compute percentiles
      const percentiles = computePercentiles(sortedPrices, [10, 25, 50, 75, 90])
      const medianXch = percentiles.p50 || null
      const p10Xch = percentiles.p10 || null
      const p25Xch = percentiles.p25 || null
      const p75Xch = percentiles.p75 || null
      const p90Xch = percentiles.p90 || null
      
      // Compute depth points (from all listings, not just best)
      const allListings = []
      for (const [id, data] of Object.entries(listingsById)) {
        for (const listing of data.listings) {
          if (listing.price_xch) {
            allListings.push(listing)
          }
        }
      }
      const depthPoints = computeDepthPoints(allListings)
      
      // Compute bins
      const binsXchCoarse = computeBinsXCH(prices, 8)
      const binsXchFine = computeBinsXCH(prices, 16)
      const binsFloorMultiple = computeBinsFloorMultiple(prices, floorXch)
      
      marketStats = {
        xch_usd_at_build: xchUsdAtBuild,
        floor_xch: floorXch,
        listed_count: listedCount,
        min_xch: minXch,
        max_xch: maxXch,
        median_xch: medianXch,
        p10_xch: p10Xch,
        p25_xch: p25Xch,
        p75_xch: p75Xch,
        p90_xch: p90Xch,
        depth_points_xch: depthPoints,
        bins_xch_coarse: binsXchCoarse,
        bins_xch_fine: binsXchFine,
        bins_floor_multiple: binsFloorMultiple
      }
      
      console.log(`✓ Computed market stats: ${listedCount} listed, floor ${floorXch?.toFixed(2)} XCH`)
      console.log(`  Percentiles: p10=${p10Xch?.toFixed(2)}, median=${medianXch?.toFixed(2)}, p90=${p90Xch?.toFixed(2)}`)
      console.log(`  Depth points: ${depthPoints.length}, Bins: ${binsXchCoarse.length} coarse, ${binsXchFine.length} fine, ${binsFloorMultiple.length} floor-multiple`)
    }
  }
  
  // Step 5: Build output
  console.log('\n[Step 5] Building output...')
  const generatedAt = new Date().toISOString()
  
  // Sort listings_by_id keys numerically
  const sortedListingsById = sortObjectKeys(
    Object.fromEntries(
      Object.entries(listingsById).map(([id, data]) => [id, {
        best_listing: data.best_listing,
        listings: data.listings,
      }])
    )
  )
  
  const output = {
    schema_version: '1.0',
    generated_at: generatedAt,
    collection_id: COLLECTION_ID,
    supported_tokens: ['xch'],
    token_id: 'xch',
    xch_usd_at_build: xchUsdAtBuild,
    floor_xch: floorXch,
    floor_id: floorId,
    count: listingsMapped,
    stats: {
      total_items_fetched: totalItemsFetched,
      total_listings_found: totalListingsFound,
      listings_mapped: listingsMapped,
      unresolved_count: unresolvedListings.length,
      duplicates_dropped: duplicatesDropped,
    },
    market_stats: marketStats, // Market statistics for order book visualizations
    listings_by_id: sortedListingsById,
    offers_by_id: sortedListingsById, // Alias for backwards compatibility
    unresolved_listings: unresolvedListingsCapped,
    price_field_usage: priceFieldUsage,
  }
  
  // Step 6: Validation
  console.log('\n[Step 6] Validation...')
  if (totalItemsFetched > 0 && listingsMapped === 0) {
    console.error('✗ FAILED: API returned items but no listings were mapped (mapping broke)')
    process.exit(1)
  }
  
  // Step 7: Write output
  console.log('\n[Step 7] Writing output...')
  try {
    writeJson(FILES.output, output)
    console.log(`✓ Written to ${FILES.output}`)
  } catch (err) {
    console.error(`✗ Failed to write output: ${err.message}`)
    process.exit(1)
  }
  
  // Step 8: Print summary
  console.log('\n✓ Build complete!')
  console.log(`  Total items fetched: ${totalItemsFetched}`)
  console.log(`  Listings mapped: ${listingsMapped}`)
  console.log(`  Unresolved: ${unresolvedListings.length}`)
  console.log(`  Duplicates dropped: ${duplicatesDropped}`)
  if (floorXch !== null) {
    console.log(`  Floor: ${floorXch.toFixed(2)} XCH`)
  }
  console.log('\n  Price field usage:')
  const totalUsage = Object.values(priceFieldUsage).reduce((sum, count) => sum + count, 0)
  for (const [field, count] of Object.entries(priceFieldUsage)) {
    const percentage = totalUsage > 0 ? ((count / totalUsage) * 100).toFixed(1) : '0.0'
    console.log(`    ${field}: ${count} (${percentage}%)`)
  }
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err)
  process.exit(1)
})

