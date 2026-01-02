/**
 * Maps traits to sales events that contributed to their value
 * 
 * @param {Object} salesIndex - mintgarden_sales_index_v1.json structure
 * @param {Array} metadata - NFT metadata array from Wojak_Farmers_Plot_metadata_FIXED DRAC.json
 * @returns {Map<string, Array>} traitKey -> [sales events with that trait]
 */

// Category normalization map (matches build script)
const CATEGORY_MAP = {
  'Base': 'base',
  'Clothes': 'clothes',
  'Head': 'head',
  'Face': 'face',
  'Mouth': 'mouth',
  'Face Wear': 'facewear',
  'Background': 'background'
}

/**
 * Build trait key (Category::Trait)
 */
function buildTraitKey(category, trait) {
  return `${category}::${trait}`
}

/**
 * Extract NFT ID from metadata item name (e.g., "Wojak #1234" -> "1234")
 */
function extractNftIdFromMetadata(metadataItem) {
  const name = metadataItem.name || ''
  const match = name.match(/#(\d+)$/)
  return match ? match[1] : null
}

/**
 * Build traits map from metadata: nftId -> { category -> trait }
 */
function buildTraitsById(metadata) {
  const traitsById = {}
  
  if (!Array.isArray(metadata)) {
    return traitsById
  }
  
  for (const item of metadata) {
    const nftId = extractNftIdFromMetadata(item)
    if (!nftId) continue
    
    const traits = {}
    
    if (item.attributes && Array.isArray(item.attributes)) {
      for (const attr of item.attributes) {
        const category = CATEGORY_MAP[attr.trait_type] || attr.trait_type?.toLowerCase()
        if (category && attr.value) {
          traits[category] = attr.value
        }
      }
    }
    
    traitsById[nftId] = traits
  }
  
  return traitsById
}

/**
 * Map sales events to traits
 * 
 * @param {Object} salesIndex - Sales index with events array
 * @param {Array} metadata - NFT metadata array
 * @returns {Map<string, Array>} traitKey -> [{ event, price_xch, timestamp, nft_id, launcher }]
 */
export function buildTraitSalesMap(salesIndex, metadata) {
  const traitSalesMap = new Map()
  
  if (!salesIndex || !salesIndex.events || !Array.isArray(salesIndex.events)) {
    return traitSalesMap
  }
  
  if (!metadata || !Array.isArray(metadata)) {
    return traitSalesMap
  }
  
  // Build traits lookup: nftId -> traits
  const traitsById = buildTraitsById(metadata)
  
  // Process each sale event
  for (const event of salesIndex.events) {
    if (!event.is_valid_price || !event.price_xch) {
      continue // Skip invalid prices
    }
    
    // Map event.internal_id to NFT ID
    // internal_id is the NFT edition number (e.g., "136", "141")
    const nftId = event.internal_id
    
    // Get traits for this NFT
    const traits = traitsById[nftId]
    if (!traits) {
      // NFT not found in metadata, skip
      continue
    }
    
    // Build sale data object
    const saleData = {
      event,
      price_xch: event.price_xch,
      timestamp: event.timestamp,
      nft_id: nftId,
      launcher: event.launcher || null,
      buyer_address: event.buyer_address || null,
      seller_address: event.seller_address || null
    }
    
    // Add this sale to each trait's list
    for (const [category, traitValue] of Object.entries(traits)) {
      if (!traitValue) continue
      
      const traitKey = buildTraitKey(category, traitValue)
      
      if (!traitSalesMap.has(traitKey)) {
        traitSalesMap.set(traitKey, [])
      }
      
      traitSalesMap.get(traitKey).push(saleData)
    }
  }
  
  // Sort each trait's sales by timestamp (newest first)
  for (const [traitKey, sales] of traitSalesMap.entries()) {
    sales.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return timeB - timeA // Newest first
    })
  }
  
  return traitSalesMap
}


