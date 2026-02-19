import { describe, it, expect } from 'vitest';
import {
  HYPE_TIERS,
  getHypeLine,
  getStatLine,
} from './supplyMessages';
import type { StatInput } from './supplyMessages';

// ============================================================
// HYPE_TIERS constant
// ============================================================

describe('HYPE_TIERS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(HYPE_TIERS)).toBe(true);
    expect(HYPE_TIERS.length).toBeGreaterThan(0);
  });

  it('every tier has a maxMinted number', () => {
    for (const tier of HYPE_TIERS) {
      expect(typeof tier.maxMinted).toBe('number');
    }
  });

  it('every tier has a non-empty messages array', () => {
    for (const tier of HYPE_TIERS) {
      expect(Array.isArray(tier.messages)).toBe(true);
      expect(tier.messages.length).toBeGreaterThan(0);
    }
  });

  it('tiers are sorted in ascending maxMinted order', () => {
    for (let i = 1; i < HYPE_TIERS.length; i++) {
      expect(HYPE_TIERS[i].maxMinted).toBeGreaterThan(HYPE_TIERS[i - 1].maxMinted);
    }
  });

  it('last tier covers the maximum supply (4200)', () => {
    const last = HYPE_TIERS[HYPE_TIERS.length - 1];
    expect(last.maxMinted).toBeGreaterThanOrEqual(4200);
  });

  it('all message strings are non-empty', () => {
    for (const tier of HYPE_TIERS) {
      for (const msg of tier.messages) {
        expect(typeof msg).toBe('string');
        expect(msg.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================
// getHypeLine
// ============================================================

describe('getHypeLine', () => {
  it('returns a string for minted = 0', () => {
    const result = getHypeLine(0);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a string from the first tier when minted = 1', () => {
    const result = getHypeLine(1);
    expect(HYPE_TIERS[0].messages).toContain(result);
  });

  it('returns a string from the first tier when minted = 10', () => {
    const result = getHypeLine(10);
    expect(HYPE_TIERS[0].messages).toContain(result);
  });

  it('returns a string from the correct tier when minted = 11 (second tier)', () => {
    const result = getHypeLine(11);
    expect(HYPE_TIERS[1].messages).toContain(result);
  });

  it('returns a string from the second tier when minted = 50', () => {
    const result = getHypeLine(50);
    expect(HYPE_TIERS[1].messages).toContain(result);
  });

  it('returns a string from the third tier when minted = 51', () => {
    const result = getHypeLine(51);
    expect(HYPE_TIERS[2].messages).toContain(result);
  });

  it('returns a string from the third tier when minted = 100', () => {
    const result = getHypeLine(100);
    expect(HYPE_TIERS[2].messages).toContain(result);
  });

  it('returns a string for mid-supply minted values', () => {
    const result = getHypeLine(2100);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a string for minted = 4200 (max supply)', () => {
    const result = getHypeLine(4200);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a string even for minted > 4200 (over max)', () => {
    const result = getHypeLine(9999);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('result is always one of the messages in the matched tier', () => {
    // Run multiple times to test randomness is bounded
    const minted = 75; // falls in tier maxMinted=100, index 2
    const tier = HYPE_TIERS[2];
    for (let i = 0; i < 20; i++) {
      expect(tier.messages).toContain(getHypeLine(minted));
    }
  });

  it('uses the last tier for values exceeding all maxMinted thresholds', () => {
    const lastTier = HYPE_TIERS[HYPE_TIERS.length - 1];
    const result = getHypeLine(99999);
    expect(lastTier.messages).toContain(result);
  });
});

// ============================================================
// getStatLine
// ============================================================

describe('getStatLine', () => {
  it('returns a string for typical input', () => {
    const input: StatInput = { minted: 500, total: 4200 };
    const result = getStatLine(input);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes base price string in the possible outputs', () => {
    // The "Base price: 0.20 XCH" entry is always in stats array,
    // so running many times will eventually return it
    const input: StatInput = { minted: 500, total: 4200 };
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].some((r) => r.includes('0.20 XCH'))).toBe(true);
  });

  it('includes remaining slots in the possible outputs', () => {
    const input: StatInput = { minted: 500, total: 4200 };
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].some((r) => r.includes('3,700'))).toBe(true);
  });

  it('includes percentage in the possible outputs', () => {
    const input: StatInput = { minted: 420, total: 4200 };
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].some((r) => r.includes('%'))).toBe(true);
  });

  it('includes on-chain count message when minted < 100', () => {
    const input: StatInput = { minted: 42, total: 4200 };
    const results = new Set<string>();
    for (let i = 0; i < 200; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].some((r) => r.includes('42 Wojaks on-chain'))).toBe(true);
  });

  it('does NOT include on-chain count message when minted >= 100', () => {
    const input: StatInput = { minted: 100, total: 4200 };
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].every((r) => !r.includes('on-chain'))).toBe(true);
  });

  it('percentage calculation is correct for minted=2100 total=4200 (50%)', () => {
    const input: StatInput = { minted: 2100, total: 4200 };
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].some((r) => r.includes('50.0%'))).toBe(true);
  });

  it('remaining slots = total - minted', () => {
    const input: StatInput = { minted: 1000, total: 4200 };
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].some((r) => r.includes('3,200'))).toBe(true);
  });

  it('handles minted = 0 gracefully', () => {
    const input: StatInput = { minted: 0, total: 4200 };
    const result = getStatLine(input);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles minted = total gracefully (0 remaining)', () => {
    const input: StatInput = { minted: 4200, total: 4200 };
    const result = getStatLine(input);
    expect(typeof result).toBe('string');
    // percentage should be 0.0%
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getStatLine(input));
    }
    expect([...results].some((r) => r.includes('0.0%'))).toBe(true);
  });
});
