import { readFile, writeFile, mkdir, rename, unlink } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Constants
const IPFS_BASE = 'https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link'
const DEXIE_API_BASE = 'https://api.dexie.space/v1'
const MINTGARDEN_API_BASE = 'https://api.mintgarden.io'
const MAX_CONCURRENT = 2
const MAX_RETRIES = 6
const TIMEOUT_MS = 15000
const BASE_DELAY_MS = 1000

// File paths
const INPUT_FILES = [
  { group: 'PP', file: join(__dirname, '../public/assets/PP.csv') },
  { group: 'SP', file: join(__dirname, '../public/assets/SP.csv') },
  { group: 'HOA', file: join(__dirname, '../public/assets/HOA.csv') },
  { group: 'BEPE', file: join(__dirname, '../public/assets/BEPE.csv') },
  { group: 'CHIA', file: join(__dirname, '../public/assets/CHIA.csv') },
  { group: 'NECKCOIN', file: join(__dirname, '../public/assets/NECKCOIN.csv') },
  { group: 'XCH', file: join(__dirname, '../public/assets/XCH.csv') },
]
const OUTPUT_FILE = join(__dirname, '../public/assets/offers_enriched.csv')
const FAILED_FILE = join(__dirname, '../public/assets/offers_failed.csv')
const CACHE_FILE = join(__dirname, '../public/assets/offers_enriched.cache.json')

// ============================================================================
// Core Utilities
// ============================================================================

/**
 * Generate stable hash-based ID from offer string (djb2 algorithm)
 * Same as MarketplaceContext.jsx
 */
function hashOfferString(offer) {
  let hash = 5381
  for (let i = 0; i < offer.length; i++) {
    hash = ((hash << 5) + hash) + offer.charCodeAt(i)
    hash |= 0
  }
  const unsigned = hash >>> 0
  return `OFFER-${unsigned.toString(16).padStart(8, '0')}`
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate random jitter (0-1000ms)
 */
function getJitter() {
  return Math.floor(Math.random() * 1000)
}

/**
 * Fetch with retry logic, timeout, and exponential backoff
 */
async function fetchWithRetry(url, options = {}, maxRetries = MAX_RETRIES) {
  const retryStatuses = [429, 502, 503, 504]
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      // Success
      if (response.ok) {
        return response
      }
      
      // Check if we should retry
      if (retryStatuses.includes(response.status) && attempt < maxRetries) {
        // Get Retry-After header if present
        const retryAfter = response.headers.get('Retry-After')
        let delay = BASE_DELAY_MS * Math.pow(2, attempt) + getJitter()
        
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter, 10)
          if (!isNaN(retryAfterSeconds)) {
            delay = retryAfterSeconds * 1000 + getJitter()
          }
        }
        
        console.warn(`  Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms (status: ${response.status})`)
        await sleep(delay)
        continue
      }
      
      // Non-retryable error or max retries reached
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      
    } catch (error) {
      clearTimeout(timeoutId)
      
      // AbortController timeout
      if (error.name === 'AbortError') {
        if (attempt < maxRetries) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + getJitter()
          console.warn(`  Timeout, retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`)
          await sleep(delay)
          continue
        }
        throw new Error(`Request timeout after ${TIMEOUT_MS}ms`)
      }
      
      // Network errors - retry if we have attempts left
      if (attempt < maxRetries && (error.message.includes('fetch') || error.message.includes('network'))) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + getJitter()
        console.warn(`  Network error, retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`)
        await sleep(delay)
        continue
      }
      
      throw error
    }
  }
  
  throw new Error(`Max retries (${maxRetries}) exceeded`)
}

// ============================================================================
// API Functions (Self-Contained)
// ============================================================================

/**
 * Query Dexie API to get offer details
 */
