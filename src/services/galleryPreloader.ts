/**
 * Gallery Preloader Service
 *
 * Pre-downloads NFT images during boot sequence so they load instantly.
 * Uses deterministic "random" queues - we know what images will be shown
 * before the user sees them, so we can preload them in advance.
 */

import { getNftImageUrl } from './constants';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  edition: number;
  attributes: { trait_type: string; value: string }[];
}

// The 14 base characters
const BASE_NAMES = [
  'Wojak', 'Soyjak', 'Waifu', 'Baddie', 'Papa Tang', 'Monkey Zoo',
  'Bepe Wojak', 'Bepe Soyjak', 'Bepe Waifu', 'Bepe Baddie',
  'Alien Wojak', 'Alien Soyjak', 'Alien Waifu', 'Alien Baddie'
];

// Pre-generated random queues for each base (what the user will see)
const randomQueues: Map<string, NFTMetadata[]> = new Map();

// NFTs grouped by base
const nftsByBase: Map<string, NFTMetadata[]> = new Map();

// Track preloaded images
const preloadedImages = new Set<string>();

// Track loading state
let isInitialized = false;
let isPreloading = false;
let allNfts: NFTMetadata[] = [];

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Preload a single image
 */
function preloadImage(url: string): Promise<void> {
  if (preloadedImages.has(url)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      preloadedImages.add(url);
      resolve();
    };
    img.onerror = () => {
      // Still resolve - don't block on failed images
      resolve();
    };
    img.src = url;
  });
}

/**
 * Preload multiple images with concurrency limit
 */
async function preloadImages(urls: string[], concurrency: number = 4): Promise<void> {
  const queue = [...urls];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (url) await preloadImage(url);
      }
    })());
  }

  await Promise.all(workers);
}

/**
 * Generate random queue for a base (pre-determine what "random" will show)
 */
function generateQueue(base: string, size: number = 30): NFTMetadata[] {
  const baseNfts = nftsByBase.get(base) || [];
  return shuffleArray(baseNfts).slice(0, size);
}

/**
 * Refill a base's queue if running low
 */
function refillQueue(base: string, minSize: number = 10): void {
  const queue = randomQueues.get(base) || [];
  if (queue.length < minSize) {
    const newItems = generateQueue(base, 30);
    randomQueues.set(base, [...queue, ...newItems]);

    // Preload the new items in background
    const urls = newItems.map(nft => nft.image);
    preloadImages(urls, 2);
  }
}

/**
 * Initialize the preloader - call this during app startup
 */
export async function initGalleryPreloader(): Promise<void> {
  if (isInitialized) return;

  try {
    // Load NFT metadata
    const response = await fetch('/assets/nft-data/metadata.json');
    const rawMetadata = await response.json() as NFTMetadata[];
    allNfts = rawMetadata.map((nft) => ({
      ...nft,
      image: getNftImageUrl(nft.edition),
    }));

    // Group by base
    BASE_NAMES.forEach(base => {
      nftsByBase.set(base, []);
    });

    allNfts.forEach(nft => {
      const baseAttr = nft.attributes.find(a => a.trait_type === 'Base');
      if (baseAttr && nftsByBase.has(baseAttr.value)) {
        nftsByBase.get(baseAttr.value)!.push(nft);
      }
    });

    // Generate initial random queues for each base
    BASE_NAMES.forEach(base => {
      randomQueues.set(base, generateQueue(base, 30));
    });

    isInitialized = true;
  } catch (error) {
    console.error('[GalleryPreloader] Failed to initialize:', error);
  }
}

/**
 * Start aggressive preloading - call this during boot sequence
 */
export async function startPreloading(): Promise<void> {
  if (isPreloading || !isInitialized) return;
  isPreloading = true;


  // Collect first 10 images from each base's queue (140 images total)
  const priorityUrls: string[] = [];

  BASE_NAMES.forEach(base => {
    const queue = randomQueues.get(base) || [];
    queue.slice(0, 10).forEach(nft => {
      priorityUrls.push(nft.image);
    });
  });

  // Preload with 6 concurrent connections
  await preloadImages(priorityUrls, 6);

}

