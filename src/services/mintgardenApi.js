import { fetchWithRetry } from '../utils/apiRetry'

const MINTGARDEN_API_BASE = 'https://api.mintgarden.io'
const DEXIE_API_BASE = 'https://api.dexie.space/v1'

// Get NFT by launcher_bech32 - returns NftWithAuctions
export async function fetchNFTDetails(launcherBech32) {
  try {
    const response = await fetchWithRetry(`${MINTGARDEN_API_BASE}/nfts/${launcherBech32}`, {}, {
      maxRetries: 3,
      timeout: 10000,
      baseDelay: 1000,
      retryStatuses: [429, 502, 503, 504] // Retry on rate limits and server errors
    })

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch NFT details:', error)
    
    // Provide user-friendly error messages
    if (error.message.includes('timeout')) {
      throw new Error('Request timed out. Please try again.')
    }
    if (error.message.includes('offline')) {
      throw new Error('You are offline. Please check your internet connection.')
    }
    if (error.message.includes('429')) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.')
    }
    
    throw error
  }
}

// Get NFT thumbnail URL (MintGarden API)
export function getNFTThumbnailUrl(launcherBech32) {
  return `${MINTGARDEN_API_BASE}/nfts/${launcherBech32}/thumbnail`
}

// IPFS base URL for Wojak NFT images
const IPFS_BASE = 'https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link'

/**
 * Extract token ID from MintGarden API response
 * @param {Object} mintGardenData - MintGarden API response
 * @returns {string|null} - Token ID as string or null
 */
