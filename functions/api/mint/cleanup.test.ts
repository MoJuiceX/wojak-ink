import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock process.ts
vi.mock('./process', () => ({
  processJob: vi.fn().mockResolvedValue(undefined),
  finalizeJob: vi.fn().mockResolvedValue(undefined),
}));

// Mock uploadToIPFS
vi.mock('./uploadToIPFS', () => ({
  unpinFromIPFS: vi.fn().mockResolvedValue(true),
  extractCidFromUri: vi.fn((uri: string) => {
    if (uri.startsWith('ipfs://')) return uri.replace('ipfs://', '');
    const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }),
}));

// Mock auditHelper
vi.mock('./auditHelper', () => ({
  markRefundNeeded: vi.fn().mockResolvedValue(undefined),
  logMintStep: vi.fn().mockResolvedValue(undefined),
}));

// We need to mock global fetch for MintGarden API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { cleanupStaleJobs } from './cleanup';
import { finalizeJob, processJob } from './process';
import { unpinFromIPFS } from './uploadToIPFS';
import { markRefundNeeded, logMintStep } from './auditHelper';

const TEST_WALLET = 'xch1' + 'a'.repeat(58);

function mockStmt(firstResult: unknown = null, runResult = { meta: { changes: 0 } }) {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(firstResult),
    run: vi.fn().mockResolvedValue(runResult),
    all: vi.fn().mockResolvedValue({ results: [] }),
  };
}

function createMockEnv() {
  return {
    DB: {
      prepare: vi.fn(() => mockStmt()),
      batch: vi.fn().mockResolvedValue([]),
    },
    MINT_JOBS_KV: {
      put: vi.fn(), get: vi.fn().mockResolvedValue(null), delete: vi.fn(),
    },
    PINATA_JWT: 'test-jwt',
    PINATA_GATEWAY: 'test-gw',
    PHASE2_COLLECTION_UUID: 'test-uuid',
    PHASE2_PROFILE_ID: 'test-profile',
    PHASE2_ROYALTY_ADDRESS: 'xch1royalty',
    PHASE2_ROYALTY_PCT: '10',
    MINTGARDEN_API_KEY: 'test-key',
  };
}