/**
 * Get the next "random" NFT for a base (from pre-loaded queue)
 */
export function getNextRandom(base: string): NFTMetadata | null {
  const queue = randomQueues.get(base);
  if (!queue || queue.length === 0) {
    refillQueue(base);
    return nftsByBase.get(base)?.[0] || null;
  }

  const nft = queue.shift()!;

  // Refill queue in background if running low
  if (queue.length < 10) {
    setTimeout(() => refillQueue(base), 0);
  }

  return nft;
}

/**
 * Get an NFT with a different trait value (for zone taps)
 */
export function getWithDifferentTrait(
  base: string,
  traitType: string,
  currentValue: string
): NFTMetadata | null {
  const baseNfts = nftsByBase.get(base) || [];
  const candidates = baseNfts.filter(nft => {
    const trait = nft.attributes.find(a => a.trait_type === traitType);
    return trait && trait.value !== currentValue;
  });

  if (candidates.length === 0) return null;

  // Pick one that's already preloaded if possible
  const preloaded = candidates.filter(nft => preloadedImages.has(nft.image));
  if (preloaded.length > 0) {
    return preloaded[Math.floor(Math.random() * preloaded.length)];
  }

  // Otherwise pick random and preload it
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  preloadImage(selected.image);
  return selected;
}

/**
 * Check if an image is already preloaded
 */
export function isPreloaded(url: string): boolean {
  return preloadedImages.has(url);
}

/**
 * Get all NFTs for a base (for the Gallery to use)
 */
export function getNftsByBase(base: string): NFTMetadata[] {
  return nftsByBase.get(base) || [];
}

/**
 * Get all NFTs
 */
export function getAllNfts(): NFTMetadata[] {
  return allNfts;
}

/**
 * Check if preloader is ready
 */
export function isReady(): boolean {
  return isInitialized;
}

/**
 * Get NFT by edition number within a base
 */
export function getNftByEdition(base: string, edition: number): NFTMetadata | null {
  const baseNfts = nftsByBase.get(base) || [];
  return baseNfts.find(nft => nft.edition === edition) || null;
}

/**
 * Get next NFT in sequence within a base
 */
export function getNextInSequence(base: string, currentEdition: number): NFTMetadata | null {
  const baseNfts = nftsByBase.get(base) || [];
  if (baseNfts.length === 0) return null;

  // Sort by edition to get sequential order
  const sorted = [...baseNfts].sort((a, b) => a.edition - b.edition);
  const currentIndex = sorted.findIndex(nft => nft.edition === currentEdition);

  if (currentIndex === -1) return sorted[0];

  // Wrap around to beginning if at end
  const nextIndex = (currentIndex + 1) % sorted.length;
  const nextNft = sorted[nextIndex];

  // Preload the next one after that
  const preloadIndex = (nextIndex + 1) % sorted.length;
  preloadImage(sorted[preloadIndex].image);

  return nextNft;
}

/**
 * Get previous NFT in sequence within a base
 */
export function getPrevInSequence(base: string, currentEdition: number): NFTMetadata | null {
  const baseNfts = nftsByBase.get(base) || [];
  if (baseNfts.length === 0) return null;

  // Sort by edition to get sequential order
  const sorted = [...baseNfts].sort((a, b) => a.edition - b.edition);
  const currentIndex = sorted.findIndex(nft => nft.edition === currentEdition);

  if (currentIndex === -1) return sorted[sorted.length - 1];

  // Wrap around to end if at beginning
  const prevIndex = currentIndex === 0 ? sorted.length - 1 : currentIndex - 1;
  const prevNft = sorted[prevIndex];

  // Preload the one before that
  const preloadIndex = prevIndex === 0 ? sorted.length - 1 : prevIndex - 1;
  preloadImage(sorted[preloadIndex].image);

  return prevNft;
}

/**
 * Get preload progress (for UI feedback if needed)
 */
export function getPreloadProgress(): { loaded: number; total: number } {
  const total = BASE_NAMES.length * 10; // Target: 10 per base
  return {
    loaded: preloadedImages.size,
    total
  };
}
