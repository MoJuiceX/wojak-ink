/**
 * Big Pulp: Build MintGarden Launcher Map
 *
 * Generates mintgarden_launcher_map_v1.json mapping internal NFT numbers (1-4200)
 * to MintGarden launcher_bech32 IDs.
 *
 * Inputs:
 * - public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json (canonical source for IDs)
 * - MintGarden API: https://api.mintgarden.io/collections/{collection_id}/nfts
 *
 * Outputs:
 * - public/assets/BigPulp/mintgarden_launcher_map_v1.json
 *
 * Usage:
 *   node scripts/build_mintgarden_launcher_map.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'
const API_BASE = `https://api.mintgarden.io/collections/${COLLECTION_ID}/nfts`
const EXPECTED_TOTAL = 4200
const MIN_MAPPED_THRESHOLD = 3800

const FILES = {
  metadata: path.join(ROOT, 'public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json'),
  runtime: path.join(ROOT, 'public/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json'),
  report: path.join(ROOT, 'public/assets/BigPulp/mintgarden_launcher_map_report_v1.json'),
}

// Parse CLI args
const args = process.argv.slice(2)
const FLAGS = {
  check: args.includes('--check'),
  allowPartial: !args.includes('--no-allow-partial'), // Default true, use --no-allow-partial to disable
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

// Hash file contents (SHA256)
function hashFileContents(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8')
  return createHash('sha256').update(contents).digest('hex')
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

// Sort array of objects by stable field
function sortArrayByField(arr, field) {
  return [...arr].sort((a, b) => {
    const valA = a[field] || ''
    const valB = b[field] || ''
    return String(valA).localeCompare(String(valB))
  })
}

// Robust pagination helper
function getNextPage(next) {
  if (!next) return null
  if (typeof next === 'string' && next.startsWith('http')) {
    try {
      const url = new URL(next)
      return url.searchParams.get('page') || next
    } catch {
      return next
    }
  }
  return next
}

// Extract filename from URL pathname
function extractFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const basename = path.basename(pathname)
    return basename || null
  } catch {
    // If URL parsing fails, try to extract filename from string
    const match = url.match(/\/([^\/]+\.(png|jpg|jpeg|gif|webp))$/i)
    return match ? match[1] : null
  }
}

// Extract launcher_bech32 from MintGarden item
function extractLauncher(item) {
  // Try in order of preference
  if (item.encoded_id && typeof item.encoded_id === 'string') {
    if (item.encoded_id.startsWith('nft1')) return item.encoded_id
  }
  if (item.encodedId && typeof item.encodedId === 'string') {
    if (item.encodedId.startsWith('nft1')) return item.encodedId
  }
  if (item.launcher_bech32 && typeof item.launcher_bech32 === 'string') {
    if (item.launcher_bech32.startsWith('nft1')) return item.launcher_bech32
  }
  if (item.launcherBech32 && typeof item.launcherBech32 === 'string') {
    if (item.launcherBech32.startsWith('nft1')) return item.launcherBech32
  }
  if (item.id && typeof item.id === 'string' && item.id.startsWith('nft1')) {
    return item.id
  }
  return null
}

// Extract edition from metadata_json
function extractEdition(metadataJson) {
  if (!metadataJson || typeof metadataJson !== 'object') return null
  
  // Try various edition field names
  const candidates = [
    metadataJson.edition,
    metadataJson.edition_number,
    metadataJson.editionNumber,
  ]
  
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && candidate >= 1 && candidate <= EXPECTED_TOTAL) {
      return candidate
    }
  }
  
  return null
}

// Parse NFT number from name string
function parseIdFromName(name) {
  if (!name || typeof name !== 'string') return null
  
  // Patterns: /#\s*(\d{1,5})/i, /wojak[-\s_#]*(\d{1,5})/i
  const patterns = [
    /#\s*(\d{1,5})/i,
    /wojak[-\s_#]*(\d{1,5})/i,
  ]
  
  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num >= 1 && num <= EXPECTED_TOTAL) {
        return num
      }
    }
  }
  
  return null
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

// Resolve internal ID for a MintGarden item
function resolveInternalId(item, editionToId, idToImageFilename) {
  // Priority A: Edition match
  // Check top-level edition_number first, then metadata/metadata_json
  let edition = item.edition_number
  if (!edition) {
    const metadataJson = item.metadata || item.data?.metadata_json || item.metadata_json
    edition = extractEdition(metadataJson)
  }
  
  if (edition !== null && typeof edition === 'number' && edition >= 1 && edition <= EXPECTED_TOTAL) {
    const id = editionToId.get(edition)
    if (id) {
      return { id, method: 'edition' }
    }
  }
  
  // Priority B: Name parse
  // Check top-level name first, then metadata
  let name = item.name
  if (!name) {
    const metadataJson = item.metadata || item.data?.metadata_json || item.metadata_json
    name = metadataJson?.name
  }
  
  if (name) {
    const parsedId = parseIdFromName(name)
    if (parsedId !== null && parsedId >= 1 && parsedId <= EXPECTED_TOTAL) {
      return { id: String(parsedId), method: 'name' }
    }
  }
  
  // Try stringified metadata if name wasn't found
  if (!name) {
    const metadataJson = item.metadata || item.data?.metadata_json || item.metadata_json
    if (metadataJson) {
      const stringified = JSON.stringify(metadataJson)
      const parsedId = parseIdFromName(stringified)
      if (parsedId !== null && parsedId >= 1 && parsedId <= EXPECTED_TOTAL) {
        return { id: String(parsedId), method: 'name_stringified' }
      }
    }
  }
  
  // Priority C: Image filename match
  const uris = [
    item.thumbnail_uri,
    item.preview_uri,
    item.data?.preview_uri,
    item.data?.thumbnail_uri,
    ...(Array.isArray(item.data_uris) ? item.data_uris : []),
    ...(Array.isArray(item.data?.data_uris) ? item.data.data_uris : []),
  ].filter(Boolean)
  
  for (const uri of uris) {
    const filename = extractFilenameFromUrl(uri)
    if (filename) {
      // Find ID that matches this filename
      for (const [id, expectedFilename] of Object.entries(idToImageFilename)) {
        if (expectedFilename === filename) {
          return { id, method: 'image_filename' }
        }
      }
    }
  }
  
  return null
}

// Score conflict resolution candidates
// Returns: { score: number, method: string }
function scoreConflictResolution(id, launcher, item, editionToId, idToName, idToImageFilename) {
  const idNum = parseInt(id, 10)
  if (isNaN(idNum) || idNum < 1 || idNum > EXPECTED_TOTAL) {
    return { score: 0, method: 'first_seen' }
  }
  
  const metadataJson = item.metadata || item.data?.metadata_json || item.metadata_json
  const name = item.name || metadataJson?.name || null
  const expectedName = idToName[id] || null
  
  // Priority 1: Edition match + name pattern match (score: 100)
  const edition = item.edition_number || extractEdition(metadataJson)
  if (edition === idNum) {
    // Check if name matches expected pattern
    if (name && expectedName) {
      const parsedId = parseIdFromName(name)
      if (parsedId === idNum) {
        return { score: 100, method: 'edition_match' }
      }
    } else if (name) {
      // Edition matches, check if name has correct pattern
      const parsedId = parseIdFromName(name)
      if (parsedId === idNum) {
        return { score: 100, method: 'edition_match' }
      }
    } else if (edition === idNum) {
      // Edition matches but no name to verify
      return { score: 100, method: 'edition_match' }
    }
  }
  
  // Priority 2: Image filename match (score: 50)
  const uris = [
    item.thumbnail_uri,
    item.preview_uri,
    item.data?.preview_uri,
    item.data?.thumbnail_uri,
    ...(Array.isArray(item.data_uris) ? item.data_uris : []),
    ...(Array.isArray(item.data?.data_uris) ? item.data.data_uris : []),
  ].filter(Boolean)
  
  for (const uri of uris) {
    const filename = extractFilenameFromUrl(uri)
    if (filename) {
      const expectedFilename = idToImageFilename[id]
      if (expectedFilename && filename === expectedFilename) {
        return { score: 50, method: 'image_filename' }
      }
    }
  }
  
  // Priority 3: First-seen (stable ordering) - use alphabetical sort of launcher for determinism
  return { score: 0, method: 'first_seen' }
}

// Check mode: validate existing runtime and report files
function checkMode() {
  console.log('[MintGarden] Checking existing launcher map...\n')
  
  try {
    // Check runtime file
    const runtimeData = readJson(FILES.runtime)
    
    // Validate schema
    if (!runtimeData.schema_version || !runtimeData.schema_version.startsWith('1.')) {
      console.error('✗ Invalid schema_version in runtime file')
      process.exit(1)
    }
    
    const count = runtimeData.count || 0
    const map = runtimeData.map || {}
    
    console.log(`✓ Runtime schema version: ${runtimeData.schema_version}`)
    console.log(`✓ Mapped count: ${count}`)
    
    // Validate known IDs exist
    const knownIds = ['1', '100', '4200']
    const missingKnown = knownIds.filter(id => !map[id])
    
    if (missingKnown.length > 0) {
      console.warn(`⚠ Missing known IDs: ${missingKnown.join(', ')}`)
    } else {
      console.log('✓ Known IDs (1, 100, 4200) exist in map')
    }
    
    // Check report file for conflicts
    let conflictsCount = 0
    try {
      const reportData = readJson(FILES.report)
      conflictsCount = reportData.summary?.conflicts_count || 0
      console.log(`✓ Conflicts in report: ${conflictsCount}`)
    } catch (err) {
      console.warn(`⚠ Could not read report file: ${err.message}`)
    }
    
    // Fail if mapped count too low
    if (count < MIN_MAPPED_THRESHOLD) {
      console.error(`✗ FAILED: Mapped count (${count}) is below threshold (${MIN_MAPPED_THRESHOLD})`)
      process.exit(1)
    }
    
    // Fail if conflicts exist
    if (conflictsCount > 0) {
      console.error(`✗ FAILED: Found ${conflictsCount} conflicts`)
      process.exit(1)
    }
    
    console.log('\n✓ Check passed!')
    process.exit(0)
  } catch (err) {
    console.error(`✗ Failed to check: ${err.message}`)
    process.exit(1)
  }
}

async function main() {
  // Handle --check flag
  if (FLAGS.check) {
    checkMode()
    return
  }
  
  console.log('[MintGarden] Building launcher map...\n')
  
  // Check for global fetch (Node 18+)
  if (typeof fetch === 'undefined') {
    console.error('✗ Error: global fetch is not available. This script requires Node.js 18+')
    process.exit(1)
  }
  
  // Step 1: Load and parse local metadata
  console.log('[Step 1] Loading local metadata...')
  let metadata
  let metadataHash
  try {
    metadata = readJson(FILES.metadata)
    metadataHash = hashFileContents(FILES.metadata)
    console.log(`✓ Read ${metadata.length} entries from metadata file`)
    console.log(`✓ Metadata hash: ${metadataHash.substring(0, 16)}...`)
  } catch (err) {
    console.error(`✗ Failed to read metadata: ${err.message}`)
    process.exit(1)
  }
  
  // Build canonical maps
  const editionToId = new Map()
  const idToName = {}
  const idToImageFilename = {}
  
  for (const nft of metadata) {
    if (!nft.edition || typeof nft.edition !== 'number') continue
    if (nft.edition < 1 || nft.edition > EXPECTED_TOTAL) {
      console.warn(`⚠ Edition ${nft.edition} is out of range, skipping`)
      continue
    }
    
    const id = String(nft.edition)
    
    // Check for duplicate editions
    if (editionToId.has(nft.edition)) {
      console.warn(`⚠ Duplicate edition ${nft.edition}, keeping first occurrence`)
      continue
    }
    
    editionToId.set(nft.edition, id)
    
    if (nft.name) {
      idToName[id] = nft.name
    }
    
    if (nft.image) {
      const filename = extractFilenameFromUrl(nft.image)
      if (filename) {
        idToImageFilename[id] = filename
      }
    }
  }
  
  console.log(`✓ Built canonical maps: ${editionToId.size} editions mapped`)
  if (editionToId.size !== EXPECTED_TOTAL) {
    console.warn(`⚠ Expected ${EXPECTED_TOTAL} entries, found ${editionToId.size}`)
  }
  
  // Step 2: Fetch all NFTs from MintGarden
  console.log('\n[Step 2] Fetching NFTs from MintGarden API...')
  const map = {}
  const reverseMap = {}
  const conflictCandidates = [] // Store conflicts with full item data for resolution
  const unresolved = []
  const launcherMeta = {} // Optional: launcher -> { id, name, image }
  const launcherToItem = {} // Store full item data for conflict resolution
  
  let pageCursor = null // Cursor token for pagination
  let fetchedCount = 0
  let mappedCount = 0
  
  while (true) {
    // Build URL: include page parameter only if we have a cursor
    let url = `${API_BASE}?include_metadata=true&include_uris=true&size=100`
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
      
      fetchedCount += items.length
      
      for (const item of items) {
        const launcher = extractLauncher(item)
        if (!launcher) {
          const metadataJson = item.metadata || item.data?.metadata_json || item.metadata_json
          unresolved.push({
            encoded_id: item.id || item.encoded_id || null,
            name: item.name || metadataJson?.name || null,
            edition: item.edition_number || extractEdition(metadataJson),
            preview_uri: item.preview_uri || item.data?.preview_uri || null,
            thumbnail_uri: item.thumbnail_uri || item.data?.thumbnail_uri || null,
          })
          continue
        }
        
        const resolved = resolveInternalId(item, editionToId, idToImageFilename)
        if (!resolved) {
          const metadataJson = item.metadata || item.data?.metadata_json || item.metadata_json
          unresolved.push({
            encoded_id: launcher,
            name: item.name || metadataJson?.name || null,
            edition: item.edition_number || extractEdition(metadataJson),
            preview_uri: item.preview_uri || item.data?.preview_uri || null,
            thumbnail_uri: item.thumbnail_uri || item.data?.thumbnail_uri || null,
          })
          continue
        }
        
        const { id, method } = resolved
        
        // Store item data for conflict resolution (always store, even if conflict)
        launcherToItem[launcher] = item
        
        // Check for conflicts - collect for later resolution
        if (map[id] && map[id] !== launcher) {
          // Ensure we have item data for the existing launcher
          if (!launcherToItem[map[id]]) {
            // This shouldn't happen, but handle gracefully
            console.warn(`⚠ Missing item data for launcher ${map[id]} in conflict for ID ${id}`)
          }
          // Store conflict candidate with full item data
          conflictCandidates.push({
            id,
            launcherA: map[id],
            launcherB: launcher,
            itemA: launcherToItem[map[id]],
            itemB: item,
            methodA: 'first_seen', // Will be determined during resolution
            methodB: method,
          })
          // Don't add to map yet - will resolve after initial pass
          continue
        }
        
        // Check if launcher already mapped to different ID
        if (reverseMap[launcher] && reverseMap[launcher] !== id) {
          conflictCandidates.push({
            id: reverseMap[launcher],
            launcherA: reverseMap[launcher],
            launcherB: launcher,
            itemA: launcherToItem[reverseMap[launcher]],
            itemB: item,
            methodA: 'first_seen',
            methodB: method,
          })
          continue
        }
        
        // Add mapping
        map[id] = launcher
        reverseMap[launcher] = id
        
        // Store launcher metadata (optional, for future trade scanning)
        const metadataJson = item.metadata || item.data?.metadata_json || item.metadata_json
        const name = item.name || metadataJson?.name || idToName[id] || null
        const image = item.thumbnail_uri || item.preview_uri || item.data?.preview_uri || item.data?.thumbnail_uri || null
        launcherMeta[launcher] = { id, name, image }
        
        mappedCount++
      }
      
      console.log(`  ✓ Fetched ${items.length} items, ${mappedCount} mapped so far`)
      
      // Handle next cursor
      if (!next) {
        console.log('  No next cursor, stopping')
        break
      }
      
      // next is a cursor token (string like ">dt:...~s:...")
      pageCursor = next
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (err) {
      console.error(`✗ Error fetching: ${err.message}`)
      throw err
    }
  }
  
  console.log(`\n✓ Fetched ${fetchedCount} items from MintGarden`)
  console.log(`✓ Mapped ${mappedCount} NFTs`)
  console.log(`  Conflict candidates: ${conflictCandidates.length}`)
  console.log(`  Unresolved: ${unresolved.length}`)
  
  // Step 2.5: Resolve conflicts using deterministic scoring
  console.log('\n[Step 2.5] Resolving conflicts...')
  const conflicts = []
  const alternativesById = {}
  
  // Group conflicts by ID
  const conflictsById = {}
  for (const candidate of conflictCandidates) {
    if (!conflictsById[candidate.id]) {
      conflictsById[candidate.id] = []
    }
    conflictsById[candidate.id].push(candidate)
  }
  
  // Resolve each conflict
  for (const [id, candidates] of Object.entries(conflictsById)) {
    // Collect all launchers for this ID
    const launchers = new Set()
    const launcherItems = {}
    
    // Get existing mapping if any
    if (map[id]) {
      launchers.add(map[id])
      launcherItems[map[id]] = launcherToItem[map[id]]
    }
    
    // Add all conflict candidates
    for (const candidate of candidates) {
      launchers.add(candidate.launcherA)
      launchers.add(candidate.launcherB)
      launcherItems[candidate.launcherA] = candidate.itemA
      launcherItems[candidate.launcherB] = candidate.itemB
    }
    
    // Score each launcher
    const scored = []
    for (const launcher of launchers) {
      const item = launcherItems[launcher]
      if (!item) continue
      
      const score = scoreConflictResolution(id, launcher, item, editionToId, idToName, idToImageFilename)
      scored.push({
        launcher,
        item,
        score: score.score,
        method: score.method,
      })
    }
    
    // Sort by score (descending), then by launcher (alphabetical for determinism)
    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      return a.launcher.localeCompare(b.launcher)
    })
    
    const primary = scored[0]
    const alternatives = scored.slice(1).map(s => s.launcher)
    
    // Update map with primary launcher
    map[id] = primary.launcher
    reverseMap[primary.launcher] = id
    
    // Store conflict info for report
    if (alternatives.length > 0) {
      conflicts.push({
        id,
        primary_launcher: primary.launcher,
        alternatives,
        resolution_method: primary.method,
        evidence: {
          primary: {
            launcher: primary.launcher,
            edition: primary.item.edition_number || extractEdition(primary.item.metadata || primary.item.data?.metadata_json || primary.item.metadata_json),
            name: primary.item.name || (primary.item.metadata || primary.item.data?.metadata_json || primary.item.metadata_json)?.name || null,
            score: primary.score,
            method: primary.method,
          },
          alternatives: alternatives.map(launcher => {
            const item = launcherItems[launcher]
            const score = scored.find(s => s.launcher === launcher)
            return {
              launcher,
              edition: item?.edition_number || extractEdition(item?.metadata || item?.data?.metadata_json || item?.metadata_json),
              name: item?.name || (item?.metadata || item?.data?.metadata_json || item?.metadata_json)?.name || null,
              score: score?.score || 0,
              method: score?.method || 'unknown',
            }
          }),
        },
      })
      
      alternativesById[id] = alternatives
    }
  }
  
  console.log(`✓ Resolved ${conflicts.length} conflicts`)
  
  // Step 3: Build missing IDs
  console.log('\n[Step 3] Building missing IDs list...')
  const missingIdsAll = []
  for (let i = 1; i <= EXPECTED_TOTAL; i++) {
    const id = String(i)
    if (!map[id]) {
      missingIdsAll.push(id)
    }
  }
  
  const missingSample = missingIdsAll.slice(0, 100)
  
  console.log(`✓ Missing IDs: ${missingIdsAll.length} (sample: ${missingSample.length})`)
  
  // Step 4: Validation
  console.log('\n[Step 4] Validation...')
  let isPartial = false
  
  // Default behavior: always allow partial (warn but continue)
  // --check mode: fail hard
  if (mappedCount < MIN_MAPPED_THRESHOLD) {
    isPartial = true
    if (FLAGS.check) {
      console.error(`✗ FAILED: Mapped count (${mappedCount}) is below threshold (${MIN_MAPPED_THRESHOLD})`)
      process.exit(1)
    } else {
      console.warn(`⚠ WARNING: Mapped count (${mappedCount}) is below threshold (${MIN_MAPPED_THRESHOLD})`)
      console.warn('  Continuing with partial map (default behavior)')
    }
  }
  
  if (conflicts.length > 0) {
    isPartial = true
    if (FLAGS.check) {
      console.error(`✗ FAILED: Found ${conflicts.length} conflicts (same ID mapped to multiple launchers)`)
      console.error('  First conflict:', conflicts[0])
      process.exit(1)
    } else {
      console.warn(`⚠ WARNING: Found ${conflicts.length} conflicts (same ID mapped to multiple launchers)`)
      console.warn('  Conflicts will be auto-resolved, continuing (default behavior)')
    }
  }
  
  if (!isPartial) {
    console.log('✓ Validation passed (full map, no conflicts)')
  } else {
    console.log('✓ Validation passed (partial map allowed)')
  }
  
  // Step 5: Build deterministic output (sorted)
  console.log('\n[Step 5] Building deterministic output...')
  
  // Sort map keys numerically
  const sortedMap = sortObjectKeys(map)
  
  // Sort conflicts by id
  const sortedConflicts = sortArrayByField(conflicts, 'id')
  
  // Sort unresolved by encoded_id (most stable field)
  const sortedUnresolved = sortArrayByField(unresolved, 'encoded_id')
  
  const generatedAt = new Date().toISOString()
  
  // Build runtime file (small, client-facing)
  const runtimeOutput = {
    schema_version: '1.0',
    generated_at: generatedAt,
    collection_id: COLLECTION_ID,
    count: mappedCount,
    is_partial: isPartial,
    map: sortedMap,
  }
  
  // Build report file (debug/investigation)
  const reportOutput = {
    report_schema_version: '1.0',
    generated_at: generatedAt,
    collection_id: COLLECTION_ID,
    source_metadata_file: 'public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json',
    metadata_source_hash: metadataHash,
    summary: {
      fetched_count: fetchedCount,
      mapped_count: mappedCount,
      missing_count: missingIdsAll.length,
      conflicts_count: conflicts.length,
      unresolved_count: unresolved.length,
    },
    missing_ids_all: missingIdsAll,
    unresolved: sortedUnresolved,
    conflicts: sortedConflicts,
    alternatives_by_id: alternativesById,
  }
  
  // Step 6: Write output files
  console.log('\n[Step 6] Writing output files...')
  try {
    // Write runtime file (always, even if partial)
    writeJson(FILES.runtime, runtimeOutput)
    console.log(`✓ Written runtime map to ${FILES.runtime}`)
    console.log(`  Size: ${Object.keys(sortedMap).length} mappings`)
    
    // Write report file (always, even if empty)
    writeJson(FILES.report, reportOutput)
    console.log(`✓ Written report to ${FILES.report}`)
    console.log(`  Conflicts: ${conflicts.length}, Missing: ${missingIdsAll.length}, Unresolved: ${unresolved.length}`)
  } catch (err) {
    console.error(`✗ Failed to write output: ${err.message}`)
    process.exit(1)
  }
  
  console.log('\n✓ Build complete!')
  console.log(`  Mapped: ${mappedCount}/${EXPECTED_TOTAL}`)
  console.log(`  Missing: ${missingIdsAll.length}`)
  console.log(`  Conflicts: ${conflicts.length}`)
  console.log(`  Unresolved: ${unresolved.length}`)
  if (isPartial) {
    console.log(`  ⚠ Partial map (is_partial: true)`)
  }
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err)
  process.exit(1)
})

