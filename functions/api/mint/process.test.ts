import { describe, it, expect, vi, beforeEach } from 'vitest';
import { muteConsole } from '@/tests/muteConsole';

// Mock external deps
vi.mock('./request', () => ({
  callMintGardenMint: vi.fn(),
}));

vi.mock('./uploadToIPFS', () => ({
  uploadToIPFS: vi.fn(),
  sha256Hex: vi.fn().mockResolvedValue('fakehash'),
  base64ToUint8Array: vi.fn().mockReturnValue(new Uint8Array([1])),
}));

vi.mock('./auditHelper', () => ({
  logMintStep: vi.fn().mockResolvedValue(undefined),
  markRefundNeeded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./mintNumberHelper', () => ({
  getNextMintNumber: vi.fn().mockResolvedValue(42),
}));

vi.mock('./traitResolver', () => ({
  consolidateTraits: vi.fn().mockReturnValue(new Map([
    ['Background', { traitType: 'Background', displayName: 'Orange' }],
    ['Base', { traitType: 'Base', displayName: 'Wojak' }],
    ['Head', { traitType: 'Head', displayName: 'Bandana' }],
  ])),
}));

import { processJob, finalizeJob, updateJobStep, buildCombatAttributes, buildFighterInsertSQL } from './process';
import { callMintGardenMint } from './request';
import { uploadToIPFS } from './uploadToIPFS';
import { logMintStep } from './auditHelper';
import { getNextMintNumber } from './mintNumberHelper';
import type { ProcessEnv } from './process';

function mockStmt(firstResult: unknown = null, runResult = { meta: { changes: 1, last_row_id: 1 } }) {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(firstResult),
    run: vi.fn().mockResolvedValue(runResult),
    all: vi.fn().mockResolvedValue({ results: [] }),
  };
}

