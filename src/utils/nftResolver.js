import { searchNFTs, getCollectionNFTs, getOfferFromDexie, extractNFTIdsFromDexieOffer } from '../services/mintgardenApi'
import { bech32 } from 'bech32'
import { bech32m as bech32mChia } from 'bech32m-chia'

/**
 * Parse offer file to extract NFT launcher IDs
 * Chia offer files are bech32-encoded and contain CLVM-serialized data
 * This function attempts to extract NFT IDs heuristically
 * @param {string} offerFileString - The offer file string (starts with "offer1")
 * @returns {string[]} - Array of potential NFT launcher IDs (hex format)
 */
function parseOfferFileForNFTIds(offerFileString) {
  try {
    if (!offerFileString || !offerFileString.startsWith('offer1')) {
      return []
    }

    // Decode bech32m - Chia offer files use bech32m (modified bech32), not standard bech32
    // bech32m-chia library handles Chia-specific bech32m encoding
    // Pass a high limit (10000) to handle long offer files
    // bech32mChia is an object with decode and encode methods
    const decoded = bech32mChia.decode(offerFileString, 10000)
    
    let dataHex
    // Check if decode returned an error string
    if (typeof decoded === 'string') {
      if (decoded.includes('Exceeds') || decoded.includes('too short') || decoded.includes('Mixed-case')) {
        throw new Error(`Failed to decode offer file: ${decoded}`)
      }
      // If it's a valid hex string (the decoded data), use it directly
      // The library returns hex string for long data
      dataHex = decoded
    } else {
      // If it's an array of bytes, convert to hex
      const data = Array.isArray(decoded) ? Buffer.from(decoded) : Buffer.from(decoded)
      dataHex = data.toString('hex')
    }
    
    // NFT launcher IDs are 32 bytes (64 hex chars)
    // In Chia offers, the structure is CLVM-serialized, making it complex to parse
    // We'll use a heuristic: look for 32-byte sequences that could be NFT IDs
    // Note: This is not 100% accurate - proper parsing would require CLVM deserialization
    
    const potentialIds = []
    const nftIdLength = 64 // 32 bytes = 64 hex chars
    
    // Strategy: Look for sequences that:
    // 1. Are exactly 32 bytes (64 hex chars)
    // 2. Are valid hex
    // 3. Are not all zeros or all F's (likely not valid IDs)
    // 4. Appear in positions that might indicate NFT IDs in the offer structure
    
    // Scan through the data looking for potential NFT IDs
    for (let i = 0; i <= dataHex.length - nftIdLength; i += 2) { // Step by 2 to avoid overlapping
      const candidate = dataHex.substring(i, i + nftIdLength)
      
      // Basic validation
      if (/^[0-9a-f]{64}$/i.test(candidate)) {
        const allZeros = candidate === '0'.repeat(64)
        const allFs = candidate.toLowerCase() === 'f'.repeat(64)
        
        if (!allZeros && !allFs) {
          potentialIds.push(candidate.toLowerCase())
        }
      }
    }
    
    // Return unique IDs, prioritizing those that appear later (might be more likely to be actual IDs)
    return [...new Set(potentialIds)].reverse()
  } catch (error) {
    console.error('Failed to parse offer file:', error)
    return []
  }
}

/**
 * Convert hex launcher ID to bech32 format (nft1...)
 * @param {string} hexId - Hex string (64 chars, 32 bytes)
 * @returns {string|null} - bech32 encoded launcher ID or null
 */
function hexToBech32Launcher(hexId) {
  try {
    // NFT launcher IDs use bech32 encoding with "nft" prefix
    const data = Buffer.from(hexId, 'hex')
    const words = bech32.toWords(data)
    return bech32.encode('nft', words, 1000)
  } catch (error) {
    console.error('Failed to convert hex to bech32:', error)
    return null
  }
}

/**
 * Resolve NFT from offer file to MintGarden launcher_bech32
 * Strategy: Use Dexie API first to parse offer and extract NFT IDs, then query MintGarden
 * @param {string} offerFileString - The offer file string
 * @returns {Promise<string|null>} - launcher_bech32 or null if not found
 */