function extractTokenIdFromMintGarden(mintGardenData) {
  if (!mintGardenData) {
    if (import.meta.env.DEV) {
      console.warn('[IPFS Thumbnail] No MintGarden data provided')
    }
    return null
  }
  
  const metadataJson = mintGardenData.data?.metadata_json || {}
  const dataObj = mintGardenData.data || {}
  
  // Priority 1: Explicit token_id field from metadata_json
  if (metadataJson.token_id !== undefined && metadataJson.token_id !== null) {
    const tokenId = String(metadataJson.token_id)
    if (import.meta.env.DEV) {
      console.log(`[IPFS Thumbnail] Found token_id in metadata_json: ${tokenId}`)
    }
    return tokenId
  }
  
  // Priority 2: token_id from data object
  if (dataObj.token_id !== undefined && dataObj.token_id !== null) {
    const tokenId = String(dataObj.token_id)
    if (import.meta.env.DEV) {
      console.log(`[IPFS Thumbnail] Found token_id in data object: ${tokenId}`)
    }
    return tokenId
  }
  
  // Priority 3: Extract from metadata_json.image if it contains /####.png
  if (metadataJson.image) {
    const imageMatch = metadataJson.image.match(/\/(\d+)\.png/)
    if (imageMatch && imageMatch[1]) {
      const tokenId = imageMatch[1]
      if (import.meta.env.DEV) {
        console.log(`[IPFS Thumbnail] Extracted token_id from image URL: ${tokenId}`)
      }
      return tokenId
    }
  }
  
  // Priority 4: Extract from metadata_json.name pattern #123 or "NFT #123" or "123"
  if (metadataJson.name) {
    // Try pattern #123 first
    let nameMatch = metadataJson.name.match(/#\s*(\d+)/)
    if (!nameMatch) {
      // Try pattern "NFT 123" or just "123"
      nameMatch = metadataJson.name.match(/\b(\d+)\b/)
    }
    if (nameMatch && nameMatch[1]) {
      const tokenId = nameMatch[1]
      if (import.meta.env.DEV) {
        console.log(`[IPFS Thumbnail] Extracted token_id from name: ${tokenId} (from "${metadataJson.name}")`)
      }
      return tokenId
    }
  }
  
  // Priority 5: edition_number
  if (metadataJson.edition_number !== undefined && metadataJson.edition_number !== null) {
    const tokenId = String(metadataJson.edition_number)
    if (import.meta.env.DEV) {
      console.log(`[IPFS Thumbnail] Found edition_number: ${tokenId}`)
    }
    return tokenId
  }
  
  if (import.meta.env.DEV) {
    console.warn('[IPFS Thumbnail] Could not extract token ID from MintGarden data:', {
      hasMetadataJson: !!mintGardenData.data?.metadata_json,
      hasData: !!mintGardenData.data,
      name: metadataJson.name,
      image: metadataJson.image,
    })
  }
  
  return null
}

/**
 * Extract numeric token ID from NFT name (e.g., "Wojak #123" -> "123")
 * @param {string} nftName - NFT name that may contain token ID
 * @returns {string|null} - Token ID as string or null if not found
 */
export function extractTokenIdFromName(nftName) {
  if (!nftName) return null
  
  // Try pattern #123 first (most common)
  let match = nftName.match(/#\s*(\d+)/)
  if (match && match[1]) {
    return match[1]
  }
  
  // Try pattern "NFT 123" or just standalone number
  match = nftName.match(/\b(\d{1,5})\b/)
  if (match && match[1]) {
    return match[1]
  }
  
  return null
}

/**
 * Create IPFS thumbnail URL directly from token ID (numeric)
 * Format: https://...ipfs.w3s.link/{tokenId4}.png (token ID padded to 4 digits)
 * @param {string|number} tokenId - Numeric token ID (e.g., "123" or 123)
 * @returns {string|null} - IPFS thumbnail URL or null if token ID invalid
 */
export function createIPFSThumbnailUrl(tokenId) {
  if (!tokenId) return null
  
  const tokenIdStr = String(tokenId).trim()
  // Validate it's a numeric string
  if (!/^\d+$/.test(tokenIdStr)) {
    return null
  }
  
  // Pad token ID to 4 digits (e.g., 1 -> 0001, 2345 -> 2345) to match IPFS file naming
  const tokenId4 = tokenIdStr.padStart(4, '0')
  return `${IPFS_BASE}/${tokenId4}.png`
}

/**
 * Get IPFS thumbnail URL for Wojak NFT using token ID from MintGarden
 * Format: https://...ipfs.w3s.link/{tokenId4}.png (token ID padded to 4 digits)
 * @param {Object} mintGardenData - MintGarden API response
 * @returns {string|null} - IPFS thumbnail URL or null if token ID not found
 */
export function getIPFSThumbnailUrl(mintGardenData) {
  const tokenId = extractTokenIdFromMintGarden(mintGardenData)
  if (!tokenId) {
    return null
  }
  return createIPFSThumbnailUrl(tokenId)
}

// Search for NFTs by name/collection
export async function searchNFTs(query) {
  try {
    const response = await fetch(`${MINTGARDEN_API_BASE}/search/nfts?query=${encodeURIComponent(query)}`)
    if (!response.ok) {
      throw new Error(`MintGarden API error: ${response.status}`)
    }
    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Failed to search NFTs:', error)
    throw error
  }
}

// Get collection NFTs (to find NFT by token ID within collection)
export async function getCollectionNFTs(collectionId, options = {}) {
  try {
    const params = new URLSearchParams({
      size: options.size || 50,
      ...(options.search && { search: options.search }),
      ...(options.require_price && { require_price: 'true' }),
    })
    const response = await fetch(`${MINTGARDEN_API_BASE}/collections/${collectionId}/nfts?${params}`)
    if (!response.ok) {
      throw new Error(`MintGarden API error: ${response.status}`)
    }
    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Failed to fetch collection NFTs:', error)
    throw error
  }
}

/**
 * Query Dexie API to get offer details and extract NFT IDs
 * Dexie API accepts POST requests with the offer string
 * @param {string} offerFileString - The offer file string
 * @returns {Promise<Object|null>} - Offer details from Dexie or null
 */
export async function getOfferFromDexie(offerFileString) {
  try {
    const response = await fetch(`${DEXIE_API_BASE}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ offer: offerFileString }),
    })
    
    if (response.status === 429) {
      throw new Error('429 rate limit - Dexie API')
    }
    
    if (!response.ok) {
      throw new Error(`Dexie API error: ${response.status}`)
    }
    
    const data = await response.json()
    if (data.success && data.offer) {
      return data.offer
    }
    
    return null
  } catch (error) {
    console.error('Failed to query Dexie API:', error)
    return null
  }
}

/**
 * Extract NFT launcher IDs from Dexie offer response
 * Only extract IDs from requested/offered arrays, not from involved_coins
 * (involved_coins contains coin IDs, not NFT launcher IDs)
 * @param {Object} offerData - Offer data from Dexie API
 * @returns {string[]} - Array of potential NFT launcher IDs (hex or bech32 format)
 */
export function extractNFTIdsFromDexieOffer(offerData) {
  const nftIds = []
  
  // Prioritize requested and offered arrays - these contain the actual NFT/currency info
  // Skip involved_coins as those are coin IDs, not NFT launcher IDs
  
  // Check requested array for NFT IDs
  if (offerData.requested && Array.isArray(offerData.requested)) {
    for (const item of offerData.requested) {
      // Prioritize bech32 format (nft1...) - these are definitely NFT IDs
      if (item.id && item.id.startsWith('nft1')) {
        nftIds.push(item.id)
      } 
      // Also check for hex format, but only if it looks like an NFT launcher ID
      // (64 hex chars, but we can't be 100% sure without checking MintGarden)
      else if (item.id && item.id.length === 64 && /^[0-9a-f]{64}$/i.test(item.id)) {
        // Only add if it's not XCH (native token)
        if (item.code !== 'XCH') {
          nftIds.push(item.id.toLowerCase())
        }
      }
    }
  }
  
  // Check offered array for NFT IDs
  if (offerData.offered && Array.isArray(offerData.offered)) {
    for (const item of offerData.offered) {
      // Prioritize bech32 format (nft1...) - these are definitely NFT IDs
      if (item.id && item.id.startsWith('nft1')) {
        nftIds.push(item.id)
      }
      // Also check for hex format, but only if it's not XCH
      else if (item.id && item.id.length === 64 && /^[0-9a-f]{64}$/i.test(item.id)) {
        // Only add if it's not XCH (native token)
        if (item.code !== 'XCH') {
          nftIds.push(item.id.toLowerCase())
        }
      }
    }
  }
  
  // Return unique IDs, prioritizing bech32 format
  const uniqueIds = [...new Set(nftIds)]
  // Sort to put bech32 (nft1...) IDs first
  return uniqueIds.sort((a, b) => {
    if (a.startsWith('nft1') && !b.startsWith('nft1')) return -1
    if (!a.startsWith('nft1') && b.startsWith('nft1')) return 1
    return 0
  })
}

