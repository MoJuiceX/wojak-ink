import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkSpecialMilestone,
  checkIntervalMilestone,
  getScoreEffects,
  calculateNextTarget,
  checkLeaderboardBeat,
  getTookSpotMessage,
  getBeatenRankCallout,
  getOrdinalSuffix,
  isNewPersonalBest,
  getStoredHighScore,
  saveHighScore,
  handleGameOverScore,
  processScore,
} from './scoring';
import type { LeaderboardEntry } from '@/hooks/data/useLeaderboard';

// Helper to build a minimal LeaderboardEntry
const makeEntry = (rank: number, score: number, displayName = `Player${rank}`): LeaderboardEntry => ({
  rank,
  userId: `user-${rank}`,
  displayName,
  avatar: { type: 'emoji', value: '🍊', source: 'default' },
  score,
  createdAt: '2024-01-01T00:00:00Z',
});

describe('checkSpecialMilestone', () => {
  it('returns null for non-special score', () => {
    expect(checkSpecialMilestone(1)).toBeNull();
    expect(checkSpecialMilestone(15)).toBeNull();
    expect(checkSpecialMilestone(7)).toBeNull();
  });

  it('returns milestone for score 10', () => {
    const m = checkSpecialMilestone(10);
    expect(m).not.toBeNull();
    expect(m!.score).toBe(10);
    expect(m!.callout).toBe('SUNSET MODE!');
  });

  it('returns milestone for score 25', () => {
    const m = checkSpecialMilestone(25);
    expect(m).not.toBeNull();
    expect(m!.score).toBe(25);
    expect(m!.effects.shockwave).toBe(true);
  });

  it('returns milestone for score 50', () => {
    const m = checkSpecialMilestone(50);
    expect(m).not.toBeNull();
    expect(m!.callout).toBe('STORM CHASER!');
  });

  it('returns milestone for score 100', () => {
    const m = checkSpecialMilestone(100);
    expect(m).not.toBeNull();
    expect(m!.callout).toBe('ORANGE GOD!');
    expect(m!.emoji).toBe('👑');
  });

  it('score 10 milestone has no heavy effects', () => {
    const m = checkSpecialMilestone(10)!;
    expect(m.effects.shockwave).toBe(false);
    expect(m.effects.confetti).toBe(false);
  });
});

describe('checkIntervalMilestone', () => {
  it('returns null type for score 0', () => {
    const result = checkIntervalMilestone(0);
    expect(result.type).toBeNull();
  });

  it('returns null type for score 1', () => {
    const result = checkIntervalMilestone(1);
    expect(result.type).toBeNull();
  });

  it('returns small for score divisible by 3 but not 5', () => {
    const result = checkIntervalMilestone(3);
    expect(result.type).toBe('small');
    expect(result.effects.shockwave).toBe(true);
  });

  it('returns medium for score divisible by 5 but not 10', () => {
    const result = checkIntervalMilestone(5);
    expect(result.type).toBe('medium');
    expect(result.callout).toBeTruthy();
    expect(result.effects.shockwave).toBe(true);
    expect(result.effects.sparks).toBe(true);
  });

  it('returns big for score divisible by 10', () => {
    const result = checkIntervalMilestone(10);
    expect(result.type).toBe('big');
    expect(result.effects.confetti).toBe(true);
    expect(result.effects.perfectBonus).toBe(true);
  });

  it('every-10 takes precedence over every-5', () => {
    // 20 is divisible by both 5 and 10 - should be 'big'
    const result = checkIntervalMilestone(20);
    expect(result.type).toBe('big');
  });

  it('score 6 returns small (divisible by 3, not 5)', () => {
    const result = checkIntervalMilestone(6);
    expect(result.type).toBe('small');
  });

  it('score 4 returns null (not divisible by 3 or 5)', () => {
    const result = checkIntervalMilestone(4);
    expect(result.type).toBeNull();
  });
});

describe('getScoreEffects', () => {
  it('special milestone takes precedence over interval', () => {
    // Score 25 is a special milestone AND divisible by 5
    const result = getScoreEffects(25);
    expect(result.milestone).not.toBeNull();
    expect(result.intervalType).toBeNull();
    expect(result.callout).toBe('NIGHT FLIGHT!');
  });

  it('returns interval effects for non-special score', () => {
    const result = getScoreEffects(5);
    expect(result.milestone).toBeNull();
    expect(result.intervalType).toBe('medium');
    expect(result.emoji).toBe('🍊');
  });

  it('big interval gets fire emoji', () => {
    const result = getScoreEffects(20);
    expect(result.intervalType).toBe('big');
    expect(result.emoji).toBe('🔥');
  });

  it('returns null emoji for small interval', () => {
    const result = getScoreEffects(3);
    expect(result.emoji).toBeNull();
  });
});

describe('calculateNextTarget', () => {
  const leaderboard = [
    makeEntry(1, 100),
    makeEntry(2, 75),
    makeEntry(3, 50),
    makeEntry(4, 25),
    makeEntry(5, 10),
  ];

  it('returns null for empty leaderboard', () => {
    expect(calculateNextTarget(0, [], new Set())).toBeNull();
    expect(calculateNextTarget(0, null, new Set())).toBeNull();
  });

  it('returns the lowest rank target above current score', () => {
    // Score 0 - lowest unbeaten is rank 5 (score 10)
    const target = calculateNextTarget(0, leaderboard, new Set());
    expect(target).not.toBeNull();
    expect(target!.rank).toBe(5);
    expect(target!.score).toBe(10);
  });

  it('skips already beaten ranks', () => {
    const beatenRanks = new Set([5]);
    // Score 0, rank 5 beaten - next is rank 4 (score 25)
    const target = calculateNextTarget(0, leaderboard, beatenRanks);
    expect(target!.rank).toBe(4);
    expect(target!.score).toBe(25);
  });

  it('returns null when score exceeds all entries', () => {
    const target = calculateNextTarget(200, leaderboard, new Set());
    expect(target).toBeNull();
  });
});

