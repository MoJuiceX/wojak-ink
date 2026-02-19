import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CacheMetadata } from './heatmapCache';
import type { HeatMapCell } from '@/types/bigpulp';

// ============ localStorage mock ============
// The vitest happy-dom environment provides a stub localStorage that only
// partially implements the Storage interface (no clear/removeItem in this
// version). We replace it with a full in-memory implementation before the
// module under test is imported.

function makeLocalStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() { return Object.keys(store).length; },
    key(index: number) { return Object.keys(store)[index] ?? null; },
    getItem(key: string) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key: string, value: string) { store[key] = value; },
    removeItem(key: string) { delete store[key]; },
    clear() { store = {}; },
  };
}

const mockStorage = makeLocalStorage();
vi.stubGlobal('localStorage', mockStorage);

// Import module AFTER stubbing so it picks up the mock
const {
  saveHeatmapToCache,
  loadHeatmapFromCache,
  clearHeatmapCache,
  getCacheMetadata,
  hasCachedHeatmap,
  formatCacheAge,
  createCachedHeatmapFetcher,
  getInitialHeatmapData,
} = await import('./heatmapCache');

// ============ Helpers ============

function makeCell(minPrice: number, maxPrice: number, label: string): HeatMapCell {
  return {
    priceBin: { minPrice, maxPrice, label },
    count: 1,
    percentage: 10,
    avgRank: 50,
  } as unknown as HeatMapCell;
}

const sampleRow: HeatMapCell[] = [
  makeCell(0, 1, '0-1'),
  makeCell(1, 2, '1-2'),
  makeCell(2, 3, '2-3'),
];

const sampleData: HeatMapCell[][] = [sampleRow];

// ============ Setup / Teardown ============

beforeEach(() => {
  mockStorage.clear();
});

afterEach(() => {
  mockStorage.clear();
  vi.useRealTimers();
});

// ============ saveHeatmapToCache / loadHeatmapFromCache ============

describe('saveHeatmapToCache and loadHeatmapFromCache', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadHeatmapFromCache()).toBeNull();
  });

  it('persists data to localStorage and retrieves it', () => {
    saveHeatmapToCache(sampleData);
    const cached = loadHeatmapFromCache();
    expect(cached).not.toBeNull();
    expect(cached!.data).toEqual(sampleData);
  });

  it('stores the correct schema version', () => {
    saveHeatmapToCache(sampleData);
    const cached = loadHeatmapFromCache();
    expect(cached!.version).toBe(1);
  });

  it('overwrites old entries on subsequent saves', () => {
    const secondRow: HeatMapCell[] = [makeCell(5, 10, '5-10')];
    const secondData: HeatMapCell[][] = [secondRow];

    saveHeatmapToCache(sampleData);
    saveHeatmapToCache(secondData);

    const cached = loadHeatmapFromCache();
    expect(cached!.data).toEqual(secondData);
  });

  it('accepts an explicit priceBinConfig and stores it', () => {
    // Note: Infinity cannot be JSON-serialized (becomes null), so use a
    // finite sentinel value for the last boundary to survive the round-trip.
    const config = {
      floor: 0,
      p90: 10,
      increment: 1,
      boundaries: [0, 1, 2, 9999],
      labels: ['0-1', '1-2', '2+'],
    };
    saveHeatmapToCache(sampleData, config);
    const cached = loadHeatmapFromCache();
    expect(cached!.priceBinConfig.floor).toBe(config.floor);
    expect(cached!.priceBinConfig.p90).toBe(config.p90);
    expect(cached!.priceBinConfig.increment).toBe(config.increment);
    expect(cached!.priceBinConfig.labels).toEqual(config.labels);
    expect(cached!.priceBinConfig.boundaries).toEqual(config.boundaries);
  });

  it('extracts priceBinConfig automatically from data when none is provided', () => {
    saveHeatmapToCache(sampleData);
    const cached = loadHeatmapFromCache();
    expect(cached!.priceBinConfig.floor).toBe(0);
    expect(cached!.priceBinConfig.labels).toEqual(['0-1', '1-2', '2-3']);
  });

  it('returns null and clears cache when stored version does not match', () => {
    mockStorage.setItem(
      'wojak_heatmap_cache_v1',
      JSON.stringify({ version: 99, data: sampleData, timestamp: Date.now(), priceBinConfig: {} }),
    );
    expect(loadHeatmapFromCache()).toBeNull();
    expect(mockStorage.getItem('wojak_heatmap_cache_v1')).toBeNull();
  });

  it('returns null and clears cache when entry is older than 24 hours', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    saveHeatmapToCache(sampleData);
    vi.setSystemTime(now + 25 * 60 * 60 * 1000);

    expect(loadHeatmapFromCache()).toBeNull();
    expect(mockStorage.getItem('wojak_heatmap_cache_v1')).toBeNull();
  });

  it('returns null and clears cache when stored JSON is malformed', () => {
    mockStorage.setItem('wojak_heatmap_cache_v1', '{bad json');
    expect(loadHeatmapFromCache()).toBeNull();
    expect(mockStorage.getItem('wojak_heatmap_cache_v1')).toBeNull();
  });
});

// ============ clearHeatmapCache ============

describe('clearHeatmapCache', () => {
  it('removes cached data so subsequent load returns null', () => {
    saveHeatmapToCache(sampleData);
    clearHeatmapCache();
    expect(loadHeatmapFromCache()).toBeNull();
  });
});

// ============ hasCachedHeatmap ============

