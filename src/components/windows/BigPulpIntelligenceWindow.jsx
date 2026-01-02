import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Window from './Window'
import { useWindow } from '../../contexts/WindowContext'
import { useToast } from '../../contexts/ToastContext'
import { buildTraitSalesMap } from '../../utils/traitSalesMapper'
import { calculateTraitValue } from '../../utils/traitValueCalculator'
import TraitValueDetailView from './TraitValueDetailView'
import NftPreviewCard from '../ui/NftPreviewCard'
import BigPulpWindow from './BigPulpWindow'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'
import { fetchXCHPrice } from '../../services/treasuryApi'
import './BigPulpIntelligenceWindow.css'

// ============================================
// DATA CACHE (Module-level singleton)
// ============================================
const DataCache = {
  manifest: null,
  questionTree: null,
  analysis: null,
  sentences: null,
  traitInsights: null,
  comboDatabase: null,
  rarePairingsIndex: null,
  comboInvertedIndex: null,
  comboPairCounts: null,
  comboPartnerIndex: null,
  comboTraitCatalog: null,
  comboTraitsShardCache: new Map(), // rangeKey -> shard JSON
  mintgardenLauncherMap: null,
  mintgardenLauncherMapMeta: null,
  mintgardenOffersIndex: null,
  valueModelV1: null,
  valueModelV2: null,
  valueModelVersion: null, // '1.0' or '2.0'
  salesIndexV1: null,
  // Trait sale averages cache
  traitSaleAverages: null,
  traitSaleAveragesBuiltAt: null,
  // Live offers polling state
  offersLastFetchedAt: null,
  offersLastRefreshAttempt: null,
  offersRefreshInProgress: false,
  // Deals scanner compute cache
  dealsComputedCache: new Map(), // key -> { fairValue, computedAt }
  loaded: {
    manifest: false,
    questionTree: false,
    analysis: false,
    sentences: false,
    traitInsights: false,
    comboDatabase: false,
    rarePairingsIndex: false,
    comboInvertedIndex: false,
    comboPairCounts: false,
    comboPartnerIndex: false,
    comboTraitCatalog: false,
    mintgardenLauncherMap: false,
    mintgardenOffersIndex: false,
    valueModelV1: false,
    valueModelV2: false,
    salesIndexV1: false
  },
  loadingPromises: {
    manifest: null,
    questionTree: null,
    analysis: null,
    sentences: null,
    traitInsights: null,
    comboDatabase: null,
    rarePairingsIndex: null,
    comboExplorerCore: null,
    mintgardenLauncherMap: null,
    mintgardenOffersIndex: null,
    valueModelV1: null,
    valueModelV2: null,
    salesIndexV1: null
  },
  error: null
}

// Sigmoid function
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x))
}

// Clamp to [0, 1]
function clamp01(x) {
  return Math.max(0, Math.min(1, x))
}

// Single shared promise pattern (no setInterval polling)
const loadManifest = async () => {
  if (DataCache.loaded.manifest) return DataCache.manifest
  if (DataCache.loadingPromises.manifest) return DataCache.loadingPromises.manifest
  
  DataCache.loadingPromises.manifest = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/manifest.json')
      if (!response.ok) throw new Error(`Manifest fetch failed: ${response.status}`)
      const manifest = await response.json()
      
      // Validate manifest schema
      if (!manifest.schema_version || !manifest.required_files) {
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Manifest schema mismatch:', manifest)
        }
        throw new Error('Invalid manifest schema')
      }
      
      DataCache.manifest = manifest
      DataCache.loaded.manifest = true
      DataCache.loadingPromises.manifest = null
      return manifest
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.manifest = null
      throw err
    }
  })()
  
  return DataCache.loadingPromises.manifest
}

// Lazy loading: Load only question tree + manifest for welcome/explore mode
const loadCoreData = async () => {
  const manifest = await loadManifest()
  
  if (DataCache.loaded.questionTree) {
    return { manifest, questionTree: DataCache.questionTree }
  }
  if (DataCache.loadingPromises.questionTree) {
    const questionTree = await DataCache.loadingPromises.questionTree
    return { manifest, questionTree }
  }
  
  DataCache.loadingPromises.questionTree = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/question_tree_v2.json')
      if (!response.ok) throw new Error(`Question tree fetch failed: ${response.status}`)
      const questionTree = await response.json()
      DataCache.questionTree = questionTree
      DataCache.loaded.questionTree = true
      DataCache.loadingPromises.questionTree = null
      return questionTree
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.questionTree = null
      throw err
    }
  })()
  
  const questionTree = await DataCache.loadingPromises.questionTree
  return { manifest, questionTree }
}

// Lazy loading: Load analysis + sentences only when context mode needed
const loadContextData = async () => {
  const manifest = await loadManifest()
  
  // Load analysis, sentences, and combo database in parallel
  const loadAnalysis = DataCache.loaded.analysis
    ? Promise.resolve(DataCache.analysis)
    : (DataCache.loadingPromises.analysis || (DataCache.loadingPromises.analysis = (async () => {
        try {
          const response = await fetch('/assets/BigPulp/all_nft_analysis.json')
          if (!response.ok) throw new Error(`Analysis fetch failed: ${response.status}`)
          const data = await response.json()
          DataCache.analysis = data
          DataCache.loaded.analysis = true
          DataCache.loadingPromises.analysis = null
          return data
        } catch (err) {
          DataCache.error = err
          DataCache.loadingPromises.analysis = null
          throw err
        }
      })()))
  
  const loadSentences = DataCache.loaded.sentences
    ? Promise.resolve(DataCache.sentences)
    : (DataCache.loadingPromises.sentences || (DataCache.loadingPromises.sentences = (async () => {
        try {
          const response = await fetch('/assets/BigPulp/all_nft_sentences.json')
          if (!response.ok) throw new Error(`Sentences fetch failed: ${response.status}`)
          const data = await response.json()
          DataCache.sentences = data
          DataCache.loaded.sentences = true
          DataCache.loadingPromises.sentences = null
          return data
        } catch (err) {
          DataCache.error = err
          DataCache.loadingPromises.sentences = null
          throw err
        }
      })()))
  
  const loadComboDatabase = DataCache.loaded.comboDatabase
    ? Promise.resolve(DataCache.comboDatabase)
    : (DataCache.loadingPromises.comboDatabase || (DataCache.loadingPromises.comboDatabase = (async () => {
        try {
          const response = await fetch('/assets/BigPulp/combo_database.json')
          if (!response.ok) throw new Error(`Combo database fetch failed: ${response.status}`)
          const data = await response.json()
          DataCache.comboDatabase = data
          DataCache.loaded.comboDatabase = true
          DataCache.loadingPromises.comboDatabase = null
          return data
        } catch (err) {
          DataCache.error = err
          DataCache.loadingPromises.comboDatabase = null
          throw err
        }
      })()))
  
  const loadNftRarityData = DataCache.loaded.nftRarityData
    ? Promise.resolve(DataCache.nftRarityData)
    : (DataCache.loadingPromises.nftRarityData || (DataCache.loadingPromises.nftRarityData = (async () => {
        try {
          const response = await fetch('/nftRarityData.json')
          if (!response.ok) throw new Error(`NFT Rarity Data fetch failed: ${response.status}`)
          const data = await response.json()
          DataCache.nftRarityData = data
          DataCache.loaded.nftRarityData = true
          DataCache.loadingPromises.nftRarityData = null
          return data
        } catch (err) {
          DataCache.error = err
          DataCache.loadingPromises.nftRarityData = null
          throw err
        }
      })()))
  
  const [analysis, sentences, comboDatabase, nftRarityData] = await Promise.all([
    loadAnalysis, 
    loadSentences, 
    loadComboDatabase,
    loadNftRarityData
  ])
  return { manifest, analysis, sentences, comboDatabase, nftRarityData }
}

// Lazy loading: Load trait insights only when deep-dive opened
const loadTraitInsights = async () => {
  if (DataCache.loaded.traitInsights) return DataCache.traitInsights
  if (DataCache.loadingPromises.traitInsights) return DataCache.loadingPromises.traitInsights
  
  DataCache.loadingPromises.traitInsights = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/trait_insights.json')
      if (!response.ok) throw new Error(`Trait insights fetch failed: ${response.status}`)
      const data = await response.json()
      DataCache.traitInsights = data
      DataCache.loaded.traitInsights = true
      DataCache.loadingPromises.traitInsights = null
      return data
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.traitInsights = null
      throw err
    }
  })()
  
  return DataCache.loadingPromises.traitInsights
}

// Lazy loading: Load rare pairings index only when Rare Pairings Explorer opened
// Now loads from 4 chunk files and merges them
const loadRarePairingsIndex = async () => {
  if (DataCache.loaded.rarePairingsIndex) return DataCache.rarePairingsIndex
  if (DataCache.loadingPromises.rarePairingsIndex) return DataCache.loadingPromises.rarePairingsIndex
  
  DataCache.loadingPromises.rarePairingsIndex = (async () => {
    try {
      // Try loading from 4 chunks first (new format)
      const chunkPromises = []
      let chunkCount = 4
      
      // Try to fetch all 4 chunks in parallel
      for (let i = 1; i <= 4; i++) {
        chunkPromises.push(
          fetch(`/assets/BigPulp/rare_pairings_index_v1_part${i}.json`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        )
      }
      
      const chunks = await Promise.all(chunkPromises)
      const validChunks = chunks.filter(c => c !== null)
      
      if (validChunks.length > 0) {
        // Merge chunks
        const merged = {
          schema_version: validChunks[0].schema_version,
          generated_at: validChunks[0].generated_at,
          source_files: validChunks[0].source_files,
          input_counts: validChunks[0].input_counts,
          normalization_report: validChunks[0].normalization_report,
          categories: validChunks[0].categories,
          views: {
            primary: validChunks[0].views.primary || {},
            drilldown: {}
          }
        }
        
        // Merge drilldown from all chunks
        for (const chunk of validChunks) {
          if (chunk.views && chunk.views.drilldown) {
            Object.assign(merged.views.drilldown, chunk.views.drilldown)
          }
        }
        
        // Validate schema version
        if (!merged.schema_version || !merged.schema_version.startsWith('1.')) {
          if (import.meta.env.DEV) {
            console.warn('[Big Pulp] Invalid rare pairings index schema_version:', merged.schema_version)
          }
          throw new Error('Invalid rare pairings index schema version')
        }
        
        if (import.meta.env.DEV) {
          console.log(`[Big Pulp] Loaded rare pairings index from ${validChunks.length} chunks`)
        }
        
        DataCache.rarePairingsIndex = merged
        DataCache.loaded.rarePairingsIndex = true
        DataCache.loadingPromises.rarePairingsIndex = null
        return merged
      }
      
      // Fallback: Try loading old single file format (backward compatibility)
      const response = await fetch('/assets/BigPulp/rare_pairings_index_v1.json')
      if (!response.ok) throw new Error(`Rare pairings index fetch failed: ${response.status}`)
      const data = await response.json()
      
      // Validate schema version
      if (!data.schema_version || !data.schema_version.startsWith('1.')) {
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Invalid rare pairings index schema_version:', data.schema_version)
        }
        throw new Error('Invalid rare pairings index schema version')
      }
      
      DataCache.rarePairingsIndex = data
      DataCache.loaded.rarePairingsIndex = true
      DataCache.loadingPromises.rarePairingsIndex = null
      return data
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.rarePairingsIndex = null
      throw err
    }
  })()
  
  return DataCache.loadingPromises.rarePairingsIndex
}

// Lazy loading: Load MintGarden launcher map
const loadMintGardenLauncherMap = async () => {
  if (DataCache.loaded.mintgardenLauncherMap) return DataCache.mintgardenLauncherMap
  if (DataCache.loadingPromises.mintgardenLauncherMap) return DataCache.loadingPromises.mintgardenLauncherMap
  
  DataCache.loadingPromises.mintgardenLauncherMap = (async () => {
    try {
      // Try runtime file first, fallback to old file for backward compatibility
      let response = await fetch('/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json')
      
      // Fallback to old filename if runtime file doesn't exist (migration safety)
      if (response.status === 404) {
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Runtime map not found, trying legacy file...')
        }
        response = await fetch('/assets/BigPulp/mintgarden_launcher_map_v1.json')
      }
      
      // Handle 404 gracefully (file doesn't exist yet)
      if (response.status === 404) {
        DataCache.mintgardenLauncherMap = null
        DataCache.loaded.mintgardenLauncherMap = true
        DataCache.loadingPromises.mintgardenLauncherMap = null
        return null
      }
      
      if (!response.ok) {
        throw new Error(`MintGarden launcher map fetch failed: ${response.status}`)
      }
      
      // Check content-type to avoid parsing HTML error pages as JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Got HTML instead of JSON (likely an error page)
        DataCache.mintgardenLauncherMap = null
        DataCache.loaded.mintgardenLauncherMap = true
        DataCache.loadingPromises.mintgardenLauncherMap = null
        return null
      }
      
      const data = await response.json()
      
      // Validate schema version (accept 1.0 for runtime, or 1.x for legacy)
      if (!data.schema_version || !data.schema_version.startsWith('1.')) {
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Invalid MintGarden launcher map schema_version:', data.schema_version)
        }
        throw new Error('Invalid MintGarden launcher map schema version')
      }
      
      // Store map and metadata
      DataCache.mintgardenLauncherMap = data.map
      DataCache.mintgardenLauncherMapMeta = {
        isPartial: data.is_partial || false,
        count: data.count || 0,
        generatedAt: data.generated_at || null,
        collectionId: data.collection_id || null, // NEW: for search URL fallback
      }
      DataCache.loaded.mintgardenLauncherMap = true
      DataCache.loadingPromises.mintgardenLauncherMap = null
      return data.map
    } catch (err) {
      // Handle JSON parse errors (likely got HTML instead of JSON)
      if (err instanceof SyntaxError) {
        DataCache.mintgardenLauncherMap = null
        DataCache.loaded.mintgardenLauncherMap = true
        DataCache.loadingPromises.mintgardenLauncherMap = null
        return null
      }
      // For other errors, return null for graceful degradation
      DataCache.mintgardenLauncherMap = null
      DataCache.loaded.mintgardenLauncherMap = true
      DataCache.loadingPromises.mintgardenLauncherMap = null
      return null
    }
  })()
  
  return DataCache.loadingPromises.mintgardenLauncherMap
}

// Lazy loading: Load MintGarden offers index (static fallback)
const loadMintGardenOffersIndex = async () => {
  if (DataCache.loaded.mintgardenOffersIndex) return DataCache.mintgardenOffersIndex
  if (DataCache.loadingPromises.mintgardenOffersIndex) return DataCache.loadingPromises.mintgardenOffersIndex
  
  DataCache.loadingPromises.mintgardenOffersIndex = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/mintgarden_offers_index_v1.json')
      if (response.status === 404) {
        DataCache.mintgardenOffersIndex = null
        DataCache.loaded.mintgardenOffersIndex = true
        DataCache.loadingPromises.mintgardenOffersIndex = null
        return null
      }
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        DataCache.mintgardenOffersIndex = null
        DataCache.loaded.mintgardenOffersIndex = true
        DataCache.loadingPromises.mintgardenOffersIndex = null
        return null
      }
      
      const data = await response.json()
      if (!data.schema_version || data.schema_version !== '1.0') {
        throw new Error('Invalid schema version')
      }
      
      DataCache.mintgardenOffersIndex = data
      DataCache.loaded.mintgardenOffersIndex = true
      DataCache.loadingPromises.mintgardenOffersIndex = null
      return data
    } catch (err) {
      DataCache.mintgardenOffersIndex = null
      DataCache.loaded.mintgardenOffersIndex = true
      DataCache.loadingPromises.mintgardenOffersIndex = null
      return null
    }
  })()
  
  return DataCache.loadingPromises.mintgardenOffersIndex
}

// Constants for live offers polling
const POLL_INTERVAL_MS = 60 * 60 * 1000  // 60 minutes
const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000  // 60 seconds

// Format relative time (e.g., "5m ago", "1h 2m ago")
function formatRelativeTime(timestamp, nowMs = null) {
  if (!timestamp) return 'Never'
  const now = nowMs !== null ? nowMs : Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m ago` : `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Convert offers generated_at into ms safely
function getOffersGeneratedAtMs(offersIndex) {
  const iso = offersIndex?.generated_at
  const ms = iso ? Date.parse(iso) : NaN
  return Number.isFinite(ms) ? ms : null
}

// Parse Retry-After header (returns seconds)
function parseRetryAfter(retryAfterHeader) {
  if (!retryAfterHeader) return null
  const value = retryAfterHeader.trim()
  const seconds = parseInt(value, 10)
  if (!isNaN(seconds)) return seconds
  // Try parsing as HTTP-date (RFC 7231)
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000))
  }
  return null
}

// Load live offers index from /api/offers endpoint
const loadLiveOffersIndex = async (force = false) => {
  const now = Date.now()
  const lastFetched = DataCache.offersLastFetchedAt
  const isFresh = lastFetched && (now - lastFetched) < POLL_INTERVAL_MS
  
  // If data is fresh and not forced, return cached data immediately
  if (isFresh && !force && DataCache.mintgardenOffersIndex) {
    const cachedGeneratedAtMs = DataCache.offersLastFetchedAt || getOffersGeneratedAtMs(DataCache.mintgardenOffersIndex) || now
    return { data: DataCache.mintgardenOffersIndex, generatedAtMs: cachedGeneratedAtMs }
  }
  
  // Check cooldown for forced refresh
  if (force) {
    const lastRefreshAttempt = DataCache.offersLastRefreshAttempt
    if (lastRefreshAttempt && (now - lastRefreshAttempt) < MANUAL_REFRESH_COOLDOWN_MS) {
      // Still in cooldown, return cached data only if it exists
      const remainingMs = MANUAL_REFRESH_COOLDOWN_MS - (now - lastRefreshAttempt)
      console.log(`[Big Pulp] Force refresh in cooldown, ${Math.ceil(remainingMs / 1000)}s remaining.`, {
        hasCachedData: !!DataCache.mintgardenOffersIndex,
        cachedFloorXch: DataCache.mintgardenOffersIndex?.floor_xch
      })
      if (DataCache.mintgardenOffersIndex) {
        const cachedGeneratedAtMs = DataCache.offersLastFetchedAt || getOffersGeneratedAtMs(DataCache.mintgardenOffersIndex) || now
        return { data: DataCache.mintgardenOffersIndex, generatedAtMs: cachedGeneratedAtMs }
      }
      // No cached data, ignore cooldown and fetch
      console.log('[Big Pulp] No cached data available, ignoring cooldown and fetching...')
    }
    console.log('[Big Pulp] Force refresh allowed, proceeding with fetch...')
    DataCache.offersLastRefreshAttempt = now
  }
  
  // Prevent concurrent refreshes - wait for existing fetch and return its result
  if (DataCache.offersRefreshInProgress) {
    console.log('[Big Pulp] Refresh already in progress, waiting for it to complete...')
    // Wait for existing refresh to complete (check both flag and data availability)
    // Reduced wait time from 60s to 5s for faster failure/recovery
    let waitCount = 0
    const maxWait = 50 // 5 seconds max wait (reduced from 60s)
    while (DataCache.offersRefreshInProgress && waitCount < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
      // Check if data became available while waiting (every 10 checks = 1 second)
      if (waitCount % 10 === 0 && DataCache.mintgardenOffersIndex && !DataCache.offersRefreshInProgress) {
        console.log('[Big Pulp] Data became available while waiting, returning it:', {
          floor_xch: DataCache.mintgardenOffersIndex.floor_xch,
          waitTime: waitCount * 100
        })
        const cachedGeneratedAtMs = DataCache.offersLastFetchedAt || getOffersGeneratedAtMs(DataCache.mintgardenOffersIndex) || now
        return { data: DataCache.mintgardenOffersIndex, generatedAtMs: cachedGeneratedAtMs }
      }
    }
    
    // After waiting, check if we have data now (even if refresh still in progress)
    if (DataCache.mintgardenOffersIndex) {
      console.log('[Big Pulp] Returning cached data while refresh continues in background:', {
        floor_xch: DataCache.mintgardenOffersIndex.floor_xch,
        market_stats_floor_xch: DataCache.mintgardenOffersIndex.market_stats?.floor_xch,
        waitTime: waitCount * 100
      })
      const cachedGeneratedAtMs = DataCache.offersLastFetchedAt || getOffersGeneratedAtMs(DataCache.mintgardenOffersIndex) || now
      return { data: DataCache.mintgardenOffersIndex, generatedAtMs: cachedGeneratedAtMs }
    }
    
    if (DataCache.offersRefreshInProgress) {
      console.warn('[Big Pulp] Refresh still in progress after 5s wait, resetting flag and proceeding with new fetch')
      // Reset the flag if it's stuck
      DataCache.offersRefreshInProgress = false
    } else {
      console.log('[Big Pulp] Refresh completed but no data available, proceeding with new fetch...')
    }
  }
  
  DataCache.offersRefreshInProgress = true
  console.log('[Big Pulp] Setting offersRefreshInProgress = true, starting fetch...')
  
  try {
    // Fetch from API with timeout
    const url = `/api/offers${force ? `?force=1&ts=${now}` : ''}`
    console.log('[Big Pulp] Fetching from:', url)
    
    // Use AbortController for proper fetch cancellation on timeout
    // Reduced timeout from 30s to 15s for faster failure
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 15000) // 15 second timeout (reduced from 30s)
    
    let response
    try {
      response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId) // Clear timeout if fetch completes in time
    } catch (fetchError) {
      clearTimeout(timeoutId)
      // Check if it was an abort (timeout) or actual error
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
        throw new Error('Fetch timeout after 15s')
      }
      throw fetchError // Re-throw if it's a different error
    }
    
    console.log('[Big Pulp] API Response status:', response.status, response.statusText)
    
    // Handle 429 Too Many Requests with Retry-After
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const retrySeconds = parseRetryAfter(retryAfter)
      console.warn('[Big Pulp] Rate limited:', retrySeconds ? `${retrySeconds}s` : 'unknown')
      if (retrySeconds !== null) {
        // Update last refresh attempt to enforce cooldown
        DataCache.offersLastRefreshAttempt = now + (retrySeconds * 1000)
        throw new Error(`Rate limited. Retry after ${retrySeconds} seconds.`)
      }
      throw new Error('Rate limited. Please try again later.')
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[Big Pulp] API Error:', response.status, errorText)
      throw new Error(`Failed to fetch offers: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // Debug logging for API response
    console.log('[Big Pulp] API Response received:', {
      floor_xch: data.floor_xch,
      market_stats_floor_xch: data.market_stats?.floor_xch,
      generated_at: data.generated_at,
      count: data.count,
      hasListings: !!data.listings_by_id,
      listingsCount: data.listings_by_id ? Object.keys(data.listings_by_id).length : 0
    })
    
    // Validate schema
    if (!data.schema_version) {
      throw new Error('Invalid response schema')
    }
    
    // Use server's generated_at as source of truth for timestamp
    const generatedAtMs = getOffersGeneratedAtMs(data) || now
    
    // Update cache
    DataCache.mintgardenOffersIndex = data
    DataCache.offersLastFetchedAt = generatedAtMs
    DataCache.loaded.mintgardenOffersIndex = true
    
    // Persist to localStorage
    try {
      localStorage.setItem('wojakInk_offers_cache', JSON.stringify({
        data,
        fetchedAt: generatedAtMs,
        generated_at: data.generated_at
      }))
    } catch (err) {
      // Ignore localStorage errors
    }
    
    // Return both data and timestamp for callers to trigger UI updates
    console.log('[Big Pulp] Successfully loaded offersIndex, returning data:', {
      floor_xch: data.floor_xch,
      market_stats_floor_xch: data.market_stats?.floor_xch,
      count: data.count,
      generatedAtMs
    })
    DataCache.offersRefreshInProgress = false
    console.log('[Big Pulp] Setting offersRefreshInProgress = false, fetch complete')
    return { data, generatedAtMs }
  } catch (err) {
    console.error('[Big Pulp] Error in loadLiveOffersIndex:', err)
    DataCache.offersRefreshInProgress = false
    
    // Server function failed - return cached data if available (don't try complex client-side fallback)
    // The client-side fallback can't reliably extract token IDs from MintGarden API responses
    // because the /nfts/by_offers endpoint only returns launcher IDs, not token numbers
    if (DataCache.mintgardenOffersIndex) {
      const cachedGeneratedAtMs = DataCache.offersLastFetchedAt || getOffersGeneratedAtMs(DataCache.mintgardenOffersIndex) || now
      const cachedAge = now - cachedGeneratedAtMs
      console.log('[Big Pulp] Server fetch failed, returning cached data after error:', {
        floor_xch: DataCache.mintgardenOffersIndex.floor_xch,
        cachedAge: Math.floor(cachedAge / 1000) + 's',
        isStale: cachedAge > (60 * 60 * 1000)
      })
      // Return cached data even if stale - better than nothing
      return { data: DataCache.mintgardenOffersIndex, generatedAtMs: cachedGeneratedAtMs }
    }
    
    // On failure, try static fallback only if no cached data exists
    if (!DataCache.mintgardenOffersIndex) {
      try {
        const staticData = await loadMintGardenOffersIndex()
        if (staticData) {
          DataCache.mintgardenOffersIndex = staticData
          const staticGeneratedAtMs = getOffersGeneratedAtMs(staticData) || now
          DataCache.offersLastFetchedAt = staticGeneratedAtMs
          return { data: staticData, generatedAtMs: staticGeneratedAtMs }
        }
      } catch (fallbackErr) {
        // Ignore fallback errors
      }
    }
    
    // Always return cached data if available (never wipe on failure)
    // Re-throw error so caller can handle it (e.g., show toast)
    if (DataCache.mintgardenOffersIndex) {
      const cachedGeneratedAtMs = DataCache.offersLastFetchedAt || getOffersGeneratedAtMs(DataCache.mintgardenOffersIndex) || now
      const cachedAge = now - cachedGeneratedAtMs
      console.log('[Big Pulp] Returning cached data after error:', {
        floor_xch: DataCache.mintgardenOffersIndex.floor_xch,
        cachedAge: Math.floor(cachedAge / 1000) + 's',
        isStale: cachedAge > POLL_INTERVAL_MS
      })
      throw { error: err, data: DataCache.mintgardenOffersIndex, generatedAtMs: cachedGeneratedAtMs } // Re-throw with cached data
    }
    console.error('[Big Pulp] No cached data available, throwing error')
    throw err
  } finally {
    DataCache.offersRefreshInProgress = false
  }
}

// Lazy loading: Load value model v1
const loadValueModelV1 = async () => {
  if (DataCache.loaded.valueModelV1) return DataCache.valueModelV1
  if (DataCache.loadingPromises.valueModelV1) return DataCache.loadingPromises.valueModelV1
  
  DataCache.loadingPromises.valueModelV1 = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/value_model_v1.json')
      if (response.status === 404) {
        DataCache.valueModelV1 = null
        DataCache.loaded.valueModelV1 = true
        DataCache.loadingPromises.valueModelV1 = null
        return null
      }
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        DataCache.valueModelV1 = null
        DataCache.loaded.valueModelV1 = true
        DataCache.loadingPromises.valueModelV1 = null
        return null
      }
      
      const data = await response.json()
      if (!data.schema_version || data.schema_version !== '1.0') {
        throw new Error('Invalid schema version')
      }
      
      DataCache.valueModelV1 = data
      DataCache.loaded.valueModelV1 = true
      DataCache.loadingPromises.valueModelV1 = null
      return data
    } catch (err) {
      DataCache.valueModelV1 = null
      DataCache.loaded.valueModelV1 = true
      DataCache.loadingPromises.valueModelV1 = null
      return null
    }
  })()
  
  return DataCache.loadingPromises.valueModelV1
}

// Lazy loading: Load value model v2 (with fallback to v1)
const loadValueModelV2 = async () => {
  if (DataCache.loaded.valueModelV2) return DataCache.valueModelV2
  if (DataCache.loadingPromises.valueModelV2) return DataCache.loadingPromises.valueModelV2
  
  DataCache.loadingPromises.valueModelV2 = (async () => {
    try {
      // Try v2 first
      const response = await fetch('/assets/BigPulp/value_model_v2.json')
      if (response.status === 404) {
        // Fallback to v1
        const v1Model = await loadValueModelV1()
        if (v1Model) {
          DataCache.valueModelVersion = v1Model.schema_version || '1.0'
          DataCache.valueModelV2 = v1Model // Store in v2 slot for compatibility
          DataCache.loaded.valueModelV2 = true
          DataCache.loadingPromises.valueModelV2 = null
          return v1Model
        }
        DataCache.valueModelV2 = null
        DataCache.loaded.valueModelV2 = true
        DataCache.loadingPromises.valueModelV2 = null
        return null
      }
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Fallback to v1
        const v1Model = await loadValueModelV1()
        if (v1Model) {
          DataCache.valueModelVersion = v1Model.schema_version || '1.0'
          DataCache.valueModelV2 = v1Model
          DataCache.loaded.valueModelV2 = true
          DataCache.loadingPromises.valueModelV2 = null
          return v1Model
        }
        DataCache.valueModelV2 = null
        DataCache.loaded.valueModelV2 = true
        DataCache.loadingPromises.valueModelV2 = null
        return null
      }
      
      const data = await response.json()
      
      // Check schema version
      const schemaVersion = data.schema_version || '1.0'
      if (schemaVersion.startsWith('2.')) {
        DataCache.valueModelV2 = data
        DataCache.valueModelVersion = schemaVersion
        DataCache.loaded.valueModelV2 = true
        DataCache.loadingPromises.valueModelV2 = null
        return data
      } else {
        // Not v2, fallback to v1
        const v1Model = await loadValueModelV1()
        if (v1Model) {
          DataCache.valueModelVersion = v1Model.schema_version || '1.0'
          DataCache.valueModelV2 = v1Model
          DataCache.loaded.valueModelV2 = true
          DataCache.loadingPromises.valueModelV2 = null
          return v1Model
        }
        DataCache.valueModelV2 = null
        DataCache.loaded.valueModelV2 = true
        DataCache.loadingPromises.valueModelV2 = null
        return null
      }
    } catch (err) {
      // Fallback to v1 on error
      try {
        const v1Model = await loadValueModelV1()
        if (v1Model) {
          DataCache.valueModelVersion = v1Model.schema_version || '1.0'
          DataCache.valueModelV2 = v1Model
          DataCache.loaded.valueModelV2 = true
          DataCache.loadingPromises.valueModelV2 = null
          return v1Model
        }
      } catch (fallbackErr) {
        // Ignore fallback errors
      }
      DataCache.valueModelV2 = null
      DataCache.loaded.valueModelV2 = true
      DataCache.loadingPromises.valueModelV2 = null
      return null
    }
  })()
  
  return DataCache.loadingPromises.valueModelV2
}

// Lazy loading: Load sales index v1 (optional, for drilldowns)
const loadSalesIndexV1 = async () => {
  if (DataCache.loaded.salesIndexV1) return DataCache.salesIndexV1
  if (DataCache.loadingPromises.salesIndexV1) return DataCache.loadingPromises.salesIndexV1
  
  DataCache.loadingPromises.salesIndexV1 = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/mintgarden_sales_index_v1.json')
      if (response.status === 404) {
        DataCache.salesIndexV1 = null
        DataCache.loaded.salesIndexV1 = true
        DataCache.loadingPromises.salesIndexV1 = null
        return null
      }
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        DataCache.salesIndexV1 = null
        DataCache.loaded.salesIndexV1 = true
        DataCache.loadingPromises.salesIndexV1 = null
        return null
      }
      
      const data = await response.json()
      if (!data.schema_version || data.schema_version !== '1.0') {
        throw new Error('Invalid schema version')
      }
      
      DataCache.salesIndexV1 = data
      DataCache.loaded.salesIndexV1 = true
      DataCache.loadingPromises.salesIndexV1 = null
      return data
    } catch (err) {
      DataCache.salesIndexV1 = null
      DataCache.loaded.salesIndexV1 = true
      DataCache.loadingPromises.salesIndexV1 = null
      return null
    }
  })()
  
  return DataCache.loadingPromises.salesIndexV1
}

// Lazy loading: Load combo explorer core files (inverted index, pair counts, partner index, trait catalog)
const loadComboExplorerCore = async () => {
  if (DataCache.loaded.comboInvertedIndex && 
      DataCache.loaded.comboPairCounts && 
      DataCache.loaded.comboPartnerIndex && 
      DataCache.loaded.comboTraitCatalog) {
    return {
      invertedIndex: DataCache.comboInvertedIndex,
      pairCounts: DataCache.comboPairCounts,
      partnerIndex: DataCache.comboPartnerIndex,
      traitCatalog: DataCache.comboTraitCatalog
    }
  }
  
  if (DataCache.loadingPromises.comboExplorerCore) {
    return DataCache.loadingPromises.comboExplorerCore
  }
  
  DataCache.loadingPromises.comboExplorerCore = (async () => {
    try {
      const [invertedIndexRes, pairCountsRes, partnerIndexRes, traitCatalogRes] = await Promise.all([
        fetch('/assets/BigPulp/combo_index_v1/inverted_index.json'),
        fetch('/assets/BigPulp/combo_index_v1/pair_counts.json'),
        fetch('/assets/BigPulp/combo_index_v1/partner_index.json'),
        fetch('/assets/BigPulp/combo_index_v1/trait_catalog.json')
      ])
      
      if (!invertedIndexRes.ok) throw new Error(`Inverted index fetch failed: ${invertedIndexRes.status}`)
      if (!pairCountsRes.ok) throw new Error(`Pair counts fetch failed: ${pairCountsRes.status}`)
      if (!partnerIndexRes.ok) throw new Error(`Partner index fetch failed: ${partnerIndexRes.status}`)
      if (!traitCatalogRes.ok) throw new Error(`Trait catalog fetch failed: ${traitCatalogRes.status}`)
      
      const invertedIndex = await invertedIndexRes.json()
      const pairCounts = await pairCountsRes.json()
      const partnerIndex = await partnerIndexRes.json()
      const traitCatalog = await traitCatalogRes.json()
      
      // Validate schema versions
      if (!invertedIndex.schema_version || !invertedIndex.schema_version.startsWith('1.')) {
        throw new Error('Invalid inverted index schema version')
      }
      if (!pairCounts.schema_version || !pairCounts.schema_version.startsWith('1.')) {
        throw new Error('Invalid pair counts schema version')
      }
      if (!partnerIndex.schema_version || !partnerIndex.schema_version.startsWith('1.')) {
        throw new Error('Invalid partner index schema version')
      }
      if (!traitCatalog.schema_version || !traitCatalog.schema_version.startsWith('1.')) {
        throw new Error('Invalid trait catalog schema version')
      }
      
      DataCache.comboInvertedIndex = invertedIndex
      DataCache.comboPairCounts = pairCounts
      DataCache.comboPartnerIndex = partnerIndex
      DataCache.comboTraitCatalog = traitCatalog
      DataCache.loaded.comboInvertedIndex = true
      DataCache.loaded.comboPairCounts = true
      DataCache.loaded.comboPartnerIndex = true
      DataCache.loaded.comboTraitCatalog = true
      DataCache.loadingPromises.comboExplorerCore = null
      
      return { invertedIndex, pairCounts, partnerIndex, traitCatalog }
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.comboExplorerCore = null
      throw err
    }
  })()
  
  return DataCache.loadingPromises.comboExplorerCore
}

// Load traits shard for a specific NFT ID
const loadTraitsShardForNftId = async (nftId) => {
  const idNum = parseInt(String(nftId), 10)
  if (isNaN(idNum) || idNum < 1 || idNum > 4200) return null
  
  const SHARD_SIZE = 100
  const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
  const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
  const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`
  
  if (DataCache.comboTraitsShardCache.has(rangeKey)) {
    return DataCache.comboTraitsShardCache.get(rangeKey)
  }
  
  try {
    const filename = `traits_by_nft_${rangeKey}.json`
    const response = await fetch(`/assets/BigPulp/combo_index_v1/${filename}`)
    if (!response.ok) throw new Error(`Shard fetch failed: ${response.status}`)
    const shard = await response.json()
    DataCache.comboTraitsShardCache.set(rangeKey, shard)
    return shard
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[Big Pulp] Failed to load shard for NFT #${nftId}:`, err)
    }
    return null
  }
}

// Prefetch shards for multiple NFT IDs (dedupe)
const loadTraitsForManyIds = async (nftIds) => {
  const rangeKeys = new Set()
  for (const nftId of nftIds) {
    const idNum = parseInt(String(nftId), 10)
    if (isNaN(idNum) || idNum < 1 || idNum > 4200) continue
    
    const SHARD_SIZE = 100
    const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
    const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
    const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`
    
    if (!DataCache.comboTraitsShardCache.has(rangeKey)) {
      rangeKeys.add(rangeKey)
    }
  }
  
  const loadPromises = Array.from(rangeKeys).map(async (rangeKey) => {
    try {
      const filename = `traits_by_nft_${rangeKey}.json`
      const response = await fetch(`/assets/BigPulp/combo_index_v1/${filename}`)
      if (!response.ok) return null
      const shard = await response.json()
      DataCache.comboTraitsShardCache.set(rangeKey, shard)
      return shard
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(`[Big Pulp] Failed to prefetch shard ${rangeKey}:`, err)
      }
      return null
    }
  })
  
  await Promise.all(loadPromises)
}

// ============================================
// TRAIT SALE AVERAGES BUILDER FUNCTIONS
// ============================================

// Artist identifiers - used to filter out primary market sales
// Primary market = artist selling to first buyer
// Secondary market = owner selling to another owner (what we want to include)

// Known artist profile IDs (from MintGarden - most reliable identifier)
const ARTIST_PROFILE_IDS = new Set([
  'a4a8d7a76f36a93179da90eb8a76643ec43b0f8a36be5e11497b303c6a49cb70' // MoJuiceNFTs profile ID
])

// Known artist profile names/identifiers
const ARTIST_PROFILE_NAMES = new Set([
  'MoJuiceNFTs',
  'MoJuiceX',
  'mojuicenfts',
  'mojuicex'
])

// Artist wallet addresses (if known - add addresses here)
const ARTIST_ADDRESSES = new Set([
  // Add artist wallet address(es) here if known
  // Example: 'xch1u84098anlf5hyc2p9kul4vx36j8zlsntjs2ntmhvf4z0yeg8dhtsnrmu5w'
])

// Check if a sale is a primary market sale (artist selling to first buyer)
const isPrimaryMarketSale = (event) => {
  // Check seller_profile.id first (most reliable)
  if (event.seller_profile?.id && ARTIST_PROFILE_IDS.has(event.seller_profile.id)) {
    return true
  }
  
  // Check seller_address against known artist addresses
  if (event.seller_address && ARTIST_ADDRESSES.has(event.seller_address)) {
    return true
  }
  
  // Check seller_profile name for known artist identifiers
  if (event.seller_profile?.name) {
    const sellerName = event.seller_profile.name
    if (ARTIST_PROFILE_NAMES.has(sellerName)) {
      return true
    }
    // Also check case-insensitive
    const sellerNameLower = sellerName.toLowerCase()
    for (const artistName of ARTIST_PROFILE_NAMES) {
      if (sellerNameLower === artistName.toLowerCase()) {
        return true
      }
    }
  }
  
  // Check seller_profile username/twitter handle
  if (event.seller_profile?.username) {
    const username = event.seller_profile.username.toLowerCase()
    if (username.includes('mojuice')) {
      return true
    }
  }
  
  if (event.seller_profile?.twitter_handle) {
    const twitter = event.seller_profile.twitter_handle.toLowerCase()
    if (twitter.includes('mojuice')) {
      return true
    }
  }
  
  return false
}

// Filter function to exclude bundle/multi-NFT sales
const isSimpleTrade = (event, eventsByTransaction) => {
  // Check if currency is a single value (string, not array)
  const currency = event.currency
  if (!currency || Array.isArray(currency)) {
    return false
  }
  
  // Currency must be "xch" or a single CAT token code
  if (typeof currency !== 'string') {
    return false
  }
  
  // If eventsByTransaction is provided, check for bundle detection
  if (eventsByTransaction) {
    const timestamp = event.timestamp
    if (timestamp && eventsByTransaction.has(timestamp)) {
      const eventsAtTimestamp = eventsByTransaction.get(timestamp)
      // If multiple events share same timestamp with different internal_ids, it's likely a bundle
      if (eventsAtTimestamp.length > 1) {
        const uniqueIds = new Set(eventsAtTimestamp.map(e => e.internal_id))
        if (uniqueIds.size > 1) {
          return false // Multiple different NFTs in same transaction = bundle
        }
      }
    }
  }
  
  return true
}

// Extract sale price equivalents from event
const getSalePriceEquivalents = (event, xchUsdFallback) => {
  // Extract soldAtIso from timestamp
  let soldAtIso = null
  if (event.timestamp) {
    const date = new Date(event.timestamp)
    if (!isNaN(date.getTime())) {
      soldAtIso = date.toISOString()
    }
  } else if (event.sold_at) {
    const date = new Date(event.sold_at)
    if (!isNaN(date.getTime())) {
      soldAtIso = date.toISOString()
    }
  } else if (event.date) {
    const date = new Date(event.date)
    if (!isNaN(date.getTime())) {
      soldAtIso = date.toISOString()
    }
  }
  
  // Extract xchEq from price_xch
  let xchEq = null
  if (event.price_xch != null && typeof event.price_xch === 'number' && isFinite(event.price_xch)) {
    xchEq = event.price_xch
  }
  
  // Extract usdAtSale (prefer usd_at_sale, then price_usd, then usd_value)
  let usdAtSale = null
  let usdSource = null
  
  if (event.usd_at_sale != null && typeof event.usd_at_sale === 'number' && isFinite(event.usd_at_sale)) {
    usdAtSale = event.usd_at_sale
    usdSource = 'direct'
  } else if (event.price_usd != null && typeof event.price_usd === 'number' && isFinite(event.price_usd)) {
    usdAtSale = event.price_usd
    usdSource = 'direct'
  } else if (event.usd_value != null && typeof event.usd_value === 'number' && isFinite(event.usd_value)) {
    usdAtSale = event.usd_value
    usdSource = 'direct'
  }
  
  // If USD exists but XCH missing, convert using xch_usd_at_sale or fallback
  if (usdAtSale != null && xchEq == null) {
    if (event.xch_usd_at_sale != null && typeof event.xch_usd_at_sale === 'number' && isFinite(event.xch_usd_at_sale) && event.xch_usd_at_sale > 0) {
      xchEq = usdAtSale / event.xch_usd_at_sale
      if (usdSource === null) usdSource = 'computed'
    } else if (xchUsdFallback != null && typeof xchUsdFallback === 'number' && isFinite(xchUsdFallback) && xchUsdFallback > 0) {
      xchEq = usdAtSale / xchUsdFallback
      usdSource = 'fallback'
    }
  }
  
  // If XCH exists but USD missing, ALWAYS convert using xch_usd_at_sale or fallback
  // This ensures we always have USD data (even if approximate)
  if (xchEq != null && usdAtSale == null) {
    if (event.xch_usd_at_sale != null && typeof event.xch_usd_at_sale === 'number' && isFinite(event.xch_usd_at_sale) && event.xch_usd_at_sale > 0) {
      usdAtSale = xchEq * event.xch_usd_at_sale
      usdSource = 'computed'
    } else if (xchUsdFallback != null && typeof xchUsdFallback === 'number' && isFinite(xchUsdFallback) && xchUsdFallback > 0) {
      // ALWAYS use fallback if available - better to show approximate USD than N/A
      usdAtSale = xchEq * xchUsdFallback
      usdSource = 'fallback'
    }
  }
  
  // If XCH cannot be computed, return null
  if (xchEq == null || !isFinite(xchEq)) {
    return null
  }
  
  return { xchEq, usdAtSale, soldAtIso, usdSource }
}

// Build trait sale averages from sales events
const buildTraitSaleAverages = async ({ salesEvents, xchUsdFallback }) => {
  if (!salesEvents || !Array.isArray(salesEvents) || salesEvents.length === 0) {
    return {}
  }
  
  // Step 1: Filter for simple trades only
  // Build eventsByTransaction map: group events by timestamp
  const eventsByTransaction = new Map()
  for (const event of salesEvents) {
    if (event.timestamp) {
      if (!eventsByTransaction.has(event.timestamp)) {
        eventsByTransaction.set(event.timestamp, [])
      }
      eventsByTransaction.get(event.timestamp).push(event)
    }
  }
  
  // Filter events: only include simple trades AND exclude primary market sales
  const filteredEvents = salesEvents.filter(event => {
    // Must be a simple trade (not a bundle)
    if (!isSimpleTrade(event, eventsByTransaction)) {
      return false
    }
    
    // Exclude primary market sales (artist selling to first buyer)
    if (isPrimaryMarketSale(event)) {
      return false
    }
    
    return true
  })
  
  if (filteredEvents.length === 0) {
    return {}
  }
  
  // Step 2: Batch load traits
  // Extract ALL unique internal_id values from filtered events
  const uniqueIds = new Set()
  for (const event of filteredEvents) {
    if (event.internal_id) {
      uniqueIds.add(String(event.internal_id))
    }
  }
  
  // Call loadTraitsForManyIds ONCE to batch load all required trait shards
  await loadTraitsForManyIds(Array.from(uniqueIds))
  
  // Build traitsById map in-memory from loaded shards
  const traitsById = {}
  const SHARD_SIZE = 100
  
  for (const nftId of uniqueIds) {
    const idNum = parseInt(String(nftId), 10)
    if (isNaN(idNum) || idNum < 1 || idNum > 4200) continue
    
    const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
    const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
    const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`
    
    const shard = DataCache.comboTraitsShardCache.get(rangeKey)
    if (!shard || !shard.nfts) continue
    
    const nftData = shard.nfts[nftId]
    if (!nftData || !nftData.traits) continue
    
    // Normalize traits using CATEGORY_MAP
    const normalizedTraits = {}
    for (const [category, traitValue] of Object.entries(nftData.traits)) {
      if (traitValue) {
        normalizedTraits[category] = traitValue
      }
    }
    
    traitsById[nftId] = normalizedTraits
  }
  
  // Step 3: Aggregate (single pass)
  const statsMap = {}
  
  for (const event of filteredEvents) {
    const nftId = String(event.internal_id)
    if (!nftId) continue
    
    const traits = traitsById[nftId]
    if (!traits) continue
    
    const saleEquiv = getSalePriceEquivalents(event, xchUsdFallback)
    if (!saleEquiv) continue
    
    const { xchEq, usdAtSale, soldAtIso, usdSource } = saleEquiv
    
    // For each trait on NFT
    for (const [category, traitValue] of Object.entries(traits)) {
      if (!traitValue) continue
      
      // Create traitKey using double colon
      const traitKey = `${category}::${traitValue}`
      
      // Initialize stats if not exists
      if (!statsMap[traitKey]) {
        statsMap[traitKey] = {
          traitKey,
          category,
          value: traitValue,
          nSales: 0,
          sumXch: 0,
          minXch: Infinity,
          maxXch: -Infinity,
          sumUsd: 0,
          nUsd: 0,
          hasFallbackUsd: false,
          lastSaleAtIso: null,
          examples: []
        }
      }
      
      const stats = statsMap[traitKey]
      
      // Aggregate
      stats.nSales++
      stats.sumXch += xchEq
      stats.minXch = Math.min(stats.minXch, xchEq)
      stats.maxXch = Math.max(stats.maxXch, xchEq)
      
      // ALWAYS compute USD - use fallback if sale event didn't have USD
      let finalUsdAtSale = usdAtSale
      let finalUsdSource = usdSource
      
      if (finalUsdAtSale == null && xchEq != null && xchUsdFallback != null && typeof xchUsdFallback === 'number' && isFinite(xchUsdFallback) && xchUsdFallback > 0) {
        // Compute USD from XCH using fallback rate
        finalUsdAtSale = xchEq * xchUsdFallback
        finalUsdSource = 'fallback'
      }
      
      if (finalUsdAtSale != null) {
        stats.sumUsd += finalUsdAtSale
        stats.nUsd++
      }
      
      if (finalUsdSource === 'fallback') {
        stats.hasFallbackUsd = true
      }
      
      if (soldAtIso) {
        if (!stats.lastSaleAtIso || soldAtIso > stats.lastSaleAtIso) {
          stats.lastSaleAtIso = soldAtIso
        }
      }
      
      // Add to examples array (keep ALL sales, not just 10)
      // Store the final USD value (computed if needed)
      stats.examples.push({
        nftId,
        xchEq,
        usdAtSale: finalUsdAtSale != null ? finalUsdAtSale : usdAtSale,
        soldAtIso
      })
    }
  }
  
  // After aggregation, compute averages
  for (const traitKey in statsMap) {
    const stats = statsMap[traitKey]
    stats.avgXch = stats.nSales > 0 ? stats.sumXch / stats.nSales : 0
    // ALWAYS compute avgUsd - xchUsdFallback is guaranteed to be non-null
    if (stats.nUsd > 0) {
      stats.avgUsd = stats.sumUsd / stats.nUsd
    } else if (stats.nSales > 0 && stats.avgXch > 0) {
      // Compute from avgXch using fallback rate (xchUsdFallback is never null)
      stats.avgUsd = stats.avgXch * xchUsdFallback
      stats.hasFallbackUsd = true
    } else {
      stats.avgUsd = null
    }
    stats.hasApproxUsd = stats.hasFallbackUsd || (stats.avgUsd != null && stats.nUsd < stats.nSales)
    
    // Clean up min/max if no sales
    if (stats.minXch === Infinity) stats.minXch = 0
    if (stats.maxXch === -Infinity) stats.maxXch = 0
  }
  
  return statsMap
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getNftImageUrl = (nftId) => {
  const numericId = parseInt(String(nftId), 10)
  if (isNaN(numericId) || numericId < 1 || numericId > 4200) return null
  const paddedId = String(numericId).padStart(4, '0')
  return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`
}

const normalizeNftIds = (nftIds, max = 10) => {
  if (!Array.isArray(nftIds)) return []
  const out = []
  const seen = new Set()
  for (const id of nftIds) {
    const numericId = parseInt(String(id).trim(), 10)
    if (isNaN(numericId) || numericId < 1 || numericId > 4200) continue
    const norm = String(numericId)
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(norm)
    if (out.length >= max) break
  }
  return out
}

// ============================================
// PARSING GUARDS
// ============================================
const getNftAnalysis = (nftId, data) => {
  const analysis = data?.analysis?.[String(nftId)]
  if (!analysis && import.meta.env.DEV) {
    console.warn(`[Big Pulp] NFT #${nftId} not found in analysis`)
  }
  return analysis || null
}

// Parse answer text into base sections (for traits_that_almost_never_pair)
const parseAnswerByBase = (answerText) => {
  const lines = answerText.split('\n')
  const sections = []
  let currentBase = null
  let currentBullets = []
  const headerLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Check if this is a base header (ends with ":")
    if (trimmed.endsWith(':')) {
      // Save previous section if exists
      if (currentBase) {
        sections.push({ base: currentBase, bullets: currentBullets })
      }
      // Start new section
      currentBase = trimmed.slice(0, -1) // Remove ":"
      currentBullets = []
    } else if (trimmed.startsWith('•')) {
      // This is a bullet point
      if (currentBase) {
        currentBullets.push(trimmed)
      }
    } else if (trimmed) {
      // This is header text (before any base sections)
      if (!currentBase) {
        headerLines.push(trimmed)
      }
    }
  }
  
  // Don't forget last section
  if (currentBase) {
    sections.push({ base: currentBase, bullets: currentBullets })
  }
  
  return { header: headerLines.join(' '), sections }
}

const getSentenceVariant = (nftId, variantIndex, data) => {
  const sentences = data?.sentences?.[String(nftId)]
  if (!sentences?.variants?.length) {
    if (import.meta.env.DEV && sentences) {
      console.warn(`[Big Pulp] NFT #${nftId} has no variants`)
    }
    return null
  }
  const variant = sentences.variants[variantIndex]
  return variant || sentences.variants[0] || null
}

const safeGet = (obj, path, fallback = '') => {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return fallback
    current = current[key]
  }
  return current ?? fallback
}

// ============================================
// TRAIT CATEGORY COLORS
// ============================================
const TRAIT_CATEGORY_COLORS = {
  'Base': '#8B4513',        // Saddle brown
  'Face': '#FF6347',        // Tomato red
  'Mouth': '#FF1493',       // Deep pink
  'Face Wear': '#1E90FF',   // Dodger blue
  'Head': '#FF0000',        // Red (changed from green for better visibility on gray)
  'Clothes': '#FF8C00',     // Dark orange
  'Background': '#9370DB'   // Medium purple
}

// ============================================
// HELPER: Render bullet text with colored categories
// ============================================
const renderColoredBullet = (bulletText, onNftClick) => {
  // Extract NFT ID if present (format: "...(e.g. #123)")
  // Look for the pattern "(e.g. #123)" and extract the ID
  const idMatch = bulletText.match(/\(e\.g\.\s*#(\d+)\)/)
  const nftId = idMatch ? idMatch[1] : null
  
  // Get text before the ID (the trait information)
  const textBeforeId = idMatch ? bulletText.substring(0, idMatch.index).trim() : bulletText.trim()
  
  const parts = []
  
  // Add NFT ID button at the beginning if present
  if (nftId && onNftClick) {
    parts.push(
      <button
        key="nft-id"
        className="bp-bullet-nft-id"
        onClick={() => onNftClick(nftId)}
        title={`View NFT #${nftId} in Rarity Explorer`}
      >
        #{nftId}
      </button>
    )
    parts.push(' ')
  }
  
  // Parse category: trait patterns (e.g., "Head: Construction Helmet" or "Head: Construction Helmet | Mouth: Glossed Lips")
  // Split by " | " to handle multiple trait pairs
  const segments = textBeforeId.split(/\s*\|\s*/)
  
  segments.forEach((segment, segmentIdx) => {
    // Parse each segment (e.g., "Head: Construction Helmet")
    const colonMatch = segment.match(/^([A-Za-z\s]+?):\s*(.+)$/)
    
    if (colonMatch) {
      const category = colonMatch[1].trim()
      const trait = colonMatch[2].trim()
      const color = TRAIT_CATEGORY_COLORS[category] || '#000000'
      
      // Add separator between segments
      if (segmentIdx > 0) {
        parts.push(' | ')
      }
      
      // Add only trait name (no category word) in colored text
      parts.push(
        <span key={`segment-${segmentIdx}`} style={{ color, fontWeight: 'bold' }}>
          {trait}
        </span>
      )
    } else {
      // If no match, add the segment as-is
      if (segmentIdx > 0) parts.push(' | ')
      parts.push(segment)
    }
  })
  
  return parts.length > 0 ? parts : [bulletText]
}

// ============================================
// RARE PAIRINGS EXPLORER UTILITIES
// ============================================

// djb2 hash function (same as build script)
function hashString(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

function getShardPrefix(str) {
  const hash = hashString(str)
  const hex = hash.toString(16).padStart(8, '0')
  return hex.substring(0, 2).toLowerCase()
}

// Mulberry32 PRNG for seeded randomness
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Vibe tag mapping
function getVibeTags(pairs) {
  const vibes = []
  const vibeMap = {
    royalty: ['Crown'],
    military: ['Military', 'Beret', 'Helmet', 'SWAT', 'Tactical', 'Military Beret', 'SWAT Helmet', 'SWAT Gear'],
    asylum: ['Straitjacket', 'Hannibal Mask', 'Crazy Room'],
    cyber: ['VR Headset', 'Cyber Shades', 'Matrix Lenses', 'Matrix'],
    pirate: ['Pirate Hat', 'Eye Patch'],
    wizard: ['Wizard Hat', 'Wizard Drip', 'Wizard Glasses']
  }

  for (const pair of pairs) {
    const trait = pair.trait
    for (const [vibe, keywords] of Object.entries(vibeMap)) {
      if (keywords.some(k => trait.includes(k))) {
        vibes.push(vibe)
        break
      }
    }
    if (vibes.length >= 2) break
  }

  return vibes.slice(0, 2)
}

// ============================================
// SKELETON COMPONENTS
// ============================================
const SkeletonCard = () => (
  <div className="bp-card bp-skeleton">
    <div className="bp-card-header bp-skeleton-shimmer"></div>
    <div className="bp-card-content">
      <div className="bp-skeleton-line"></div>
      <div className="bp-skeleton-line"></div>
      <div className="bp-skeleton-line short"></div>
    </div>
  </div>
)

// ============================================
// TOP NFTS CATEGORY BUTTONS
// ============================================
// High Provenance Explorer Component
const HighProvenanceExplorer = ({
  data,
  setProvenanceCategory,
  setProvenanceTrait,
  provenanceCategory,
  provenanceTrait,
  onTraitSelect
}) => {
  const [traitInsights, setTraitInsights] = useState(null)
  const [loading, setLoading] = useState(false)

  // Define High Provenance traits by category in display order
  const highProvenanceTraits = useMemo(() => ({
    'Base': [
      'Monkey Zoo',
      'Papa Tang'
    ],
    'Head': [
      'Crown',
      'Military Beret',
      'Wizard Hat',
      'Fedora',
      'Clown',
      'Ronin Helmet',
      'Pirate Hat'
    ],
    'Face Wear': [
      'MOG Glasses',
      'Wizard Glasses',
      'Cyber Shades',
      'VR Headset',
      'Fake It Mask',
      'Laser Eyes',
      'Clown Nose',
      'Eye Patch'
    ],
    'Mouth': [
      'Neckbeard'
    ],
    'Clothes': [
      'Straitjacket',
      'Goose Suit',
      'Wizard Drip',
      'El Presidente',
      'Ronin',
      'Pepe Suit',
      'Pickle Suit',
      'Bepe Army',
      'Super Saiyan Uniform'
    ]
  }), [])

  // Category display order
  const categoryOrder = ['Base', 'Head', 'Face Wear', 'Mouth', 'Clothes']

  // Load trait insights for additional info (count, etc.)
  useEffect(() => {
    const loadInsights = async () => {
      if (DataCache.loaded.traitInsights) {
        setTraitInsights(DataCache.traitInsights)
        return
      }
      setLoading(true)
      try {
        const insights = await loadTraitInsights()
        setTraitInsights(insights)
      } catch (err) {
        console.error('Failed to load trait insights:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInsights()
  }, [])

  const handleTraitClick = (traitName) => {
    setProvenanceTrait(traitName)
    if (onTraitSelect) {
      onTraitSelect(traitName)
    }
  }

  if (loading) {
    return (
      <div className="bp-high-provenance-wrapper">
        <div className="bp-loading">
          <div className="bp-loading-spinner"></div>
          <div className="bp-loading-text">Loading High Provenance traits...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bp-high-provenance-wrapper">
      <div className="bp-top-nfts-header-section">
        <h3 className="bp-top-nfts-section-title">High Provenance Traits</h3>
        <p className="bp-top-nfts-section-subtitle">Click on any trait to learn more</p>
      </div>
      
      <div className="bp-high-provenance-categories">
        {categoryOrder.map(categoryLabel => {
          const traits = highProvenanceTraits[categoryLabel] || []
          if (traits.length === 0) return null

          return (
            <div key={categoryLabel} className="bp-high-provenance-category">
              <h4 className="bp-high-provenance-category-title">{categoryLabel}</h4>
              <div className="bp-high-provenance-traits-grid">
                {traits.map(traitName => {
                  return (
                    <button
                      key={traitName}
                      className="bp-high-provenance-trait-btn"
                      onClick={() => handleTraitClick(traitName)}
                    >
                      <span className="bp-high-provenance-trait-name">{traitName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TopNftsCategoryButtons = ({
  data,
  setSelectedCategory: setSelectedCategoryFilter,
  setSelectedTrait: setSelectedTraitFilter,
  setLoadingContext,
  setData,
  setError,
  onViewOpen,
  selectedCategoryFilter: parentCategoryFilter,
  selectedTraitFilter: parentTraitFilter
}) => {
  // Category mapping
  const categories = [
    { value: 'base', label: 'Base' },
    { value: 'face', label: 'Face' },
    { value: 'mouth', label: 'Mouth' },
    { value: 'facewear', label: 'Face Wear' },
    { value: 'head', label: 'Head' },
    { value: 'clothes', label: 'Clothes' },
    { value: 'background', label: 'Background' },
  ]

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTrait, setSelectedTrait] = useState('')
  const [traitCatalog, setTraitCatalog] = useState(null)
  const [availableTraits, setAvailableTraits] = useState([])

  // Sync internal state with parent filter state
  useEffect(() => {
    if (parentCategoryFilter !== selectedCategory) {
      setSelectedCategory(parentCategoryFilter || '')
    }
    if (parentTraitFilter !== selectedTrait) {
      setSelectedTrait(parentTraitFilter || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentCategoryFilter, parentTraitFilter])

  // Load trait catalog
  useEffect(() => {
    const loadTraitCatalog = async () => {
      try {
        const response = await fetch('/assets/BigPulp/combo_index_v1/trait_catalog.json')
        if (response.ok) {
          const catalog = await response.json()
          setTraitCatalog(catalog)
        }
      } catch (err) {
        console.error('Failed to load trait catalog:', err)
      }
    }
    loadTraitCatalog()
  }, [])

  // Update available traits when category changes
  useEffect(() => {
    if (!traitCatalog || !selectedCategory) {
      setAvailableTraits([])
      setSelectedTrait('')
      return
    }

    const categoryData = traitCatalog.categories?.[selectedCategory]
    if (categoryData) {
      const traits = categoryData.map(item => ({
        value: item.trait,
        label: item.trait,
        count: item.count
      })).sort((a, b) => b.count - a.count) // Sort by count descending
      setAvailableTraits(traits)
      setSelectedTrait('') // Reset trait when category changes
    } else {
      setAvailableTraits([])
      setSelectedTrait('')
    }
  }, [traitCatalog, selectedCategory])

  // Load analysis data if needed
  useEffect(() => {
    if (onViewOpen) {
      onViewOpen()
      if (!data?.analysis) {
        setLoadingContext(true)
        loadContextData()
          .then(contextData => {
            setData(prev => ({ ...prev, ...contextData }))
            setLoadingContext(false)
          })
          .catch(err => {
            setError(err.message || String(err))
            setLoadingContext(false)
          })
      }
    }
  }, [onViewOpen])

  const handleCategoryChange = (e) => {
    const category = e.target.value
    setSelectedCategory(category)
    setSelectedCategoryFilter(category)
    setSelectedTrait('')
    setSelectedTraitFilter('')
  }

  const handleTraitChange = (e) => {
    const trait = e.target.value
    setSelectedTrait(trait)
    // Automatically show results when trait is selected
    if (selectedCategory && trait) {
      setSelectedCategoryFilter(selectedCategory)
      setSelectedTraitFilter(trait)
    }
  }

  return (
    <div className="bp-top-nfts-categories-wrapper">
      <div className="bp-top-nfts-header-section">
        <h3 className="bp-top-nfts-section-title">Select Category and Trait</h3>
        <p className="bp-top-nfts-section-subtitle">Choose a category and trait to view the top 50 NFTs</p>
      </div>
      
      <div className="bp-top-nfts-dropdowns">
        <div className="bp-top-nfts-dropdown-row">
          <div className="bp-top-nfts-dropdown-group">
            <label className="bp-top-nfts-dropdown-label">Category:</label>
            <select
              className="bp-top-nfts-dropdown"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">-- Select Category --</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="bp-top-nfts-dropdown-group">
            <label className="bp-top-nfts-dropdown-label">Trait:</label>
            <select
              className="bp-top-nfts-dropdown"
              value={selectedTrait}
              onChange={handleTraitChange}
              disabled={!selectedCategory || availableTraits.length === 0}
            >
              <option value="">-- Select Trait --</option>
              {availableTraits.map(trait => (
                <option key={trait.value} value={trait.value}>
                  {trait.label} ({trait.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// NFT CARD COMPONENT (for lazy loading)
// ============================================
const TopNftCard = ({ 
  nftId, 
  analysis, 
  rank, 
  baseRank, 
  categoryRank, 
  baseType,
  index,
  onNftClick,
  onMintGardenClick,
  onOpenBigPulp
}) => {
  const getNftImageUrl = (id) => {
    const paddedId = String(id).padStart(4, '0')
    return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`
  }
  
  const { elementRef, hasIntersected } = useIntersectionObserver({ rootMargin: '100px' })
  const [imageLoaded, setImageLoaded] = useState(index < 12) // Preload first 12
  const [imageError, setImageError] = useState(false)
  const imageUrl = getNftImageUrl(nftId)
  
  // Preload adjacent images when this one becomes visible
  useEffect(() => {
    if (!hasIntersected || !imageLoaded) return
    
    // Preload next 3 images
    for (let i = 1; i <= 3; i++) {
      const nextId = nftId + i
      if (nextId <= 4200) {
        const img = new Image()
        img.src = getNftImageUrl(nextId)
      }
    }
  }, [hasIntersected, imageLoaded, nftId])
  
  return (
    <div ref={elementRef} className="bp-top-nft-card">
      <div className="bp-top-nft-image-container">
        {!imageLoaded && !imageError && (
          <div className="bp-top-nft-image-placeholder">
            <div className="bp-top-nft-image-skeleton"></div>
          </div>
        )}
        {(hasIntersected || index < 12) && (
          <img 
            src={imageUrl} 
            alt={`NFT #${nftId}`}
            className="bp-top-nft-image"
            loading={index < 12 ? "eager" : "lazy"}
            decoding="async"
            style={{ 
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in'
            }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageError(true)
              e.target.style.display = 'none'
            }}
          />
        )}
      </div>
      <div className="bp-top-nft-info">
        <div className="bp-top-nft-id">#{nftId}</div>
        <div className="bp-top-nft-ranks">
          <div className="bp-top-nft-base-rank">
            <span className="bp-top-nft-rank-label">{baseType}</span>
            <span className="bp-top-nft-rank-value">#{categoryRank || baseRank}</span>
          </div>
          <div className="bp-top-nft-rank">
            <span className="bp-top-nft-rank-label">Overall</span>
            <span className="bp-top-nft-rank-value">#{rank}</span>
          </div>
        </div>
      </div>
      <div className="bp-top-nft-actions">
        <button
          className="bp-top-nft-btn-icon"
          onClick={() => onNftClick(nftId)}
          title="Open in Rarity Explorer"
        >
          <img 
            src="/icon/icons1/orange-3d-icon.png" 
            alt="Rarity Explorer"
            className="bp-top-nft-btn-icon-img"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </button>
        <button
          className="bp-top-nft-btn-icon"
          onClick={() => onMintGardenClick(nftId)}
          title="View on MintGarden"
        >
          <img 
            src="/icon/icons1/icon_MG.png" 
            alt="MintGarden"
            className="bp-top-nft-btn-icon-img"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </button>
        <button
          className="bp-top-nft-btn-icon bp-top-nft-btn-icon-bigpulp"
          onClick={() => onOpenBigPulp(nftId, analysis)}
          title="Ask BigPulp"
        >
          <span className="bp-top-nft-btn-icon-bigpulp-emoji">🍊</span>
        </button>
      </div>
    </div>
  )
}

// ============================================
// TOP NFTS BY BASE TYPE VIEW
// ============================================
const TopNftsByBaseTypeView = ({
  baseType,
  topNfts,
  onNftClick,
  onMintGardenClick,
  onOpenBigPulp
}) => {
  // Preload first batch of images immediately
  useEffect(() => {
    const getNftImageUrl = (nftId) => {
      const paddedId = String(nftId).padStart(4, '0')
      return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`
    }
    
    topNfts.slice(0, 12).forEach(({ nftId }) => {
      const img = new Image()
      img.src = getNftImageUrl(nftId)
    })
  }, [topNfts])

  return (
    <div className="bp-top-nfts-view">
      <div className="bp-top-nfts-header">
        <h3 className="bp-top-nfts-title">Top 50 {baseType}s</h3>
        <div className="bp-top-nfts-count">{topNfts.length} NFTs</div>
      </div>
      <div className="bp-top-nfts-grid">
        {topNfts.map(({ nftId, analysis, rank, baseRank, categoryRank }, index) => (
          <TopNftCard
            key={nftId}
            nftId={nftId}
            analysis={analysis}
            rank={rank}
            baseRank={baseRank}
            categoryRank={categoryRank}
            baseType={baseType}
            index={index}
            onNftClick={onNftClick}
            onMintGardenClick={onMintGardenClick}
            onOpenBigPulp={onOpenBigPulp}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// RARE PAIRINGS EXPLORER COMPONENT
// ============================================

// Rare Pairings Explorer
// localStorage keys: bigpulp_hunter_mode_v1, bigpulp_pairing_favorites_v1
// build script: node scripts/build_bigpulp_rare_pairings_index.mjs
// schema_version: 1.3
// single source of truth: nftRarityData.json (indices 3-8 for 6 categories)

function getBigPulpQuip(pairCountGlobal) {
  if (pairCountGlobal === 1) return "🍊 Illegal. One-of-one pairing detected."
  if (pairCountGlobal <= 3) return "🍊 Ultra weird. The grove barely allows this."
  if (pairCountGlobal <= 5) return "🍊 Rare link-up. Keep hunting."
  return "🍊 Strange combo. Still spicy."
}

const RarePairingsExplorer = ({
  rarePairingsIndex,
  loading,
  primaryCategory,
  setPrimaryCategory,
  drilldownCategory,
  setDrilldownCategory,
  primaryGroupKey,
  setPrimaryGroupKey,
  drilldownGroupKey,
  setDrilldownGroupKey,
  hunterMode,
  setHunterMode,
  pairingFavorites,
  setPairingFavorites,
  activePairKey,
  setActivePairKey,
  showOnlyBookmarks,
  setShowOnlyBookmarks,
  familyView,
  setFamilyView,
  onNftClick
}) => {
  const categories = ['base', 'clothes', 'head', 'face', 'mouth', 'facewear']
  const categoryLabels = {
    base: 'Base',
    clothes: 'Clothes',
    head: 'Head',
    face: 'Face',
    mouth: 'Mouth',
    facewear: 'Eyes'
  }

  // Get current visible items
  const visibleItemsData = useMemo(() => {
    if (!rarePairingsIndex || loading) return { items: [], groupLabel: '' }

    let dataGroup = null
    let groupLabel = ''

    const ddKey = `${primaryCategory}__${drilldownCategory}`
    const subgroupKey = `${primaryGroupKey}::${drilldownGroupKey}`
    const drilldownGroups = rarePairingsIndex.views?.drilldown?.[ddKey]
    if (!drilldownGroups || !drilldownGroupKey || !drilldownGroups[subgroupKey]) return { items: [], groupLabel: '' }
    dataGroup = drilldownGroups[subgroupKey]
    groupLabel = dataGroup.label

    if (!dataGroup || !dataGroup.items) return { items: [], groupLabel: '' }

    let items = [...dataGroup.items]

    // Apply hunter mode filter
    if (hunterMode === 'le5') {
      items = items.filter(i => i.pair_count_global <= 5)
    } else if (hunterMode === 'le3') {
      items = items.filter(i => i.pair_count_global <= 3)
    }

    // Apply bookmarks filter
    if (showOnlyBookmarks) {
      items = items.filter(i => pairingFavorites.includes(i.pair_key || i.pairKey))
    }

    // Items are already sorted by weirdness score DESC (global ranking)

    return { items, groupLabel }
  }, [rarePairingsIndex, loading, primaryCategory, drilldownCategory, primaryGroupKey, drilldownGroupKey, hunterMode, showOnlyBookmarks, pairingFavorites])

  const { items: visibleItems = [], groupLabel = '' } = visibleItemsData

  // Helper: Get stable key for an item
  const getItemKey = (item) => item.pair_key || item.pairKey || String(item.nftId)
  
  // Helper: Build active meta for highlighting
  function buildActiveMeta(item) {
    const key = getItemKey(item)
    const nftId = item.nftId || item.exampleNftId
    
    // Extract traits from item.pairs array (for pairing items)
    const traits = (item.pairs || []).map(pair => ({
      category: pair.category, // Already in format like 'Base', 'Face', 'Face Wear', etc.
      trait: pair.trait
    }))
    
    // Build legend targets - categories should match TRAIT_CATEGORY_COLORS keys exactly
    const categories = new Set(traits.map(t => t.category))
    const traitNames = new Set(traits.map(t => t.trait))
    
    return {
      key,
      nftId,
      traits,
      legendTargets: {
        categories,
        traits: traitNames
      }
    }
  }

  // Unified hover/active state for linking rows, tiles, traits, and legend
  const [activeItemKey, setActiveItemKey] = useState(null)
  const [activeItemMeta, setActiveItemMeta] = useState(null) // { key, nftId, traits, legendTargets }
  
  // Refs for scrolling to rows
  const rowRefs = useRef(new Map())

  // Initialize primaryGroupKey when category changes
  useEffect(() => {
    if (!rarePairingsIndex || loading) return
    const primaryGroups = rarePairingsIndex.views?.primary?.[primaryCategory]
    if (primaryGroups && !primaryGroupKey) {
      const firstKey = Object.keys(primaryGroups).sort((a, b) => {
        const groupA = primaryGroups[a]
        const groupB = primaryGroups[b]
        if (groupB.count !== groupA.count) return groupB.count - groupA.count
        return a.localeCompare(b)
      })[0]
      if (firstKey) setPrimaryGroupKey(firstKey)
    }
  }, [primaryCategory, rarePairingsIndex, loading, primaryGroupKey, setPrimaryGroupKey])

  // Initialize drilldownGroupKey when drilldown category or primary group changes
  useEffect(() => {
    if (!rarePairingsIndex || loading || !primaryGroupKey) {
      setDrilldownGroupKey('')
      return
    }
    const ddKey = `${primaryCategory}__${drilldownCategory}`
    const drilldownGroups = rarePairingsIndex.views?.drilldown?.[ddKey]
    if (drilldownGroups) {
      const matchingKeys = Object.keys(drilldownGroups).filter(k => k.startsWith(`${primaryGroupKey}::`))
      if (matchingKeys.length > 0) {
        // Check if current drilldownGroupKey is still valid
        const currentSubgroupKey = `${primaryGroupKey}::${drilldownGroupKey}`
        const isValid = drilldownGroupKey && drilldownGroups[currentSubgroupKey]
        
        if (!isValid) {
          // Reset and set to first available
          const firstKey = matchingKeys.sort((a, b) => {
            const groupA = drilldownGroups[a]
            const groupB = drilldownGroups[b]
            if (groupB.count !== groupA.count) return groupB.count - groupA.count
            return a.localeCompare(b)
          })[0]
          if (firstKey) setDrilldownGroupKey(firstKey.replace(`${primaryGroupKey}::`, ''))
        }
      } else {
        setDrilldownGroupKey('')
      }
    } else {
      setDrilldownGroupKey('')
    }
  }, [drilldownCategory, primaryCategory, primaryGroupKey, rarePairingsIndex, loading, drilldownGroupKey, setDrilldownGroupKey])

  // Handle category tab click
  const handleCategoryClick = useCallback((cat) => {
    setPrimaryCategory(cat)
    setPrimaryGroupKey('')
    // Set default drilldown to 'clothes', but if primary category is 'clothes', use first available option
    const availableOptions = categories.filter(c => c !== cat)
    setDrilldownCategory(availableOptions.includes('clothes') ? 'clothes' : availableOptions[0] || 'clothes')
    setDrilldownGroupKey('')
  }, [setPrimaryCategory, setPrimaryGroupKey, setDrilldownCategory, setDrilldownGroupKey, categories])

  // Handle show family
  const handleShowFamily = useCallback((item) => {
    const pairKey = item.pair_key || item.pairKey
    setFamilyView({
      pair_key: pairKey,
      pair_label: item.pair_label || `${item.pairs[0].trait} + ${item.pairs[1].trait}`,
      family_global: item.family_global || [],
      family_in_group: item.family_in_group || [],
      pair_count_global: item.pair_count_global,
      pair_count_in_group: item.pair_count_in_group,
      group_label: groupLabel,
      family_truncated: item.family_truncated || false,
      family_total_global: item.family_total_global || item.family_global?.length || 0
    })
  }, [groupLabel])

  if (loading || !rarePairingsIndex) {
    return <div className="bp-loading">Loading Rare Pairings Explorer...</div>
  }

  const primaryGroups = rarePairingsIndex.views?.primary?.[primaryCategory] || {}
  const primaryGroupKeys = Object.keys(primaryGroups).sort((a, b) => {
    const groupA = primaryGroups[a]
    const groupB = primaryGroups[b]
    if (groupB.count !== groupA.count) return groupB.count - groupA.count
    return a.localeCompare(b)
  })

  const drilldownOptions = categories.filter(cat => cat !== primaryCategory)

  let drilldownGroupOptions = []
  if (primaryGroupKey) {
    const ddKey = `${primaryCategory}__${drilldownCategory}`
    const drilldownGroups = rarePairingsIndex.views?.drilldown?.[ddKey] || {}
    drilldownGroupOptions = Object.keys(drilldownGroups)
      .filter(k => k.startsWith(`${primaryGroupKey}::`))
      .map(k => ({
        key: k.replace(`${primaryGroupKey}::`, ''),
        label: drilldownGroups[k].label,
        count: drilldownGroups[k].count
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return a.label.localeCompare(b.label)
      })
  }

  return (
    <div className="bp-rare-pairings-explorer">
      {/* Control Panel */}
      <fieldset className="bp-rare-pairings-panel">
        <legend>Explorer Controls</legend>

        {/* Primary Category Tabs */}
        <div className="bp-primary-category-buttons">
          {categories.map(cat => (
            <button
              key={cat}
              className={`bp-category-tab ${primaryCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Group Dropdown */}
        <div className="bp-control-row">
          <label>Group:</label>
          <select
            value={primaryGroupKey}
            onChange={(e) => {
              setPrimaryGroupKey(e.target.value)
              setDrilldownGroupKey('')
            }}
            className="bp-select"
          >
            {primaryGroupKeys.map(key => (
              <option key={key} value={key}>
                {primaryGroups[key].label} ({primaryGroups[key].count})
              </option>
            ))}
          </select>
        </div>

        {/* Drilldown Category */}
        <div className="bp-control-row">
          <label>Drill down by:</label>
          <select
            value={drilldownCategory}
            onChange={(e) => {
              setDrilldownCategory(e.target.value)
              setDrilldownGroupKey('')
            }}
            className="bp-select"
          >
            {drilldownOptions.map(cat => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Drilldown Group */}
        <div className="bp-control-row">
          <label>+ Drill group:</label>
          <select
            value={drilldownGroupKey}
            onChange={(e) => setDrilldownGroupKey(e.target.value)}
            className="bp-select"
          >
            {drilldownGroupOptions.map(opt => (
              <option key={opt.key} value={opt.key}>
                {opt.label} ({opt.count})
              </option>
            ))}
          </select>
        </div>

      </fieldset>

      {/* Legend - Horizontal Sticky Row */}
      <div className="bp-trait-legend">
        <span className="bp-legend-title">Legend:</span>
        {Object.entries(TRAIT_CATEGORY_COLORS).map(([category, color]) => {
          const isCategoryActive = activeItemMeta?.legendTargets?.categories?.has(category) || false
          return (
            <div 
              key={category} 
              className={`bp-legend-item ${isCategoryActive ? 'is-active' : ''}`}
            >
              <span className="bp-legend-color-swatch" style={{ backgroundColor: color }}></span>
              <span className={`bp-legend-category ${isCategoryActive ? 'is-active' : ''}`}>{category}</span>
            </div>
          )
        })}
        <button className={`bp-btn bp-bookmarks-btn ${showOnlyBookmarks ? 'active' : ''}`} onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}>
          ⭐ Bookmarks
        </button>
      </div>

      {/* Results List with Preview Grid */}
      <div className="bp-rare-pairings-results-wrapper">
        <div className="bp-rare-pairings-results">
          {/* Pairings List */}
          {visibleItems.length === 0 ? (
            <div className="bp-no-results">No pairs found matching criteria.</div>
          ) : (
            <div className="bp-pairings-list">
              {visibleItems.map((item, idx) => {
              const pairKey = item.pair_key || item.pairKey
              const itemKey = getItemKey(item)
              const isActive = activeItemKey === itemKey
              const vibes = getVibeTags(item.pairs)

              return (
                <div
                  key={pairKey}
                  ref={(el) => {
                    if (el) {
                      rowRefs.current.set(pairKey, el)
                    } else {
                      rowRefs.current.delete(pairKey)
                    }
                  }}
                  className={`bp-pairing-row ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => {
                    const meta = buildActiveMeta(item)
                    setActiveItemKey(meta.key)
                    setActiveItemMeta(meta)
                  }}
                  onMouseLeave={() => {
                    setActiveItemKey(null)
                    setActiveItemMeta(null)
                  }}
                  onClick={() => handleShowFamily(item)}
                >
                  <div className="bp-pairing-content">
                    <div className="bp-pairing-traits">
                      {item.pairs.map((pair, i) => (
                        <span 
                          key={i} 
                          className={`bp-pairing-trait ${isActive ? 'is-active' : ''}`}
                          style={{ color: TRAIT_CATEGORY_COLORS[pair.category] || '#000', fontWeight: 'bold' }}
                        >
                          {pair.trait}
                          {i < item.pairs.length - 1 && ' + '}
                        </span>
                      ))}
                    </div>
                    {vibes.length > 0 && (
                      <div className="bp-pairing-vibes">
                        {vibes.map(vibe => (
                          <span key={vibe} className="bp-vibe-chip" title={vibe}>
                            {vibe}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>

        {/* Preview Grid */}
        {visibleItems.length > 0 && (() => {
          // Deduplicate by nftId - keep first occurrence of each unique NFT
          const seen = new Map()
          const uniqueItems = []
          for (const item of visibleItems) {
            if (!seen.has(item.nftId)) {
              seen.set(item.nftId, item)
              uniqueItems.push(item)
            }
          }
          
          return (
            <div className="bp-pairings-preview">
              {uniqueItems.slice(0, 25).map((item) => {
                const imageUrl = getNftImageUrl(item.nftId)
                const pairKey = item.pair_key || item.pairKey
                const itemKey = getItemKey(item)
                const isActive = activeItemKey === itemKey
                return (
                  <button
                    key={`${item.nftId}-${pairKey}`}
                    className={`bp-preview-tile ${isActive ? 'is-active' : ''}`}
                    onClick={(e) => {
                      // Mobile support: toggle on click
                      const meta = buildActiveMeta(item)
                      if (activeItemKey === meta.key) {
                        setActiveItemKey(null)
                        setActiveItemMeta(null)
                      } else {
                        setActiveItemKey(meta.key)
                        setActiveItemMeta(meta)
                      }
                      // Also navigate to NFT
                      onNftClick(item.nftId)
                    }}
                    onMouseEnter={() => {
                      const meta = buildActiveMeta(item)
                      setActiveItemKey(meta.key)
                      setActiveItemMeta(meta)
                    }}
                    onMouseLeave={() => {
                      setActiveItemKey(null)
                      setActiveItemMeta(null)
                    }}
                    title={`NFT #${item.nftId}`}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={`NFT #${item.nftId}`}
                        className="bp-preview-image"
                      />
                    )}
                    <span className="bp-preview-text">#{item.nftId}</span>
                  </button>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Family Finder */}
      {familyView && (
        <fieldset className="bp-family-panel">
          <legend>Family Finder</legend>
          <div className="bp-family-header">
            <h4>{familyView.pair_label}</h4>
            <div className="bp-family-quip">{getBigPulpQuip(familyView.pair_count_global)}</div>
            {familyView.family_truncated && (
              <div className="bp-family-counts">
                Showing first 200 of {familyView.family_total_global}
              </div>
            )}
          </div>
          <div className="bp-family-actions">
            <button className="bp-btn" onClick={() => {
              const list = familyView.family_global.join(', #')
              navigator.clipboard.writeText(`#${list}`).catch(() => {})
            }}>Copy family list</button>
            <button className="bp-btn" onClick={() => {
              const randomId = familyView.family_global[Math.floor(Math.random() * familyView.family_global.length)]
              onNftClick(randomId)
            }}>Random family member</button>
            <button className="bp-btn" onClick={() => setFamilyView(null)}>← Back</button>
          </div>
          <div className="bp-family-results-wrapper">
            <div className="bp-family-list">
              {familyView.family_global.map(nftId => (
                <button key={nftId} className="bp-family-nft-btn" onClick={() => onNftClick(nftId)}>
                  #{nftId}
                </button>
              ))}
            </div>
            <div className="bp-family-preview">
              {familyView.family_global.map(nftId => {
                const imageUrl = getNftImageUrl(nftId)
                return (
                  <button key={nftId} className="bp-preview-tile" onClick={() => onNftClick(nftId)}>
                    {imageUrl && <img src={imageUrl} alt={`NFT #${nftId}`} className="bp-preview-image" />}
                    <span className="bp-preview-text">#{nftId}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </fieldset>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function BigPulpIntelligenceWindow({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [mode, setMode] = useState('explore') // Always start in explore mode to show discovery view immediately
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null) // 'base', 'face', 'mouth', etc.
  const [selectedTraitFilter, setSelectedTraitFilter] = useState(null) // Specific trait value
  // High Provenance explorer state
  const [provenanceCategory, setProvenanceCategory] = useState(null) // Category for High Provenance
  const [provenanceTrait, setProvenanceTrait] = useState(null) // Specific trait for High Provenance
  const [currentView, setCurrentView] = useState(null)
  const [viewHistory, setViewHistory] = useState([])
  
  const [selectedNft, setSelectedNft] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [currentVariant, setCurrentVariant] = useState(0)
  const [lastVariant, setLastVariant] = useState(-1)
  const [loadingContext, setLoadingContext] = useState(false)
  const [loadingTraitInsights, setLoadingTraitInsights] = useState(false)
  
  // Rare Pairings Explorer state
  const [loadingRarePairings, setLoadingRarePairings] = useState(false)
  const [primaryCategory, setPrimaryCategory] = useState('base')
  const [drilldownCategory, setDrilldownCategory] = useState('clothes')
  const [primaryGroupKey, setPrimaryGroupKey] = useState('')
  const [drilldownGroupKey, setDrilldownGroupKey] = useState('')
  const [hunterMode, setHunterMode] = useState(() => {
    try {
      const stored = localStorage.getItem('bigpulp_hunter_mode_v1')
      return stored === 'le5' || stored === 'le3' ? stored : 'off'
    } catch {
      return 'off'
    }
  })
  const [pairingFavorites, setPairingFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('bigpulp_pairing_favorites_v1')
      return stored ? JSON.parse(stored) : [] // array of pair_key strings
    } catch {
      return []
    }
  })
  const [activePairKey, setActivePairKey] = useState(null) // pair_key string
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false)
  const [familyView, setFamilyView] = useState(null) // { pair_key, pair_label, family_global[], family_in_group[], pair_count_global, pair_count_in_group, group_label, family_truncated?, family_total_global? }
  
  const { bringToFront, restoreWindow, isWindowMinimized, getWindow, isWindowActive, activeWindowId } = useWindow()
  const { showToast } = useToast()

  // Track mintgarden map metadata in state for reactivity
  const [mintgardenMapMeta, setMintgardenMapMeta] = useState(null)
  const [showGlobalMarketMap, setShowGlobalMarketMap] = useState(false)
  const [showTraitValues, setShowTraitValues] = useState(false)
  const [showTraitSaleAverages, setShowTraitSaleAverages] = useState(true) // Default first tab
  
  // Trait Sale Averages view state
  const [traitSaleAvgCategory, setTraitSaleAvgCategory] = useState(null) // null | "base" | "face" | etc.
  const [selectedTraitValue, setSelectedTraitValue] = useState(null) // Selected trait value
  const [traitSaleAvgSearchQuery, setTraitSaleAvgSearchQuery] = useState('')
  const [traitSaleAvgSortBy, setTraitSaleAvgSortBy] = useState('premium') // 'premium' | 'sales' | 'recency'
  const [traitSaleAvgCategoryFilter, setTraitSaleAvgCategoryFilter] = useState(null)
  const [showAllTraitsTable, setShowAllTraitsTable] = useState(true) // Always visible by default
  const [traitSalesSortBy, setTraitSalesSortBy] = useState('recencyDesc') // 'valueAsc' | 'valueDesc' | 'recencyAsc' | 'recencyDesc'
  
  // Trait Values view state
  const [selectedTraitKey, setSelectedTraitKey] = useState(null) // e.g., "head::Crown"
  const [selectedTraitCategory, setSelectedTraitCategory] = useState(null) // null | "base" | "face" | etc.
  const [traitSortBy, setTraitSortBy] = useState('premiumDesc') // "premiumDesc" | "premiumAsc" | "confidenceDesc" | "salesDesc" | "recencyDesc" | "alpha"
  const [hoveredTraitKey, setHoveredTraitKey] = useState(null)
  const [pinnedInspector, setPinnedInspector] = useState(false)
  const [activeCTAMode, setActiveCTAMode] = useState(null) // null | "sleepy" | "delusion" | "hot" | "undervalued"
  const [traitDetailTab, setTraitDetailTab] = useState('overview') // "overview" | "listed" | "sales"
  const [traitValuesDataLoading, setTraitValuesDataLoading] = useState(false)
  
  // Live offers refresh state
  const [offersRefreshState, setOffersRefreshState] = useState('idle') // 'idle' | 'refreshing' | 'refreshed'
  const [offersLastUpdated, setOffersLastUpdated] = useState(null)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(null) // Countdown for 429 retry
  const [nowTick, setNowTick] = useState(Date.now()) // Ticker for "Last updated" display
  const [offersIndex, setOffersIndex] = useState(DataCache.mintgardenOffersIndex) // React state for offers data
  
  // BigPulp Window state
  const [openBigPulpWindows, setOpenBigPulpWindows] = useState([]) // Array of { nftId, nftData, currentVersion, currentImage }
  const [bigPulpData, setBigPulpData] = useState({ A: {}, B: {}, C: {} }) // BigPulp commentary data
  const [topNftsPreviewSeed, setTopNftsPreviewSeed] = useState(Date.now()) // Seed for random preview generation
  
  // Simplified Value Engine - no tabs, just trait values
  
  // Derive mintGardenMapStats from mintgardenMapMeta
  const mintGardenMapStats = useMemo(() => {
    if (!mintgardenMapMeta) return null
    return {
      count: mintgardenMapMeta.count || 0,
      total: 4200, // Total NFTs in the collection
      generatedAt: mintgardenMapMeta.generatedAt || null,
      isPartial: mintgardenMapMeta.isPartial || false
    }
  }, [mintgardenMapMeta])

  // Load core data on mount (manifest + question tree)
  useEffect(() => {
    const init = async () => {
      try {
        const result = await loadCoreData()
        setData(result)
        setLoading(false)
      } catch (err) {
        setError(err.message || String(err))
        setLoading(false)
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Core data load failed:', err)
        }
      }
    }
    init()
  }, [])

  // Load BigPulp commentary data on mount
  useEffect(() => {
    const loadBigPulpData = async () => {
      try {
        const [dataA, dataB, dataC] = await Promise.all([
          fetch('/data/bigPulpA.json').then(r => r.ok ? r.json() : {}),
          fetch('/data/bigPulpB.json').then(r => r.ok ? r.json() : {}),
          fetch('/data/bigPulpC.json').then(r => r.ok ? r.json() : {})
        ])
        setBigPulpData({ A: dataA, B: dataB, C: dataC })
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Failed to load BigPulp commentary data:', err)
        }
      }
    }
    loadBigPulpData()
  }, [])
  
  // Preload Trait Sale Averages data on mount (since it's the default tab)
  useEffect(() => {
    const preloadTraitSaleAveragesData = async () => {
      // Preload in background without blocking
      try {
        await Promise.all([
          loadSalesIndexV1().catch(() => null),
          loadLiveOffersIndex(false).catch(() => null),
          loadValueModelV2().catch(() => null)
        ])
      } catch (err) {
        // Silently fail - data will load when tab is opened
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Failed to preload Trait Sale Averages data:', err)
        }
      }
    }
    
    preloadTraitSaleAveragesData()
  }, [])

  // Load data for Trait Values view when it opens
  useEffect(() => {
    if (!showTraitValues) return
    
    const loadData = async () => {
      setTraitValuesDataLoading(true)
      try {
        await Promise.all([
          loadValueModelV2(), // Use v2 loader (falls back to v1)
          loadLiveOffersIndex(false), // Use live offers instead of static
          loadSalesIndexV1().catch(() => null) // Optional
        ])
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[Big Pulp] Trait Values data load failed:', err)
        }
      } finally {
        setTraitValuesDataLoading(false)
      }
    }
    
    loadData()
  }, [showTraitValues])

  // Live offers polling (background, 60-minute interval)
  useEffect(() => {
    // Background polling - works even when window is not active
    // This ensures data stays fresh regardless of window state
    
    // On mount: Load from localStorage if fresh (< 60min) and populate DataCache
    const now = Date.now()
    if (!DataCache.mintgardenOffersIndex || !DataCache.offersLastFetchedAt) {
      try {
        const cached = localStorage.getItem('wojakInk_offers_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.data) {
            // Use generated_at as fallback if fetchedAt is missing
            const cachedTimestamp = parsed.fetchedAt || getOffersGeneratedAtMs(parsed.data) || now
            const cachedAge = now - cachedTimestamp
            // Only use cache if it's less than 10 minutes old (was 60min, but we want fresher data)
            const MAX_CACHE_AGE = 10 * 60 * 1000 // 10 minutes
            if (cachedAge < MAX_CACHE_AGE) {
              // Use cached data immediately, no fetch needed
              DataCache.mintgardenOffersIndex = parsed.data
              DataCache.offersLastFetchedAt = cachedTimestamp
              DataCache.loaded.mintgardenOffersIndex = true
              setOffersIndex(parsed.data)
              setOffersLastUpdated(cachedTimestamp)
              console.log('[Big Pulp] Using fresh cached data from localStorage:', {
                floor_xch: parsed.data.floor_xch,
                age: Math.floor(cachedAge / 1000) + 's'
              })
              // Don't fetch if data is fresh from localStorage
            } else {
              // Cache is stale, clear it
              console.log('[Big Pulp] Cached data is stale, clearing:', {
                age: Math.floor(cachedAge / 1000) + 's',
                floor_xch: parsed.data.floor_xch
              })
              localStorage.removeItem('wojakInk_offers_cache')
              DataCache.mintgardenOffersIndex = null
              DataCache.offersLastFetchedAt = null
            }
          }
        }
      } catch (err) {
        // Ignore localStorage errors
      }
    }
    
    // Initial fetch on mount - use cached data immediately, fetch fresh in background
    const initialFetch = async () => {
      // If we already have cached data, use it immediately (don't block UI)
      if (DataCache.mintgardenOffersIndex) {
        console.log('[Big Pulp] Using cached offersIndex immediately:', {
          floor_xch: DataCache.mintgardenOffersIndex.floor_xch,
          age: DataCache.offersLastFetchedAt ? Math.floor((now - DataCache.offersLastFetchedAt) / 1000) + 's' : 'unknown'
        })
        setOffersIndex(DataCache.mintgardenOffersIndex)
        if (DataCache.offersLastFetchedAt) {
          setOffersLastUpdated(DataCache.offersLastFetchedAt)
        }
      }
      
      // Fetch fresh data in background (non-blocking)
      console.log('[Big Pulp] Starting background refresh of offersIndex...')
      try {
        // Only force refresh if data is stale (older than 10 minutes)
        const dataAge = DataCache.offersLastFetchedAt ? (now - DataCache.offersLastFetchedAt) : Infinity
        const isStale = dataAge > (10 * 60 * 1000) // 10 minutes
        const shouldForce = isStale || !DataCache.mintgardenOffersIndex
        
        const result = await loadLiveOffersIndex(shouldForce)
        console.log('[Big Pulp] Background refresh completed:', {
          hasData: !!result?.data,
          floor_xch: result?.data?.floor_xch,
          market_stats_floor_xch: result?.data?.market_stats?.floor_xch,
          generatedAtMs: result?.generatedAtMs
        })
        if (result && result.data) {
          setOffersIndex(result.data)
        }
        if (result && result.generatedAtMs) {
          setOffersLastUpdated(result.generatedAtMs)
        }
      } catch (err) {
        // Silently handle - cached data is already displayed, just log the error
        console.error('[Big Pulp] Background refresh failed (using cached data):', err.message || err)
        // Don't update state if we already have cached data showing
      }
    }
    
    initialFetch()
    
    // Set up interval for background polling (every 60 minutes)
    const intervalId = setInterval(() => {
      const lastFetched = DataCache.offersLastFetchedAt
      const currentNow = Date.now()
      const isStale = !lastFetched || (currentNow - lastFetched) >= POLL_INTERVAL_MS
      
      if (isStale) {
        loadLiveOffersIndex(false)
          .then((result) => {
            if (result && result.data) {
              setOffersIndex(result.data)
            }
            if (result && result.generatedAtMs) {
              setOffersLastUpdated(result.generatedAtMs)
            }
          })
          .catch(err => {
            // Silently handle errors - will retry on next interval
            if (import.meta.env.DEV) {
              console.warn('[Big Pulp] Background polling failed:', err)
            }
          })
      }
    }, POLL_INTERVAL_MS)
    
    return () => clearInterval(intervalId)
  }, []) // Run once on mount, not dependent on window state

  // Retry countdown timer for 429 responses
  useEffect(() => {
    if (retryAfterSeconds === null || retryAfterSeconds <= 0) {
      return
    }
    
    const intervalId = setInterval(() => {
      setRetryAfterSeconds(prev => {
        if (prev === null || prev <= 1) {
          return null
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(intervalId)
  }, [retryAfterSeconds])

  // Minute ticker for "Last updated" display (updates every 60s without API calls)
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowTick(Date.now())
    }, 60 * 1000) // Update every minute
    
    return () => clearInterval(intervalId)
  }, [])

  // Listen for NFT selection from Rarity Explorer
  useEffect(() => {
    const handleNftSelected = (event) => {
      const { nftId } = event.detail
      if (!nftId) return
      
      // Trigger lazy loading of context data
      setLoadingContext(true)
      loadContextData()
        .then(contextData => {
          setData(prev => ({ ...prev, ...contextData }))
          DataCache.comboDatabase = contextData.comboDatabase
          const nftAnalysis = getNftAnalysis(nftId, contextData)
          
          if (nftAnalysis) {
            // Support forward-compatible value_signals placeholder
            const enrichedAnalysis = {
              ...nftAnalysis,
              value_signals: nftAnalysis.value_signals || {}
            }
            setSelectedNft({ id: String(nftId), ...enrichedAnalysis })
            setAnalysis(enrichedAnalysis)
            setMode('context')
            setCurrentView(null)
            setCurrentVariant(0)
            setLastVariant(-1)
          }
          setLoadingContext(false)
        })
        .catch(err => {
          setError(err.message || String(err))
          setLoadingContext(false)
        })
    }
    
    window.addEventListener('nftSelected', handleNftSelected)
    return () => window.removeEventListener('nftSelected', handleNftSelected)
  }, [])

  // Navigate to NFT in Rarity Explorer
  const handleNftClick = useCallback((nftId) => {
    const rarityExplorer = getWindow('rarity-explorer')
    if (rarityExplorer) {
      if (isWindowMinimized('rarity-explorer')) {
        restoreWindow('rarity-explorer')
      }
      bringToFront('rarity-explorer')
      window.dispatchEvent(new CustomEvent('navigateToNft', {
        detail: { nftId: String(nftId) }
      }))
    } else {
      navigator.clipboard.writeText(String(nftId)).catch(() => {})
    }
  }, [getWindow, isWindowMinimized, restoreWindow, bringToFront])

  // Get top NFTs by category and trait using nftRarityData
  const getTopNftsByCategoryTrait = useCallback((category, trait, limit = 50) => {
    if (!data?.nftRarityData || !category || !trait) return []
    
    // Map category to nftRarityData array index
    // nftRarityData structure: [rank, ?, tier, Base, Face, Mouth, Face Wear, Head, Clothes, Background]
    const categoryIndexMap = {
      'base': 3,
      'face': 4,
      'mouth': 5,
      'facewear': 6,
      'head': 7,
      'clothes': 8,
      'background': 9
    }
    
    const categoryIndex = categoryIndexMap[category]
    if (categoryIndex === undefined) return []
    
    const nfts = Object.entries(data.nftRarityData)
      .filter(([nftId, nftData]) => {
        // nftData is an array: [rank, ?, tier, Base, Face, Mouth, Face Wear, Head, Clothes, Background]
        if (!Array.isArray(nftData) || nftData.length <= categoryIndex) return false
        
        const traitValue = nftData[categoryIndex]
        if (!traitValue) return false
        
        // Case-insensitive comparison
        return String(traitValue).toLowerCase().trim() === String(trait).toLowerCase().trim()
      })
      .map(([nftId, nftData]) => {
        const rank = nftData[0] || 999999
        const analysis = data?.analysis?.[nftId] || {}
        
        return {
          nftId,
          analysis,
          rank,
          categoryRank: rank, // Will be updated to sequential position
          baseRank: analysis?.base_rank || 999999
        }
      })
      .sort((a, b) => a.rank - b.rank) // Sort by overall global rank (lower is better)
      .slice(0, limit)
      .map((nft, index) => ({
        ...nft,
        categoryRank: index + 1 // Sequential rank within the trait category (1, 2, 3, ...)
      }))
    
    if (import.meta.env.DEV) {
      console.log(`[Top NFTs] Found ${nfts.length} NFTs for category="${category}", trait="${trait}"`)
      if (nfts.length > 0) {
        console.log(`[Top NFTs] First NFT: #${nfts[0].nftId}, rank=${nfts[0].rank}`)
      }
    }
    
    return nfts
  }, [data])

  // Big Pulp image variants
  const BIG_PULP_IMAGES = [
    'Big-Pulp_Crown.png',
    'Big-Pulp_Beret.png',
    'Big-Pulp_Fedora.png',
    'Big-Pulp_Wiz.png',
    'Big-Pulp_Clown.png',
    'Big-Pulp_Tin.png',
    'Big-Pulp_Cowboy.png',
    'Big-Pulp_Cap.png',
    'Big-Pulp_Propella.png',
  ]

  // Pick a random Big Pulp image
  const pickRandomImage = useCallback((excludeImage = null) => {
    let available = BIG_PULP_IMAGES
    if (excludeImage) {
      available = BIG_PULP_IMAGES.filter(img => img !== excludeImage)
    }
    return available[Math.floor(Math.random() * available.length)]
  }, [])

  // Track the last shown version
  const [lastShownVersion, setLastShownVersion] = useState(null)

  // Function to pick initial version - avoids the last shown version
  const pickInitialVersion = useCallback(() => {
    const versions = ['A', 'B', 'C']
    if (lastShownVersion) {
      const available = versions.filter(v => v !== lastShownVersion)
      return available[Math.floor(Math.random() * available.length)]
    }
    return versions[Math.floor(Math.random() * versions.length)]
  }, [lastShownVersion])

  // Open a new Big Pulp window
  const handleOpenBigPulp = useCallback((nftId, nftData) => {
    // Don't open duplicate windows for same NFT
    if (openBigPulpWindows.some(w => w.nftId === nftId)) return

    const initialVersion = pickInitialVersion()
    const initialImage = pickRandomImage()
    
    setLastShownVersion(initialVersion)

    setOpenBigPulpWindows(prev => [
      ...prev,
      {
        nftId: String(nftId),
        nftData,
        currentVersion: initialVersion,
        currentImage: initialImage,
      }
    ])
  }, [openBigPulpWindows, pickInitialVersion, pickRandomImage])

  // Close Big Pulp window
  const handleCloseBigPulp = useCallback((nftId) => {
    setOpenBigPulpWindows(prev => prev.filter(w => w.nftId !== nftId))
  }, [])

  // Rotate Big Pulp version
  const rotateBigPulpVersion = useCallback((nftId) => {
    setOpenBigPulpWindows(prev => prev.map(w => {
      if (w.nftId !== nftId) return w
      
      // Rotate version: A → B → C → A
      const versionOrder = { 'A': 'B', 'B': 'C', 'C': 'A' }
      const currentVer = w.currentVersion && ['A', 'B', 'C'].includes(w.currentVersion) 
        ? w.currentVersion 
        : 'A'
      const nextVersion = versionOrder[currentVer] || 'A'
      
      // Pick new image
      const nextImage = pickRandomImage(w.currentImage)
      
      setLastShownVersion(nextVersion)
      
      return {
        ...w,
        currentVersion: nextVersion,
        currentImage: nextImage,
      }
    }))
  }, [pickRandomImage])

  // Handle MintGarden link click
  const handleMintGardenClick = useCallback(async (nftId) => {
    // Ensure MintGarden map is loaded
    if (!DataCache.loaded.mintgardenLauncherMap && !DataCache.loadingPromises.mintgardenLauncherMap) {
      try {
        await loadMintGardenLauncherMap()
      } catch (err) {
        showToast('Failed to load MintGarden map', 'error', 3000)
        return
      }
    }
    
    const launcher = DataCache.mintgardenLauncherMap?.[String(nftId)]
    
    if (launcher) {
      window.open(`https://mintgarden.io/nfts/${launcher}`, '_blank', 'noopener,noreferrer')
    } else {
      showToast(`MintGarden link not found for #${nftId}`, 'warning', 3000)
      const collectionId = DataCache.mintgardenLauncherMapMeta?.collectionId
      if (collectionId) {
        const searchQuery = encodeURIComponent(`Wojak #${String(nftId).padStart(4, '0')}`)
        window.open(`https://mintgarden.io/collections/${collectionId}?search=${searchQuery}`, '_blank', 'noopener,noreferrer')
      }
    }
  }, [showToast])

  // Persist hunter mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bigpulp_hunter_mode_v1', hunterMode)
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [hunterMode])

  // Persist favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bigpulp_pairing_favorites_v1', JSON.stringify(pairingFavorites))
    } catch (err) {
      // Ignore localStorage errors
    }
  }, [pairingFavorites])

  // Load rare pairings index when question is viewed
  useEffect(() => {
    if (currentView?.type === 'static_answer' && currentView?.question?.id === 'traits_that_almost_never_pair') {
      if (!DataCache.loaded.rarePairingsIndex && !DataCache.loadingPromises.rarePairingsIndex) {
        setLoadingRarePairings(true)
        loadRarePairingsIndex()
          .then(index => {
            setData(prev => ({ ...prev, rarePairingsIndex: index }))
            setLoadingRarePairings(false)
          })
          .catch(err => {
            setError(err.message || String(err))
            setLoadingRarePairings(false)
          })
      } else if (DataCache.loaded.rarePairingsIndex) {
        setData(prev => ({ ...prev, rarePairingsIndex: DataCache.rarePairingsIndex }))
      }
      
      // Also load mintgarden map metadata if not already loaded
      if (!DataCache.loaded.mintgardenLauncherMap && !DataCache.loadingPromises.mintgardenLauncherMap) {
        loadMintGardenLauncherMap()
          .then(() => {
            setMintgardenMapMeta(DataCache.mintgardenLauncherMapMeta)
          })
          .catch(() => {
            // Ignore errors, map is optional
          })
      } else if (DataCache.loaded.mintgardenLauncherMap) {
        setMintgardenMapMeta(DataCache.mintgardenLauncherMapMeta)
      }
    }
  }, [currentView])

  // Rotate commentary variant
  const handleRotateVariant = useCallback(() => {
    if (!selectedNft || !data?.sentences) return
    const sentences = data.sentences[selectedNft.id]
    if (!sentences?.variants || sentences.variants.length <= 1) return
    
    let newVariant
    do {
      newVariant = Math.floor(Math.random() * sentences.variants.length)
    } while (newVariant === lastVariant && sentences.variants.length > 1)
    
    setLastVariant(currentVariant)
    setCurrentVariant(newVariant)
  }, [selectedNft, data, currentVariant, lastVariant])

  // Copy commentary
  const handleCopy = useCallback(() => {
    if (!selectedNft || !data?.sentences) return
    const sentences = data.sentences[selectedNft.id]
    const variant = getSentenceVariant(selectedNft.id, currentVariant, data)
    if (variant) {
      navigator.clipboard.writeText(variant).catch(() => {})
    }
  }, [selectedNft, data, currentVariant])

  // Handle question selection
  const handleQuestionSelect = useCallback((question) => {
    if (question.type === 'dynamic') {
      // Check if question requires context (selected NFT)
      const requiresContext = question.requires_context !== false
      if (requiresContext && (!selectedNft || !analysis)) {
        // Question needs context but none selected
        return
      }
      setViewHistory(prev => [...prev, currentView])
      setCurrentView({ type: 'dynamic_answer', question, analysis: analysis || null })
    } else if (question.type === 'static') {
      setViewHistory(prev => [...prev, currentView])
      setCurrentView({ type: 'static_answer', question })
    }
  }, [selectedNft, analysis, currentView])

  // Navigate back
  const handleBack = useCallback(() => {
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1]
      setViewHistory(h => h.slice(0, -1))
      setCurrentView(prev)
    } else {
      setCurrentView(null)
    }
  }, [viewHistory])

  // Clear NFT selection
  const handleClearSelection = useCallback(() => {
    setSelectedNft(null)
    setAnalysis(null)
    setMode('explore')
    setCurrentView(null)
    setViewHistory([])
  }, [])

  // Get commentary text with fallback chain
  const getCommentaryText = useMemo(() => {
    if (!selectedNft || !data?.sentences) {
      return safeGet(analysis, 'story_hook', safeGet(analysis, 'highlight', ''))
    }
    const variant = getSentenceVariant(selectedNft.id, currentVariant, data)
    if (variant) return variant
    return safeGet(analysis, 'story_hook', safeGet(analysis, 'highlight', ''))
  }, [selectedNft, data, currentVariant, analysis])

  // Get sentence variants count
  const variantsCount = useMemo(() => {
    if (!selectedNft || !data?.sentences) return 0
    return data.sentences[selectedNft.id]?.variants?.length || 0
  }, [selectedNft, data])

  // Render loading state
  if (loading) {
    return (
      <Window
        id="big-pulp-intelligence"
        title="BIG PULP INTELLIGENCE"
        onClose={onClose}
        style={{ width: '800px', maxWidth: 'calc(100vw - 40px)' }}
      >
        <div className="bp-intelligence-window">
          <div className="bp-loading">
            <div className="bp-loading-spinner"></div>
            <div className="bp-loading-text">Loading Big Pulp Intelligence...</div>
          </div>
        </div>
      </Window>
    )
  }

  // Render error state
  if (error) {
    return (
      <Window
        id="big-pulp-intelligence"
        title="BIG PULP INTELLIGENCE"
        onClose={onClose}
        style={{ width: '800px', maxWidth: 'calc(100vw - 40px)' }}
      >
        <div className="bp-intelligence-window">
          <div className="bp-error">
            <div className="bp-error-title">⚠ Failed to load Big Pulp data</div>
            <div className="bp-error-message">{String(error)}</div>
            <div className="bp-error-hint">Please check your connection and try again.</div>
          </div>
        </div>
      </Window>
    )
  }

  return (
    <>
    <Window
      id="big-pulp-intelligence"
      title="BIG PULP INTELLIGENCE"
      onClose={onClose}
      style={{ width: '1100px', maxWidth: 'calc(100vw - 40px)', height: '700px' }}
      allowScroll={true}
    >
      <div className="bp-intelligence-window">
          {/* Context Bar */}
          {selectedNft && (
            <div className="bp-context-bar">
              <div className="bp-context-icon">📍</div>
              <div className="bp-context-info">
                <div className="bp-context-title">Analyzing: NFT #{selectedNft.id}</div>
                <div className="bp-context-subtitle">
                  <span className="bp-tier-badge" data-tier={safeGet(selectedNft, 'tier', 'common')}>
                    {safeGet(selectedNft, 'tier_label', 'Unknown')}
                  </span>
                  <span>{safeGet(selectedNft, 'base', 'Unknown')}</span>
                  <span>Rank #{safeGet(selectedNft, 'rank', '?')}</span>
                </div>
              </div>
              <button className="bp-context-clear" onClick={handleClearSelection} title="Clear selection">×</button>
            </div>
          )}

          <div className="bp-main-content">
            {/* Welcome State */}
            {mode === 'welcome' && !selectedNft && (
              <div className="bp-welcome">
                <div className="bp-welcome-icon">🍊</div>
                <div className="bp-welcome-title">Big Pulp Intelligence</div>
                <div className="bp-welcome-subtitle">
                  Select an NFT in the Rarity Explorer, and I'll tell you what makes it special.
                </div>
                <button className="bp-welcome-cta" onClick={() => setMode('explore')}>
                  Or Explore the Collection →
                </button>
              </div>
            )}

            {/* Context Mode - NFT Selected */}
            {mode === 'context' && selectedNft && !currentView && (
              <div className="bp-context-mode">
                {loadingContext ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : (
                  <>
                    {/* Commentary Card */}
                    <div className="bp-commentary-card">
                      <div className="bp-commentary-header">
                        <span>🍊</span>
                        <span>Big Pulp Says</span>
                        {variantsCount > 1 && (
                          <span className="bp-variant-indicator">
                            {currentVariant + 1}/{variantsCount}
                          </span>
                        )}
                      </div>
                      <div className="bp-commentary-text">
                        {getCommentaryText}
                      </div>
                      <div className="bp-commentary-actions">
                        <button
                          className="bp-btn bp-btn-rotate"
                          onClick={handleRotateVariant}
                          disabled={variantsCount <= 1}
                        >
                          🔄 Another Take
                        </button>
                        <button className="bp-btn" onClick={handleCopy}>📋 Copy</button>
                      </div>
                    </div>

                    {/* Smart Questions */}
                    {data?.questionTree?.dynamic_questions && (
                      <div className="bp-smart-questions">
                        <div className="bp-questions-header">💡 Ask about #{selectedNft.id}:</div>
                        <div className="bp-questions-list">
                          {data.questionTree.dynamic_questions
                            .filter(q => !q.requires_context || selectedNft)
                            .map(q => (
                              <button
                                key={q.id}
                                className="bp-question-btn"
                                onClick={() => handleQuestionSelect(q)}
                              >
                                {q.question} →
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    {analysis && (
                      <>
                        <div className="bp-quick-stats">
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">#{safeGet(analysis, 'rank', '?')}</div>
                            <div className="bp-stat-label">Overall</div>
                          </div>
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">#{safeGet(analysis, 'base_rank', '?')}</div>
                            <div className="bp-stat-label">In {safeGet(analysis, 'base', 'Unknown')}</div>
                          </div>
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">{safeGet(analysis, 's_tier_count', 0)}</div>
                            <div className="bp-stat-label">High Provenance</div>
                          </div>
                          <div className="bp-stat-box">
                            <div className="bp-stat-number">{safeGet(analysis, 'unique_count', 0)}</div>
                            <div className="bp-stat-label">1-of-1</div>
                          </div>
                        </div>

                        {/* Highlight */}
                        <div className="bp-highlight-card">
                          <div className="bp-highlight-label">✨ Highlight</div>
                          <div className="bp-highlight-text">{safeGet(analysis, 'highlight', 'No highlight available')}</div>
                        </div>
                      </>
                    )}

                    <button className="bp-explore-btn" onClick={() => setMode('explore')}>
                      📚 Explore the collection →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Category Buttons - Always visible in explore mode */}
            {mode === 'explore' && (
              <div style={{ padding: '8px', paddingBottom: '0' }}>
                {data?.questionTree?.categories && (
                  <div className="bp-categories">
                    {/* Citrus Value Button (Default First Tab) */}
                    <button
                      className={`bp-category-btn ${showTraitSaleAverages && !currentView && !showGlobalMarketMap ? 'active' : ''}`}
                      onClick={() => {
                        setShowTraitSaleAverages(true)
                        setShowTraitValues(false)
                        setSelectedCategory(null)
                        setCurrentView(null)
                        setViewHistory([])
                        setShowGlobalMarketMap(false)
                      }}
                    >
                      <div className="bp-category-icon-row">
                        <span className="bp-category-icon">🍊🍊</span>
                      </div>
                      <div className="bp-category-label">Citrus Value</div>
                    </button>
                    
                    {data.questionTree.categories
                      .filter(cat => !cat.requires_context || selectedNft)
                      .map(cat => {
                        // For traits category, show two stars; for others, duplicate the icon
                        const iconDisplay = cat.id === 'traits' ? '⭐⭐' : (cat.icon || '📁').repeat(2)
                        
                        // Labels for second row only (emojis go in first row)
                        let secondRowLabel = ''
                        
                        if (cat.id === 'traits') {
                          secondRowLabel = 'High Provenance'
                        } else if (cat.id === 'top_nfts') {
                          secondRowLabel = 'Top NFTs'
                        } else if (cat.id === 'stats') {
                          secondRowLabel = 'Collection Stats'
                        } else if (cat.id === 'discovery') {
                          // Change Discovery to Combo Explorer
                          secondRowLabel = 'Combo Explorer'
                        } else {
                          // For other categories, use the category name
                          secondRowLabel = cat.name
                        }
                        
                        // Determine if this button should be active
                        const isActive = cat.id === 'discovery' 
                          ? (currentView?.type === 'static_answer' && currentView?.question?.id === 'traits_that_almost_never_pair')
                          : cat.id === 'stats'
                          ? (selectedCategory === cat.id && (!currentView || showGlobalMarketMap))
                          : (selectedCategory === cat.id && !currentView && !showGlobalMarketMap)
                        
                        return (
                          <button
                            key={cat.id}
                            className={`bp-category-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              // Clear Citrus Value view state when switching to any other category
                              setShowTraitSaleAverages(false)
                              setSelectedTraitValue(null)
                              setTraitSaleAvgCategory(null)
                              
                              // Clear other category-specific state
                              setSelectedCategoryFilter(null)
                              setSelectedTraitFilter(null)
                              setProvenanceTrait(null)
                              setProvenanceCategory(null)
                              setShowGlobalMarketMap(false)
                              
                              // Special handling for discovery category - directly open combo explorer
                              if (cat.id === 'discovery') {
                                // Find the combo_explorer question and trigger it directly
                                // handleQuestionSelect will manage currentView and viewHistory
                                const comboExplorerQuestion = data?.questionTree?.dynamic_questions?.find(
                                  q => q.id === 'combo_explorer'
                                )
                                if (comboExplorerQuestion) {
                                  handleQuestionSelect(comboExplorerQuestion)
                                }
                              } else {
                                setCurrentView(null)
                                setViewHistory([])
                                setSelectedCategory(cat.id)
                                // Load analysis data when Top NFTs category is selected
                                if (cat.id === 'top_nfts') {
                                  if (!data?.analysis) {
                                    setLoadingContext(true)
                                    loadContextData()
                                      .then(contextData => {
                                        setData(prev => ({ ...prev, ...contextData }))
                                        setLoadingContext(false)
                                      })
                                      .catch(err => {
                                        setError(err.message || String(err))
                                        setLoadingContext(false)
                                      })
                                  }
                                }
                              }
                            }}
                          >
                            <div className="bp-category-icon-row">
                              <span className="bp-category-icon">{iconDisplay}</span>
                            </div>
                            {secondRowLabel && (
                              <div className="bp-category-label">{secondRowLabel}</div>
                            )}
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Explore Mode Content */}
            {mode === 'explore' && !currentView && !showGlobalMarketMap && (
              <div className="bp-explore-mode">
                {selectedCategory && data?.questionTree && (
                  <>
                    {/* Top NFTs Category - Always show dropdowns when in top_nfts tab */}
                    {selectedCategory === 'top_nfts' && (
                      <>
                        {loadingContext && !data?.analysis && (
                          <div className="bp-loading" style={{ padding: '40px', textAlign: 'center' }}>
                            <div className="bp-loading-spinner"></div>
                            <div className="bp-loading-text">Loading NFT data...</div>
                          </div>
                        )}
                        <TopNftsCategoryButtons
                          data={data}
                          setSelectedCategory={setSelectedCategoryFilter}
                          setSelectedTrait={setSelectedTraitFilter}
                          setLoadingContext={setLoadingContext}
                          setData={setData}
                          setError={setError}
                          onViewOpen={() => {}}
                          selectedCategoryFilter={selectedCategoryFilter}
                          selectedTraitFilter={selectedTraitFilter}
                        />
                      </>
                    )}

                    {/* Top NFTs View - Show grid when category and trait are selected */}
                    {selectedCategory === 'top_nfts' && selectedCategoryFilter && selectedTraitFilter && (
                      <div className="bp-answer-view">
                        {loadingContext ? (
                          <div className="bp-loading">
                            <div className="bp-loading-spinner"></div>
                            <div className="bp-loading-text">Loading top NFTs...</div>
                          </div>
                        ) : (
                          <TopNftsByBaseTypeView
                            baseType={selectedTraitFilter}
                            topNfts={getTopNftsByCategoryTrait(selectedCategoryFilter, selectedTraitFilter, 50)}
                            onNftClick={handleNftClick}
                            onMintGardenClick={handleMintGardenClick}
                            onOpenBigPulp={handleOpenBigPulp}
                          />
                        )}
                      </div>
                    )}

                    {/* High Provenance Explorer for traits category */}
                    {selectedCategory === 'traits' && !provenanceTrait && (
                      <HighProvenanceExplorer
                        data={data}
                        setProvenanceCategory={setProvenanceCategory}
                        setProvenanceTrait={setProvenanceTrait}
                        provenanceCategory={provenanceCategory}
                        provenanceTrait={provenanceTrait}
                        onTraitSelect={(trait) => {
                          // Trait selected, will show trait info view
                        }}
                      />
                    )}

                    {/* High Provenance Trait Info View */}
                    {selectedCategory === 'traits' && provenanceTrait && (
                      <div className="bp-answer-view">
                        <button 
                          className="bp-back-btn" 
                          onClick={() => {
                            setProvenanceTrait(null)
                          }}
                        >
                          ← Back
                        </button>
                        <HighProvenanceTraitView 
                          traitName={provenanceTrait}
                          data={data}
                          getTopNftsByCategoryTrait={getTopNftsByCategoryTrait}
                          onNftClick={handleNftClick}
                          onMintGardenClick={handleMintGardenClick}
                          onOpenBigPulp={handleOpenBigPulp}
                        />
                      </div>
                    )}

                    {/* Other categories - Show question list */}
                    {selectedCategory !== 'top_nfts' && selectedCategory !== 'traits' && (
                      <div className="bp-question-list">
                        {data.questionTree.dynamic_questions
                          ?.filter(q => 
                            q.category === selectedCategory && 
                            q.id !== 'traits_that_almost_never_pair' &&
                            q.id !== 'combo_explorer' // Hide the combo explorer question button
                          )
                          .map(q => (
                            <button
                              key={q.id}
                              className="bp-question-btn"
                              onClick={() => handleQuestionSelect(q)}
                              disabled={q.requires_context !== false && !selectedNft}
                            >
                              {q.question}
                              {q.requires_context !== false && !selectedNft && <span className="bp-requires"> (select NFT)</span>}
                              <span className="bp-question-arrow"> →</span>
                            </button>
                          ))}
                        {data.questionTree.static_questions
                          ?.filter(q => q.category === selectedCategory && q.id !== 'traits_that_almost_never_pair')
                          .map(q => (
                            <button
                              key={q.id}
                              className="bp-question-btn"
                              onClick={() => handleQuestionSelect(q)}
                            >
                              {q.question}
                              <span className="bp-question-arrow"> →</span>
                            </button>
                          ))}
                        {/* Add Market Map button for stats category */}
                        {selectedCategory === 'stats' && (
                          <button
                            className="bp-question-btn"
                            onClick={() => setShowGlobalMarketMap(true)}
                          >
                            Market Map
                            <span className="bp-question-arrow"> →</span>
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Global Market Map View */}
            {showGlobalMarketMap && (
              <div className="bp-answer-view">
                <button className="bp-back-btn" onClick={() => setShowGlobalMarketMap(false)}>← Back</button>
                <h3 className="bp-answer-title">Market Map - Global Collection Stats</h3>
                <GlobalMarketMapView />
              </div>
            )}

            {/* Value Engine View (Trait Values + Deals Scanner) */}
            {showTraitSaleAverages && !showGlobalMarketMap && (() => {
              // Category labels for dropdown
              const categoryLabels = {
                base: 'Base',
                clothes: 'Clothes',
                head: 'Head',
                face: 'Face',
                mouth: 'Mouth',
                facewear: 'Eyes',
                background: 'Background'
              }
              
              // Compute traits for selected category
              const traitsForCategory = traitSaleAvgCategory && DataCache.traitSaleAverages
                ? (() => {
                    const traits = []
                    for (const traitKey in DataCache.traitSaleAverages) {
                      const stats = DataCache.traitSaleAverages[traitKey]
                      if (stats.category === traitSaleAvgCategory) {
                        traits.push({
                          traitKey,
                          value: stats.value,
                          stats
                        })
                      }
                    }
                    traits.sort((a, b) => a.value.localeCompare(b.value))
                    return traits
                  })()
                : []
              
              // Get floor price for display
              const offersIndex = DataCache.mintgardenOffersIndex
              const valueModel = DataCache.valueModelV2 || DataCache.valueModelV1
              const floorXch = offersIndex?.floor_xch || offersIndex?.market_stats?.floor_xch || valueModel?.floor?.xch || null
              const floorGeneratedAt = offersIndex?.generated_at
              const floorAsOf = floorGeneratedAt ? (() => {
                const floorDate = new Date(floorGeneratedAt)
                const now = Date.now()
                const diffMs = now - floorDate.getTime()
                const diffMins = Math.floor(diffMs / 60000)
                if (diffMins < 1) return 'just now'
                if (diffMins < 60) return `${diffMins}m ago`
                const diffHours = Math.floor(diffMins / 60)
                if (diffHours < 24) return `${diffHours}h ago`
                const diffDays = Math.floor(diffHours / 24)
                return `${diffDays}d ago`
              })() : null
              
              const formatPriceXCH = (price) => {
                if (price < 0.01) return price.toFixed(4)
                return price.toFixed(2)
              }
              
              return (
                <div className="bp-answer-view">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="bp-back-btn" onClick={() => setShowTraitSaleAverages(false)}>← Back</button>
                      
                      {/* Category Dropdown */}
                      <label style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                        Category:
                        <select
                          value={traitSaleAvgCategory || ''}
                          onChange={(e) => {
                            setTraitSaleAvgCategory(e.target.value || null)
                            setSelectedTraitValue(null)
                          }}
                          className="bp-select"
                          style={{ marginLeft: '5px' }}
                        >
                          <option value="">-- Select --</option>
                          {['base', 'face', 'mouth', 'facewear', 'head', 'clothes', 'background'].map(cat => (
                            <option key={cat} value={cat}>
                              {categoryLabels[cat] || cat}
                            </option>
                          ))}
                        </select>
                      </label>
                      
                      {/* Trait Dropdown - Always Visible */}
                      <label style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                        Trait:
                        <select
                          value={selectedTraitValue || ''}
                          onChange={(e) => setSelectedTraitValue(e.target.value || null)}
                          className="bp-select"
                          style={{ marginLeft: '5px', minWidth: '150px' }}
                          disabled={!traitSaleAvgCategory}
                        >
                          <option value="">
                            {traitSaleAvgCategory ? '-- Select --' : '-- Select category first --'}
                          </option>
                          {traitsForCategory.map(t => (
                            <option key={t.traitKey} value={t.value}>
                              {t.value}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    
                    {/* Floor Price - Right side */}
                    <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                      {floorXch != null ? (
                        <>
                          Floor now: {formatPriceXCH(floorXch)} XCH
                          {floorAsOf && ` (as of ${floorAsOf})`}
                        </>
                      ) : (
                        'Floor: Loading...'
                      )}
                    </div>
                  </div>
                
                <TraitSaleAveragesView
                  onBack={() => setShowTraitSaleAverages(false)}
                  onNftClick={handleNftClick}
                  selectedTraitCategory={traitSaleAvgCategory}
                  setSelectedTraitCategory={setTraitSaleAvgCategory}
                  selectedTraitValue={selectedTraitValue}
                  setSelectedTraitValue={setSelectedTraitValue}
                  traitSearchQuery={traitSaleAvgSearchQuery}
                  setTraitSearchQuery={setTraitSaleAvgSearchQuery}
                  traitSortBy={traitSaleAvgSortBy}
                  setTraitSortBy={setTraitSaleAvgSortBy}
                  traitCategoryFilter={traitSaleAvgCategoryFilter}
                  setTraitCategoryFilter={setTraitSaleAvgCategoryFilter}
                  showAllTraitsTable={showAllTraitsTable}
                  setShowAllTraitsTable={setShowAllTraitsTable}
                  traitSalesSortBy={traitSalesSortBy}
                  setTraitSalesSortBy={setTraitSalesSortBy}
                />
                </div>
              )
            })()}

            {showTraitValues && !showGlobalMarketMap && !showTraitSaleAverages && (
              <div className="bp-answer-view">
                <button className="bp-back-btn" onClick={() => setShowTraitValues(false)}>← Back</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 className="bp-answer-title" style={{ margin: 0 }}>Value Engine</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {offersLastUpdated && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {(() => {
                          const age = nowTick - (offersLastUpdated || 0)
                          const isStale = age > POLL_INTERVAL_MS
                          return (
                            <>
                              {isStale && <span style={{ color: '#d00', fontWeight: 'bold', marginRight: '5px' }}>STALE:</span>}
                              Last updated: {formatRelativeTime(offersLastUpdated, nowTick)}
                            </>
                          )
                        })()}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (DataCache.offersRefreshInProgress) return
                        const lastAttempt = DataCache.offersLastRefreshAttempt
                        const now = Date.now()
                        if (lastAttempt && (now - lastAttempt) < MANUAL_REFRESH_COOLDOWN_MS) {
                          const remainingSeconds = Math.ceil((MANUAL_REFRESH_COOLDOWN_MS - (now - lastAttempt)) / 1000)
                          showToast(`Please wait ${remainingSeconds}s before refreshing again`, 'warning')
                          return
                        }
                        if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
                          showToast(`Please wait ${retryAfterSeconds}s (rate limited)`, 'warning')
                          return
                        }
                        setOffersRefreshState('refreshing')
                        setRetryAfterSeconds(null)
                        try {
                          const result = await loadLiveOffersIndex(true)
                          if (result && result.data) {
                            setOffersIndex(result.data)
                          }
                          if (result && result.generatedAtMs) {
                            setOffersLastUpdated(result.generatedAtMs)
                          }
                          setOffersRefreshState('refreshed')
                          setTimeout(() => setOffersRefreshState('idle'), 5000)
                        } catch (err) {
                          // Handle error - may include cached data
                          if (err && typeof err === 'object' && err.data) {
                            setOffersIndex(err.data)
                          }
                          if (err && typeof err === 'object' && err.generatedAtMs) {
                            setOffersLastUpdated(err.generatedAtMs)
                          }
                          // Check if error message contains retry information
                          const errorMsg = (err && err.error ? err.error.message : null) || (err && err.message ? err.message : null) || String(err)
                          const retryMatch = errorMsg.match(/Retry after (\d+) seconds?/i)
                          if (retryMatch) {
                            const retrySeconds = parseInt(retryMatch[1], 10)
                            setRetryAfterSeconds(retrySeconds)
                            showToast(`Rate limited. Retry after ${retrySeconds}s`, 'warning')
                          } else {
                            showToast('Couldn\'t update; showing cached offers', 'warning')
                          }
                          setOffersRefreshState('idle')
                          // Keep cached data visible (never wipe on failure)
                        }
                      }}
                      disabled={DataCache.offersRefreshInProgress || offersRefreshState === 'refreshing' || (retryAfterSeconds !== null && retryAfterSeconds > 0)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: (DataCache.offersRefreshInProgress || offersRefreshState === 'refreshing' || (retryAfterSeconds !== null && retryAfterSeconds > 0)) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {offersRefreshState === 'refreshing' ? 'Updating...' : 
                       offersRefreshState === 'refreshed' ? 'Refreshed just now' :
                       retryAfterSeconds !== null && retryAfterSeconds > 0 ? `Retry in ${retryAfterSeconds}s` :
                       'Refresh'}
                    </button>
                  </div>
                </div>
                
                {/* Trait Values View (simplified - no tabs) */}
                <TraitValuesView
                  selectedTraitKey={selectedTraitKey}
                  setSelectedTraitKey={setSelectedTraitKey}
                  selectedTraitCategory={selectedTraitCategory}
                  setSelectedTraitCategory={setSelectedTraitCategory}
                  traitSortBy={traitSortBy}
                  setTraitSortBy={setTraitSortBy}
                  hoveredTraitKey={hoveredTraitKey}
                  setHoveredTraitKey={setHoveredTraitKey}
                  pinnedInspector={pinnedInspector}
                  setPinnedInspector={setPinnedInspector}
                  activeCTAMode={activeCTAMode}
                  setActiveCTAMode={setActiveCTAMode}
                  traitDetailTab={traitDetailTab}
                  setTraitDetailTab={setTraitDetailTab}
                  onBack={() => setShowTraitValues(false)}
                  onNftClick={handleNftClick}
                />
              </div>
            )}

            {/* Answer View */}
            {currentView && !showGlobalMarketMap && !showTraitValues && (
              <div className="bp-answer-view">
                {currentView.type === 'static_answer' && currentView.question.id === 'traits_that_almost_never_pair' ? (
                  <div className="bp-answer-header-row">
                    <button className="bp-back-btn" onClick={handleBack}>← Back</button>
                    <h3 className="bp-answer-title">Combo Explorer</h3>
                  </div>
                ) : (
                  <button className="bp-back-btn" onClick={handleBack}>← Back</button>
                )}
                
                {currentView.type === 'static_answer' && (
                  <div className="bp-static-answer">
                    {currentView.question.id === 'traits_that_almost_never_pair' ? (
                      <RarePairingsExplorer
                        rarePairingsIndex={data?.rarePairingsIndex}
                        loading={loadingRarePairings}
                        primaryCategory={primaryCategory}
                        setPrimaryCategory={setPrimaryCategory}
                        drilldownCategory={drilldownCategory}
                        setDrilldownCategory={setDrilldownCategory}
                        primaryGroupKey={primaryGroupKey}
                        setPrimaryGroupKey={setPrimaryGroupKey}
                        drilldownGroupKey={drilldownGroupKey}
                        setDrilldownGroupKey={setDrilldownGroupKey}
                        hunterMode={hunterMode}
                        setHunterMode={setHunterMode}
                        pairingFavorites={pairingFavorites}
                        setPairingFavorites={setPairingFavorites}
                        activePairKey={activePairKey}
                        setActivePairKey={setActivePairKey}
                        showOnlyBookmarks={showOnlyBookmarks}
                        setShowOnlyBookmarks={setShowOnlyBookmarks}
                        familyView={familyView}
                        setFamilyView={setFamilyView}
                        onNftClick={handleNftClick}
                      />
                    ) : (
                      // Standard rendering for other static questions
                      <>
                        <h3 className="bp-answer-title">{currentView.question.question}</h3>
                        <div className="bp-answer-content">
                          {(currentView.question.answer || '').split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                        {(() => {
                          const previewIds = normalizeNftIds(currentView.question.nft_ids, 10)
                          if (previewIds.length === 0) return null
                          return (
                            <div className="bp-nft-links">
                              {previewIds.map(id => {
                                const imageUrl = getNftImageUrl(id)
                                return (
                                  <button
                                    key={id}
                                    className="bp-nft-link"
                                    onClick={() => handleNftClick(id)}
                                  >
                                    <div className="bp-nft-link-content">
                                      {imageUrl && (
                                        <img
                                          src={imageUrl}
                                          alt={`NFT #${id}`}
                                          className="bp-nft-link-image"
                                        />
                                      )}
                                      <span className="bp-nft-link-text">#{id}</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {currentView.type === 'dynamic_answer' && (
                  <DynamicAnswer question={currentView.question} analysis={currentView.analysis} onNftClick={handleNftClick} mintGardenMapStats={mintGardenMapStats} />
                )}
              </div>
            )}
          </div>
        </div>
      </Window>
      
      {/* BigPulp Windows */}
      {openBigPulpWindows.map(({ nftId, nftData, currentVersion, currentImage }) => {
        // Extract NFT traits from nftData (analysis object) for image selection
        const nftTraits = nftData ? [
          nftData.base,
          nftData.face,
          nftData.mouth,
          nftData.face_wear,
          nftData.head,
          nftData.clothes,
          nftData.background,
        ].filter(Boolean) : null

        // Get commentary for current version
        const nftIdStr = String(nftId)
        const versionData = bigPulpData[currentVersion] || {}
        let commentary = versionData[nftIdStr] || versionData[String(parseInt(nftIdStr))] || 'No commentary available for this NFT.'

        return (
          <BigPulpWindow
            key={`bigpulp-${nftId}`}
            isOpen={true}
            onClose={() => handleCloseBigPulp(nftId)}
            nftId={nftId}
            commentary={commentary}
            nftTraits={nftTraits}
            currentVersion={currentVersion}
            currentImage={currentImage}
            onRotate={() => rotateBigPulpVersion(nftId)}
          />
        )
      })}
    </>
  )
}

// ============================================
// GLOBAL MARKET MAP VIEW
// ============================================
const GlobalMarketMapView = () => {
  const { showToast } = useToast()
  const { bringToFront, restoreWindow, isWindowMinimized, getWindow } = useWindow()
  const [marketScale, setMarketScale] = useState('floor') // 'floor' | 'xch'
  const [marketChartType, setMarketChartType] = useState('heat') // 'heat' | 'hist'
  const [marketTooltip, setMarketTooltip] = useState(null)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [offersIndex, setOffersIndex] = useState(DataCache.mintgardenOffersIndex)
  const [offersLastUpdated, setOffersLastUpdated] = useState(null)
  const [loadingRankData, setLoadingRankData] = useState(false)
  const [rankById, setRankById] = useState(new Map())
  const [valueModel, setValueModel] = useState(null)
  const [loadingValueModel, setLoadingValueModel] = useState(false)
  const [xchPriceUSD, setXchPriceUSD] = useState(null) // Current XCH/USD price from treasury API
  
  // Get xchUsdFallback - ALWAYS provide a value (never null)
  // Priority: 1) Treasury API current price, 2) Value model price, 3) Offers index price, 4) Hardcoded fallback (~$4.70)
  // We prefer current price over historical build-time prices for accurate USD conversions
  const xchUsdFallback = useMemo(() => {
    // First try current price from treasury API (most accurate)
    if (xchPriceUSD != null && typeof xchPriceUSD === 'number' && isFinite(xchPriceUSD) && xchPriceUSD > 0) {
      return xchPriceUSD
    }
    // Then try value model build-time price
    if (valueModel?.market?.xch_usd_at_build) {
      return valueModel.market.xch_usd_at_build
    }
    // Then try offers index build-time price (fallback to cached if current unavailable)
    if (offersIndex?.xch_usd_at_build) {
      return offersIndex.xch_usd_at_build
    }
    if (DataCache.mintgardenOffersIndex?.xch_usd_at_build) {
      return DataCache.mintgardenOffersIndex.xch_usd_at_build
    }
    // Last resort: use a reasonable hardcoded fallback (~$4.70 USD per XCH as of Jan 2025)
    // This ensures USD is ALWAYS calculable even if APIs are unavailable
    return 4.7
  }, [xchPriceUSD, valueModel, offersIndex])
  
  // Heatmap state
  const [normalization, setNormalization] = useState('count') // 'count' | 'rowPercent' | 'globalPercent'
  const [heatmapMode, setHeatmapMode] = useState('none') // 'none' | 'sleepy' | 'delusion' | 'nearFloor' | 'rareReasonable' | 'whale'
  const [selectedCell, setSelectedCell] = useState(null) // { row, col, ids } or null
  const [pinnedCell, setPinnedCell] = useState(null) // { row, col } or null
  const [hoveredCell, setHoveredCell] = useState(null) // { row, col } or null
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleChange = (e) => setIsMobile(e.matches)
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])
  
  // Load value model when component mounts
  useEffect(() => {
    const loadModel = async () => {
      if (DataCache.loaded.valueModelV1) {
        setValueModel(DataCache.valueModelV1)
        return
      }
      
      setLoadingValueModel(true)
      try {
        const model = await loadValueModelV2() // Use v2 loader (falls back to v1)
        setValueModel(model)
      } catch (err) {
        console.error('Failed to load value model:', err)
      } finally {
        setLoadingValueModel(false)
      }
    }
    
    loadModel()
  }, [])
  
  // Load XCH price from treasury API with automatic refresh (every 60 minutes)
  useEffect(() => {
    const loadXchPrice = async () => {
      try {
        const price = await fetchXCHPrice(false) // Use cache if available
        if (price != null && typeof price === 'number' && isFinite(price) && price > 0) {
          setXchPriceUSD(price)
        }
      } catch (err) {
        console.warn('[Global Market Map] Failed to load XCH price:', err)
        // Don't set state - will use fallback from useMemo
      }
    }
    
    // Initial load
    loadXchPrice()
    
    // Poll every 60 minutes for XCH price updates
    const XCH_PRICE_POLL_INTERVAL = 60 * 60 * 1000 // 60 minutes
    const priceIntervalId = setInterval(() => {
      loadXchPrice()
    }, XCH_PRICE_POLL_INTERVAL)
    
    return () => clearInterval(priceIntervalId)
  }, [])
  
  // Load offers index when component mounts (use live endpoint)
  useEffect(() => {
    const checkAndLoad = async () => {
      // ALWAYS start with loading false - we'll set it true only if needed
      setLoadingOffers(false)
      
      // Check if we have cached data FIRST - use it immediately
      if (DataCache.mintgardenOffersIndex) {
        const cached = DataCache.mintgardenOffersIndex
        const hasListings = cached.listings_by_id && Object.keys(cached.listings_by_id || {}).length > 0
        
        // Use cached data immediately (even if no listings, show it)
        setOffersIndex(cached)
        if (DataCache.offersLastFetchedAt) {
          setOffersLastUpdated(DataCache.offersLastFetchedAt)
        }
        
        // If we have listings, we're done - don't block on refresh
        if (hasListings) {
          console.log('[Global Market Map] Using cached data with listings, refreshing in background')
          // Refresh in background (non-blocking, don't show loading)
          loadLiveOffersIndex(false)
            .then(result => {
              if (result && result.data) {
                setOffersIndex(result.data)
              }
              if (result && result.generatedAtMs) {
                setOffersLastUpdated(result.generatedAtMs)
              }
            })
            .catch(err => {
              console.error('[Global Market Map] Background refresh failed:', err.message || err)
            })
          return // Don't wait, show cached data immediately
        }
        
        // If cached data exists but has no listings, check if stale
        const cachedAge = DataCache.offersLastFetchedAt ? (Date.now() - DataCache.offersLastFetchedAt) : Infinity
        const isStale = cachedAge > (10 * 60 * 1000) // 10 minutes
        
        if (isStale) {
          console.log('[Global Market Map] Cached data is stale, fetching fresh data...')
          // Data is stale, show loading and fetch fresh
          setLoadingOffers(true)
          try {
            const result = await loadLiveOffersIndex(true)
            if (result && result.data) {
              setOffersIndex(result.data)
            }
            if (result && result.generatedAtMs) {
              setOffersLastUpdated(result.generatedAtMs)
            }
          } catch (err) {
            console.error('[Global Market Map] Failed to load fresh offers:', err.message || err)
            // Keep showing cached data even if stale
          } finally {
            setLoadingOffers(false)
          }
        } else {
          // Cached data is fresh but has no listings - might be valid empty state
          // Try background refresh without blocking
          console.log('[Global Market Map] Cached data is fresh but has no listings, trying background refresh')
          setLoadingOffers(false) // Ensure loading is false
          loadLiveOffersIndex(false)
            .then(result => {
              if (result && result.data) {
                setOffersIndex(result.data)
              }
              if (result && result.generatedAtMs) {
                setOffersLastUpdated(result.generatedAtMs)
              }
            })
            .catch(err => {
              console.error('[Global Market Map] Background refresh failed:', err.message || err)
            })
        }
      } else {
        // No cached data, must load (show loading)
        console.log('[Global Market Map] No cached data, loading...')
        setLoadingOffers(true)
        try {
          const result = await loadLiveOffersIndex(false) // Don't force, use cache check
          if (result && result.data) {
            setOffersIndex(result.data)
          }
          if (result && result.generatedAtMs) {
            setOffersLastUpdated(result.generatedAtMs)
          }
        } catch (err) {
          console.error('[Global Market Map] Failed to load offers:', err.message || err)
        } finally {
          setLoadingOffers(false)
        }
      }
    }
    
    checkAndLoad()
  }, [])
  
  // Sync offersIndex state when DataCache updates (e.g., after refresh or fallback with real data)
  // Poll DataCache periodically if we don't have listings data yet
  useEffect(() => {
    const currentHasListings = offersIndex?.listings_by_id && 
                              Object.keys(offersIndex.listings_by_id || {}).length > 0
    
    // If we already have listings, no need to poll
    if (currentHasListings) return
    
    // If we have offersIndex but no listings, it might be stale cached data with empty listings_by_id
    // Try to trigger a refresh if data is stale
    if (offersIndex && !currentHasListings) {
      if (import.meta.env.DEV) {
        console.warn('[Global Market Map] offersIndex exists but listings_by_id is empty - triggering refresh')
      }
      
      // Clear stale cached data and force refresh (only once, not in a loop)
      let refreshTriggered = false
      const triggerRefresh = () => {
        if (refreshTriggered) return
        refreshTriggered = true
        
        // Clear the stale cache
        if (DataCache.mintgardenOffersIndex && (!DataCache.mintgardenOffersIndex.listings_by_id || 
            Object.keys(DataCache.mintgardenOffersIndex.listings_by_id || {}).length === 0)) {
          DataCache.mintgardenOffersIndex = null
          DataCache.loaded.mintgardenOffersIndex = false
          // Clear localStorage cache too
          try {
            localStorage.removeItem('wojakInk_offers_cache')
          } catch (e) {
            // Ignore localStorage errors
          }
        }
        
        // Force a refresh
        setLoadingOffers(true)
        loadLiveOffersIndex(true)
          .then(result => {
            if (result && result.data) {
              setOffersIndex(result.data)
            }
            if (result && result.generatedAtMs) {
              setOffersLastUpdated(result.generatedAtMs)
            }
            setLoadingOffers(false)
          })
          .catch(err => {
            setLoadingOffers(false)
            if (import.meta.env.DEV) {
              console.error('[Global Market Map] Failed to refresh offers index:', err)
            }
          })
      }
      
      // Trigger refresh after a short delay to avoid race conditions
      const refreshTimeout = setTimeout(triggerRefresh, 1000)
      
      // Also set up polling to check for updates
      const checkAndSync = () => {
        if (!DataCache.mintgardenOffersIndex) return
        
        // Check if DataCache has listings data
        const cacheHasListings = DataCache.mintgardenOffersIndex.listings_by_id && 
                                 Object.keys(DataCache.mintgardenOffersIndex.listings_by_id).length > 0
        
        // Update if cache has listings and current doesn't (e.g., fallback had empty, now we have real data)
        if (cacheHasListings) {
          console.log('[Global Market Map] Syncing offersIndex from DataCache (has listings)')
          setOffersIndex(DataCache.mintgardenOffersIndex)
          if (DataCache.offersLastFetchedAt) {
            setOffersLastUpdated(DataCache.offersLastFetchedAt)
          }
          clearTimeout(refreshTimeout)
        }
      }
      
      // Poll every 2 seconds, but stop once we get data
      const interval = setInterval(() => {
        const stillNeedsListings = !offersIndex?.listings_by_id || 
                                   Object.keys(offersIndex.listings_by_id || {}).length === 0
        if (!stillNeedsListings) {
          clearInterval(interval)
          clearTimeout(refreshTimeout)
          return
        }
        checkAndSync()
      }, 2000)
      
      return () => {
        clearInterval(interval)
        clearTimeout(refreshTimeout)
      }
    }
    
    const checkAndSync = () => {
      if (!DataCache.mintgardenOffersIndex) return
      
      // Check if DataCache has listings data
      const cacheHasListings = DataCache.mintgardenOffersIndex.listings_by_id && 
                               Object.keys(DataCache.mintgardenOffersIndex.listings_by_id).length > 0
      
      // Update if cache has listings and current doesn't (e.g., fallback had empty, now we have real data)
      if (cacheHasListings) {
        console.log('[Global Market Map] Syncing offersIndex from DataCache (has listings)')
        setOffersIndex(DataCache.mintgardenOffersIndex)
        if (DataCache.offersLastFetchedAt) {
          setOffersLastUpdated(DataCache.offersLastFetchedAt)
        }
      }
    }
    
    // Check immediately
    checkAndSync()
    
    // Poll every 2 seconds, but stop once we get data
    const interval = setInterval(() => {
      const stillNeedsListings = !offersIndex?.listings_by_id || 
                                 Object.keys(offersIndex.listings_by_id || {}).length === 0
      if (!stillNeedsListings) {
        clearInterval(interval)
        return
      }
      checkAndSync()
    }, 2000)
    
    // Stop polling after 60 seconds max
    const timeout = setTimeout(() => clearInterval(interval), 60000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [offersIndex])
  
  // Load rank data when offers index is available
  useEffect(() => {
    if (!offersIndex || !offersIndex.listings_by_id) return
    
    const loadRankData = async () => {
      setLoadingRankData(true)
      const newRankById = new Map()
      
      // Try to get ranks from DataCache.analysis first
      if (DataCache.analysis) {
        const listedIds = Object.keys(offersIndex.listings_by_id)
        for (const id of listedIds) {
          const analysis = DataCache.analysis[id]
          if (analysis && analysis.rank != null) {
            newRankById.set(id, analysis.rank)
          }
        }
      }
      
      // If we don't have all ranks, load from shards
      const listedIds = Object.keys(offersIndex.listings_by_id)
      const missingIds = listedIds.filter(id => !newRankById.has(id))
      
      if (missingIds.length > 0) {
        // Load shards for missing IDs
        await loadTraitsForManyIds(missingIds)
        
        // Extract ranks from loaded shards
        for (const nftId of missingIds) {
          const idNum = parseInt(nftId, 10)
          if (isNaN(idNum) || idNum < 1 || idNum > 4200) continue
          
          const SHARD_SIZE = 100
          const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
          const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
          const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`
          const shard = DataCache.comboTraitsShardCache.get(rangeKey)
          
          if (shard && shard.nfts && shard.nfts[nftId] && shard.nfts[nftId].rank != null) {
            newRankById.set(nftId, shard.nfts[nftId].rank)
          }
        }
      }
      
      setRankById(newRankById)
      setLoadingRankData(false)
    }
    
    loadRankData()
  }, [offersIndex])
  
  // Mode constants
  const SLEEPY_MAX_MULT = 1.25
  const NEAR_FLOOR_MAX_MULT = 1.25
  const RARE_REASONABLE_MAX_MULT = 2.0
  const DELUSION_MIN_MULT = 5.0
  const WHALE_MIN_MULT = 10.0
  const RARE_TOP_PCT_SLEEPY = 0.20
  const RARE_TOP_PCT_REASONABLE = 0.20
  const COMMON_BOTTOM_PCT_DELUSION = 0.50
  
  // Define price bins
  const priceBins = useMemo(() => {
    if (marketScale === 'floor') {
      return [
        { lo: 1.0, hi: 1.1, label: '1–1.1×' },
        { lo: 1.1, hi: 1.25, label: '1.1–1.25×' },
        { lo: 1.25, hi: 1.5, label: '1.25–1.5×' },
        { lo: 1.5, hi: 2.0, label: '1.5–2×' },
        { lo: 2.0, hi: 3.0, label: '2–3×' },
        { lo: 3.0, hi: 5.0, label: '3–5×' },
        { lo: 5.0, hi: 10.0, label: '5–10×' },
        { lo: 10.0, hi: null, label: '10–∞×' }
      ]
    } else {
      return [
        { lo: 0, hi: 0.5, label: '0–0.5' },
        { lo: 0.5, hi: 1, label: '0.5–1' },
        { lo: 1, hi: 2, label: '1–2' },
        { lo: 2, hi: 3, label: '2–3' },
        { lo: 3, hi: 5, label: '3–5' },
        { lo: 5, hi: 10, label: '5–10' },
        { lo: 10, hi: 20, label: '10–20' },
        { lo: 20, hi: null, label: '20–∞' }
      ]
    }
  }, [marketScale])
  
  // Rarity labels (0-10% rarest at top, 90-100% common at bottom)
  const rarityLabels = [
    '0–10% (rarest)',
    '10–20%',
    '20–30%',
    '30–40%',
    '40–50%',
    '50–60%',
    '60–70%',
    '70–80%',
    '80–90%',
    '90–100% (common)'
  ]
  
  // Get market data - NEVER return null if offersIndex exists (to allow UI to render)
  const marketData = useMemo(() => {
    if (!offersIndex) return null
    
    const marketStats = offersIndex.market_stats
    if (!marketStats || !marketStats.floor_xch) {
      // Fallback: compute from listings
      const listings = Object.values(offersIndex.listings_by_id || {})
      const prices = listings
        .map(l => l.best_listing?.price_xch)
        .filter(p => p != null)
      
      if (prices.length === 0) {
        // Return empty state instead of null - allows UI to render
        return {
          listedCount: 0,
          floor: null,
          prices: [],
          marketStats: null,
          offersIndex // Include offersIndex so UI can still render
        }
      }
      
      const floor = Math.min(...prices)
      return {
        listedCount: prices.length,
        floor,
        prices,
        marketStats: null,
        offersIndex
      }
    }
    
    return {
      listedCount: marketStats.listed_count || 0,
      floor: marketStats.floor_xch,
      prices: null, // Use precomputed bins
      marketStats,
      offersIndex
    }
  }, [offersIndex])
  
  // Build 2D matrix (10 rarity buckets × 8 price bins)
  const heatmapMatrix = useMemo(() => {
    // Check if we have valid data
    const hasListings = offersIndex?.listings_by_id && Object.keys(offersIndex.listings_by_id).length > 0
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[Global Market Map] Heatmap computation check:', {
        hasOffersIndex: !!offersIndex,
        hasMarketData: !!marketData,
        hasListings,
        listingsCount: hasListings ? Object.keys(offersIndex.listings_by_id).length : 0,
        rankByIdSize: rankById.size,
        marketScale,
        hasFloor: !!marketData?.floor
      })
    }
    
    // Remove rankById.size === 0 check - we handle missing ranks with fallback
    // Allow rendering even if marketData is empty - show empty state
    if (!offersIndex || !marketData) {
      if (import.meta.env.DEV) {
        console.log('[Global Market Map] Heatmap: Returning empty matrix (missing data)')
      }
      return {
        matrix: Array(10).fill(null).map(() => Array(8).fill(0)),
        cellIds: Array(10).fill(null).map(() => Array(8).fill(null).map(() => [])),
        cellStats: Array(10).fill(null).map(() => Array(8).fill(null).map(() => ({
          count: 0,
          minPrice: null,
          medianPrice: null,
          p90Price: null,
          totalXchListed: 0,
          prices: []
        }))),
        rowTotals: Array(10).fill(0),
        globalTotal: 0,
        maxCount: 0
      }
    }
    
    const { floor } = marketData
    const TOTAL_SUPPLY = 4200
    
    // Initialize matrices
    const matrix = Array(10).fill(null).map(() => Array(8).fill(0))
    const cellIds = Array(10).fill(null).map(() => Array(8).fill(null).map(() => []))
    const cellStats = Array(10).fill(null).map(() => Array(8).fill(null).map(() => ({
      count: 0,
      minPrice: null,
      medianPrice: null,
      p90Price: null,
      totalXchListed: 0,
      prices: []
    })))
    const rowTotals = Array(10).fill(0)
    
    // Iterate through all listed NFTs
    for (const [nftId, data] of Object.entries(offersIndex.listings_by_id || {})) {
      const listing = data.best_listing
      if (!listing || !listing.price_xch) continue
      
      const priceXch = listing.price_xch
      
      // Get rank (fallback to 9999 if missing)
      const rank = rankById.get(nftId) ?? 9999
      
      // Calculate rarity bucket (0-9, where 0 is rarest)
      const percentile = (rank / TOTAL_SUPPLY) * 100
      const bucket = Math.min(9, Math.floor(percentile / 10))
      
      // Calculate price value based on scale
      let priceValue = null
      if (marketScale === 'floor') {
        if (floor && floor > 0) {
          priceValue = priceXch / floor
        } else {
          // If floor is missing or 0, skip this item when using floor scale
          continue
        }
      } else if (marketScale === 'xch') {
        priceValue = priceXch
      } else {
        continue // Unknown scale
      }
      
      // Find column index from price bins
      let colIndex = -1
      for (let i = 0; i < priceBins.length; i++) {
        const bin = priceBins[i]
        if (bin.hi === null) {
          if (priceValue >= bin.lo) {
            colIndex = i
            break
          }
        } else {
          if (priceValue >= bin.lo && priceValue < bin.hi) {
            colIndex = i
            break
          }
        }
      }
      
      if (colIndex === -1) continue // Price doesn't fit in any bin
      
      // Update matrix
      matrix[bucket][colIndex]++
      cellIds[bucket][colIndex].push(nftId)
      cellStats[bucket][colIndex].prices.push(priceXch)
      rowTotals[bucket]++
    }
    
    // Sort cellIds arrays numerically
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 8; col++) {
        cellIds[row][col].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        
        // Compute per-cell stats
        const stats = cellStats[row][col]
        const prices = stats.prices
        if (prices.length > 0) {
          const sortedPrices = [...prices].sort((a, b) => a - b)
          stats.count = prices.length
          stats.minPrice = sortedPrices[0]
          stats.totalXchListed = prices.reduce((sum, p) => sum + p, 0)
          
          if (sortedPrices.length > 0) {
            stats.medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)]
            const p90Index = Math.floor(sortedPrices.length * 0.9)
            stats.p90Price = sortedPrices[Math.min(p90Index, sortedPrices.length - 1)]
          }
        }
      }
    }
    
    const globalTotal = rowTotals.reduce((sum, val) => sum + val, 0)
    const maxCount = Math.max(...matrix.flat())
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[Global Market Map] Heatmap computed:', {
        globalTotal,
        maxCount,
        matrixSummary: matrix.map(row => row.reduce((a, b) => a + b, 0))
      })
    }
    
    return {
      matrix,
      cellIds,
      cellStats,
      rowTotals,
      globalTotal,
      maxCount
    }
  }, [offersIndex, marketData, rankById, marketScale, priceBins])
  
  // Keyboard navigation for heatmap (must be after heatmapMatrix definition)
  useEffect(() => {
    if (marketChartType !== 'heat' || !selectedCell || !heatmapMatrix) return
    
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      let newRow = selectedCell.row
      let newCol = selectedCell.col
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          newRow = Math.max(0, selectedCell.row - 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          newRow = Math.min(9, selectedCell.row + 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          newCol = Math.max(0, selectedCell.col - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          newCol = Math.min(7, selectedCell.col + 1)
          break
        case 'Enter':
          e.preventDefault()
          // Cell is already selected, could open details here
          break
        case 'Escape':
          e.preventDefault()
          setSelectedCell(null)
          return
        default:
          return
      }
      
      if (newRow !== selectedCell.row || newCol !== selectedCell.col) {
        setSelectedCell({
          row: newRow,
          col: newCol,
          ids: heatmapMatrix.cellIds[newRow]?.[newCol] || []
        })
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [marketChartType, selectedCell, heatmapMatrix])
  
  // Compute bins for histogram - use same bins as heatmap
  const marketBins = useMemo(() => {
    const hasListings = offersIndex?.listings_by_id && Object.keys(offersIndex.listings_by_id).length > 0
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[Global Market Map] Histogram computation check:', {
        hasMarketData: !!marketData,
        hasOffersIndex: !!offersIndex,
        hasListings,
        listingsCount: hasListings ? Object.keys(offersIndex.listings_by_id).length : 0,
        marketScale,
        hasFloor: !!marketData?.floor
      })
    }
    
    // Allow rendering even without listings - show empty histogram
    if (!marketData || !offersIndex) {
      if (import.meta.env.DEV) {
        console.log('[Global Market Map] Histogram: Returning empty array (missing data)')
      }
      return []
    }
    
    const { floor } = marketData
    
    // Use the same priceBins as the heatmap
    const bins = priceBins.map(bin => {
      // Count listings that fall into this bin
      const listings = Object.values(offersIndex.listings_by_id || {})
      let count = 0
      
      for (const data of listings) {
        const listing = data.best_listing
        if (!listing || !listing.price_xch) continue
        
        let priceValue
        if (marketScale === 'floor') {
          if (floor && floor > 0) {
            priceValue = listing.price_xch / floor
          } else {
            // If floor is missing or 0, skip this item when using floor scale
            continue
          }
        } else if (marketScale === 'xch') {
          priceValue = listing.price_xch
        } else {
          continue // Unknown scale
        }
        
        // Check if price falls into this bin
        if (bin.hi === null) {
          // Last bin (open-ended)
          if (priceValue >= bin.lo) {
            count++
          }
        } else {
          // Regular bin
          if (priceValue >= bin.lo && priceValue < bin.hi) {
            count++
          }
        }
      }
      
      return {
        lo: bin.lo,
        hi: bin.hi,
        count,
        label: bin.label // Use the same label format as heatmap
      }
    })
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[Global Market Map] Histogram computed:', {
        totalBins: bins.length,
        totalCount: bins.reduce((sum, b) => sum + b.count, 0),
        binsWithData: bins.filter(b => b.count > 0).length
      })
    }
    
    return bins
  }, [marketData, marketScale, offersIndex, priceBins])
  
  const formatPriceXCH = (price) => {
    if (price < 0.01) return price.toFixed(4)
    return price.toFixed(2)
  }
  
  const formatPriceUSD = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }
  
  // Show loading overlay only if we have NO data at all (not if we're just refreshing)
  const showLoadingOverlay = (loadingOffers || loadingRankData) && !offersIndex
  
  if (showLoadingOverlay) {
    return (
      <div className="bp-loading" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="bp-loading-spinner"></div>
        <div className="bp-loading-text">
          {loadingOffers ? 'Loading market data...' : 'Loading rank data...'}
        </div>
      </div>
    )
  }
  
  // If no offersIndex, show error (but only if not loading)
  if (!offersIndex && !loadingOffers) {
    return (
      <div className="bp-no-results" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="bp-error-title">Market data not available</div>
        <div className="bp-error-message" style={{ marginTop: '12px' }}>
          The offers index file may not be generated yet. Run: <code>npm run build:mintgarden-offers</code>
        </div>
      </div>
    )
  }
  
  // Always render if we have offersIndex, even if marketData is empty/null
  // This allows the UI to show "no listings" state instead of blocking
  
  return (
    <div 
      className="bp-global-market-map"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <fieldset 
        className="bp-market-controls"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <legend>Global Market Statistics</legend>
        
        {/* Scale Toggle */}
        <div className="bp-market-toggle-group">
          <label>Scale:</label>
          <div className="bp-radio-group">
            <label>
              <input
                type="radio"
                name="global-market-scale"
                value="floor"
                checked={marketScale === 'floor'}
                onChange={(e) => setMarketScale(e.target.value)}
              />
              Floor Multiple
            </label>
            <label>
              <input
                type="radio"
                name="global-market-scale"
                value="xch"
                checked={marketScale === 'xch'}
                onChange={(e) => setMarketScale(e.target.value)}
              />
              XCH
            </label>
          </div>
        </div>
        
        {/* Chart Type Tabs */}
        <div className="bp-market-chart-tabs">
          <button
            className={`bp-market-chart-tab ${marketChartType === 'heat' ? 'active' : ''}`}
            onClick={() => setMarketChartType('heat')}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            Heatmap
          </button>
          <button
            className={`bp-market-chart-tab ${marketChartType === 'hist' ? 'active' : ''}`}
            onClick={() => setMarketChartType('hist')}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            Histogram
          </button>
        </div>
        
        {/* Summary Stats and CTA Buttons */}
        <div className="bp-market-summary-row" style={{ marginBottom: '12px' }}>
          {/* Market Summary - Left Side */}
          <div className="bp-ask-wall-summary">
            <fieldset>
              <legend>Market Summary</legend>
              <div className="bp-summary-stats">
                <div className="bp-summary-stat">
                  <span className="bp-summary-label">Listed:</span>
                  <span className="bp-summary-value">{marketData?.listedCount || 0}</span>
                </div>
                {marketData?.floor && (
                  <>
                    <div className="bp-summary-stat">
                      <span className="bp-summary-label">Floor:</span>
                      <span className="bp-summary-value">{formatPriceXCH(marketData.floor)} XCH</span>
                    </div>
                    {marketData?.marketStats?.median_xch && (
                      <div className="bp-summary-stat">
                        <span className="bp-summary-label">Median:</span>
                        <span className="bp-summary-value">{formatPriceXCH(marketData.marketStats.median_xch)} XCH</span>
                      </div>
                    )}
                    {marketData?.marketStats?.p90_xch && (
                      <div className="bp-summary-stat">
                        <span className="bp-summary-label">P90:</span>
                        <span className="bp-summary-value">{formatPriceXCH(marketData.marketStats.p90_xch)} XCH</span>
                      </div>
                    )}
                  </>
                )}
                <div className="bp-summary-stat">
                  <span className="bp-summary-label">Updated:</span>
                  <span className="bp-summary-value" style={{ fontSize: '10px' }}>
                    {new Date(offersIndex.generated_at || Date.now()).toLocaleString()}
                  </span>
                </div>
              </div>
            </fieldset>
          </div>
          
        </div>
        
        {/* Mode Status Line */}
        {marketChartType === 'heat' && (
          <div className="bp-heatmap-mode-line">
            <span>Tip: click a cell to open the family list.</span>
            {heatmapMode !== 'none' && (
              <span style={{ marginLeft: '12px' }}>
                Mode: {
                  heatmapMode === 'sleepy' ? 'Sleepy Deals' :
                  heatmapMode === 'delusion' ? 'Delusion Zones' :
                  heatmapMode === 'nearFloor' ? 'Near Floor' :
                  heatmapMode === 'rareReasonable' ? 'Rare & Reasonable' :
                  heatmapMode === 'whale' ? 'Whale Territory' : 'None'
                }
              </span>
            )}
          </div>
        )}
        
        {/* Normalization Toggle (only for heatmap) */}
        {marketChartType === 'heat' && (
          <div className="bp-market-toggle-group" style={{ marginBottom: '12px' }}>
            <label>Normalization:</label>
            <div className="bp-radio-group">
              <label>
                <input
                  type="radio"
                  name="heatmap-normalization"
                  value="count"
                  checked={normalization === 'count'}
                  onChange={(e) => setNormalization(e.target.value)}
                />
                Count
              </label>
              <label>
                <input
                  type="radio"
                  name="heatmap-normalization"
                  value="rowPercent"
                  checked={normalization === 'rowPercent'}
                  onChange={(e) => setNormalization(e.target.value)}
                />
                Row%
              </label>
              <label>
                <input
                  type="radio"
                  name="heatmap-normalization"
                  value="globalPercent"
                  checked={normalization === 'globalPercent'}
                  onChange={(e) => setNormalization(e.target.value)}
                />
                Global%
              </label>
            </div>
          </div>
        )}
        
        {/* Legend (only for heatmap) */}
        {marketChartType === 'heat' && (
          <div className="bp-heatmap-legend">
            <fieldset>
              <legend>Legend</legend>
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                <div>Cell number = listings count</div>
                <div>Color = density (darker = more listings)</div>
                {marketData.floor && (
                  <>
                    <div>Floor: {formatPriceXCH(marketData.floor)} XCH</div>
                    {marketScale === 'floor' && <div>Floor multiple = price / floor</div>}
                  </>
                )}
                {/* Value Models Info */}
                {valueModel && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--win-border-dark, #808080)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Value Models:</div>
                    <div style={{ paddingLeft: '8px' }}>
                      <div>Market Ask: {valueModel.models?.ask?.baseline_log ? formatPriceXCH(Math.exp(valueModel.models.ask.baseline_log)) : '—'} XCH (n_listed: {valueModel.models?.ask?.global_stats?.n_listed || 0})</div>
                      <div>Market Clear: {valueModel.models?.clear?.baseline_log ? formatPriceXCH(Math.exp(valueModel.models.clear.baseline_log)) : '—'} XCH (n_sales: {valueModel.models?.clear?.global_stats?.n_sales || 0})</div>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--win-text-dim, #808080)' }}>
                  Updated: {new Date(offersIndex.generated_at || Date.now()).toLocaleString()}
                </div>
              </div>
            </fieldset>
          </div>
        )}
        
        {/* Chart */}
        <div 
          className="bp-market-chart-container"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Show message if no data available */}
          {marketChartType === 'heat' && (!heatmapMatrix.matrix || heatmapMatrix.maxCount === 0) && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {!offersIndex || !offersIndex.listings_by_id || Object.keys(offersIndex.listings_by_id || {}).length === 0 ? (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No listing data available</div>
                  <div style={{ fontSize: '12px' }}>Waiting for market data to load...</div>
                </div>
              ) : !marketData || !marketData.floor ? (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No floor price available</div>
                  <div style={{ fontSize: '12px' }}>Cannot compute heatmap without floor price. Try switching to XCH scale.</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No data points to display</div>
                  <div style={{ fontSize: '12px' }}>Listings found but none match the current scale/filters.</div>
                </div>
              )}
            </div>
          )}
          {marketChartType === 'heat' && heatmapMatrix.matrix && heatmapMatrix.maxCount > 0 && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Bp2DHeatmap
                matrix={heatmapMatrix.matrix}
                cellIds={heatmapMatrix.cellIds}
                cellStats={heatmapMatrix.cellStats}
                rowTotals={heatmapMatrix.rowTotals}
                globalTotal={heatmapMatrix.globalTotal}
                priceBins={priceBins}
                rarityLabels={rarityLabels}
                maxCount={heatmapMatrix.maxCount}
                selectedCell={selectedCell}
                pinnedCell={pinnedCell}
                hoveredCell={hoveredCell}
                normalization={normalization}
                onCellClick={(row, col) => {
                  if (row === null || col === null) {
                    setSelectedCell(null)
                  } else {
                    setSelectedCell({ row, col, ids: heatmapMatrix.cellIds[row][col] || [] })
                  }
                }}
                onCellHover={(row, col, event, info) => {
                  if (row === null || col === null) {
                    setHoveredCell(null)
                    setMarketTooltip(null)
                  } else {
                    setHoveredCell({ row, col })
                    if (event && info) {
                      setMarketTooltip({
                        x: event.clientX,
                        y: event.clientY,
                        text: `Rarity: ${info.rarity}, Price: ${info.price}, Listed: ${info.count} (${info.rowPercent}% of row, ${info.globalPercent}% of total)`
                      })
                    }
                  }
                }}
                onCellPin={(row, col) => {
                  if (pinnedCell && pinnedCell.row === row && pinnedCell.col === col) {
                    setPinnedCell(null)
                  } else {
                    setPinnedCell({ row, col })
                  }
                }}
                heatmapMode={heatmapMode}
                scale={marketScale}
                floor={marketData.floor}
                isMobile={isMobile}
                modeConstants={{
                  SLEEPY_MAX_MULT,
                  NEAR_FLOOR_MAX_MULT,
                  RARE_REASONABLE_MAX_MULT,
                  DELUSION_MIN_MULT,
                  WHALE_MIN_MULT,
                  RARE_TOP_PCT_SLEEPY,
                  RARE_TOP_PCT_REASONABLE,
                  COMMON_BOTTOM_PCT_DELUSION
                }}
                />
              </div>
              
              {/* Heatmap Mode Buttons Panel - Right Side */}
              {marketChartType === 'heat' && (
                <div className="bp-heatmap-models-panel" style={{ 
                  width: '280px', 
                  flexShrink: 0,
                  background: 'var(--win-surface, #c0c0c0)',
                  border: '2px inset var(--win-border-dark, #808080)',
                  padding: '8px'
                }}>
                  <fieldset>
                    <legend>Heatmap Modes</legend>
                    <div className="bp-heatmap-cta-buttons">
                      <button
                        className={`bp-heatmap-cta-btn ${heatmapMode === 'sleepy' ? 'active' : ''}`}
                        onClick={() => setHeatmapMode(heatmapMode === 'sleepy' ? 'none' : 'sleepy')}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Highlights rare ranks listed unusually low. Click a hot cell to open the family."
                      >
                        Find Sleepy Deals
                      </button>
                      <button
                        className={`bp-heatmap-cta-btn ${heatmapMode === 'delusion' ? 'active' : ''}`}
                        onClick={() => setHeatmapMode(heatmapMode === 'delusion' ? 'none' : 'delusion')}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Highlights common ranks listed way above typical. For laughs (or warnings)."
                      >
                        Spot Delusion Zones
                      </button>
                      <button
                        className={`bp-heatmap-cta-btn ${heatmapMode === 'nearFloor' ? 'active' : ''}`}
                        onClick={() => setHeatmapMode(heatmapMode === 'nearFloor' ? 'none' : 'nearFloor')}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Shows listings close to floor multiple (≈1.0–1.25×). Good hunting zone."
                      >
                        Snipe Near Floor
                      </button>
                      <button
                        className={`bp-heatmap-cta-btn ${heatmapMode === 'rareReasonable' ? 'active' : ''}`}
                        onClick={() => setHeatmapMode(heatmapMode === 'rareReasonable' ? 'none' : 'rareReasonable')}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Focus on top rarity tiers priced under a sane multiple. Value seekers."
                      >
                        Rare & Reasonable
                      </button>
                      <button
                        className={`bp-heatmap-cta-btn ${heatmapMode === 'whale' ? 'active' : ''}`}
                        onClick={() => setHeatmapMode(heatmapMode === 'whale' ? 'none' : 'whale')}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Focus on high price zones. See where the big asks live."
                      >
                        Whale Territory
                      </button>
                      {heatmapMode !== 'none' && (
                        <button
                          className="bp-heatmap-cta-btn"
                          onClick={() => setHeatmapMode('none')}
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>
          )}
          
          {/* Cell Details Strip with NFT Previews - Outside flex container */}
          {marketChartType === 'heat' && selectedCell && selectedCell.ids.length > 0 && (
            <div className="bp-cell-details-strip">
                  <fieldset>
                    <legend style={{ display: 'none' }}>Cell Details</legend>
                    <div className="bp-cell-details-header">
                      <span className="bp-cell-details-title">Cell Details</span>
                      <div className="bp-cell-details-info">
                        <span>Rarity: {rarityLabels[selectedCell.row]}</span>
                        <span>Price: {priceBins[selectedCell.col].label}</span>
                        <span>Listed: {heatmapMatrix.matrix[selectedCell.row][selectedCell.col]}</span>
                      </div>
                      <button
                        className="bp-button bp-cell-close-button"
                        onClick={() => {
                          setSelectedCell(null)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="Close"
                      >
                        Close
                      </button>
                    </div>
                    <div className="bp-cell-nft-preview-row">
                      {(() => {
                        // Sort NFTs by price (cheapest to most expensive)
                        const sortedIds = [...selectedCell.ids].sort((a, b) => {
                          const priceA = offersIndex?.listings_by_id?.[a]?.best_listing?.price_xch ?? Infinity
                          const priceB = offersIndex?.listings_by_id?.[b]?.best_listing?.price_xch ?? Infinity
                          return priceA - priceB
                        })
                        
                        return sortedIds.map((nftId) => {
                          const imageUrl = getNftImageUrl(nftId)
                          const launcher = DataCache.mintgardenLauncherMap?.[String(nftId)]
                          const listing = offersIndex?.listings_by_id?.[nftId]?.best_listing
                          const priceXch = listing?.price_xch
                          const xchUsdRate = xchUsdFallback // Use current price priority logic
                          const priceUsd = priceXch && xchUsdRate ? priceXch * xchUsdRate : null
                          const priceText = priceXch != null ? `${formatPriceXCH(priceXch)} XCH` : null
                          const priceTextUsd = priceUsd != null ? formatPriceUSD(priceUsd) : null
                        
                          const handleRarityExplorer = (e) => {
                            e.stopPropagation()
                            const rarityExplorer = getWindow('rarity-explorer')
                            if (rarityExplorer) {
                              if (isWindowMinimized('rarity-explorer')) {
                                restoreWindow('rarity-explorer')
                              }
                              bringToFront('rarity-explorer')
                              window.dispatchEvent(new CustomEvent('navigateToNft', {
                                detail: { nftId: String(nftId) }
                              }))
                            } else {
                              showToast('Please open Rarity Explorer first', 'warning')
                            }
                          }
                          
                          const handleMintGarden = async (e) => {
                            e.stopPropagation()
                            // Ensure MintGarden map is loaded
                            if (!DataCache.loaded.mintgardenLauncherMap && !DataCache.loadingPromises.mintgardenLauncherMap) {
                              try {
                                await loadMintGardenLauncherMap()
                              } catch (err) {
                                showToast('Failed to load MintGarden map', 'error', 3000)
                                return
                              }
                            }
                            
                            // Get launcher with fresh map data (in case it was just loaded)
                            const launcher = DataCache.mintgardenLauncherMap?.[String(nftId)]
                            
                            if (launcher) {
                              window.open(`https://mintgarden.io/nfts/${launcher}`, '_blank', 'noopener,noreferrer')
                            } else {
                              // Fallback: search by NFT name/token ID
                              const collectionId = DataCache.mintgardenLauncherMapMeta?.collectionId || 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'
                              const searchQuery = encodeURIComponent(`Wojak #${String(nftId).padStart(4, '0')}`)
                              window.open(`https://mintgarden.io/collections/${collectionId}?search=${searchQuery}`, '_blank', 'noopener,noreferrer')
                            }
                          }
                        
                        return (
                          <div
                            key={nftId}
                            className="bp-cell-nft-preview"
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={`NFT #${nftId}`}
                                className="bp-cell-nft-image"
                                loading="lazy"
                              />
                            ) : (
                              <div className="bp-cell-nft-placeholder">
                                #{nftId}
                              </div>
                            )}
                            <div className="bp-cell-nft-id-price">
                              <span className="bp-cell-nft-label">#{nftId}</span>
                              {priceText && (
                                <span className="bp-cell-nft-price">
                                  {priceText}
                                  {priceTextUsd && (
                                    <span className="bp-cell-nft-price-usd"> {priceTextUsd}</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="bp-cell-nft-buttons">
                              <button
                                className="bp-button bp-button-icon-square"
                                onClick={handleRarityExplorer}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                title="Open in Rarity Explorer"
                              >
                                <img src="/icon/icons1/orange-3d-icon.png" alt="Rarity Explorer" className="bp-button-icon" />
                              </button>
                              <button
                                className="bp-button bp-button-icon-square"
                                onClick={handleMintGarden}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                title="Open in MintGarden"
                              >
                                <img src="/icon/icons1/icon_MG.png" alt="MintGarden" className="bp-button-icon" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                      })()}
                    </div>
                  </fieldset>
                </div>
          )}
          {marketChartType === 'hist' && marketBins.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {!offersIndex || !offersIndex.listings_by_id || Object.keys(offersIndex.listings_by_id || {}).length === 0 ? (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No listing data available</div>
                  <div style={{ fontSize: '12px' }}>Waiting for market data to load...</div>
                </div>
              ) : !marketData || !marketData.floor ? (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No floor price available</div>
                  <div style={{ fontSize: '12px' }}>Cannot compute histogram without floor price. Try switching to XCH scale.</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No data points to display</div>
                  <div style={{ fontSize: '12px' }}>Listings found but none match the current scale/filters.</div>
                </div>
              )}
            </div>
          )}
          {marketChartType === 'hist' && marketBins.length > 0 && (
            <BpHistogram bins={marketBins} scale={marketScale} floor={marketData.floor} />
          )}
        </div>
        
        {/* Tooltip (desktop) */}
        {marketTooltip && !isMobile && (
          <div
            className="bp-market-tooltip"
            style={{
              position: 'fixed',
              left: `${marketTooltip.x + 10}px`,
              top: `${marketTooltip.y + 10}px`,
              zIndex: 10000
            }}
          >
            {marketTooltip.text}
          </div>
        )}
      </fieldset>
    </div>
  )
}

// ============================================
// COMBO EXPLORER VIEW
// ============================================
// Market Map Chart Components

// 2D Heatmap Component (Rarity × Price)
const Bp2DHeatmap = ({
  matrix,
  cellIds,
  cellStats,
  rowTotals,
  globalTotal,
  priceBins,
  rarityLabels,
  maxCount,
  selectedCell,
  pinnedCell,
  hoveredCell,
  normalization,
  onCellClick,
  onCellHover,
  onCellPin,
  heatmapMode,
  scale,
  floor,
  isMobile,
  modeConstants
}) => {
  if (!matrix || matrix.length === 0 || maxCount === 0) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>No data</div>
  }
  
  // Compute color intensity level (0-5) using log scaling
  const getIntensityLevel = (count) => {
    if (count === 0) return 0
    if (maxCount === 0) return 0
    // Log scaling: level = floor((log1p(count) / log1p(maxCount)) * 5)
    const level = Math.floor((Math.log1p(count) / Math.log1p(maxCount)) * 5)
    return Math.min(5, Math.max(0, level))
  }
  
  // Check if cell matches current mode
  const cellMatchesMode = (row, col) => {
    if (heatmapMode === 'none') return true
    
    const bin = priceBins[col]
    if (!bin) return false
    
    // Convert to floor multiple if needed
    let priceMult = null
    if (scale === 'floor') {
      priceMult = bin.hi === null ? bin.lo : (bin.lo + (bin.hi || bin.lo)) / 2
    } else if (scale === 'xch' && floor) {
      const binCenter = bin.hi === null ? bin.lo : (bin.lo + bin.hi) / 2
      priceMult = binCenter / floor
    } else {
      // Can't compute floor multiple without floor
      return heatmapMode === 'nearFloor' || heatmapMode === 'whale' // These work with XCH too
    }
    
    // Rarity bucket: row 0 = top 0-10% (rarest), row 9 = bottom 90-100% (common)
    const rarityTopPct = (9 - row) / 10 // Invert: row 0 = 90-100% top (rarest), row 9 = 0-10% top (common)
    const rarityBottomPct = row / 10 // row 0 = 0-10% bottom, row 9 = 90-100% bottom
    
    switch (heatmapMode) {
      case 'sleepy':
        return rarityTopPct <= modeConstants.RARE_TOP_PCT_SLEEPY && priceMult <= modeConstants.SLEEPY_MAX_MULT
      case 'delusion':
        return rarityBottomPct >= modeConstants.COMMON_BOTTOM_PCT_DELUSION && priceMult >= modeConstants.DELUSION_MIN_MULT
      case 'nearFloor':
        if (scale === 'floor') {
          return bin.lo >= 1.0 && (bin.hi === null || bin.hi <= modeConstants.NEAR_FLOOR_MAX_MULT)
        } else {
          // For XCH scale, check if price is near floor
          return priceMult && priceMult >= 1.0 && priceMult <= modeConstants.NEAR_FLOOR_MAX_MULT
        }
      case 'rareReasonable':
        return rarityTopPct <= modeConstants.RARE_TOP_PCT_REASONABLE && priceMult <= modeConstants.RARE_REASONABLE_MAX_MULT
      case 'whale':
        if (scale === 'floor') {
          return bin.lo >= modeConstants.WHALE_MIN_MULT
        } else {
          return priceMult && priceMult >= modeConstants.WHALE_MIN_MULT
        }
      default:
        return true
    }
  }
  
  // Get display value based on normalization
  const getDisplayValue = (row, col) => {
    const count = matrix[row][col]
    if (normalization === 'count') {
      return String(count)
    } else if (normalization === 'rowPercent') {
      const rowTotal = rowTotals[row]
      if (rowTotal === 0) return '0%'
      return `${((count / rowTotal) * 100).toFixed(1)}%`
    } else if (normalization === 'globalPercent') {
      if (globalTotal === 0) return '0%'
      return `${((count / globalTotal) * 100).toFixed(1)}%`
    }
    return String(count)
  }
  
  const handleCellClick = (row, col, event) => {
    if (event) {
      event.stopPropagation()
      // Don't preventDefault - we want the click to work normally, just stop bubbling
    }
    if (onCellClick) {
      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        // Deselect if clicking same cell
        onCellClick(null, null)
      } else {
        // Select new cell
        onCellClick(row, col)
      }
    }
  }
  
  const handleCellHover = (row, col, event) => {
    if (onCellHover) {
      const bin = priceBins[col]
      const rarityLabel = rarityLabels[row]
      const count = matrix[row][col]
      const rowTotal = rowTotals[row]
      const rowPercent = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(1) : '0.0'
      const globalPercent = globalTotal > 0 ? ((count / globalTotal) * 100).toFixed(1) : '0.0'
      
      const priceLabel = scale === 'floor'
        ? `${bin.lo}–${bin.hi === null ? '∞' : bin.hi}× floor`
        : `${bin.lo.toFixed(2)}–${bin.hi === null ? '∞' : bin.hi.toFixed(2)} XCH`
      
      onCellHover(row, col, event, {
        rarity: rarityLabel,
        price: priceLabel,
        count,
        rowPercent,
        globalPercent
      })
    }
  }
  
  return (
    <div 
      className="bp-2d-heatmap-container"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bp-2d-heatmap-scroll"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="bp-2d-heatmap-grid"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row: price bin labels */}
          <div className="bp-heatmap-header-cell"></div>
          {priceBins.map((bin, col) => (
            <div key={col} className="bp-heatmap-header-cell">
              {bin.label}
            </div>
          ))}
          
          {/* Data rows: rarity label + cells */}
          {matrix.map((row, rowIdx) => (
            <React.Fragment key={rowIdx}>
              {/* Rarity label */}
              <div className="bp-heatmap-row-label">
                {rarityLabels[rowIdx]}
              </div>
              
              {/* Cells */}
              {row.map((count, colIdx) => {
                const intensity = getIntensityLevel(count)
                const matches = cellMatchesMode(rowIdx, colIdx)
                const isSelected = selectedCell && selectedCell.row === rowIdx && selectedCell.col === colIdx
                const isPinned = pinnedCell && pinnedCell.row === rowIdx && pinnedCell.col === colIdx
                const isHovered = hoveredCell && hoveredCell.row === rowIdx && hoveredCell.col === colIdx
                
                return (
                  <div
                    key={colIdx}
                    className={`bp-heatmap-cell bp-heat-${intensity} ${
                      isSelected ? 'selected' : ''
                    } ${
                      isPinned ? 'pinned' : ''
                    } ${
                      isHovered ? 'hovered' : ''
                    } ${
                      heatmapMode !== 'none' && !matches ? 'mode-dimmed' : ''
                    } ${
                      heatmapMode !== 'none' && matches ? 'mode-highlighted' : ''
                    }`}
                    onClick={(e) => {
                      handleCellClick(rowIdx, colIdx, e)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                    }}
                    onMouseEnter={(e) => !isMobile && handleCellHover(rowIdx, colIdx, e)}
                    onMouseLeave={() => !isMobile && onCellHover && onCellHover(null, null, null, null)}
                    onTouchStart={(e) => {
                      if (isMobile) {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCellClick(rowIdx, colIdx, e)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {count > 0 ? getDisplayValue(rowIdx, colIdx) : ''}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

const BpHeatmapBands = ({ bins, scale, floor, pinnedBand, onBandClick, onBandHover }) => {
  if (!bins || bins.length === 0) return <div style={{ padding: '20px', textAlign: 'center' }}>No data</div>
  
  const maxCount = Math.max(...bins.map(b => b.count))
  
  return (
    <div className="bp-heatmap-bands">
      {bins.map((bin, idx) => {
        const isPinned = pinnedBand && pinnedBand.lo === bin.lo && pinnedBand.hi === bin.hi
        const intensity = maxCount > 0 ? bin.count / maxCount : 0
        const label = scale === 'floor' 
          ? `${bin.lo}–${bin.hi === null ? '∞' : bin.hi}×`
          : `${bin.lo.toFixed(2)}–${bin.hi === null ? '∞' : bin.hi.toFixed(2)} XCH`
        
        return (
          <div
            key={idx}
            className={`bp-band-row ${isPinned ? 'pinned' : ''}`}
            onClick={() => onBandClick(bin)}
            onMouseEnter={(e) => onBandHover(bin, e)}
            onMouseLeave={() => onBandHover(null, null)}
            style={{ cursor: 'pointer' }}
          >
            <span className="bp-band-label">{label}</span>
            <div className="bp-band-bar-container">
              <div
                className="bp-band-bar"
                style={{
                  width: `${intensity * 100}%`,
                  backgroundColor: `rgba(0, 0, 128, ${0.3 + intensity * 0.7})` // var(--win-highlight) with opacity
                }}
              />
              <span className="bp-band-count">{bin.count}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const BpDepthChart = ({ points }) => {
  if (!points || points.length === 0) return <div style={{ padding: '20px', textAlign: 'center' }}>No data</div>
  
  const maxPrice = Math.max(...points.map(p => p.price_xch))
  const maxCount = Math.max(...points.map(p => p.cum_count))
  const width = 600
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  
  // Build path
  let pathData = `M ${padding.left} ${height - padding.bottom}`
  for (const point of points) {
    const x = padding.left + (point.price_xch / maxPrice) * chartWidth
    const y = height - padding.bottom - (point.cum_count / maxCount) * chartHeight
    pathData += ` L ${x} ${y}`
  }
  
  // Generate ticks
  const priceTicks = []
  const countTicks = []
  for (let i = 0; i <= 4; i++) {
    const price = (maxPrice / 4) * i
    priceTicks.push({ value: price, x: padding.left + (price / maxPrice) * chartWidth })
    const count = (maxCount / 4) * i
    countTicks.push({ value: count, y: height - padding.bottom - (count / maxCount) * chartHeight })
  }
  
  return (
    <div className="bp-depth-chart">
      <svg width={width} height={height} style={{ background: 'var(--win-surface, #c0c0c0)' }}>
        {/* Grid lines */}
        {priceTicks.map((tick, i) => (
          <line
            key={`price-grid-${i}`}
            x1={tick.x}
            y1={padding.top}
            x2={tick.x}
            y2={height - padding.bottom}
            stroke="var(--win-border-dark, #808080)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        {countTicks.map((tick, i) => (
          <line
            key={`count-grid-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="var(--win-border-dark, #808080)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        
        {/* Path */}
        <path
          d={pathData}
          fill="none"
          stroke="var(--win-highlight, #000080)"
          strokeWidth="2"
        />
        
        {/* Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="var(--win-text, #000000)"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="var(--win-text, #000000)"
          strokeWidth="2"
        />
        
        {/* Labels */}
        {priceTicks.map((tick, i) => (
          <text
            key={`price-label-${i}`}
            x={tick.x}
            y={height - padding.bottom + 15}
            textAnchor="middle"
            fontSize="10"
            fill="var(--win-text, #000000)"
          >
            {tick.value.toFixed(2)}
          </text>
        ))}
        {countTicks.map((tick, i) => (
          <text
            key={`count-label-${i}`}
            x={padding.left - 5}
            y={tick.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--win-text, #000000)"
          >
            {Math.round(tick.value)}
          </text>
        ))}
      </svg>
    </div>
  )
}

const BpHistogram = ({ bins, scale, floor }) => {
  if (!bins || bins.length === 0) return <div style={{ padding: '20px', textAlign: 'center' }}>No data</div>
  
  const maxCount = Math.max(...bins.map(b => b.count))
  const width = 600
  const height = 300
  const padding = { top: 20, right: 20, bottom: 70, left: 60 } // Increased bottom padding for labels
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const barWidth = chartWidth / bins.length
  
  return (
    <div className="bp-histogram">
      <svg width={width} height={height} style={{ background: 'var(--win-surface, #c0c0c0)' }}>
        {bins.map((bin, idx) => {
          const barHeight = maxCount > 0 ? (bin.count / maxCount) * chartHeight : 0
          const x = padding.left + (idx * barWidth)
          const y = height - padding.bottom - barHeight
          // Use the exact same label format as heatmap
          const label = bin.label || (scale === 'floor'
            ? `${bin.lo}–${bin.hi === null ? '∞' : bin.hi}×`
            : `${bin.lo.toFixed(2)}–${bin.hi === null ? '∞' : bin.hi.toFixed(2)}`)
          
          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth - 2}
                height={barHeight}
                fill="var(--win-highlight, #000080)"
                opacity="0.7"
              />
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 35}
                textAnchor="middle"
                fontSize="12"
                fill="var(--win-text, #000000)"
                transform={`rotate(-45 ${x + barWidth / 2} ${height - padding.bottom + 35})`}
              >
                {label}
              </text>
              {barHeight > 20 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--win-text, #000000)"
                >
                  {bin.count}
                </text>
              )}
            </g>
          )
        })}
        
        {/* Axes */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="var(--win-text, #000000)"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="var(--win-text, #000000)"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

// Trait Values View Component
// Note: This is a large component. For maintainability, consider extracting to separate file if it grows too large.
// Category normalization map (same as build script)
const CATEGORY_MAP = {
  'Base': 'base',
  'Clothes': 'clothes',
  'Head': 'head',
  'Face': 'face',
  'Mouth': 'mouth',
  'Face Wear': 'facewear',
  'Background': 'background'
}

// Deals Scanner View Component (v2: default first tab)
const DealsScannerView = ({
  valueModel,
  offersIndex,
  onNftClick,
  dealsMinConfidence,
  setDealsMinConfidence,
  dealsMaxPrice,
  setDealsMaxPrice,
  dealsMinDealScore,
  setDealsMinDealScore
}) => {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('dealScore') // 'dealScore' | 'discount' | 'price'
  
  // Load metadata for trait lookup
  const [metadata, setMetadata] = useState(null)
  
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/Wojak_Farmers_Plot_metadata_FIXED DRAC.json')
        if (response.ok) {
          const data = await response.json()
          setMetadata(data)
        }
      } catch (err) {
        console.error('Failed to load metadata:', err)
      }
    }
    loadMetadata()
  }, [])
  
  // Compute deals with cache
  useEffect(() => {
    if (!valueModel || !offersIndex || !metadata) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    
    // Get all listings
    const listings = []
    for (const [id, data] of Object.entries(offersIndex.listings_by_id || {})) {
      const listing = data.best_listing
      if (!listing || !listing.price_xch) continue
      listings.push({ id, listing })
    }
    
    // Compute fair value for each listing (with cache)
    const computedDeals = []
    const modelGeneratedAt = valueModel.generated_at || ''
    const offersGeneratedAt = offersIndex.generated_at || ''
    
    for (const { id, listing } of listings) {
      // Get traits for this NFT
      const nftData = metadata.find(item => {
        const match = item.name?.match(/#(\d+)$/)
        return match && match[1] === id
      })
      
      if (!nftData || !nftData.attributes) continue
      
      const traits = {}
      for (const attr of nftData.attributes) {
        const category = CATEGORY_MAP[attr.trait_type] || attr.trait_type?.toLowerCase()
        if (category && attr.value) {
          traits[category] = attr.value
        }
      }
      
      // Check compute cache
      const cacheKey = `${modelGeneratedAt}|${offersGeneratedAt}|${id}|${listing.price_xch}`
      let fairValue = DataCache.dealsComputedCache.get(cacheKey)
      
      if (!fairValue || !fairValue.computedAt) {
        // Compute fair value
        const isV2 = valueModel.schema_version?.startsWith('2.')
        fairValue = isV2
          ? computeFairValueV2(id, valueModel, traits, offersIndex)
          : computeFairValue(id, valueModel, traits, offersIndex)
        
        if (fairValue) {
          DataCache.dealsComputedCache.set(cacheKey, { fairValue, computedAt: Date.now() })
        }
      } else {
        fairValue = fairValue.fairValue
      }
      
      if (!fairValue || !fairValue.suggestedXch) continue
      
      // Calculate metrics
      const priceXch = listing.price_xch
      const discountPercent = (1 - priceXch / fairValue.suggestedXch) * 100
      const dealScore = discountPercent * fairValue.confidence
      
      // Calculate percentiles (need all listing prices and suggested prices)
      // For now, we'll compute these after we have all deals
      
      computedDeals.push({
        id,
        priceXch,
        suggestedXch: fairValue.suggestedXch,
        discountPercent,
        dealScore,
        confidence: fairValue.confidence,
        confidenceLevel: fairValue.confidenceLevel,
        topContributors: fairValue.topContributors,
        listing
      })
    }
    
    // Calculate percentiles
    const allPrices = computedDeals.map(d => d.priceXch).sort((a, b) => a - b)
    const allSuggested = computedDeals.map(d => d.suggestedXch).sort((a, b) => a - b)
    
    computedDeals.forEach(deal => {
      const priceIdx = allPrices.findIndex(p => p >= deal.priceXch)
      const suggestedIdx = allSuggested.findIndex(s => s >= deal.suggestedXch)
      deal.pricePercentile = allPrices.length > 0 ? Math.round((priceIdx / allPrices.length) * 100) : 50
      deal.suggestedPercentile = allSuggested.length > 0 ? Math.round((suggestedIdx / allSuggested.length) * 100) : 50
    })
    
    // Apply filters
    let filtered = computedDeals.filter(deal => {
      if (deal.confidence < dealsMinConfidence) return false
      if (dealsMaxPrice && deal.priceXch > dealsMaxPrice) return false
      if (deal.dealScore < dealsMinDealScore) return false
      return true
    })
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'dealScore') {
        return b.dealScore - a.dealScore
      } else if (sortBy === 'discount') {
        return b.discountPercent - a.discountPercent
      } else { // price
        return a.priceXch - b.priceXch
      }
    })
    
    setDeals(filtered)
    setLoading(false)
  }, [valueModel, offersIndex, metadata, dealsMinConfidence, dealsMaxPrice, dealsMinDealScore, sortBy])
  
  const formatPriceXCH = (price) => {
    if (price < 0.01) return price.toFixed(4)
    return price.toFixed(2)
  }
  
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading deals...</div>
      </div>
    )
  }
  
  if (!valueModel || !offersIndex) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Value model or offers not available</div>
      </div>
    )
  }
  
  return (
    <div className="bp-deals-scanner">
      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Min Confidence:
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={dealsMinConfidence}
            onChange={(e) => setDealsMinConfidence(parseFloat(e.target.value) || 0)}
            style={{ width: '60px' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Max Price (XCH):
          <input
            type="number"
            min="0"
            step="0.1"
            value={dealsMaxPrice || ''}
            onChange={(e) => setDealsMaxPrice(e.target.value ? parseFloat(e.target.value) : null)}
            style={{ width: '80px' }}
            placeholder="No limit"
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Min Deal Score:
          <input
            type="number"
            min="0"
            step="1"
            value={dealsMinDealScore}
            onChange={(e) => setDealsMinDealScore(parseFloat(e.target.value) || 0)}
            style={{ width: '60px' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Sort by:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="dealScore">Deal Score</option>
            <option value="discount">Discount %</option>
            <option value="price">Price</option>
          </select>
        </label>
      </div>
      
      {/* Deals List */}
      <div style={{ border: '2px inset var(--win-border-dark, #808080)', background: 'var(--win-surface, #c0c0c0)', maxHeight: '500px', overflowY: 'auto' }}>
        {deals.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>No deals found matching filters</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: 'var(--win-highlight, #000080)', color: '#fff', position: 'sticky', top: 0 }}>
                <th style={{ padding: '6px', textAlign: 'left' }}>NFT</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Suggested</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Discount</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Deal Score</th>
                <th style={{ padding: '6px', textAlign: 'center' }}>Confidence</th>
                <th style={{ padding: '6px', textAlign: 'left' }}>Top Drivers</th>
              </tr>
            </thead>
            <tbody>
              {deals.map(deal => (
                <tr
                  key={deal.id}
                  onClick={() => onNftClick && onNftClick(deal.id)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--win-border-light, #e0e0e0)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--win-highlight, #000080)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '6px' }}>#{deal.id}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {formatPriceXCH(deal.priceXch)} XCH
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '4px' }}>p{deal.pricePercentile}</span>
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {formatPriceXCH(deal.suggestedXch)} XCH
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '4px' }}>p{deal.suggestedPercentile}</span>
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', color: deal.discountPercent > 0 ? '#0a0' : '#a00' }}>
                    {deal.discountPercent > 0 ? '+' : ''}{deal.discountPercent.toFixed(1)}%
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                    {deal.dealScore.toFixed(1)}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <span className={`bp-confidence-pill ${deal.confidenceLevel.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
                      {deal.confidenceLevel}
                    </span>
                  </td>
                  <td style={{ padding: '6px', fontSize: '10px', color: '#666' }}>
                    {deal.topContributors?.positive?.slice(0, 2).map(c => c.trait.split('::')[1]).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
        Showing {deals.length} deal{deals.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

const TraitValuesView = ({
  selectedTraitKey,
  setSelectedTraitKey,
  selectedTraitCategory,
  setSelectedTraitCategory,
  traitSortBy,
  setTraitSortBy,
  hoveredTraitKey,
  setHoveredTraitKey,
  pinnedInspector,
  setPinnedInspector,
  activeCTAMode,
  setActiveCTAMode,
  traitDetailTab,
  setTraitDetailTab,
  onBack,
  onNftClick
}) => {
  const { bringToFront, restoreWindow, isWindowMinimized, getWindow } = useWindow()
  const { showToast } = useToast()
  const [valueModel, setValueModel] = useState(null)
  const [offersIndex, setOffersIndex] = useState(DataCache.mintgardenOffersIndex)
  const [salesIndex, setSalesIndex] = useState(DataCache.salesIndexV1)
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTrait, setSelectedTrait] = useState('') // Selected trait name (not key)
  const [selectedTraitDetail, setSelectedTraitDetail] = useState(null) // Selected trait detail for TraitValueDetailView
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
  
  // Trait values computed from sales
  const [traitValuesFromSales, setTraitValuesFromSales] = useState(new Map())
  
  // Per-trait sales stats (salesCount, lastSaleAtMs) for sorting
  const [traitSalesStatsByKey, setTraitSalesStatsByKey] = useState(new Map())

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleChange = (e) => setIsMobile(e.matches)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  // Load data
  useEffect(() => {
    let isMounted = true
    
    // Helper to add timeout to promises
    const withTimeout = (promise, timeoutMs, name) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ])
    }
    
    const load = async () => {
      if (import.meta.env.DEV) {
        console.log('[Value Engine] Starting data load...')
      }
      
      setLoading(true)
      
      // First, try to use cached data immediately if available
      const cachedValueModel = DataCache.valueModelV2 || DataCache.valueModelV1
      const cachedOffersIndex = DataCache.mintgardenOffersIndex
      const cachedSalesIndex = DataCache.salesIndexV1
      
      if (cachedValueModel || cachedOffersIndex || cachedSalesIndex) {
        if (import.meta.env.DEV) {
          console.log('[Value Engine] Using cached data immediately:', {
            valueModel: !!cachedValueModel,
            offersIndex: !!cachedOffersIndex,
            salesIndex: !!cachedSalesIndex
          })
        }
        
        if (isMounted) {
          setValueModel(cachedValueModel || null)
          setOffersIndex(cachedOffersIndex || null)
          setSalesIndex(cachedSalesIndex || null)
          setMetadata(null)
          setLoading(false)
        }
      }
      
      try {
        // Load all data with individual error handling and timeouts
        const TIMEOUT_MS = 10000 // 10 second timeout per operation
        
        const results = await Promise.allSettled([
          withTimeout(
            loadValueModelV2().catch(err => {
              console.error('[Value Engine] Failed to load value model:', err)
              return null
            }),
            TIMEOUT_MS,
            'loadValueModelV2'
          ),
          withTimeout(
            loadLiveOffersIndex(false).catch(err => {
              console.error('[Value Engine] Failed to load offers index:', err)
              // Return cached data if available
              return DataCache.mintgardenOffersIndex ? { data: DataCache.mintgardenOffersIndex } : null
            }),
            TIMEOUT_MS,
            'loadLiveOffersIndex'
          ),
          withTimeout(
            loadSalesIndexV1().catch(err => {
              console.error('[Value Engine] Failed to load sales index:', err)
              return null
            }),
            TIMEOUT_MS,
            'loadSalesIndexV1'
          ),
          withTimeout(
            loadComboExplorerCore().catch(err => {
              console.error('[Value Engine] Failed to load combo data:', err)
              return null
            }),
            TIMEOUT_MS,
            'loadComboExplorerCore'
          ),
          withTimeout(
            fetch('/Wojak_Farmers_Plot_metadata_FIXED DRAC.json')
              .then(r => r.ok ? r.json() : null)
              .catch(err => {
                console.error('[Value Engine] Failed to load metadata:', err)
                return null
              }),
            TIMEOUT_MS,
            'metadata fetch'
          )
        ])
        
        const [vm, oiResult, si, comboData, meta] = results.map(r => {
          if (r.status === 'fulfilled') return r.value
          console.error('[Value Engine] Promise rejected:', r.reason)
          return null
        })
        
        if (import.meta.env.DEV) {
          console.log('[Value Engine] Data load results:', {
            valueModel: !!vm,
            offersIndex: !!oiResult,
            salesIndex: !!si,
            comboData: !!comboData,
            metadata: !!meta
          })
        }
        
        if (!isMounted) return
        
        // Update state with loaded data (or keep cached if new data is null)
        setValueModel(vm || cachedValueModel || null)
        setOffersIndex(oiResult?.data || oiResult || cachedOffersIndex || null)
        setSalesIndex(si || cachedSalesIndex || null)
        setMetadata(meta || null)
        // comboData contains the inverted index which is stored in DataCache.comboInvertedIndex
        // No need to set it in state, it's already in DataCache
      } catch (err) {
        console.error('[Value Engine] Failed to load trait values data:', err)
        if (!isMounted) return
        // Set fallback values so UI can still render
        setValueModel(cachedValueModel || null)
        setOffersIndex(cachedOffersIndex || null)
        setSalesIndex(cachedSalesIndex || null)
        setMetadata(null)
      } finally {
        if (isMounted) {
          setLoading(false)
          if (import.meta.env.DEV) {
            console.log('[Value Engine] Data load complete, loading set to false')
          }
        }
      }
    }
    load()
    
    return () => {
      isMounted = false
    }
  }, [])
  
  // Compute trait values from sales when data is available
  useEffect(() => {
    if (!salesIndex || !metadata || !Array.isArray(metadata)) {
      return
    }
    
    try {
      const traitSalesMap = buildTraitSalesMap(salesIndex, metadata)
      const valuesMap = new Map()
      
      for (const [traitKey, salesEvents] of traitSalesMap.entries()) {
        const result = calculateTraitValue(salesEvents, {
          halfLifeDays: 90,
          outlierThreshold: 3
        })
        valuesMap.set(traitKey, result)
      }
      
      setTraitValuesFromSales(valuesMap)
    } catch (err) {
      console.error('Failed to compute trait values from sales:', err)
    }
  }, [salesIndex, metadata])
  
  // Build per-trait sales stats (salesCount, lastSaleAtMs) for sorting
  useEffect(() => {
    if (!salesIndex || !salesIndex.events || !Array.isArray(salesIndex.events)) {
      setTraitSalesStatsByKey(new Map())
      return
    }
    
    // Build traits lookup from metadata
    const traitsById = {}
    if (metadata && Array.isArray(metadata)) {
      for (const item of metadata) {
        const name = item.name || ''
        const match = name.match(/#(\d+)$/)
        if (!match) continue
        
        const id = match[1]
        const traits = {}
        
        if (item.attributes && Array.isArray(item.attributes)) {
          for (const attr of item.attributes) {
            const categoryMap = {
              'Base': 'base',
              'Clothes': 'clothes',
              'Head': 'head',
              'Face': 'face',
              'Mouth': 'mouth',
              'Face Wear': 'facewear',
              'Background': 'background'
            }
            const category = categoryMap[attr.trait_type] || attr.trait_type?.toLowerCase()
            if (category && attr.value) {
              traits[category] = attr.value
            }
          }
        }
        
        traitsById[id] = traits
      }
    }
    
    // Build trait sales stats map
    const statsMap = new Map()
    
    for (const event of salesIndex.events) {
      if (!event.is_valid_price || !event.price_xch) continue
      
      const nftId = event.internal_id
      const traits = traitsById[nftId]
      if (!traits) continue
      
      const timestampMs = event.timestamp ? new Date(event.timestamp).getTime() : 0
      if (!timestampMs || !Number.isFinite(timestampMs)) continue
      
      // For each trait in this NFT, update stats
      for (const [category, traitValue] of Object.entries(traits)) {
        if (!traitValue) continue
        
        const traitKey = `${category}::${traitValue}`
        
        if (!statsMap.has(traitKey)) {
          statsMap.set(traitKey, { salesCount: 0, lastSaleAtMs: 0 })
        }
        
        const stats = statsMap.get(traitKey)
        stats.salesCount++
        stats.lastSaleAtMs = Math.max(stats.lastSaleAtMs, timestampMs)
      }
    }
    
    setTraitSalesStatsByKey(statsMap)
  }, [salesIndex, metadata])

  // Category labels
  const categoryLabels = {
    base: 'Base',
    clothes: 'Clothes',
    head: 'Head',
    face: 'Face',
    mouth: 'Mouth',
    facewear: 'Eyes',
    background: 'Background'
  }

  const categories = ['base', 'face', 'mouth', 'facewear', 'head', 'clothes', 'background']

  // Price formatting helpers
  const formatPriceXCH = useCallback((price) => {
    if (price < 0.01) {
      return price.toFixed(4)
    }
    return price.toFixed(2)
  }, [])
  
  const formatPriceUSD = useCallback((price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }, [])

  // Build trait index from valueModel (v1 or v2 compatible)
  const traitIndex = useMemo(() => {
    if (!valueModel) return []
    const index = []
    const askModel = valueModel.models?.ask
    // v2 uses sales, v1 uses clear
    const salesModel = valueModel.models?.sales || valueModel.models?.clear
    
    if (!askModel || !salesModel) return []
    
    // Collect all traits from both models
    const traitKeysSet = new Set()
    if (askModel.trait_delta_log) {
      Object.keys(askModel.trait_delta_log).forEach(key => traitKeysSet.add(key))
    }
    if (salesModel.trait_delta_log) {
      Object.keys(salesModel.trait_delta_log).forEach(key => traitKeysSet.add(key))
    }
    
    // Build index entries
    for (const traitKey of traitKeysSet) {
      const [category, trait] = traitKey.split('::')
      if (!category || !trait) continue
      
      const askDeltaLog = askModel.trait_delta_log?.[traitKey] ?? null
      const salesDeltaLog = salesModel.trait_delta_log?.[traitKey] ?? null
      
      const askDeltaXch = askDeltaLog !== null ? Math.exp(askModel.baseline_log + askDeltaLog) - Math.exp(askModel.baseline_log) : null
      const salesDeltaXch = salesDeltaLog !== null ? Math.exp(salesModel.baseline_log + salesDeltaLog) - Math.exp(salesModel.baseline_log) : null
      
      const askSupport = askModel.trait_support?.[traitKey] || 0
      const salesSupport = salesModel.trait_support?.[traitKey] || 0
      const support = Math.max(askSupport, salesSupport)
      const totalSupport = askSupport + salesSupport
      
      // Simple confidence based on support
      let confidenceLevel = 'LOW'
      if (support >= 10) confidenceLevel = 'HIGH'
      else if (support >= 3) confidenceLevel = 'MED'
      
      // Numeric confidence score for sorting: clamp01(totalSupport / 12)
      const confidenceScore = Math.max(0, Math.min(1, totalSupport / 12))
      
      // Premium: max of ask and sales deltas
      const premiumXch = Math.max(askDeltaXch || 0, salesDeltaXch || 0)
      
      index.push({
        key: traitKey,
        category,
        trait,
        askDeltaXch,
        clearDeltaXch: salesDeltaXch, // For v1 compatibility, keep clearDeltaXch name
        support,
        confidenceLevel,
        confidenceScore,
        premiumXch
      })
    }
    
    return index
  }, [valueModel])
  
  // Get available traits for selected category
  const availableTraits = useMemo(() => {
    if (!selectedTraitCategory) return []
    return traitIndex
      .filter(t => t.category === selectedTraitCategory)
      .sort((a, b) => a.trait.localeCompare(b.trait))
  }, [traitIndex, selectedTraitCategory])

  // Filter and sort traits
  const filteredTraits = useMemo(() => {
    let filtered = [...traitIndex]
    
    // Filter by category
    if (selectedTraitCategory) {
      filtered = filtered.filter(t => t.category === selectedTraitCategory)
    }
    
    // Filter by selected trait
    if (selectedTrait) {
      filtered = filtered.filter(t => t.trait === selectedTrait)
    }
    
    // Apply CTA mode filters
    if (activeCTAMode === 'hot') {
      filtered = filtered.filter(t => 
        (t.askDeltaXch !== null && t.askDeltaXch > 0) && t.support >= 3
      )
    } else if (activeCTAMode === 'undervalued') {
      filtered = filtered.filter(t => 
        (t.clearDeltaXch !== null && t.clearDeltaXch < 0) && t.support >= 5
      )
    }
    
    // Sort
    filtered.sort((a, b) => {
      let primary = 0
      
      if (traitSortBy === 'premiumDesc') {
        primary = (b.premiumXch || 0) - (a.premiumXch || 0)
      } else if (traitSortBy === 'premiumAsc') {
        primary = (a.premiumXch || 0) - (b.premiumXch || 0)
      } else if (traitSortBy === 'confidenceDesc') {
        primary = (b.confidenceScore || 0) - (a.confidenceScore || 0)
      } else if (traitSortBy === 'salesDesc') {
        const aStats = traitSalesStatsByKey.get(a.key) || { salesCount: 0 }
        const bStats = traitSalesStatsByKey.get(b.key) || { salesCount: 0 }
        primary = bStats.salesCount - aStats.salesCount
      } else if (traitSortBy === 'recencyDesc') {
        const aStats = traitSalesStatsByKey.get(a.key) || { lastSaleAtMs: 0 }
        const bStats = traitSalesStatsByKey.get(b.key) || { lastSaleAtMs: 0 }
        primary = bStats.lastSaleAtMs - aStats.lastSaleAtMs
      } else { // alpha
        primary = a.trait.localeCompare(b.trait)
      }
      
      // Tie-breaker: alpha ascending
      if (primary === 0) {
        return a.trait.localeCompare(b.trait)
      }
      
      return primary
    })
    
    return filtered
  }, [traitIndex, selectedTraitCategory, selectedTrait, traitSortBy, activeCTAMode, traitSalesStatsByKey])

  // Update selectedTraitKey when trait is selected from dropdown
  useEffect(() => {
    if (selectedTraitCategory && selectedTrait) {
      const traitKey = `${selectedTraitCategory}::${selectedTrait}`
      setSelectedTraitKey(traitKey)
    } else {
      setSelectedTraitKey(null)
    }
  }, [selectedTraitCategory, selectedTrait, setSelectedTraitKey])

  // Clear selected trait when category changes
  useEffect(() => {
    setSelectedTrait('')
  }, [selectedTraitCategory])

  // Get trait detail for selected trait
  const traitDetail = useMemo(() => {
    if (!selectedTraitKey || !valueModel) return null
    
    const trait = traitIndex.find(t => t.key === selectedTraitKey)
    if (!trait) return null
    
    const askModel = valueModel.models?.ask
    const salesModel = valueModel.models?.sales || valueModel.models?.clear // v2 uses sales, v1 uses clear
    
    // v2: No pair deltas, return trait detail without pairs
    if (valueModel.schema_version?.startsWith('2.')) {
      return {
        ...trait
      }
    }
    
    // v1: Get top pairs for this trait
    const pairs = []
    const clearModel = valueModel.models?.clear
    if (askModel?.pair_delta_log && clearModel?.pair_delta_log) {
      const pairKeys = new Set()
      Object.keys(askModel.pair_delta_log).forEach(key => {
        if (key.includes(selectedTraitKey)) pairKeys.add(key)
      })
      Object.keys(clearModel.pair_delta_log).forEach(key => {
        if (key.includes(selectedTraitKey)) pairKeys.add(key)
      })
      
      for (const pairKey of pairKeys) {
        const parts = pairKey.split('||')
        if (parts.length !== 2) continue
        
        const otherTraitKey = parts[0] === selectedTraitKey ? parts[1] : parts[0]
        const [otherCategory, otherTrait] = otherTraitKey.split('::')
        
        const askDeltaLog = askModel.pair_delta_log[pairKey] ?? null
        const clearDeltaLog = clearModel.pair_delta_log[pairKey] ?? null
        
        const askDeltaXch = askDeltaLog !== null ? Math.exp(askModel.baseline_log + askDeltaLog) - Math.exp(askModel.baseline_log) : null
        const clearDeltaXch = clearDeltaLog !== null ? Math.exp(clearModel.baseline_log + clearDeltaLog) - Math.exp(clearModel.baseline_log) : null
        
        const support = Math.max(
          askModel.trait_support?.[otherTraitKey] || 0,
          clearModel.trait_support?.[otherTraitKey] || 0
        )
        
        pairs.push({
          pairKey,
          otherTraitKey,
          otherCategory,
          otherTrait,
          askDeltaXch,
          clearDeltaXch,
          support
        })
      }
      
      pairs.sort((a, b) => {
        const aVal = Math.max(a.askDeltaXch || 0, a.clearDeltaXch || 0)
        const bVal = Math.max(b.askDeltaXch || 0, b.clearDeltaXch || 0)
        return bVal - aVal
      })
    }
    
    return {
      ...trait,
      topPairs: pairs.slice(0, 10)
    }
  }, [selectedTraitKey, valueModel, traitIndex])

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="bp-loading">
        <div className="bp-loading-spinner" />
        <div className="bp-loading-text">Loading Trait Values...</div>
      </div>
    )
  }

  if (!valueModel) {
    return (
      <div style={{ 
        padding: '24px', 
        fontSize: '12px',
        textAlign: 'center',
        background: 'var(--win-surface, #c0c0c0)',
        border: '2px inset var(--win-border-dark, #808080)',
        margin: '12px'
      }}>
        <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Value model not available</p>
        <p style={{ marginBottom: '12px', color: 'var(--win-text-dim, #808080)' }}>
          The value model data is required to display trait values.
        </p>
        <p style={{ fontSize: '11px', color: 'var(--win-text-dim, #808080)' }}>
          Please ensure the value model has been built. Check the browser console for loading errors.
        </p>
      </div>
    )
  }

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="bp-trait-values-view" style={{ 
        display: 'flex', 
        flexDirection: 'row',
        minHeight: '100%'
      }}>
        <div className="bp-trait-values-nav" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          width: '300px',
          flexShrink: 0
        }}>
          {/* Controls Section */}
          <fieldset style={{ 
            border: '2px inset var(--win-border-dark, #808080)', 
            background: 'var(--win-surface, #c0c0c0)',
            padding: '10px',
            marginBottom: '12px'
          }}>
            <legend style={{ fontSize: '11px', fontWeight: 'bold', padding: '0 6px' }}>Filter & Sort</legend>
            
            {/* Category Dropdown */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: 'var(--win-text, #000000)'
              }}>
                Category:
              </label>
              <select
                className="bp-select"
                value={selectedTraitCategory || ''}
                onChange={(e) => {
                  setSelectedTraitCategory(e.target.value || null)
                  setSelectedTrait('') // Clear trait when category changes
                }}
                style={{ width: '100%' }}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                ))}
              </select>
            </div>
            
            {/* Trait Dropdown */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: 'var(--win-text, #000000)'
              }}>
                Trait:
              </label>
              <select
                className="bp-select"
                value={selectedTrait || ''}
                onChange={(e) => setSelectedTrait(e.target.value || '')}
                disabled={!selectedTraitCategory}
                style={{ width: '100%' }}
              >
                <option value="">All Traits</option>
                {availableTraits.map(t => (
                  <option key={t.key} value={t.trait}>{t.trait}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Dropdown */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 'bold', 
                marginBottom: '4px',
                color: 'var(--win-text, #000000)'
              }}>
                Sort By:
              </label>
              <select
                className="bp-select"
                value={traitSortBy}
                onChange={(e) => setTraitSortBy(e.target.value)}
                style={{ width: '100%', fontSize: '11px' }}
              >
                <option value="premiumDesc">Premium (High → Low)</option>
                <option value="premiumAsc">Premium (Low → High)</option>
                <option value="confidenceDesc">Confidence (High → Low)</option>
                <option value="salesDesc">#Sales (High → Low)</option>
                <option value="recencyDesc">Recency (Most Recent First)</option>
                <option value="alpha">A–Z</option>
              </select>
            </div>
          </fieldset>
          
          {/* Trait List - Simplified with focus on key info */}
          <div className="bp-trait-list" style={{ 
            border: '2px inset var(--win-border-dark, #808080)', 
            background: 'var(--win-surface, #c0c0c0)',
            maxHeight: 'calc(100vh - 300px)',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            {/* Header row - Simplified */}
            <div style={{
              padding: '8px',
              background: 'var(--win-border-dark, #808080)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontWeight: 'bold',
              borderBottom: '2px solid var(--win-border-dark, #808080)',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <span style={{ flex: 1 }}>Trait</span>
              <span style={{ minWidth: '85px', textAlign: 'right' }}>Premium</span>
              <span style={{ minWidth: '70px', textAlign: 'right' }}>Conf</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredTraits.length === 0 ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: 'var(--win-text-dim, #808080)',
                  fontSize: '11px'
                }}>
                  No traits found
                </div>
              ) : (
                filteredTraits.map((trait, idx) => {
                  // Get sales-based value if available
                  const salesValue = traitValuesFromSales.get(trait.key)
                  const valueXch = salesValue?.valueXch
                  
                  // Fallback to model-based value if no sales data
                  const displayValue = valueXch !== null && valueXch !== undefined 
                    ? valueXch 
                    : trait.premiumXch || 0
                  
                  // Format confidence
                  const confidencePercent = Math.round((trait.confidenceScore || 0) * 100)
                  
                  const isSelected = selectedTraitKey === trait.key
                  
                  return (
                    <div
                      key={trait.key}
                      className={`bp-trait-row ${isSelected ? 'is-selected' : ''} ${hoveredTraitKey === trait.key ? 'is-hovered' : ''}`}
                      onClick={() => {
                        setSelectedTraitKey(trait.key)
                        // Show detail view if sales data available
                        if (salesValue) {
                          setSelectedTraitDetail({
                            traitKey: trait.key,
                            ...salesValue
                          })
                        } else {
                          setSelectedTraitDetail(null)
                        }
                      }}
                      onMouseEnter={() => setHoveredTraitKey(trait.key)}
                      onMouseLeave={() => setHoveredTraitKey(null)}
                      style={{
                        padding: '10px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        borderLeft: isSelected ? '4px solid var(--win-highlight, #000080)' : '4px solid transparent',
                        backgroundColor: isSelected 
                          ? 'rgba(0, 0, 128, 0.15)' 
                          : (idx % 2 === 0 ? 'var(--win-surface, #c0c0c0)' : 'var(--win-surface-2, #d4d0c8)'),
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--win-surface-2, #d4d0c8)'
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'var(--win-surface, #c0c0c0)' : 'var(--win-surface-2, #d4d0c8)'
                        }
                      }}
                    >
                      <span style={{ 
                        flex: 1, 
                        fontWeight: 'bold', 
                        fontSize: '12px',
                        color: 'var(--win-text, #000000)'
                      }}>
                        {trait.trait}
                      </span>
                      <span style={{ 
                        minWidth: '85px', 
                        textAlign: 'right',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: displayValue > 0 ? 'var(--win-text, #000000)' : 'var(--win-text-dim, #808080)'
                      }}>
                        {displayValue > 0 ? `+${formatPriceXCH(displayValue)}` : '—'}
                      </span>
                      <span style={{ 
                        minWidth: '70px', 
                        textAlign: 'right',
                        fontSize: '11px',
                        color: confidencePercent >= 70 ? 'var(--win-text, #000000)' : 
                               confidencePercent >= 40 ? 'var(--win-text-dim, #666666)' : 'var(--win-text-dim, #808080)',
                        fontWeight: confidencePercent >= 70 ? 'bold' : 'normal'
                      }}>
                        {confidencePercent}%
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Middle Pane - Trait Detail */}
        <div className="bp-trait-detail" style={{ 
          flex: 1, 
          padding: '0 12px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Show TraitValueDetailView if selected trait has sales data */}
          {selectedTraitDetail && (
            <TraitValueDetailView
              traitKey={selectedTraitDetail.traitKey}
              trades={selectedTraitDetail.trades}
              filteredTrades={selectedTraitDetail.filteredTrades}
              valueXch={selectedTraitDetail.valueXch}
              tradeCount={selectedTraitDetail.tradeCount}
              filteredCount={selectedTraitDetail.filteredCount}
              onClose={() => setSelectedTraitDetail(null)}
              launcherMap={DataCache.mintgardenLauncherMap || {}}
            />
          )}
          
          {traitDetail && !selectedTraitDetail ? (
            <>
              {/* Trait Detail Header - More Prominent */}
              <div className="bp-trait-detail-header" style={{
                background: 'var(--win-surface-2, #d4d0c8)',
                border: '2px inset var(--win-border-dark, #808080)',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: 'var(--win-text, #000000)'
                }}>
                  {categoryLabels[traitDetail.category]}: {traitDetail.trait}
                </h3>
                
                {/* Prominent Value Display */}
                <div style={{
                  background: 'var(--win-surface, #c0c0c0)',
                  border: '2px outset var(--win-border-light, #ffffff)',
                  padding: '12px 16px',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: 'bold', 
                    color: 'var(--win-text, #000000)',
                    marginBottom: '4px'
                  }}>
                    +{formatPriceXCH(Math.max(traitDetail.askDeltaXch || 0, traitDetail.clearDeltaXch || 0))} XCH
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--win-text-dim, #808080)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Trait Premium
                  </div>
                </div>
                
                {/* Secondary Stats */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  fontSize: '11px'
                }}>
                  <div style={{
                    padding: '6px 8px',
                    background: 'var(--win-surface, #c0c0c0)',
                    border: '1px inset var(--win-border-dark, #808080)',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: 'var(--win-text-dim, #808080)', marginBottom: '2px' }}>Ask Delta</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--win-text, #000000)' }}>
                      {traitDetail.askDeltaXch !== null ? `+${formatPriceXCH(traitDetail.askDeltaXch)}` : '—'}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 8px',
                    background: 'var(--win-surface, #c0c0c0)',
                    border: '1px inset var(--win-border-dark, #808080)',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: 'var(--win-text-dim, #808080)', marginBottom: '2px' }}>Sales Delta</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--win-text, #000000)' }}>
                      {traitDetail.clearDeltaXch !== null ? `+${formatPriceXCH(traitDetail.clearDeltaXch)}` : '—'}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 8px',
                    background: 'var(--win-surface, #c0c0c0)',
                    border: '1px inset var(--win-border-dark, #808080)',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: 'var(--win-text-dim, #808080)', marginBottom: '2px' }}>Support</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--win-text, #000000)' }}>
                      {traitDetail.support || 0}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Market Summary Card - Improved Layout */}
              {traitDetail && (() => {
                const invertedIndex = DataCache.comboInvertedIndex
                const traitKey = selectedTraitKey
                if (!invertedIndex || !traitKey || !offersIndex) return null
                
                const traitNftIds = invertedIndex.traits?.[traitKey] || []
                const listedNfts = traitNftIds
                  .filter(nftId => {
                    const nftIdStr = String(nftId)
                    const nftIdNum = parseInt(nftIdStr, 10)
                    const listing = offersIndex.listings_by_id?.[nftIdStr]?.best_listing || 
                                   offersIndex.listings_by_id?.[nftIdNum]?.best_listing
                    return listing && listing.price_xch != null
                  })
                  .map(nftId => {
                    const nftIdStr = String(nftId)
                    const nftIdNum = parseInt(nftIdStr, 10)
                    const listing = offersIndex.listings_by_id[nftIdStr]?.best_listing || 
                                   offersIndex.listings_by_id[nftIdNum]?.best_listing
                    return listing.price_xch
                  })
                  .sort((a, b) => a - b)
                
                if (listedNfts.length === 0) return null
                
                const floor = listedNfts[0]
                const avg = listedNfts.reduce((sum, p) => sum + p, 0) / listedNfts.length
                const max = listedNfts[listedNfts.length - 1]
                
                return (
                  <fieldset style={{ 
                    marginBottom: '12px', 
                    padding: '12px',
                    border: '2px inset var(--win-border-dark, #808080)',
                    background: 'var(--win-surface, #c0c0c0)'
                  }}>
                    <legend style={{ fontSize: '12px', fontWeight: 'bold', padding: '0 8px' }}>Market Summary</legend>
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '12px',
                      fontSize: '12px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--win-text-dim, #808080)', marginBottom: '4px', fontSize: '11px' }}>Listed</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--win-text, #000000)', fontSize: '14px' }}>
                          {listedNfts.length}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--win-text-dim, #808080)', marginBottom: '4px', fontSize: '11px' }}>Floor</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--win-text, #000000)', fontSize: '14px' }}>
                          {formatPriceXCH(floor)} XCH
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--win-text-dim, #808080)', marginBottom: '4px', fontSize: '11px' }}>Average</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--win-text, #000000)', fontSize: '14px' }}>
                          {formatPriceXCH(avg)} XCH
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--win-text-dim, #808080)', marginBottom: '4px', fontSize: '11px' }}>Range</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--win-text, #000000)', fontSize: '12px' }}>
                          {formatPriceXCH(floor)}–{formatPriceXCH(max)}
                        </div>
                      </div>
                    </div>
                  </fieldset>
                )
              })()}
              
              {/* Tabs - Improved Styling */}
              <div className="bp-tabs" style={{ 
                marginBottom: '12px',
                display: 'flex', 
                gap: '2px',
                background: 'var(--win-surface, #c0c0c0)',
                border: '2px inset var(--win-border-dark, #808080)',
                padding: '2px'
              }}>
                <button
                  className={`bp-tab ${traitDetailTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setTraitDetailTab('overview')}
                  style={{ 
                    flex: 1,
                    padding: '8px 12px', 
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: traitDetailTab === 'overview' ? 'var(--win-surface-2, #d4d0c8)' : 'var(--win-surface, #c0c0c0)',
                    border: traitDetailTab === 'overview' ? '2px inset var(--win-border-dark, #808080)' : '2px outset var(--win-border-light, #ffffff)',
                    borderBottomColor: traitDetailTab === 'overview' ? 'var(--win-border-dark, #808080)' : 'var(--win-border-dark, #808080)',
                    borderRightColor: traitDetailTab === 'overview' ? 'var(--win-border-dark, #808080)' : 'var(--win-border-dark, #808080)',
                    cursor: 'pointer',
                    color: 'var(--win-text, #000000)'
                  }}
                >
                  Overview
                </button>
                <button
                  className={`bp-tab ${traitDetailTab === 'listed' ? 'active' : ''}`}
                  onClick={() => setTraitDetailTab('listed')}
                  style={{ 
                    flex: 1,
                    padding: '8px 12px', 
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: traitDetailTab === 'listed' ? 'var(--win-surface-2, #d4d0c8)' : 'var(--win-surface, #c0c0c0)',
                    border: traitDetailTab === 'listed' ? '2px inset var(--win-border-dark, #808080)' : '2px outset var(--win-border-light, #ffffff)',
                    borderBottomColor: traitDetailTab === 'listed' ? 'var(--win-border-dark, #808080)' : 'var(--win-border-dark, #808080)',
                    borderRightColor: traitDetailTab === 'listed' ? 'var(--win-border-dark, #808080)' : 'var(--win-border-dark, #808080)',
                    cursor: 'pointer',
                    color: 'var(--win-text, #000000)'
                  }}
                >
                  Listed Now
                </button>
                <button
                  className={`bp-tab ${traitDetailTab === 'sales' ? 'active' : ''}`}
                  onClick={() => setTraitDetailTab('sales')}
                  style={{ 
                    flex: 1,
                    padding: '8px 12px', 
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: traitDetailTab === 'sales' ? 'var(--win-surface-2, #d4d0c8)' : 'var(--win-surface, #c0c0c0)',
                    border: traitDetailTab === 'sales' ? '2px inset var(--win-border-dark, #808080)' : '2px outset var(--win-border-light, #ffffff)',
                    borderBottomColor: traitDetailTab === 'sales' ? 'var(--win-border-dark, #808080)' : 'var(--win-border-dark, #808080)',
                    borderRightColor: traitDetailTab === 'sales' ? 'var(--win-border-dark, #808080)' : 'var(--win-border-dark, #808080)',
                    cursor: 'pointer',
                    color: 'var(--win-text, #000000)'
                  }}
                >
                  Recent Sales
                </button>
              </div>
              
              {/* Tab Content */}
              <div style={{ 
                marginTop: '12px'
              }}>
                {traitDetailTab === 'overview' && (
                  <div>
                    <p style={{ fontSize: '11px', marginBottom: '12px' }}>
                      This trait adds {formatPriceXCH(Math.max(traitDetail.askDeltaXch || 0, traitDetail.clearDeltaXch || 0))} XCH to the base value.
                    </p>
                    
                    {traitDetail.topPairs.length > 0 && (
                      <fieldset style={{ marginTop: '12px' }}>
                        <legend>Best Combos</legend>
                        <div>
                          {traitDetail.topPairs.map(pair => (
                            <div key={pair.pairKey} style={{ padding: '4px', fontSize: '11px' }}>
                              {categoryLabels[pair.otherCategory]}: {pair.otherTrait} 
                              {' '}(+{formatPriceXCH(Math.max(pair.askDeltaXch || 0, pair.clearDeltaXch || 0))} premium, support: {pair.support})
                            </div>
                          ))}
                        </div>
                      </fieldset>
                    )}
                  </div>
                )}
                {traitDetailTab === 'listed' && (() => {
                  // Get NFTs with this trait from inverted index
                  const invertedIndex = DataCache.comboInvertedIndex
                  const traitKey = selectedTraitKey
                  
                  // Check if data is still loading
                  if (loading) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        Loading data...
                      </div>
                    )
                  }
                  
                  if (!invertedIndex || !traitKey || !offersIndex) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        {!invertedIndex ? 'Loading trait index...' : !offersIndex ? 'Loading offers index...' : 'No trait selected'}
                      </div>
                    )
                  }
                  
                  // Debug: Log trait key lookup
                  if (import.meta.env.DEV) {
                    console.log('[Value Engine] Looking up trait:', traitKey)
                    console.log('[Value Engine] Inverted index has traits:', Object.keys(invertedIndex.traits || {}).slice(0, 10))
                    console.log('[Value Engine] Offers index has listings:', Object.keys(offersIndex.listings_by_id || {}).length)
                  }
                  
                  // Get all NFTs with this trait
                  const traitNftIds = invertedIndex.traits?.[traitKey] || []
                  
                  if (import.meta.env.DEV) {
                    console.log('[Value Engine] Found', traitNftIds.length, 'NFTs with trait', traitKey)
                    if (traitNftIds.length > 0) {
                      console.log('[Value Engine] Sample NFT IDs:', traitNftIds.slice(0, 5))
                    }
                  }
                  
                  if (traitNftIds.length === 0) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        No NFTs found with trait "{traitKey}". 
                        {import.meta.env.DEV && (
                          <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--win-text-dim, #808080)' }}>
                            Debug: Available traits include: {Object.keys(invertedIndex.traits || {}).filter(k => k.includes(traitKey.split('::')[1])).slice(0, 3).join(', ')}
                          </div>
                        )}
                      </div>
                    )
                  }
                  
                  // Filter to only listed NFTs and get their listing data
                  // Note: Handle both string and number ID formats
                  const listedNfts = traitNftIds
                    .filter(nftId => {
                      const nftIdStr = String(nftId)
                      const nftIdNum = parseInt(nftIdStr, 10)
                      // Try both string and number keys
                      const listing = offersIndex.listings_by_id?.[nftIdStr]?.best_listing || 
                                     offersIndex.listings_by_id?.[nftIdNum]?.best_listing
                      return listing && listing.price_xch != null
                    })
                    .map(nftId => {
                      const nftIdStr = String(nftId)
                      const nftIdNum = parseInt(nftIdStr, 10)
                      // Try both string and number keys
                      const listing = offersIndex.listings_by_id[nftIdStr]?.best_listing || 
                                     offersIndex.listings_by_id[nftIdNum]?.best_listing
                      return {
                        nftId: nftIdStr,
                        priceXch: listing.price_xch,
                        listing
                      }
                    })
                    .sort((a, b) => a.priceXch - b.priceXch) // Sort cheapest to most expensive
                  
                  if (import.meta.env.DEV) {
                    console.log('[Value Engine] Found', listedNfts.length, 'listed NFTs out of', traitNftIds.length, 'total')
                  }
                  
                  if (listedNfts.length === 0) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        No NFTs with this trait are currently listed.
                        {import.meta.env.DEV && (
                          <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--win-text-dim, #808080)' }}>
                            Debug: Found {traitNftIds.length} NFTs with this trait, but none are listed.
                          </div>
                        )}
                      </div>
                    )
                  }
                  
                  const xchUsdRate = xchUsdFallback // Use current price priority logic
                  
                  return (
                    <div style={{ fontSize: '11px' }}>
                      <div style={{ 
                        marginBottom: '12px', 
                        color: 'var(--win-text, #000000)', 
                        fontWeight: 'bold',
                        fontSize: '13px',
                        padding: '6px 8px',
                        background: 'var(--win-surface-2, #d4d0c8)',
                        border: '1px inset var(--win-border-dark, #808080)'
                      }}>
                        Listed NFTs ({listedNfts.length})
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'row',
                        gap: '12px',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        padding: '12px',
                        border: '2px inset var(--win-border-dark, #808080)',
                        background: 'var(--win-surface, #c0c0c0)',
                        minHeight: '200px',
                        alignItems: 'flex-start'
                      }}>
                        {listedNfts.map(({ nftId, priceXch, listing }) => {
                          const imageUrl = getNftImageUrl(nftId)
                          const launcher = DataCache.mintgardenLauncherMap?.[nftId]
                          const priceUsd = xchUsdRate ? priceXch * xchUsdRate : null
                          const priceText = `${formatPriceXCH(priceXch)} XCH`
                          const priceTextUsd = priceUsd ? formatPriceUSD(priceUsd) : null
                          
                          return (
                            <div
                              key={nftId}
                              style={{
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '120px'
                              }}
                            >
                              {/* NFT Preview Card with image, ID, and action buttons */}
                              <NftPreviewCard
                                nftId={nftId}
                                imageUrl={imageUrl}
                                launcher={launcher}
                                size="medium"
                                style={{ marginBottom: '6px' }}
                              />
                              
                              {/* Price */}
                              <div style={{ 
                                marginTop: '4px',
                                fontSize: '10px',
                                textAlign: 'center',
                                color: 'var(--win-text, #000000)',
                                fontWeight: 'bold'
                              }}>
                                {priceText}
                                {priceTextUsd && (
                                  <div style={{ fontSize: '9px', color: 'var(--win-text-dim, #808080)', marginTop: '2px' }}>
                                    {priceTextUsd}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                {traitDetailTab === 'sales' && (() => {
                  // Get NFTs with this trait from inverted index
                  const invertedIndex = DataCache.comboInvertedIndex
                  const traitKey = selectedTraitKey
                  
                  // Check if data is still loading
                  if (loading) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        Loading data...
                      </div>
                    )
                  }
                  
                  if (!invertedIndex || !traitKey || !salesIndex) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        {!invertedIndex ? 'Loading trait index...' : !salesIndex ? 'Loading sales index...' : 'No trait selected'}
                      </div>
                    )
                  }
                  
                  // Get all NFTs with this trait
                  const traitNftIds = invertedIndex.traits?.[traitKey] || []
                  
                  if (traitNftIds.length === 0) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        No NFTs found with trait "{traitKey}".
                      </div>
                    )
                  }
                  
                  // Get sales for these NFTs
                  const sales = (salesIndex.events || [])
                    .filter(event => {
                      const nftIdStr = String(event.internal_id || '')
                      return traitNftIds.includes(nftIdStr) && event.price_xch != null && event.is_valid_price
                    })
                    .map(event => ({
                      ...event,
                      nftId: String(event.internal_id || ''),
                      saleDate: new Date(event.timestamp)
                    }))
                    .sort((a, b) => b.saleDate - a.saleDate) // Most recent first
                  
                  if (sales.length === 0) {
                    return (
                      <div style={{ fontSize: '11px', padding: '12px' }}>
                        No recent sales found for NFTs with this trait.
                      </div>
                    )
                  }
                  
                  const xchUsdRate = xchUsdFallback // Use current price priority logic
                  
                  // Format date helper
                  const formatSaleDate = (date) => {
                    const now = new Date()
                    const diffMs = now - date
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                    
                    if (diffDays === 0) {
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                      if (diffHours === 0) {
                        const diffMins = Math.floor(diffMs / (1000 * 60))
                        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
                      }
                      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
                    } else if (diffDays === 1) {
                      return 'Yesterday'
                    } else if (diffDays < 7) {
                      return `${diffDays} days ago`
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
                    }
                  }
                  
                  return (
                    <div style={{ fontSize: '11px' }}>
                      <div style={{ 
                        marginBottom: '12px', 
                        color: 'var(--win-text, #000000)', 
                        fontWeight: 'bold',
                        fontSize: '13px',
                        padding: '6px 8px',
                        background: 'var(--win-surface-2, #d4d0c8)',
                        border: '1px inset var(--win-border-dark, #808080)'
                      }}>
                        Recent Sales ({sales.length})
                      </div>
                      
                      {/* Horizontal Scrollable Row */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '12px',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        padding: '12px',
                        border: '2px inset var(--win-border-dark, #808080)',
                        background: 'var(--win-surface, #c0c0c0)',
                        minHeight: '200px',
                        alignItems: 'flex-start'
                      }}>
                        {sales.map((sale) => {
                          const imageUrl = getNftImageUrl(sale.nftId)
                          const launcher = DataCache.mintgardenLauncherMap?.[sale.nftId]
                          const priceUsd = xchUsdRate ? sale.price_xch * xchUsdRate : null
                          const priceText = `${formatPriceXCH(sale.price_xch)} XCH`
                          const priceTextUsd = priceUsd ? formatPriceUSD(priceUsd) : null
                          
                          return (
                            <div
                              key={`${sale.nftId}-${sale.timestamp}`}
                              style={{
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '120px'
                              }}
                            >
                              {/* NFT Preview Card with image, ID, and action buttons */}
                              <NftPreviewCard
                                nftId={sale.nftId}
                                imageUrl={imageUrl}
                                launcher={launcher}
                                size="medium"
                                style={{ marginBottom: '6px' }}
                              />
                              
                              {/* Price - Below Card */}
                              <div style={{ 
                                marginTop: '4px',
                                fontSize: '10px',
                                textAlign: 'center',
                                marginBottom: '4px'
                              }}>
                                <div style={{ fontWeight: 'bold' }}>{priceText}</div>
                                {priceTextUsd && (
                                  <div style={{ fontSize: '9px', color: 'var(--win-text-dim, #808080)' }}>{priceTextUsd}</div>
                                )}
                              </div>
                              
                              {/* Sale Date */}
                              <div style={{ 
                                fontSize: '9px',
                                color: 'var(--win-text-dim, #808080)',
                                textAlign: 'center'
                              }}>
                                {formatSaleDate(sale.saleDate)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--win-text-dim, #808080)', fontSize: '11px' }}>
              Select a trait to view details
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mobile layout
  return (
    <div className="bp-trait-values-mobile" style={{ padding: '12px', fontSize: '11px' }}>
      <p>Mobile layout coming soon...</p>
      <p style={{ marginTop: '8px', color: 'var(--win-text-dim, #808080)' }}>
        Select a trait: {filteredTraits.length} traits available
      </p>
    </div>
  )
}

// Helper function to compute fair value for an NFT
const computeFairValue = (nftId, valueModel, traits, offersIndex) => {
  if (!valueModel || !traits || !nftId) {
    return null
  }
  
  const askModel = valueModel.models?.ask
  const clearModel = valueModel.models?.clear
  
  if (!askModel || !clearModel) {
    return null
  }
  
  // Build trait keys from traits object
  const traitKeys = []
  for (const [category, trait] of Object.entries(traits)) {
    if (trait) {
      traitKeys.push(`${category}::${trait}`)
    }
  }
  
  // Compute ask prediction
  let askPredLog = askModel.baseline_log || 0
  const askContributors = []
  
  for (const traitKey of traitKeys) {
    const delta = askModel.trait_delta_log?.[traitKey]
    if (delta !== undefined && delta !== null) {
      askPredLog += delta
      askContributors.push({ trait: traitKey, delta })
    }
  }
  
  // Add pair deltas (simplified - check all pairs)
  const askPairDeltas = []
  for (let i = 0; i < traitKeys.length; i++) {
    for (let j = i + 1; j < traitKeys.length; j++) {
      const pairKey = traitKeys[i] < traitKeys[j] 
        ? `${traitKeys[i]}||${traitKeys[j]}`
        : `${traitKeys[j]}||${traitKeys[i]}`
      const pairDelta = askModel.pair_delta_log?.[pairKey]
      if (pairDelta !== undefined && pairDelta !== null) {
        askPredLog += pairDelta
        askPairDeltas.push({ pair: pairKey, delta: pairDelta })
      }
    }
  }
  
  const askPredXch = Math.exp(askPredLog)
  
  // Compute clear prediction
  let clearPredLog = clearModel.baseline_log || 0
  const clearContributors = []
  
  for (const traitKey of traitKeys) {
    const delta = clearModel.trait_delta_log?.[traitKey]
    if (delta !== undefined && delta !== null) {
      clearPredLog += delta
      clearContributors.push({ trait: traitKey, delta })
    }
  }
  
  // Add pair deltas
  const clearPairDeltas = []
  for (let i = 0; i < traitKeys.length; i++) {
    for (let j = i + 1; j < traitKeys.length; j++) {
      const pairKey = traitKeys[i] < traitKeys[j] 
        ? `${traitKeys[i]}||${traitKeys[j]}`
        : `${traitKeys[j]}||${traitKeys[i]}`
      const pairDelta = clearModel.pair_delta_log?.[pairKey]
      if (pairDelta !== undefined && pairDelta !== null) {
        clearPredLog += pairDelta
        clearPairDeltas.push({ pair: pairKey, delta: pairDelta })
      }
    }
  }
  
  const clearPredXch = Math.exp(clearPredLog)
  
  // Compute prediction ranges
  const askSigma = askModel.global_stats?.sigma || null
  const clearSigma = clearModel.global_stats?.sigma || null
  
  const askLow = askSigma ? Math.exp(askPredLog - 1.0 * askSigma) : null
  const askHigh = askSigma ? Math.exp(askPredLog + 1.0 * askSigma) : null
  const clearLow = clearSigma ? Math.exp(clearPredLog - 1.0 * clearSigma) : null
  const clearHigh = clearSigma ? Math.exp(clearPredLog + 1.0 * clearSigma) : null
  
  // Compute confidence
  const askSupport = askContributors.reduce((sum, c) => {
    const support = askModel.trait_support?.[c.trait] || 0
    return sum + support
  }, 0)
  const clearSupport = clearContributors.reduce((sum, c) => {
    const support = clearModel.trait_support?.[c.trait] || 0
    return sum + support
  }, 0)
  
  const askNListed = askModel.global_stats?.n_listed || 0
  const clearNSales = clearModel.global_stats?.n_sales || 0
  
  // Coverage: how many traits have support
  const traitsWithSupport = traitKeys.filter(tk => {
    const askSup = askModel.trait_support?.[tk] || 0
    const clearSup = clearModel.trait_support?.[tk] || 0
    return askSup >= 1.0 || clearSup >= 1.0
  }).length
  
  const coverage = `${traitsWithSupport}/${traitKeys.length}`
  const coverageFactor = traitKeys.length > 0 ? clamp01(traitsWithSupport / (traitKeys.length * 0.5)) : 0
  
  // Confidence factors
  const supportFactor = sigmoid((Math.max(askSupport, clearSupport) - 5) / 5)
  const recencyFactor = 0.8 // Simplified - would use actual recency from model
  const dispersionFactor = 0.9 // Simplified
  const conf = Math.min(supportFactor, recencyFactor, dispersionFactor, coverageFactor)
  
  let confidenceLevel = 'LOW'
  if (conf >= 0.7) confidenceLevel = 'HIGH'
  else if (conf >= 0.4) confidenceLevel = 'MED'
  
  // Blend suggested value
  const floorXch = valueModel.floor?.xch || null
  let confAsk = conf
  let confClear = conf
  
  // Apply selection bias correction to ask confidence
  if (floorXch && askPredXch) {
    const floorMult = askPredXch / floorXch
    confAsk *= clamp01(1 / (1 + Math.pow(Math.max(0, floorMult - 1.5), 2)))
  }
  
  const suggestedXch = (confClear * clearPredXch + confAsk * askPredXch) / (confClear + confAsk + 1e-10)
  
  // Compute suggested range (blend the ranges)
  const suggestedLow = (clearLow && askLow) 
    ? (confClear * clearLow + confAsk * askLow) / (confClear + confAsk + 1e-10)
    : null
  const suggestedHigh = (clearHigh && askHigh)
    ? (confClear * clearHigh + confAsk * askHigh) / (confClear + confAsk + 1e-10)
    : null
  
  // Get current listing
  const currentListing = offersIndex?.listings_by_id?.[nftId]?.best_listing
  const currentListingPrice = currentListing?.price_xch || null
  const diffPercent = currentListingPrice && suggestedXch
    ? ((currentListingPrice / suggestedXch - 1) * 100)
    : null
  
  // Get last sale (from sales index if available)
  const salesIndex = DataCache.salesIndexV1
  let lastSalePrice = null
  let lastSaleTimestamp = null
  let lastSaleAgeDays = null
  
  if (salesIndex && salesIndex.events) {
    const nftSales = salesIndex.events
      .filter(e => e.internal_id === nftId && e.is_valid_price)
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0
        return new Date(b.timestamp) - new Date(a.timestamp)
      })
    
    if (nftSales.length > 0) {
      const lastSale = nftSales[0]
      lastSalePrice = lastSale.price_xch
      lastSaleTimestamp = lastSale.timestamp
      if (lastSaleTimestamp) {
        const now = Date.now()
        const saleTime = new Date(lastSaleTimestamp).getTime()
        lastSaleAgeDays = Math.floor((now - saleTime) / (1000 * 60 * 60 * 24))
      }
    }
  }
  
  // Sort contributors
  const allContributors = [
    ...askContributors.map(c => ({ ...c, source: 'ask' })),
    ...clearContributors.map(c => ({ ...c, source: 'clear' }))
  ]
  
  // Group by trait and compute blended delta
  const contributorMap = new Map()
  for (const c of allContributors) {
    if (!contributorMap.has(c.trait)) {
      contributorMap.set(c.trait, { trait: c.trait, askDelta: 0, clearDelta: 0 })
    }
    const entry = contributorMap.get(c.trait)
    if (c.source === 'ask') {
      entry.askDelta = c.delta
    } else {
      entry.clearDelta = c.delta
    }
  }
  
  const blendedContributors = Array.from(contributorMap.values()).map(entry => {
    const blendedDelta = (confAsk * Math.exp(askModel.baseline_log + entry.askDelta) + 
                         confClear * Math.exp(clearModel.baseline_log + entry.clearDelta)) / 
                        (confAsk + confClear + 1e-10) - suggestedXch
    return {
      trait: entry.trait,
      delta: blendedDelta,
      deltaPercent: suggestedXch > 0 ? (blendedDelta / suggestedXch) * 100 : 0,
      askDelta: entry.askDelta,
      clearDelta: entry.clearDelta
    }
  })
  
  const topPositiveContributors = blendedContributors
    .filter(c => c.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5)
  
  const topNegativeContributors = blendedContributors
    .filter(c => c.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5)
  
  // Blend pair premiums
  const allPairDeltas = [
    ...askPairDeltas.map(p => ({ ...p, source: 'ask' })),
    ...clearPairDeltas.map(p => ({ ...p, source: 'clear' }))
  ]
  
  const pairMap = new Map()
  for (const p of allPairDeltas) {
    if (!pairMap.has(p.pair)) {
      pairMap.set(p.pair, { pair: p.pair, askDelta: 0, clearDelta: 0 })
    }
    const entry = pairMap.get(p.pair)
    if (p.source === 'ask') {
      entry.askDelta = p.delta
    } else {
      entry.clearDelta = p.delta
    }
  }
  
  const pairPremiums = Array.from(pairMap.values())
    .map(entry => {
      const blendedDelta = (confAsk * Math.exp(askModel.baseline_log + entry.askDelta) + 
                           confClear * Math.exp(clearModel.baseline_log + entry.clearDelta)) / 
                          (confAsk + confClear + 1e-10) - suggestedXch
      return {
        pair: entry.pair,
        delta: blendedDelta,
        deltaPercent: suggestedXch > 0 ? (blendedDelta / suggestedXch) * 100 : 0
      }
    })
    .filter(p => p.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5)
  
  return {
    suggestedXch,
    suggestedLow,
    suggestedHigh,
    askPredXch,
    clearPredXch,
    confidence: conf,
    confidenceLevel,
    nSalesUsed: clearNSales,
    nListedUsed: askNListed,
    coverage,
    lastSaleAgeDays,
    topContributors: {
      positive: topPositiveContributors,
      negative: topNegativeContributors
    },
    pairPremiums,
    currentListingPrice,
    diffPercent,
    lastSalePrice,
    lastSaleTimestamp
  }
}

// Helper function to compute fair value v2 (market-vibes, no pairs, prior logic)
const computeFairValueV2 = (nftId, valueModel, traits, offersIndex) => {
  if (!valueModel || !traits || !nftId) {
    return null
  }
  
  const askModel = valueModel.models?.ask
  const salesModel = valueModel.models?.sales
  
  if (!askModel || !salesModel) {
    return null
  }
  
  // Build trait keys from traits object
  const traitKeys = []
  for (const [category, trait] of Object.entries(traits)) {
    if (trait) {
      traitKeys.push(`${category}::${trait}`)
    }
  }
  
  // Get prior deltas (v2: only for traits missing in both models)
  const priors = valueModel.priors?.trait_prior_delta_log || {}
  
  // Compute sales prediction
  let salesPredLog = salesModel.baseline_log || 0
  const salesContributors = []
  
  for (const traitKey of traitKeys) {
    const delta = salesModel.trait_delta_log?.[traitKey]
    const hasSales = (salesModel.trait_support?.[traitKey] || 0) >= 1
    const hasAsk = (askModel.trait_support?.[traitKey] || 0) >= 1
    
    // v2: Prior only when BOTH models missing
    const priorTerm = (!hasSales && !hasAsk) ? (priors[traitKey] || 0) : 0
    
    if (delta !== undefined && delta !== null) {
      salesPredLog += delta
      salesContributors.push({ trait: traitKey, delta })
    } else if (priorTerm !== 0) {
      salesPredLog += priorTerm
      salesContributors.push({ trait: traitKey, delta: priorTerm, isPrior: true })
    }
  }
  
  const salesPredXch = Math.exp(salesPredLog)
  
  // Compute ask prediction
  let askPredLog = askModel.baseline_log || 0
  const askContributors = []
  
  for (const traitKey of traitKeys) {
    const delta = askModel.trait_delta_log?.[traitKey]
    const hasSales = (salesModel.trait_support?.[traitKey] || 0) >= 1
    const hasAsk = (askModel.trait_support?.[traitKey] || 0) >= 1
    
    // v2: Prior only when BOTH models missing
    const priorTerm = (!hasSales && !hasAsk) ? (priors[traitKey] || 0) : 0
    
    if (delta !== undefined && delta !== null) {
      askPredLog += delta
      askContributors.push({ trait: traitKey, delta })
    } else if (priorTerm !== 0) {
      askPredLog += priorTerm
      askContributors.push({ trait: traitKey, delta: priorTerm, isPrior: true })
    }
  }
  
  const askPredXch = Math.exp(askPredLog)
  
  // v2: No pair deltas
  
  // Compute prediction ranges
  const askSigma = askModel.sigma || null
  const salesSigma = salesModel.sigma || null
  
  const askLow = askSigma ? Math.exp(askPredLog - 1.0 * askSigma) : null
  const askHigh = askSigma ? Math.exp(askPredLog + 1.0 * askSigma) : null
  const salesLow = salesSigma ? Math.exp(salesPredLog - 1.0 * salesSigma) : null
  const salesHigh = salesSigma ? Math.exp(salesPredLog + 1.0 * salesSigma) : null
  
  // v2: Exact confidence formula
  // For each model (sales/ask):
  const traitsWithSupportSales = traitKeys.filter(tk => (salesModel.trait_support?.[tk] || 0) >= 1).length
  const traitsWithSupportAsk = traitKeys.filter(tk => (askModel.trait_support?.[tk] || 0) >= 1).length
  const totalTraits = traitKeys.length
  
  const coverageSales = totalTraits > 0 ? traitsWithSupportSales / totalTraits : 0
  const coverageAsk = totalTraits > 0 ? traitsWithSupportAsk / totalTraits : 0
  
  // supportSum source: sum(model.trait_support[t] || 0 for t in traitKeys)
  const supportSumSales = traitKeys.reduce((sum, tk) => sum + (salesModel.trait_support?.[tk] || 0), 0)
  const supportSumAsk = traitKeys.reduce((sum, tk) => sum + (askModel.trait_support?.[tk] || 0), 0)
  
  // Base confidence
  const confSales = Math.min(
    sigmoid((supportSumSales - 6) / 6),
    clamp01(coverageSales / 0.7)
  )
  
  const confAsk = Math.min(
    sigmoid((supportSumAsk - 6) / 6),
    clamp01(coverageAsk / 0.7)
  ) * 0.9  // Optional: slight restraint on ask confidence
  
  // v2: Market-vibes blending weights
  const wAsk = confAsk * 1.8
  const wSales = confSales * 0.8
  
  const suggestedXch = (wSales * salesPredXch + wAsk * askPredXch) / (wSales + wAsk + 1e-9)
  
  // Compute suggested range (blend the ranges)
  const suggestedLow = (salesLow && askLow) 
    ? (wSales * salesLow + wAsk * askLow) / (wSales + wAsk + 1e-9)
    : null
  const suggestedHigh = (salesHigh && askHigh)
    ? (wSales * salesHigh + wAsk * askHigh) / (wSales + wAsk + 1e-9)
    : null
  
  // Overall confidence (blended)
  const confidence = (wSales * confSales + wAsk * confAsk) / (wSales + wAsk + 1e-9)
  
  let confidenceLevel = 'LOW'
  if (confidence >= 0.7) confidenceLevel = 'HIGH'
  else if (confidence >= 0.4) confidenceLevel = 'MED'
  
  // Get current listing
  const currentListing = offersIndex?.listings_by_id?.[nftId]?.best_listing
  const currentListingPrice = currentListing?.price_xch || null
  const diffPercent = currentListingPrice && suggestedXch
    ? ((currentListingPrice / suggestedXch - 1) * 100)
    : null
  
  // Get last sale (from sales index if available)
  const salesIndex = DataCache.salesIndexV1
  let lastSalePrice = null
  let lastSaleTimestamp = null
  let lastSaleAgeDays = null
  
  if (salesIndex && salesIndex.events) {
    const nftSales = salesIndex.events
      .filter(e => e.internal_id === nftId && e.is_valid_price)
      .sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0
        return new Date(b.timestamp) - new Date(a.timestamp)
      })
    
    if (nftSales.length > 0) {
      const lastSale = nftSales[0]
      lastSalePrice = lastSale.price_xch
      lastSaleTimestamp = lastSale.timestamp
      if (lastSaleTimestamp) {
        const now = Date.now()
        const saleTime = new Date(lastSaleTimestamp).getTime()
        lastSaleAgeDays = Math.floor((now - saleTime) / (1000 * 60 * 60 * 24))
      }
    }
  }
  
  // v2: Drop-one marginal contributors (per-model, then blend)
  const topPositiveContributors = []
  const topNegativeContributors = []
  
  for (const traitKey of traitKeys) {
    // Sales model contributor
    let contribSalesXch = 0
    if (salesModel.trait_delta_log?.[traitKey] !== undefined) {
      const salesWithoutLog = salesPredLog - (salesModel.trait_delta_log[traitKey] || 0)
      const salesWithoutXch = Math.exp(salesWithoutLog)
      contribSalesXch = salesPredXch - salesWithoutXch
    }
    
    // Ask model contributor
    let contribAskXch = 0
    if (askModel.trait_delta_log?.[traitKey] !== undefined) {
      const askWithoutLog = askPredLog - (askModel.trait_delta_log[traitKey] || 0)
      const askWithoutXch = Math.exp(askWithoutLog)
      contribAskXch = askPredXch - askWithoutXch
    }
    
    // Blend contributors using weights
    const blendedContribXch = (wSales * contribSalesXch + wAsk * contribAskXch) / (wSales + wAsk + 1e-9)
    
    if (blendedContribXch !== 0) {
      const contrib = {
        trait: traitKey,
        delta: blendedContribXch,
        deltaPercent: suggestedXch > 0 ? (blendedContribXch / suggestedXch) * 100 : 0
      }
      
      if (blendedContribXch > 0) {
        topPositiveContributors.push(contrib)
      } else {
        topNegativeContributors.push(contrib)
      }
    }
  }
  
  topPositiveContributors.sort((a, b) => b.delta - a.delta)
  topNegativeContributors.sort((a, b) => a.delta - b.delta)
  
  return {
    suggestedXch,
    suggestedLow,
    suggestedHigh,
    askPredXch,
    salesPredXch, // v2: renamed from clearPredXch
    confidence,
    confidenceLevel,
    nSalesUsed: salesModel.global_stats?.n_obs || 0,
    nListedUsed: askModel.global_stats?.n_obs || 0,
    coverage: `${traitsWithSupportSales + traitsWithSupportAsk}/${totalTraits * 2}`,
    lastSaleAgeDays,
    topContributors: {
      positive: topPositiveContributors.slice(0, 5),
      negative: topNegativeContributors.slice(0, 5)
    },
    pairPremiums: [], // v2: No pair premiums
    currentListingPrice,
    diffPercent,
    lastSalePrice,
    lastSaleTimestamp
  }
}

// Fair Value Panel Component
const FairValuePanel = ({ nftId, traits }) => {
  const [valueModel, setValueModel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [explainExpanded, setExplainExpanded] = useState(false)
  
  // Load value model (v2 with fallback to v1)
  useEffect(() => {
    if (!nftId || !traits) return
    
    const load = async () => {
      setLoading(true)
      try {
        const model = await loadValueModelV2() // Use v2 loader (falls back to v1)
        setValueModel(model)
      } catch (err) {
        console.error('Failed to load value model:', err)
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [nftId, traits])
  
  if (!nftId || !traits) return null
  
  const offersIndex = DataCache.mintgardenOffersIndex
  // Use v2 computation if model is v2, otherwise use v1
  const isV2 = valueModel?.schema_version?.startsWith('2.')
  const fairValue = valueModel 
    ? (isV2 
        ? computeFairValueV2(nftId, valueModel, traits, offersIndex)
        : computeFairValue(nftId, valueModel, traits, offersIndex))
    : null
  
  if (loading) {
    return (
      <fieldset className="bp-fair-value-panel" style={{ marginTop: '12px' }}>
        <legend>Fair Value (Experimental)</legend>
        <div style={{ padding: '8px', fontSize: '11px', textAlign: 'center' }}>
          Loading...
        </div>
      </fieldset>
    )
  }
  
  if (!fairValue) {
    return (
      <fieldset className="bp-fair-value-panel" style={{ marginTop: '12px' }}>
        <legend>Fair Value (Experimental)</legend>
        <div style={{ padding: '8px', fontSize: '11px', color: 'var(--win-text-dim, #808080)' }}>
          Value model not available. Run: <code>npm run build:bigpulp:value-model</code>
        </div>
      </fieldset>
    )
  }
  
  const {
    suggestedXch, suggestedLow, suggestedHigh,
    askPredXch, salesPredXch, clearPredXch, // clearPredXch for v1 compatibility
    confidence, confidenceLevel,
    nSalesUsed, nListedUsed, coverage, lastSaleAgeDays,
    topContributors, pairPremiums,
    currentListingPrice, diffPercent,
    lastSalePrice, lastSaleTimestamp
  } = fairValue
  
  // v2 uses salesPredXch, v1 uses clearPredXch
  const salesOrClearPredXch = salesPredXch !== undefined ? salesPredXch : clearPredXch
  
  return (
    <fieldset className="bp-fair-value-panel" style={{ marginTop: '12px' }}>
      <legend>Fair Value (Experimental)</legend>
      
      {/* Suggested Fair Value */}
      <div className="bp-fv-suggested">
        <div className="bp-fv-label">Suggested:</div>
        <div className="bp-fv-value">
          {suggestedXch.toFixed(2)} XCH
          {suggestedLow && suggestedHigh && (
            <span className="bp-fv-range">
              {' '}(range {suggestedLow.toFixed(2)}–{suggestedHigh.toFixed(2)})
            </span>
          )}
        </div>
        <div className="bp-fv-confidence">
          <span className={`bp-fv-confidence-pill ${confidenceLevel.toLowerCase()}`}>
            {confidenceLevel}
          </span>
          <div className="bp-fv-confidence-bar">
            <div 
              className="bp-fv-confidence-fill" 
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
        {/* Coverage and basis info */}
        <div className="bp-fv-meta">
          Coverage: {coverage} traits supported
          {lastSaleAgeDays !== null && (
            <span> • Last sale: {lastSaleAgeDays}d ago</span>
          )}
        </div>
      </div>
      
      {/* Last Sale (if available for this NFT) */}
      {lastSalePrice && (
        <div className="bp-fv-last-sale">
          Last Sale: {lastSalePrice.toFixed(2)} XCH
          {lastSaleTimestamp && (
            <span className="bp-fv-meta"> ({new Date(lastSaleTimestamp).toLocaleDateString()})</span>
          )}
        </div>
      )}
      
      {/* Market Sales (v2) or Clear (v1) */}
      <div className="bp-fv-breakdown">
        <div>Market {isV2 ? 'Sales' : 'Clear'} (sales-based): {salesOrClearPredXch?.toFixed(2) || 'N/A'} XCH</div>
        <div className="bp-fv-meta">n_sales used: {nSalesUsed}</div>
      </div>
      
      {/* Model Version Display */}
      {valueModel && (
        <div className="bp-fv-meta" style={{ fontSize: '10px', color: 'var(--win-text-dim, #808080)', marginTop: '4px' }}>
          Model: {DataCache.valueModelVersion || valueModel.schema_version || 'v1.0'} | built {valueModel.generated_at ? new Date(valueModel.generated_at).toLocaleDateString() : 'unknown'}
        </div>
      )}
      
      {/* Market Ask */}
      <div className="bp-fv-breakdown">
        <div>Market Ask (listings-based): {askPredXch.toFixed(2)} XCH</div>
        <div className="bp-fv-meta">n_listed used: {nListedUsed}</div>
      </div>
      
      {/* Current Listing (if applicable) */}
      {currentListingPrice && (
        <div className="bp-fv-listing">
          This NFT listed: {currentListingPrice.toFixed(2)} XCH
          <span className="bp-fv-diff">
            {' '}(vs suggested {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
          </span>
        </div>
      )}
      
      {/* Explain Toggle */}
      <button 
        className="bp-btn"
        onClick={() => setExplainExpanded(!explainExpanded)}
        style={{ marginTop: '8px', fontSize: '11px' }}
      >
        {explainExpanded ? 'Hide' : 'Explain'} Breakdown
      </button>
      
      {explainExpanded && (
        <div className="bp-fv-explanation">
          <div className="bp-fv-basis-info">
            <div>Sales used: {nSalesUsed} (last {lastSaleAgeDays || 'N/A'}d)</div>
            <div>Listings used: {nListedUsed} (downweighted)</div>
          </div>
          <div className="bp-fv-top-contributors">
            <div>Top + contributors:</div>
            {topContributors.positive.map(t => (
              <div key={t.trait}>
                {t.trait}: +{t.delta.toFixed(2)} XCH ({t.deltaPercent > 0 ? '+' : ''}{t.deltaPercent.toFixed(1)}%)
              </div>
            ))}
          </div>
          <div className="bp-fv-top-contributors">
            <div>Top - contributors:</div>
            {topContributors.negative.map(t => (
              <div key={t.trait}>
                {t.trait}: {t.delta.toFixed(2)} XCH ({t.deltaPercent.toFixed(1)}%)
              </div>
            ))}
          </div>
          {pairPremiums.length > 0 && (
            <div className="bp-fv-pairs">
              <div>Pair premiums applied:</div>
              {pairPremiums.map(p => (
                <div key={p.pair}>
                  {p.pair}: +{p.delta.toFixed(2)} XCH ({p.deltaPercent > 0 ? '+' : ''}{p.deltaPercent.toFixed(1)}%)
                </div>
              ))}
            </div>
          )}
          <div className="bp-fv-disclaimer">
            Model shrinks small samples toward baseline to reduce manipulation.
          </div>
        </div>
      )}
    </fieldset>
  )
}

const ComboExplorerView = ({ onNftClick, mintGardenMapStats }) => {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invertedIndex, setInvertedIndex] = useState(null)
  const [pairCounts, setPairCounts] = useState(null)
  const [partnerIndex, setPartnerIndex] = useState(null)
  const [traitCatalog, setTraitCatalog] = useState(null)
  
  const [category1, setCategory1] = useState('')
  const [trait1, setTrait1] = useState('')
  const [sort1, setSort1] = useState('rarity') // 'rarity', 'alphabet', 'listed-count'
  const [category2, setCategory2] = useState('')
  const [trait2, setTrait2] = useState('')
  const [sort2, setSort2] = useState('rarity') // 'rarity', 'alphabet', 'listed-count'
  const [category3, setCategory3] = useState('')
  const [trait3, setTrait3] = useState('')
  const [sort3, setSort3] = useState('rarity') // 'rarity', 'alphabet', 'listed-count'
  const [selectedTraits, setSelectedTraits] = useState([]) // array of traitKeys
  
  const [sortBy, setSortBy] = useState('rank') // 'rank', 'id', 'random', 'price-low', 'price-high'
  const [showForSaleOnly, setShowForSaleOnly] = useState(false) // Single source of truth for "Only listed" toggle
  const [matchingIds, setMatchingIds] = useState([])
  const [sortedMatchingIds, setSortedMatchingIds] = useState([])
  
  // Market Map state (shown when Collection Order Book button is clicked)
  const [showMarketMap, setShowMarketMap] = useState(false)
  
  // Market Map state
  const [marketScope, setMarketScope] = useState('selection') // 'selection' | 'collection'
  const [marketScale, setMarketScale] = useState('floor') // 'floor' | 'xch'
  const [marketChartType, setMarketChartType] = useState('heat') // 'heat' | 'depth' | 'hist'
  const [pinnedBand, setPinnedBand] = useState(null) // null | { lo, hi, scale }
  const [marketTooltip, setMarketTooltip] = useState(null) // null | { x, y, text }
  
  // Inspector state
  const [selectedNftId, setSelectedNftId] = useState(null)
  const [hoveredNftId, setHoveredNftId] = useState(null)
  const [inspectorPinned, setInspectorPinned] = useState(false) // default OFF
  const [inspectedNftTraits, setInspectedNftTraits] = useState(null)
  
  // Legacy state for backward compatibility (will be replaced by new state)
  const [activeNftId, setActiveNftId] = useState(null)
  const [activeNftTraits, setActiveNftTraits] = useState(null)
  const [rankMap, setRankMap] = useState(new Map()) // nftId -> rank
  const touchStartRef = useRef(null) // Track touch start for mobile tap detection
  
  // Mobile detection using matchMedia (React-correct, no window.innerWidth in render)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleChange = (e) => setIsMobile(e.matches)
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])
  
  // Price formatting helpers
  const formatPriceXCH = useCallback((price) => {
    if (price < 0.01) {
      return price.toFixed(4)
    }
    return price.toFixed(2)
  }, [])
  
  const formatPriceUSD = useCallback((price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }, [])
  
  // Jump to ID state
  const [jumpToId, setJumpToId] = useState('')
  const jumpToInputRef = useRef(null)
  
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const stored = localStorage.getItem('bigpulp_combo_bookmarks_v1')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  
  const [showFamilyFinder, setShowFamilyFinder] = useState(false)
  
  
  // Category labels for UI
  const categoryLabels = {
    base: 'Base',
    clothes: 'Clothes',
    head: 'Head',
    face: 'Face',
    mouth: 'Mouth',
    facewear: 'Eyes',
    background: 'Background'
  }
  
  // Load core data on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const core = await loadComboExplorerCore()
        setInvertedIndex(core.invertedIndex)
        setPairCounts(core.pairCounts)
        setPartnerIndex(core.partnerIndex)
        setTraitCatalog(core.traitCatalog)
        setLoading(false)
      } catch (err) {
        setError(err.message || String(err))
        setLoading(false)
      }
    }
    init()
  }, [])
  
  // Preload offers index (non-blocking)
  useEffect(() => {
    loadMintGardenOffersIndex().catch(() => {
      // Silently fail - offers index is optional
    })
  }, [])
  
  // Persist bookmarks
  useEffect(() => {
    try {
      localStorage.setItem('bigpulp_combo_bookmarks_v1', JSON.stringify(bookmarks))
    } catch (err) {
      // Ignore
    }
  }, [bookmarks])
  
  // Compute matching IDs when selected traits change
  useEffect(() => {
    if (!invertedIndex || selectedTraits.length === 0) {
      setMatchingIds([])
      return
    }
    
    // Get ID arrays for each selected trait
    const idArrays = selectedTraits.map(traitKey => {
      return invertedIndex.traits[traitKey] || []
    })
    
    if (idArrays.length === 0) {
      setMatchingIds([])
      return
    }
    
    // Intersect arrays (they are sorted ascending)
    let result = idArrays[0]
    for (let i = 1; i < idArrays.length; i++) {
      const arr = idArrays[i]
      const newResult = []
      let j = 0
      let k = 0
      while (j < result.length && k < arr.length) {
        const id1 = parseInt(result[j], 10)
        const id2 = parseInt(arr[k], 10)
        if (id1 === id2) {
          newResult.push(result[j])
          j++
          k++
        } else if (id1 < id2) {
          j++
        } else {
          k++
        }
      }
      result = newResult
    }
    
    setMatchingIds(result)
    
    // Filtering and sorting will be applied in useEffect below
    // Just set initial state here
    setSortedMatchingIds([...result].sort((a, b) => parseInt(a, 10) - parseInt(b, 10)))
  }, [selectedTraits, invertedIndex])
  
  // Load traits for active NFT
  useEffect(() => {
    if (!activeNftId) {
      setActiveNftTraits(null)
      return
    }
    
    const load = async () => {
      const shard = await loadTraitsShardForNftId(activeNftId)
      if (shard && shard.nfts && shard.nfts[activeNftId]) {
        setActiveNftTraits(shard.nfts[activeNftId].traits)
      } else {
        setActiveNftTraits(null)
      }
    }
    load()
  }, [activeNftId])
  
  // Prefetch shards for all matching NFTs and build rank map
  useEffect(() => {
    if (matchingIds.length > 0) {
      const idsToPrefetch = matchingIds.slice(0, Math.min(200, matchingIds.length)) // Prefetch first 200 for performance
      loadTraitsForManyIds(idsToPrefetch).then(() => {
        // Build rank map from loaded shards
        const newRankMap = new Map()
        for (const nftId of idsToPrefetch) {
          const idNum = parseInt(nftId, 10)
          if (isNaN(idNum) || idNum < 1 || idNum > 4200) continue
          const SHARD_SIZE = 100
          const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
          const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
          const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`
          const shard = DataCache.comboTraitsShardCache.get(rangeKey)
          if (shard && shard.nfts && shard.nfts[nftId] && shard.nfts[nftId].rank !== null && shard.nfts[nftId].rank !== undefined) {
            newRankMap.set(nftId, shard.nfts[nftId].rank)
          }
        }
        setRankMap(newRankMap)
        
        // Re-sort if sortBy is 'rank'
        if (sortBy === 'rank') {
          const sorted = [...matchingIds].sort((a, b) => {
            const rankA = newRankMap.get(a) ?? 9999
            const rankB = newRankMap.get(b) ?? 9999
            if (rankA !== rankB) return rankA - rankB
            return parseInt(a, 10) - parseInt(b, 10)
          })
          setSortedMatchingIds(sorted)
        }
      }).catch(() => {
        // Ignore prefetch errors
      })
    }
  }, [matchingIds, sortBy])
  
  // MintGarden offers helpers (defined early so they can be used in useEffect below)
  const getBestListingForId = useCallback((id) => {
    const offersIndex = DataCache.mintgardenOffersIndex
    if (!offersIndex?.listings_by_id) return null
    const idStr = String(id)
    const data = offersIndex.listings_by_id[idStr]
    return data?.best_listing || null
  }, [])
  
  const getAllListingsForId = useCallback((id) => {
    const offersIndex = DataCache.mintgardenOffersIndex
    if (!offersIndex?.listings_by_id) return []
    const idStr = String(id)
    const data = offersIndex.listings_by_id[idStr]
    return data?.listings || []
  }, [])
  
  const getFloorPrice = useCallback(() => {
    const offersIndex = DataCache.mintgardenOffersIndex
    return offersIndex?.floor_xch || null
  }, [])
  
  const getListedCountInResults = useCallback((ids) => {
    return ids.filter(id => getBestListingForId(id) !== null).length
  }, [getBestListingForId])
  
  const getTotalListedCount = useCallback(() => {
    return Object.keys(DataCache.mintgardenOffersIndex?.listings_by_id || {}).length
  }, [])
  
  // Update sorted list when sortBy, showForSaleOnly, pinnedBand, or offers index changes
  useEffect(() => {
    if (matchingIds.length === 0) {
      setSortedMatchingIds([])
      return
    }
    
    // Step 1: Filter by showForSaleOnly if enabled
    let filtered = matchingIds
    if (showForSaleOnly) {
      filtered = matchingIds.filter(id => getBestListingForId(id) !== null)
    }
    
    // Step 1.5: Filter by pinnedBand if active (only when not showing market map)
    if (pinnedBand && !showMarketMap) {
      const floor = getFloorPrice()
      filtered = filtered.filter(id => {
        const listing = getBestListingForId(id)
        if (!listing) return false
        
        if (pinnedBand.scale === 'floor' && floor) {
          const multiple = listing.price_xch / floor
          if (pinnedBand.hi === null) {
            return multiple >= pinnedBand.lo
          }
          return multiple >= pinnedBand.lo && multiple < pinnedBand.hi
        } else {
          if (pinnedBand.hi === null) {
            return listing.price_xch >= pinnedBand.lo
          }
          return listing.price_xch >= pinnedBand.lo && listing.price_xch < pinnedBand.hi
        }
      })
    }
    
    // Step 2: Sort
    let sorted = [...filtered]
    if (sortBy === 'id') {
      sorted.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    } else if (sortBy === 'random') {
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]]
      }
    } else if (sortBy === 'price-low') {
      // Price sort: listed first (sorted by price), then unlisted (stable by rank)
      const listed = sorted.filter(id => getBestListingForId(id) !== null)
      const unlisted = sorted.filter(id => getBestListingForId(id) === null)
      
      listed.sort((a, b) => {
        const listingA = getBestListingForId(a)
        const listingB = getBestListingForId(b)
        if (!listingA) return 1
        if (!listingB) return -1
        if (listingA.price_xch !== listingB.price_xch) {
          return listingA.price_xch - listingB.price_xch
        }
        return parseInt(a, 10) - parseInt(b, 10)
      })
      
      // Sort unlisted by rank (if available) or ID
      unlisted.sort((a, b) => {
        const rankA = rankMap.get(a) ?? 9999
        const rankB = rankMap.get(b) ?? 9999
        if (rankA !== rankB) return rankA - rankB
        return parseInt(a, 10) - parseInt(b, 10)
      })
      
      sorted = [...listed, ...unlisted]
    } else if (sortBy === 'price-high') {
      // Price sort: listed first (sorted by price desc), then unlisted (stable by rank)
      const listed = sorted.filter(id => getBestListingForId(id) !== null)
      const unlisted = sorted.filter(id => getBestListingForId(id) === null)
      
      listed.sort((a, b) => {
        const listingA = getBestListingForId(a)
        const listingB = getBestListingForId(b)
        if (!listingA) return 1
        if (!listingB) return -1
        if (listingA.price_xch !== listingB.price_xch) {
          return listingB.price_xch - listingA.price_xch
        }
        return parseInt(a, 10) - parseInt(b, 10)
      })
      
      // Sort unlisted by rank (if available) or ID
      unlisted.sort((a, b) => {
        const rankA = rankMap.get(a) ?? 9999
        const rankB = rankMap.get(b) ?? 9999
        if (rankA !== rankB) return rankA - rankB
        return parseInt(a, 10) - parseInt(b, 10)
      })
      
      sorted = [...listed, ...unlisted]
    } else if (sortBy === 'rank') {
      // Sort by rank if available, otherwise by ID
      sorted.sort((a, b) => {
        const rankA = rankMap.get(a) ?? 9999
        const rankB = rankMap.get(b) ?? 9999
        if (rankA !== rankB) return rankA - rankB
        return parseInt(a, 10) - parseInt(b, 10)
      })
    }
    
    setSortedMatchingIds(sorted)
  }, [sortBy, matchingIds, rankMap, showForSaleOnly, pinnedBand, showMarketMap, getBestListingForId, getFloorPrice])
  
  // Get intersection count for a trait with already-selected traits
  const getTraitIntersectionCount = useCallback((traitKey, selectedTraitKeys) => {
    if (!invertedIndex || selectedTraitKeys.length === 0) {
      // No selected traits, return global count
      return invertedIndex?.trait_counts?.[traitKey] || 0
    }
    
    // Get ID arrays for all selected traits + the new trait
    const allTraitKeys = [...selectedTraitKeys, traitKey]
    const idArrays = allTraitKeys.map(key => invertedIndex.traits[key] || [])
    
    if (idArrays.length === 0 || idArrays.some(arr => arr.length === 0)) {
      return 0
    }
    
    // Intersect all arrays
    let result = idArrays[0]
    for (let i = 1; i < idArrays.length; i++) {
      const arr = idArrays[i]
      const newResult = []
      let j = 0
      let k = 0
      while (j < result.length && k < arr.length) {
        const id1 = parseInt(result[j], 10)
        const id2 = parseInt(arr[k], 10)
        if (id1 === id2) {
          newResult.push(result[j])
          j++
          k++
        } else if (id1 < id2) {
          j++
        } else {
          k++
        }
      }
      result = newResult
    }
    
    return result.length
  }, [invertedIndex])
  
  // Get traits for a category with sorting and intersection counts
  const getTraitsForCategory = useCallback((category, sortBy = 'rarity', selectedTraitKeys = []) => {
    if (!traitCatalog || !traitCatalog.categories || !category) return []
    let traits = [...(traitCatalog.categories[category] || [])]
    
    // Add intersection counts and listed counts for each trait
    traits = traits.map(t => {
      const traitKey = `${category}::${t.trait}`
      const intersectionCount = getTraitIntersectionCount(traitKey, selectedTraitKeys)
      
      // Calculate listed count (how many NFTs with this trait are currently listed)
      let listedCount = 0
      if (invertedIndex?.traits?.[traitKey]) {
        const traitIds = invertedIndex.traits[traitKey]
        listedCount = traitIds.filter(id => getBestListingForId(id) !== null).length
      }
      
      return {
        ...t,
        intersectionCount,
        listedCount
      }
    })
    
    // Filter out traits with zero intersection count (if there are selected traits)
    // For Trait 1 (no selections yet), show all traits
    if (selectedTraitKeys.length > 0) {
      traits = traits.filter(t => t.intersectionCount > 0)
    }
    
    if (sortBy === 'rarity') {
      // Sort by intersection count (ascending - rarer first)
      return traits.sort((a, b) => {
        if (a.intersectionCount !== b.intersectionCount) {
          return a.intersectionCount - b.intersectionCount
        }
        return a.trait.localeCompare(b.trait)
      })
    } else if (sortBy === 'alphabet') {
      // Sort alphabetically by trait name
      return traits.sort((a, b) => a.trait.localeCompare(b.trait))
    } else if (sortBy === 'listed-count') {
      // Filter out traits with 0 available before sorting
      traits = traits.filter(t => t.listedCount > 0)
      // Sort by listed count (descending - most available first)
      return traits.sort((a, b) => {
        if (a.listedCount !== b.listedCount) {
          return b.listedCount - a.listedCount // Descending
        }
        return a.trait.localeCompare(b.trait) // Secondary sort: alphabetical
      })
    }
    return traits
  }, [traitCatalog, getTraitIntersectionCount, invertedIndex, getBestListingForId])
  
  // Handle category 1 change
  const handleCategory1Change = (newCategory) => {
    setCategory1(newCategory)
    setTrait1('')
    // Clear trait1 when category changes
    updateSelectedTraits(newCategory, '', category2, trait2, category3, trait3)
  }
  
  // Handle trait 1 change
  const handleTrait1Change = (newTrait) => {
    setTrait1(newTrait)
    updateSelectedTraits(category1, newTrait, category2, trait2, category3, trait3)
  }
  
  // Handle category 2 change
  const handleCategory2Change = (newCategory) => {
    setCategory2(newCategory)
    setTrait2('')
    // Clear trait2 when category changes
    updateSelectedTraits(category1, trait1, newCategory, '', category3, trait3)
  }
  
  // Handle trait 2 change
  const handleTrait2Change = (newTrait) => {
    setTrait2(newTrait)
    updateSelectedTraits(category1, trait1, category2, newTrait, category3, trait3)
  }
  
  // Handle category 3 change
  const handleCategory3Change = (newCategory) => {
    setCategory3(newCategory)
    setTrait3('')
    // Clear trait3 when category changes
    updateSelectedTraits(category1, trait1, category2, trait2, newCategory, '')
  }
  
  // Handle trait 3 change
  const handleTrait3Change = (newTrait) => {
    setTrait3(newTrait)
    updateSelectedTraits(category1, trait1, category2, trait2, category3, newTrait)
  }
  
  // Update selected traits based on current dropdown values
  const updateSelectedTraits = (cat1, tr1, cat2, tr2, cat3, tr3) => {
    const newTraits = []
    if (cat1 && tr1) {
      newTraits.push(`${cat1}::${tr1}`)
    }
    if (cat2 && tr2) {
      newTraits.push(`${cat2}::${tr2}`)
    }
    if (cat3 && tr3) {
      newTraits.push(`${cat3}::${tr3}`)
    }
    setSelectedTraits(newTraits)
  }
  
  // Handle remove trait
  const handleRemoveTrait = (traitKey) => {
    const [category, trait] = traitKey.split('::')
    if (category1 === category && trait1 === trait) {
      setCategory1('')
      setTrait1('')
    }
    if (category2 === category && trait2 === trait) {
      setCategory2('')
      setTrait2('')
    }
    if (category3 === category && trait3 === trait) {
      setCategory3('')
      setTrait3('')
    }
    updateSelectedTraits(
      category1 === category && trait1 === trait ? '' : category1,
      category1 === category && trait1 === trait ? '' : trait1,
      category2 === category && trait2 === trait ? '' : category2,
      category2 === category && trait2 === trait ? '' : trait2,
      category3 === category && trait3 === trait ? '' : category3,
      category3 === category && trait3 === trait ? '' : trait3
    )
  }
  
  // Handle clear all
  const handleClear = () => {
    setCategory1('')
    setTrait1('')
    setCategory2('')
    setTrait2('')
    setCategory3('')
    setTrait3('')
    setSelectedTraits([])
    setShowFamilyFinder(false)
    setSelectedNftId(null)
    setHoveredNftId(null)
    setInspectorPinned(false)
  }
  
  // Reset selection when traits change
  useEffect(() => {
    setSelectedNftId(null)
    setHoveredNftId(null)
  }, [selectedTraits])
  
  // Helper to set dropdowns from trait keys
  const setDropdownsFromTraits = (traitKeys) => {
    if (traitKeys.length === 0) {
      setCategory1('')
      setTrait1('')
      setCategory2('')
      setTrait2('')
      setCategory3('')
      setTrait3('')
      return
    }
    if (traitKeys.length >= 1) {
      const [cat1, tr1] = traitKeys[0].split('::')
      setCategory1(cat1)
      setTrait1(tr1)
    }
    if (traitKeys.length >= 2) {
      const [cat2, tr2] = traitKeys[1].split('::')
      setCategory2(cat2)
      setTrait2(tr2)
    }
    if (traitKeys.length >= 3) {
      const [cat3, tr3] = traitKeys[2].split('::')
      setCategory3(cat3)
      setTrait3(tr3)
    }
  }
  
  // Handle show me another
  const handleShowMeAnother = () => {
    if (selectedTraits.length === 0) {
      // Pick random pair from pair_counts (≤25)
      if (!pairCounts || !pairCounts.pairs) return
      const pairs = Object.entries(pairCounts.pairs)
      const filteredPairs = pairs.filter(([_, data]) => data.global <= 25)
      if (filteredPairs.length === 0) return
      const randomPair = filteredPairs[Math.floor(Math.random() * filteredPairs.length)]
      const [traitKey1, traitKey2] = randomPair[0].split('||')
      const newTraits = [traitKey1, traitKey2]
      setSelectedTraits(newTraits)
      setDropdownsFromTraits(newTraits)
    } else if (selectedTraits.length === 1) {
      // Pick random partner from partner_index (≤25)
      if (!partnerIndex || !partnerIndex.partners) return
      const partners = partnerIndex.partners[selectedTraits[0]] || []
      const filteredPartners = partners.filter(p => p.global <= 25)
      if (filteredPartners.length === 0) return
      const randomPartner = filteredPartners[Math.floor(Math.random() * filteredPartners.length)]
      const newTraits = [selectedTraits[0], randomPartner.traitKey]
      setSelectedTraits(newTraits)
      setDropdownsFromTraits(newTraits)
    } else {
      // Pick random NFT from current matches and highlight it
      if (sortedMatchingIds.length === 0) return
      const randomId = sortedMatchingIds[Math.floor(Math.random() * sortedMatchingIds.length)]
      setActiveNftId(randomId)
      // Scroll to it (will be handled by highlight)
    }
  }
  
  // Handle save bookmark
  const handleSaveBookmark = () => {
    if (selectedTraits.length === 0) return
    const newBookmark = {
      id: Date.now().toString(),
      label: selectedTraits.map(t => {
        const [cat, trait] = t.split('::')
        return `${categoryLabels[cat]}: ${trait}`
      }).join(' + '),
      traits: [...selectedTraits],
      createdAt: new Date().toISOString()
    }
    setBookmarks([...bookmarks, newBookmark])
  }
  
  // Handle load bookmark
  const handleLoadBookmark = (bookmark) => {
    setSelectedTraits(bookmark.traits)
    setDropdownsFromTraits(bookmark.traits)
    setShowBookmarks(false)
  }
  
  // Handle remove bookmark
  const handleRemoveBookmark = (bookmarkId) => {
    setBookmarks(bookmarks.filter(b => b.id !== bookmarkId))
  }
  
  // Get count for any number of selected traits
  const getTraitCount = () => {
    if (selectedTraits.length === 0) return null
    
    // For 1 trait, use precomputed count from inverted_index
    if (selectedTraits.length === 1 && invertedIndex) {
      return invertedIndex.trait_counts?.[selectedTraits[0]] || null
    }
    
    // For 2 traits, use precomputed pair_counts (faster)
    if (selectedTraits.length === 2 && pairCounts) {
      const pairKey = generatePairKey(selectedTraits[0], selectedTraits[1])
      return pairCounts.pairs?.[pairKey]?.global || null
    }
    
    // For 3+ traits, use the intersection result count (already computed)
    if (selectedTraits.length >= 3) {
      return sortedMatchingIds.length
    }
    
    return null
  }
  
  // Helper to generate pair key
  const generatePairKey = (traitKey1, traitKey2) => {
    const sorted = [traitKey1, traitKey2].sort()
    return sorted.join('||')
  }
  
  // Get trait display name
  const getTraitDisplayName = (traitKey) => {
    const [category, trait] = traitKey.split('::')
    return `${categoryLabels[category] || category}: ${trait}`
  }
  
  // Derive focused NFT for Inspector (must be before early returns)
  const focusedNftId = useMemo(() => {
    if (inspectorPinned && selectedNftId) {
      return selectedNftId
    }
    return hoveredNftId || selectedNftId || sortedMatchingIds[0] || null
  }, [inspectorPinned, selectedNftId, hoveredNftId, sortedMatchingIds])
  
  // Derive activeNftId for highlighting (row/tile/legend)
  const activeNftIdForHighlight = useMemo(() => {
    // Desktop: hover or selection
    // Mobile: selection only (no hover)
    if (isMobile) {
      return selectedNftId
    }
    return hoveredNftId || selectedNftId
  }, [hoveredNftId, selectedNftId, isMobile])
  
  // Load traits for focused NFT
  useEffect(() => {
    if (!focusedNftId) {
      setInspectedNftTraits(null)
      return
    }
    
    const load = async () => {
      const shard = await loadTraitsShardForNftId(focusedNftId)
      if (shard && shard.nfts && shard.nfts[focusedNftId]) {
        setInspectedNftTraits(shard.nfts[focusedNftId].traits)
      } else {
        setInspectedNftTraits(null)
      }
    }
    load()
  }, [focusedNftId])
  
  // Compute active legend keys for highlighting
  const activeLegendKeys = useMemo(() => {
    const keys = new Set()
    
    // Always highlight selected filter trait categories
    selectedTraits.forEach(traitKey => {
      const [category] = traitKey.split('::')
      // Map facewear to 'Face Wear' for legend
      const legendCategory = category === 'facewear' ? 'Face Wear' : category.charAt(0).toUpperCase() + category.slice(1)
      keys.add(legendCategory)
    })
    
    // Also highlight categories from active NFT
    if (activeNftIdForHighlight && inspectedNftTraits) {
      Object.keys(inspectedNftTraits).forEach(category => {
        if (inspectedNftTraits[category]) {
          // Map facewear to 'Face Wear' for legend
          const legendCategory = category === 'facewear' ? 'Face Wear' : category.charAt(0).toUpperCase() + category.slice(1)
          keys.add(legendCategory)
        }
      })
    }
    
    return Array.from(keys)
  }, [selectedTraits, activeNftIdForHighlight, inspectedNftTraits])
  
  // Pin toggle handler
  const handlePinToggle = () => {
    if (!inspectorPinned && !selectedNftId && hoveredNftId) {
      setSelectedNftId(hoveredNftId)
    }
    setInspectorPinned(!inspectorPinned)
  }
  
  // MintGarden button click handler (with popup blocker fallback)
  const handleMintGardenClick = useCallback(async () => {
    // If map not loaded, try to load it (fallback for edge cases)
    if (!DataCache.mintgardenLauncherMap) {
      try {
        await loadMintGardenLauncherMap()
      } catch (err) {
        showToast('Failed to load MintGarden map', 'error', 3000)
        return
      }
    }
    
    const launcher = DataCache.mintgardenLauncherMap?.[focusedNftId]
    
    // Show warning if partial map
    if (DataCache.mintgardenLauncherMapMeta?.isPartial) {
      showToast('MintGarden map is partial - some links may be missing', 'warning', 3000)
    }
    
    if (launcher) {
      window.open(`https://mintgarden.io/nfts/${launcher}`, '_blank', 'noopener,noreferrer')
    } else {
      showToast(`MintGarden link not found for #${focusedNftId}`, 'warning', 3000)
      const collectionId = DataCache.mintgardenLauncherMapMeta?.collectionId
      if (collectionId) {
        // Open MintGarden collection search page
        const searchQuery = encodeURIComponent(`Wojak #${String(focusedNftId).padStart(4, '0')}`)
        window.open(`https://mintgarden.io/collections/${collectionId}?search=${searchQuery}`, '_blank', 'noopener,noreferrer')
      } else {
        // Fallback: copy to clipboard
        const fallbackText = `wojak #${String(focusedNftId).padStart(4, '0')}`
        navigator.clipboard.writeText(fallbackText).catch(() => {})
      }
    }
  }, [focusedNftId, showToast])
  
  // Jump to ID handler
  const handleJumpToId = useCallback(() => {
    const targetId = jumpToId.trim()
    if (!targetId) return
    
    const idNum = parseInt(targetId, 10)
    if (isNaN(idNum)) return
    
    const targetIdStr = String(idNum)
    if (sortedMatchingIds.includes(targetIdStr)) {
      // Select the NFT (will update Inspector)
      setSelectedNftId(targetIdStr)
      // Clear input
      jumpToInputRef.current?.blur()
      setJumpToId('')
    }
  }, [jumpToId, sortedMatchingIds])
  
  // Calculate trait count for display
  const traitCount = getTraitCount()
  
  // Limit displayed IDs for preview (show first 100 for performance)
  const displayedIds = sortedMatchingIds.slice(0, 100)
  
  // Market Map data computation
  const marketData = useMemo(() => {
    const offersIndex = DataCache.mintgardenOffersIndex
    if (!offersIndex) return null
    
    // Determine scope
    const scopeIds = marketScope === 'selection' ? matchingIds : null // null means all collection
    const listedIds = scopeIds 
      ? scopeIds.filter(id => getBestListingForId(id) !== null)
      : Object.keys(offersIndex.listings_by_id || {})
    
    if (listedIds.length === 0) return null
    
    // Get prices
    const prices = listedIds
      .map(id => {
        const listing = getBestListingForId(id)
        return listing?.price_xch
      })
      .filter(p => p != null)
    
    if (prices.length === 0) return null
    
    // Get floor
    const floor = offersIndex.market_stats?.floor_xch || 
                  (prices.length > 0 ? Math.min(...prices) : null)
    
    // Get market stats (use precomputed if available and scope is collection)
    const usePrecomputed = marketScope === 'collection' && offersIndex.market_stats
    
    return {
      listedIds,
      prices,
      floor,
      usePrecomputed,
      marketStats: offersIndex.market_stats,
      offersIndex
    }
  }, [marketScope, matchingIds, getBestListingForId])
  
  // Compute bins based on scale and chart type
  const marketBins = useMemo(() => {
    if (!marketData) return []
    
    const { prices, floor, usePrecomputed, marketStats } = marketData
    
    if (marketScale === 'floor' && floor) {
      if (usePrecomputed && marketStats?.bins_floor_multiple) {
        return marketStats.bins_floor_multiple
      }
      // Compute floor-multiple bins
      const bins = [
        { lo: 1.0, hi: 1.1 },
        { lo: 1.1, hi: 1.25 },
        { lo: 1.25, hi: 1.5 },
        { lo: 1.5, hi: 2.0 },
        { lo: 2.0, hi: 3.0 },
        { lo: 3.0, hi: 5.0 },
        { lo: 5.0, hi: 10.0 },
        { lo: 10.0, hi: null }
      ]
      return bins.map(bin => {
        const count = prices.filter(p => {
          const multiple = p / floor
          if (bin.hi === null) return multiple >= bin.lo
          return multiple >= bin.lo && multiple < bin.hi
        }).length
        return { ...bin, count }
      }).filter(b => b.count > 0)
    } else {
      // XCH bins
      if (usePrecomputed) {
        if (marketChartType === 'hist' && marketStats?.bins_xch_fine) {
          return marketStats.bins_xch_fine
        }
        if (marketStats?.bins_xch_coarse) {
          return marketStats.bins_xch_coarse
        }
      }
      // Compute XCH bins
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const binCount = marketChartType === 'hist' ? 16 : 8
      const range = max - min
      if (range <= 0) return [{ lo: min, hi: max, count: prices.length }]
      
      const step = range / binCount
      const bins = []
      for (let i = 0; i < binCount; i++) {
        const lo = min + (i * step)
        const hi = i === binCount - 1 ? max : min + ((i + 1) * step)
        const count = prices.filter(p => {
          if (i === binCount - 1) return p >= lo && p <= hi
          return p >= lo && p < hi
        }).length
        if (count > 0) {
          bins.push({ lo: parseFloat(lo.toFixed(6)), hi: parseFloat(hi.toFixed(6)), count })
        }
      }
      return bins
    }
  }, [marketData, marketScale, marketChartType])
  
  // Compute depth points (selection scope only, cap at 300)
  const marketDepthPoints = useMemo(() => {
    if (!marketData || marketScope !== 'selection' || marketChartType !== 'depth') return []
    
    const { listedIds, offersIndex } = marketData
    const listings = listedIds
      .map(id => getBestListingForId(id))
      .filter(Boolean)
      .sort((a, b) => a.price_xch - b.price_xch)
    
    // Downsample if needed
    let points = listings
    if (listings.length > 300) {
      const step = Math.ceil(listings.length / 300)
      points = []
      for (let i = 0; i < listings.length; i += step) {
        points.push(listings[i])
      }
      if (points[points.length - 1] !== listings[listings.length - 1]) {
        points.push(listings[listings.length - 1])
      }
    }
    
    let cumCount = 0
    let cumValue = 0
    return points.map(listing => {
      cumCount++
      cumValue += listing.price_xch
      return {
        price_xch: listing.price_xch,
        cum_count: cumCount,
        cum_value_xch: cumValue
      }
    })
  }, [marketData, marketScope, marketChartType, getBestListingForId])
  
  // Cheapest listings in scope
  const cheapestListings = useMemo(() => {
    if (!marketData) return []
    const { listedIds } = marketData
    return listedIds
      .map(id => ({
        id,
        listing: getBestListingForId(id)
      }))
      .filter(item => item.listing)
      .sort((a, b) => a.listing.price_xch - b.listing.price_xch)
      .slice(0, isMobile ? 5 : 10)
  }, [marketData, getBestListingForId, isMobile])
  
  return (
    <div className="bp-combo-explorer">
      {/* Control Panel */}
      <fieldset className="bp-combo-controls-panel" style={showMarketMap ? { position: 'static' } : {}}>
        <legend>Combo Explorer Controls</legend>
        
        {/* Trait Selection - Vertical Stack Layout - Hide when market map is shown */}
        {!showMarketMap && (
        <div className="bp-trait-selection-vertical">
          {/* Category 1 + Trait 1 */}
          <div className="bp-trait-group">
            <label className="bp-trait-label">Category 1:</label>
            <select
              value={category1}
              onChange={(e) => handleCategory1Change(e.target.value)}
              className="bp-select"
            >
              <option value="">-- Select --</option>
              {Object.entries(categoryLabels).map(([key, label]) => {
                // Disable if already selected in Category 2 or 3
                const isDisabled = (category2 && category2 === key) || (category3 && category3 === key)
                return (
                  <option key={key} value={key} disabled={isDisabled}>
                    {label}{isDisabled ? ' (already selected)' : ''}
                  </option>
                )
              })}
            </select>
            {category1 && (
              <button
                onClick={() => {
                  setCategory1('')
                  setTrait1('')
                  updateSelectedTraits('', '', category2, trait2, category3, trait3)
                }}
                className="bp-btn bp-close-btn"
                title="Clear Category 1"
              >
                ×
              </button>
            )}
            {category1 && (
              <>
                <label className="bp-trait-label">Trait 1:</label>
                <select
                  value={trait1}
                  onChange={(e) => handleTrait1Change(e.target.value)}
                  className="bp-select"
                >
                  <option value="">-- Select --</option>
                  {getTraitsForCategory(category1, sort1, []).map(t => {
                    const hasOffersIndex = DataCache.mintgardenOffersIndex !== null
                    let displayText
                    if (sort1 === 'listed-count' && hasOffersIndex) {
                      // When sorting by available, only show available count
                      displayText = `${t.trait} (${t.listedCount || 0} available)`
                    } else if (sort1 === 'rarity' && hasOffersIndex) {
                      // When sorting by supply, only show total count (not available)
                      displayText = `${t.trait} (${t.count})`
                    } else if (hasOffersIndex) {
                      // When not sorting by available or supply, show both total and available
                      displayText = `${t.trait} (${t.count} total, ${t.listedCount || 0} available)`
                    } else {
                      // When offers index not available, show only count
                      displayText = `${t.trait} (${t.count})`
                    }
                    return (
                      <option key={t.trait} value={t.trait}>
                        {displayText}
                      </option>
                    )
                  })}
                </select>
                <select
                  value={sort1}
                  onChange={(e) => setSort1(e.target.value)}
                  className="bp-select bp-sort-select"
                  title="Sort traits"
                >
                  <option value="rarity">By Supply</option>
                  <option value="alphabet">By Alphabet</option>
                  <option value="listed-count">By Current Offers</option>
                </select>
              </>
            )}
          </div>
          
          {/* Category 2 + Trait 2 */}
          <div className="bp-trait-group">
            <label className="bp-trait-label">Category 2:</label>
            <select
              value={category2}
              onChange={(e) => handleCategory2Change(e.target.value)}
              className="bp-select"
            >
              <option value="">-- Select --</option>
              {Object.entries(categoryLabels).map(([key, label]) => {
                // Disable if already selected in Category 1 or 3
                const isDisabled = (category1 && category1 === key) || (category3 && category3 === key)
                return (
                  <option key={key} value={key} disabled={isDisabled}>
                    {label}{isDisabled ? ' (already selected)' : ''}
                  </option>
                )
              })}
            </select>
            {category2 && (
              <button
                onClick={() => {
                  setCategory2('')
                  setTrait2('')
                  updateSelectedTraits(category1, trait1, '', '', category3, trait3)
                }}
                className="bp-btn bp-close-btn"
                title="Clear Category 2"
              >
                ×
              </button>
            )}
            {category2 && (
              <>
                <label className="bp-trait-label">Trait 2:</label>
                <select
                  value={trait2}
                  onChange={(e) => handleTrait2Change(e.target.value)}
                  className="bp-select"
                >
                  <option value="">-- Select --</option>
                  {getTraitsForCategory(category2, sort2, category1 && trait1 ? [`${category1}::${trait1}`] : []).map(t => {
                    const hasOffersIndex = DataCache.mintgardenOffersIndex !== null
                    let displayText
                    if (sort2 === 'listed-count' && hasOffersIndex) {
                      displayText = `${t.trait} (${t.listedCount || 0} available)`
                    } else if (sort2 === 'rarity' && hasOffersIndex) {
                      // When sorting by supply, only show total count (not available)
                      displayText = `${t.trait} (${t.intersectionCount})`
                    } else if (hasOffersIndex) {
                      displayText = `${t.trait} (${t.intersectionCount} total, ${t.listedCount || 0} available)`
                    } else {
                      displayText = `${t.trait} (${t.intersectionCount})`
                    }
                    return (
                      <option key={t.trait} value={t.trait}>
                        {displayText}
                      </option>
                    )
                  })}
                </select>
                <select
                  value={sort2}
                  onChange={(e) => setSort2(e.target.value)}
                  className="bp-select bp-sort-select"
                  title="Sort traits"
                >
                  <option value="rarity">By Supply</option>
                  <option value="alphabet">By Alphabet</option>
                  <option value="listed-count">By Current Offers</option>
                </select>
              </>
            )}
          </div>
          
          {/* Category 3 + Trait 3 (Optional) */}
          <div className="bp-trait-group">
            <label className="bp-trait-label">Category 3:</label>
            <select
              value={category3}
              onChange={(e) => handleCategory3Change(e.target.value)}
              className="bp-select"
            >
              <option value="">-- Optional --</option>
              {Object.entries(categoryLabels).map(([key, label]) => {
                // Disable if already selected in Category 1 or 2
                const isDisabled = (category1 && category1 === key) || (category2 && category2 === key)
                return (
                  <option key={key} value={key} disabled={isDisabled}>
                    {label}{isDisabled ? ' (already selected)' : ''}
                  </option>
                )
              })}
            </select>
            {category3 && (
              <button
                onClick={() => {
                  setCategory3('')
                  setTrait3('')
                  updateSelectedTraits(category1, trait1, category2, trait2, '', '')
                }}
                className="bp-btn bp-close-btn"
                title="Clear Category 3"
              >
                ×
              </button>
            )}
            {category3 && (
              <>
                <label className="bp-trait-label">Trait 3:</label>
                <select
                  value={trait3}
                  onChange={(e) => handleTrait3Change(e.target.value)}
                  className="bp-select"
                >
                  <option value="">-- Select --</option>
                  {getTraitsForCategory(category3, sort3, [
                    ...(category1 && trait1 ? [`${category1}::${trait1}`] : []),
                    ...(category2 && trait2 ? [`${category2}::${trait2}`] : [])
                  ]).map(t => {
                    const hasOffersIndex = DataCache.mintgardenOffersIndex !== null
                    let displayText
                    if (sort3 === 'listed-count' && hasOffersIndex) {
                      displayText = `${t.trait} (${t.listedCount || 0} available)`
                    } else if (sort3 === 'rarity' && hasOffersIndex) {
                      // When sorting by supply, only show total count (not available)
                      displayText = `${t.trait} (${t.intersectionCount})`
                    } else if (hasOffersIndex) {
                      displayText = `${t.trait} (${t.intersectionCount} total, ${t.listedCount || 0} available)`
                    } else {
                      displayText = `${t.trait} (${t.intersectionCount})`
                    }
                    return (
                      <option key={t.trait} value={t.trait}>
                        {displayText}
                      </option>
                    )
                  })}
                </select>
                <select
                  value={sort3}
                  onChange={(e) => setSort3(e.target.value)}
                  className="bp-select bp-sort-select"
                  title="Sort traits"
                >
                  <option value="rarity">By Supply</option>
                  <option value="alphabet">By Alphabet</option>
                  <option value="listed-count">By Current Offers</option>
                </select>
              </>
            )}
          </div>
        </div>
        )}
        
        {/* Selected Traits Chips - Hide when market map is shown */}
        {!showMarketMap && selectedTraits.length > 0 && (
          <div className="bp-selected-traits">
            {selectedTraits.map(traitKey => (
              <div key={traitKey} className="bp-filter-chip">
                <span>{getTraitDisplayName(traitKey)}</span>
                <button
                  onClick={() => handleRemoveTrait(traitKey)}
                  className="bp-filter-chip-remove"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Buttons - Hide when market map is shown */}
        {!showMarketMap && (
          <div className="bp-combo-buttons">
            <button onClick={handleClear} className="bp-btn">
              Clear
            </button>
            <label style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="checkbox"
                checked={showForSaleOnly}
                onChange={(e) => setShowForSaleOnly(e.target.checked)}
              />
              For sale only
            </label>
          </div>
        )}
        
        {/* Collection Stats Section - Hide when market map is shown */}
        {!showMarketMap && (
          <div className="bp-collection-stats-section" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--win-border-dark, #808080)' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Collection Stats:</span>
              <button
                className="bp-btn"
                onClick={() => setShowMarketMap(true)}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ fontSize: '11px' }}
              >
                Collection Order Book
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Display - Show when market map is shown */}
        {showMarketMap && (
          <div className="bp-market-map-stats" style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            background: 'var(--win-surface, #c0c0c0)',
            border: '2px inset var(--win-border-dark, #808080)',
            fontSize: '11px'
          }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Total Supply: </span>
                <span>4,200</span>
              </div>
              <div>
                <span style={{ fontWeight: 'bold' }}>Rarest Base Type: </span>
                <span>Alien Waifu / Alien Baddie (35 each, 0.83%)</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Trait Count Display (any number of traits) */}
        {selectedTraits.length > 0 && traitCount !== null && (
          <div className={`bp-pair-count ${selectedTraits.length === 2 && traitCount <= 25 ? 'bp-pair-count-rare' : ''}`}>
            Global count: {traitCount}
          </div>
        )}
        
      </fieldset>
      
      {/* Market Map View */}
      {showMarketMap && (
        <div className="bp-market-map-view">
          {!DataCache.mintgardenOffersIndex ? (
            <div className="bp-loading" style={{ padding: '40px', textAlign: 'center' }}>
              Loading listings...
            </div>
          ) : !marketData ? (
            <div className="bp-no-results" style={{ padding: '40px', textAlign: 'center' }}>
              No listings available
            </div>
          ) : (
            <div className={`bp-market-map-layout ${isMobile ? 'mobile' : 'desktop'}`}>
              {/* Left: Chart Panel */}
              <div className="bp-market-chart-panel">
                <fieldset className="bp-market-controls">
                  <legend>
                    Market Map
                    <button
                      className="bp-btn"
                      onClick={() => setShowMarketMap(false)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{ 
                        float: 'right', 
                        fontSize: '10px', 
                        padding: '2px 6px',
                        marginLeft: '8px'
                      }}
                      title="Back to Results"
                    >
                      ← Back
                    </button>
                  </legend>
                  
                  {/* Scope Toggle */}
                  <div className="bp-market-toggle-group">
                    <label>Scope:</label>
                    <div className="bp-radio-group">
                      <label>
                        <input
                          type="radio"
                          name="market-scope"
                          value="selection"
                          checked={marketScope === 'selection'}
                          onChange={(e) => setMarketScope(e.target.value)}
                        />
                        Selection ({marketData.listedIds.length} listed)
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="market-scope"
                          value="collection"
                          checked={marketScope === 'collection'}
                          onChange={(e) => setMarketScope(e.target.value)}
                        />
                        Collection ({marketData.marketStats?.listed_count || marketData.listedIds.length} listed)
                      </label>
                    </div>
                  </div>
                  
                  {/* Scale Toggle */}
                  <div className="bp-market-toggle-group">
                    <label>Scale:</label>
                    <div className="bp-radio-group">
                      <label>
                        <input
                          type="radio"
                          name="market-scale"
                          value="floor"
                          checked={marketScale === 'floor'}
                          onChange={(e) => setMarketScale(e.target.value)}
                        />
                        Floor Multiple
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="market-scale"
                          value="xch"
                          checked={marketScale === 'xch'}
                          onChange={(e) => setMarketScale(e.target.value)}
                        />
                        XCH
                      </label>
                    </div>
                  </div>
                  
                  {/* Chart Type Tabs */}
                  <div className="bp-market-chart-tabs">
                    <button
                      className={`bp-market-chart-tab ${marketChartType === 'heat' ? 'active' : ''}`}
                      onClick={() => setMarketChartType('heat')}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Heatmap
                    </button>
                    <button
                      className={`bp-market-chart-tab ${marketChartType === 'depth' ? 'active' : ''}`}
                      onClick={() => setMarketChartType('depth')}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={marketScope === 'collection'}
                      title={marketScope === 'collection' ? 'Depth chart only available for selection scope' : ''}
                    >
                      Depth
                    </button>
                    <button
                      className={`bp-market-chart-tab ${marketChartType === 'hist' ? 'active' : ''}`}
                      onClick={() => setMarketChartType('hist')}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Histogram
                    </button>
                  </div>
                  
                  {/* Pinned Band */}
                  {pinnedBand && (
                    <div className="bp-pinned-band-pill">
                      <span>
                        Pinned: {pinnedBand.lo}{pinnedBand.scale === 'floor' ? '×' : ' XCH'}–{pinnedBand.hi || '∞'}{pinnedBand.scale === 'floor' ? '×' : ' XCH'}
                      </span>
                      <button
                        className="bp-btn bp-close-btn"
                        onClick={() => setPinnedBand(null)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {/* Chart */}
                  <div className="bp-market-chart-container">
                    {marketChartType === 'heat' && marketBins.length > 0 && (
                      <BpHeatmapBands
                        bins={marketBins}
                        scale={marketScale}
                        floor={marketData.floor}
                        pinnedBand={pinnedBand}
                        onBandClick={(bin) => {
                          if (pinnedBand && pinnedBand.lo === bin.lo && pinnedBand.hi === bin.hi) {
                            setPinnedBand(null)
                          } else {
                            setPinnedBand({ lo: bin.lo, hi: bin.hi, scale: marketScale })
                          }
                        }}
                        onBandHover={(bin, event) => {
                          if (!bin) {
                            setMarketTooltip(null)
                            return
                          }
                          const avgPrice = marketData.prices
                            .filter(p => {
                              if (marketScale === 'floor' && marketData.floor) {
                                const multiple = p / marketData.floor
                                if (bin.hi === null) return multiple >= bin.lo
                                return multiple >= bin.lo && multiple < bin.hi
                              } else {
                                if (bin.hi === null) return p >= bin.lo
                                return p >= bin.lo && p < bin.hi
                              }
                            })
                            .reduce((sum, p) => sum + p, 0) / bin.count
                          
                          setMarketTooltip({
                            x: event.clientX,
                            y: event.clientY,
                            text: `Band ${bin.lo}${bin.hi === null ? '+' : `–${bin.hi}`}${marketScale === 'floor' ? '× floor' : ' XCH'} • ${bin.count} listed • avg ${marketScale === 'floor' && marketData.floor ? (avgPrice / marketData.floor).toFixed(2) + '×' : avgPrice.toFixed(2) + ' XCH'}`
                          })
                        }}
                      />
                    )}
                    {marketChartType === 'depth' && marketDepthPoints.length > 0 && (
                      <BpDepthChart points={marketDepthPoints} />
                    )}
                    {marketChartType === 'hist' && marketBins.length > 0 && (
                      <BpHistogram bins={marketBins} scale={marketScale} floor={marketData.floor} />
                    )}
                  </div>
                  
                  {/* Tooltip */}
                  {marketTooltip && (
                    <div
                      className="bp-market-tooltip"
                      style={{
                        position: 'fixed',
                        left: `${marketTooltip.x + 10}px`,
                        top: `${marketTooltip.y + 10}px`,
                        zIndex: 10000
                      }}
                    >
                      {marketTooltip.text}
                    </div>
                  )}
                </fieldset>
              </div>
              
              {/* Right: Summary + Cheapest List (Desktop) or Stacked (Mobile) */}
              <div className="bp-market-sidebar">
                {/* Ask Wall Summary */}
                <div className="bp-ask-wall-summary">
                  <fieldset>
                    <legend>Ask Wall Summary</legend>
                    <div className="bp-summary-stats">
                      <div className="bp-summary-stat">
                        <span className="bp-summary-label">Listed:</span>
                        <span className="bp-summary-value">{marketData.marketStats?.listed_count || marketData.listedIds.length}</span>
                      </div>
                      {marketData.floor && (
                        <>
                          <div className="bp-summary-stat">
                            <span className="bp-summary-label">Floor:</span>
                            <span className="bp-summary-value">{formatPriceXCH(marketData.floor)} XCH</span>
                          </div>
                          {marketData.marketStats?.median_xch && (
                            <div className="bp-summary-stat">
                              <span className="bp-summary-label">Median:</span>
                              <span className="bp-summary-value">{formatPriceXCH(marketData.marketStats.median_xch)} XCH</span>
                            </div>
                          )}
                          {marketData.marketStats?.p90_xch && (
                            <div className="bp-summary-stat">
                              <span className="bp-summary-label">P90:</span>
                              <span className="bp-summary-value">{formatPriceXCH(marketData.marketStats.p90_xch)} XCH</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="bp-summary-stat">
                        <span className="bp-summary-label">Updated:</span>
                        <span className="bp-summary-value" style={{ fontSize: '10px' }}>
                          {new Date(marketData.offersIndex.generated_at || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </fieldset>
                </div>
                
                {/* Cheapest Listings */}
                <div className="bp-cheapest-list">
                  <fieldset>
                    <legend>Cheapest Listings {marketScope === 'selection' ? '(in selection)' : '(in collection)'}</legend>
                    {cheapestListings.length === 0 ? (
                      <div style={{ padding: '8px', fontSize: '11px', color: 'var(--text-2, #808080)' }}>
                        No listings in scope
                      </div>
                    ) : (
                      <div className="bp-cheapest-list-items">
                        {cheapestListings.map((item, idx) => {
                          const launcher = DataCache.mintgardenLauncherMap?.[item.id]
                          return (
                            <div
                              key={item.id}
                              className="bp-cheapest-list-item"
                              onClick={() => setSelectedNftId(item.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="bp-cheapest-list-id">#{item.id}</span>
                              <span className="bp-cheapest-list-price">{formatPriceXCH(item.listing.price_xch)} XCH</span>
                              {launcher && (
                                <button
                                  className="bp-btn bp-cheapest-list-mg-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(`https://mintgarden.io/nfts/${launcher}`, '_blank', 'noopener,noreferrer')
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  title="Open on MintGarden"
                                >
                                  <img src="/icon/icons1/icon_MG.png" alt="MintGarden" className="bp-mg-icon" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </fieldset>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Results */}
      {!showMarketMap && (
        <>
          {selectedTraits.length === 0 && (
            <div className="bp-combo-welcome">
              <div className="bp-combo-welcome-icon">🍊</div>
              <div className="bp-combo-welcome-text">
                Pick any traits above to find all NFTs that contain them.
                <br />
                Try "Wizard Drip" + "Wizard Hat" or "Roman Drip" + "Centurion"!
              </div>
            </div>
          )}
          
          {sortedMatchingIds.length === 0 && selectedTraits.length > 0 && (
            <div className="bp-no-results">
              No NFTs found matching selected traits.
            </div>
          )}
          
          {sortedMatchingIds.length > 0 && (
        <div className="bp-combo-results">
          {/* MintGarden map stats */}
          {mintGardenMapStats && (() => {
            const percentage = Math.round((mintGardenMapStats.count / mintGardenMapStats.total) * 100)
            const dateStr = mintGardenMapStats.generatedAt 
              ? new Date(mintGardenMapStats.generatedAt).toLocaleDateString()
              : null
            
            return (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                background: mintGardenMapStats.isPartial ? '#fff9c4' : '#e8f4f8',
                border: '2px inset var(--border-dark, #808080)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold' }}>🔗 MintGarden:</span>
                  <span>{mintGardenMapStats.count.toLocaleString()} / {mintGardenMapStats.total.toLocaleString()} mapped ({percentage}%)</span>
                  {mintGardenMapStats.isPartial && (
                    <span style={{ color: '#cc6600', fontWeight: 'bold' }}>⚠ Partial</span>
                  )}
                </div>
                {dateStr && (
                  <span style={{ color: '#808080', fontSize: '10px' }}>Updated: {dateStr}</span>
                )}
              </div>
            )
          })()}
          <div className="bp-results-header">
            <div className="bp-results-count">
              Results: {sortedMatchingIds.length} ({getListedCountInResults(sortedMatchingIds)} listed)
              {(() => {
                const cheapest = sortedMatchingIds
                  .map(id => getBestListingForId(id))
                  .filter(Boolean)
                  .sort((a, b) => a.price_xch - b.price_xch)[0]
                return cheapest ? (
                  <span className="bp-results-cheapest">
                    {' '}• Cheapest: {formatPriceXCH(cheapest.price_xch)} XCH
                  </span>
                ) : null
              })()}
              <label style={{ marginLeft: '12px' }}>
                <input
                  type="checkbox"
                  checked={showForSaleOnly}
                  onChange={(e) => setShowForSaleOnly(e.target.checked)}
                />
                {' '}Only listed
              </label>
            </div>
            <div className="bp-results-header-right">
              {sortedMatchingIds.length > 80 && (
                <div className="bp-jump-to-input">
                  <label htmlFor="jump-to-id-input">Jump to:</label>
                  <input
                    id="jump-to-id-input"
                    ref={jumpToInputRef}
                    type="text"
                    value={jumpToId}
                    onChange={(e) => setJumpToId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleJumpToId()
                      }
                    }}
                    placeholder="ID"
                    className="bp-jump-to-input-field"
                  />
                  <button onClick={handleJumpToId} className="bp-btn">Go</button>
                </div>
              )}
              <div className="bp-sort-controls">
                <label>Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bp-select"
                >
                  <option value="rank">Rank</option>
                  <option value="id">ID</option>
                  <option value="random">Random</option>
                  <option value="price-low">Price (low→high)</option>
                  <option value="price-high">Price (high→low)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className={`bp-combo-results-wrapper ${isMobile ? 'bp-mobile-layout' : 'bp-desktop-layout'}`}>
            {/* Inspector Panel */}
            {focusedNftId && (
              <div className="bp-inspector">
                <div className="bp-inspector-header">
                  <div className="bp-inspector-title">
                    Inspector{inspectorPinned ? ' (Pinned)' : ''}
                  </div>
                  <button
                    onClick={handlePinToggle}
                    className="bp-inspector-pin-btn"
                    title={inspectorPinned ? 'Unpin Inspector' : 'Pin Inspector'}
                  >
                    {inspectorPinned ? '📌 Pinned' : '📌 Pin'}
                  </button>
                </div>
                <div className="bp-inspector-content">
                  <div className="bp-inspector-preview">
                    {(() => {
                      // Get image URL
                      let imageUrl = null
                      const idNum = parseInt(focusedNftId, 10)
                      if (!isNaN(idNum) && idNum >= 1 && idNum <= 4200) {
                        const SHARD_SIZE = 100
                        const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
                        const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
                        const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`
                        const shard = DataCache.comboTraitsShardCache.get(rangeKey)
                        if (shard && shard.nfts && shard.nfts[focusedNftId]) {
                          imageUrl = shard.nfts[focusedNftId].image
                        }
                      }
                      if (!imageUrl) {
                        imageUrl = getNftImageUrl(focusedNftId)
                      }
                      
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`NFT #${focusedNftId}`}
                          className="bp-inspector-image"
                          onClick={() => onNftClick(focusedNftId)}
                          style={{ cursor: 'pointer' }}
                        />
                      ) : (
                        <div className="bp-inspector-image-placeholder">Loading...</div>
                      )
                    })()}
                  </div>
                  <div className="bp-inspector-meta">
                    <div className="bp-inspector-meta-columns">
                      <div className="bp-inspector-meta-left">
                        <div className="bp-inspector-meta-title">NFT #{focusedNftId}</div>
                        {rankMap.has(focusedNftId) && (
                          <div className="bp-inspector-meta-rank">Rank: #{rankMap.get(focusedNftId)}</div>
                        )}
                        {inspectedNftTraits && (
                          <div className="bp-inspector-meta-traits">
                            {Object.entries(inspectedNftTraits).map(([category, trait]) => (
                              trait && (
                                <div key={category} className="bp-inspector-meta-trait">
                                  <strong>{categoryLabels[category] || category}:</strong> {trait}
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bp-inspector-meta-right">
                        {(() => {
                          const listing = getBestListingForId(focusedNftId)
                          const floor = getFloorPrice()
                          const pctVsFloor = listing && floor ? ((listing.price_xch / floor - 1) * 100).toFixed(1) : null
                          const launcher = DataCache.mintgardenLauncherMap?.[focusedNftId]
                          
                          return (
                            <>
                              {listing ? (
                                <>
                                  <div style={{ marginBottom: '8px' }}>
                                    <strong>Listed on MintGarden:</strong> {formatPriceXCH(listing.price_xch)} XCH
                                    {listing.price_usd && ` (${formatPriceUSD(listing.price_usd)})`}
                                  </div>
                                  {floor && (
                                    <>
                                      <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                                        MintGarden floor (XCH): {formatPriceXCH(floor)} XCH
                                        {xchUsdFallback && (
                                          ` (~${formatPriceUSD(floor * xchUsdFallback)})`
                                        )}
                                      </div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-2, #808080)', marginBottom: '8px' }}>
                                        Updated: {new Date(DataCache.mintgardenOffersIndex?.generated_at || Date.now()).toLocaleString()}
                                      </div>
                                      {pctVsFloor && (
                                        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                                          This: {formatPriceXCH(listing.price_xch)} XCH
                                          {` (${parseFloat(pctVsFloor) > 0 ? '+' : ''}${pctVsFloor}% vs floor)`}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-2, #808080)' }}>
                                  Not listed on MintGarden
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => onNftClick(focusedNftId)}
                        className="bp-btn bp-inspector-open-btn bp-inspector-open-btn-small"
                      >
                        Open in Rarity Explorer
                      </button>
                      {(() => {
                        const listing = getBestListingForId(focusedNftId)
                        const launcher = DataCache.mintgardenLauncherMap?.[focusedNftId]
                        return (
                          <>
                            {listing && launcher && (
                              <button
                                onClick={() => window.open(`https://mintgarden.io/nfts/${launcher}`, '_blank', 'noopener,noreferrer')}
                                className="bp-btn bp-inspector-open-btn bp-inspector-open-btn-small"
                                title="Buy on MintGarden"
                              >
                                <img src="/icon/icons1/icon_MG.png" alt="MintGarden" className="bp-mg-icon" />
                              </button>
                            )}
                            <button
                              onClick={handleMintGardenClick}
                              className="bp-btn bp-inspector-open-btn bp-inspector-open-btn-small"
                              disabled={!!DataCache.loadingPromises.mintgardenLauncherMap}
                              title={
                                DataCache.loadingPromises.mintgardenLauncherMap
                                  ? 'Loading MintGarden map...'
                                  : !DataCache.loaded.mintgardenLauncherMap
                                  ? 'Click to load MintGarden map'
                                  : !DataCache.mintgardenLauncherMap
                                  ? 'MintGarden map not available'
                                  : DataCache.mintgardenLauncherMap?.[focusedNftId]
                                  ? `Open Wojak #${focusedNftId} on MintGarden`
                                  : `MintGarden link not available for #${focusedNftId}`
                              }
                            >
                              <img src="/icon/icons1/icon_MG.png" alt="MintGarden" className="bp-mg-icon" />
                              {DataCache.mintgardenLauncherMap?.[focusedNftId] && (
                                <span style={{ marginLeft: '4px', fontSize: '10px' }}>✓</span>
                              )}
                            </button>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          
            {/* Preview Images - Single Horizontal Row */}
            <div className="bp-combo-preview-row">
              {displayedIds.map(nftId => {
                const isActive = activeNftIdForHighlight === nftId
              // Try to get image from shard cache first, fallback to getNftImageUrl
              let imageUrl = null
              const idNum = parseInt(nftId, 10)
              if (!isNaN(idNum) && idNum >= 1 && idNum <= 4200) {
                const SHARD_SIZE = 100
                const shardStart = Math.floor((idNum - 1) / SHARD_SIZE) * SHARD_SIZE + 1
                const shardEnd = Math.min(shardStart + SHARD_SIZE - 1, 4200)
                const rangeKey = `${String(shardStart).padStart(4, '0')}_${String(shardEnd).padStart(4, '0')}`
                const shard = DataCache.comboTraitsShardCache.get(rangeKey)
                if (shard && shard.nfts && shard.nfts[nftId]) {
                  imageUrl = shard.nfts[nftId].image
                }
              }
              if (!imageUrl) {
                imageUrl = getNftImageUrl(nftId)
              }
              const listing = getBestListingForId(nftId)
              const floor = getFloorPrice()
              const multiplier = listing && floor ? (listing.price_xch / floor).toFixed(1) : null
              
              return (
                <button
                  key={nftId}
                  className={`bp-preview-tile ${isActive ? 'is-active' : ''}`}
                  {...(!isMobile && {
                    onMouseEnter: () => setHoveredNftId(nftId),
                    onMouseLeave: () => setHoveredNftId(null)
                  })}
                  onClick={() => {
                    setSelectedNftId(nftId)
                  }}
                  title={`NFT #${nftId}`}
                >
                  <div className="bp-preview-tile-inner">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={`NFT #${nftId}`}
                        className="bp-preview-image"
                      />
                    )}
                    <span className="bp-preview-text">#{nftId}</span>
                  </div>
                  {listing && (
                    <div className="bp-preview-tile-footer">
                      {isMobile ? (
                        <span className="bp-sale-badge">MG {formatPriceXCH(listing.price_xch)}</span>
                      ) : (
                        <span className="bp-sale-badge">
                          For sale • {formatPriceXCH(listing.price_xch)} XCH
                          {multiplier && ` • ${multiplier}× floor`}
                          {listing.price_usd && ` (${formatPriceUSD(listing.price_usd)})`}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          </div>
        </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// DYNAMIC ANSWER COMPONENTS
// ============================================
const DynamicAnswer = ({ question, analysis, onNftClick, mintGardenMapStats }) => {
  const renderContent = () => {
    switch (question.answer_logic) {
      case 'combo_explorer':
        return <ComboExplorerView onNftClick={onNftClick} mintGardenMapStats={mintGardenMapStats} />
      case 'full_analysis':
        return <FullAnalysis analysis={analysis} />
      case 'rarest_feature':
        return <RarestFeature analysis={analysis} />
      case 'base_comparison':
        return <BaseComparison analysis={analysis} />
      case 'provenance_analysis':
        return <ProvenanceAnalysis analysis={analysis} />
      case 'flex_line':
        return <div className="bp-flex-line">{safeGet(analysis, 'story_hook', safeGet(analysis, 'highlight', ''))}</div>
      case 'hidden_gem':
        return <HiddenGem analysis={analysis} />
      default:
        if (!analysis) return <p>Analysis not available</p>
        return <p>{safeGet(analysis, 'highlight', 'No analysis available')}</p>
    }
  }

  return (
    <div className="bp-dynamic-answer">
      {question.answer_logic !== 'combo_explorer' && (
        <h3 className="bp-answer-title">{question.question}</h3>
      )}
      <div className="bp-answer-content">
        {renderContent()}
      </div>
    </div>
  )
}

const FullAnalysis = ({ analysis }) => (
  <div className="bp-full-analysis">
    <div className="bp-card">
      <div className="bp-card-header">🏆 Rank</div>
      <div className="bp-card-content">
        <div className="bp-stat-row">
          <span>Overall</span>
          <strong>#{safeGet(analysis, 'rank', '?')}</strong>
        </div>
        <div className="bp-stat-row">
          <span>Percentile</span>
          <strong>Top {safeGet(analysis, 'percentile', '?')}%</strong>
        </div>
        <div className="bp-stat-row">
          <span>In {safeGet(analysis, 'base', 'Unknown')}</span>
          <strong>#{safeGet(analysis, 'base_rank', '?')} of {safeGet(analysis, 'base_total', '?')}</strong>
        </div>
      </div>
    </div>
    
    {analysis?.s_tier_traits?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">⭐ High Provenance Traits</div>
        <div className="bp-card-content">
          {analysis.s_tier_traits.map(t => (
            <div key={t.trait} className="bp-trait-row">
              {safeGet(t, 'trait', 'Unknown')} ({safeGet(t, 'count', '?')})
            </div>
          ))}
        </div>
      </div>
    )}
    
    {analysis?.named_combos?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">🔥 Named Combos</div>
        <div className="bp-card-content">
          {analysis.named_combos.map(c => (
            <div key={c.name} className="bp-combo-row">
              {safeGet(c, 'name', 'Unknown')}
            </div>
          ))}
        </div>
      </div>
    )}
    
    {analysis?.unique_pairings?.length > 0 && (
      <div className="bp-card">
        <div className="bp-card-header">💎 1-of-1 Pairings</div>
        <div className="bp-card-content">
          {analysis.unique_pairings.map((p, i) => (
            <div key={i} className="bp-unique-row">
              {Array.isArray(p) ? p[0] : safeGet(p, 'traits.0', '')} + {Array.isArray(p) ? p[1] : safeGet(p, 'traits.1', '')}
              <span className="bp-badge">Only one</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)

const RarestFeature = ({ analysis }) => {
  if (analysis?.unique_pairings?.length > 0) {
    const p = analysis.unique_pairings[0]
    const trait1 = Array.isArray(p) ? p[0] : safeGet(p, 'traits.0', 'Unknown')
    const trait2 = Array.isArray(p) ? p[1] : safeGet(p, 'traits.1', 'Unknown')
    return (
      <div className="bp-rarest">
        <div className="bp-rarest-badge">💎 1-of-1</div>
        <p><strong>{trait1}</strong> + <strong>{trait2}</strong> exists on exactly ONE NFT out of 4,200.</p>
        <p className="bp-note">This isn't just rare—it's unique.</p>
      </div>
    )
  }
  if (analysis?.rare_pairings?.length > 0) {
    const p = analysis.rare_pairings[0]
    return (
      <div className="bp-rarest">
        <div className="bp-rarest-badge">💜 Rare</div>
        <p>
          <strong>{safeGet(p, 'traits.0', 'Unknown')}</strong> + <strong>{safeGet(p, 'traits.1', 'Unknown')}</strong>
          {' '}exists on only {safeGet(p, 'count', '?')} NFTs.
        </p>
      </div>
    )
  }
  return (
    <p>
      Rarest aspect: #{safeGet(analysis, 'base_rank', '?')} among {safeGet(analysis, 'base_total', '?')}{' '}
      {safeGet(analysis, 'base', 'Unknown')}s.
    </p>
  )
}

const BaseComparison = ({ analysis }) => (
  <div className="bp-comparison">
    <table className="bp-comparison-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>This NFT</th>
          <th>Average</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Base Rank</td>
          <td><strong>#{safeGet(analysis, 'base_rank', '?')}</strong></td>
          <td>#{Math.round(safeGet(analysis, 'base_total', 0) / 2)}</td>
        </tr>
        <tr>
          <td>Overall</td>
          <td><strong>#{safeGet(analysis, 'rank', '?')}</strong></td>
          <td>~#2100</td>
        </tr>
        <tr>
          <td>High Provenance</td>
          <td><strong>{safeGet(analysis, 's_tier_count', 0)}</strong></td>
          <td>~1</td>
        </tr>
        <tr>
          <td>1-of-1</td>
          <td><strong>{safeGet(analysis, 'unique_count', 0)}</strong></td>
          <td>~0.3</td>
        </tr>
      </tbody>
    </table>
    {safeGet(analysis, 'base_rank', 999) === 1 && (
      <p className="bp-note success">🏆 THE best {safeGet(analysis, 'base', 'Unknown')}!</p>
    )}
  </div>
)

const ProvenanceAnalysis = ({ analysis }) => (
  <div className="bp-provenance">
    {analysis?.s_tier_traits?.length > 0 && (
      <div className="bp-section">
        <h4>⭐ High Provenance Traits</h4>
        <p>
          {safeGet(analysis, 's_tier_count', 0)} High Provenance:{' '}
          {analysis.s_tier_traits.map(t => safeGet(t, 'trait', 'Unknown')).join(', ')}
        </p>
      </div>
    )}
    {analysis?.named_combos?.length > 0 && (
      <div className="bp-section">
        <h4>🔥 Named Combo</h4>
        <p>
          Carries the <strong>{safeGet(analysis.named_combos[0], 'name', 'Unknown')}</strong> combo.
        </p>
      </div>
    )}
    {safeGet(analysis, 'is_heritage_base', false) && (
      <div className="bp-section">
        <h4>🏛️ Heritage</h4>
        <p><strong>{safeGet(analysis, 'base', 'Unknown')}</strong> is an OG heritage base.</p>
      </div>
    )}
  </div>
)

// High Provenance Trait View Component
const HighProvenanceTraitView = ({ 
  traitName, 
  data, 
  getTopNftsByCategoryTrait,
  onNftClick,
  onMintGardenClick,
  onOpenBigPulp
}) => {
  const [traitInfo, setTraitInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [topNfts, setTopNfts] = useState([])
  const [traitCategory, setTraitCategory] = useState(null)

  // Map trait names to their categories
  const traitCategoryMap = {
    // Base
    'Monkey Zoo': 'base',
    'Papa Tang': 'base',
    // Head
    'Crown': 'head',
    'Military Beret': 'head',
    'Wizard Hat': 'head',
    'Fedora': 'head',
    'Clown': 'head',
    'Ronin Helmet': 'head',
    'Pirate Hat': 'head',
    // Face Wear
    'MOG Glasses': 'facewear',
    'Wizard Glasses': 'facewear',
    'Cyber Shades': 'facewear',
    'VR Headset': 'facewear',
    'Fake It Mask': 'facewear',
    'Laser Eyes': 'facewear',
    'Clown Nose': 'facewear',
    'Eye Patch': 'facewear',
    // Mouth
    'Neckbeard': 'mouth',
    // Clothes
    'Straitjacket': 'clothes',
    'Goose Suit': 'clothes',
    'Wizard Drip': 'clothes',
    'El Presidente': 'clothes',
    'Ronin': 'clothes',
    'Pepe Suit': 'clothes',
    'Pickle Suit': 'clothes',
    'Bepe Army': 'clothes',
    'Super Saiyan Uniform': 'clothes'
  }

  useEffect(() => {
    const loadTraitInfo = async () => {
      setLoading(true)
      
      // Determine category for this trait
      const category = traitCategoryMap[traitName]
      setTraitCategory(category)
      
      // Ensure data is loaded
      if (!data?.nftRarityData) {
        try {
          await loadContextData()
          // Reload will happen via data prop update
        } catch (err) {
          console.error('Failed to load context data:', err)
        }
      }
      
      // Get top 10 NFTs for this trait
      if (category && data?.nftRarityData && getTopNftsByCategoryTrait) {
        const nfts = getTopNftsByCategoryTrait(category, traitName, 10)
        setTopNfts(nfts)
      }

      // Load trait insights for additional info
      try {
        let insights = DataCache.traitInsights
        if (!insights) {
          insights = await loadTraitInsights()
        }
        if (insights && insights[traitName]) {
          setTraitInfo(insights[traitName])
        }
      } catch (err) {
        console.error('Failed to load trait info:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTraitInfo()
  }, [traitName, data, getTopNftsByCategoryTrait])

  // Update top NFTs when data becomes available
  useEffect(() => {
    const category = traitCategoryMap[traitName]
    if (category && data?.nftRarityData && getTopNftsByCategoryTrait) {
      const nfts = getTopNftsByCategoryTrait(category, traitName, 10)
      setTopNfts(nfts)
    }
  }, [traitName, data?.nftRarityData, getTopNftsByCategoryTrait])

  if (loading) {
    return (
      <div className="bp-loading">
        <div className="bp-loading-spinner"></div>
        <div className="bp-loading-text">Loading trait information...</div>
      </div>
    )
  }

  const getNftImageUrl = (nftId) => {
    const paddedId = String(nftId).padStart(4, '0')
    return `https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${paddedId}.png`
  }

  const percentile = traitInfo?.percentile ? traitInfo.percentile.toFixed(2) : '?'
  const tier = traitInfo?.provenance_tier || 'Unknown'
  const isHeritageBase = traitCategory === 'base'

  return (
    <div className="bp-answer-content">
      <h3 className="bp-answer-title">{traitName}</h3>
      
      {/* Trait Information Card */}
      {traitInfo && (
        <div className="bp-card">
          <div className="bp-card-header">⭐ High Provenance Trait</div>
          <div className="bp-card-content">
            <div className="bp-stat-row">
              <span>Count</span>
              <strong>{traitInfo.count || '?'} exist</strong>
            </div>
            <div className="bp-stat-row">
              <span>Percentile</span>
              <strong>{percentile}%</strong>
            </div>
            <div className="bp-stat-row">
              <span>Category</span>
              <strong>{traitInfo.category || 'Unknown'}</strong>
            </div>
            <div className="bp-stat-row">
              <span>Provenance Tier</span>
              <strong>{tier === 'S+' ? 'S+' : tier === 'S' ? 'S' : tier}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Heritage Base Info */}
      {isHeritageBase && (
        <div className="bp-card">
          <div className="bp-card-header">🏛️ Heritage Base</div>
          <div className="bp-card-content">
            <p>
              <strong>{traitName}</strong> is an OG heritage base with high provenance value.
              Heritage bases carry cultural significance as original base types in the collection.
            </p>
          </div>
        </div>
      )}

      {/* Additional Trait Info */}
      {traitInfo?.cultural_note && (
        <div className="bp-card">
          <div className="bp-card-header">Cultural Note</div>
          <div className="bp-card-content">
            <p>{traitInfo.cultural_note}</p>
          </div>
        </div>
      )}

      {traitInfo?.community_meme && (
        <div className="bp-card">
          <div className="bp-card-header">Community Meme</div>
          <div className="bp-card-content">
            <p>{traitInfo.community_meme}</p>
          </div>
        </div>
      )}

      {traitInfo?.fun_fact && (
        <div className="bp-card">
          <div className="bp-card-header">Fun Fact</div>
          <div className="bp-card-content">
            <p>{traitInfo.fun_fact}</p>
          </div>
        </div>
      )}

      {traitInfo?.pairs_well_with && traitInfo.pairs_well_with.length > 0 && (
        <div className="bp-card">
          <div className="bp-card-header">Pairs Well With</div>
          <div className="bp-card-content">
            <p>{traitInfo.pairs_well_with.join(', ')}</p>
          </div>
        </div>
      )}

      {traitInfo?.best_holder && (
        <div className="bp-card">
          <div className="bp-card-header">Best Holder</div>
          <div className="bp-card-content">
            <p>
              NFT #{traitInfo.best_holder.nft_id} (Rank {traitInfo.best_holder.rank || '?'})
            </p>
          </div>
        </div>
      )}

      {/* Top 10 NFTs Row - Always show for any trait */}
      {topNfts.length > 0 && (
        <div className="bp-high-provenance-top-nfts">
          <h4 className="bp-high-provenance-top-nfts-title">Top 10 {traitName} NFTs</h4>
          <div className="bp-high-provenance-top-nfts-row">
            {topNfts.map(({ nftId, analysis, rank, baseRank, categoryRank }, index) => (
              <div key={nftId} className="bp-high-provenance-nft-preview">
                <div 
                  className="bp-high-provenance-nft-image-container"
                  onClick={() => onNftClick(nftId)}
                  style={{ cursor: 'pointer' }}
                >
                  <img 
                    src={getNftImageUrl(nftId)}
                    alt={`NFT #${nftId}`}
                    className="bp-high-provenance-nft-image"
                    loading="eager"
                  />
                </div>
                <div className="bp-high-provenance-nft-info">
                  <div className="bp-high-provenance-nft-id">#{nftId}</div>
                  <div className="bp-high-provenance-nft-rank">Rank #{rank}</div>
                </div>
                <div className="bp-high-provenance-nft-actions">
                  <button
                    className="bp-high-provenance-nft-btn"
                    onClick={() => onNftClick(nftId)}
                    title="Open in Rarity Explorer"
                  >
                    <img 
                      src="/icon/icons1/orange-3d-icon.png" 
                      alt="Rarity Explorer"
                      className="bp-high-provenance-nft-btn-icon"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </button>
                  <button
                    className="bp-high-provenance-nft-btn"
                    onClick={() => onMintGardenClick(nftId)}
                    title="View on MintGarden"
                  >
                    <img 
                      src="/icon/icons1/icon_MG.png" 
                      alt="MintGarden"
                      className="bp-high-provenance-nft-btn-icon"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </button>
                  <button
                    className="bp-high-provenance-nft-btn bp-high-provenance-nft-btn-bigpulp"
                    onClick={() => onOpenBigPulp(nftId, analysis)}
                    title="Ask BigPulp"
                  >
                    <span className="bp-high-provenance-nft-btn-emoji">🍊</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Trait Sale Averages View Component
const TraitSaleAveragesView = ({ 
  onBack, 
  onNftClick,
  selectedTraitCategory,
  setSelectedTraitCategory,
  selectedTraitValue,
  setSelectedTraitValue,
  traitSearchQuery,
  setTraitSearchQuery,
  traitSortBy,
  setTraitSortBy,
  traitCategoryFilter,
  setTraitCategoryFilter,
  showAllTraitsTable,
  setShowAllTraitsTable,
  traitSalesSortBy,
  setTraitSalesSortBy
}) => {
  // Column sorting state: { column: string, direction: 'asc' | 'desc' }
  const [columnSort, setColumnSort] = useState({ column: null, direction: 'desc' })
  const { showToast } = useToast()
  const [salesIndex, setSalesIndex] = useState(DataCache.salesIndexV1)
  // Initialize offersIndex from DataCache if available (parent component may have already loaded it)
  const [offersIndex, setOffersIndex] = useState(() => {
    const cached = DataCache.mintgardenOffersIndex
    if (cached) {
      console.log('[Trait Sale Averages] Initializing offersIndex from DataCache:', {
        floor_xch: cached.floor_xch,
        market_stats_floor_xch: cached.market_stats?.floor_xch
      })
    } else {
      console.log('[Trait Sale Averages] No offersIndex in DataCache at initialization')
    }
    return cached || null
  })
  const [valueModel, setValueModel] = useState(DataCache.valueModelV2 || DataCache.valueModelV1)
  // Initialize with cached data immediately for instant display
  const [traitSaleAverages, setTraitSaleAverages] = useState(DataCache.traitSaleAverages)
  const [building, setBuilding] = useState(false) // Only true when actively building (not loading data)
  const [nowTick, setNowTick] = useState(Date.now())
  const [xchPriceUSD, setXchPriceUSD] = useState(null) // Current XCH/USD price from treasury API
  
  // Sync offersIndex with DataCache when it changes (e.g., from parent refresh button)
  // Check by comparing generated_at timestamps to avoid unnecessary updates
  useEffect(() => {
    const cachedOffers = DataCache.mintgardenOffersIndex
    if (!cachedOffers) {
      // Poll DataCache periodically if it's not available yet (parent might still be loading)
      const checkInterval = setInterval(() => {
        if (DataCache.mintgardenOffersIndex && !offersIndex) {
          console.log('[Trait Sale Averages] DataCache now has offersIndex, updating state')
          setOffersIndex(DataCache.mintgardenOffersIndex)
          clearInterval(checkInterval)
        }
      }, 500) // Check every 500ms
      
      // Stop checking after 10 seconds
      setTimeout(() => clearInterval(checkInterval), 10000)
      
      return () => clearInterval(checkInterval)
    }
    
    const cachedGeneratedAt = getOffersGeneratedAtMs(cachedOffers)
    const currentGeneratedAt = offersIndex ? getOffersGeneratedAtMs(offersIndex) : null
    
    console.log('[Trait Sale Averages] Syncing offersIndex:', {
      cachedGeneratedAt,
      currentGeneratedAt,
      cachedFloorXch: cachedOffers.floor_xch,
      currentFloorXch: offersIndex?.floor_xch,
      shouldUpdate: cachedGeneratedAt && (currentGeneratedAt === null || cachedGeneratedAt > currentGeneratedAt)
    })
    
    // Update if cached data is newer or if we don't have current data
    if (cachedGeneratedAt && (currentGeneratedAt === null || cachedGeneratedAt > currentGeneratedAt)) {
      console.log('[Trait Sale Averages] Updating offersIndex from DataCache')
      setOffersIndex(cachedOffers)
    }
  }, [DataCache.mintgardenOffersIndex, offersIndex])
  
  // Get xchUsdFallback - ALWAYS provide a value (never null)
  // Priority: 1) Treasury API current price, 2) Value model price, 3) Offers index price, 4) Hardcoded fallback (~$4.70)
  // We prefer current price over historical build-time prices for accurate USD conversions
  const xchUsdFallback = useMemo(() => {
    // First try current price from treasury API (most accurate)
    if (xchPriceUSD != null && typeof xchPriceUSD === 'number' && isFinite(xchPriceUSD) && xchPriceUSD > 0) {
      return xchPriceUSD
    }
    // Then try value model build-time price
    if (valueModel?.market?.xch_usd_at_build) {
      return valueModel.market.xch_usd_at_build
    }
    // Then try offers index build-time price (fallback to cached if current unavailable)
    if (offersIndex?.xch_usd_at_build) {
      return offersIndex.xch_usd_at_build
    }
    if (DataCache.mintgardenOffersIndex?.xch_usd_at_build) {
      return DataCache.mintgardenOffersIndex.xch_usd_at_build
    }
    // Last resort: use a reasonable hardcoded fallback (~$4.70 USD per XCH as of Jan 2025)
    // This ensures USD is ALWAYS calculable even if APIs are unavailable
    return 4.7
  }, [xchPriceUSD, valueModel, offersIndex])
  
  // Helper function to get XCH/USD rate with proper priority
  // This ensures consistent rate lookup across all conversion locations
  // Returns the same value as xchUsdFallback but provides a clear interface
  const getXchUsdRate = useCallback(() => {
    return xchUsdFallback
  }, [xchUsdFallback])
  
  // Load XCH price from treasury API with automatic refresh (every 60 minutes)
  useEffect(() => {
    const loadXchPrice = async () => {
      try {
        const price = await fetchXCHPrice(false) // Use cache if available
        if (price != null && typeof price === 'number' && isFinite(price) && price > 0) {
          setXchPriceUSD(price)
        }
      } catch (err) {
        console.warn('[Trait Sale Averages] Failed to load XCH price:', err)
        // Don't set state - will use fallback from useMemo
      }
    }
    
    // Initial load
    loadXchPrice()
    
    // Poll every 60 minutes for XCH price updates
    const XCH_PRICE_POLL_INTERVAL = 60 * 60 * 1000 // 60 minutes
    const priceIntervalId = setInterval(() => {
      loadXchPrice()
    }, XCH_PRICE_POLL_INTERVAL)
    
    return () => clearInterval(priceIntervalId)
  }, [])
  
  // Load data in background (non-blocking)
  useEffect(() => {
    const loadData = async () => {
      console.log('[Trait Sale Averages] Starting data load...')
      // Load data in background without blocking UI
      // Use cached data immediately if available
      try {
        // First, try to use DataCache if it's already loaded (from parent component's force fetch)
        if (DataCache.mintgardenOffersIndex) {
          console.log('[Trait Sale Averages] Using offersIndex from DataCache:', {
            floor_xch: DataCache.mintgardenOffersIndex.floor_xch,
            market_stats_floor_xch: DataCache.mintgardenOffersIndex.market_stats?.floor_xch
          })
          setOffersIndex(DataCache.mintgardenOffersIndex)
        } else {
          console.log('[Trait Sale Averages] DataCache.mintgardenOffersIndex is null, will fetch from API')
        }
        
        // Load sales index, offers index, value model
        const [salesData, offersData, modelData] = await Promise.all([
          loadSalesIndexV1().catch(() => null),
          // Use force=true to get latest data, but only if DataCache doesn't have it
          DataCache.mintgardenOffersIndex 
            ? Promise.resolve({ data: DataCache.mintgardenOffersIndex })
            : (async () => {
                console.log('[Trait Sale Averages] Fetching offersIndex from API with force=true...')
                try {
                  const result = await loadLiveOffersIndex(true)
                  console.log('[Trait Sale Averages] loadLiveOffersIndex result (full):', result)
                  console.log('[Trait Sale Averages] loadLiveOffersIndex result (parsed):', {
                    hasResult: !!result,
                    hasData: !!result?.data,
                    dataType: typeof result?.data,
                    dataIsNull: result?.data === null,
                    dataIsUndefined: result?.data === undefined,
                    floor_xch: result?.data?.floor_xch,
                    market_stats_floor_xch: result?.data?.market_stats?.floor_xch,
                    error: result?.error,
                    keys: result ? Object.keys(result) : []
                  })
                  
                  // If result exists but data is null/undefined, check DataCache directly
                  if (result && !result.data && DataCache.mintgardenOffersIndex) {
                    console.log('[Trait Sale Averages] Result has no data, but DataCache has it:', {
                      floor_xch: DataCache.mintgardenOffersIndex.floor_xch
                    })
                    return { data: DataCache.mintgardenOffersIndex, generatedAtMs: result.generatedAtMs || DataCache.offersLastFetchedAt }
                  }
                  
                  return result
                } catch (err) {
                  console.error('[Trait Sale Averages] Failed to fetch offersIndex:', err)
                  // Error object might contain cached data
                  if (err && typeof err === 'object' && err.data) {
                    console.log('[Trait Sale Averages] Error contains cached data, using it:', {
                      floor_xch: err.data.floor_xch
                    })
                    return { data: err.data, generatedAtMs: err.generatedAtMs }
                  }
                  return null
                }
              })(),
          loadValueModelV2().catch(() => null)
        ])
        
        if (salesData) setSalesIndex(salesData)
        if (offersData?.data) {
          console.log('[Trait Sale Averages] Loaded offersIndex from API:', {
            floor_xch: offersData.data.floor_xch,
            market_stats_floor_xch: offersData.data.market_stats?.floor_xch,
            generated_at: offersData.data.generated_at
          })
          setOffersIndex(offersData.data)
        } else {
          console.warn('[Trait Sale Averages] No offersData received from API')
        }
        if (modelData) setValueModel(modelData)
      } catch (err) {
        console.error('[Trait Sale Averages] Failed to load data:', err)
      }
    }
    
    loadData()
  }, [])
  
  // Build trait sale averages when data is available (non-blocking if cached data exists)
  useEffect(() => {
    if (!salesIndex || !salesIndex.events || !Array.isArray(salesIndex.events)) {
      return
    }
    
    // Check if we need to rebuild
    const salesGeneratedAt = salesIndex.generated_at
    const cachedBuiltAt = DataCache.traitSaleAveragesBuiltAt
    
    // If cached data is up to date, use it immediately (no loading state)
    if (cachedBuiltAt === salesGeneratedAt && DataCache.traitSaleAverages) {
      setTraitSaleAverages(DataCache.traitSaleAverages)
      return
    }
    
    // Rebuild in background (only show building indicator if no cached data)
    const buildAverages = async () => {
      // Only show building indicator if we don't have cached data to show
      if (!DataCache.traitSaleAverages) {
        setBuilding(true)
      }
      
      try {
        const statsMap = await buildTraitSaleAverages({
          salesEvents: salesIndex.events,
          xchUsdFallback
        })
        
        DataCache.traitSaleAverages = statsMap
        DataCache.traitSaleAveragesBuiltAt = salesGeneratedAt
        setTraitSaleAverages(statsMap)
      } catch (err) {
        console.error('[Trait Sale Averages] Failed to build averages:', err)
        showToast('Failed to build trait sale averages', 'error')
      } finally {
        setBuilding(false)
      }
    }
    
    buildAverages()
  }, [salesIndex, xchUsdFallback, showToast])
  
  // Update nowTick for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])
  
  // Get floor price - always provide a value (use fallback if needed)
  const floorXch = useMemo(() => {
    console.log('[Trait Sale Averages] Calculating floor price:', {
      offersIndex_floor_xch: offersIndex?.floor_xch,
      offersIndex_market_stats_floor_xch: offersIndex?.market_stats?.floor_xch,
      valueModel_floor_xch: valueModel?.floor?.xch,
      hasOffersIndex: !!offersIndex
    })
    
    // Try offersIndex first (most accurate)
    if (offersIndex?.floor_xch != null) {
      console.log('[Trait Sale Averages] Using offersIndex.floor_xch:', offersIndex.floor_xch)
      return offersIndex.floor_xch
    }
    if (offersIndex?.market_stats?.floor_xch != null) {
      console.log('[Trait Sale Averages] Using offersIndex.market_stats.floor_xch:', offersIndex.market_stats.floor_xch)
      return offersIndex.market_stats.floor_xch
    }
    
    // Fallback: try value model floor
    if (valueModel?.floor?.xch != null) {
      return valueModel.floor.xch
    }
    
    // Fallback: compute from trait sale averages (use minimum of recent sales as floor estimate)
    if (traitSaleAverages && Object.keys(traitSaleAverages).length > 0) {
      let minPrice = Infinity
      for (const traitKey in traitSaleAverages) {
        const stats = traitSaleAverages[traitKey]
        if (stats.minXch != null && stats.minXch > 0 && stats.minXch < minPrice) {
          minPrice = stats.minXch
        }
      }
      if (isFinite(minPrice) && minPrice > 0) {
        return minPrice
      }
    }
    
    // Last resort: use a reasonable default floor estimate (0.8 XCH)
    // This ensures premium is always calculable
    console.warn('[Trait Sale Averages] Using fallback floor price: 0.8 XCH (no offers data available)')
    return 0.8
  }, [offersIndex, valueModel, traitSaleAverages])
  
  // Get floor "as of" time
  const floorAsOf = useMemo(() => {
    if (!offersIndex?.generated_at) return null
    const ms = getOffersGeneratedAtMs(offersIndex)
    return ms ? formatRelativeTime(ms, nowTick) : null
  }, [offersIndex, nowTick])
  
  // Category labels
  const categoryLabels = {
    base: 'Base',
    clothes: 'Clothes',
    head: 'Head',
    face: 'Face',
    mouth: 'Mouth',
    facewear: 'Eyes',
    background: 'Background'
  }
  
  const categories = ['base', 'face', 'mouth', 'facewear', 'head', 'clothes', 'background']
  
  // Get traits for selected category (always return array, empty if no category selected)
  const traitsForCategory = useMemo(() => {
    if (!traitSaleAverages) return []
    
    // If no category selected, return empty array (trait dropdown will show placeholder)
    if (!selectedTraitCategory) return []
    
    const traits = []
    for (const traitKey in traitSaleAverages) {
      const stats = traitSaleAverages[traitKey]
      if (stats.category === selectedTraitCategory) {
        traits.push({
          traitKey,
          value: stats.value,
          stats
        })
      }
    }
    
    // Sort by value alphabetically
    traits.sort((a, b) => a.value.localeCompare(b.value))
    
    // Filter by search query if provided
    if (traitSearchQuery) {
      const query = traitSearchQuery.toLowerCase()
      return traits.filter(t => t.value.toLowerCase().includes(query))
    }
    
    return traits
  }, [traitSaleAverages, selectedTraitCategory, traitSearchQuery])
  
  // Get selected trait stats
  const selectedTraitStats = useMemo(() => {
    if (!traitSaleAverages || !selectedTraitCategory || !selectedTraitValue) return null
    
    const traitKey = `${selectedTraitCategory}::${selectedTraitValue}`
    return traitSaleAverages[traitKey] || null
  }, [traitSaleAverages, selectedTraitCategory, selectedTraitValue])
  
  // Get sorted sales for selected trait
  const sortedSales = useMemo(() => {
    if (!selectedTraitStats || !selectedTraitStats.examples) return []
    
    const sales = [...selectedTraitStats.examples] // Copy array
    
    // Sort based on traitSalesSortBy
    sales.sort((a, b) => {
      if (traitSalesSortBy === 'valueAsc') {
        return (a.xchEq || 0) - (b.xchEq || 0)
      } else if (traitSalesSortBy === 'valueDesc') {
        return (b.xchEq || 0) - (a.xchEq || 0)
      } else if (traitSalesSortBy === 'recencyAsc') {
        // Oldest first
        if (!a.soldAtIso && !b.soldAtIso) return 0
        if (!a.soldAtIso) return 1
        if (!b.soldAtIso) return -1
        return a.soldAtIso.localeCompare(b.soldAtIso)
      } else { // recencyDesc - most recent first
        // Most recent first
        if (!a.soldAtIso && !b.soldAtIso) return 0
        if (!a.soldAtIso) return 1
        if (!b.soldAtIso) return -1
        return b.soldAtIso.localeCompare(a.soldAtIso)
      }
    })
    
    return sales
  }, [selectedTraitStats, traitSalesSortBy])
  
  // Get all traits for table (filtered and sorted)
  const allTraitsForTable = useMemo(() => {
    if (!traitSaleAverages) return []
    
    let traits = []
    for (const traitKey in traitSaleAverages) {
      const stats = traitSaleAverages[traitKey]
      traits.push({
        traitKey,
        category: stats.category,
        value: stats.value,
        stats
      })
    }
    
    // Filter by category if selected
    if (traitCategoryFilter) {
      traits = traits.filter(t => t.category === traitCategoryFilter)
    }
    
    // Sort by column (clickable headers)
    if (columnSort.column) {
      traits.sort((a, b) => {
        const { column, direction } = columnSort
        const isAsc = direction === 'asc'
        let result = 0
        
        switch (column) {
          case 'category':
            // Alphabetical sort
            const catA = categoryLabels[a.category] || a.category
            const catB = categoryLabels[b.category] || b.category
            result = catA.localeCompare(catB)
            break
          case 'trait':
            // Alphabetical sort
            result = a.value.localeCompare(b.value)
            break
          case 'avgXch':
            // Number sort
            result = a.stats.avgXch - b.stats.avgXch
            break
          case 'minXch':
            // Number sort
            result = a.stats.minXch - b.stats.minXch
            break
          case 'maxXch':
            // Number sort
            result = a.stats.maxXch - b.stats.maxXch
            break
          case 'avgUsd':
            // Number sort
            const usdA = a.stats.avgUsd != null ? a.stats.avgUsd : (a.stats.avgXch * xchUsdFallback)
            const usdB = b.stats.avgUsd != null ? b.stats.avgUsd : (b.stats.avgXch * xchUsdFallback)
            result = usdA - usdB
            break
          case 'premium':
            // Number sort
            const premiumA = floorXch && a.stats.avgXch > 0 ? (a.stats.avgXch / floorXch) : 0
            const premiumB = floorXch && b.stats.avgXch > 0 ? (b.stats.avgXch / floorXch) : 0
            result = premiumA - premiumB
            break
          case 'nSales':
            // Number sort
            result = a.stats.nSales - b.stats.nSales
            break
          case 'recency':
            // Date sort (ISO string comparison)
            if (!a.stats.lastSaleAtIso && !b.stats.lastSaleAtIso) result = 0
            else if (!a.stats.lastSaleAtIso) result = 1
            else if (!b.stats.lastSaleAtIso) result = -1
            else result = a.stats.lastSaleAtIso.localeCompare(b.stats.lastSaleAtIso)
            break
          default:
            return 0
        }
        
        return isAsc ? result : -result
      })
    }
    
    return traits
  }, [traitSaleAverages, traitCategoryFilter, columnSort, floorXch, xchUsdFallback])
  
  // Format price helpers
  const formatPriceXCH = useCallback((price) => {
    if (price < 0.01) return price.toFixed(4)
    return price.toFixed(2)
  }, [])
  
  const formatPriceUSD = useCallback((price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }, [])
  
  // Show building indicator only if no data at all (not if we have cached data)
  if (building && !traitSaleAverages) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Building trait sale averages...</div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          This may take a moment on first load
        </div>
      </div>
    )
  }
  
  return (
    <div className="bp-trait-sale-averages">
      {/* Selected Trait Result Card and All Sales - Side by Side */}
      {selectedTraitStats && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {/* Avg Sale Price Card */}
          <div className="bp-card" style={{ flex: '0 0 350px', minWidth: '300px' }}>
            <div className="bp-card-header" style={{ fontSize: '12px' }}>
              Avg sale price (NFTs with this trait)
            </div>
            <div className="bp-card-content">
              <div style={{ marginBottom: '10px' }}>
                <strong>{formatPriceXCH(selectedTraitStats.avgXch)} XCH</strong>
              </div>
              
              <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                Range: {formatPriceXCH(selectedTraitStats.minXch)} - {formatPriceXCH(selectedTraitStats.maxXch)} XCH
              </div>
              
              {/* ALWAYS show USD - xchUsdFallback is guaranteed to be non-null */}
              {(() => {
                let displayUsd = selectedTraitStats.avgUsd
                let isApproxUsd = selectedTraitStats.hasApproxUsd
                if (displayUsd == null && selectedTraitStats.avgXch > 0) {
                  displayUsd = selectedTraitStats.avgXch * xchUsdFallback
                  isApproxUsd = true
                }
                // Always show USD if we have avgXch (xchUsdFallback is never null)
                return selectedTraitStats.avgXch > 0 ? (
                  <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                    {isApproxUsd ? 'Avg USD (approx):' : 'Avg USD-at-sale:'} {formatPriceUSD(displayUsd || (selectedTraitStats.avgXch * xchUsdFallback))}
                  </div>
                ) : null
              })()}
              
              {/* ALWAYS show premium - floorXch is now guaranteed to have a value */}
              {floorXch != null && selectedTraitStats.avgXch > 0 && (
                <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                  Premium vs floor now: {(selectedTraitStats.avgXch / floorXch).toFixed(2)}×
                </div>
              )}
              
              <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                #Sales: {selectedTraitStats.nSales}
              </div>
              
              {selectedTraitStats.lastSaleAtIso && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Last sale: {formatRelativeTime(new Date(selectedTraitStats.lastSaleAtIso).getTime(), nowTick)}
                </div>
              )}
            </div>
          </div>
          
          {/* All Sales List for Selected Trait */}
          {selectedTraitStats.examples && selectedTraitStats.examples.length > 0 && (
            <div className="bp-card" style={{ flex: '1 1 400px', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
              <div className="bp-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px' }}>
                <span>All Sales ({selectedTraitStats.nSales} total)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>Sort by:</span>
                  <button
                    className={`bp-btn ${traitSalesSortBy === 'recencyAsc' || traitSalesSortBy === 'recencyDesc' ? 'active' : ''}`}
                    onClick={() => {
                      // First click = ascending, second click = descending
                      if (traitSalesSortBy === 'recencyAsc') {
                        setTraitSalesSortBy('recencyDesc')
                      } else {
                        // If not currently sorting by time, or if descending, set to ascending (first click)
                        setTraitSalesSortBy('recencyAsc')
                      }
                    }}
                    style={{ fontSize: '12px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Time {traitSalesSortBy === 'recencyAsc' ? '↑' : traitSalesSortBy === 'recencyDesc' ? '↓' : ''}
                  </button>
                  <button
                    className={`bp-btn ${traitSalesSortBy === 'valueAsc' || traitSalesSortBy === 'valueDesc' ? 'active' : ''}`}
                    onClick={() => {
                      // First click = ascending, second click = descending
                      if (traitSalesSortBy === 'valueAsc') {
                        setTraitSalesSortBy('valueDesc')
                      } else {
                        // If not currently sorting by value, or if descending, set to ascending (first click)
                        setTraitSalesSortBy('valueAsc')
                      }
                    }}
                    style={{ fontSize: '12px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Value {traitSalesSortBy === 'valueAsc' ? '↑' : traitSalesSortBy === 'valueDesc' ? '↓' : ''}
                  </button>
                </div>
              </div>
              <div className="bp-card-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                
                {/* Scrollable Container - Images and Data Columns Together */}
                <div 
                  style={{ 
                    flex: 1,
                    overflowX: 'auto', 
                    overflowY: 'auto',
                    minHeight: 0
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    gap: '1px',
                    minWidth: 'min-content',
                    padding: '2px'
                  }}>
                    {sortedSales.map((sale, index) => {
                      const saleDate = sale.soldAtIso ? new Date(sale.soldAtIso) : null
                      const saleRelative = saleDate ? formatRelativeTime(saleDate.getTime(), nowTick) : 'Unknown'
                      const imageUrl = getNftImageUrl(sale.nftId)
                      // Compact column width: 95-100px (just enough for 80px image + padding)
                      const columnWidth = 95
                      // Fixed image size to match Wojak size (80px)
                      const imageSize = 80
                      
                      return (
                        <div 
                          key={`${sale.nftId}-${index}`}
                          style={{
                            flexShrink: 0,
                            width: `${columnWidth}px`,
                            border: '1px solid #c0c0c0',
                            backgroundColor: 'var(--surface)',
                            padding: '2px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            fontSize: '10px'
                          }}
                        >
                          {/* Preview Image at Top */}
                          <div
                            style={{
                              width: `${imageSize}px`,
                              height: `${imageSize}px`,
                              border: '1px solid #c0c0c0',
                              backgroundColor: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              margin: '0 auto 2px auto',
                              flexShrink: 0,
                              padding: '0'
                            }}
                            onClick={() => onNftClick && onNftClick(sale.nftId)}
                            title={`NFT #${sale.nftId}`}
                          >
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={`NFT #${sale.nftId}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  const parent = e.target.parentElement
                                  if (parent) {
                                    parent.innerHTML = `<div style="font-size: 9px; color: #999; text-align: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">#${sale.nftId}</div>`
                                  }
                                }}
                              />
                            ) : (
                              <div style={{ fontSize: '9px', color: '#999', textAlign: 'center', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>#{sale.nftId}</div>
                            )}
                          </div>
                          
                          {/* NFT ID - Compact, no border */}
                          <div style={{ fontSize: '9px', textAlign: 'center', lineHeight: '1.2', marginBottom: '1px' }}>
                            <span 
                              style={{ cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' }}
                              onClick={() => onNftClick && onNftClick(sale.nftId)}
                              title="Click to view NFT"
                            >
                              #{sale.nftId}
                            </span>
                          </div>
                          
                          {/* Inline Price: "1.10 XCH ($5.19)" */}
                          <div style={{ textAlign: 'center', fontSize: '9px', lineHeight: '1.3', fontWeight: 'bold', marginBottom: '1px' }}>
                            {formatPriceXCH(sale.xchEq)} XCH {sale.usdAtSale != null && `(${formatPriceUSD(sale.usdAtSale)})`}
                          </div>
                          
                          {/* Date - Only relative time */}
                          <div style={{ textAlign: 'center', fontSize: '8px', color: '#666', lineHeight: '1.2' }}>
                            {saleRelative}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* All Traits Table (Collapsible) */}
      <div className="bp-card">
        <div 
          className="bp-card-header" 
          style={{ cursor: 'pointer', userSelect: 'none', fontSize: '12px' }}
          onClick={() => setShowAllTraitsTable(!showAllTraitsTable)}
        >
          Browse all traits {showAllTraitsTable ? '▼' : '▶'}
        </div>
        
        {showAllTraitsTable && (
          <div className="bp-card-content">
            {/* Category Filter Only */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <select
                value={traitCategoryFilter || ''}
                onChange={(e) => setTraitCategoryFilter(e.target.value || null)}
                className="bp-select"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e0e0e0' }}>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'left', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '120px',
                        minWidth: '120px',
                        maxWidth: '120px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'category') {
                          setColumnSort({ column: 'category', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'category', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center' }}>
                        {columnSort.column === 'category' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      Category
                    </th>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'left', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '150px',
                        minWidth: '150px',
                        maxWidth: '150px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'trait') {
                          setColumnSort({ column: 'trait', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'trait', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center' }}>
                        {columnSort.column === 'trait' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      Trait
                    </th>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'right', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '100px',
                        minWidth: '100px',
                        maxWidth: '100px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'avgXch') {
                          setColumnSort({ column: 'avgXch', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'avgXch', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center', marginRight: '4px' }}>
                        {columnSort.column === 'avgXch' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      Avg XCH
                    </th>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'right', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '100px',
                        minWidth: '100px',
                        maxWidth: '100px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'minXch') {
                          setColumnSort({ column: 'minXch', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'minXch', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center', marginRight: '4px' }}>
                        {columnSort.column === 'minXch' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      Min XCH
                    </th>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'right', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '100px',
                        minWidth: '100px',
                        maxWidth: '100px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'maxXch') {
                          setColumnSort({ column: 'maxXch', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'maxXch', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center', marginRight: '4px' }}>
                        {columnSort.column === 'maxXch' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      Max XCH
                    </th>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'right', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '90px',
                        minWidth: '90px',
                        maxWidth: '90px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'premium') {
                          setColumnSort({ column: 'premium', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'premium', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center', marginRight: '4px' }}>
                        {columnSort.column === 'premium' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      Premium
                    </th>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'right', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '80px',
                        minWidth: '80px',
                        maxWidth: '80px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'nSales') {
                          setColumnSort({ column: 'nSales', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'nSales', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center', marginRight: '4px' }}>
                        {columnSort.column === 'nSales' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      #Sales
                    </th>
                    <th 
                      style={{ 
                        padding: '5px', 
                        textAlign: 'left', 
                        border: '1px solid #c0c0c0',
                        cursor: 'pointer',
                        userSelect: 'none',
                        width: '100px',
                        minWidth: '100px',
                        maxWidth: '100px'
                      }}
                      onClick={() => {
                        if (columnSort.column === 'recency') {
                          setColumnSort({ column: 'recency', direction: columnSort.direction === 'desc' ? 'asc' : 'desc' })
                        } else {
                          setColumnSort({ column: 'recency', direction: 'desc' })
                        }
                      }}
                      title="Click to sort"
                    >
                      <span style={{ display: 'inline-block', width: '12px', textAlign: 'center' }}>
                        {columnSort.column === 'recency' && (columnSort.direction === 'desc' ? '▼' : '▲')}
                      </span>
                      Recency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allTraitsForTable.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                        No traits found
                      </td>
                    </tr>
                  ) : (
                    allTraitsForTable.map(t => {
                      // ALWAYS calculate premium (floorXch is now guaranteed to have a value)
                      const premium = floorXch && t.stats.avgXch > 0 ? (t.stats.avgXch / floorXch) : null
                      const lastSaleRelative = t.stats.lastSaleAtIso 
                        ? formatRelativeTime(new Date(t.stats.lastSaleAtIso).getTime(), nowTick)
                        : 'Never'
                      
                      // ALWAYS compute USD - xchUsdFallback is guaranteed to be non-null
                      let displayUsd = t.stats.avgUsd
                      let isApproxUsd = t.stats.hasApproxUsd
                      if (displayUsd == null && t.stats.avgXch > 0) {
                        displayUsd = t.stats.avgXch * xchUsdFallback
                        isApproxUsd = true
                      }
                      
                      return (
                        <tr key={t.traitKey} style={{ backgroundColor: '#fff' }}>
                          <td style={{ padding: '5px', border: '1px solid #c0c0c0' }}>{categoryLabels[t.category]}</td>
                          <td 
                            style={{ 
                              padding: '5px', 
                              border: '1px solid #c0c0c0',
                              cursor: 'pointer',
                              color: '#0066cc',
                              textDecoration: 'underline'
                            }}
                            onClick={() => {
                              setSelectedTraitCategory(t.category)
                              setSelectedTraitValue(t.value)
                            }}
                            title="Click to view trait details"
                          >
                            {t.value}
                          </td>
                          <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #c0c0c0' }}>
                            {t.stats.avgXch > 0 ? (
                              <>
                                {formatPriceXCH(t.stats.avgXch)} XCH ({isApproxUsd ? '~' : ''}{formatPriceUSD(displayUsd || (t.stats.avgXch * xchUsdFallback))})
                              </>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #c0c0c0' }}>
                            {t.stats.minXch > 0 ? (
                              <>
                                {formatPriceXCH(t.stats.minXch)} XCH ({formatPriceUSD(t.stats.minXch * xchUsdFallback)})
                              </>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #c0c0c0' }}>
                            {t.stats.maxXch > 0 ? (
                              <>
                                {formatPriceXCH(t.stats.maxXch)} XCH ({formatPriceUSD(t.stats.maxXch * xchUsdFallback)})
                              </>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #c0c0c0' }}>
                            {premium != null ? `${premium.toFixed(2)}×` : 'N/A'}
                          </td>
                          <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #c0c0c0' }}>{t.stats.nSales}</td>
                          <td style={{ padding: '5px', border: '1px solid #c0c0c0', fontSize: '10px', color: '#666' }}>{lastSaleRelative}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const HiddenGem = ({ analysis }) => {
  const gems = []
  const uniqueCount = safeGet(analysis, 'unique_count', 0)
  const sTierCount = safeGet(analysis, 's_tier_count', 0)
  const rank = safeGet(analysis, 'rank', 9999)
  const base = safeGet(analysis, 'base', '')
  const isHeritage = safeGet(analysis, 'is_heritage_base', false)
  
  if (uniqueCount > 0) {
    gems.push({
      icon: '💎',
      text: `${uniqueCount} unique pairing(s) that exist nowhere else.`
    })
  }
  if (sTierCount >= 2 && rank > 420) {
    gems.push({
      icon: '⭐',
      text: `${sTierCount} High Provenance traits but ranked #${rank}. Provenance > rank.`
    })
  }
  if (isHeritage && rank > 500) {
    gems.push({
      icon: '🏛️',
      text: `${base} carries OG heritage weight.`
    })
  }
  
  if (gems.length === 0) {
    return <p>This NFT's value is straightforward: {safeGet(analysis, 'highlight', 'No special highlights')}</p>
  }
  
  return (
    <div className="bp-gems">
      {gems.map((g, i) => (
        <div key={i} className="bp-gem">
          {g.icon} {g.text}
        </div>
      ))}
    </div>
  )
}

