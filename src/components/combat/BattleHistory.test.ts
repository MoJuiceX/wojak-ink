// src/components/combat/BattleHistory.test.ts
import { describe, it, expect } from 'vitest';
import { relativeTime } from './BattleHistory';

describe('relativeTime', () => {
  it('returns "just now" for times less than 1 minute ago', () => {
    const now = new Date().toISOString();
    expect(relativeTime(now)).toBe('just now');
  });

  it('returns minutes for recent times', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(relativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours for times within a day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(relativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days for times within a week', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(relativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('returns formatted date for times older than a week', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const result = relativeTime(twoWeeksAgo);
    // Should be a date string, not a relative time
    expect(result).not.toContain('ago');
    expect(result.length).toBeGreaterThan(0);
  });
});
