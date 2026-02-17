import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callMintGardenMint, MintRequestParams, MintGardenEnv } from './request';
import { MintError } from './errors';

/**
 * Tests for MintGarden 429 rate-limit detection in callMintGardenMint.
 *
 * When MintGarden returns HTTP 429, the function should:
 * - Throw a MintError with code 'RATE_LIMITED' immediately (no retries)
 * - Parse the Retry-After header (seconds) into retryAfterMs (milliseconds)
 * - Default to 30000ms when no Retry-After header is present
 */

const VALID_PARAMS: MintRequestParams = {
  walletAddress: 'xch1testaddress',
  mintType: 'free',
  ipfsImageUris: ['ipfs://image'],
  ipfsMetadataUris: ['ipfs://metadata'],
  imageHash: 'abc123',
  metadataHash: 'def456',
  priceXch: undefined,
  collectionUuid: 'test-uuid',
  editionNumber: 1,
  editionTotal: 100,
};

const VALID_ENV: MintGardenEnv = {
  MINTGARDEN_API_KEY: 'test-key',
  PHASE2_PROFILE_ID: 'test-profile',
  PHASE2_ROYALTY_ADDRESS: 'xch1royalty',
  PHASE2_ROYALTY_PCT: '10',
};

function mockFetchResponse(status: number, body: Record<string, unknown>, headers?: Record<string, string>): void {
  const headerMap = new Map(Object.entries(headers ?? {}));
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
      headers: {
        get: (key: string) => headerMap.get(key) ?? null,
      },
    })
  );
}

describe('callMintGardenMint – 429 rate-limit detection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Suppress console.log/error noise during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('throws MintError with RATE_LIMITED code on 429 response (not retried)', async () => {
    mockFetchResponse(429, { error: 'Too Many Requests' });

    // Attach .catch immediately to prevent unhandled rejection
    const resultPromise = callMintGardenMint(VALID_PARAMS, VALID_ENV).catch((e: unknown) => e);
    // Flush the AbortController timeout from fetchWithTimeout
    await vi.runAllTimersAsync();

    const err = await resultPromise;
    expect(err).toBeInstanceOf(MintError);
    expect((err as MintError).code).toBe('RATE_LIMITED');
    expect((err as MintError).message).toContain('rate limited');

    // Should only have been called once (no retries)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('parses Retry-After header and attaches retryAfterMs in milliseconds', async () => {
    mockFetchResponse(429, { error: 'Too Many Requests' }, { 'Retry-After': '60' });

    const resultPromise = callMintGardenMint(VALID_PARAMS, VALID_ENV).catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await resultPromise;
    expect(err).toBeInstanceOf(MintError);
    expect((err as any).retryAfterMs).toBe(60_000); // 60 seconds = 60000ms
  });

  it('defaults retryAfterMs to 30000 when no Retry-After header is present', async () => {
    mockFetchResponse(429, { error: 'Too Many Requests' });

    const resultPromise = callMintGardenMint(VALID_PARAMS, VALID_ENV).catch((e: unknown) => e);
    await vi.runAllTimersAsync();

    const err = await resultPromise;
    expect(err).toBeInstanceOf(MintError);
    expect((err as any).retryAfterMs).toBe(30_000);
  });
});