describe('cleanup.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: false });
  });

  it('returns zero stats when nothing to clean up', async () => {
    const env = createMockEnv();
    const stats = await cleanupStaleJobs(env as any);
    expect(stats.autoFinalized).toBe(0);
    expect(stats.expiredPaid).toBe(0);
    expect(stats.stuckProcessing).toBe(0);
  });

  it('auto-finalizes paid mint when MintGarden detects the NFT', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return {
          ...mockStmt(),
          all: vi.fn().mockResolvedValue({ results: [{ id: 1, wallet_address: TEST_WALLET, mint_number: 42 }] }),
          bind: vi.fn().mockReturnThis(),
        };
      }
      if (query.includes('UPDATE mint_jobs SET step')) return mockStmt(null, { meta: { changes: 1 } });
      if (query.includes('UPDATE mint_jobs SET mintgarden_launcher_id')) return mockStmt(null, { meta: { changes: 1 } });
      return mockStmt();
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ encoded_id: 'nft1launcher123', data: { edition_number: 42 } }],
      }),
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.autoFinalized).toBe(1);
    expect(finalizeJob).toHaveBeenCalled();
  });

  it('expires awaiting_payment jobs past expires_at', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes("step = 'failed'") && query.includes('OFFER_EXPIRED')) {
        return mockStmt(null, { meta: { changes: 3 } });
      }
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.expiredPaid).toBe(3);
  });

  it('fails stuck processing jobs', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes('OFFER_EXPIRED')) return mockStmt(null, { meta: { changes: 0 } });
      if (query.includes('TIMEOUT') && query.includes('-5 minutes')) return mockStmt(null, { meta: { changes: 2 } });
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.stuckProcessing).toBe(2);
  });

  it('retries stale queued jobs', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes('step = \'queued\'') && query.includes('created_at')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [{ id: 5 }] }), bind: vi.fn().mockReturnThis() };
      }
      return mockStmt();
    });
    env.MINT_JOBS_KV.get = vi.fn().mockResolvedValue('base64imagedata');

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.retriedQueued).toBe(1);
    expect(processJob).toHaveBeenCalledWith(env, 5, 'base64imagedata');
  });

  it('fails queued job if image expired from KV', async () => {
    const env = createMockEnv();
    let jobFailedDueToImageExpiry = false;
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes('step = \'queued\'') && query.includes('created_at')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [{ id: 5 }] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes('IMAGE_EXPIRED')) {
        jobFailedDueToImageExpiry = true;
        return mockStmt(null, { meta: { changes: 1 } });
      }
      return mockStmt();
    });
    env.MINT_JOBS_KV.get = vi.fn().mockResolvedValue(null); // Image not in KV

    await cleanupStaleJobs(env as any);
    expect(jobFailedDueToImageExpiry).toBe(true);
  });

  it('refunds credits for failed free mint jobs', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes("step = 'failed'") && query.includes("mint_type = 'free'") && query.includes('credit_spend_id IS NOT NULL')) {
        return {
          ...mockStmt(),
          all: vi.fn().mockResolvedValue({ results: [{ id: 10, credit_spend_id: 5 }] }),
          bind: vi.fn().mockReturnThis(),
        };
      }
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.refunded).toBe(1);
  });

  it('unpins IPFS data for failed jobs older than 1 hour', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes('ipfs_image_uris IS NOT NULL') && query.includes('-1 hour')) {
        return {
          ...mockStmt(),
          all: vi.fn().mockResolvedValue({
            results: [{
              id: 1,
              ipfs_image_uris: '["ipfs://QmImageHash"]',
              ipfs_metadata_uris: '["ipfs://QmMetaHash"]',
            }],
          }),
          bind: vi.fn().mockReturnThis(),
        };
      }
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.unpinnedIPFS).toBe(1);
    expect(unpinFromIPFS).toHaveBeenCalled();
  });

  it('flags refunds for paid mints that failed after payment', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes("mj.step = 'failed'") && query.includes("mj.mint_type = 'paid'") && query.includes('mj.mintgarden_launcher_id IS NOT NULL')) {
        return {
          ...mockStmt(),
          all: vi.fn().mockResolvedValue({
            results: [{
              job_id: 15,
              phase2_mint_id: 200,
              error_message: 'Finalization failed',
              mintgarden_launcher_id: 'nft1xyz',
              wallet_address: TEST_WALLET,
            }],
          }),
          bind: vi.fn().mockReturnThis(),
        };
      }
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.paidRefundsFlagged).toBe(1);
    expect(markRefundNeeded).toHaveBeenCalledWith(env.DB, 200, expect.stringContaining('job 15'));
  });

  it('logs refund need for paid mints without phase2_mints record', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes("mj.step = 'failed'") && query.includes("mj.mint_type = 'paid'") && query.includes('mj.mintgarden_launcher_id IS NOT NULL')) {
        return {
          ...mockStmt(),
          all: vi.fn().mockResolvedValue({
            results: [{
              job_id: 20,
              phase2_mint_id: null, // No phase2_mints record
              error_message: 'Error before finalization',
              mintgarden_launcher_id: 'nft1abc',
              wallet_address: TEST_WALLET,
            }],
          }),
          bind: vi.fn().mockReturnThis(),
        };
      }
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.paidRefundsFlagged).toBe(1);
    expect(logMintStep).toHaveBeenCalledWith(env.DB, expect.objectContaining({
      step: 'refund_needed_no_mint_record',
    }));
  });

  it('handles MintGarden API errors gracefully during auto-finalize', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return {
          ...mockStmt(),
          all: vi.fn().mockResolvedValue({ results: [{ id: 1, wallet_address: TEST_WALLET, mint_number: 42 }] }),
          bind: vi.fn().mockReturnThis(),
        };
      }
      return mockStmt();
    });

    mockFetch.mockRejectedValue(new Error('Network error'));

    const stats = await cleanupStaleJobs(env as any);
    // Should not crash, just log the error
    expect(stats.autoFinalized).toBe(0);
    expect(logMintStep).toHaveBeenCalledWith(env.DB, expect.objectContaining({
      step: 'auto_finalize_failed',
    }));
  });

  it('does not retry jobs that have reached max retries', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      // Query includes retry_count < max_retries, so jobs at max won't be returned
      if (query.includes('step = \'queued\'') && query.includes('retry_count < max_retries')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.retriedQueued).toBe(0);
    expect(processJob).not.toHaveBeenCalled();
  });

  it('expires legacy phase2_mints pending records', async () => {
    const env = createMockEnv();
    env.DB.prepare = vi.fn((query: string) => {
      if (query.includes('awaiting_payment') && query.includes('mintgarden_launcher_id IS NULL')) {
        return { ...mockStmt(), all: vi.fn().mockResolvedValue({ results: [] }), bind: vi.fn().mockReturnThis() };
      }
      if (query.includes("UPDATE phase2_mints SET status = 'expired'")) {
        return mockStmt(null, { meta: { changes: 5 } });
      }
      return mockStmt();
    });

    const stats = await cleanupStaleJobs(env as any);
    expect(stats.expiredLegacy).toBe(5);
  });
});
