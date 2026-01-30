/**
 * BigPulp Intelligence Types
 *
 * Type definitions for the NFT analysis platform.
 */

// ============ NFT Character Types ============

export type CharacterType =
  | 'wojak'
  | 'pepe'
  | 'bobo'
  | 'chad'
  | 'doomer'
  | 'bloomer'
  | 'zoomer'
  | 'coomer'
  | 'other';

// ============ NFT Analysis Types ============

export interface NFTAnalysis {
  nft: NFTBasic;
  rarity: RarityAnalysis;
  market: MarketPosition;
  badges: AnalysisBadge[];
  provenance: ProvenanceInfo;
  rareCombos: RareCombo[];
}

export interface NFTBasic {
  id: string; // e.g., "WFP-0042"
  tokenId: string;
  name: string; // e.g., "Wojak Farmer #0042"
  characterType: CharacterType;
  imageUrl: string;
  thumbnailUrl: string;
  traits?: NFTTrait[];
  // Optional price fields (for listed NFTs)
  priceXch?: number;
  priceUsd?: number;
}

export interface NFTTrait {
  category: string;
  value: string;
}

export interface RarityAnalysis {
  rank: number; // 1-4200
  totalSupply: number; // 4200
  percentile: number; // Top X% (e.g., 5.2)
  score: number; // Computed rarity score

  tier: RarityTier;

  // Position within character type
  typeRank: number; // e.g., rank 12 among Wojaks
  typeTotal: number; // e.g., 800 total Wojaks
}

export type RarityTier = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

export interface MarketPosition {
  isListed: boolean;
  listingPrice?: number; // XCH
  listingPriceUSD?: number;
  floorPrice: number; // XCH
  floorPriceUSD: number;
  estimatedValue?: number; // AI estimated value
  priceVsFloor?: number; // Percentage above/below floor
  lastSale?: {
    price: number;
    date: Date;
  };
}

export interface AnalysisBadge {
  id: string;
  type: BadgeType;
  label: string;
  description: string;
  color: string;
  icon: string; // Lucide icon name or emoji
  priority: number; // Display order (lower = first)
}

export type BadgeType =
  | 'crown-holder' // Top 100 rarest
  | 'special-edition' // Community tribute, etc.
  | 'top-10-percent' // Top 10% rarity
  | 'floor-snipe' // Listed below floor
  | 'whale-territory' // Very high price
  | 'rare-combo' // Has rare trait combination
  | 'high-provenance' // Valuable trait
  | 'virgin-wallet' // Never traded
  | 'og-holder'; // Held since mint

export interface ProvenanceInfo {
  highValueTraits: ProvenanceTrait[];
  traitSynergies: string[]; // Trait combinations that boost value
  historicalSignificance?: string;
}

export interface ProvenanceTrait {
  category: string;
  value: string;
  rarity: number; // Percentage
  valueImpact: 'high' | 'medium' | 'low';
  reason: string; // Why it's valuable
}

export interface RareCombo {
  traits: string[]; // e.g., ["Laser Eyes", "Tang Cap"]
  comboName?: string; // Named combo if exists
  occurrences: number; // How many NFTs have this combo
  valueMultiplier?: number; // Estimated value boost
}

// ============ Market Data Types ============

export interface MarketStats {
  listedCount: number;
  totalSupply: number;
  floorPrice: number; // XCH
  floorPriceUSD: number;
  ceilingPrice: number;
  averagePrice: number;
  medianPrice: number;
  totalVolume: number; // XCH
  totalVolumeUSD: number;
  totalTrades: number;
  marketCap: number; // XCH
  marketCapUSD: number;
  lastUpdated: Date;
}

export interface HeatMapCell {
  rarityBin: RarityBin;
  priceBin: PriceBin;
  count: number; // NFTs in this cell
  nfts: NFTBasic[]; // Actual NFTs (for drill-down)
  intensity: number; // 0-1 for color mapping

