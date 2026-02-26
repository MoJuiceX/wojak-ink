/**
 * Rate Limiter Utility
 *
 * Provides rate limiting, request queuing, caching, and retry logic
 * for all external API calls to prevent 429 errors.
 *
 * Features:
 * - Request queue with configurable throttling
 * - Automatic retry with exponential backoff on 429/5xx errors
 * - Response caching with TTL
 * - Request deduplication for identical concurrent requests
 * - Per-domain rate limiting
 */

// ============================================
// CONFIGURATION
// ============================================

export interface RateLimitConfig {
  requestsPerSecond: number;    // Max requests per second
  minDelayMs: number;           // Minimum delay between requests
  maxRetries: number;           // Max retry attempts on failure
  baseBackoffMs: number;        // Initial backoff delay
  maxBackoffMs: number;         // Maximum backoff delay
}

// Default conservative configuration
export const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerSecond: 2,
  minDelayMs: 500,
  maxRetries: 3,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
};

// Per-domain configurations (some APIs are stricter than others)
const DOMAIN_CONFIGS: Record<string, Partial<RateLimitConfig>> = {
  'api.mintgarden.io': {
    requestsPerSecond: 2,
    minDelayMs: 500,
  },
  'api.dexie.space': {
    requestsPerSecond: 2,
    minDelayMs: 500,
  },
  'api.spacescan.io': {
    requestsPerSecond: 0.5,   // SpaceScan: ~1 request per 2 seconds (treasury makes 3 calls per refresh)
    minDelayMs: 2000,         // 2s between calls — total ~4s for 3 calls
    maxRetries: 2,
    baseBackoffMs: 10000,     // 10 second initial backoff on 429
    maxBackoffMs: 60000,      // Up to 1 minute backoff
  },
  'api2.spacescan.io': {
    requestsPerSecond: 0.5,
    minDelayMs: 2000,
    maxRetries: 2,
    baseBackoffMs: 10000,
    maxBackoffMs: 60000,
  },
  'api.coingecko.com': {
    requestsPerSecond: 0.1,   // CoinGecko free tier - 1 request per 10 seconds (very conservative)
    minDelayMs: 10000,
    maxRetries: 2,
    baseBackoffMs: 60000,     // 60 second backoff on failure
    maxBackoffMs: 300000,     // Up to 5 minutes
  },
};

// Global cooldown tracking per domain (triggered by 429 errors)
const domainCooldowns = new Map<string, number>();
const COOLDOWN_DURATION = 30000; // 30 second cooldown after 429

// ============================================
// REQUEST QUEUE
// ============================================

interface QueueItem<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retryCount: number;
  config: RateLimitConfig;
}

class RequestQueue {
  private queue: QueueItem<unknown>[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private config: RateLimitConfig;
  private domain: string;

  constructor(config: RateLimitConfig = DEFAULT_CONFIG, domain: string = 'unknown') {
    this.config = config;
    this.domain = domain;
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async add<T>(execute: () => Promise<T>, config?: Partial<RateLimitConfig>): Promise<T> {
    const itemConfig = { ...this.config, ...config };
    return new Promise((resolve, reject) => {
      this.queue.push({ execute, resolve: resolve as (value: unknown) => void, reject, retryCount: 0, config: itemConfig });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // Check global cooldown for this domain (triggered by 429 errors)
      const cooldownUntil = domainCooldowns.get(this.domain) || 0;
      const now = Date.now();
      if (now < cooldownUntil) {
        const waitTime = cooldownUntil - now;
        await this.delay(waitTime);
      }

      // Enforce minimum delay between requests
      const currentTime = Date.now();
      const timeSinceLastRequest = currentTime - this.lastRequestTime;
      if (timeSinceLastRequest < item.config.minDelayMs) {
        await this.delay(item.config.minDelayMs - timeSinceLastRequest);
      }

      try {
        this.lastRequestTime = Date.now();
        const result = await item.execute();
        item.resolve(result);
      } catch (error: unknown) {
        const err = error as { status?: number; response?: { status?: number } };
        const status = err?.status || err?.response?.status;
        const is429 = status === 429;
        const isRetryable = is429 || (status !== undefined && status >= 500 && status < 600);

        // On 429, set global cooldown for this domain
        if (is429) {
          const cooldownTime = Date.now() + COOLDOWN_DURATION;
          domainCooldowns.set(this.domain, cooldownTime);
        }

        if (isRetryable && item.retryCount < item.config.maxRetries) {
          // For 429, use longer backoff
          const baseBackoff = is429 ? Math.max(item.config.baseBackoffMs, 15000) : item.config.baseBackoffMs;
          const backoffMs = Math.min(
            baseBackoff * Math.pow(2, item.retryCount),
            item.config.maxBackoffMs
          );
          await this.delay(backoffMs);
          item.retryCount++;
          this.queue.unshift(item); // Re-queue at front
        } else {
          item.reject(error as Error);
        }
      }
    }

    this.processing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get isProcessing(): boolean {
    return this.processing;
  }
}

// ============================================
// DOMAIN-SPECIFIC QUEUES
// ============================================

const domainQueues = new Map<string, RequestQueue>();

function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return 'unknown';
  }
}

function getQueueForDomain(domain: string): RequestQueue {
  if (!domainQueues.has(domain)) {
    const domainConfig = DOMAIN_CONFIGS[domain] || {};
    const config = { ...DEFAULT_CONFIG, ...domainConfig };
    domainQueues.set(domain, new RequestQueue(config, domain));
  }
  return domainQueues.get(domain)!;
}

// ============================================
// RESPONSE CACHE
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const responseCache = new Map<string, CacheEntry<unknown>>();

function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? String(options.body) : '';
  return `${method}:${url}:${body}`;
}

function getCachedResponse<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > entry.ttl) {
    responseCache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCachedResponse<T>(key: string, data: T, ttlMs: number): void {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      responseCache.delete(key);
    }
  }
}, 60000); // Every minute

