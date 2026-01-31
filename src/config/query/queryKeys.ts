/**
 * Query Key Factories
 *
 * Hierarchical keys for cache management:
 * - ['nfts'] → all NFT queries
 * - ['nfts', 'list'] → all list queries
 * - ['nfts', 'detail', '123'] → specific NFT
 */

import type {
  NFTFilters,
  ListingFilters,
  TimePeriod,
} from '@/types/domain';

// ============================================
// NFT QUERIES
// ============================================

export const nftKeys = {
  // Base key for all NFT queries
  all: ['nfts'] as const,

  // Lists with optional filters
  lists: () => [...nftKeys.all, 'list'] as const,
  list: (filters?: NFTFilters) => [...nftKeys.lists(), filters ?? {}] as const,

  // Infinite scroll list
  infinite: (filters?: NFTFilters) =>
    [...nftKeys.all, 'infinite', filters ?? {}] as const,

  // Single NFT details
  details: () => [...nftKeys.all, 'detail'] as const,
  detail: (id: string) => [...nftKeys.details(), id] as const,

  // NFT traits
  traits: (id: string) => [...nftKeys.detail(id), 'traits'] as const,

  // NFT transaction history
  history: (id: string) => [...nftKeys.detail(id), 'history'] as const,

  // Search results
  search: (query: string) => [...nftKeys.all, 'search', query] as const,
} as const;

// ============================================
// MARKET QUERIES
// ============================================

export const marketKeys = {
  all: ['market'] as const,

  listings: () => [...marketKeys.all, 'listings'] as const,
  listingsList: (filters?: ListingFilters) =>
    [...marketKeys.listings(), filters ?? {}] as const,

  stats: () => [...marketKeys.all, 'stats'] as const,
  floorPrice: () => [...marketKeys.all, 'floor'] as const,
  priceHistory: (period?: TimePeriod) =>
    [...marketKeys.all, 'priceHistory', period ?? 'all'] as const,
  heatmap: () => [...marketKeys.all, 'heatmap'] as const,
} as const;

// ============================================
// WALLET QUERIES
// ============================================

export const walletKeys = {
  all: ['wallet'] as const,

  // Wallet by address
  byAddress: (address: string) => [...walletKeys.all, address] as const,
  balance: (address: string) =>
    [...walletKeys.byAddress(address), 'balance'] as const,
  nfts: (address: string) =>
    [...walletKeys.byAddress(address), 'nfts'] as const,

  // Global token prices
  tokenPrices: () => [...walletKeys.all, 'tokenPrices'] as const,
} as const;

// ============================================
// TRAIT QUERIES
// ============================================

export const traitKeys = {
  all: ['traits'] as const,

  list: () => [...traitKeys.all, 'list'] as const,
  rarity: (traitType: string, traitValue: string) =>
    [...traitKeys.all, 'rarity', traitType, traitValue] as const,
  sales: (traitType: string, traitValue: string) =>
    [...traitKeys.all, 'sales', traitType, traitValue] as const,
} as const;

// ============================================
// LEADERBOARD QUERIES
// ============================================

export type GameId =
  | 'orange-stack'
  | 'memory-match'
  | 'orange-pong'
  | 'wojak-runner'
  | 'orange-juggle'
  | 'orange-slice'
  | 'knife-game'
  | 'color-reaction'
  | 'merge-2048'
  | 'orange-wordle'
  | 'wojak-whack'
  | 'block-puzzle'
  | 'flappy-orange'
  | 'orange-snake'
  | 'brick-breaker'
  | 'citrus-drop';

export const leaderboardKeys = {
  all: ['leaderboard'] as const,

  // Leaderboard for a specific game
  game: (gameId: string) => [...leaderboardKeys.all, gameId] as const,

  // Top 10 for game
  top10: (gameId: string) => [...leaderboardKeys.game(gameId), 'top10'] as const,

  // Extended leaderboard (top 100)
  extended: (gameId: string) => [...leaderboardKeys.game(gameId), 'extended'] as const,
} as const;