async function getOfferFromDexie(offerFileString) {
  try {
    const response = await fetchWithRetry(`${DEXIE_API_BASE}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ offer: offerFileString }),
    })
    
    const data = await response.json()
    if (data.success && data.offer) {
      return data.offer
    }
    
    return null
  } catch (error) {
    console.error(`  Dexie API error: ${error.message}`)
    return null
  }
}

/**
 * Extract NFT launcher IDs from Dexie offer response
 */
function extractNFTIdsFromDexieOffer(offerData) {
  const nftIds = []
  
  if (!offerData) return nftIds
  
  // Check requested array
  if (offerData.requested && Array.isArray(offerData.requested)) {
    for (const item of offerData.requested) {
      // Prioritize bech32 format (nft1...)
      if (item.id && item.id.startsWith('nft1')) {
        nftIds.push(item.id)
      }
      // Also check hex format (64 chars), but not XCH
      else if (item.id && item.id.length === 64 && /^[0-9a-f]{64}$/i.test(item.id)) {
        if (item.code !== 'XCH') {
          nftIds.push(item.id.toLowerCase())
        }
      }
    }
  }
  
  // Check offered array
  if (offerData.offered && Array.isArray(offerData.offered)) {
    for (const item of offerData.offered) {
      // Prioritize bech32 format (nft1...)
      if (item.id && item.id.startsWith('nft1')) {
        nftIds.push(item.id)
      }
      // Also check hex format (64 chars), but not XCH
      else if (item.id && item.id.length === 64 && /^[0-9a-f]{64}$/i.test(item.id)) {
        if (item.code !== 'XCH') {
          nftIds.push(item.id.toLowerCase())
        }
      }
    }
  }
  
  // Return unique IDs, prioritizing bech32
  const uniqueIds = [...new Set(nftIds)]
  return uniqueIds.sort((a, b) => {
    if (a.startsWith('nft1') && !b.startsWith('nft1')) return -1
    if (!a.startsWith('nft1') && b.startsWith('nft1')) return 1
    return 0
  })
}

/**
 * Resolve NFT from offer file to MintGarden launcher_bech32
 */
async function resolveNFTFromOfferFile(offerFileString) {
  try {
    // Step 1: Query Dexie API
    const offerData = await getOfferFromDexie(offerFileString)
    
    if (offerData) {
      // Step 2: Extract NFT IDs
      const nftIds = extractNFTIdsFromDexieOffer(offerData)
      
      if (nftIds.length > 0) {
        // Step 3: Try each NFT ID with MintGarden API (up to 5 candidates)
        for (const nftId of nftIds.slice(0, 5)) {
          try {
            const response = await fetchWithRetry(`${MINTGARDEN_API_BASE}/nfts/${nftId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.id) {
                return data.id || data.encoded_id
              }
            }
          } catch (err) {
            // Continue to next candidate
            continue
          }
        }
      }
    }
    
    return null
  } catch (error) {
    console.error(`  Failed to resolve NFT: ${error.message}`)
    return null
  }
}

/**
 * Fetch NFT details from MintGarden
 */
