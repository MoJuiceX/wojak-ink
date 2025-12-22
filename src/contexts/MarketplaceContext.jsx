import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { resolveNFTFromOfferFile } from '../utils/nftResolver'
import { getNFTThumbnailUrl, getIPFSThumbnailUrl, createIPFSThumbnailUrl, extractTokenIdFromName, getOfferFromDexie } from '../services/mintgardenApi'

export const MarketplaceContext = createContext()

// IMPORTANT: Change this password before deploying to production!
const ADMIN_PASSWORD = 'admin123' // Change this to your desired password
const STORAGE_KEYS = {
  IS_ADMIN: 'marketplace_is_admin',
  OFFER_FILES: 'marketplace_offer_files',
}

// Constants for hiding sold NFTs - sold NFTs disappear immediately (no delay)
const HIDE_SOLD_AFTER_MS = 0  // 0 = sold NFTs disappear immediately

// Reusable visibility helper (top-level to avoid re-creation)
// If hideAfterMs is 0, sold NFTs disappear immediately (no time delay)
const isNFTVisible = (details, now, hideAfterMs) => {
  if (details?.offerTaken !== true) return true
  if (!Number.isFinite(details?.soldAtMs)) return true
  // If hideAfterMs is 0, hide immediately (soldAtMs is in the past)
  if (hideAfterMs === 0) return false
  return (now - details.soldAtMs) <= hideAfterMs
}

// Removed: generateNFTs() and TOKEN_GROUPS - now loaded from CSV

// Helper to generate stable hash-based ID from offer string
const hashOfferString = (offer) => {
  let hash = 5381
  for (let i = 0; i < offer.length; i++) {
    hash = ((hash << 5) + hash) + offer.charCodeAt(i)
    hash |= 0
  }
  const unsigned = hash >>> 0
  return unsigned.toString(16).padStart(8, '0')
}

