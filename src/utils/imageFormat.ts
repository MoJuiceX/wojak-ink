/**
 * Image Format Utilities
 *
 * Handle WebP/PNG fallback, IPFS URL caching, and format detection.
 */

const IPFS_CACHE_KEY = 'ipfs_url_cache';
const IPFS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedIPFSUrl {
  original: string;
  gateway: string;
  timestamp: number;
}

/**
 * Get cached IPFS gateway URL or generate new one
 */
export function getCachedIPFSUrl(ipfsHash: string): string {
  const cache = getIPFSCache();
  const cached = cache[ipfsHash];

  if (cached && Date.now() - cached.timestamp < IPFS_CACHE_TTL) {
    return cached.gateway;
  }

  // Use primary IPFS gateway
  const gatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
  
  // Cache it
  cache[ipfsHash] = {
    original: ipfsHash,
    gateway: gatewayUrl,
    timestamp: Date.now(),
  };
  localStorage.setItem(IPFS_CACHE_KEY, JSON.stringify(cache));

  return gatewayUrl;
}

/**
 * Get IPFS cache from localStorage
 */
function getIPFSCache(): Record<string, CachedIPFSUrl> {
  try {
    const cached = localStorage.getItem(IPFS_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Clear expired IPFS cache entries
 */
export function cleanIPFSCache(): void {
  try {
    const cache = getIPFSCache();
    const now = Date.now();
    const cleaned: Record<string, CachedIPFSUrl> = {};

    Object.entries(cache).forEach(([key, entry]) => {
      if (now - entry.timestamp < IPFS_CACHE_TTL) {
        cleaned[key] = entry;
      }
    });

    localStorage.setItem(IPFS_CACHE_KEY, JSON.stringify(cleaned));
  } catch {
    // Silently fail
  }
}

/**
 * Convert image URL to WebP variant
 * For IPFS URLs, add query param. For others, replace extension.
 */
export function getWebPUrl(imageUrl: string): string | null {
  if (!imageUrl) return null;

  // IPFS URLs - request WebP via Content Negotiation header
  if (imageUrl.includes('ipfs.io') || imageUrl.includes('gateway.pinata')) {
    return imageUrl; // Gateway handles Accept header
  }

  // Standard URLs - replace extension
  const url = new URL(imageUrl);
  const pathname = url.pathname;
  const webpPath = pathname.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');
  
  if (webpPath === pathname) {
    return null; // Not an image URL
  }

  url.pathname = webpPath;
  return url.toString();
}

/**
 * Get fallback PNG URL (original or with explicit extension)
 */
export function getPngUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  
  // Remove any WebP extension
  return imageUrl.replace(/\.webp$/i, '.png');
}

/**
 * Detect if browser supports WebP
 */
let webpSupported: boolean | null = null;

export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    if (webpSupported !== null) {
      resolve(webpSupported);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    try {
      const data = canvas.toDataURL('image/webp');
      webpSupported = data.startsWith('data:image/webp');
    } catch {
      webpSupported = false;
    }

    resolve(webpSupported);
  });
}

/**
 * Get optimal image URL (WebP if supported, PNG fallback)
 */
export async function getOptimalImageUrl(
  imageUrl: string
): Promise<{ primary: string; fallback: string }> {
  if (!imageUrl) return { primary: '', fallback: '' };

  const supports = await supportsWebP();
  
  if (supports) {
    const webpUrl = getWebPUrl(imageUrl);
    return {
      primary: webpUrl || imageUrl,
      fallback: getPngUrl(imageUrl),
    };
  }

  return {
    primary: getPngUrl(imageUrl),
    fallback: '',
  };
}
