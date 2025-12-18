import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getOfferFromDexie } from '../services/mintgardenApi'
import { resolveNFTFromOfferFile } from '../utils/nftResolver'
import { fetchNFTDetails, getNFTThumbnailUrl } from '../services/mintgardenApi'

const MarketplaceContext = createContext()

// IMPORTANT: Change this password before deploying to production!
const ADMIN_PASSWORD = 'admin123' // Change this to your desired password
const STORAGE_KEYS = {
  IS_ADMIN: 'marketplace_is_admin',
  MARKETPLACE_ENABLED: 'marketplace_enabled',
  OFFER_FILES: 'marketplace_offer_files',
}

// Removed: generateNFTs() and TOKEN_GROUPS - now loaded from CSV

// Parse CSV text into array of NFT entries and map of id -> offerFile
// Supports both legacy format (nftId,offerFile,group) and new simple formats:
// - Header + one column: "offerFile"
// - No header, one offer string per line
const parseOfferFilesCSV = (csvText) => {
  const nftEntries = []
  const offerFiles = {}
  const rawLines = csvText.trim().split('\n')
  const lines = rawLines.map(line => line.trim()).filter(line => line.length > 0)

  if (lines.length === 0) {
    return { nftEntries, offerFiles }
  }

  const header = lines[0]
  const hasComma = header.includes(',')

  // Helper to generate stable synthetic IDs when CSV doesn't provide one
  let syntheticCounter = 0
  const nextSyntheticId = () => {
    syntheticCounter += 1
    return `OFFER-${String(syntheticCounter).padStart(4, '0')}`
  }

  // Case 1: No commas at all -> treat as simple list of offer files
  if (!hasComma) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lower = line.toLowerCase()

      // If the first line looks like a header ("offerfile"), skip it
      if (i === 0 && (lower === 'offerfile' || lower === 'offer')) {
        continue
      }

      const offerFile = line
      if (!offerFile) continue

      const id = nextSyntheticId()
      nftEntries.push({
        id,
        offerFile,
        group: null,
      })
      offerFiles[id] = offerFile
    }

    return { nftEntries, offerFiles }
  }

  // Case 2: Comma-separated with a header row
  const headerParts = header.split(',').map(p => p.trim())
  const headerLower = headerParts.map(p => p.toLowerCase())

  const offerFileIdx = headerLower.findIndex(
    (name) => name === 'offerfile' || name === 'offer' || name === 'offer_file'
  )
  const nftIdIdx = headerLower.findIndex(
    (name) => name === 'nftid' || name === 'id'
  )
  const groupIdx = headerLower.findIndex(
    (name) => name === 'group' || name === 'currency'
  )

  // Case 2a: New headered format with an explicit offerFile column
  if (offerFileIdx !== -1) {
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue

      const parts = line.split(',').map(p => p.trim())
      if (parts.length <= offerFileIdx) continue

      const offerFile = parts[offerFileIdx]
      if (!offerFile) continue

      let id = null
      if (nftIdIdx !== -1 && parts.length > nftIdIdx) {
        id = parts[nftIdIdx] || null
      }

      const group =
        groupIdx !== -1 && parts.length > groupIdx
          ? (parts[groupIdx] || null)
          : null

      if (!id) {
        id = nextSyntheticId()
      }

      nftEntries.push({
        id,
        offerFile,
        group,
      })
      offerFiles[id] = offerFile
    }

    return { nftEntries, offerFiles }
  }

  // Case 2b: Legacy format with positional columns: nftId,offerFile,group
  // Keep existing behavior for backward compatibility.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const parts = line.split(',').map(p => p.trim())
    if (parts.length < 2) continue

    const nftId = parts[0]
    const offerFile = parts[1]
    const group = parts[2] || null

    if (nftId && offerFile) {
      nftEntries.push({
        id: nftId,
        offerFile,
        group,
      })
      offerFiles[nftId] = offerFile
    }
  }

  return { nftEntries, offerFiles }
}

