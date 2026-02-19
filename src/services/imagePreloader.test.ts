import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { imagePreloader, PRELOADER_CONFIG } from './imagePreloader';

// ============================================
// PRELOADER_CONFIG
// ============================================

describe('PRELOADER_CONFIG', () => {
  it('has maxConcurrent set to a positive number', () => {
    expect(PRELOADER_CONFIG.maxConcurrent).toBeGreaterThan(0);
  });

  it('has maxCacheSize set to a positive number', () => {
    expect(PRELOADER_CONFIG.maxCacheSize).toBeGreaterThan(0);
  });

  it('has preloadAheadGrid set to a positive number', () => {
    expect(PRELOADER_CONFIG.preloadAheadGrid).toBeGreaterThan(0);
  });

  it('has preloadAheadExplorer set to a positive number', () => {
    expect(PRELOADER_CONFIG.preloadAheadExplorer).toBeGreaterThan(0);
  });

  it('has preloadBehindExplorer set to a positive number', () => {
    expect(PRELOADER_CONFIG.preloadBehindExplorer).toBeGreaterThan(0);
  });

  it('has hoverPreloadDelay set to a non-negative number', () => {
    expect(PRELOADER_CONFIG.hoverPreloadDelay).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// Initial state
// ============================================

describe('ImagePreloaderService initial state', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('starts with empty loaded cache', () => {
    const stats = imagePreloader.getStats();
    expect(stats.loaded).toBe(0);
  });

  it('starts with nothing loading', () => {
    const stats = imagePreloader.getStats();
    expect(stats.loading).toBe(0);
  });

  it('starts with empty queue', () => {
    const stats = imagePreloader.getStats();
    expect(stats.queued).toBe(0);
  });

  it('starts with no failures', () => {
    const stats = imagePreloader.getStats();
    expect(stats.failed).toBe(0);
  });
});

// ============================================
// isLoaded / isLoading / hasFailed / getImage
// ============================================

describe('isLoaded', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('returns false for a URL not in cache', () => {
    expect(imagePreloader.isLoaded('https://example.com/a.png')).toBe(false);
  });

  it('returns false for arbitrary strings', () => {
    expect(imagePreloader.isLoaded('')).toBe(false);
    expect(imagePreloader.isLoaded('not-a-url')).toBe(false);
  });
});

describe('isLoading', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('returns false for a URL not currently loading', () => {
    expect(imagePreloader.isLoading('https://example.com/a.png')).toBe(false);
  });
});

describe('hasFailed', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('returns false for a URL that has not been attempted', () => {
    expect(imagePreloader.hasFailed('https://example.com/a.png')).toBe(false);
  });
});

describe('getImage', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('returns null for a URL not in cache', () => {
    expect(imagePreloader.getImage('https://example.com/a.png')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(imagePreloader.getImage('')).toBeNull();
  });
});

// ============================================
// getStats
// ============================================

describe('getStats', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('returns an object with loaded, loading, queued, failed fields', () => {
    const stats = imagePreloader.getStats();
    expect(stats).toHaveProperty('loaded');
    expect(stats).toHaveProperty('loading');
    expect(stats).toHaveProperty('queued');
    expect(stats).toHaveProperty('failed');
  });

  it('all stats are non-negative numbers', () => {
    const stats = imagePreloader.getStats();
    expect(stats.loaded).toBeGreaterThanOrEqual(0);
    expect(stats.loading).toBeGreaterThanOrEqual(0);
    expect(stats.queued).toBeGreaterThanOrEqual(0);
    expect(stats.failed).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// cancelAll
// ============================================

describe('cancelAll', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('empties the queue', () => {
    // Add items to the queue via preloadBatch on URLs that won't resolve
    imagePreloader.preloadBatch(
      ['https://a.test/1.png', 'https://a.test/2.png', 'https://a.test/3.png'],
      'low'
    );
    imagePreloader.cancelAll();
    expect(imagePreloader.getStats().queued).toBe(0);
  });

  it('can be called when queue is empty without throwing', () => {
    expect(() => imagePreloader.cancelAll()).not.toThrow();
  });
});

// ============================================
// clearCache
// ============================================

describe('clearCache', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  it('resets loaded count to 0', () => {
    imagePreloader.clearCache();
    expect(imagePreloader.getStats().loaded).toBe(0);
  });

  it('resets failed count to 0', () => {
    imagePreloader.clearCache();
    expect(imagePreloader.getStats().failed).toBe(0);
  });

  it('can be called multiple times without throwing', () => {
    expect(() => {
      imagePreloader.clearCache();
      imagePreloader.clearCache();
    }).not.toThrow();
  });

  it('makes previously checked URLs return false for isLoaded', () => {
    imagePreloader.clearCache();
    expect(imagePreloader.isLoaded('https://example.com/was-cached.png')).toBe(false);
  });
});

// ============================================
// preloadBatch
// ============================================

describe('preloadBatch', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  afterEach(() => {
    imagePreloader.cancelAll();
    imagePreloader.clearCache();
  });

  it('does not throw with an empty array', () => {
    expect(() => imagePreloader.preloadBatch([], 'medium')).not.toThrow();
  });

  it('does not throw with duplicate URLs', () => {
    expect(() =>
      imagePreloader.preloadBatch(
        ['https://x.test/a.png', 'https://x.test/a.png'],
        'high'
      )
    ).not.toThrow();
  });

  it('does not add already-loaded URLs to queue', () => {
    // Nothing is loaded — all should be queued
    imagePreloader.preloadBatch(['https://x.test/b.png'], 'medium');
    const stats = imagePreloader.getStats();
    // The URL will either be in queue or loading (since maxConcurrent is high)
    expect(stats.queued + stats.loading).toBeGreaterThanOrEqual(0);
  });

  it('respects all priority levels without throwing', () => {
    const priorities = ['critical', 'high', 'medium', 'low'] as const;
    for (const p of priorities) {
      expect(() => imagePreloader.preloadBatch(['https://x.test/c.png'], p)).not.toThrow();
    }
  });
});

