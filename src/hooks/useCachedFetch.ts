/**
 * useCachedFetch Hook
 *
 * Features:
 * - TTL-based caching (60-300s configurable)
 * - In-flight request deduplication
 * - localStorage fallback for offline support
 * - Automatic cache key generation
 * - Error handling and retries
 */

import { useEffect, useRef, useState } from 'react';
import { safeStorage } from '@/utils/safeStorage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface UseCachedFetchOptions {
  /** Cache TTL in seconds (default: 60, min: 5, max: 3600) */
  ttl?: number;
  /** Use localStorage fallback (default: true) */
  useLocalStorage?: boolean;
  /** Custom cache key prefix */
  keyPrefix?: string;
  /** Enable request deduplication */
  deduplicate?: boolean;
  /** Skip cache on initial load */
  skipCache?: boolean;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
}

interface InflightRequestEntry {
  promise: Promise<unknown>;
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
  consumers: number;
  settled: boolean;
}

// Global in-flight request tracking. Cache the parsed JSON promise (not the raw
// Response) so multiple callers don't race to consume the same response body.
const inflightRequests = new Map<string, InflightRequestEntry>();

// Global memory cache
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options?: UseCachedFetchOptions): string {
  const prefix = options?.keyPrefix || 'cached_fetch';
  const hash = btoa(url)
    .replace(/[+/=]/g, (m) => {
      const chars = { '+': '-', '/': '_', '=': '' };
      return chars[m as keyof typeof chars] || m;
    })
    .slice(0, 32);

  return `${prefix}:${hash}`;
}

/**
 * Check if cache is still valid
 */
function isCacheValid(entry: CacheEntry<unknown>): boolean {
  const age = Date.now() - entry.timestamp;
  return age < entry.ttl * 1000;
}

/**
 * Get data from cache (memory or localStorage)
 */
function getCachedData<T>(
  cacheKey: string,
  useLocalStorage: boolean
): T | null {
  // Check memory cache first
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && isCacheValid(memEntry)) {
    return memEntry.data as T;
  }

  // Check localStorage fallback
  if (useLocalStorage) {
    const parsed = safeStorage.getJSON<CacheEntry<T> | null>(cacheKey, null);
    if (parsed && isCacheValid(parsed)) {
      // Restore to memory cache
      memoryCache.set(cacheKey, parsed);
      return parsed.data;
    }
  }

  // Cache expired or missing
  memoryCache.delete(cacheKey);
  if (useLocalStorage) {
    safeStorage.removeItem(cacheKey);
  }

  return null;
}

/**
 * Store data in cache (memory and optionally localStorage)
 */
function setCachedData<T>(
  cacheKey: string,
  data: T,
  ttl: number,
  useLocalStorage: boolean
): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };

  // Store in memory cache
  memoryCache.set(cacheKey, entry);

  // Store in localStorage
  if (useLocalStorage) {
    safeStorage.setJSON(cacheKey, entry);
  }
}

function createInflightRequest<T>(
  cacheKey: string,
  url: string,
  timeout: number
): InflightRequestEntry {
  const controller = new AbortController();
  const entry: InflightRequestEntry = {
    promise: Promise.resolve(undefined),
    controller,
    timeoutId: setTimeout(() => controller.abort(), timeout),
    consumers: 1,
    settled: false,
  };

  const promise = (async () => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(entry.timeoutId);
      entry.settled = true;
      if (inflightRequests.get(cacheKey) === entry) {
        inflightRequests.delete(cacheKey);
      }
    }
  })();

  entry.promise = promise;
  inflightRequests.set(cacheKey, entry);
  return entry;
}

function acquireInflightRequest<T>(
  cacheKey: string,
  url: string,
  timeout: number
): InflightRequestEntry {
  const existing = inflightRequests.get(cacheKey);
  if (existing) {
    existing.consumers += 1;
    return existing;
  }
  return createInflightRequest<T>(cacheKey, url, timeout);
}

