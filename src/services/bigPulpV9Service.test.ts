import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBigPulpV9Cache, getBigPulpV9Entry, loadBigPulpV9Data } from './bigPulpV9Service';

describe('bigPulpV9Service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clearBigPulpV9Cache();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearBigPulpV9Cache();
  });

  it('loads the shared dataset once and reuses the cache', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        '42': {
          edition: 42,
          name: 'Wojak #0042',
          open_rarity_rank: 42,
          hp_count: 2,
          image_ipfs: 'ipfs://42',
          launcher_id: 'launcher-42',
          mintgarden_url: 'https://mintgarden.io/42',
          traits: { Base: 'Wojak' },
          hp_traits: ['Crown'],
          named_combos: [],
          cultures: [],
          is_five_hp: false,
          description: 'hello',
        },
      }),
    });

    const first = await loadBigPulpV9Data();
    const second = await loadBigPulpV9Data();
    const entry = await getBigPulpV9Entry(42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(entry?.edition).toBe(42);
  });

  it('throws on a failed response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(loadBigPulpV9Data()).rejects.toThrow('Failed to load big_pulp_v9_output.json: 500');
  });
});
