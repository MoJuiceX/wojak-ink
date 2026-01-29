/**
 * Gallery Service
 *
 * Loads real NFT data from metadata.json and rarity.json.
 */

import type { NFT, CharacterType, NFTTrait, RarityTier } from '@/types/nft';
import { getNftImageUrl, COLLECTION_SIZE } from './constants';

// ============ Types ============

interface RawMetadata {
  name: string;
  description: string;
  image: string;
  edition: number;
  date: number;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

// Rarity array format: [rank, score, tier_letter, Base, Face, Mouth, Face Wear, Head, Clothes, Background]
type RarityEntry = [number, number, string, ...string[]];

// ============ Data Cache ============

let metadataCache: RawMetadata[] | null = null;
let rarityCache: Record<string, RarityEntry> | null = null;
const nftCache: Map<string, NFT> = new Map();
const characterCache: Map<CharacterType, NFT[]> = new Map();

// ============ Loaders ============

async function loadMetadata(): Promise<RawMetadata[]> {
  if (metadataCache) return metadataCache;

  const response = await fetch('/assets/nft-data/metadata.json');
  if (!response.ok) {
    throw new Error('Failed to load NFT metadata');
  }

  metadataCache = await response.json();
  return metadataCache!;
}

async function loadRarity(): Promise<Record<string, RarityEntry>> {
  if (rarityCache) return rarityCache;

  const response = await fetch('/assets/nft-data/rarity.json');
  if (!response.ok) {
    throw new Error('Failed to load rarity data');
  }

  rarityCache = await response.json();
  return rarityCache!;
}

// ============ Helpers ============

function getTierFromLetter(letter: string): RarityTier {
  switch (letter.toLowerCase()) {
    case 'l':
      return 'legendary';
    case 'e':
      return 'epic';
    case 'r':
      return 'rare';
    case 'u':
      return 'uncommon';
    default:
      return 'common';
  }
}

function getCharacterTypeFromBase(base: string): CharacterType {
  const normalized = base.toLowerCase().replace(/\s+/g, '-');

  const mapping: Record<string, CharacterType> = {
    'wojak': 'wojak',
    'soyjak': 'soyjak',
    'waifu': 'waifu',
    'baddie': 'baddie',
    'papa-tang': 'papa-tang',
    'monkey-zoo': 'monkey-zoo',
    'bepe-wojak': 'bepe-wojak',
    'bepe-soyjak': 'bepe-soyjak',
    'bepe-waifu': 'bepe-waifu',
    'bepe-baddie': 'bepe-baddie',
    'alien-wojak': 'alien-wojak',
    'alien-soyjak': 'alien-soyjak',
    'alien-waifu': 'alien-waifu',
    'alien-baddie': 'alien-baddie',
  };

  return mapping[normalized] || 'wojak';
}

function convertToNFT(metadata: RawMetadata, rarityData: Record<string, RarityEntry>): NFT {
  const id = String(metadata.edition).padStart(4, '0');
  const rarity = rarityData[String(metadata.edition)];

  // Get base character type from attributes
  const baseAttr = metadata.attributes.find(a => a.trait_type === 'Base');
  const characterType = baseAttr ? getCharacterTypeFromBase(baseAttr.value) : 'wojak';

  // Build traits array
  const traits: NFTTrait[] = metadata.attributes.map(attr => ({
    category: attr.trait_type,
    value: attr.value,
    rarity: 0, // Will be calculated if needed
    count: 0,
  }));

  const rarityRank = rarity ? rarity[0] : COLLECTION_SIZE;
  const rarityScore = rarity ? rarity[1] : 0;
  const rarityTier = rarity ? getTierFromLetter(rarity[2]) : 'common';

  return {
    id: `WFP-${id}`,
    tokenId: id,
    name: metadata.name,
    characterType,
    imageUrl: getNftImageUrl(metadata.edition),
    thumbnailUrl: getNftImageUrl(metadata.edition),
    blurDataUrl: '', // Could add blur hashes later
    rarityRank,
    rarityScore,
    rarityTier,
    traits,
    traitCount: traits.length,
    transactions: [],
    mintedAt: new Date(metadata.date),
    owner: `xch1${id.toString().padStart(4, '0')}mock${Math.random().toString(36).substring(2, 30)}abcd`,
    collection: 'wojak-farmers-plot',
    isSpecialEdition: rarityRank <= 100,
    isCommunityTribute: false,
  };
}

// ============ Service ============

export interface IGalleryService {
  fetchNFTsByCharacter(character: CharacterType): Promise<NFT[]>;
  fetchNFTById(id: string): Promise<NFT | null>;
  searchNFTs(query: string, character?: CharacterType): Promise<NFT[]>;
  fetchAllNFTs(): Promise<NFT[]>;
  prefetchData(): Promise<void>;
  getFirstNImageUrlsPerCharacter(count: number): Promise<Map<CharacterType, string[]>>;
}

class GalleryService implements IGalleryService {
  private initialized = false;

