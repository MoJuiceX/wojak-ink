import { describe, it, expect, vi } from 'vitest';
import { recalcPowerLevel, getNftHolderDid, getNftCreatorDid } from './_powerLevel';
import { POWER_LEVEL_MAX } from './_shared';

type QueryMethod = 'first' | 'all' | 'run';
type QueryCall = { query: string; method: QueryMethod; binds: unknown[] };

function createRoutingDb(
  resolver: (query: string, method: QueryMethod, binds: unknown[]) => unknown
): { db: D1Database; calls: QueryCall[] } {
  const calls: QueryCall[] = [];

  const db = {
    prepare: vi.fn((query: string) => {
      let binds: unknown[] = [];
      const stmt = {
        bind: vi.fn((...args: unknown[]) => {
          binds = args;
          return stmt;
        }),
        first: vi.fn(async () => {
          calls.push({ query, method: 'first', binds });
          return resolver(query, 'first', binds);
        }),
        all: vi.fn(async () => {
          calls.push({ query, method: 'all', binds });
          return resolver(query, 'all', binds);
        }),
        run: vi.fn(async () => {
          calls.push({ query, method: 'run', binds });
          return resolver(query, 'run', binds);
        }),
      };
      return stmt;
    }),
  } as unknown as D1Database;

  return { db, calls };
}

describe('_powerLevel', () => {
  it('returns null when the player is not found', async () => {
    const { db, calls } = createRoutingDb((query, method) => {
      if (method === 'first' && query.includes('SELECT wallet_address, phase1_verified FROM game_players')) {
        return null;
      }
      throw new Error(`Unexpected ${method} query: ${query}`);
    });

    await expect(recalcPowerLevel(db, 'did:chia:missing')).resolves.toBeNull();
    expect(calls).toHaveLength(1);
  });

  it('returns 0 for unverified players without attempting score updates', async () => {
    const { db, calls } = createRoutingDb((query, method) => {
      if (method === 'first' && query.includes('SELECT wallet_address, phase1_verified FROM game_players')) {
        return { wallet_address: 'xch1holder', phase1_verified: 0 };
      }
      throw new Error(`Unexpected ${method} query: ${query}`);
    });

    await expect(recalcPowerLevel(db, 'did:chia:unverified')).resolves.toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('calculates holdings, creator spread, burn bonuses, and persists the rounded result', async () => {
    const did = 'did:chia:testdid';
    const wallet = 'xch1wallet';

    const holdings = [
      { nft_id: 'nft1', creator_wallet: 'xch1creatorA', net_score: 100, surcharge: 200000 },
      { nft_id: 'nft2', creator_wallet: 'xch1creatorA', net_score: 40, surcharge: 0 },
      { nft_id: 'nft3', creator_wallet: wallet, net_score: 10, surcharge: 100000 },
    ];
    const burnRows = [
      { nft_id: 'nft1', cnt: 2 },
      { nft_id: 'nft2', cnt: 1 },
    ];
    const creationStats = { total_net_score: 300, unique_collectors: 4 };

    const { db, calls } = createRoutingDb((query, method, binds) => {
      if (method === 'first' && query.includes('SELECT wallet_address, phase1_verified FROM game_players')) {
        expect(binds).toEqual([did]);
        return { wallet_address: wallet, phase1_verified: 1 };
      }

      if (method === 'all' && query.includes('FROM burn_power_grants')) {
        expect(binds).toEqual([did]);
        return { results: burnRows };
      }

      if (method === 'all' && query.includes('FROM did_holdings dh')) {
        expect(binds).toEqual([did]);
        return { results: holdings };
      }

      if (method === 'first' && query.includes('COUNT(DISTINCT dh.did_id) as unique_collectors')) {
        expect(binds).toEqual([did, wallet]);
        return creationStats;
      }

      if (method === 'run' && query.includes('UPDATE game_players')) {
        return { meta: { changes: 1 } };
      }

      throw new Error(`Unexpected ${method} query: ${query}`);
    });

    const expectedRaw =
      (100 + (50 + 30 * Math.log(3)) + 15 + 100) +
      (40 + (50 + 30 * Math.log(1)) + 0 + 50) +
      (10 + (50 + 30 * Math.log(2)) + 0 + 0) +
      (300 * 0.5 + 4 * 10);
    const expected = Math.round(expectedRaw);

    const result = await recalcPowerLevel(db, did);

    expect(result).toBe(expected);

    const updateCall = calls.find(
      (call) => call.method === 'run' && call.query.includes('UPDATE game_players')
    );
    expect(updateCall).toBeDefined();
    expect(updateCall?.binds).toEqual([expected, did]);
    expect(expected).toBeLessThan(POWER_LEVEL_MAX);
  });

  it('caps extreme totals at POWER_LEVEL_MAX and continues when burn bonus table is missing', async () => {
    const did = 'did:chia:cap';
    const wallet = 'xch1cap';

    const { db, calls } = createRoutingDb((query, method) => {
      if (method === 'first' && query.includes('SELECT wallet_address, phase1_verified FROM game_players')) {
        return { wallet_address: wallet, phase1_verified: 1 };
      }

      if (method === 'all' && query.includes('FROM burn_power_grants')) {
        throw new Error('no such table: burn_power_grants');
      }

      if (method === 'all' && query.includes('FROM did_holdings dh')) {
        return {
          results: [
            { nft_id: 'nft1', creator_wallet: 'xch1a', net_score: 50_000, surcharge: 9_999_999_999 },
            { nft_id: 'nft2', creator_wallet: 'xch1b', net_score: 50_000, surcharge: 9_999_999_999 },
          ],
        };
      }

      if (method === 'first' && query.includes('COUNT(DISTINCT dh.did_id) as unique_collectors')) {
        return { total_net_score: 50_000, unique_collectors: 999 };
      }

      if (method === 'run' && query.includes('UPDATE game_players')) {
        return { meta: { changes: 1 } };
      }

      throw new Error(`Unexpected ${method} query: ${query}`);
    });

    await expect(recalcPowerLevel(db, did)).resolves.toBe(POWER_LEVEL_MAX);

    const updateCall = calls.find(
      (call) => call.method === 'run' && call.query.includes('UPDATE game_players')
    );
    expect(updateCall?.binds).toEqual([POWER_LEVEL_MAX, did]);
  });

  it('resolves NFT holder and creator DIDs from lookup queries', async () => {
    const { db } = createRoutingDb((query, method, binds) => {
      if (method === 'first' && query.includes('SELECT did_id FROM did_holdings WHERE nft_id = ?')) {
        if (binds[0] === 'nft-held') return { did_id: 'did:chia:holder' };
        return null;
      }

      if (method === 'first' && query.includes('SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?')) {
        if (binds[0] === 'nft-created') return { creator_wallet: 'xch1creator' };
        return null;
      }

      if (method === 'first' && query.includes('SELECT did_id FROM game_players WHERE wallet_address = ?')) {
        return { did_id: 'did:chia:creator' };
      }

      throw new Error(`Unexpected ${method} query: ${query}`);
    });

    await expect(getNftHolderDid(db, 'nft-held')).resolves.toBe('did:chia:holder');
    await expect(getNftHolderDid(db, 'nft-missing')).resolves.toBeNull();
    await expect(getNftCreatorDid(db, 'nft-created')).resolves.toBe('did:chia:creator');
    await expect(getNftCreatorDid(db, 'nft-unknown')).resolves.toBeNull();
  });
});