  // For accessibility
  label: string; // Screen reader description
}

export interface RarityBin {
  index: number; // 0-9 (10 bins)
  label: string; // e.g., "Top 1%", "Top 10%"
  minRank: number;
  maxRank: number;
}

export interface PriceBin {
  index: number; // 0-7 (8 bins)
  label: string; // e.g., "0-1 XCH", "1-5 XCH"
  minPrice: number;
  maxPrice: number;
}

export type HeatMapViewMode =
  | 'all' // All listings
  | 'sleepy-deals' // Good value (low price, decent rarity)
  | 'delusion-zones' // Overpriced (high price, low rarity)
  | 'floor-snipes' // Near floor price
  | 'whale-territory'; // High price listings

export interface PriceDistribution {
  bins: PriceDistributionBin[];
  totalListed: number;
}

export interface PriceDistributionBin {
  range: string; // e.g., "0-1 XCH"
  minPrice: number;
  maxPrice: number;
  count: number;
  percentage: number;
}

// ============ Attributes Types ============

export interface AttributeStats {
  category: string; // e.g., "Background", "Eyes"
  value: string; // e.g., "Sunset", "Laser Eyes"
  count: number; // Total NFTs with this trait
  rarity: number; // Percentage

  // Market data
  totalSales: number;
  avgPrice: number; // XCH
  minPrice: number;
  maxPrice: number;
  lastSalePrice?: number;
  lastSaleDate?: Date;

  // Recent sales (for expanded view)
  recentSales?: AttributeSale[];
}

export interface AttributeSale {
  nftId: string;
  nftImage: string;
  price: number; // XCH
  date: Date;
  highlight?: 'cheapest' | 'expensive' | 'rarest' | 'newest';
}

export interface AttributeCategory {
  name: string;
  count: number; // Total unique values
  attributes: AttributeStats[];
}

// ============ NFT Sale Types ============

export interface NFTSale {
  nft: NFTBasic;
  price: number; // XCH
  priceUSD: number;
  date: Date;
  buyer?: string;
  seller?: string;
}

// ============ BigPulp Character Types ============

export interface BigPulpState {
  mood: BigPulpMood;
  headVariant: string; // Based on NFT traits
  message: string;
  isTyping: boolean;
  messageQueue: string[]; // Queued messages
}

export type BigPulpMood =
  | 'neutral'
  | 'excited' // Found rare NFT
  | 'thinking' // Analyzing
  | 'impressed' // Top 100
  | 'suspicious' // Overpriced listing
  | 'chill'; // Default browsing

export interface BigPulpResponse {
  message: string;
  mood: BigPulpMood;
  headVariant?: string;
  followUp?: string[]; // Additional messages
}

// ============ Tab Types ============

export type BigPulpTab = 'market' | 'ask' | 'attributes';

// ============ Sort Types ============

export type AttributeSortField =
  | 'value'
  | 'category'
  | 'count'
  | 'rarity'
  | 'totalSales'
  | 'avgPrice'
  | 'minPrice'
  | 'maxPrice'
  | 'lastSaleDate';

export type SortDirection = 'asc' | 'desc';

export interface AttributeSortState {
  field: AttributeSortField;
  direction: SortDirection;
}

// ============ Streaming / AI Response Types ============

export type StreamingStage = 'analyzing' | 'searching' | 'generating' | null;

export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  stage: StreamingStage;
}

export type AIResponseType = 'text' | 'nft-list' | 'stats' | 'chart' | 'suggestion' | 'error';

export interface AIResponse {
  id: string;
  type: AIResponseType;
  content: unknown;
  timestamp: Date;
}

export interface NFTListResponse {
  nfts: Array<{
    id: string;
    name: string;
    image: string;
    price?: number;
    rarity: string;
  }>;
  title?: string;
}

export interface StatsResponse {
  stats: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  response?: AIResponse;
}