  async prefetchData(): Promise<void> {
    if (this.initialized) return;

    await Promise.all([loadMetadata(), loadRarity()]);
    this.initialized = true;
  }

  async fetchAllNFTs(): Promise<NFT[]> {
    const [metadata, rarity] = await Promise.all([loadMetadata(), loadRarity()]);

    // Build NFT cache if empty
    if (nftCache.size === 0) {
      for (const item of metadata) {
        const nft = convertToNFT(item, rarity);
        nftCache.set(nft.id, nft);
      }
    }

    return Array.from(nftCache.values());
  }

  async fetchNFTsByCharacter(character: CharacterType): Promise<NFT[]> {
    // Check cache first
    if (characterCache.has(character)) {
      return characterCache.get(character)!;
    }

    const allNFTs = await this.fetchAllNFTs();
    const filtered = allNFTs.filter(nft => nft.characterType === character);

    // Sort by rarity rank
    filtered.sort((a, b) => a.rarityRank - b.rarityRank);

    characterCache.set(character, filtered);
    return filtered;
  }

  async fetchNFTById(id: string): Promise<NFT | null> {
    // Normalize ID format
    const normalizedId = id.startsWith('WFP-') ? id : `WFP-${id.padStart(4, '0')}`;

    // Check cache
    if (nftCache.has(normalizedId)) {
      return nftCache.get(normalizedId)!;
    }

    // Load and find
    await this.fetchAllNFTs();
    return nftCache.get(normalizedId) || null;
  }

  async searchNFTs(query: string, character?: CharacterType): Promise<NFT[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Try to parse as NFT number
    const numMatch = q.match(/^#?(\d+)$/);
    if (numMatch) {
      const nft = await this.fetchNFTById(numMatch[1]);
      return nft ? [nft] : [];
    }

    // Search by name or traits
    let nfts: NFT[];
    if (character) {
      nfts = await this.fetchNFTsByCharacter(character);
    } else {
      nfts = await this.fetchAllNFTs();
    }

    return nfts
      .filter(nft => {
        if (nft.name.toLowerCase().includes(q)) return true;
        if (nft.id.toLowerCase().includes(q)) return true;
        return nft.traits.some(t => t.value.toLowerCase().includes(q));
      })
      .slice(0, 50);
  }

  async getFirstNImageUrlsPerCharacter(count: number): Promise<Map<CharacterType, string[]>> {
    const allNFTs = await this.fetchAllNFTs();
    const result = new Map<CharacterType, string[]>();

    // Group NFTs by character type
    const byCharacter = new Map<CharacterType, NFT[]>();
    for (const nft of allNFTs) {
      if (!byCharacter.has(nft.characterType)) {
        byCharacter.set(nft.characterType, []);
      }
      byCharacter.get(nft.characterType)!.push(nft);
    }

    // Get first N image URLs for each character
    for (const [character, nfts] of byCharacter) {
      // Sort by ID to get consistent order
      nfts.sort((a, b) => a.id.localeCompare(b.id));
      const urls = nfts.slice(0, count).map(nft => nft.imageUrl);
      result.set(character, urls);
    }

    return result;
  }
}

// Singleton instance
export const galleryService = new GalleryService();