export async function resolveNFTFromOfferFile(offerFileString) {
  try {
    if (!offerFileString || !offerFileString.startsWith('offer1')) {
      if (import.meta.env.DEV) {
        console.warn('[NFT Resolver] Invalid offer file format:', offerFileString?.substring(0, 50))
      }
      return null
    }
    
    // Step 1: Query Dexie API to parse the offer file and get offer details
    const offerData = await getOfferFromDexie(offerFileString)
    
    if (offerData) {
      // Step 2: Extract NFT IDs from Dexie offer response
      const nftIds = extractNFTIdsFromDexieOffer(offerData)
      
      if (import.meta.env.DEV && nftIds.length > 0) {
        console.log(`[NFT Resolver] Extracted ${nftIds.length} NFT IDs from Dexie offer`)
      }
      
      if (nftIds.length > 0) {
        // Step 3: Try each NFT ID with MintGarden API
        // Prioritize bech32 IDs (nft1...) as they're definitely NFT IDs
        for (const nftId of nftIds.slice(0, 5)) { // Limit to first 5 to reduce API calls
          try {
            // MintGarden API accepts both hex and bech32 (nft1...) formats
            const response = await fetch(`https://api.mintgarden.io/nfts/${nftId}`)
            if (response.status === 429) {
              // Rate limited - throw error to be caught by retry logic
              throw new Error('429 rate limit')
            }
            if (response.ok) {
              const data = await response.json()
              if (data.id) {
                if (import.meta.env.DEV) {
                  console.log(`[NFT Resolver] Found NFT on MintGarden: ${data.id}`)
                }
                // Return the launcher_bech32 (id field) or encoded_id
                return data.id || data.encoded_id
              }
            }
            // Silently continue on 404 - not all IDs will be valid NFTs
            // Don't log 404s as they're expected for invalid IDs
          } catch (err) {
            // Log network errors in dev mode
            if (import.meta.env.DEV) {
              console.warn(`[NFT Resolver] Error checking NFT ID ${nftId}:`, err.message)
            }
            continue
          }
        }
      } else if (import.meta.env.DEV) {
        console.warn('[NFT Resolver] No NFT IDs extracted from Dexie offer data')
      }
    } else if (import.meta.env.DEV) {
      console.warn('[NFT Resolver] Dexie API returned no offer data')
    }
    
    // Fallback: If Dexie API fails or doesn't return NFT IDs, try heuristic parsing
    if (import.meta.env.DEV) {
      console.log('[NFT Resolver] Attempting heuristic parsing of offer file')
    }
    const potentialIds = parseOfferFileForNFTIds(offerFileString)
    
    if (potentialIds.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[NFT Resolver] No potential IDs found in offer file')
      }
      return null
    }
    
    if (import.meta.env.DEV) {
      console.log(`[NFT Resolver] Found ${potentialIds.length} potential IDs from heuristic parsing`)
    }
    
    // Try each potential ID with MintGarden API
    for (const hexId of potentialIds.slice(0, 10)) {
      try {
        const response = await fetch(`https://api.mintgarden.io/nfts/${hexId}`)
        if (response.status === 429) {
          // Rate limited - throw error to be caught by retry logic
          throw new Error('429 rate limit')
        }
        if (response.ok) {
          const data = await response.json()
          if (data.id) {
            if (import.meta.env.DEV) {
              console.log(`[NFT Resolver] Found NFT via heuristic parsing: ${data.id}`)
            }
            return data.id || data.encoded_id
          }
        }
      } catch (err) {
        // Re-throw rate limit errors so they can be handled by retry logic
        if (err.message.includes('429') || err.message.includes('rate limit')) {
          throw err
        }
        if (import.meta.env.DEV) {
          console.warn(`[NFT Resolver] Error checking hex ID ${hexId.substring(0, 16)}...:`, err.message)
        }
        continue
      }
    }
    
    if (import.meta.env.DEV) {
      console.warn('[NFT Resolver] Failed to resolve NFT from offer file after all attempts')
    }
    return null
  } catch (error) {
    console.error('[NFT Resolver] Failed to resolve NFT from offer file:', error)
    return null
  }
}

/**
 * Resolve marketplace NFT to MintGarden launcher_bech32
 * @param {Object} marketplaceNFT - NFT from marketplace context
 * @param {string} offerFileString - Optional offer file string to parse
 * @returns {Promise<string|null>} - launcher_bech32 or null if not found
 */
export async function resolveNFTToMintGarden(marketplaceNFT, offerFileString = null) {
  try {
    // Strategy 1: If we have an offer file, parse it first
    if (offerFileString && offerFileString.startsWith('offer1')) {
      const launcherId = await resolveNFTFromOfferFile(offerFileString)
      if (launcherId) {
        return launcherId
      }
    }
    
    // Strategy 2: Fallback to search by NFT name
    const searchResults = await searchNFTs(marketplaceNFT.name)
    
    // Try to find exact match
    const exactMatch = searchResults.find(nft => 
      nft.name === marketplaceNFT.name || 
      nft.name.toLowerCase() === marketplaceNFT.name.toLowerCase()
    )
    
    if (exactMatch) {
      return exactMatch.id // launcher_bech32
    }
    
    // If no match found, return null
    return null
  } catch (error) {
    console.error('Failed to resolve NFT to MintGarden:', error)
    return null
  }
}

