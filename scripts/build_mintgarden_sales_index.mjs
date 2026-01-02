/**
 * Big Pulp: Build MintGarden Sales Index (Robust Version)
 *
 * Fetches sales from MintGarden with:
 * - Adaptive rate limiting (never hits rate limits)
 * - Checkpoint system (can resume from any point)
 * - Enhanced error handling (graceful recovery)
 * - Progress persistence (never lose progress)
 * - Comprehensive logging (full visibility)
 *
 * Inputs:
 * - public/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json (for reverse_map)
 * - MintGarden API: NFT Details endpoints
 *
 * Outputs:
 * - public/assets/BigPulp/mintgarden_sales_index_v1.json
 * - public/assets/BigPulp/.sales_index_checkpoint.json (checkpoint)
 * - public/assets/BigPulp/.sales_index_errors.json (error log)
 * - public/assets/BigPulp/.sales_index_build.log (build log)
 *
 * Usage:
 *   node scripts/build_mintgarden_sales_index.mjs              # Full build (resumes if checkpoint exists)
 *   node scripts/build_mintgarden_sales_index.mjs --validate   # Validation only
 *   node scripts/build_mintgarden_sales_index.mjs --fresh      # Fresh build (ignore checkpoint)
 *   node scripts/build_mintgarden_sales_index.mjs --resume     # Resume from checkpoint
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'

// Filter: Only consider sales >= 0.8 XCH (secondary market)
const MIN_SECONDARY_PRICE = 0.8

// Known NFTs with sales for validation testing
const KNOWN_SALES_TEST_NFTS = [
  { internalId: '1563', launcher: 'nft17g7mk773vsle96sgcc2ahvezqcth0y7gpftcmnm5mq8z8dhed9qqy2x3l4' },
]

const FILES = {
  launcherMap: path.join(ROOT, 'public/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json'),
  output: path.join(ROOT, 'public/assets/BigPulp/mintgarden_sales_index_v1.json'),
  checkpoint: path.join(ROOT, 'public/assets/BigPulp/.sales_index_checkpoint.json'),
  errors: path.join(ROOT, 'public/assets/BigPulp/.sales_index_errors.json'),
  log: path.join(ROOT, 'public/assets/BigPulp/.sales_index_build.log'),
}

// API Endpoints
const NFT_DETAILS_ENDPOINT = `https://api.mintgarden.io/nfts/{launcher}`

// Checkpoint interval (save every N NFTs)
const CHECKPOINT_INTERVAL = 100

// ============================================================================
// Adaptive Rate Limiter
// ============================================================================

class AdaptiveRateLimiter {
  constructor() {
    this.baseDelay = 1000 // Start with 1 second
    this.currentDelay = 1000
    this.maxDelay = 10000 // Max 10 seconds
    this.minDelay = 500 // Min 500ms
    this.successStreak = 0
    this.failureStreak = 0
    this.rateLimitCount = 0
    this.circuitBreakerThreshold = 5 // Pause if 5 rate limits in a row
  }
  
  async wait() {
    await new Promise(resolve => setTimeout(resolve, this.currentDelay))
  }
  
  onSuccess() {
    this.successStreak++
    this.failureStreak = 0
    
    // Gradually decrease delay after successful requests
    if (this.successStreak >= 10) {
      this.currentDelay = Math.max(
        this.minDelay,
        this.currentDelay - 50 // Decrease by 50ms
      )
      this.successStreak = 0
    }
  }
  
  onRateLimit() {
    this.rateLimitCount++
    this.failureStreak++
    this.successStreak = 0
    
    // Exponential backoff for rate limits
    this.currentDelay = Math.min(
      this.maxDelay,
      this.currentDelay * 2 // Double the delay
    )
    
    // Circuit breaker: if too many rate limits, pause longer
    if (this.failureStreak >= this.circuitBreakerThreshold) {
      this.currentDelay = this.maxDelay
      return true // Signal to pause
    }
    
    return false
  }
  
  onError() {
    this.failureStreak++
    this.successStreak = 0
    
    // Moderate increase for other errors
    this.currentDelay = Math.min(
      this.maxDelay,
      this.currentDelay * 1.5 // Increase by 50%
    )
  }
  
  getStats() {
    return {
      currentDelay: this.currentDelay,
      rateLimitCount: this.rateLimitCount,
      successStreak: this.successStreak,
      failureStreak: this.failureStreak,
    }
  }
}

// ============================================================================
// Checkpoint Manager
// ============================================================================

class CheckpointManager {
  constructor(filePath) {
    this.filePath = filePath
  }
  
  exists() {
    return fs.existsSync(this.filePath)
  }
  
  save(progress) {
    try {
      const data = {
        ...progress,
        savedAt: new Date().toISOString(),
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
      return true
    } catch (err) {
      console.error(`Failed to save checkpoint: ${err.message}`)
      return false
    }
  }
  
  load() {
    try {
      if (!this.exists()) return null
      const data = fs.readFileSync(this.filePath, 'utf8')
      return JSON.parse(data)
    } catch (err) {
      console.warn(`Failed to load checkpoint: ${err.message}`)
      return null
    }
  }
  
  clear() {
    try {
      if (this.exists()) {
        fs.unlinkSync(this.filePath)
      }
      return true
    } catch (err) {
      console.warn(`Failed to clear checkpoint: ${err.message}`)
      return false
    }
  }
}

// ============================================================================
// Logger
// ============================================================================

class Logger {
  constructor(logFile) {
    this.logFile = logFile
    this.logStream = null
  }
  
  open() {
    try {
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' })
    } catch (err) {
      console.warn(`Failed to open log file: ${err.message}`)
    }
  }
  
  close() {
    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }
  }
  
  log(level, message, context = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    }
    
    const logLine = `[${timestamp}] [${level}] ${message}${Object.keys(context).length > 0 ? ' ' + JSON.stringify(context) : ''}\n`
    
    // Write to console
    if (level === 'ERROR') {
      console.error(logLine.trim())
    } else if (level === 'WARN') {
      console.warn(logLine.trim())
    } else {
      console.log(logLine.trim())
    }
    
    // Write to file
    if (this.logStream) {
      this.logStream.write(logLine)
    }
  }
  
  info(message, context) {
    this.log('INFO', message, context)
  }
  
  warn(message, context) {
    this.log('WARN', message, context)
  }
  
  error(message, context) {
    this.log('ERROR', message, context)
  }
  
  debug(message, context) {
    this.log('DEBUG', message, context)
  }
}

// ============================================================================
// Error Logger
// ============================================================================

class ErrorLogger {
  constructor(filePath) {
    this.filePath = filePath
    this.errors = []
  }
  
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8')
        this.errors = JSON.parse(data)
      }
    } catch (err) {
      // Ignore, start fresh
    }
  }
  
  add(launcher, errorType, errorMessage, retryCount = 0) {
    this.errors.push({
      launcher,
      errorType,
      errorMessage,
      retryCount,
      timestamp: new Date().toISOString(),
    })
  }
  
  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.errors, null, 2) + '\n', 'utf8')
    } catch (err) {
      console.error(`Failed to save error log: ${err.message}`)
    }
  }
  
  getStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      byRetryCount: {},
    }
    
    for (const error of this.errors) {
      stats.byType[error.errorType] = (stats.byType[error.errorType] || 0) + 1
      stats.byRetryCount[error.retryCount] = (stats.byRetryCount[error.retryCount] || 0) + 1
    }
    
    return stats
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

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

// Fetch with enhanced retry logic
async function fetchWithRetry(url, maxRetries = 10, logger = null) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      
      // Rate limit handling
      if (response.status === 429) {
        if (attempt < maxRetries - 1) {
          const retryAfter = response.headers.get('Retry-After')
          let backoff = Math.min(5000 * Math.pow(2, attempt), 30000) // Max 30 seconds
          
          if (retryAfter) {
            const retryAfterSeconds = parseInt(retryAfter, 10)
            if (!isNaN(retryAfterSeconds)) {
              backoff = retryAfterSeconds * 1000
            }
          }
          
          if (logger) logger.warn(`Rate limited (429), retrying in ${backoff}ms... (attempt ${attempt + 1}/${maxRetries})`, { url })
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }
      }
      
      // Server errors (5xx) - retry
      if (response.status >= 500 && response.status < 600) {
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(2000 * Math.pow(2, attempt), 10000)
          if (logger) logger.warn(`Server error (${response.status}), retrying in ${backoff}ms... (attempt ${attempt + 1}/${maxRetries})`, { url })
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
        // Network errors - retry with backoff
        if (err.message.includes('fetch') || err.message.includes('network') || err.name === 'TypeError') {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 5000)
          if (logger) logger.warn(`Network error, retrying in ${backoff}ms... (attempt ${attempt + 1}/${maxRetries})`, { url, error: err.message })
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }
      }
    }
  }
  throw lastError || new Error('Failed to fetch after retries')
}

// Extract trade history from MintGarden NFT details
function extractTradeHistoryFromMintGarden(nftDetails, launcher, verbose = false, logger = null) {
  if (!nftDetails || !nftDetails.events || !Array.isArray(nftDetails.events)) {
    if (verbose && logger) logger.debug(`No events array for ${launcher}`)
    return []
  }
  
  if (verbose && logger) logger.debug(`Found ${nftDetails.events.length} total events for ${launcher}`)
  
  const trades = []
  
  for (const event of nftDetails.events) {
    // Only process type 2 (TRADE events)
    if (event.type !== 2) continue
    
    if (verbose && logger) {
      logger.debug(`Trade event: type=${event.type}, xch_price=${event.xch_price}, timestamp=${event.timestamp}`, { launcher })
    }
    
    // Extract price
    let priceXch = event.xch_price
    
    // If xch_price is null, compute from payments array
    if (priceXch === null || priceXch === undefined) {
      if (event.payments && Array.isArray(event.payments)) {
        let totalXch = 0
        for (const payment of event.payments) {
          // Skip negative amounts (royalties)
          if (payment.amount < 0) continue
          
          // Amount is in mojos (1 XCH = 1e12 mojos)
          // Only count XCH payments (asset_id === null means XCH)
          if (payment.amount && payment.asset_id === null) {
            totalXch += payment.amount / 1e12
          }
        }
        priceXch = totalXch > 0 ? totalXch : null
      }
    }
    
    // Filter: must be >= 0.8 XCH (secondary market only)
    if (priceXch && priceXch >= MIN_SECONDARY_PRICE) {
      trades.push({
        launcher: launcher,
        timestamp: event.timestamp,
        price_xch_reported: event.xch_price,
        price_xch_computed: event.xch_price === null ? priceXch : null,
        price_xch: priceXch,
        buyer_address: event.address?.encoded_id || null,
        seller_address: event.previous_address?.encoded_id || null,
        buyer_profile: event.owner || null,
        seller_profile: event.previous_owner || null,
        event_index: event.event_index,
        nft_id: event.nft_id,
        payments: event.payments || null
      })
    }
  }
  
  return trades
}

// Normalize price (handle mojos vs XCH)
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

// Create stable dedupe key
function createDedupeKey(trade, launcher) {
  const timestamp = trade.timestamp || 'unknown'
  const eventIndex = trade.event_index || 'unknown'
  
  return `${launcher}|${timestamp}|${eventIndex}`
}

// Compute anti-manipulation flags
function computeFlags(trade, floorXch) {
  const flags = {
    same_owner: false,
    extreme: false
  }
  
  // Check same owner (if addresses available)
  if (trade.buyer_address && trade.seller_address && 
      trade.buyer_address === trade.seller_address) {
    flags.same_owner = true
  }
  
  // Check extreme price
  if (trade.price_xch !== null) {
    if (trade.price_xch <= 0) {
      flags.extreme = true
    } else if (floorXch && trade.price_xch > 50 * floorXch) {
      flags.extreme = true
    }
  }
  
  return flags
}

// Format progress bar
function formatProgressBar(current, total, width = 20) {
  const percent = current / total
  const filled = Math.floor(percent * width)
  const empty = width - filled
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']'
}

// Calculate ETA
function calculateETA(processed, total, startTime) {
  if (processed === 0) return null
  
  const elapsed = Date.now() - startTime
  const rate = processed / elapsed // NFTs per millisecond
  const remaining = total - processed
  const etaMs = remaining / rate
  
  const etaMinutes = Math.ceil(etaMs / 60000)
  return etaMinutes
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const validationMode = args.includes('--validate') || process.env.VALIDATION_MODE === 'true'
  const freshMode = args.includes('--fresh')
  const resumeMode = args.includes('--resume')
  
  // Initialize logger
  const logger = new Logger(FILES.log)
  logger.open()
  
  // Initialize error logger
  const errorLogger = new ErrorLogger(FILES.errors)
  errorLogger.load()
  
  // Initialize checkpoint manager
  const checkpointManager = new CheckpointManager(FILES.checkpoint)
  
  logger.info('='.repeat(60))
  logger.info('MintGarden Sales Index Build - Robust Version')
  logger.info('='.repeat(60))
  logger.info(`Filter: Only including sales >= ${MIN_SECONDARY_PRICE} XCH (secondary market)`)
  
  // Check for global fetch (Node 18+)
  if (typeof fetch === 'undefined') {
    logger.error('global fetch is not available. This script requires Node.js 18+')
    process.exit(1)
  }
  
  // VALIDATION MODE
  if (validationMode) {
    logger.info('🔍 VALIDATION MODE: Testing on known NFTs with sales...\n')
    
    for (const testNft of KNOWN_SALES_TEST_NFTS) {
      logger.info(`Testing NFT #${testNft.internalId} (${testNft.launcher})...`)
      try {
        const url = NFT_DETAILS_ENDPOINT.replace('{launcher}', testNft.launcher)
        logger.info(`Fetching: ${url}`)
        const nftDetails = await fetchWithRetry(url, 5, logger)
        
        logger.info(`✓ Fetched NFT details`)
        logger.info(`Events array exists: ${!!nftDetails.events}`)
        logger.info(`Events count: ${nftDetails.events?.length || 0}`)
        
        if (nftDetails.events && nftDetails.events.length > 0) {
          const eventTypes = [...new Set(nftDetails.events.map(e => e.type))]
          logger.info(`Event types found: ${eventTypes.join(', ')}`)
        }
        
        const trades = extractTradeHistoryFromMintGarden(nftDetails, testNft.launcher, true, logger)
        
        logger.info(`✓ Found ${trades.length} trades`)
        if (trades.length > 0) {
          trades.forEach((t, i) => {
            logger.info(`  Trade ${i + 1}: ${t.price_xch} XCH at ${t.timestamp}`)
          })
        } else {
          logger.warn(`⚠ WARNING: Expected to find trades but found none!`)
          logger.warn(`This indicates a problem with extraction logic.`)
        }
      } catch (err) {
        logger.error(`Error: ${err.message}`, { stack: err.stack })
      }
      logger.info('')
    }
    
    logger.info('✅ Validation complete. If trades were found, you can run the full build.')
    logger.info('   Run without --validate to process all NFTs.\n')
    logger.close()
    process.exit(0)
  }
  
  // Load launcher map
  logger.info('\n[Step 1] Loading launcher map...')
  let launcherMap
  let reverseMap = new Map()
  
  try {
    launcherMap = readJson(FILES.launcherMap)
    logger.info(`✓ Loaded launcher map: ${launcherMap.count || Object.keys(launcherMap.map || {}).length} entries`)
    
    // Build reverse map: launcher -> internal_id
    if (launcherMap.map) {
      for (const [internalId, launcher] of Object.entries(launcherMap.map)) {
        reverseMap.set(launcher, internalId)
      }
      logger.info(`✓ Built reverse map: ${reverseMap.size} entries`)
    }
  } catch (err) {
    logger.error(`Failed to load launcher map: ${err.message}`)
    logger.error('Cannot proceed without launcher map')
    process.exit(1)
  }
  
  // Get all launchers
  logger.info('\n[Step 2] Getting all launchers from launcher map...')
  const allNfts = []
  
  for (const [launcher, internalId] of reverseMap.entries()) {
    allNfts.push({ launcher, internalId })
  }
  
  logger.info(`✓ Found ${allNfts.length} launchers from map`)
  
  // Load checkpoint or start fresh
  let checkpoint = null
  let processedLaunchers = new Set()
  let allTrades = []
  let seenKeys = new Set()
  let startIndex = 0
  
  if (!freshMode && checkpointManager.exists()) {
    checkpoint = checkpointManager.load()
    if (checkpoint) {
      logger.info(`\n[Step 3] Found checkpoint from ${checkpoint.savedAt}`)
      logger.info(`  Processed: ${checkpoint.processedCount || 0}/${allNfts.length}`)
      logger.info(`  Trades found: ${checkpoint.tradesFound || 0}`)
      
      if (resumeMode || confirmResume()) {
        processedLaunchers = new Set(checkpoint.processedLaunchers || [])
        allTrades = checkpoint.trades || []
        seenKeys = new Set(checkpoint.seenKeys || [])
        startIndex = checkpoint.lastIndex || 0
        logger.info(`✓ Resuming from checkpoint at index ${startIndex}`)
      } else {
        logger.info('Starting fresh build (checkpoint ignored)')
        checkpointManager.clear()
      }
    }
  }
  
  // Initialize rate limiter
  const rateLimiter = new AdaptiveRateLimiter()
  
  // Process NFTs
  logger.info(`\n[Step 4] Fetching trade history from NFT details...`)
  logger.info(`  Processing ${allNfts.length} NFTs with adaptive rate limiting...`)
  logger.info(`  Checkpoint will be saved every ${CHECKPOINT_INTERVAL} NFTs\n`)
  
  const startTime = Date.now()
  let processed = startIndex
  let successCount = checkpoint?.successCount || 0
  let errorCount = checkpoint?.errorCount || 0
  let tradesFound = checkpoint?.tradesFound || 0
  
  // Compute floor from offers index if available
  let floorXch = null
  try {
    const offersPath = path.join(ROOT, 'public/assets/BigPulp/mintgarden_offers_index_v1.json')
    if (fs.existsSync(offersPath)) {
      const offersIndex = readJson(offersPath)
      if (offersIndex.market_stats?.floor_xch) {
        floorXch = offersIndex.market_stats.floor_xch
        logger.info(`  Using floor from offers index: ${floorXch.toFixed(2)} XCH`)
      }
    }
  } catch (err) {
    // Ignore
  }
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    logger.warn('\n\n⚠ Interrupted by user. Saving checkpoint...')
    saveCheckpoint()
    logger.info('✓ Checkpoint saved. Run with --resume to continue.')
    logger.close()
    process.exit(0)
  })
  
  function saveCheckpoint() {
    const progress = {
      processedLaunchers: Array.from(processedLaunchers),
      trades: allTrades,
      seenKeys: Array.from(seenKeys),
      lastIndex: processed,
      processedCount: processed,
      successCount,
      errorCount,
      tradesFound,
      rateLimiterStats: rateLimiter.getStats(),
    }
    checkpointManager.save(progress)
  }
  
  for (let i = startIndex; i < allNfts.length; i++) {
    const { launcher, internalId } = allNfts[i]
    
    // Skip if already processed
    if (processedLaunchers.has(launcher)) {
      continue
    }
    
    try {
      // Wait for rate limiter
      await rateLimiter.wait()
      
      const url = NFT_DETAILS_ENDPOINT.replace('{launcher}', launcher)
      const nftDetails = await fetchWithRetry(url, 10, logger)
      
      const trades = extractTradeHistoryFromMintGarden(nftDetails, launcher, false, logger)
      
      for (const trade of trades) {
        const key = createDedupeKey(trade, launcher)
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          allTrades.push(trade)
          tradesFound++
        }
      }
      
      processedLaunchers.add(launcher)
      successCount++
      processed++
      rateLimiter.onSuccess()
      
      // Progress update and checkpoint
      if (processed % CHECKPOINT_INTERVAL === 0 || processed === allNfts.length) {
        const percent = ((processed / allNfts.length) * 100).toFixed(1)
        const progressBar = formatProgressBar(processed, allNfts.length)
        const eta = calculateETA(processed, allNfts.length, startTime)
        const stats = rateLimiter.getStats()
        
        logger.info(`${progressBar} ${percent}% (${processed}/${allNfts.length})`)
        logger.info(`  Trades found: ${tradesFound} | Success: ${successCount} | Errors: ${errorCount}`)
        logger.info(`  Current delay: ${stats.currentDelay}ms | Rate limits: ${stats.rateLimitCount}`)
        if (eta) logger.info(`  ETA: ~${eta} minutes`)
        
        // Save checkpoint
        saveCheckpoint()
        logger.debug(`Checkpoint saved at ${processed} NFTs`)
      }
      
    } catch (err) {
      errorCount++
      processed++
      processedLaunchers.add(launcher) // Mark as processed even if failed
      
      // Categorize error
      let errorType = 'UNKNOWN'
      if (err.message.includes('429')) {
        errorType = 'RATE_LIMIT'
        const shouldPause = rateLimiter.onRateLimit()
        if (shouldPause) {
          logger.warn(`Circuit breaker triggered. Pausing for ${rateLimiter.currentDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, rateLimiter.currentDelay))
        }
      } else if (err.message.includes('5')) {
        errorType = 'SERVER_ERROR'
        rateLimiter.onError()
      } else if (err.message.includes('4')) {
        errorType = 'CLIENT_ERROR'
        // Don't retry client errors, just log
      } else {
        errorType = 'NETWORK_ERROR'
        rateLimiter.onError()
      }
      
      errorLogger.add(launcher, errorType, err.message, 0)
      
      if (errorCount <= 10 || errorCount % 100 === 0) {
        logger.warn(`Failed to fetch details for ${launcher}: ${err.message}`, { errorType })
      }
    }
  }
  
  logger.info(`\n✓ Completed processing ${allNfts.length} NFTs`)
  logger.info(`  Successful: ${successCount}`)
  logger.info(`  Errors: ${errorCount}`)
  logger.info(`  Total unique trades found: ${tradesFound}`)
  
  // Process trades and map to internal IDs
  logger.info('\n[Step 5] Processing trades and mapping to internal IDs...')
  
  const events = []
  const unmapped = []
  let mappedCount = 0
  let validPriceCount = 0
  
  for (const trade of allTrades) {
    const launcher = trade.launcher
    const internalId = launcher ? reverseMap.get(launcher) : null
    
    const priceFinal = normalizePrice(trade.price_xch)
    const isValidPrice = priceFinal !== null && priceFinal > 0
    
    if (isValidPrice) {
      validPriceCount++
    }
    
    // Compute flags
    const flags = computeFlags(trade, floorXch)
    
    // Store minimal raw fields
    const raw = {
      timestamp: trade.timestamp || null,
      event_index: trade.event_index || null,
      nft_id: trade.nft_id || null,
      collection_id: COLLECTION_ID
    }
    
    const event = {
      internal_id: internalId || null,
      launcher: launcher || null,
      timestamp: trade.timestamp || null,
      price_raw: trade.price_xch_reported || trade.price_xch_computed || null,
      price_xch_reported: trade.price_xch_reported !== null ? normalizePrice(trade.price_xch_reported) : null,
      price_xch_computed: trade.price_xch_computed !== null ? normalizePrice(trade.price_xch_computed) : null,
      price_xch: priceFinal,
      is_valid_price: isValidPrice,
      flags,
      buyer_address: trade.buyer_address || null,
      seller_address: trade.seller_address || null,
      buyer_profile: trade.buyer_profile || null,
      seller_profile: trade.seller_profile || null,
      collection_id: COLLECTION_ID,
      token_id: null,
      currency: 'xch',
      raw
    }
    
    events.push(event)
    
    if (internalId) {
      mappedCount++
    } else if (unmapped.length < 200) {
      unmapped.push({
        launcher: launcher || 'unknown',
        timestamp: trade.timestamp || null,
        price_xch: priceFinal,
        source: 'mintgarden'
      })
    }
  }
  
  logger.info(`✓ Processed ${events.length} trades`)
  logger.info(`  Mapped to internal IDs: ${mappedCount}`)
  logger.info(`  Valid prices: ${validPriceCount}`)
  logger.info(`  Unmapped sample: ${unmapped.length}`)
  
  // Sort events deterministically
  logger.info('\n[Step 6] Sorting events deterministically...')
  events.sort((a, b) => {
    if (a.internal_id && b.internal_id) {
      const idA = parseInt(a.internal_id, 10)
      const idB = parseInt(b.internal_id, 10)
      if (!isNaN(idA) && !isNaN(idB) && idA !== idB) {
        return idA - idB
      }
    }
    if (a.timestamp && b.timestamp) {
      return a.timestamp.localeCompare(b.timestamp)
    }
    if (a.launcher && b.launcher) {
      return a.launcher.localeCompare(b.launcher)
    }
    return 0
  })
  
  // Build output
  logger.info('\n[Step 7] Building output JSON...')
  
  const generatedAt = new Date().toISOString()
  
  const output = {
    schema_version: '1.0',
    generated_at: generatedAt,
    collection_id: COLLECTION_ID,
    count_events: events.length,
    count_mapped: mappedCount,
    count_valid_prices: validPriceCount,
    build_stats: {
      total_nfts: allNfts.length,
      processed_nfts: processed,
      success_count: successCount,
      error_count: errorCount,
      trades_found: tradesFound,
      rate_limiter_stats: rateLimiter.getStats(),
      error_stats: errorLogger.getStats(),
    },
    events,
    unmapped_sample: unmapped
  }
  
  // Write output
  logger.info('\n[Step 8] Writing output file...')
  writeJson(FILES.output, output)
  
  // Save error log
  errorLogger.save()
  
  // Clear checkpoint on success
  checkpointManager.clear()
  
  logger.info(`\n✓ Success! Sales index written to: ${FILES.output}`)
  logger.info(`  Total trades: ${events.length}`)
  logger.info(`  Mapped to internal IDs: ${mappedCount}`)
  logger.info(`  Valid prices: ${validPriceCount}`)
  logger.info(`  Unmapped sample: ${unmapped.length}`)
  
  // Summary statistics
  if (events.length > 0) {
    const prices = events.filter(e => e.price_xch).map(e => e.price_xch)
    if (prices.length > 0) {
      prices.sort((a, b) => a - b)
      const minPrice = prices[0]
      const maxPrice = prices[prices.length - 1]
      const medianPrice = prices[Math.floor(prices.length / 2)]
      logger.info(`\n  Price statistics:`)
      logger.info(`    Min: ${minPrice.toFixed(2)} XCH`)
      logger.info(`    Median: ${medianPrice.toFixed(2)} XCH`)
      logger.info(`    Max: ${maxPrice.toFixed(2)} XCH`)
    }
  }
  
  logger.info('\n✅ Build complete!')
  logger.close()
}

// Helper function for resume confirmation (simplified - always resume in non-interactive mode)
function confirmResume() {
  // In non-interactive mode, always resume
  return true
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err)
  console.error(err.stack)
  process.exit(1)
})
