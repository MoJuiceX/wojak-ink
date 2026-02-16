import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextMintNumber } from './mintNumberHelper';

function createMockDB() {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn(),
      }),
    }),
  };
}

describe('mintNumberHelper', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    db = createMockDB();
  });

  it('returns the next sequential mint number', async () => {
    db.prepare().bind().first.mockResolvedValue({ mint_number: 42 });
    const result = await getNextMintNumber(db as unknown as D1Database, 4200);
    expect(result).toBe(42);
  });

  it('throws SUPPLY_EXHAUSTED when cap is reached', async () => {
    db.prepare().bind().first.mockResolvedValue(null);
    await expect(getNextMintNumber(db as unknown as D1Database, 4200))
      .rejects.toThrow('SUPPLY_EXHAUSTED');
  });

  it('passes supply total to the query bind', async () => {
    db.prepare().bind().first.mockResolvedValue({ mint_number: 1 });
    await getNextMintNumber(db as unknown as D1Database, 100);
    expect(db.prepare().bind).toHaveBeenCalledWith(100);
  });

  it('returns mint_number from RETURNING clause', async () => {
    db.prepare().bind().first.mockResolvedValue({ mint_number: 1 });
    const result = await getNextMintNumber(db as unknown as D1Database, 4200);
    expect(result).toBe(1);
  });

  it('throws when result is null (supply exhausted)', async () => {
    db.prepare().bind().first.mockResolvedValue(null);
    await expect(getNextMintNumber(db as unknown as D1Database, 4200))
      .rejects.toThrow('SUPPLY_EXHAUSTED');
  });

  it('throws when mint_number is null', async () => {
    db.prepare().bind().first.mockResolvedValue({ mint_number: null });
    await expect(getNextMintNumber(db as unknown as D1Database, 4200))
      .rejects.toThrow('SUPPLY_EXHAUSTED');
  });
});