describe('checkLeaderboardBeat', () => {
  const leaderboard = [
    makeEntry(1, 100),
    makeEntry(2, 75),
    makeEntry(3, 50),
  ];

  it('returns null for empty leaderboard', () => {
    expect(checkLeaderboardBeat(50, [], new Set())).toBeNull();
    expect(checkLeaderboardBeat(50, null, new Set())).toBeNull();
  });

  it('returns the beaten entry when score matches', () => {
    const beaten = checkLeaderboardBeat(50, leaderboard, new Set());
    expect(beaten).not.toBeNull();
    expect(beaten!.rank).toBe(3);
  });

  it('returns the beaten entry when score exceeds', () => {
    const beaten = checkLeaderboardBeat(80, leaderboard, new Set());
    expect(beaten).not.toBeNull();
    // Lowest rank whose score <= 80 (starts from highest index)
    expect(beaten!.rank).toBe(2);
  });

  it('skips already beaten ranks', () => {
    const beaten = checkLeaderboardBeat(50, leaderboard, new Set([3]));
    expect(beaten).toBeNull();
  });
});

describe('getTookSpotMessage', () => {
  it('formats the message correctly', () => {
    const entry = makeEntry(3, 50, 'BigOrange');
    expect(getTookSpotMessage(entry)).toBe("You took BigOrange's #3 spot!");
  });
});

describe('getBeatenRankCallout', () => {
  it('formats callout for rank 1', () => {
    expect(getBeatenRankCallout(1)).toBe('🎯 #1 BEATEN!');
  });

  it('formats callout for any rank', () => {
    expect(getBeatenRankCallout(5)).toBe('🎯 #5 BEATEN!');
  });
});

describe('getOrdinalSuffix', () => {
  it('handles 1st', () => {
    expect(getOrdinalSuffix(1)).toBe('1st');
  });

  it('handles 2nd', () => {
    expect(getOrdinalSuffix(2)).toBe('2nd');
  });

  it('handles 3rd', () => {
    expect(getOrdinalSuffix(3)).toBe('3rd');
  });

  it('handles 4th through 20th (th)', () => {
    [4, 5, 10, 11, 12, 13, 20].forEach(n => {
      expect(getOrdinalSuffix(n)).toContain('th');
    });
  });

  it('handles 21st', () => {
    expect(getOrdinalSuffix(21)).toBe('21st');
  });

  it('handles 100th', () => {
    expect(getOrdinalSuffix(100)).toBe('100th');
  });
});

describe('isNewPersonalBest', () => {
  it('returns true when score exceeds current high score', () => {
    expect(isNewPersonalBest(10, 5)).toBe(true);
  });

  it('returns false when score equals current high score', () => {
    expect(isNewPersonalBest(10, 10)).toBe(false);
  });

  it('returns false when score is lower than current high score', () => {
    expect(isNewPersonalBest(5, 10)).toBe(false);
  });

  it('returns false for score of 0', () => {
    expect(isNewPersonalBest(0, 0)).toBe(false);
  });
});

describe('getStoredHighScore and saveHighScore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 when no high score stored', () => {
    expect(getStoredHighScore()).toBe(0);
  });

  it('saves and retrieves high score', () => {
    saveHighScore(42);
    expect(getStoredHighScore()).toBe(42);
  });

  it('overwrites existing high score', () => {
    saveHighScore(10);
    saveHighScore(99);
    expect(getStoredHighScore()).toBe(99);
  });
});

describe('handleGameOverScore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns isNewHighScore true when score is higher', () => {
    const result = handleGameOverScore(50, 20);
    expect(result.isNewHighScore).toBe(true);
    expect(result.newHighScore).toBe(50);
  });

  it('returns isNewHighScore false when score is lower', () => {
    const result = handleGameOverScore(10, 50);
    expect(result.isNewHighScore).toBe(false);
    expect(result.newHighScore).toBe(50);
  });

  it('saves to localStorage when new high score', () => {
    handleGameOverScore(75, 0);
    expect(getStoredHighScore()).toBe(75);
  });
});

describe('processScore', () => {
  const leaderboard = [
    makeEntry(1, 100),
    makeEntry(2, 50),
    makeEntry(3, 25),
  ];

  it('returns full result object with all keys', () => {
    const result = processScore(10, leaderboard, new Set());
    expect(result).toHaveProperty('specialMilestone');
    expect(result).toHaveProperty('intervalType');
    expect(result).toHaveProperty('callout');
    expect(result).toHaveProperty('emoji');
    expect(result).toHaveProperty('effects');
    expect(result).toHaveProperty('beatenEntry');
    expect(result).toHaveProperty('nextTarget');
  });

  it('detects special milestone in result', () => {
    const result = processScore(10, leaderboard, new Set());
    expect(result.specialMilestone).not.toBeNull();
    expect(result.callout).toBe('SUNSET MODE!');
  });

  it('includes beaten entry when score matches leaderboard', () => {
    const result = processScore(25, leaderboard, new Set());
    expect(result.beatenEntry).not.toBeNull();
    expect(result.beatenEntry!.rank).toBe(3);
    expect(result.tookSpotMessage).toContain('#3');
    expect(result.beatenRankCallout).toBe('🎯 #3 BEATEN!');
  });

  it('sets nextTarget after beating an entry', () => {
    const result = processScore(30, leaderboard, new Set([3]));
    // Already beaten rank 3, so next target should be rank 2 (score 50)
    expect(result.nextTarget).not.toBeNull();
    expect(result.nextTarget!.score).toBe(50);
  });
});
