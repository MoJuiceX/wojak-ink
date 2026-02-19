import { describe, it, expect } from 'vitest';
import {
  WALLET_ADDRESS,
  WALLET_DISPLAY,
  XCH_DECIMALS,
  CAT_DECIMALS,
  SPACESCAN_API_BASE,
  SPACESCAN_WALLET_URL,
} from './treasuryConstants';

describe('WALLET_ADDRESS', () => {
  it('is a non-empty string', () => {
    expect(typeof WALLET_ADDRESS).toBe('string');
    expect(WALLET_ADDRESS.length).toBeGreaterThan(0);
  });

  it('starts with xch1', () => {
    expect(WALLET_ADDRESS.startsWith('xch1')).toBe(true);
  });

  it('matches known treasury wallet format', () => {
    // Chia bech32m addresses are typically ~62 chars
    expect(WALLET_ADDRESS.length).toBeGreaterThanOrEqual(60);
  });
});

describe('WALLET_DISPLAY', () => {
  it('contains an ellipsis', () => {
    expect(WALLET_DISPLAY).toContain('...');
  });

  it('starts with the first 10 characters of the full address', () => {
    expect(WALLET_DISPLAY.startsWith(WALLET_ADDRESS.slice(0, 10))).toBe(true);
  });

  it('ends with the last 6 characters of the full address', () => {
    expect(WALLET_DISPLAY.endsWith(WALLET_ADDRESS.slice(-6))).toBe(true);
  });

  it('is shorter than the full wallet address', () => {
    expect(WALLET_DISPLAY.length).toBeLessThan(WALLET_ADDRESS.length);
  });

  it('has the pattern PREFIX...SUFFIX', () => {
    const parts = WALLET_DISPLAY.split('...');
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });
});

describe('XCH_DECIMALS', () => {
  it('equals 12', () => {
    expect(XCH_DECIMALS).toBe(12);
  });

  it('correctly represents 1 XCH as mojos', () => {
    const mojosPerXch = Math.pow(10, XCH_DECIMALS);
    expect(mojosPerXch).toBe(1_000_000_000_000);
  });
});

describe('CAT_DECIMALS', () => {
  it('equals 3', () => {
    expect(CAT_DECIMALS).toBe(3);
  });

  it('correctly represents 1 CAT as mojos', () => {
    const mojosPerCat = Math.pow(10, CAT_DECIMALS);
    expect(mojosPerCat).toBe(1000);
  });
});

describe('SPACESCAN_API_BASE', () => {
  it('is a valid https URL', () => {
    expect(SPACESCAN_API_BASE.startsWith('https://')).toBe(true);
  });

  it('contains spacescan', () => {
    expect(SPACESCAN_API_BASE).toContain('spacescan');
  });
});

describe('SPACESCAN_WALLET_URL', () => {
  it('contains the wallet address', () => {
    expect(SPACESCAN_WALLET_URL).toContain(WALLET_ADDRESS);
  });

  it('starts with https://www.spacescan.io/address/', () => {
    expect(SPACESCAN_WALLET_URL.startsWith('https://www.spacescan.io/address/')).toBe(true);
  });

  it('is a valid URL', () => {
    expect(() => new URL(SPACESCAN_WALLET_URL)).not.toThrow();
  });
});

describe('Decimal consistency', () => {
  it('XCH_DECIMALS is larger than CAT_DECIMALS', () => {
    expect(XCH_DECIMALS).toBeGreaterThan(CAT_DECIMALS);
  });

  it('mojo conversion for XCH and CAT are different magnitudes', () => {
    const xchMojos = Math.pow(10, XCH_DECIMALS);
    const catMojos = Math.pow(10, CAT_DECIMALS);
    expect(xchMojos).toBeGreaterThan(catMojos);
  });
});

describe('WALLET_DISPLAY format consistency', () => {
  it('the prefix part is exactly the first 10 chars of address', () => {
    const prefix = WALLET_DISPLAY.split('...')[0];
    expect(prefix).toBe(WALLET_ADDRESS.slice(0, 10));
  });

  it('the suffix part is exactly the last 6 chars of address', () => {
    const suffix = WALLET_DISPLAY.split('...')[1];
    expect(suffix).toBe(WALLET_ADDRESS.slice(-6));
  });

  it('total display length is 10 + 3 (ellipsis) + 6 = 19 chars', () => {
    expect(WALLET_DISPLAY.length).toBe(19);
  });
});