async function fetchNFTDetails(launcherBech32) {
  try {
    const response = await fetchWithRetry(`${MINTGARDEN_API_BASE}/nfts/${launcherBech32}`)
    if (!response.ok) {
      throw new Error(`MintGarden API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`  MintGarden API error: ${error.message}`)
    throw error
  }
}

// ============================================================================
// Token ID Extraction
// ============================================================================

/**
 * Extract token ID from metadata with priority order
 * Returns { tokenId, source } or null
 */
function extractTokenId(metadata, data) {
  if (!metadata && !data) return null
  
  const metadataJson = metadata || {}
  const dataObj = data || {}
  
  // Priority 1: Extract from metadata_json.image if it contains /####.png
  if (metadataJson.image) {
    const imageMatch = metadataJson.image.match(/\/(\d{4})\.png/)
    if (imageMatch && imageMatch[1]) {
      return { tokenId: imageMatch[1], source: 'image' }
    }
  }
  
  // Priority 2: Extract from metadata_json.name pattern #123
  if (metadataJson.name) {
    const nameMatch = metadataJson.name.match(/#\s*(\d+)/)
    if (nameMatch && nameMatch[1]) {
      return { tokenId: nameMatch[1], source: 'name' }
    }
  }
  
  // Priority 3: Explicit fields
  if (metadataJson.token_id) {
    return { tokenId: String(metadataJson.token_id), source: 'token_id' }
  }
  if (dataObj.token_id) {
    return { tokenId: String(dataObj.token_id), source: 'token_id' }
  }
  if (metadataJson.edition_number) {
    return { tokenId: String(metadataJson.edition_number), source: 'token_id' }
  }
  
  // Priority 4: Attributes array
  if (metadataJson.attributes && Array.isArray(metadataJson.attributes)) {
    for (const attr of metadataJson.attributes) {
      const traitType = (attr.trait_type || attr.name || '').toLowerCase()
      if (traitType.includes('token') || traitType.includes('edition') || 
          traitType.includes('id') || traitType.includes('number')) {
        const value = attr.value || attr.value_string
        if (value) {
          const match = String(value).match(/\d+/)
          if (match) {
            return { tokenId: match[0], source: 'attributes' }
          }
        }
      }
    }
  }
  
  return null
}

// ============================================================================
// Main ETL Pipeline
// ============================================================================

/**
 * Process a single offer file
 */
async function processOffer(group, offerFile, cache) {
  const offerHash = hashOfferString(offerFile)
  
  // Always check if offer is sold first (even for cached entries, status may have changed)
  const offerData = await getOfferFromDexie(offerFile)
  if (offerData) {
    // Check if offer is taken/completed
    // Dexie API status: 0 = pending/active, other values = completed/taken
    // Also check date_completed field
    const isOfferTaken = offerData.status !== 0 || offerData.date_completed !== null
    
    if (isOfferTaken) {
      // Mark as sold in cache and skip
      cache[offerFile] = { isSold: true }
      console.log(`  [SKIP SOLD] ${group} - ${offerHash} (offer taken)`)
      return { success: false, reason: 'Offer is sold' }
    }
  }
  
  // Check cache after verifying offer is still available
  if (cache[offerFile] && !cache[offerFile].isSold) {
    console.log(`  [CACHED] ${group} - ${offerHash}`)
    return { success: true, data: cache[offerFile] }
  }
  
  try {
    if (offerData) {
      // Check if offer is taken/completed
      // Dexie API status: 0 = pending/active, other values = completed/taken
      // Also check date_completed field
      const isOfferTaken = offerData.status !== 0 || offerData.date_completed !== null
      
      if (isOfferTaken) {
        // Mark as sold in cache and skip
        cache[offerFile] = { isSold: true }
        console.log(`  [SKIP SOLD] ${group} - ${offerHash} (offer taken)`)
        return { success: false, reason: 'Offer is sold' }
      }
    }
    
    // Step 1: Resolve NFT launcher ID
    const nftId = await resolveNFTFromOfferFile(offerFile)
    if (!nftId) {
      return { 
        success: false, 
        reason: 'Could not resolve NFT launcher ID from offer file' 
      }
    }
    
    // Step 2: Fetch MintGarden metadata
    const mintGardenData = await fetchNFTDetails(nftId)
    
    // Step 3: Extract token ID
    const tokenIdResult = extractTokenId(
      mintGardenData.data?.metadata_json,
      mintGardenData.data
    )
    
    if (!tokenIdResult) {
      return { 
        success: false, 
        reason: 'Could not extract token ID from metadata' 
      }
    }
    
    // Step 4: Build IPFS link
    const tokenId4 = tokenIdResult.tokenId.padStart(4, '0')
    const ipfsLink = `${IPFS_BASE}/${tokenId4}.png`
    
    // Step 5: Get name
    const name = mintGardenData.data?.metadata_json?.name || 
                 mintGardenData.name || 
                 `NFT ${tokenId4}`
    
    const result = {
      id: offerHash,
      tokenId4,
      ipfsLink,
      nftId,
      name,
      source: tokenIdResult.source,
    }
    
    // Update cache
    cache[offerFile] = result
    
    console.log(`  [OK] ${group} - ${offerHash} → ${tokenId4} (${tokenIdResult.source})`)
    return { success: true, data: result }
    
  } catch (error) {
    return { 
      success: false, 
      reason: `Error: ${error.message}` 
    }
  }
}

/**
 * Process offers with concurrency control
 */
async function processOffers(offers, cache) {
  const results = []
  const failed = []
  let processed = 0
  const total = offers.length
  
  // Process in batches with concurrency limit
  for (let i = 0; i < offers.length; i += MAX_CONCURRENT) {
    const batch = offers.slice(i, i + MAX_CONCURRENT)
    const batchPromises = batch.map(({ group, offerFile }) => 
      processOffer(group, offerFile, cache)
    )
    
    const batchResults = await Promise.all(batchPromises)
    
    for (let j = 0; j < batch.length; j++) {
      const { group, offerFile } = batch[j]
      const result = batchResults[j]
      
      processed++
      
      if (result.success) {
        // Normalize keys to match CSV header (lowercase)
        results.push({
          group,
          offerfile: offerFile, // lowercase to match CSV header
          id: result.data.id,
          tokenId4: result.data.tokenId4,
          ipfsLink: result.data.ipfsLink,
          nftId: result.data.nftId,
          name: result.data.name,
          source: result.data.source,
        })
      } else {
        failed.push({
          group,
          offerfile: offerFile, // lowercase to match CSV header
          reason: result.reason,
        })
      }
      
      // Progress update
      if (processed % 10 === 0 || processed === total) {
        console.log(`Progress: ${processed}/${total} (${results.length} success, ${failed.length} failed)`)
      }
    }
  }
  
  return { results, failed }
}

/**
 * Load cache from disk
 */
async function loadCache() {
  try {
    const cacheText = await readFile(CACHE_FILE, 'utf-8')
    return JSON.parse(cacheText)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}
    }
    console.warn(`Warning: Could not load cache: ${error.message}`)
    return {}
  }
}

/**
 * Save cache to disk
 */
async function saveCache(cache) {
  try {
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8')
  } catch (error) {
    console.error(`Error saving cache: ${error.message}`)
  }
}

/**
 * Read input CSV files (7 files: PP, SP, HOA, BEPE, CHIA, NECKCOIN, XCH)
 */
async function readInputCSV() {
  const offers = []
  const seenOffers = new Set()
  const missingFiles = []
  
  for (const { group, file } of INPUT_FILES) {
    try {
      const text = await readFile(file, 'utf-8')
      const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      if (lines.length === 0) {
        console.warn(`Warning: ${group}.csv is empty`)
        continue
      }
      
      // Parse rows (no header expected, format: GROUP,offerfile)
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim())
        if (parts.length < 2) continue
        
        const csvGroup = parts[0].toUpperCase()
        const offerFile = parts[1]
        
        // Validate offer file
        if (!offerFile || !offerFile.startsWith('offer1')) {
          console.warn(`Skipping invalid offer file in ${group}.csv: ${offerFile}`)
          continue
        }
        
        // Use group from filename (more reliable), but validate CSV group matches
        const finalGroup = group.toUpperCase()
        if (csvGroup !== finalGroup) {
          console.warn(`Warning: Group mismatch in ${group}.csv - CSV says "${csvGroup}", using "${finalGroup}" from filename`)
        }
        
        // Deduplicate by offerfile (keep first occurrence)
        if (seenOffers.has(offerFile)) {
          console.warn(`Skipping duplicate offer file: ${offerFile} (already seen in another file)`)
          continue
        }
        seenOffers.add(offerFile)
        
        offers.push({ group: finalGroup, offerFile })
      }
      
      console.log(`  Loaded ${group}.csv: ${lines.length} offers`)
    } catch (error) {
      if (error.code === 'ENOENT') {
        missingFiles.push(group)
        console.warn(`Warning: ${group}.csv not found`)
      } else {
        throw new Error(`Error reading ${group}.csv: ${error.message}`)
      }
    }
  }
  
  if (offers.length === 0) {
    throw new Error('No offers found in any input files')
  }
  
  if (missingFiles.length > 0) {
    console.warn(`Warning: ${missingFiles.length} input file(s) missing: ${missingFiles.join(', ')}`)
  }
  
  return offers
}

/**
 * Write CSV output
 */
async function writeCSV(filename, rows, header) {
  const lines = [header]
  for (const row of rows) {
    const values = header.split(',').map(col => {
      // Case-insensitive lookup (header uses lowercase, but row might use camelCase)
      const colLower = col.trim().toLowerCase()
      let value = ''
      
      // Try exact match first
      if (row[col] !== undefined) {
        value = row[col]
      } else {
        // Try case-insensitive match
        const keys = Object.keys(row)
        const matchingKey = keys.find(k => k.toLowerCase() === colLower)
        if (matchingKey !== undefined) {
          value = row[matchingKey]
        }
      }
      
      // Convert to string and handle null/undefined
      const valueStr = value != null ? String(value) : ''
      
      // Escape commas and quotes in CSV
      if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')) {
        return `"${valueStr.replace(/"/g, '""')}"`
      }
      return valueStr
    })
    lines.push(values.join(','))
  }
  
  const tempFile = `${filename}.tmp`
  await writeFile(tempFile, lines.join('\n') + '\n', 'utf-8')
  
  // Atomic rename
  await rename(tempFile, filename)
}

