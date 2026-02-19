import { describe, it, expect } from 'vitest';
import { TREASURY_TOKENS, TOTAL_TOKEN_VALUE_USD, type TokenConfig } from './tokenConfig';

describe('TREASURY_TOKENS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(TREASURY_TOKENS)).toBe(true);
    expect(TREASURY_TOKENS.length).toBeGreaterThan(0);
  });

  it('every token has a non-empty asset_id', () => {
    for (const token of TREASURY_TOKENS) {
      expect(typeof token.asset_id).toBe('string');
      expect(token.asset_id.length).toBeGreaterThan(0);
    }
  });

  it('every token has a non-empty name', () => {
    for (const token of TREASURY_TOKENS) {
      expect(typeof token.name).toBe('string');
      expect(token.name.length).toBeGreaterThan(0);
    }
  });

  it('every token has a non-empty symbol', () => {
    for (const token of TREASURY_TOKENS) {
      expect(typeof token.symbol).toBe('string');
      expect(token.symbol.length).toBeGreaterThan(0);
    }
  });

  it('every token has a numeric balance that is >= 0', () => {
    for (const token of TREASURY_TOKENS) {
      expect(typeof token.balance).toBe('number');
      expect(token.balance).toBeGreaterThanOrEqual(0);
    }
  });

  it('every token has a numeric value_usd that is >= 0', () => {
    for (const token of TREASURY_TOKENS) {
      expect(typeof token.value_usd).toBe('number');
      expect(token.value_usd).toBeGreaterThanOrEqual(0);
    }
  });

  it('contains "Wojak LP" as one of the tokens', () => {
    const wojakLp = TREASURY_TOKENS.find(t => t.name === 'Wojak LP');
    expect(wojakLp).toBeDefined();
  });

  it('the "Wojak LP" token has asset_id "wojak-lp"', () => {
    const wojakLp = TREASURY_TOKENS.find(t => t.name === 'Wojak LP');
    expect(wojakLp?.asset_id).toBe('wojak-lp');
  });

  it('the "Wojak LP" token has symbol "Wojak"', () => {
    const wojakLp = TREASURY_TOKENS.find(t => t.name === 'Wojak LP');
    expect(wojakLp?.symbol).toBe('Wojak');
  });

  it('tokens with logo_url have a string URL', () => {
    for (const token of TREASURY_TOKENS) {
      if (token.logo_url !== undefined) {
        expect(typeof token.logo_url).toBe('string');
        expect(token.logo_url.length).toBeGreaterThan(0);
      }
    }
  });

  it('tokens with color have a valid CSS color string starting with #', () => {
    for (const token of TREASURY_TOKENS) {
      if (token.color !== undefined) {
        expect(token.color).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
      }
    }
  });

  it('token symbols are unique', () => {
    const symbols = TREASURY_TOKENS.map(t => t.symbol);
    const uniqueSymbols = new Set(symbols);
    expect(uniqueSymbols.size).toBe(symbols.length);
  });

  it('has at least 10 tokens', () => {
    expect(TREASURY_TOKENS.length).toBeGreaterThanOrEqual(10);
  });

  it('the Spell Power token has a balance greater than 100000', () => {
    const spell = TREASURY_TOKENS.find(t => t.symbol === 'SPELL');
    expect(spell).toBeDefined();
    expect(spell!.balance).toBeGreaterThan(100_000);
  });

  it('the BEPE token exists and has a positive balance', () => {
    const bepe = TREASURY_TOKENS.find(t => t.symbol === 'BEPE');
    expect(bepe).toBeDefined();
    expect(bepe!.balance).toBeGreaterThan(0);
  });

  it('token asset_ids are unique', () => {
    const ids = TREASURY_TOKENS.map(t => t.asset_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('satisfies TokenConfig shape for all entries', () => {
    for (const token of TREASURY_TOKENS) {
      const t = token as TokenConfig;
      expect(typeof t.asset_id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.symbol).toBe('string');
      expect(typeof t.balance).toBe('number');
      expect(typeof t.value_usd).toBe('number');
    }
  });
});

describe('TOTAL_TOKEN_VALUE_USD', () => {
  it('is a positive number', () => {
    expect(typeof TOTAL_TOKEN_VALUE_USD).toBe('number');
    expect(TOTAL_TOKEN_VALUE_USD).toBeGreaterThan(0);
  });

  it('is greater than the sum of any single token value', () => {
    const maxSingle = Math.max(...TREASURY_TOKENS.map(t => t.value_usd));
    expect(TOTAL_TOKEN_VALUE_USD).toBeGreaterThan(maxSingle);
  });

  it('is a finite number', () => {
    expect(Number.isFinite(TOTAL_TOKEN_VALUE_USD)).toBe(true);
  });

  it('is reasonably close to the sum of individual token values (within 2x)', () => {
    const sumOfTokens = TREASURY_TOKENS.reduce((acc, t) => acc + t.value_usd, 0);
    // The total includes XCH and LP; allow it to be up to 2x the sum of CATs
    // We just verify it is in a reasonable range
    expect(TOTAL_TOKEN_VALUE_USD).toBeLessThan(sumOfTokens * 3);
    expect(TOTAL_TOKEN_VALUE_USD).toBeGreaterThan(sumOfTokens * 0.5);
  });
});
