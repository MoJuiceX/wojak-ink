/**
 * Big Pulp: Build Value Model v2
 *
 * Generates value_model_v2.json and value_model_diagnostics_v2.json using empirical Bayes
 * trait-based pricing models for ASK (listings) and SALES (sales), with market-vibes reactivity.
 *
 * Key differences from v1:
 * - No pair interactions (simpler, faster)
 * - Different half-lives: Sales 90d, Asks 14d (reactive)
 * - Ask price cap: 5x floor (vs 2x in conservative)
 * - Delusion threshold: 3x floor (vs 2x)
 * - Very weak rarity prior: Only when BOTH models have nEff < 1
 * - Sales baseline anchor: Use sales median as stability reference
 *
 * Inputs:
 * - public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json (metadata with traits)
 * - public/assets/BigPulp/mintgarden_offers_index_v1.json (listings)
 * - public/assets/BigPulp/mintgarden_sales_index_v1.json (sales)
 *
 * Outputs:
 * - public/assets/BigPulp/value_model_v2.json
 * - public/assets/BigPulp/value_model_diagnostics_v2.json
 *
 * Usage:
 *   node scripts/build_bigpulp_value_model_v2.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const FILES = {
  metadata: path.join(ROOT, 'public/Wojak_Farmers_Plot_metadata_FIXED DRAC.json'),
  offersIndex: path.join(ROOT, 'public/assets/BigPulp/mintgarden_offers_index_v1.json'),
  salesIndex: path.join(ROOT, 'public/assets/BigPulp/mintgarden_sales_index_v1.json'),
  outputModel: path.join(ROOT, 'public/assets/BigPulp/value_model_v2.json'),
  outputDiagnostics: path.join(ROOT, 'public/assets/BigPulp/value_model_diagnostics_v2.json'),
}

// Category normalization map
const CATEGORY_MAP = {
  'Base': 'base',
  'Clothes': 'clothes',
  'Head': 'head',
  'Face': 'face',
  'Mouth': 'mouth',
  'Face Wear': 'facewear',
  'Background': 'background'
}

// K values by category (smoothing constants)
const K_BY_CATEGORY = {
  base: 15,
  head: 20,
  facewear: 20,
  face: 20,
  mouth: 20,
  clothes: 20,
  background: 10
}

// v2: Different half-lives for market-vibes reactivity
const HALF_LIFE_DAYS_SALES = 90
const HALF_LIFE_DAYS_ASKS = 14

// v2: Price caps and thresholds
const CAP_MULT_ASK = 5.0  // Cap ask prices at 5x floor
const DELUSION_THRESHOLD_MULT = 3.0  // Delusion threshold at 3x floor

// v2: Very weak rarity prior (only when both models missing)
const PRIOR_BETA = 0.06

// CoinGecko API for XCH/USD (computed at build time)
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=chia&vs_currencies=usd'

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }
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

// Compute SHA256 hash
function computeSHA256(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

// Get git SHA if available
function getGitSHA() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: ROOT }).trim()
  } catch (err) {
    return null
  }
}

// Sort object keys deterministically
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj
  }
  
  const sorted = {}
  const keys = Object.keys(obj).sort((a, b) => {
    // Try numeric comparison first
    const numA = parseInt(a, 10)
    const numB = parseInt(b, 10)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    // Otherwise alphabetical
    return a.localeCompare(b)
  })
  
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key])
  }
  
  return sorted
}

// Weighted median (approximate via sorting + cumulative weights)
function weightedMedian(values, weights) {
  if (values.length === 0) return null
  if (values.length === 1) return values[0]
  
  // Create pairs and sort by value
  const pairs = values.map((v, i) => ({ value: v, weight: weights[i] || 0 }))
  pairs.sort((a, b) => a.value - b.value)
  
  // Compute cumulative weights
  let cumWeight = 0
  const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0)
  const targetWeight = totalWeight / 2
  
  for (const pair of pairs) {
    cumWeight += pair.weight
    if (cumWeight >= targetWeight) {
      return pair.value
    }
  }
  
  // Fallback to last value
  return pairs[pairs.length - 1].value
}

// Weighted mean
function weightedMean(values, weights) {
  if (values.length === 0) return null
  
  let sum = 0
  let totalWeight = 0
  
  for (let i = 0; i < values.length; i++) {
    const w = weights[i] || 0
    sum += values[i] * w
    totalWeight += w
  }
  
  return totalWeight > 0 ? sum / totalWeight : null
}

// Weighted quantile
function weightedQuantile(values, weights, q) {
  if (values.length === 0) return null
  
  const pairs = values.map((v, i) => ({ value: v, weight: weights[i] || 0 }))
  pairs.sort((a, b) => a.value - b.value)
  
  const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0)
  const targetWeight = q * totalWeight
  
  let cumWeight = 0
  for (const pair of pairs) {
    cumWeight += pair.weight
    if (cumWeight >= targetWeight) {
      return pair.value
    }
  }
  
  return pairs[pairs.length - 1].value
}

// Robust MAD (Median Absolute Deviation)
function robustMAD(values, median) {
  if (values.length === 0) return 0
  
  const deviations = values.map(v => Math.abs(v - median))
  const mad = weightedMedian(deviations, Array(values.length).fill(1))
  
  return mad === null ? 0 : 1.4826 * mad
}

// Robust z-score
function robustZScore(value, median, mad) {
  if (mad === 0 || mad === null) return 0
  return Math.abs(value - median) / (mad + 1e-10)
}

// Sigmoid
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

// Clamp to [0, 1]
function clamp01(x) {
  return Math.max(0, Math.min(1, x))
}

// Load and normalize metadata
function loadMetadata() {
  console.log('[Step 1] Loading metadata...')
  const metadata = readJson(FILES.metadata)
  
  if (!Array.isArray(metadata)) {
    throw new Error('Metadata must be an array')
  }
  
  const traitsById = {}
  
  for (const item of metadata) {
    const name = item.name || ''
    const match = name.match(/#(\d+)$/)
    if (!match) continue
    
    const id = match[1]
    const traits = {}
    
    if (item.attributes && Array.isArray(item.attributes)) {
      for (const attr of item.attributes) {
        const category = CATEGORY_MAP[attr.trait_type] || attr.trait_type?.toLowerCase()
        if (category && attr.value) {
          traits[category] = attr.value
        }
      }
    }
    
    traitsById[id] = traits
  }
  
  console.log(`✓ Loaded ${Object.keys(traitsById).length} NFTs with traits`)
  return { traitsById, metadata }
}

// Build trait key (Category::Trait)
function buildTraitKey(category, trait) {
  return `${category}::${trait}`
}

// Load offers index and extract asks (v2: apply price cap)
function loadAsks(offersIndex) {
  if (!offersIndex || !offersIndex.listings_by_id) {
    return []
  }
  
  const asks = []
  const floorXch = offersIndex.market_stats?.floor_xch || offersIndex.floor_xch || null
  
  for (const [id, data] of Object.entries(offersIndex.listings_by_id)) {
    const listing = data.best_listing
    if (!listing || !listing.price_xch) continue
    
    // v2: Apply price cap (5x floor)
    let priceXch = listing.price_xch
    if (floorXch && floorXch > 0) {
      const capPrice = floorXch * CAP_MULT_ASK
      priceXch = Math.min(priceXch, capPrice)
    }
    
    asks.push({
      id,
      price_xch: priceXch,
      updated_at: listing.updated_at || listing.timestamp || null,
      floor_xch: floorXch
    })
  }
  
  return asks
}

// Load sales index and extract clears (v2: use event.price_xch as authoritative)
function loadClears(salesIndex) {
  if (!salesIndex || !salesIndex.events) {
    return []
  }
  
  const clears = []
  
  for (const event of salesIndex.events) {
    if (!event.is_valid_price || !event.price_xch) continue
    
    // v2: Use event.price_xch (already cleaned) - do NOT recompute
    clears.push({
      id: event.internal_id,
      price_xch: event.price_xch,  // Authoritative source
      timestamp: event.timestamp,
      flags: event.flags || {}
    })
  }
  
  return clears
}

// Compute time decay weight (v2: true half-life formula)
function computeTimeDecay(timestamp, halfLifeDays) {
  if (!timestamp) return 1.0
  
  const now = Date.now()
  const eventTime = new Date(timestamp).getTime()
  const ageDays = (now - eventTime) / (1000 * 60 * 60 * 24)
  
  // True half-life formula: exp(-LN2 * ageDays / halfLifeDays)
  return Math.exp(-Math.LN2 * ageDays / halfLifeDays)
}

// Compute robust weights for observations
function computeWeights(observations, isAsk = false, floorXch = null) {
  if (observations.length === 0) return []
  
  // Extract log prices
  const logPrices = observations.map(o => Math.log(Math.max(o.price_xch, 1e-10)))
  
  // Compute global median and MAD
  const median = weightedMedian(logPrices, Array(logPrices.length).fill(1))
  const mad = robustMAD(logPrices, median)
  
  const weights = []
  
  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i]
    const logPrice = logPrices[i]
    
    // Time decay (v2: different half-lives per model type)
    let wTime = 1.0
    if (isAsk && obs.updated_at) {
      wTime = computeTimeDecay(obs.updated_at, HALF_LIFE_DAYS_ASKS)
    } else if (!isAsk && obs.timestamp) {
      wTime = computeTimeDecay(obs.timestamp, HALF_LIFE_DAYS_SALES)
    } else if (!isAsk) {
      wTime = 0.5 // Default for sales without timestamp
    }
    
    // Outlier downweight
    const z = robustZScore(logPrice, median, mad)
    const wOutlier = 1 / (1 + Math.pow(z / 3, 2))
    
    // Flag downweight (for sales)
    let wFlag = 1.0
    if (!isAsk && obs.flags) {
      if (obs.flags.same_owner) wFlag *= 0.2
      if (obs.flags.extreme) wFlag *= 0.3
    }
    
    // Delusion downweight (v2: threshold at 3x floor)
    let wDelusion = 1.0
    if (isAsk && floorXch && obs.floor_xch) {
      const floorMult = obs.price_xch / obs.floor_xch
      wDelusion = 1 / (1 + Math.pow(Math.max(0, floorMult - DELUSION_THRESHOLD_MULT), 2))
    }
    
    const weight = wTime * wOutlier * wFlag * wDelusion
    weights.push(weight)
  }
  
  return weights
}

// Build trait model (ASK or CLEAR)
function buildTraitModel(observations, weights, traitsById, baselineLog, modelType) {
  const traitDeltas = {}
  const traitSupport = {}
  
  // Group observations by trait
  const traitObservations = {}
  
  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i]
    const traits = traitsById[obs.id]
    if (!traits) continue
    
    const logPrice = Math.log(Math.max(obs.price_xch, 1e-10))
    const weight = weights[i]
    
    for (const [category, trait] of Object.entries(traits)) {
      const traitKey = buildTraitKey(category, trait)
      
      if (!traitObservations[traitKey]) {
        traitObservations[traitKey] = []
      }
      
      traitObservations[traitKey].push({ logPrice, weight })
    }
  }
  
  // Compute deltas for each trait
  for (const [traitKey, obsList] of Object.entries(traitObservations)) {
    if (obsList.length === 0) continue
    
    const logPrices = obsList.map(o => o.logPrice)
    const traitWeights = obsList.map(o => o.weight)
    
    // Winsorize to [q10, q90]
    const q10 = weightedQuantile(logPrices, traitWeights, 0.1)
    const q90 = weightedQuantile(logPrices, traitWeights, 0.9)
    
    const winsorized = logPrices.map((p, i) => {
      if (p < q10) return q10
      if (p > q90) return q90
      return p
    })
    
    // Compute weighted mean
    const meanT = weightedMean(winsorized, traitWeights)
    if (meanT === null) continue
    
    // Naive delta
    const naiveDelta = meanT - baselineLog
    
    // Effective support
    const nEff = traitWeights.reduce((sum, w) => sum + w, 0)
    
    // Category from trait key
    const category = traitKey.split('::')[0]
    const kCategory = K_BY_CATEGORY[category] || 20
    
    // Shrinkage
    const delta = naiveDelta * (nEff / (nEff + kCategory))
    
    traitDeltas[traitKey] = delta
    traitSupport[traitKey] = nEff
  }
  
  return { traitDeltas, traitSupport }
}

// Build very weak rarity prior (v2: only when both models missing)
function buildRarityPrior(traitsById, salesModel, askModel) {
  // Compute trait frequencies from full metadata
  const traitFreqs = {}
  const traitCounts = {}
  let totalNFTs = 0
  
  for (const [id, traits] of Object.entries(traitsById)) {
    totalNFTs++
    for (const [category, trait] of Object.entries(traits)) {
      const traitKey = buildTraitKey(category, trait)
      traitCounts[traitKey] = (traitCounts[traitKey] || 0) + 1
    }
  }
  
  if (totalNFTs === 0) return {}
  
  // Compute mean frequency
  const meanFreq = totalNFTs / Object.keys(traitCounts).length
  
  // Build prior deltas (only for traits missing in BOTH models)
  const priorDeltas = {}
  
  for (const [traitKey, count] of Object.entries(traitCounts)) {
    const freq = count / totalNFTs
    const hasSales = (salesModel.traitSupport[traitKey] || 0) >= 1
    const hasAsk = (askModel.traitSupport[traitKey] || 0) >= 1
    
    // Only apply prior if BOTH models missing
    if (!hasSales && !hasAsk) {
      const logRatio = Math.log(Math.max(meanFreq / freq, 1e-10))
      const priorDelta = PRIOR_BETA * Math.max(-2, Math.min(2, logRatio))
      priorDeltas[traitKey] = priorDelta
    }
  }
  
  return priorDeltas
}

// Build pair model (v2: REMOVED - no pair interactions)
function buildPairModel_DEPRECATED(observations, weights, traitsById, baselineLog, traitDeltas) {
  const pairDeltas = {}
  const pairSupport = {}
  
  // Group observations by pair
  const pairObservations = {}
  
  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i]
    const traits = traitsById[obs.id]
    if (!traits) continue
    
    const logPrice = Math.log(Math.max(obs.price_xch, 1e-10))
    const weight = weights[i]
    
    // Get all trait keys for this NFT
    const traitKeys = Object.entries(traits).map(([cat, trait]) => buildTraitKey(cat, trait))
    
    // Consider all pairs (A, B) where A != B and both are in different categories
    for (let j = 0; j < traitKeys.length; j++) {
      for (let k = j + 1; k < traitKeys.length; k++) {
        const keyA = traitKeys[j]
        const keyB = traitKeys[k]
        
        // Ensure different categories
        const catA = keyA.split('::')[0]
        const catB = keyB.split('::')[0]
        if (catA === catB) continue
        
        // Sort for consistent key
        const pairKey = keyA < keyB ? `${keyA}||${keyB}` : `${keyB}||${keyA}`
        
        if (!pairObservations[pairKey]) {
          pairObservations[pairKey] = []
        }
        
        pairObservations[pairKey].push({ logPrice, weight, keyA, keyB })
      }
    }
  }
  
  // Compute pair deltas
  for (const [pairKey, obsList] of Object.entries(pairObservations)) {
    if (obsList.length === 0) continue
    
    const [keyA, keyB] = pairKey.split('||')
    
    // Check support requirements
    const nEffPair = obsList.reduce((sum, o) => sum + o.weight, 0)
    const nEffA = traitDeltas[keyA] !== undefined ? (traitDeltas[keyA] !== null ? 1 : 0) : 0 // Simplified check
    const nEffB = traitDeltas[keyB] !== undefined ? (traitDeltas[keyB] !== null ? 1 : 0) : 0
    
    // Safety rule: n_eff_pair >= 2.5 AND min(n_eff_traitA, n_eff_traitB) >= 5
    // For now, we'll use a simplified check - we need trait support from the model
    // We'll check this after we have trait support values
    
    if (nEffPair < 2.5) continue
    
    const logPrices = obsList.map(o => o.logPrice)
    const pairWeights = obsList.map(o => o.weight)
    
    // Weighted mean
    const meanAB = weightedMean(logPrices, pairWeights)
    if (meanAB === null) continue
    
    // Expected = baseline + delta_A + delta_B
    const deltaA = traitDeltas[keyA] || 0
    const deltaB = traitDeltas[keyB] || 0
    const expected = baselineLog + deltaA + deltaB
    
    // Naive pair delta
    const naivePair = meanAB - expected
    
    // Shrinkage
    const pairDelta = naivePair * (nEffPair / (nEffPair + K_PAIR))
    
    pairDeltas[pairKey] = pairDelta
    pairSupport[pairKey] = nEffPair
  }
  
  // Filter pairs by support and store top 5000
  const pairEntries = Object.entries(pairDeltas)
    .map(([key, delta]) => ({
      key,
      delta,
      support: pairSupport[key] || 0,
      absDelta: Math.abs(delta)
    }))
    .sort((a, b) => b.absDelta - a.absDelta)
    .slice(0, 5000)
  
  const filteredPairDeltas = {}
  const filteredPairSupport = {}
  
  for (const entry of pairEntries) {
    filteredPairDeltas[entry.key] = entry.delta
    filteredPairSupport[entry.key] = entry.support
  }
  
  return { pairDeltas: filteredPairDeltas, pairSupport: filteredPairSupport }
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

// Model Integrity Gate (v2: hard failures to prevent bad models)
function validateModel(salesModel, askModel, asks, clears, offersIndex, traitsById, predictions) {
  const errors = []
  const warnings = []
  
  // Mapping sanity
  const mappedSales = Object.keys(salesModel.traitSupport).length
  const totalSales = clears.length
  if (mappedSales / totalSales < 0.95 && totalSales > 0) {
    errors.push(`Sales mapping rate too low: ${(mappedSales / totalSales * 100).toFixed(1)}% (required: >= 95%)`)
  }
  
  const uniqueIdsInSales = new Set(clears.map(c => c.id)).size
  if (uniqueIdsInSales <= 50) {
    errors.push(`Too few unique IDs in sales: ${uniqueIdsInSales} (required: > 50)`)
  }
  
  // Sales model sanity
  if (Object.keys(salesModel.traitSupport).length === 0) {
    errors.push('Sales trait_support is empty')
  }
  
  if (salesModel.baselineLog === null || isNaN(salesModel.baselineLog)) {
    errors.push('Sales baseline_log is null or NaN')
  }
  
  // Variation sanity (use precomputed predictions)
  if (predictions.length > 0) {
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length
    const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length
    const stddev = Math.sqrt(variance)
    
    if (stddev <= 0.03) {
      errors.push(`Prediction variation too low: stddev=${stddev.toFixed(4)} XCH (required: > 0.03)`)
    }
  }
  
  // Distribution sanity
  if (salesModel.sigma !== null && (salesModel.sigma <= 0.05 || salesModel.sigma >= 2.0)) {
    errors.push(`Sales sigma out of range: ${salesModel.sigma.toFixed(4)} (required: 0.05 < sigma < 2.0)`)
  }
  
  if (askModel.sigma !== null && (askModel.sigma <= 0.05 || askModel.sigma >= 2.0)) {
    errors.push(`Ask sigma out of range: ${askModel.sigma.toFixed(4)} (required: 0.05 < sigma < 2.0)`)
  }
  
  // Ask stats sanity
  const askPrices = asks.map(a => a.price_xch)
  if (askPrices.length > 0) {
    const askMedian = weightedMedian(askPrices, Array(askPrices.length).fill(1))
    const offersMedian = offersIndex.market_stats?.median_xch
    if (offersMedian && askMedian) {
      const diff = Math.abs(askMedian - offersMedian) / offersMedian
      if (diff > 0.5) {
        warnings.push(`Ask median differs from offers median by ${(diff * 100).toFixed(1)}%`)
      }
    }
  }
  
  if (errors.length > 0) {
    console.error('\n✗ Model Integrity Gate FAILED:')
    errors.forEach(err => console.error(`  - ${err}`))
    throw new Error(`Model validation failed: ${errors.join('; ')}`)
  }
  
  if (warnings.length > 0) {
    console.warn('\n⚠ Model Integrity Gate WARNINGS:')
    warnings.forEach(warn => console.warn(`  - ${warn}`))
  }
  
  console.log('✓ Model Integrity Gate passed')
}

async function main() {
  console.log('[BigPulp Value Model] Building value model v2...\n')
  
  // Step 0: Fetch XCH/USD price (for market.xch_usd_at_build)
  console.log('[Step 0] Fetching XCH/USD price...')
  const xchUsdAtBuild = await fetchXCHPrice()
  
  // Step 1: Load metadata
  const { traitsById, metadata } = loadMetadata()
  
  // Step 2: Load offers index
  console.log('\n[Step 2] Loading offers index...')
  const offersIndex = readJson(FILES.offersIndex)
  if (!offersIndex) {
    throw new Error('Offers index not found. Run: npm run build:mintgarden-offers')
  }
  const asks = loadAsks(offersIndex)
  console.log(`✓ Loaded ${asks.length} asks`)
  
  // Step 3: Load sales index
  console.log('\n[Step 3] Loading sales index...')
  const salesIndex = readJson(FILES.salesIndex)
  const clears = salesIndex ? loadClears(salesIndex) : []
  console.log(`✓ Loaded ${clears.length} clears`)
  
  if (asks.length === 0 && clears.length === 0) {
    throw new Error('No asks or clears available. Cannot build model.')
  }
  
  // Step 4: Compute weights
  console.log('\n[Step 4] Computing robust weights...')
  const floorXch = offersIndex.market_stats?.floor_xch || offersIndex.floor_xch || null
  const askWeights = computeWeights(asks, true, floorXch)
  const clearWeights = computeWeights(clears, false, null)
  console.log(`✓ Computed weights for ${askWeights.length} asks and ${clearWeights.length} clears`)
  
  // Step 5: Compute baselines (v2: sales baseline anchor)
  console.log('\n[Step 5] Computing baselines...')
  const askLogPrices = asks.map(a => Math.log(Math.max(a.price_xch, 1e-10)))
  const salesLogPrices = clears.map(c => Math.log(Math.max(c.price_xch, 1e-10)))
  
  const askBaselineLog = weightedMedian(askLogPrices, askWeights)
  const salesBaselineLog = salesLogPrices.length > 0 ? weightedMedian(salesLogPrices, clearWeights) : null
  
  const askBaselineXch = askBaselineLog !== null ? Math.exp(askBaselineLog) : null
  const salesBaselineXch = salesBaselineLog !== null ? Math.exp(salesBaselineLog) : null
  
  console.log(`✓ Ask baseline: ${askBaselineXch !== null ? askBaselineXch.toFixed(4) : 'N/A'} XCH (log: ${askBaselineLog !== null ? askBaselineLog.toFixed(4) : 'N/A'})`)
  console.log(`✓ Sales baseline (anchor): ${salesBaselineXch !== null ? salesBaselineXch.toFixed(4) : 'N/A'} XCH (log: ${salesBaselineLog !== null ? salesBaselineLog.toFixed(4) : 'N/A'})`)
  
  // Step 6: Build trait models (v2: no pairs)
  console.log('\n[Step 6] Building trait models...')
  const askModel = buildTraitModel(asks, askWeights, traitsById, askBaselineLog, 'ask')
  const salesModel = salesBaselineLog !== null 
    ? buildTraitModel(clears, clearWeights, traitsById, salesBaselineLog, 'sales')
    : { traitDeltas: {}, traitSupport: {} }
  
  console.log(`✓ Ask model: ${Object.keys(askModel.traitDeltas).length} traits`)
  console.log(`✓ Sales model: ${Object.keys(salesModel.traitDeltas).length} traits`)
  
  // Step 7: Build very weak rarity prior (v2: only when both models missing)
  console.log('\n[Step 7] Building rarity prior...')
  const priorModel = buildRarityPrior(traitsById, salesModel, askModel)
  console.log(`✓ Prior model: ${Object.keys(priorModel).length} traits (only when both models missing)`)
  
  // Step 7.5: Model Integrity Gate (v2: hard failures)
  console.log('\n[Step 7.5] Model Integrity Gate...')
  
  // Compute variation check (predictions for 50 random NFTs)
  const randomIds = Object.keys(traitsById).sort(() => Math.random() - 0.5).slice(0, 50)
  const predictions = []
  for (const id of randomIds) {
    const traits = traitsById[id]
    if (!traits) continue
    
    let predLog = salesModel.baselineLog
    for (const [category, trait] of Object.entries(traits)) {
      const traitKey = buildTraitKey(category, trait)
      const delta = salesModel.traitDeltas[traitKey] || 0
      predLog += delta
    }
    predictions.push(Math.exp(predLog))
  }
  
  validateModel(salesModel, askModel, asks, clears, offersIndex, traitsById, predictions)
  
  // Step 8: Compute global stats
  console.log('\n[Step 8] Computing global stats...')
  const askPrices = asks.map(a => a.price_xch)
  const salesPrices = clears.map(c => c.price_xch)
  
  const askMedian = askPrices.length > 0 ? weightedMedian(askPrices, askWeights) : null
  const salesMedian = salesPrices.length > 0 ? weightedMedian(salesPrices, clearWeights) : null
  
  const askMAD = askMedian ? robustMAD(askPrices, askMedian) : null
  const salesMAD = salesMedian ? robustMAD(salesPrices, salesMedian) : null
  
  // Step 9: Compute residuals for prediction ranges
  console.log('\n[Step 9] Computing prediction ranges...')
  // For each observation, compute predicted log price and residual
  const askResiduals = []
  const clearResiduals = []
  
  // Sample a subset for efficiency (up to 1000)
  const askSample = asks.slice(0, Math.min(1000, asks.length))
  const salesSample = clears.slice(0, Math.min(1000, clears.length))
  
  for (const obs of askSample) {
    const traits = traitsById[obs.id]
    if (!traits) continue
    
    let predLog = askBaselineLog
    
    // Add trait deltas
    for (const [category, trait] of Object.entries(traits)) {
      const traitKey = buildTraitKey(category, trait)
      const delta = askModel.traitDeltas[traitKey] || 0
      predLog += delta
    }
    
    // v2: No pair deltas
    
    const actualLog = Math.log(Math.max(obs.price_xch, 1e-10))
    askResiduals.push(actualLog - predLog)
  }
  
  for (const obs of salesSample) {
    const traits = traitsById[obs.id]
    if (!traits || salesBaselineLog === null) continue
    
    let predLog = salesBaselineLog
    
    for (const [category, trait] of Object.entries(traits)) {
      const traitKey = buildTraitKey(category, trait)
      const delta = salesModel.traitDeltas[traitKey] || 0
      predLog += delta
    }
    
    const actualLog = Math.log(Math.max(obs.price_xch, 1e-10))
    clearResiduals.push(actualLog - predLog)
  }
  
  const askSigma = askResiduals.length > 0 ? 1.4826 * robustMAD(askResiduals, weightedMedian(askResiduals, Array(askResiduals.length).fill(1))) : null
  const salesSigma = clearResiduals.length > 0 ? 1.4826 * robustMAD(clearResiduals, weightedMedian(clearResiduals, Array(clearResiduals.length).fill(1))) : null
  
  // Store sigma in models for validation
  askModel.sigma = askSigma
  salesModel.sigma = salesSigma
  askModel.baselineLog = askBaselineLog
  salesModel.baselineLog = salesBaselineLog
  
  console.log(`✓ Ask sigma: ${askSigma?.toFixed(4) || 'N/A'}`)
  console.log(`✓ Sales sigma: ${salesSigma?.toFixed(4) || 'N/A'}`)
  
  // Step 10: Build output
  console.log('\n[Step 10] Building output...')
  
  const generatedAt = new Date().toISOString()
  
  // Compute input hashes
  const inputHashMetadata = computeSHA256(metadata)
  const inputHashOffers = computeSHA256(offersIndex)
  const inputHashSales = salesIndex ? computeSHA256(salesIndex) : null
  
  // Compute market quantiles (v2: for listings)
  const sortedAskPrices = [...askPrices].sort((a, b) => a - b)
  const listingsQuantiles = {}
  if (sortedAskPrices.length > 0) {
    listingsQuantiles.p10 = sortedAskPrices[Math.floor(sortedAskPrices.length * 0.1)]
    listingsQuantiles.p25 = sortedAskPrices[Math.floor(sortedAskPrices.length * 0.25)]
    listingsQuantiles.p50 = sortedAskPrices[Math.floor(sortedAskPrices.length * 0.5)]
    listingsQuantiles.p75 = sortedAskPrices[Math.floor(sortedAskPrices.length * 0.75)]
    listingsQuantiles.p90 = sortedAskPrices[Math.floor(sortedAskPrices.length * 0.9)]
  }
  
  // Sort all keys deterministically
  const sortedAskDeltas = sortObjectKeys(askModel.traitDeltas)
  const sortedSalesDeltas = sortObjectKeys(salesModel.traitDeltas)
  const sortedPriorDeltas = sortObjectKeys(priorModel)
  
  const output = {
    schema_version: '2.0',
    generated_at: generatedAt,
    collection_id: offersIndex.collection_id || 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah',
    params: {
      half_life_days_sales: HALF_LIFE_DAYS_SALES,
      half_life_days_asks: HALF_LIFE_DAYS_ASKS,
      cap_mult_ask: CAP_MULT_ASK,
      delusion_threshold_mult: DELUSION_THRESHOLD_MULT,
      k_by_category: K_BY_CATEGORY,
      prior_beta: PRIOR_BETA
    },
    floor: {
      xch: floorXch,
      id: offersIndex.floor_id || null,
      as_of: offersIndex.generated_at || null
    },
    models: {
      sales: {
        baseline_log: salesBaselineLog !== null ? salesBaselineLog : 0,
        baseline_xch: salesBaselineXch !== null ? salesBaselineXch : 0,
        trait_delta_log: sortedSalesDeltas,
        trait_support: sortObjectKeys(salesModel.traitSupport),
        sigma: salesSigma,
        global_stats: {
          n_obs: clears.length,
          median_xch: salesMedian
        }
      },
      ask: {
        baseline_log: askBaselineLog,
        baseline_xch: askBaselineXch,
        trait_delta_log: sortedAskDeltas,
        trait_support: sortObjectKeys(askModel.traitSupport),
        sigma: askSigma,
        global_stats: {
          n_obs: asks.length,
          median_xch: askMedian
        }
      }
    },
    priors: {
      trait_prior_delta_log: sortedPriorDeltas
    },
    market: {
      listings_quantiles: listingsQuantiles,
      xch_usd_at_build: xchUsdAtBuild
    },
    input_hashes: {
      metadata: inputHashMetadata,
      offers: inputHashOffers,
      sales: inputHashSales
    },
    build_metadata: {
      git_sha: getGitSHA(),
      node_version: process.version,
      build_timestamp: generatedAt
    }
  }
  
  // Step 11: Build diagnostics
  console.log('\n[Step 11] Building diagnostics...')
  
  // Top 20 trait deltas
  const topAskDeltas = Object.entries(askModel.traitDeltas)
    .map(([key, delta]) => ({ trait: key, delta }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 20)
  
  const topSalesDeltas = Object.entries(salesModel.traitDeltas)
    .map(([key, delta]) => ({ trait: key, delta }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 20)
  
  // Warnings
  const warnings = []
  if (clears.length < 10) {
    warnings.push('sales_too_sparse')
  }
  if (askMAD === 0 || salesMAD === 0) {
    warnings.push('mad_zero_fallback_used')
  }
  
  // Low coverage traits
  const lowCoverageTraits = []
  for (const [key, support] of Object.entries(askModel.traitSupport)) {
    if (support < 1.0) {
      lowCoverageTraits.push(key)
    }
  }
  if (lowCoverageTraits.length > 0) {
    warnings.push('low_coverage_traits')
  }
  
  // Validation metrics (v2: MAE + median APE on 30 random sales)
  const validationSample = clears.sort(() => Math.random() - 0.5).slice(0, 30)
  const validationErrors = []
  for (const obs of validationSample) {
    const traits = traitsById[obs.id]
    if (!traits || salesBaselineLog === null) continue
    
    let predLog = salesBaselineLog
    for (const [category, trait] of Object.entries(traits)) {
      const traitKey = buildTraitKey(category, trait)
      const delta = salesModel.traitDeltas[traitKey] || 0
      predLog += delta
    }
    
    const predXch = Math.exp(predLog)
    const actualXch = obs.price_xch
    const error = Math.abs(predXch - actualXch)
    const ape = error / actualXch
    validationErrors.push({ error, ape })
  }
  
  const mae = validationErrors.length > 0 
    ? validationErrors.reduce((sum, e) => sum + e.error, 0) / validationErrors.length 
    : null
  const medianAPE = validationErrors.length > 0
    ? weightedMedian(validationErrors.map(e => e.ape), Array(validationErrors.length).fill(1))
    : null
  
  const diagnostics = {
    schema_version: '2.0',
    generated_at: generatedAt,
    mapping_rates: {
      sales: {
        mapped: Object.keys(salesModel.traitSupport).length,
        total: clears.length,
        unique_ids: new Set(clears.map(c => c.id)).size
      },
      asks: {
        mapped: Object.keys(askModel.traitSupport).length,
        total: asks.length
      }
    },
    trait_counts: {
      sales: Object.keys(salesModel.traitDeltas).length,
      ask: Object.keys(askModel.traitDeltas).length,
      prior: Object.keys(priorModel).length
    },
    top_20_trait_deltas: {
      sales: topSalesDeltas,
      ask: topAskDeltas
    },
    validation: {
      mae: mae,
      median_ape: medianAPE,
      n_validated: validationErrors.length
    },
    variation_check: {
      stddev: predictions.length > 0 ? (() => {
        const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length
        const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length
        return Math.sqrt(variance)
      })() : null,
      n_sampled: predictions.length
    },
    sigma_validation: {
      sales: salesSigma,
      ask: askSigma,
      sales_valid: salesSigma !== null && salesSigma > 0.05 && salesSigma < 2.0,
      ask_valid: askSigma !== null && askSigma > 0.05 && askSigma < 2.0
    },
    warnings: warnings,
    is_healthy: clears.length >= 3 && asks.length >= 10 && warnings.length < 3
  }
  
  // Step 12: Write outputs
  console.log('\n[Step 12] Writing output files...')
  writeJson(FILES.outputModel, output)
  writeJson(FILES.outputDiagnostics, diagnostics)
  
  console.log(`\n✓ Success! Value model v2 written to: ${FILES.outputModel}`)
  console.log(`✓ Diagnostics written to: ${FILES.outputDiagnostics}`)
  console.log(`\n  Sales model: ${Object.keys(salesModel.traitDeltas).length} traits`)
  console.log(`  Ask model: ${Object.keys(askModel.traitDeltas).length} traits`)
  console.log(`  Prior model: ${Object.keys(priorModel).length} traits`)
  console.log(`  Model health: ${diagnostics.is_healthy ? 'HEALTHY' : 'WARNINGS'}`)
  if (warnings.length > 0) {
    console.log(`  Warnings: ${warnings.join(', ')}`)
  }
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err)
  process.exit(1)
})