function releaseInflightRequest(cacheKey: string, entry: InflightRequestEntry | null): void {
  if (!entry) return;
  if (inflightRequests.get(cacheKey) !== entry) {
    return;
  }

  entry.consumers = Math.max(0, entry.consumers - 1);
  if (entry.consumers === 0 && !entry.settled) {
    clearTimeout(entry.timeoutId);
    entry.controller.abort();
  }
}

/** Test-only reset helper for hook cache/inflight state. */
export function __resetUseCachedFetchStateForTests(): void {
  for (const entry of inflightRequests.values()) {
    clearTimeout(entry.timeoutId);
    if (!entry.settled) {
      entry.controller.abort();
    }
  }
  inflightRequests.clear();
  memoryCache.clear();
}

/**
 * useCachedFetch Hook
 *
 * @example
 * const { data, loading, error, refetch } = useCachedFetch<NFT[]>(
 *   '/api/gallery/nfts?page=1',
 *   { ttl: 120 }
 * );
 */
export function useCachedFetch<T>(
  url: string | null,
  options: UseCachedFetchOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const {
    ttl = 60,
    useLocalStorage = true,
    keyPrefix,
    deduplicate = true,
    skipCache = false,
    timeout = 10000,
  } = options;

  // Clamp TTL to valid range
  const validTtl = Math.max(5, Math.min(3600, ttl));

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skipCache);
  const [error, setError] = useState<Error | null>(null);

  const cacheKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const releaseSharedInflightRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setData(null);
      return;
    }

    let cancelled = false;

    const cacheKey = generateCacheKey(url, { keyPrefix });
    cacheKeyRef.current = cacheKey;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        if (!skipCache) {
          const cached = getCachedData<T>(cacheKey, useLocalStorage);
          if (cached) {
            if (!cancelled) {
              setData(cached);
              setLoading(false);
            }
            return;
          }
        }

        // Check if request is already in-flight (deduplication)
        let request: Promise<T>;

        if (deduplicate) {
          const entry = acquireInflightRequest<T>(cacheKey, url, timeout);
          releaseSharedInflightRef.current = () => releaseInflightRequest(cacheKey, entry);
          request = entry.promise as Promise<T>;
        } else {
          // Create abort controller for timeout
          abortControllerRef.current = new AbortController();
          const controller = abortControllerRef.current;
          const timeoutId = setTimeout(
            () => controller.abort(),
            timeout
          );

          request = (async () => {
            try {
              const response = await fetch(url, {
                signal: controller.signal,
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              return (await response.json()) as T;
            } finally {
              clearTimeout(timeoutId);
            }
          })();
        }

        const result = await request;

        if (!cancelled) {
          setData(result);
          setCachedData(cacheKey, result, validTtl, useLocalStorage);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));

          // Try to recover from localStorage
          const cached = getCachedData<T>(cacheKey, true);
          if (cached) {
            setData(cached);
            setError(null); // Silent recovery
            return;
          }

          setError(error);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }

      }
    };

    fetchData();

    return () => {
      cancelled = true;
      releaseSharedInflightRef.current?.();
      releaseSharedInflightRef.current = null;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [url, validTtl, useLocalStorage, keyPrefix, deduplicate, skipCache, timeout]);

  const refetch = async () => {
    if (!url) return;

    const cacheKey = cacheKeyRef.current;
    
    // Clear cache
    memoryCache.delete(cacheKey);
    if (useLocalStorage) {
      safeStorage.removeItem(cacheKey);
    }

    // Remove from in-flight tracking
    inflightRequests.delete(cacheKey);

    // Re-fetch by re-running the effect
    // We do this by creating a new promise and immediately resolving
    setLoading(true);
    setError(null);

    try {
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(
        () => abortControllerRef.current?.abort(),
        timeout
      );

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as T;
      setData(result);
      setCachedData(cacheKey, result, validTtl, useLocalStorage);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}

export default useCachedFetch;