// ============================================
// REQUEST DEDUPLICATION
// ============================================

const inFlightRequests = new Map<string, Promise<unknown>>();

// ============================================
// PUBLIC API
// ============================================

export interface FetchOptions extends RequestInit {
  /** Cache TTL in milliseconds. Set to 0 to disable caching. Default: 0 */
  cacheTtl?: number;
  /** Skip the rate-limited queue and make request immediately */
  skipQueue?: boolean;
  /** Override rate limit config for this request */
  rateLimitConfig?: Partial<RateLimitConfig>;
  /** Timeout in milliseconds. Default: 30000 */
  timeout?: number;
}

/**
 * Rate-limited fetch with caching, retry, and deduplication
 *
 * @example
 * // Basic usage - goes through rate limiter
 * const response = await rateLimitedFetch('https://api.mintgarden.io/nfts/abc');
 *
 * @example
 * // With caching (5 minute TTL)
 * const response = await rateLimitedFetch(url, { cacheTtl: 5 * 60 * 1000 });
 *
 * @example
 * // Skip rate limiter for critical requests
 * const response = await rateLimitedFetch(url, { skipQueue: true });
 */
export async function rateLimitedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { cacheTtl = 0, skipQueue = false, rateLimitConfig, timeout = 30000, ...fetchOptions } = options;
  const cacheKey = getCacheKey(url, fetchOptions);

  // 1. Check cache first
  if (cacheTtl > 0) {
    const cached = getCachedResponse<Response>(cacheKey);
    if (cached) {
      return cached.clone();
    }
  }

  // 2. Check for in-flight request (deduplication)
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<Response>;
  }

  // 3. Create the request
  const requestPromise = (async () => {
    const domain = getDomainFromUrl(url);
    const queue = getQueueForDomain(domain);

    const executeRequest = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number; response: Response };
          error.status = response.status;
          error.response = response;
          throw error;
        }

        // Cache successful responses
        if (cacheTtl > 0) {
          setCachedResponse(cacheKey, response.clone(), cacheTtl);
        }

        return response;
      } catch (error: unknown) {
        clearTimeout(timeoutId);

        if ((error as Error).name === 'AbortError') {
          const timeoutError = new Error(`Request timeout after ${timeout}ms`) as Error & { status: number };
          timeoutError.status = 408;
          throw timeoutError;
        }
        throw error;
      }
    };

    if (skipQueue) {
      return executeRequest();
    }

    return queue.add(executeRequest, rateLimitConfig);
  })();

  // Track in-flight request
  inFlightRequests.set(cacheKey, requestPromise);

  try {
    const response = await requestPromise;
    return response;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Convenience function for rate-limited JSON fetch
 */
export async function rateLimitedFetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await rateLimitedFetch(url, options);
  return response.json();
}

/**
 * Legacy fetchWithRetry function for backwards compatibility
 */
export async function fetchWithRetry(
  url: string,
  fetchOptions: RequestInit = {},
  retryOptions: {
    maxRetries?: number;
    timeout?: number;
    baseDelay?: number;
    retryStatuses?: number[];
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    timeout = 30000,
    baseDelay = 1000,
  } = retryOptions;

  return rateLimitedFetch(url, {
    ...fetchOptions,
    timeout,
    rateLimitConfig: {
      maxRetries,
      baseBackoffMs: baseDelay,
    },
  });
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * Get queue status for all domains
 */
export function getQueueStatus(): Record<string, { queueLength: number; isProcessing: boolean }> {
  const status: Record<string, { queueLength: number; isProcessing: boolean }> = {};
  for (const [domain, queue] of domainQueues.entries()) {
    status[domain] = {
      queueLength: queue.queueLength,
      isProcessing: queue.isProcessing,
    };
  }
  return status;
}

/**
 * Clear all caches
 */
export function clearCaches(): void {
  responseCache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { entries: number; domains: number } {
  return {
    entries: responseCache.size,
    domains: domainQueues.size,
  };
}

// ============================================
// NAMED QUEUES FOR SPECIFIC APIS
// ============================================

// Pre-create queues for known APIs
export const mintgardenQueue = getQueueForDomain('api.mintgarden.io');
export const dexieQueue = getQueueForDomain('api.dexie.space');
export const spacescanQueue = getQueueForDomain('api.spacescan.io');
export const spacescan2Queue = getQueueForDomain('api2.spacescan.io');
export const coingeckoQueue = getQueueForDomain('api.coingecko.com');
