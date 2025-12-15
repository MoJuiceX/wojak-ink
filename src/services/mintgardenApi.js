const MINTGARDEN_API_BASE = 'https://api.mintgarden.io'
const DEXIE_API_BASE = 'https://api.dexie.space/v1'

// Get NFT by launcher_bech32 - returns NftWithAuctions
export async function fetchNFTDetails(launcherBech32) {
  try {
    const response = await fetch(`${MINTGARDEN_API_BASE}/nfts/${launcherBech32}`)
    if (!response.ok) {
      throw new Error(`MintGarden API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch NFT details:', error)
    throw error
  }
}

// Get NFT thumbnail URL
export function getNFTThumbnailUrl(launcherBech32) {
  return `${MINTGARDEN_API_BASE}/nfts/${launcherBech32}/thumbnail`
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