describe('hasCachedHeatmap', () => {
  it('returns false when cache is empty', () => {
    expect(hasCachedHeatmap()).toBe(false);
  });

  it('returns true after saving data', () => {
    saveHeatmapToCache(sampleData);
    expect(hasCachedHeatmap()).toBe(true);
  });

  it('returns false after cache is cleared', () => {
    saveHeatmapToCache(sampleData);
    clearHeatmapCache();
    expect(hasCachedHeatmap()).toBe(false);
  });
});

// ============ getCacheMetadata ============

describe('getCacheMetadata', () => {
  it('returns source="live" and isStale=true when passed null', () => {
    const meta: CacheMetadata = getCacheMetadata(null);
    expect(meta.source).toBe('live');
    expect(meta.isStale).toBe(true);
  });

  it('returns source="cache" for a valid cached entry', () => {
    saveHeatmapToCache(sampleData);
    const cached = loadHeatmapFromCache();
    const meta = getCacheMetadata(cached);
    expect(meta.source).toBe('cache');
  });

  it('reports isStale=false for a freshly saved entry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.now());

    saveHeatmapToCache(sampleData);
    const cached = loadHeatmapFromCache();
    const meta = getCacheMetadata(cached);

    expect(meta.isStale).toBe(false);
    expect(meta.ageMinutes).toBe(0);
  });

  it('reports isStale=true for an entry older than 30 minutes', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    saveHeatmapToCache(sampleData);
    vi.setSystemTime(now + 31 * 60 * 1000);

    const cached = loadHeatmapFromCache();
    const meta = getCacheMetadata(cached);

    expect(meta.isStale).toBe(true);
    expect(meta.ageMinutes).toBeGreaterThanOrEqual(31);
  });

  it('lastUpdated reflects the original save timestamp', () => {
    vi.useFakeTimers();
    const fixedTime = new Date('2025-06-01T12:00:00Z').getTime();
    vi.setSystemTime(fixedTime);

    saveHeatmapToCache(sampleData);
    const cached = loadHeatmapFromCache();
    const meta = getCacheMetadata(cached);

    expect(meta.lastUpdated.getTime()).toBe(fixedTime);
  });
});

// ============ formatCacheAge ============

describe('formatCacheAge', () => {
  it('returns "just now" for 0 minutes', () => {
    expect(formatCacheAge(0)).toBe('just now');
  });

  it('returns "1 minute ago" for exactly 1 minute', () => {
    expect(formatCacheAge(1)).toBe('1 minute ago');
  });

  it('returns plural minutes for 2-59 minutes', () => {
    expect(formatCacheAge(15)).toBe('15 minutes ago');
    expect(formatCacheAge(59)).toBe('59 minutes ago');
  });

  it('returns "1 hour ago" for exactly 60 minutes', () => {
    expect(formatCacheAge(60)).toBe('1 hour ago');
  });

  it('returns plural hours for 2-23 hours', () => {
    expect(formatCacheAge(120)).toBe('2 hours ago');
    expect(formatCacheAge(1380)).toBe('23 hours ago');
  });

  it('returns "1 day ago" for exactly 24 hours (1440 minutes)', () => {
    expect(formatCacheAge(1440)).toBe('1 day ago');
  });

  it('returns plural days for 2+ days', () => {
    expect(formatCacheAge(2880)).toBe('2 days ago');
    expect(formatCacheAge(4320)).toBe('3 days ago');
  });
});

// ============ getInitialHeatmapData ============

describe('getInitialHeatmapData', () => {
  it('returns undefined when there is no cached data', () => {
    expect(getInitialHeatmapData()).toBeUndefined();
  });

  it('returns the cached data array when a valid cache exists', () => {
    saveHeatmapToCache(sampleData);
    const initial = getInitialHeatmapData();
    expect(initial).toEqual(sampleData);
  });
});

// ============ createCachedHeatmapFetcher ============

describe('createCachedHeatmapFetcher', () => {
  it('returns live data and source="live" when fetch succeeds', async () => {
    const freshData: HeatMapCell[][] = [[makeCell(0, 1, '0-1')]];
    const fetchFn = vi.fn().mockResolvedValue(freshData);

    const fetcher = createCachedHeatmapFetcher(fetchFn);
    const result = await fetcher();

    expect(result.data).toEqual(freshData);
    expect(result.metadata.source).toBe('live');
    expect(result.metadata.isStale).toBe(false);
  });

  it('saves fresh data to cache after a successful fetch', async () => {
    const freshData: HeatMapCell[][] = [[makeCell(0, 1, '0-1')]];
    const fetchFn = vi.fn().mockResolvedValue(freshData);

    const fetcher = createCachedHeatmapFetcher(fetchFn);
    await fetcher();

    expect(hasCachedHeatmap()).toBe(true);
    expect(getInitialHeatmapData()).toEqual(freshData);
  });

  it('falls back to cached data and source="cache" when fetch fails', async () => {
    saveHeatmapToCache(sampleData);
    const fetchFn = vi.fn().mockRejectedValue(new Error('network error'));

    const fetcher = createCachedHeatmapFetcher(fetchFn);
    const result = await fetcher();

    expect(result.data).toEqual(sampleData);
    expect(result.metadata.source).toBe('cache');
  });

  it('rethrows the error when fetch fails and no cache is available', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network error'));

    const fetcher = createCachedHeatmapFetcher(fetchFn);
    await expect(fetcher()).rejects.toThrow('network error');
  });
});