/**
 * Main function
 */
async function main() {
  console.log('Starting ETL pipeline...')
  console.log(`Input files: ${INPUT_FILES.map(f => f.group).join(', ')}`)
  console.log(`Output: ${OUTPUT_FILE}`)
  console.log(`Cache: ${CACHE_FILE}`)
  console.log('')
  
  // Load cache
  const cache = await loadCache()
  const cachedCount = Object.keys(cache).length
  console.log(`Loaded cache: ${cachedCount} entries`)
  console.log('')
  
  // Read input
  const offers = await readInputCSV()
  console.log(`Found ${offers.length} offers to process`)
  console.log('')
  
  // Process offers
  const { results, failed } = await processOffers(offers, cache)
  
  console.log('')
  console.log(`Processing complete:`)
  console.log(`  Success: ${results.length}`)
  console.log(`  Failed: ${failed.length}`)
  console.log('')
  
  // Save cache
  await saveCache(cache)
  console.log(`Cache saved: ${Object.keys(cache).length} entries`)
  console.log('')
  
  // Write outputs
  console.log('Writing output files...')
  
  // Ensure directory exists
  const outputDir = dirname(OUTPUT_FILE)
  try {
    await mkdir(outputDir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
  
  await writeCSV(
    OUTPUT_FILE,
    results,
    'group,offerfile,id,tokenId4,ipfsLink,nftId,name,source'
  )
  console.log(`  ✓ ${OUTPUT_FILE}`)
  
  if (failed.length > 0) {
    await writeCSV(
      FAILED_FILE,
      failed,
      'group,offerfile,reason'
    )
    console.log(`  ✓ ${FAILED_FILE}`)
  } else {
    // Remove failed file if empty
    try {
      await unlink(FAILED_FILE)
    } catch (error) {
      // File might not exist
    }
  }
  
  console.log('')
  console.log('Done!')
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

