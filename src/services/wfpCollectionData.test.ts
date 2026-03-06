import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWfpCollectionDataCache,
  loadWfpMetadataByBase,
  loadWfpMetadataByEdition,
  loadWfpMetadataLite,
  loadWfpRarity,
} from './wfpCollectionData';

describe('wfpCollectionData', () => {
  const fetchMock = vi.fn();
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearWfpCollectionDataCache();
    fetchMock.mockReset();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleWarnSpy.mockRestore();
    clearWfpCollectionDataCache();
  });

  it('loads metadata-lite and builds shared indexes', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('metadata-lite.json')) {
        return {
          ok: true,
          json: async () => ([
            {
              name: 'Wojak #0001',
              edition: 1,
              date: 1,
              attributes: [{ trait_type: 'Base', value: 'Wojak' }],
            },
          ]),
        };
      }
      if (urlStr.includes('rarity.json')) {
        return {
          ok: true,
          json: async () => ({ '1': [1, 99, 'l'] }),
        };
      }
      throw new Error(`unexpected url ${urlStr}`);
    });

    const metadata = await loadWfpMetadataLite();
    const byEdition = await loadWfpMetadataByEdition();
    const byBase = await loadWfpMetadataByBase();
    const rarity = await loadWfpRarity();

    expect(metadata).toHaveLength(1);
    expect(byEdition.get(1)?.name).toBe('Wojak #0001');
    expect(byBase.get('Wojak')).toHaveLength(1);
    expect(rarity['1']?.[0]).toBe(1);
  });

  it('falls back to metadata.json when metadata-lite is missing', async () => {
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes('metadata-lite.json')) {
        return { ok: false, status: 404 };
      }
      if (urlStr.includes('metadata.json')) {
        return {
          ok: true,
          json: async () => ([
            {
              name: 'Wojak #0002',
              edition: 2,
              attributes: [{ trait_type: 'Base', value: 'Wojak' }],
            },
          ]),
        };
      }
      throw new Error(`unexpected url ${urlStr}`);
    });

    const metadata = await loadWfpMetadataLite();

    expect(metadata[0]?.edition).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