// Compute fingerprint (djb2 hash) of CSV content for cache busting
const computeCSVFingerprint = (csvText) => {
  let hash = 5381
  for (let i = 0; i < csvText.length; i++) {
    hash = ((hash << 5) + hash) + csvText.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

// Parse CSV text - supports 2-column format (no header): GROUP,offer1...
// Returns array of NFT entries with: { id, group, offerFile, thumbnail, nftId }
const parseOfferFilesCSV = (csvText) => {
  const nftEntries = []
  const offerFiles = {}
  const rawLines = csvText.trim().split('\n')
  const lines = rawLines.map(line => line.trim()).filter(line => line.length > 0)

  if (lines.length === 0) {
    return { nftEntries, offerFiles }
  }

  // Check if first line is a header (contains "group" or "offerfile" case-insensitive)
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('group') || firstLine.includes('offerfile') || firstLine.includes('offer_file')
  const startIdx = hasHeader ? 1 : 0

  // Parse data rows (skip header if present)
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Handle CSV values that may contain commas (quoted values)
    const parts = []
    let current = ''
    let inQuotes = false
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"'
          j++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    parts.push(current.trim()) // Add last part

    // Extract group (column 0) and offerFile (column 1)
    const group = parts.length > 0 ? parts[0].trim().toUpperCase() : null
    const offerFile = parts.length > 1 ? parts[1].trim() : null

    // Validate required fields
    if (!group || !offerFile || !offerFile.startsWith('offer1')) {
      continue // Skip invalid rows
    }

    // Generate stable ID from offer file hash
    const id = `OFFER-${hashOfferString(offerFile)}`

    // Build entry (thumbnail and nftId will be null, populated from API later)
    nftEntries.push({
      id, // Stable OFFER-<hash> identifier
      group,
      offerFile,
      thumbnail: null, // Will be populated from API
      nftId: null, // Will be populated from API
    })
    offerFiles[id] = offerFile
  }

  return { nftEntries, offerFiles }
}

// Fixed token groups in preferred order - only XCH is active, others are all sold
const PREFERRED_TOKEN_GROUPS = ['XCH']

// Marketplace CSV configuration
const MARKETPLACE_CSV_URL = '/assets/images/newestoffers.csv'
const FINGERPRINT_KEY = 'marketplace_csv_fingerprint'

// Load offer files from CSV with fingerprint-based cache busting
// Returns { nftEntries, offerFiles, fingerprintChanged }
const loadOfferFilesFromCSV = async () => {
  try {
    // Fetch with no-store to always get fresh content
    const response = await fetch(MARKETPLACE_CSV_URL, { cache: 'no-store' })
    if (!response.ok) {
      console.error(`Failed to load marketplace CSV: ${response.status}`)
      return { nftEntries: [], offerFiles: {}, fingerprintChanged: false }
    }
    
    const csvText = await response.text()
    
    // Compute fingerprint of current CSV
    const currentFingerprint = computeCSVFingerprint(csvText)
    const storedFingerprint = localStorage.getItem(FINGERPRINT_KEY)
    const fingerprintChanged = storedFingerprint && storedFingerprint !== String(currentFingerprint)
    
    // If fingerprint changed, clear localStorage caches
    if (fingerprintChanged) {
      localStorage.removeItem(STORAGE_KEYS.OFFER_FILES)
      console.log('[Marketplace] CSV fingerprint changed, cleared localStorage caches')
    }
    
    // Parse CSV
    const parsed = parseOfferFilesCSV(csvText)
    
    // Store new fingerprint only after successful parse
    localStorage.setItem(FINGERPRINT_KEY, String(currentFingerprint))
    
    return { ...parsed, fingerprintChanged }
  } catch (err) {
    console.error('Failed to load offer files from CSV:', err)
    return { nftEntries: [], offerFiles: {}, fingerprintChanged: false }
  }
}

export function MarketplaceProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true'
  })
  const [offerFiles, setOfferFiles] = useState({})
  const [nftEntries, setNftEntries] = useState([]) // NFT entries from CSV
  const [nftDetails, setNftDetails] = useState({}) // Map of nftId -> { name, thumbnail, currency, launcherId, ... }
  const [nftDetailsLoading, setNftDetailsLoading] = useState(new Set()) // Set of NFT IDs currently loading
  const [nftDetailsErrors, setNftDetailsErrors] = useState({}) // Map of nftId -> error message
  const requestCacheRef = useRef(new Map()) // In-memory cache for API requests with TTL
  const pendingRequestsRef = useRef(new Map()) // Track pending requests (for loading state only, throttling handled by queue)
  
  // MintGarden API rate limiting constants
  const MG_CONCURRENCY = 2 // Max concurrent MintGarden API requests
  const MG_MIN_DELAY_MS = 500 // Minimum delay between starting requests (ms)
  const MG_MAX_RETRIES = 4 // Max retry attempts for rate-limited requests
  const MG_BACKOFF_CAP_MS = 15000 // Maximum backoff delay (ms)
  const MG_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours cache TTL (or "forever" for static metadata)
  
  // Throttled request queue for MintGarden API calls
  const mgQueueRef = useRef({
    queue: [],           // Array of { fn, resolve, reject, key }
    activeCount: 0,      // Number of active requests
    nextStartAt: 0,      // Timestamp when next request can start
    timerId: null,       // Track single scheduled timer
  })

  // Load NFT entries and offer files from CSV on mount
  useEffect(() => {
    const loadNFTData = async () => {
      try {
        // Load ONLY from CSV - no localStorage merge
        const csvData = await loadOfferFilesFromCSV()
        
        // Clear in-memory caches if fingerprint changed
        if (csvData.fingerprintChanged) {
          // Clear all in-memory caches
          requestCacheRef.current = new Map()
          pendingRequestsRef.current.clear()
          mgQueueRef.current.queue = []
          mgQueueRef.current.activeCount = 0
          mgQueueRef.current.nextStartAt = 0
          if (mgQueueRef.current.timerId) {
            clearTimeout(mgQueueRef.current.timerId)
            mgQueueRef.current.timerId = null
          }
          setNftDetails({})
          setNftDetailsErrors({})
          setNftDetailsLoading(new Set())
        }
        
        if (csvData.nftEntries && csvData.nftEntries.length > 0) {
          setNftEntries(csvData.nftEntries)
          
          // Dev-only: Log parsing results
          if (import.meta.env.DEV) {
            const groupCounts = csvData.nftEntries.reduce((acc, entry) => {
              acc[entry.group] = (acc[entry.group] || 0) + 1
              return acc
            }, {})
            console.log('[Marketplace] Loaded CSV:', {
              totalRows: csvData.nftEntries.length,
              groupCounts,
              sampleEntries: csvData.nftEntries.slice(0, 2).map(e => ({
                id: e.id,
                group: e.group,
                offerFilePrefix: e.offerFile.substring(0, 20) + '...'
              }))
            })
          }
        }
        
        // Set offer files from CSV ONLY (no merge with localStorage)
        if (csvData.offerFiles && Object.keys(csvData.offerFiles).length > 0) {
          setOfferFiles(csvData.offerFiles)
          // Cache in localStorage for performance, but CSV is source of truth
          localStorage.setItem(STORAGE_KEYS.OFFER_FILES, JSON.stringify(csvData.offerFiles))
        }
      } catch (err) {
        console.error('Failed to initialize NFT data:', err)
      }
    }
    
    loadNFTData()
  }, [])

  // Persist admin state
  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem(STORAGE_KEYS.IS_ADMIN, 'true')
    } else {
      localStorage.removeItem(STORAGE_KEYS.IS_ADMIN)
    }
  }, [isAdmin])


  // Persist offer files (cache only - CSV is source of truth)
  useEffect(() => {
    // Only persist if we have a valid fingerprint match
    const storedFingerprint = localStorage.getItem(FINGERPRINT_KEY)
    if (storedFingerprint && Object.keys(offerFiles).length > 0) {
      localStorage.setItem(STORAGE_KEYS.OFFER_FILES, JSON.stringify(offerFiles))
    }
  }, [offerFiles])

  const loginAsAdmin = useCallback((password) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      return true
    }
    return false
  }, [])

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false)
  }, [])

  const setOfferFile = useCallback((nftId, offerFile) => {
    setOfferFiles((prev) => {
      const newFiles = { ...prev, [nftId]: offerFile }
      return newFiles
    })
  }, [])

  const removeOfferFile = useCallback((nftId) => {
    setOfferFiles((prev) => {
      const newFiles = { ...prev }
      delete newFiles[nftId]
      return newFiles
    })
  }, [])

  const getOfferFile = useCallback((nftId) => {
    const result = offerFiles[nftId] || null
    return result
  }, [offerFiles])

  // Check cache with TTL (in-memory + localStorage)
  const getCachedResult = useCallback((cacheKey) => {
    // Check in-memory cache first
    const cached = requestCacheRef.current.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < MG_CACHE_TTL) {
      return cached.data
    }
    if (cached) {
      requestCacheRef.current.delete(cacheKey)
    }
    
    // Check localStorage cache
    try {
      const storageKey = `mg_cache_${cacheKey}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.timestamp && Date.now() - parsed.timestamp < MG_CACHE_TTL) {
          // Restore to in-memory cache
          requestCacheRef.current.set(cacheKey, parsed)
          return parsed.data
        } else {
          // Expired, remove from localStorage
          localStorage.removeItem(storageKey)
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Marketplace] Error reading cache from localStorage:', err)
      }
    }
    
    return null
  }, [])

  // Set cache with TTL (in-memory + localStorage)
  const setCachedResult = useCallback((cacheKey, data, options = { persist: true }) => {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    }
    
    // Store in-memory cache (always)
    requestCacheRef.current.set(cacheKey, cacheEntry)
    
    // Only store in localStorage if persist option is true
    // MintGarden raw responses (mintgarden_${launcher}) are large and can hit quota
    // Final nft-${id} details are smaller and safe to store
    if (options.persist !== false) {
      try {
        const storageKey = `mg_cache_${cacheKey}`
        localStorage.setItem(storageKey, JSON.stringify(cacheEntry))
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[Marketplace] Error writing cache to localStorage:', err)
        }
      }
    }
  }, [])

  // Robust queue scheduler with single timer management
  const runQueue = useCallback(() => {
    const queue = mgQueueRef.current
    const now = Date.now()
    
    // Clear any existing timer (idempotent)
    if (queue.timerId) {
      clearTimeout(queue.timerId)
      queue.timerId = null
    }
    
    // Stop if at capacity
    if (queue.activeCount >= MG_CONCURRENCY) {
      return
    }
    
    // Stop if queue empty
    if (queue.queue.length === 0) {
      return
    }
    
    // Enforce minimum delay
    if (now < queue.nextStartAt) {
      const delay = queue.nextStartAt - now
      if (import.meta.env.DEV) {
        console.log(`[Marketplace Queue] Waiting ${delay}ms before next request (min delay: ${MG_MIN_DELAY_MS}ms, active: ${queue.activeCount}/${MG_CONCURRENCY}, queued: ${queue.queue.length})`)
      }
      queue.timerId = setTimeout(runQueue, delay)
      return
    }
    
    // Start as many jobs as allowed (while loop)
    while (queue.activeCount < MG_CONCURRENCY && queue.queue.length > 0) {
      const item = queue.queue.shift()
      if (!item) break
      
      queue.activeCount++
      queue.nextStartAt = Date.now() + MG_MIN_DELAY_MS
      
      if (import.meta.env.DEV) {
        console.log(`[Marketplace Queue] Starting request (key: ${item.key}, active: ${queue.activeCount}/${MG_CONCURRENCY}, queued: ${queue.queue.length})`)
      }
      
      // Execute the request
      Promise.resolve(item.fn())
        .then((result) => {
          queue.activeCount--
          item.resolve(result)
          runQueue() // Schedule next batch
        })
        .catch((error) => {
          queue.activeCount--
          item.reject(error)
          runQueue() // Schedule next batch
        })
    }
    
    // If more items queued and we have capacity, schedule another run
    if (queue.queue.length > 0 && queue.activeCount < MG_CONCURRENCY) {
      queue.timerId = setTimeout(runQueue, 0)
    }
  }, [])

  // Generic queue function for both Dexie and MintGarden calls
  const queueRequest = useCallback(async (fn, key) => {
    return new Promise((resolve, reject) => {
      const queue = mgQueueRef.current
      queue.queue.push({ fn, resolve, reject, key })
      
      // Trigger queue processing if not already running
      if (queue.activeCount < MG_CONCURRENCY && !queue.timerId) {
        runQueue()
      }
    })
  }, [runQueue])

  // Throttled wrapper for Dexie API calls
  const fetchOfferFromDexieThrottled = useCallback(async (offerFile) => {
    const cacheKey = `dexie_${hashOfferString(offerFile)}`
    
    // Check cache first
    const cached = getCachedResult(cacheKey)
    if (cached) {
      if (import.meta.env.DEV) {
        console.log(`[Marketplace] Cache hit for Dexie: ${cacheKey}`)
      }
      return cached
    }
    
    // Queue the request
    return queueRequest(async () => {
      const result = await getOfferFromDexie(offerFile)
      if (result) {
        setCachedResult(cacheKey, result)
      }
      return result
    }, cacheKey)
  }, [getCachedResult, setCachedResult, queueRequest])

  // Wrapper for fetchNFTDetails with throttling, caching, and retry logic
  const fetchNFTDetailsThrottled = useCallback(async (launcherBech32) => {
    const cacheKey = `mintgarden_${launcherBech32}`
    
    // Check cache first (in-memory only for MintGarden raw responses)
    const cached = getCachedResult(cacheKey)
    if (cached) {
      if (import.meta.env.DEV) {
        console.log(`[Marketplace] Cache hit for MintGarden: ${launcherBech32.substring(0, 20)}...`)
      }
      return cached
    }
    
    // Queue the request with retry logic inside
    return queueRequest(async () => {
      // Retry loop: for-loop instead of while-loop (per requirements)
      let lastStatus = null
      for (let attempt = 0; attempt <= MG_MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(`https://api.mintgarden.io/nfts/${launcherBech32}`)
          lastStatus = response.status
          
          // Handle retryable HTTP errors with exponential backoff
          // Retry only for: 429 (rate limit), 502 (bad gateway), 503 (service unavailable), 504 (gateway timeout)
          const isRetryableStatus = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504
          
          if (isRetryableStatus) {
            let retryDelay = MG_BACKOFF_CAP_MS
            
            // Check Retry-After header
            const retryAfter = response.headers.get('Retry-After')
            if (retryAfter) {
              const retryAfterSeconds = parseInt(retryAfter, 10)
              if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
                retryDelay = Math.min(retryAfterSeconds * 1000, MG_BACKOFF_CAP_MS)
              }
            } else {
              // Exponential backoff: 1000ms * 2^attempt, capped
              retryDelay = Math.min(1000 * Math.pow(2, attempt), MG_BACKOFF_CAP_MS)
            }
            
            if (attempt < MG_MAX_RETRIES) {
              if (import.meta.env.DEV) {
                console.warn(`[Marketplace] Retryable error (${response.status}) for ${launcherBech32.substring(0, 20)}..., retrying after ${retryDelay}ms (attempt ${attempt + 1}/${MG_MAX_RETRIES + 1})`)
              }
              await new Promise(resolve => setTimeout(resolve, retryDelay))
              continue // Retry next iteration
            } else {
              // Max retries exceeded - use actual status code in error
              throw new Error(`${response.status} - MintGarden API (max retries reached)`)
            }
          }
          
          // Non-retryable HTTP errors (400, 404, etc.) - throw immediately, don't retry
          if (!response.ok) {
            throw new Error(`MintGarden API error: ${response.status}`)
          }
          
          const data = await response.json()
          
          // Cache successful response (in-memory only, no localStorage)
          setCachedResult(cacheKey, data, { persist: false })
          
          if (import.meta.env.DEV && attempt > 0) {
            console.log(`[Marketplace] Successfully fetched MintGarden details after ${attempt} retries: ${launcherBech32.substring(0, 20)}...`)
          }
          
          return data
        } catch (error) {
          // catch block handles network errors (when fetch throws) - these are retryable
          // Non-retryable HTTP errors (400/404/etc) are thrown above and will propagate without retry
          // Check if this is a non-retryable HTTP error we threw (contains 'MintGarden API error' but not retryable status)
          const isNonRetryableHttpError = error.message?.includes('MintGarden API error') && 
            !error.message?.includes('429') && 
            !error.message?.includes('502') && 
            !error.message?.includes('503') && 
            !error.message?.includes('504')
          
          if (isNonRetryableHttpError) {
            // Non-retryable HTTP error - throw immediately, don't retry
            console.error('Failed to fetch NFT details:', error)
            throw error
          }
          
          // Network error (fetch threw) or max retries error - retry if we haven't exceeded max
          if (attempt < MG_MAX_RETRIES) {
            const retryDelay = Math.min(1000 * Math.pow(2, attempt), MG_BACKOFF_CAP_MS)
            if (import.meta.env.DEV) {
              console.warn(`[Marketplace] Network error fetching MintGarden (${launcherBech32.substring(0, 20)}...): ${error.message}, retrying after ${retryDelay}ms (attempt ${attempt + 1}/${MG_MAX_RETRIES + 1})`)
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            continue
          }
          
          // Max retries exceeded
          console.error('Failed to fetch NFT details:', error)
          throw error
        }
      }
      
      // Should never reach here, but if it does, use lastStatus if available
      const statusMsg = lastStatus ? `${lastStatus}` : 'unknown'
      throw new Error(`${statusMsg} - MintGarden API (max retries reached)`)
    }, cacheKey)
  }, [getCachedResult, setCachedResult, queueRequest])

  // Fetch NFT details lazily for a given NFT ID with caching and batching
  const fetchNFTDetailsForId = useCallback(async (nftId) => {
    // Check if already loaded
    if (nftDetails[nftId]) {
      return nftDetails[nftId]
    }
    
    // Check cache
    const cacheKey = `nft-${nftId}`
    const cached = getCachedResult(cacheKey)
    if (cached) {
      setNftDetails(prev => ({ ...prev, [nftId]: cached }))
      
      // If cached NFT is sold and past threshold, remove it immediately
      const now = Date.now()
      if (cached.offerTaken && cached.soldAtMs && Number.isFinite(cached.soldAtMs)) {
        const ageMs = now - cached.soldAtMs
        if (ageMs > HIDE_SOLD_AFTER_MS) {
          setNftEntries(prev => prev.filter(entry => entry.id !== nftId))
          setOfferFiles(prev => {
            const next = { ...prev }
            delete next[nftId]
            return next
          })
          if (import.meta.env.DEV) {
            console.log(`[Marketplace] Removed sold NFT from marketplace (cached): id=${nftId}, age=${Math.round(ageMs / 1000 / 60)}min`)
          }
        }
      }
      
      return cached
    }
    
    // Check if currently loading (prevent duplicate fetches)
    if (nftDetailsLoading.has(nftId)) {
      return null // Return null if already loading, don't start another fetch
    }
    
    // Get NFT entry from CSV data
    const nftEntry = nftEntries.find(entry => entry.id === nftId)
    if (!nftEntry || !nftEntry.offerFile) {
      return null
    }
    
    // Check pending requests (prevent duplicate concurrent fetches for same NFT)
    if (pendingRequestsRef.current.has(nftId)) {
      return null
    }
    
    // Mark as loading and pending
    setNftDetailsLoading(prev => new Set(prev).add(nftId))
    pendingRequestsRef.current.set(nftId, nftEntry)
    
    try {
      // Step 1: Get offer details from Dexie API (includes currency info, price, and status)
      const offerData = await fetchOfferFromDexieThrottled(nftEntry.offerFile)
      
      // Check if offer is taken/completed
      // Dexie API status: 0 = pending/active, other values = completed/taken
      // Also check date_completed field
      const isOfferTaken = offerData ? (offerData.status !== 0 || offerData.date_completed !== null) : false
      
      // Parse and normalize sold timestamp (soldAtMs) - do this ONCE here
      let soldAtMs = null
      if (isOfferTaken && offerData?.date_completed) {
        const dateCompleted = offerData.date_completed
        
        if (typeof dateCompleted === 'string') {
          const ms = Date.parse(dateCompleted)
          soldAtMs = Number.isFinite(ms) ? ms : null
        } else if (typeof dateCompleted === 'number') {
          // Handle seconds vs milliseconds
          // Timestamps > 10_000_000_000 are likely milliseconds (year 2286+)
          // Timestamps < 10_000_000_000 are likely seconds (year 2001-2286)
          soldAtMs = dateCompleted > 10_000_000_000 ? dateCompleted : dateCompleted * 1000
        }
        
        // Validate the final value is a finite positive number
        if (!Number.isFinite(soldAtMs) || soldAtMs <= 0) {
          soldAtMs = null
        }
      }
      
      // Extract currency symbol(s) from Dexie offer response
      // Handle multiple currencies (e.g., offers with 2+ tokens)
      let currency = null
      let currencies = [] // Track all currencies
      if (offerData) {
        // Check requested array for currency codes
        if (offerData.requested && Array.isArray(offerData.requested)) {
          offerData.requested.forEach(item => {
            if (item.code) {
              currencies.push(item.code)
            }
          })
        }
        // Check offered array for currency codes
        if (offerData.offered && Array.isArray(offerData.offered)) {
          offerData.offered.forEach(item => {
            if (item.code) {
              currencies.push(item.code)
            }
          })
        }
        
        // Use first currency, or join multiple currencies
        const uniqueCurrencies = [...new Set(currencies)]
        if (uniqueCurrencies.length > 0) {
          currency = uniqueCurrencies.length === 1 
            ? uniqueCurrencies[0] 
            : uniqueCurrencies.join(',') // Multiple currencies
        }
      }

      // Build human-readable price text from Dexie offer data
      let priceText = null
      if (offerData) {
        const formatTokens = (items = []) => {
          return items
            .filter(item => item && item.amount && item.code)
            .map(item => {
              const amountNum = parseFloat(item.amount)
              const amountStr = Number.isFinite(amountNum)
                ? amountNum.toLocaleString()
                : String(item.amount)
              return `${amountStr} ${item.code}`
            })
        }

        // Most marketplaces treat "requested" as what the buyer pays.
        const requestedTokens = formatTokens(offerData.requested || [])
        const offeredTokens = formatTokens(offerData.offered || [])

        const tokens = requestedTokens.length > 0 ? requestedTokens : offeredTokens
        if (tokens.length > 0) {
          priceText = tokens.join(' + ')
        }
      }
      
      // Step 2: Create IPFS thumbnail URL from MintGarden metadata (same approach as modal)
      // Flow: Skip if thumbnail exists → Resolve launcher ID → Fetch MintGarden metadata → Extract token ID from name → Create IPFS URL
      // IMPORTANT: Skip MintGarden API calls if we already have a thumbnail/IPFS link to reduce API load
      let thumbnailUrl = nftEntry.thumbnail // Start with CSV thumbnail if available
      let nftName = nftId
      let launcherId = nftEntry.nftId || null
      let mintGardenDetails = {}
      
      // Step 2a: Only fetch MintGarden metadata if we don't have a thumbnail yet
      // This significantly reduces API calls since many NFTs already have thumbnails from CSV
      if (!thumbnailUrl && nftEntry.offerFile) {
        try {
          // Resolve launcher ID from offer file
          if (!launcherId) {
            launcherId = await resolveNFTFromOfferFile(nftEntry.offerFile)
            if (import.meta.env.DEV && launcherId) {
              console.log(`[Marketplace] Resolved launcher ID for ${nftId}: ${launcherId.substring(0, 20)}...`)
            }
          }
          
          // Fetch MintGarden metadata using throttled queue (with caching and retry logic)
          if (launcherId) {
            mintGardenDetails = await fetchNFTDetailsThrottled(launcherId)
            nftName = mintGardenDetails.data?.metadata_json?.name || mintGardenDetails.name || nftId
            
            if (import.meta.env.DEV) {
              console.log(`[Marketplace] Fetched MintGarden details for ${nftId}, name: ${nftName}`)
            }
            
            // Extract token ID from MintGarden metadata name and create IPFS URL (same as modal)
            thumbnailUrl = getIPFSThumbnailUrl(mintGardenDetails)
            if (import.meta.env.DEV && thumbnailUrl) {
              console.log(`[Marketplace] Generated IPFS thumbnail for ${nftId} from MintGarden metadata: ${thumbnailUrl}`)
            } else if (import.meta.env.DEV && !thumbnailUrl) {
              console.warn(`[Marketplace] Could not extract token ID from MintGarden metadata for ${nftId}`)
            }
          }
        } catch (error) {
          // Handle rate limits gracefully - preview will show without thumbnail
          if (import.meta.env.DEV) {
            const errorMsg = error.message || String(error)
            if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
              console.warn(`[Marketplace] Rate limited while fetching thumbnail for ${nftId}, skipping preview (error handled by retry logic)`)
            } else {
              console.warn(`[Marketplace] Error fetching thumbnail for ${nftId}:`, error.message)
            }
          }
          // Continue without thumbnail - preview will show placeholder
          // Note: Error is not stored in nftDetailsErrors here to avoid spam
        }
      } else if (import.meta.env.DEV && thumbnailUrl) {
        console.log(`[Marketplace] Skipping MintGarden API call for ${nftId} - already have thumbnail`)
      }
      
      const details = {
        name: nftName,
        thumbnail: thumbnailUrl, // CSV thumbnail takes precedence
        currency: currency || nftEntry.group || 'UNKNOWN',
        launcherId: launcherId,
        offerTaken: isOfferTaken, // Store offer status
        soldAtMs: soldAtMs, // Normalized timestamp in milliseconds (null if not sold or invalid)
        offerData: offerData, // Store full offer data for reference
        priceText,
        ...mintGardenDetails, // Include all MintGarden data (may be empty if skipped)
      }
      
      // Update state and cache
      setNftDetails(prev => ({ ...prev, [nftId]: details }))
      setCachedResult(cacheKey, details)
      
      // If NFT is sold and past the threshold, remove it from nftEntries immediately
      // This prevents it from showing in the marketplace and avoids future API calls
      const now = Date.now()
      if (isOfferTaken && soldAtMs && Number.isFinite(soldAtMs)) {
        const ageMs = now - soldAtMs
        if (ageMs > HIDE_SOLD_AFTER_MS) {
          // Remove from nftEntries - sold and past threshold
          setNftEntries(prev => prev.filter(entry => entry.id !== nftId))
          // Also remove from offerFiles
          setOfferFiles(prev => {
            const next = { ...prev }
            delete next[nftId]
            return next
          })
          if (import.meta.env.DEV) {
            console.log(`[Marketplace] Removed sold NFT from marketplace: id=${nftId}, age=${Math.round(ageMs / 1000 / 60)}min`)
          }
        }
      }
      
      setNftDetailsLoading(prev => {
        const next = new Set(prev)
        next.delete(nftId)
        return next
      })
      pendingRequestsRef.current.delete(nftId)
      
      return details
    } catch (error) {
      const errorMsg = error.message || String(error)
      console.error(`Failed to fetch NFT details for ${nftId}:`, error)
      
      // Store error and clear loading state
      setNftDetailsErrors(prev => ({ ...prev, [nftId]: errorMsg }))
      setNftDetailsLoading(prev => {
        const next = new Set(prev)
        next.delete(nftId)
        return next
      })
      pendingRequestsRef.current.delete(nftId)
      
      // For rate limit errors, retry will be handled on next call (see check above)
      // For other errors, we'll keep the error state
      
      return null
    }
  }, [nftEntries, nftDetails, nftDetailsLoading, nftDetailsErrors, fetchOfferFromDexieThrottled, fetchNFTDetailsThrottled, getCachedResult, setCachedResult, getIPFSThumbnailUrl])

  // Note: Rate limiting, retries, and throttling are now handled by the throttled queue system
  // No periodic retry interval needed - retries happen automatically within the queue
  
  // Helper to count visible NFTs per group (without calling getNFTsByGroup)
  const getVisibleCountByGroup = useCallback(() => {
    const now = Date.now()
    const counts = Object.fromEntries(PREFERRED_TOKEN_GROUPS.map(g => [g, 0]))

    for (const entry of nftEntries) {
      const group = entry.group
      if (!counts.hasOwnProperty(group)) continue

      const details = nftDetails[entry.id] || {}
      
      // Use shared visibility helper with details
      // Note: entry doesn't have merged offerTaken/soldAtMs, so we rely on nftDetails
      if (isNFTVisible(details, now, HIDE_SOLD_AFTER_MS)) {
        counts[group] += 1
      }
    }

    return counts
  }, [nftEntries, nftDetails])

  // Get token groups dynamically - only return groups with visible NFTs
  const getTokenGroups = useCallback(() => {
    const counts = getVisibleCountByGroup()
    return PREFERRED_TOKEN_GROUPS.filter(g => (counts[g] || 0) > 0)
  }, [getVisibleCountByGroup])
  
  // Get NFTs by group - CSV group is the ONLY source of truth for filtering
  const getNFTsByGroup = useCallback((group) => {
    if (!group) return []
    
    const now = Date.now()
    
    // Filter ONLY by CSV group column (never use decoded currency for grouping)
    return nftEntries
      .filter(entry => entry.group === group)
      .map(entry => {
        // Merge CSV entry with API details (enrichment only, doesn't override CSV data)
        const details = nftDetails[entry.id] || {}
        const { id: _id, thumbnail: _detailsThumbnail, ...detailsWithoutIdAndThumbnail } = details
        
        return {
          id: entry.id, // Always use CSV entry ID
          offerFile: entry.offerFile,
          group: entry.group, // CSV group is source of truth
          // CSV thumbnail takes precedence, but use API thumbnail if CSV doesn't have one
          thumbnail: entry.thumbnail || _detailsThumbnail || null,
          name: details.name || entry.id,
          launcherId: details.launcherId,
          ...detailsWithoutIdAndThumbnail, // Include API enrichment (price, currency, etc) but handle thumbnail explicitly above
        }
      })
      .filter(nft => {
        // Always use nftDetails as source of truth (reactive state, always up-to-date)
        // The nft object from map() is for display, but filtering uses nftDetails state
        const details = nftDetails[nft.id]
        
        // If details haven't loaded yet, show the NFT (optimistic - assume available until we know otherwise)
        if (!details) {
          return true
        }
        
        const isVisible = isNFTVisible(details, now, HIDE_SOLD_AFTER_MS)
        
        // Dev-only: Log hidden NFTs for debugging
        if (import.meta.env.DEV && !isVisible) {
          console.log(`[Marketplace] Hiding NFT: id=${nft.id}, offerTaken=${details.offerTaken}, soldAtMs=${details.soldAtMs}, age=${details.soldAtMs ? Math.round((now - details.soldAtMs) / 1000 / 60) : 'N/A'}min, group=${group}`)
        }
        
        return isVisible
      })
  }, [nftEntries, nftDetails])

  // Compute token groups safely (wrap in try-catch to prevent provider from failing)
  const tokenGroupsValue = useMemo(() => {
    try {
      return getTokenGroups()
    } catch (error) {
      console.error('[Marketplace] Error computing token groups:', error)
      return []
    }
  }, [getTokenGroups])

  // Memoize context value to prevent unnecessary re-renders
  // Wrap in try-catch to ensure we always return a valid context value
  const contextValue = useMemo(() => {
    try {
      return {
        isAdmin,
        loginAsAdmin,
        logoutAdmin,
        nftEntries, // NFT entries from CSV
        getNFTsByGroup: getNFTsByGroup || (() => []),
        getTokenGroups: getTokenGroups || (() => []),
        offerFiles,
        setOfferFile,
        removeOfferFile,
        getOfferFile,
        fetchNFTDetailsForId: fetchNFTDetailsForId || (async () => null),
        nftDetails, // Fetched NFT details
        nftDetailsLoading, // Loading state
        nftDetailsErrors, // Error state
        // Backward compatibility
        nfts: nftEntries, // Alias for backward compatibility
        TOKEN_GROUPS: tokenGroupsValue || [], // Computed groups for backward compatibility
      }
    } catch (error) {
      console.error('[Marketplace] Error creating context value:', error)
      // Return minimal valid context value as fallback
      return {
        isAdmin: false,
        loginAsAdmin: () => false,
        logoutAdmin: () => {},
        nftEntries: [],
        getNFTsByGroup: () => [],
        getTokenGroups: () => [],
        offerFiles: {},
        setOfferFile: () => {},
        removeOfferFile: () => {},
        getOfferFile: () => null,
        fetchNFTDetailsForId: async () => null,
        nftDetails: {},
        nftDetailsLoading: new Set(),
        nftDetailsErrors: {},
        nfts: [],
        TOKEN_GROUPS: [],
      }
    }
  }, [
    isAdmin,
    loginAsAdmin,
    logoutAdmin,
    nftEntries,
    getNFTsByGroup,
    getTokenGroups,
    offerFiles,
    setOfferFile,
    removeOfferFile,
    getOfferFile,
    fetchNFTDetailsForId,
    nftDetails,
    nftDetailsLoading,
    nftDetailsErrors,
    tokenGroupsValue,
  ])

  return (
    <MarketplaceContext.Provider value={contextValue}>
      {children}
    </MarketplaceContext.Provider>
  )
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext)
  if (!context) {
    throw new Error('useMarketplace must be used within MarketplaceProvider')
  }
  return context
}