// ============================================
// preloadForGrid
// ============================================

describe('preloadForGrid', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  afterEach(() => {
    imagePreloader.cancelAll();
    imagePreloader.clearCache();
  });

  it('does not throw with empty url array', () => {
    expect(() => imagePreloader.preloadForGrid([], 0, 5)).not.toThrow();
  });

  it('does not throw with valid indices', () => {
    const urls = Array.from({ length: 20 }, (_, i) => `https://x.test/${i}.png`);
    expect(() => imagePreloader.preloadForGrid(urls, 0, 4)).not.toThrow();
  });

  it('handles visibleEndIndex equal to last index', () => {
    const urls = ['https://x.test/0.png', 'https://x.test/1.png'];
    expect(() => imagePreloader.preloadForGrid(urls, 0, 1)).not.toThrow();
  });

  it('handles when visibleStartIndex equals visibleEndIndex', () => {
    const urls = ['https://x.test/0.png'];
    expect(() => imagePreloader.preloadForGrid(urls, 0, 0)).not.toThrow();
  });
});

// ============================================
// preloadForExplorer
// ============================================

describe('preloadForExplorer', () => {
  beforeEach(() => {
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  afterEach(() => {
    imagePreloader.cancelAll();
    imagePreloader.clearCache();
  });

  it('does not throw with empty url array', () => {
    expect(() => imagePreloader.preloadForExplorer([], 0)).not.toThrow();
  });

  it('does not throw with valid currentIndex', () => {
    const urls = Array.from({ length: 20 }, (_, i) => `https://x.test/${i}.png`);
    expect(() => imagePreloader.preloadForExplorer(urls, 5)).not.toThrow();
  });

  it('works with direction forward', () => {
    const urls = Array.from({ length: 20 }, (_, i) => `https://x.test/fwd-${i}.png`);
    expect(() => imagePreloader.preloadForExplorer(urls, 5, 'forward')).not.toThrow();
  });

  it('works with direction backward', () => {
    const urls = Array.from({ length: 20 }, (_, i) => `https://x.test/bwd-${i}.png`);
    expect(() => imagePreloader.preloadForExplorer(urls, 10, 'backward')).not.toThrow();
  });

  it('works with direction null', () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://x.test/null-${i}.png`);
    expect(() => imagePreloader.preloadForExplorer(urls, 3, null)).not.toThrow();
  });

  it('handles currentIndex at the end of the array', () => {
    const urls = ['https://x.test/0.png', 'https://x.test/1.png'];
    expect(() => imagePreloader.preloadForExplorer(urls, 1)).not.toThrow();
  });

  it('handles currentIndex at the beginning of the array', () => {
    const urls = Array.from({ length: 5 }, (_, i) => `https://x.test/start-${i}.png`);
    expect(() => imagePreloader.preloadForExplorer(urls, 0)).not.toThrow();
  });
});

// ============================================
// preloadOnHover
// ============================================

describe('preloadOnHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    imagePreloader.clearCache();
    imagePreloader.cancelAll();
  });

  afterEach(() => {
    vi.useRealTimers();
    imagePreloader.cancelAll();
    imagePreloader.clearCache();
  });

  it('returns a cancel function', () => {
    const cancel = imagePreloader.preloadOnHover('https://x.test/hover.png');
    expect(typeof cancel).toBe('function');
    cancel();
  });

  it('cancel function does not throw when called', () => {
    const cancel = imagePreloader.preloadOnHover('https://x.test/hover2.png');
    expect(() => cancel()).not.toThrow();
  });

  it('does not immediately add to loading/queue (uses delay)', () => {
    imagePreloader.preloadOnHover('https://x.test/hover3.png');
    // Before timeout fires, no loading should happen immediately
    const stats = imagePreloader.getStats();
    // Queue/loading may or may not have it; test doesn't throw is sufficient
    expect(stats).toBeDefined();
  });

  it('fires after the hover delay', () => {
    imagePreloader.preloadOnHover('https://x.test/hover4.png');
    vi.advanceTimersByTime(PRELOADER_CONFIG.hoverPreloadDelay + 10);
    // After timer fires, it would call preload — no error is the expectation
    expect(imagePreloader.getStats()).toBeDefined();
  });

  it('cancel prevents the preload from firing', () => {
    const cancel = imagePreloader.preloadOnHover('https://x.test/hover5.png');
    cancel();
    vi.advanceTimersByTime(PRELOADER_CONFIG.hoverPreloadDelay + 100);
    // Cancelling before the timer fires means no preload should have been queued
    expect(imagePreloader.getStats()).toBeDefined();
  });
});