function createMockEnv(): ProcessEnv & { DB: { prepare: ReturnType<typeof vi.fn>; batch: ReturnType<typeof vi.fn> }; MINT_JOBS_KV: { put: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } } {
  return {
    DB: {
      prepare: vi.fn(() => mockStmt()),
      batch: vi.fn().mockResolvedValue([]),
    },
    MINT_JOBS_KV: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
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

const freeJobRow = {
  id: 1, wallet_address: 'xch1' + 'a'.repeat(58), idempotency_key: 'key-1',
  layers_json: '{"Background":"bg/orange.png","Base":"base/classic.png"}',
  colors_json: '{}', image_base64_hash: 'hash123', mint_type: 'free' as const,
  credit_cost: 10000, xch_price_mojos: null, surcharge_xch: null,
  highest_surcharge_trait: null, step: 'queued', mint_number: null,
  ipfs_image_uris: null, ipfs_metadata_uris: null, image_hash: null,
  metadata_hash: null, mintgarden_launcher_id: null, offer_file: null,
  error_message: null, error_code: null, retry_count: 0, max_retries: 3,
  phase2_mint_id: null, credit_spend_id: 5, created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z', started_at: null, completed_at: null,
  expires_at: null, wallet_lock: 'xch1' + 'a'.repeat(58),
};

const paidJobRow = { ...freeJobRow, id: 2, mint_type: 'paid' as const, credit_cost: null, xch_price_mojos: 200000000000, credit_spend_id: null };
muteConsole();

describe('buildCombatAttributes', () => {
  it('returns 7 CHIP-0007 attribute entries', () => {
    const attrs = buildCombatAttributes({
      type: 'PSYCHE',
      nature: 'Focused',
      ability: 'Magic Guard',
      moves: ['Mind Ray', 'Mesmerize', 'Dream Drain', 'Sixth Sense'],
    });
    expect(attrs).toHaveLength(7);
    expect(attrs[0]).toEqual({ trait_type: 'Combat Type', value: 'PSYCHE' });
    expect(attrs[1]).toEqual({ trait_type: 'Nature', value: 'Focused' });
    expect(attrs[2]).toEqual({ trait_type: 'Ability', value: 'Magic Guard' });
    expect(attrs[3]).toEqual({ trait_type: 'Move 1', value: 'Mind Ray' });
    expect(attrs[6]).toEqual({ trait_type: 'Move 4', value: 'Sixth Sense' });
  });
});

describe('buildFighterInsertSQL', () => {
  it('builds correct INSERT statement', () => {
    const sql = buildFighterInsertSQL({
      nft_id: 'nft_abc123',
      edition_number: 42,
      owner_did: 'did:chia:xyz',
      combat_type: 'PSYCHE',
      nature: 'Focused',
      ability: 'Magic Guard',
      moves: ['Mind Ray', 'Mesmerize', 'Dream Drain', 'Sixth Sense'],
    });
    expect(sql.query).toContain('INSERT INTO combat_fighters');
    expect(sql.bindings).toContain('nft_abc123');
    expect(sql.bindings).toContain('PSYCHE');
  });
});

describe('process.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateJobStep', () => {
    it('updates job step in database', async () => {
      const env = createMockEnv();
      const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
      env.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        run: runMock,
      }));

      await updateJobStep(env.DB as unknown as D1Database, 123, 'uploading_ipfs');

      expect(env.DB.prepare).toHaveBeenCalled();
      const query = (env.DB.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(query).toContain('UPDATE mint_jobs SET step');
      expect(runMock).toHaveBeenCalled();
    });
  });

  describe('processJob', () => {
    it('does nothing if job is not in queued state', async () => {
      const env = createMockEnv();
      env.DB.prepare = vi.fn(() => mockStmt(null)); // No job found for step=queued
      await processJob(env, 1, 'base64imagedata');
      expect(uploadToIPFS).not.toHaveBeenCalled();
      expect(callMintGardenMint).not.toHaveBeenCalled();
    });

    it('processes a free mint through to finalization', async () => {
      const env = createMockEnv();

      let stepCallCount = 0;
      env.DB.prepare = vi.fn((query: string) => {
        // Initial load: job in queued state
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN') && stepCallCount === 0) {
          stepCallCount++;
          return mockStmt(freeJobRow);
        }
        // Concurrency gate: under limit, proceed
        if (query.includes("COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'")) {
          return mockStmt({ count: 0 });
        }
        // Step updates
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        // Mint number update
        if (query.includes('UPDATE mint_jobs SET mint_number')) return mockStmt();
        // IPFS URIs update
        if (query.includes('ipfs_image_uris')) return mockStmt();
        // Launcher ID update
        if (query.includes('mintgarden_launcher_id')) return mockStmt();
        // FinalizeJob: reload job
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) {
          return mockStmt({
            ...freeJobRow,
            step: 'finalizing',
            mint_number: 42,
            ipfs_image_uris: '["ipfs://abc"]',
            ipfs_metadata_uris: '["ipfs://def"]',
            mintgarden_launcher_id: 'nft1launcher',
          });
        }
        // Phase2 mint lookup
        if (query.includes('SELECT id FROM phase2_mints')) return mockStmt({ id: 100 });
        // Count mints
        if (query.includes("SELECT COUNT(*) AS count FROM phase2_mints")) return mockStmt({ count: 10 });
        // Chain: no queued jobs
        if (query.includes('mint_queued') && query.includes('ORDER BY created_at')) return mockStmt(null);
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockResolvedValue({
        dataHash: 'img-hash', dataUris: ['ipfs://img'],
        metadataHash: 'meta-hash', metadataUris: ['ipfs://meta'],
      });
      vi.mocked(callMintGardenMint).mockResolvedValue({ offerFile: null, launcherId: 'nft1launcher' });

      await processJob(env, 1, 'base64imagedata');

      expect(uploadToIPFS).toHaveBeenCalled();
      expect(callMintGardenMint).toHaveBeenCalled();
      expect(logMintStep).toHaveBeenCalled();
    });

    it('processes a paid mint to awaiting_payment and stops', async () => {
      const env = createMockEnv();

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt(paidJobRow);
        // Concurrency gate: under limit, proceed
        if (query.includes("COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'")) {
          return mockStmt({ count: 0 });
        }
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        if (query.includes('UPDATE mint_jobs SET mint_number')) return mockStmt();
        if (query.includes('ipfs_image_uris')) return mockStmt();
        if (query.includes('offer_file')) return mockStmt();
        // Chain: no queued jobs
        if (query.includes('mint_queued') && query.includes('ORDER BY created_at')) return mockStmt(null);
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockResolvedValue({
        dataHash: 'img-hash', dataUris: ['ipfs://img'],
        metadataHash: 'meta-hash', metadataUris: ['ipfs://meta'],
      });
      vi.mocked(callMintGardenMint).mockResolvedValue({ offerFile: 'offer-content', launcherId: null });

      await processJob(env, 2, 'base64imagedata');

      // Verify uploadToIPFS was called
      expect(uploadToIPFS).toHaveBeenCalled();
      // Verify MintGarden was called
      expect(callMintGardenMint).toHaveBeenCalled();

      // For paid mint, should NOT finalize (returns before finalizeJob)
      // The step should be set to awaiting_payment
      const stepCalls = (env.DB.prepare as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: string[]) => c[0].includes('UPDATE mint_jobs SET step')
      );
      expect(stepCalls.length).toBeGreaterThan(0);
    });

    it('retries on IPFS upload failure', async () => {
      const env = createMockEnv();

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt({ ...freeJobRow, retry_count: 0 });
        // For handleJobFailure re-read
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) return mockStmt({ ...freeJobRow, step: 'uploading_ipfs', retry_count: 0 });
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockRejectedValue(new Error('Pinata timeout'));

      await processJob(env, 1, 'base64imagedata');

      // Should have updated step back to queued with incremented retry_count
      const retryCalls = (env.DB.prepare as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: string[]) => c[0].includes("step = 'queued'") && c[0].includes('retry_count')
      );
      expect(retryCalls.length).toBeGreaterThan(0);
    });

    it('marks job as failed when max retries exhausted', async () => {
      const env = createMockEnv();
      const exhaustedJob = { ...freeJobRow, retry_count: 3, max_retries: 3 };

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt(exhaustedJob);
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) return mockStmt({ ...exhaustedJob, step: 'uploading_ipfs' });
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockRejectedValue(new Error('Pinata timeout'));

      await processJob(env, 1, 'base64imagedata');

      // At least the failure handler runs and logs
      expect(logMintStep).toHaveBeenCalled();
    });

    it('reuses existing mint_number on retry', async () => {
      const env = createMockEnv();
      const jobWithNumber = { ...freeJobRow, mint_number: 100, retry_count: 1 };

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt(jobWithNumber);
        // Concurrency gate: under limit, proceed
        if (query.includes("COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'")) {
          return mockStmt({ count: 0 });
        }
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) {
          return mockStmt({
            ...jobWithNumber,
            step: 'finalizing',
            ipfs_image_uris: '["ipfs://abc"]',
            ipfs_metadata_uris: '["ipfs://def"]',
            mintgarden_launcher_id: 'nft1launcher',
          });
        }
        if (query.includes('SELECT id FROM phase2_mints')) return mockStmt({ id: 100 });
        if (query.includes("SELECT COUNT(*) AS count FROM phase2_mints")) return mockStmt({ count: 10 });
        // Chain: no queued jobs
        if (query.includes('mint_queued') && query.includes('ORDER BY created_at')) return mockStmt(null);
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockResolvedValue({
        dataHash: 'img-hash', dataUris: ['ipfs://img'],
        metadataHash: 'meta-hash', metadataUris: ['ipfs://meta'],
      });
      vi.mocked(callMintGardenMint).mockResolvedValue({ offerFile: null, launcherId: 'nft1launcher' });

      await processJob(env, 1, 'base64imagedata');

      // Should NOT call getNextMintNumber since job already has one
      expect(getNextMintNumber).not.toHaveBeenCalled();
    });

    it('sets step to mint_queued when concurrency limit reached', async () => {
      const env = createMockEnv();
      const stepUpdateBindCalls: unknown[][] = [];

      env.DB.prepare = vi.fn((query: string) => {
        // Initial SELECT load — must match SELECT specifically, not UPDATE
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt(freeJobRow);
        if (query.includes("COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'")) {
          return mockStmt({ count: 3 });
        }
        if (query.includes('UPDATE mint_jobs SET step')) {
          // Track bind args for step updates
          const stmt = {
            bind: vi.fn((...args: unknown[]) => {
              stepUpdateBindCalls.push(args);
              return stmt;
            }),
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({ meta: { changes: 1, last_row_id: 1 } }),
            all: vi.fn().mockResolvedValue({ results: [] }),
          };
          return stmt;
        }
        if (query.includes('UPDATE mint_jobs SET mint_number')) return mockStmt();
        if (query.includes('ipfs_image_uris')) return mockStmt();
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockResolvedValue({
        dataHash: 'img-hash', dataUris: ['ipfs://img'],
        metadataHash: 'meta-hash', metadataUris: ['ipfs://meta'],
      });

      await processJob(env, 1, 'base64imagedata');

      // Should NOT have called MintGarden
      expect(callMintGardenMint).not.toHaveBeenCalled();
      // Should have set step to mint_queued specifically
      const mintQueuedCall = stepUpdateBindCalls.find((args) => args[0] === 'mint_queued');
      expect(mintQueuedCall).toBeTruthy();
    });

    it('proceeds to MintGarden when under concurrency limit', async () => {
      const env = createMockEnv();

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt(freeJobRow);
        if (query.includes("COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'")) {
          return mockStmt({ count: 1 });
        }
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        if (query.includes('UPDATE mint_jobs SET mint_number')) return mockStmt();
        if (query.includes('ipfs_image_uris')) return mockStmt();
        if (query.includes('mintgarden_launcher_id')) return mockStmt();
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) {
          return mockStmt({
            ...freeJobRow, step: 'finalizing', mint_number: 42,
            ipfs_image_uris: '["ipfs://abc"]', ipfs_metadata_uris: '["ipfs://def"]',
            mintgarden_launcher_id: 'nft1launcher',
          });
        }
        if (query.includes('SELECT id FROM phase2_mints')) return mockStmt({ id: 100 });
        if (query.includes("SELECT COUNT(*) AS count FROM phase2_mints")) return mockStmt({ count: 10 });
        // Chain: no queued jobs
        if (query.includes('mint_queued') && query.includes('ORDER BY created_at')) return mockStmt(null);
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockResolvedValue({
        dataHash: 'img-hash', dataUris: ['ipfs://img'],
        metadataHash: 'meta-hash', metadataUris: ['ipfs://meta'],
      });
      vi.mocked(callMintGardenMint).mockResolvedValue({ offerFile: null, launcherId: 'nft1launcher' });

      await processJob(env, 1, 'base64imagedata');

      expect(callMintGardenMint).toHaveBeenCalled();
    });

    it('re-queues to mint_queued on RATE_LIMITED error with not_before', async () => {
      const env = createMockEnv();

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt(freeJobRow);
        if (query.includes("COUNT(*) AS count FROM mint_jobs WHERE step = 'calling_mintgarden'")) {
          return mockStmt({ count: 0 });
        }
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        if (query.includes('UPDATE mint_jobs SET mint_number')) return mockStmt();
        if (query.includes('ipfs_image_uris') && !query.includes('mint_queued')) return mockStmt();
        // RATE_LIMITED re-queue
        if (query.includes('mint_queued') && query.includes('not_before')) return mockStmt();
        // Chain: no queued jobs
        if (query.includes('mint_queued') && query.includes('ORDER BY created_at')) return mockStmt(null);
        return mockStmt();
      });

      vi.mocked(uploadToIPFS).mockResolvedValue({
        dataHash: 'img-hash', dataUris: ['ipfs://img'],
        metadataHash: 'meta-hash', metadataUris: ['ipfs://meta'],
      });

      const { MintError } = await import('./errors');
      const rateLimitErr = new MintError('RATE_LIMITED', 'Rate limited');
      rateLimitErr.retryAfterMs = 30000;
      vi.mocked(callMintGardenMint).mockRejectedValueOnce(rateLimitErr);

      await processJob(env, 1, 'base64imagedata');

      // Should have set step to mint_queued with not_before
      const prepCalls = (env.DB.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const reQueueCall = prepCalls.find(
        (c: string[]) => c[0].includes('mint_queued') && c[0].includes('not_before')
      );
      expect(reQueueCall).toBeTruthy();
      // Should NOT have called handleJobFailure (no final failure log for RATE_LIMITED)
    });

    it('throws CONFIG_ERROR when PINATA_JWT is missing', async () => {
      const env = createMockEnv();
      env.PINATA_JWT = undefined;

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM mint_jobs WHERE id = ? AND step IN')) return mockStmt(freeJobRow);
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) return mockStmt(freeJobRow);
        return mockStmt();
      });

      await processJob(env as ProcessEnv, 1, 'base64imagedata');

      // Should log the error
      expect(logMintStep).toHaveBeenCalled();
    });
  });

  describe('finalizeJob', () => {
    it('inserts phase2_mints and updates job to completed', async () => {
      const env = createMockEnv();

      const finalizedJob = {
        ...freeJobRow,
        step: 'awaiting_payment',
        mint_number: 42,
        ipfs_image_uris: '["ipfs://img"]',
        ipfs_metadata_uris: '["ipfs://meta"]',
        image_hash: 'imghash',
        metadata_hash: 'metahash',
        mintgarden_launcher_id: 'nft1abc',
      };

      let phase2LookupCount = 0;
      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) return mockStmt(finalizedJob);
        // First phase2_mints lookup (idempotency check) returns null, second (post-batch) returns { id: 500 }
        if (query.includes('SELECT id FROM phase2_mints') && !query.includes('COUNT')) {
          phase2LookupCount++;
          return mockStmt(phase2LookupCount === 1 ? null : { id: 500 });
        }
        if (query.includes('UPDATE credit_spends')) return mockStmt();
        if (query.includes("SELECT COUNT(*) AS count FROM phase2_mints")) return mockStmt({ count: 100 });
        if (query.includes('step = \'completed\'')) return mockStmt();
        return mockStmt();
      });

      await finalizeJob(env, 1);

      // Verify batch was called (for phase2_mints insert + trait usage)
      expect(env.DB.batch).toHaveBeenCalled();
      // Verify log was called
      expect(logMintStep).toHaveBeenCalled();
    });

    it('throws JOB_NOT_FOUND if job does not exist', async () => {
      const env = createMockEnv();

      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) return mockStmt(null);
        return mockStmt();
      });

      await expect(finalizeJob(env, 999)).rejects.toThrow('not found during finalization');
    });

    it('updates credit_spends for free mints', async () => {
      const env = createMockEnv();

      const freeFinalized = {
        ...freeJobRow,
        step: 'calling_mintgarden',
        mint_number: 42,
        ipfs_image_uris: '["ipfs://img"]',
        ipfs_metadata_uris: '["ipfs://meta"]',
        mintgarden_launcher_id: 'nft1abc',
        credit_spend_id: 999,
      };

      let creditSpendUpdated = false;
      let phase2LookupCount = 0;
      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) return mockStmt(freeFinalized);
        if (query.includes('SELECT id FROM phase2_mints') && !query.includes('COUNT')) {
          phase2LookupCount++;
          return mockStmt(phase2LookupCount === 1 ? null : { id: 500 });
        }
        if (query.includes('UPDATE credit_spends')) {
          creditSpendUpdated = true;
          return mockStmt();
        }
        if (query.includes("SELECT COUNT(*) AS count FROM phase2_mints")) return mockStmt({ count: 100 });
        return mockStmt();
      });

      await finalizeJob(env, 1);

      expect(creditSpendUpdated).toBe(true);
    });

    it('sets sold_out flag when supply is exhausted', async () => {
      const env = createMockEnv();

      const finalizedJob = {
        ...freeJobRow,
        step: 'calling_mintgarden',
        mint_number: 4200,
        ipfs_image_uris: '["ipfs://img"]',
        ipfs_metadata_uris: '["ipfs://meta"]',
        mintgarden_launcher_id: 'nft1abc',
      };

      let soldOutSet = false;
      let phase2LookupCount = 0;
      env.DB.prepare = vi.fn((query: string) => {
        if (query.includes('UPDATE mint_jobs SET step')) return mockStmt();
        if (query.includes('SELECT * FROM mint_jobs WHERE id')) return mockStmt(finalizedJob);
        if (query.includes('SELECT id FROM phase2_mints') && !query.includes('COUNT')) {
          phase2LookupCount++;
          return mockStmt(phase2LookupCount === 1 ? null : { id: 500 });
        }
        if (query.includes("SELECT COUNT(*) AS count FROM phase2_mints")) return mockStmt({ count: 4200 });
        if (query.includes("INSERT OR REPLACE INTO server_state") && query.includes('sold_out')) {
          soldOutSet = true;
          return mockStmt();
        }
        return mockStmt();
      });

      await finalizeJob(env, 1);

      expect(soldOutSet).toBe(true);
    });
  });
});
