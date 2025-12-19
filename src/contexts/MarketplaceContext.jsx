import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getOfferFromDexie } from '../services/mintgardenApi'
import { resolveNFTFromOfferFile } from '../utils/nftResolver'
import { fetchNFTDetails, getNFTThumbnailUrl } from '../services/mintgardenApi'

export const MarketplaceContext = createContext()

// IMPORTANT: Change this password before deploying to production!
const ADMIN_PASSWORD = 'admin123' // Change this to your desired password
const STORAGE_KEYS = {
  IS_ADMIN: 'marketplace_is_admin',
  MARKETPLACE_ENABLED: 'marketplace_enabled',
  OFFER_FILES: 'marketplace_offer_files',
}

// Removed: generateNFTs() and TOKEN_GROUPS - now loaded from CSV

// Parse CSV text with header: group,offerfile,id,tokenId4,ipfsLink,nftId,name,source
// Returns array of NFT entries with: { id, group, offerFile, thumbnail }
const parseOfferFilesCSV = (csvText) => {
  const nftEntries = []
  const offerFiles = {}
  const rawLines = csvText.trim().split('\n')
  const lines = rawLines.map(line => line.trim()).filter(line => line.length > 0)

  if (lines.length === 0) {
    return { nftEntries, offerFiles }
  }

  // Parse header row (case-insensitive, trimmed)
  const header = lines[0]
  const headerParts = header.split(',').map(p => p.trim())
  const headerLower = headerParts.map(p => p.toLowerCase())

  // Find column indexes (case-insensitive matching)
  const groupIdx = headerLower.findIndex(name => name === 'group')
  const idIdx = headerLower.findIndex(name => name === 'id')
  const ipfsLinkIdx = headerLower.findIndex(name => name === 'ipfslink' || name === 'ipfs link')
  const offerFileIdx = headerLower.findIndex(name => name === 'offerfile' || name === 'offer_file' || name === 'offer')
  const nftIdIdx = headerLower.findIndex(name => name === 'nftid' || name === 'nft_id')

  // Validate required columns
  if (groupIdx === -1 || offerFileIdx === -1) {
    console.error('CSV missing required columns: Group and offerfile must be present')
    return { nftEntries, offerFiles }
  }

  // Helper to generate stable hash-based ID when CSV ID is empty
  const hashOfferString = (offer) => {
    let hash = 5381
    for (let i = 0; i < offer.length; i++) {
      hash = ((hash << 5) + hash) + offer.charCodeAt(i)
      hash |= 0
    }
    const unsigned = hash >>> 0
    return unsigned.toString(16).padStart(8, '0')
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
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

    // Extract required fields
    const group = groupIdx < parts.length ? parts[groupIdx].trim().toUpperCase() : null
    const offerFile = offerFileIdx < parts.length ? parts[offerFileIdx].trim() : null

    // Validate offer file
    if (!offerFile || !offerFile.startsWith('offer1')) {
      continue // Skip invalid rows
    }

    // Extract fields
    // Use id column if present, otherwise fallback to hash
    const id = (idIdx !== -1 && idIdx < parts.length && parts[idIdx]) 
      ? parts[idIdx].trim() 
      : `OFFER-${hashOfferString(offerFile)}` // Fallback to hash-based ID
    
    // Extract IPFS link (thumbnail)
    const thumbnail = (ipfsLinkIdx !== -1 && ipfsLinkIdx < parts.length && parts[ipfsLinkIdx])
      ? parts[ipfsLinkIdx].trim()
      : null // Can be empty

    // Extract nftId (for reference, not used as primary ID)
    const nftId = (nftIdIdx !== -1 && nftIdIdx < parts.length && parts[nftIdIdx])
      ? parts[nftIdIdx].trim()
      : null

    // Build entry
    nftEntries.push({
      id, // Stable OFFER-<hash> identifier
      group,
      offerFile,
      thumbnail, // IPFS link for preview image (never override from API)
      nftId, // MintGarden launcher_bech32 (for reference)
    })
    offerFiles[id] = offerFile
  }

  return { nftEntries, offerFiles }
}

