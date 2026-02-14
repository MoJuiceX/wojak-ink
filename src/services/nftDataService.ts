/**
 * NFT Data Service
 *
 * Fetches NFT owner and collection data from MintGarden API.
 */

const MINTGARDEN_API = import.meta.env.DEV ? '/mintgarden-api' : '/api/mintgarden';
const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';

// ============ Types ============

export interface CollectionStats {
  floorPrice: number;
  totalItems: number;
  totalVolume: number;
  tradeCount: number;
  name: string;
  description: string;
  thumbnailUri: string;
}

export interface NFTOwnerInfo {
  address: string;
  name: string | null;
  avatarUri: string | null;
  twitterHandle: string | null;
  profileUrl: string;
}

// ============ Encoded ID Cache ============

const encodedIdCache = new Map<string, string>();

/**
 * Look up the encoded NFT ID from an edition number (1-4200)
 * Uses MintGarden API search
 */
async function getEncodedIdFromEdition(edition: string | number): Promise<string | null> {
  const editionStr = String(edition);

  const cached = encodedIdCache.get(editionStr);
  if (cached) return cached;

  try {
    const url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}/nfts?size=1&search=${editionStr}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const items = data.items || [];

    if (items.length > 0) {
      const encodedId = items[0].encoded_id;
      if (encodedId) {
        encodedIdCache.set(editionStr, encodedId);
        return encodedId;
      }
    }

    return null;
  } catch (error) {
    console.error('[NFTData] Error looking up encoded ID:', error);
    return null;
  }
}

// ============ API Functions ============

/**
 * Fetch collection statistics from MintGarden
 */
export async function fetchCollectionStats(): Promise<CollectionStats> {
  const url = `${MINTGARDEN_API}/collections/${COLLECTION_ID}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`MintGarden collection API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    floorPrice: data.floor ?? data.floor_price ?? 0,
    totalItems: data.nft_count ?? 0,
    totalVolume: data.volume ?? 0,
    tradeCount: data.trade_count ?? 0,
    name: data.name || 'Wojak Farmers Plot',
    description: data.description || '',
    thumbnailUri: data.thumbnail_uri || '',
  };
}

/**
 * Fetch NFT owner by edition number (1-4200)
 * Uses MintGarden events API to find the current owner
 */
export async function fetchNFTOwnerByEdition(edition: string | number): Promise<NFTOwnerInfo | null> {
  const encodedId = await getEncodedIdFromEdition(edition);
  if (!encodedId) {
    console.warn(`[NFTData] Could not find encoded ID for edition ${edition}`);
    return null;
  }

  try {
    // Fetch the latest type=2 event (ownership transfer) for this NFT
    const url = `${MINTGARDEN_API}/nfts/${encodedId}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    const ownerAddress = data.owner_address?.encoded_id || '';
    const owner = data.owner;

    if (!ownerAddress) return null;

    let profileUrl: string;
    if (owner?.name && owner.id) {
      const nameSlug = owner.name.trim().toLowerCase().replace(/\s+/g, '_');
      profileUrl = `https://mintgarden.io/profile/${nameSlug}-${owner.id}`;
    } else {
      profileUrl = `https://www.spacescan.io/address/${ownerAddress}`;
    }

    return {
      address: ownerAddress,
      name: owner?.name || owner?.username || null,
      avatarUri: owner?.avatar_uri || null,
      twitterHandle: owner?.twitter_handle || null,
      profileUrl,
    };
  } catch (error) {
    console.error(`[NFTData] Error fetching owner for edition ${edition}:`, error);
    return null;
  }
}
