/**
 * API Constants
 *
 * Centralized configuration for all external APIs and collection data.
 */

import { getWojakNftImageUrl } from '@/utils/ipfs';

// ============ Collection Info ============

export const COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
export const COLLECTION_SIZE = 4200;
export const NFT_IPFS_CID = 'bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq';

// ============ Treasury ============

export const WALLET_ADDRESS = 'xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd';
export const WALLET_PUZZLE_HASH = '8f53b331e60904f8ae324b7781ad94ce1d9a4e8a2fbcc33622518a5a24a0e727';
export const WALLET_DISPLAY = WALLET_ADDRESS.slice(0, 10) + '...' + WALLET_ADDRESS.slice(-6);

// Decimals
export const XCH_DECIMALS = 12;
export const CAT_DECIMALS = 3;

// ============ API Base URLs ============

const isDev = import.meta.env.DEV;

// Market APIs - always use proxies to avoid CORS
export const MINTGARDEN_API = isDev ? '/mintgarden-api' : '/api/mintgarden';
export const DEXIE_API = isDev ? '/dexie-api/v1' : '/api/dexie/v1';

// Treasury APIs - always use proxies to avoid CORS
export const SPACESCAN_API = isDev ? '/spacescan-api' : '/api/spacescan';
export const COINGECKO_API = isDev ? '/coingecko-api' : '/api/coingecko';

// Cloudflare Worker (trade data aggregation)
export const WORKER_API = 'https://wojak-mobile-trade-fetcher.abitsolvesthis.workers.dev';

// ============ External Links ============

export const SPACESCAN_WALLET_URL = `https://www.spacescan.io/address/${WALLET_ADDRESS}`;
export const MINTGARDEN_COLLECTION_URL = 'https://mintgarden.io/collections/wojak-farmers-plot-col1xstgvpgp0cl4uepv7t02dvrnrrqm6y4cqvp3urc5y5kd5q9fpafqjfh4a9';

// ============ NFT Image URLs ============

function normalizeEditionNumber(nftId: string | number): number | null {
  const parsed = Number.parseInt(String(nftId), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > COLLECTION_SIZE) {
    return null;
  }

  return parsed;
}

export function getNftImageUrl(nftId: string | number): string {
  const edition = normalizeEditionNumber(nftId);
  if (edition) {
    return `/api/farmers-plot/image/${edition}`;
  }

  return getWojakNftImageUrl(nftId, NFT_IPFS_CID);
}

export function getNftThumbnailUrl(nftId: string | number): string {
  return getNftImageUrl(nftId);
}

// ============ MintGarden URLs ============

export function getMintGardenNftUrl(launcherId: string): string {
  return `https://mintgarden.io/nfts/${launcherId}`;
}

export function getMintGardenSearchUrl(nftId: number): string {
  return `${MINTGARDEN_COLLECTION_URL}?search=${nftId}`;
}

export function getMintGardenWalletUrl(address: string): string {
  return `https://mintgarden.io/addresses/${address}`;
}

// ============ Cache Durations ============

export const CACHE_DURATIONS = {
  listings: 15 * 60 * 1000,           // 15 minutes
  walletData: 6 * 60 * 60 * 1000,     // 6 hours (treasury rarely changes)
  nftHistory: 30 * 60 * 1000,         // 30 minutes
  traitStats: 5 * 60 * 1000,          // 5 minutes
  xchPrice: 30 * 60 * 1000,           // 30 minutes (for treasury display)
  localStorage: 60 * 60 * 1000,       // 1 hour
};

// ============ LocalStorage Keys ============

export const STORAGE_KEYS = {
  listings: 'wojak_listings_cache_v1',
  nftHistory: 'wojak_nft_history_cache_v1',
  walletData: 'wojak_treasury_data',
  walletTimestamp: 'wojak_treasury_timestamp',
  xchPrice: 'wojak_xch_price',
  xchBalance: 'wojak_xch_balance',
};