// Fixed token groups in preferred order
const PREFERRED_TOKEN_GROUPS = ['PP', 'SP', 'HOA', 'BEPE', 'CHIA', 'NECKCOIN', 'XCH']

// Load offer files from CSV
const loadOfferFilesFromCSV = async () => {
  try {
    // Load from /assets/offers_enriched.csv with cache-busting
    const response = await fetch(`/assets/offers_enriched.csv?v=${Date.now()}`)
    if (!response.ok) {
      console.error(`Failed to load marketplace CSV: ${response.status}`)
      return { nftEntries: [], offerFiles: {} }
    }
    
    const csvText = await response.text()
    return parseOfferFilesCSV(csvText)
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
          
          // Dev-only: Log group counts
          if (import.meta.env.DEV) {
            const groupCounts = csvData.nftEntries.reduce((acc, entry) => {
              acc[entry.group] = (acc[entry.group] || 0) + 1
              return acc
            }, {})
            console.log('[Marketplace] Group counts:', groupCounts)
          }
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
      
      // Step 2: If we have thumbnail from CSV, we can skip MintGarden API for faster loading
      // But we still need basic NFT info, so try to get launcher ID if we don't have it
      let launcherId = nftEntry.nftId || null
      let mintGardenDetails = {}
      let nftName = nftId
      
      // Only fetch from MintGarden if we don't have launcher ID or thumbnail
      if (!nftEntry.thumbnail || !launcherId) {
        // Resolve NFT launcher ID from offer file
        launcherId = launcherId || await resolveNFTFromOfferFile(nftEntry.offerFile)
        
        if (launcherId) {
          // Fetch NFT details from MintGarden
          mintGardenDetails = await fetchNFTDetails(launcherId)
          nftName = mintGardenDetails.data?.metadata_json?.name || mintGardenDetails.name || nftId
        }
      }
      
      // Step 3: Build NFT details object
      // NEVER override thumbnail from CSV - use CSV thumbnail if available, otherwise use API
      const thumbnailUrl = nftEntry.thumbnail || 
        (mintGardenDetails.data?.thumbnail_uri 
          ? mintGardenDetails.data.thumbnail_uri 
          : (launcherId ? getNFTThumbnailUrl(launcherId) : null))
      
      const details = {
        name: nftName,
        thumbnail: thumbnailUrl, // CSV thumbnail takes precedence
        currency: currency || nftEntry.group || 'UNKNOWN',
        launcherId: launcherId,
        offerTaken: isOfferTaken, // Store offer status - this is the key fix!
        offerData: offerData, // Store full offer data for reference
        priceText,
        ...mintGardenDetails, // Include all MintGarden data (may be empty if skipped)
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
    // Return fixed groups in preferred order (CSV is source of truth for grouping)
    return PREFERRED_TOKEN_GROUPS
    
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
  
  // Get NFTs by group - CSV group is the ONLY source of truth for filtering
  const getNFTsByGroup = useCallback((group) => {
    if (!group) return []
    
    // Filter ONLY by CSV group column (never use decoded currency for grouping)
    return nftEntries
      .filter(entry => entry.group === group)
      .map(entry => {
        // Merge CSV entry with API details (enrichment only, doesn't override CSV data)
        const details = nftDetails[entry.id] || {}
        const { id: _id, thumbnail: _thumbnail, ...detailsWithoutIdAndThumbnail } = details
        
        return {
          id: entry.id, // Always use CSV entry ID
          offerFile: entry.offerFile,
          group: entry.group, // CSV group is source of truth
          // CSV thumbnail takes precedence (never override with API thumbnail)
          thumbnail: entry.thumbnail || null,
          name: details.name || entry.id,
          launcherId: details.launcherId,
          ...detailsWithoutIdAndThumbnail, // Include API enrichment (price, currency, etc) but not thumbnail
        }
      })
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


