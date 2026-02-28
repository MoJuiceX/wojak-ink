/**
 * Image Preloader Service
 *
 * Smart image preloading with priority queue, memory management,
 * and multiple loading strategies.
 */

export type PreloadPriority = 'critical' | 'high' | 'medium' | 'low';

interface PreloadTask {
  url: string;
  priority: PreloadPriority;
  timestamp: number;
}

interface PreloadResult {
  url: string;
  success: boolean;
  fromCache: boolean;
}

// Priority weights for sorting
const PRIORITY_WEIGHTS: Record<PreloadPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// Configuration - optimized for IPFS loading
const CONFIG = {
  maxConcurrent: 20,          // Max simultaneous loads (aggressive for fast preloading)
  maxCacheSize: 800,          // Max images to keep in memory cache (covers all characters)
  preloadAheadGrid: 80,       // Images to preload ahead in grid
  preloadAheadExplorer: 8,    // Images to preload in each direction in explorer
  preloadBehindExplorer: 4,   // Images to preload behind in explorer
  hoverPreloadDelay: 30,      // ms delay before preloading on hover (faster response)
};

class ImagePreloaderService {
  private queue: PreloadTask[] = [];
  private loading: Set<string> = new Set();
  private loaded: Map<string, HTMLImageElement> = new Map();
  private failed: Set<string> = new Set();
  private listeners: Map<string, Array<(result: PreloadResult) => void>> = new Map();

  /**
   * Check if an image is already loaded/cached
   */
  isLoaded(url: string): boolean {
    return this.loaded.has(url);
  }

  /**
   * Check if an image is currently loading
   */
  isLoading(url: string): boolean {
    return this.loading.has(url);
  }

  /**
   * Check if an image failed to load
   */
  hasFailed(url: string): boolean {
    return this.failed.has(url);
  }

  /**
   * Get a preloaded image element if available
   */
  getImage(url: string): HTMLImageElement | null {
    return this.loaded.get(url) || null;
  }

  /**
   * Add a single image to the preload queue
   */
  preload(url: string, priority: PreloadPriority = 'medium'): Promise<PreloadResult> {
    // Already loaded
    if (this.loaded.has(url)) {
      return Promise.resolve({ url, success: true, fromCache: true });
    }

    // Already failed - don't retry immediately
    if (this.failed.has(url)) {
      return Promise.resolve({ url, success: false, fromCache: false });
    }

    // Already in queue or loading - return existing promise
    if (this.loading.has(url) || this.queue.some(t => t.url === url)) {
      return new Promise((resolve) => {
        const listeners = this.listeners.get(url) || [];
        listeners.push(resolve);
        this.listeners.set(url, listeners);
      });
    }

    // Add to queue
    this.queue.push({
      url,
      priority,
      timestamp: Date.now(),
    });

    // Sort queue by priority
    this.sortQueue();

    // Start processing
    this.processQueue();

    // Return promise for this load
    return new Promise((resolve) => {
      const listeners = this.listeners.get(url) || [];
      listeners.push(resolve);
      this.listeners.set(url, listeners);
    });
  }

  /**
   * Preload multiple images with the same priority
   */
  preloadBatch(urls: string[], priority: PreloadPriority = 'medium'): void {
    for (const url of urls) {
      if (!this.loaded.has(url) && !this.loading.has(url) && !this.failed.has(url)) {
        const existing = this.queue.find(t => t.url === url);
        if (!existing) {
          this.queue.push({
            url,
            priority,
            timestamp: Date.now(),
          });
        } else if (PRIORITY_WEIGHTS[priority] < PRIORITY_WEIGHTS[existing.priority]) {
          // Upgrade priority if new request is higher
          existing.priority = priority;
        }
      }
    }

    this.sortQueue();
    this.processQueue();
  }