// Load offer files from CSV
// Note: This will be replaced with dynamic import at runtime
let csvTextCache = null

const loadOfferFilesFromCSV = async () => {
  try {
    if (csvTextCache) {
      return parseOfferFilesCSV(csvTextCache)
    }
    
    // Try to import CSV as raw text using Vite's ?raw suffix
    try {
      const csvModule = await import('../data/offerFiles.csv?raw')
      csvTextCache = csvModule.default
      return parseOfferFilesCSV(csvTextCache)
    } catch (importError) {
      // Fallback: try fetching from public folder
      const response = await fetch('/offerFiles.csv')
      if (response.ok) {
        csvTextCache = await response.text()
        return parseOfferFilesCSV(csvTextCache)
      }
      throw new Error('CSV file not found')
    }
  } catch (err) {
    console.error('Failed to load offer files from CSV:', err)
    return { nftEntries: [], offerFiles: {} }
  }
}

export function MarketplaceProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true'
  })
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.MARKETPLACE_ENABLED) === 'true'
  })
  const [offerFiles, setOfferFiles] = useState({})
  const [nftEntries, setNftEntries] = useState([]) // NFT entries from CSV
  const [nftDetails, setNftDetails] = useState({}) // Map of nftId -> { name, thumbnail, currency, launcherId, ... }
  const [nftDetailsLoading, setNftDetailsLoading] = useState(new Set()) // Set of NFT IDs currently loading
  const [nftDetailsErrors, setNftDetailsErrors] = useState({}) // Map of nftId -> error message
  const requestCacheRef = useRef(new Map()) // Cache for API requests with TTL
  const pendingRequestsRef = useRef(new Map()) // Track pending requests to batch/debounce
  const batchTimeoutRef = useRef(null)
  const MAX_CONCURRENT_REQUESTS = 5
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const BATCH_DELAY = 100 // 100ms batching window

  // Load NFT entries and offer files from CSV on mount
  useEffect(() => {
    const loadNFTData = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.OFFER_FILES)
        let offerFilesMap = {}
        
        if (stored) {
          const parsed = JSON.parse(stored)
          // Check if parsed object has any keys - if empty, load from CSV
          if (Object.keys(parsed).length > 0) {
            offerFilesMap = parsed
          }
        }
        
        // Always load from CSV to get NFT entries and ensure offer files are up to date
        const csvData = await loadOfferFilesFromCSV()
        
        if (csvData.nftEntries && csvData.nftEntries.length > 0) {
          setNftEntries(csvData.nftEntries)
        }
        
        // Merge CSV offer files with stored ones (CSV takes precedence)
        const mergedOfferFiles = { ...offerFilesMap, ...csvData.offerFiles }
        if (Object.keys(mergedOfferFiles).length > 0) {
          setOfferFiles(mergedOfferFiles)
          localStorage.setItem(STORAGE_KEYS.OFFER_FILES, JSON.stringify(mergedOfferFiles))
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

  // Persist marketplace enabled state
  useEffect(() => {
    if (marketplaceEnabled) {
      localStorage.setItem(STORAGE_KEYS.MARKETPLACE_ENABLED, 'true')
    } else {
      localStorage.removeItem(STORAGE_KEYS.MARKETPLACE_ENABLED)
    }
  }, [marketplaceEnabled])

  // Persist offer files
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OFFER_FILES, JSON.stringify(offerFiles))
  }, [offerFiles])

  const loginAsAdmin = (password) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      return true
    }
    return false
  }

  const logoutAdmin = () => {
    setIsAdmin(false)
  }

  const setOfferFile = (nftId, offerFile) => {
    setOfferFiles((prev) => {
      const newFiles = { ...prev, [nftId]: offerFile }
      return newFiles
    })
  }

  const removeOfferFile = (nftId) => {
    setOfferFiles((prev) => {
      const newFiles = { ...prev }
      delete newFiles[nftId]
      return newFiles
    })
  }

  const getOfferFile = (nftId) => {
    const result = offerFiles[nftId] || null
    return result
  }

  // Check cache with TTL
  const getCachedResult = useCallback((cacheKey) => {
    const cached = requestCacheRef.current.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    if (cached) {
      requestCacheRef.current.delete(cacheKey)
    }
    return null
  }, [])

  // Set cache with TTL
  const setCachedResult = useCallback((cacheKey, data) => {
    requestCacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
    })
  }, [])

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
      return cached
    }
    
    // Check if currently loading (prevent duplicate fetches)
    if (nftDetailsLoading.has(nftId)) {
      return null // Return null if already loading, don't start another fetch
    }
    
    // Check if there was an error (don't retry immediately)
    if (nftDetailsErrors[nftId]) {
      return null
    }
    
    // Get NFT entry from CSV data
    const nftEntry = nftEntries.find(entry => entry.id === nftId)
    if (!nftEntry || !nftEntry.offerFile) {
      return null
    }
    
    // Check pending requests
    if (pendingRequestsRef.current.has(nftId)) {
      return null
    }
    
    // Limit concurrent requests
    if (pendingRequestsRef.current.size >= MAX_CONCURRENT_REQUESTS) {
      // Queue for later
      pendingRequestsRef.current.set(nftId, nftEntry)
      
      // Process queue after delay
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
      batchTimeoutRef.current = setTimeout(() => {
        const queued = Array.from(pendingRequestsRef.current.entries())
        pendingRequestsRef.current.clear()
        queued.forEach(([id, entry]) => {
          fetchNFTDetailsForId(id).catch(() => {})
        })
      }, BATCH_DELAY)
      
      return null
    }
    
    // Mark as loading and pending
    setNftDetailsLoading(prev => new Set(prev).add(nftId))
    pendingRequestsRef.current.set(nftId, nftEntry)
    
    try {
      // Step 1: Get offer details from Dexie API (includes currency info, price, and status)
      const offerData = await getOfferFromDexie(nftEntry.offerFile)
      
      // Check if offer is taken/completed
      // Dexie API status: 0 = pending/active, other values = completed/taken
      // Also check date_completed field
      const isOfferTaken = offerData ? (offerData.status !== 0 || offerData.date_completed !== null) : false
      
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
      
      // Step 2: Resolve NFT launcher ID from offer file
      const launcherId = await resolveNFTFromOfferFile(nftEntry.offerFile)
      
      if (!launcherId) {
        throw new Error('Could not resolve NFT from offer file')
      }
      
      // Step 3: Fetch NFT details from MintGarden
      const mintGardenDetails = await fetchNFTDetails(launcherId)
      
      // Step 4: Build NFT details object
      // Use MintGarden thumbnail URL - prefer thumbnail_uri from data, fallback to API endpoint
      const thumbnailUrl = mintGardenDetails.data?.thumbnail_uri 
        ? mintGardenDetails.data.thumbnail_uri 
        : getNFTThumbnailUrl(launcherId)
      
      const details = {
        name: mintGardenDetails.data?.metadata_json?.name || mintGardenDetails.name || nftId,
        thumbnail: thumbnailUrl,
        currency: currency || nftEntry.group || 'UNKNOWN',
        launcherId: launcherId,
        offerTaken: isOfferTaken, // Store offer status
        offerData: offerData, // Store full offer data for reference
        priceText,
        ...mintGardenDetails, // Include all MintGarden data
      }
      
      // Update state and cache
      setNftDetails(prev => ({ ...prev, [nftId]: details }))
      setCachedResult(cacheKey, details)
      setNftDetailsLoading(prev => {
        const next = new Set(prev)
        next.delete(nftId)
        return next
      })
      pendingRequestsRef.current.delete(nftId)
      
      return details
    } catch (error) {
      console.error(`Failed to fetch NFT details for ${nftId}:`, error)
      
      // Store error and clear loading state
      setNftDetailsErrors(prev => ({ ...prev, [nftId]: error.message }))
      setNftDetailsLoading(prev => {
        const next = new Set(prev)
        next.delete(nftId)
        return next
      })
      pendingRequestsRef.current.delete(nftId)
      
      return null
    }
  }, [nftEntries, nftDetails, nftDetailsLoading, nftDetailsErrors])
  
  // Get token groups dynamically from currency symbols (preferred) or CSV group column (fallback)
  const getTokenGroups = useCallback(() => {
    const groups = new Set()
    
    // First, collect groups from fetched NFT details (currency symbols from API)
    // This is the preferred source as it comes from the actual offer files
    Object.values(nftDetails).forEach(details => {
      if (details.currency && details.currency !== 'UNKNOWN') {
        groups.add(details.currency)
      }
    })
    
    // Only add CSV groups for entries that haven't been fetched yet
    // This prevents showing groups that will be replaced by API currency
    nftEntries.forEach(entry => {
      const details = nftDetails[entry.id]
      // Only use CSV group if we don't have fetched details for this entry
      if (!details && entry.group) {
        groups.add(entry.group)
      }
    })
    
    // Return sorted array
    return Array.from(groups).sort()
  }, [nftDetails, nftEntries])
  
  // Get NFTs by group, merging CSV data with API details
  const getNFTsByGroup = useCallback((group) => {
    if (!group) return []
    
    const filtered = nftEntries
      .filter(entry => {
        // Check if we have fetched details with currency
        const details = nftDetails[entry.id]
        
        // If we have fetched details, use the currency from API
        if (details) {
          // Only include if currency matches and is not UNKNOWN
          if (details.currency && details.currency !== 'UNKNOWN') {
            return details.currency === group
          }
          // If we have details but currency is UNKNOWN or missing, exclude it
          // (it's being fetched or failed, don't show it yet)
          return false
        }
        
        // Only use CSV group as fallback if we haven't fetched details yet
        // This allows showing NFTs while they're loading, but they'll be filtered
        // out once their currency is fetched if it doesn't match
        if (entry.group) {
          return entry.group === group
        }
        
        return false
      })
      .map(entry => {
        // Merge CSV entry with API details
        const details = nftDetails[entry.id] || {}
        // Extract token number from ID (e.g., "HOA-001" -> 1)
        const tokenIdMatch = entry.id.match(/-(\d+)$/)
        const tokenId = tokenIdMatch ? parseInt(tokenIdMatch[1]) : 1
        
        // Extract details but preserve the CSV entry ID (don't let launcher ID overwrite it)
        const { id: _, ...detailsWithoutId } = details
        
        return {
          id: entry.id, // Always use CSV entry ID, not launcher ID
          offerFile: entry.offerFile,
          group: details.currency || entry.group,
          name: details.name || entry.id,
          thumbnail: details.thumbnail,
          launcherId: details.launcherId,
          tokenId: tokenId, // Add tokenId for backward compatibility
          ...detailsWithoutId, // Include all API details except id
        }
      })
    
    return filtered
  }, [nftEntries, nftDetails])

  return (
    <MarketplaceContext.Provider
      value={{
        isAdmin,
        marketplaceEnabled,
        setMarketplaceEnabled,
        loginAsAdmin,
        logoutAdmin,
        nftEntries, // NFT entries from CSV
        getNFTsByGroup,
        getTokenGroups, // Dynamic groups function
        offerFiles,
        setOfferFile,
        removeOfferFile,
        getOfferFile,
        fetchNFTDetailsForId, // Lazy fetch function
        nftDetails, // Fetched NFT details
        nftDetailsLoading, // Loading state
        nftDetailsErrors, // Error state
        // Backward compatibility
        nfts: nftEntries, // Alias for backward compatibility
        TOKEN_GROUPS: getTokenGroups(), // Computed groups for backward compatibility
      }}
    >
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


