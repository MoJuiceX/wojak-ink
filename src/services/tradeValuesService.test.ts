import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatXCH } from './tradeValuesService';

// ============ formatXCH ============

describe('formatXCH', () => {
  it('formats a positive number with 2 decimal places by default', () => {
    expect(formatXCH(4.5)).toBe('4.50');
  });

  it('formats zero as "0.00"', () => {
    expect(formatXCH(0)).toBe('0.00');
  });

  it('formats an integer with trailing zeros', () => {
    expect(formatXCH(10)).toBe('10.00');
  });

  it('rounds to the specified decimal places', () => {
    expect(formatXCH(3.14159, 2)).toBe('3.14');
  });

  it('supports 0 decimal places', () => {
    expect(formatXCH(7.9, 0)).toBe('8');
  });

  it('supports 4 decimal places', () => {
    expect(formatXCH(1.23456, 4)).toBe('1.2346');
  });

  it('returns "—" for null', () => {
    expect(formatXCH(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatXCH(undefined)).toBe('—');
  });

  it('formats a small decimal correctly', () => {
    expect(formatXCH(0.05)).toBe('0.05');
  });

  it('formats a large number', () => {
    expect(formatXCH(1000)).toBe('1000.00');
  });

  it('formats negative numbers (edge case)', () => {
    expect(formatXCH(-1.5)).toBe('-1.50');
  });

  it('uses default of 2 decimal places when decimals not provided', () => {
    const result = formatXCH(2.5);
    expect(result).toBe('2.50');
  });
});

// ============ formatRelativeTime ============

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "—" for null', () => {
    expect(formatRelativeTime(null)).toBe('—');
  });

  it('returns "just now" for timestamps less than 1 minute ago', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');
  });

  it('returns "just now" for the exact same time', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(formatRelativeTime(now.toISOString())).toBe('just now');
  });

  it('returns minutes ago for timestamps 1-59 minutes ago', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns "1m ago" for exactly 1 minute ago', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1m ago');
  });

  it('returns "59m ago" for 59 minutes ago', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe('59m ago');
  });

  it('returns hours ago for timestamps 1-23 hours ago', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns "1h ago" for exactly 1 hour ago', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
  });

  it('returns "23h ago" for 23 hours ago', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('returns days ago for timestamps 1-29 days ago', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(now);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveDaysAgo)).toBe('5d ago');
  });

  it('returns "1d ago" for exactly 1 day ago', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(now);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');
  });

  it('returns "29d ago" for 29 days ago', () => {
    const now = new Date('2024-02-15T12:00:00Z');
    vi.setSystemTime(now);
    const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twentyNineDaysAgo)).toBe('29d ago');
  });

  it('returns a locale date string for timestamps 30+ days ago', () => {
    const now = new Date('2024-03-01T12:00:00Z');
    vi.setSystemTime(now);
    const oldDate = new Date('2024-01-01T12:00:00Z');
    const result = formatRelativeTime(oldDate.toISOString());
    // Should be a formatted date string, not "Xd ago" or "just now"
    expect(result).not.toContain('ago');
    expect(result).not.toBe('just now');
    expect(result).not.toBe('—');
    expect(result.length).toBeGreaterThan(0);
  });
});