  /**
   * Preload images for explorer view (current + neighbors)
   */
  preloadForExplorer(
    urls: string[],
    currentIndex: number,
    direction: 'forward' | 'backward' | null = null
  ): void {
    if (urls.length === 0) return;

    const ahead = CONFIG.preloadAheadExplorer;
    const behind = CONFIG.preloadBehindExplorer;

    // Current image is critical
    if (urls[currentIndex]) {
      this.preload(urls[currentIndex], 'critical');
    }

    // Determine preload range based on direction
    let forwardCount = ahead;
    let backwardCount = behind;

    if (direction === 'forward') {
      forwardCount = ahead + 2;
      backwardCount = behind - 1;
    } else if (direction === 'backward') {
      forwardCount = behind - 1;
      backwardCount = ahead + 2;
    }

    // Preload forward (high priority)
    const forwardUrls: string[] = [];
    for (let i = 1; i <= forwardCount; i++) {
      const idx = currentIndex + i;
      if (idx < urls.length && urls[idx]) {
        forwardUrls.push(urls[idx]);
      }
    }
    this.preloadBatch(forwardUrls, 'high');

    // Preload backward (medium priority)
    const backwardUrls: string[] = [];
    for (let i = 1; i <= backwardCount; i++) {
      const idx = currentIndex - i;
      if (idx >= 0 && urls[idx]) {
        backwardUrls.push(urls[idx]);
      }
    }
    this.preloadBatch(backwardUrls, 'medium');
  }

  /**
   * Preload images for grid view based on visible range
   */
  preloadForGrid(
    urls: string[],
    visibleStartIndex: number,
    visibleEndIndex: number
  ): void {
    if (urls.length === 0) return;

    // Visible images are critical
    const visibleUrls = urls.slice(visibleStartIndex, visibleEndIndex + 1);
    this.preloadBatch(visibleUrls, 'critical');

    // Preload ahead (medium priority)
    const aheadStart = visibleEndIndex + 1;
    const aheadEnd = Math.min(aheadStart + CONFIG.preloadAheadGrid, urls.length);
    const aheadUrls = urls.slice(aheadStart, aheadEnd);
    this.preloadBatch(aheadUrls, 'medium');

    // Preload behind (low priority, in case user scrolls up)
    const behindEnd = visibleStartIndex;
    const behindStart = Math.max(0, behindEnd - 20);
    const behindUrls = urls.slice(behindStart, behindEnd);
    this.preloadBatch(behindUrls, 'low');
  }

  /**
   * Preload on hover intent (with small delay to avoid unnecessary loads)
   */
  preloadOnHover(url: string): () => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    timeoutId = setTimeout(() => {
      this.preload(url, 'high');
    }, CONFIG.hoverPreloadDelay);

    // Return cancel function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Cancel all pending preloads (e.g., when navigating away)
   */
  cancelAll(): void {
    this.queue = [];
  }

  /**
   * Clear the cache to free memory
   */
  clearCache(): void {
    this.loaded.clear();
    this.failed.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { loaded: number; loading: number; queued: number; failed: number } {
    return {
      loaded: this.loaded.size,
      loading: this.loading.size,
      queued: this.queue.length,
      failed: this.failed.size,
    };
  }

  // Private methods

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First by priority
      const priorityDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  private processQueue(): void {
    // Don't exceed max concurrent loads
    while (this.loading.size < CONFIG.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task && !this.loaded.has(task.url) && !this.loading.has(task.url)) {
        this.loadImage(task.url);
      }
    }
  }

  private loadImage(url: string): void {
    this.loading.add(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      this.loading.delete(url);
      this.loaded.set(url, img);
      this.notifyListeners(url, { url, success: true, fromCache: false });
      this.evictIfNeeded();
      this.processQueue();
    };

    img.onerror = () => {
      this.loading.delete(url);
      this.failed.add(url);
      this.notifyListeners(url, { url, success: false, fromCache: false });
      this.processQueue();
    };

    img.src = url;
  }

  private notifyListeners(url: string, result: PreloadResult): void {
    const listeners = this.listeners.get(url);
    if (listeners) {
      for (const listener of listeners) {
        listener(result);
      }
      this.listeners.delete(url);
    }
  }

  private evictIfNeeded(): void {
    // Evict oldest entries if cache is full
    if (this.loaded.size > CONFIG.maxCacheSize) {
      const entries = Array.from(this.loaded.entries());
      const toEvict = entries.slice(0, this.loaded.size - CONFIG.maxCacheSize);
      for (const [url] of toEvict) {
        this.loaded.delete(url);
      }
    }
  }
}

// Singleton instance
export const imagePreloader = new ImagePreloaderService();

// Export config for customization
export { CONFIG as PRELOADER_CONFIG };
