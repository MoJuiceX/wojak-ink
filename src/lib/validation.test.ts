import { describe, it, expect } from 'vitest';
import { isValidChiaAddress } from './validation';

describe('isValidChiaAddress', () => {
  // Valid address: xch1 prefix + exactly 58 lowercase alphanumeric chars
  const VALID_ADDRESS = 'xch1' + 'a'.repeat(58);

  it('accepts a valid address with all lowercase letters', () => {
    expect(isValidChiaAddress(VALID_ADDRESS)).toBe(true);
  });

  it('accepts a valid address with digits in the body', () => {
    const body = '0123456789012345678901234567890123456789012345678901234567'; // 58 chars
    expect(isValidChiaAddress('xch1' + body)).toBe(true);
  });

  it('accepts a valid address mixing letters and digits', () => {
    const body = 'a1b2c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8';
    expect(body.length).toBe(58);
    expect(isValidChiaAddress('xch1' + body)).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidChiaAddress('')).toBe(false);
  });

  it('rejects an address that is too short (body < 58 chars)', () => {
    expect(isValidChiaAddress('xch1' + 'a'.repeat(57))).toBe(false);
  });

  it('rejects an address that is too long (body > 58 chars)', () => {
    expect(isValidChiaAddress('xch1' + 'a'.repeat(59))).toBe(false);
  });

  it('rejects an address without the xch1 prefix', () => {
    expect(isValidChiaAddress('xch2' + 'a'.repeat(58))).toBe(false);
  });

  it('rejects an address with uppercase letters in the body', () => {
    expect(isValidChiaAddress('xch1' + 'A'.repeat(58))).toBe(false);
  });

  it('rejects an address with uppercase XCH prefix', () => {
    expect(isValidChiaAddress('XCH1' + 'a'.repeat(58))).toBe(false);
  });

  it('rejects an address with special characters in the body', () => {
    expect(isValidChiaAddress('xch1' + 'a'.repeat(57) + '!')).toBe(false);
  });

  it('rejects an address with hyphens in the body', () => {
    expect(isValidChiaAddress('xch1' + 'a'.repeat(57) + '-')).toBe(false);
  });

  it('rejects an address with spaces', () => {
    expect(isValidChiaAddress('xch1' + 'a'.repeat(57) + ' ')).toBe(false);
  });

  it('rejects an address that is just the prefix', () => {
    expect(isValidChiaAddress('xch1')).toBe(false);
  });

  it('rejects a completely random string', () => {
    expect(isValidChiaAddress('not-a-wallet-address')).toBe(false);
  });

  it('rejects an address where prefix is xch followed by digit other than 1', () => {
    expect(isValidChiaAddress('xch0' + 'a'.repeat(58))).toBe(false);
  });

  it('accepts the exact 62-character total length', () => {
    // xch1 (4) + 58 body = 62
    const addr = 'xch1' + 'z'.repeat(58);
    expect(addr.length).toBe(62);
    expect(isValidChiaAddress(addr)).toBe(true);
  });

  it('rejects a 61-character address', () => {
    const addr = 'xch1' + 'z'.repeat(57);
    expect(addr.length).toBe(61);
    expect(isValidChiaAddress(addr)).toBe(false);
  });

  it('rejects a 63-character address', () => {
    const addr = 'xch1' + 'z'.repeat(59);
    expect(addr.length).toBe(63);
    expect(isValidChiaAddress(addr)).toBe(false);
  });

  it('rejects an address with newline in body', () => {
    expect(isValidChiaAddress('xch1' + 'a'.repeat(57) + '\n')).toBe(false);
  });

  it('rejects an address with underscore in body', () => {
    expect(isValidChiaAddress('xch1' + 'a'.repeat(57) + '_')).toBe(false);
  });

  it('rejects an address starting with a valid prefix but with mixed case body containing uppercase', () => {
    const body = 'A'.repeat(29) + 'a'.repeat(29);
    expect(body.length).toBe(58);
    expect(isValidChiaAddress('xch1' + body)).toBe(false);
  });
});
