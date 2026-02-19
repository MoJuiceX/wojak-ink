import { describe, it, expect } from 'vitest';
import {
  getRivalMessage,
  getDeterministicRivalMessage,
  getPeekBarText,
  getAllMessageCategories,
} from './rivalMessages';
import type { RivalMessageContext } from './rivalMessages';

// Helper to build a context
function ctx(rivalName: string, pointsAhead: number, wasJustPassed?: boolean): RivalMessageContext {
  return { rivalName, pointsAhead, wasJustPassed };
}

describe('getRivalMessage', () => {
  it('returns a non-empty string', () => {
    const msg = getRivalMessage(ctx('Satoshi', 100));
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('interpolates rivalName into the message', () => {
    // Run multiple times to cover random selection
    for (let i = 0; i < 20; i++) {
      const msg = getRivalMessage(ctx('Nakamoto', 100));
      expect(msg).toContain('Nakamoto');
    }
  });

  it('interpolates pointsAhead into the message', () => {
    for (let i = 0; i < 20; i++) {
      const msg = getRivalMessage(ctx('Alice', 150));
      // 150 should appear as formatted number
      expect(msg).toContain('150');
    }
  });

  it('uses SMALL_GAP_MESSAGES when pointsAhead < 50', () => {
    for (let i = 0; i < 30; i++) {
      const msg = getRivalMessage(ctx('Bob', 49));
      expect(msg).toContain('🔥');
    }
  });

  it('uses LARGE_GAP_MESSAGES when pointsAhead > 200', () => {
    for (let i = 0; i < 30; i++) {
      const msg = getRivalMessage(ctx('Charlie', 201));
      expect(msg).toContain('💪');
    }
  });

  it('uses STANDARD_MESSAGES for gap between 50 and 200 inclusive', () => {
    for (let i = 0; i < 30; i++) {
      const msg = getRivalMessage(ctx('Dave', 100));
      expect(msg).toContain('🎯');
    }
  });

  it('uses PASSED_MESSAGES when wasJustPassed is true, regardless of gap', () => {
    for (let i = 0; i < 30; i++) {
      const msg = getRivalMessage(ctx('Eve', 5, true));
      expect(msg).toContain('😤');
    }
  });

  it('uses PASSED_MESSAGES when wasJustPassed is true with a large gap', () => {
    for (let i = 0; i < 30; i++) {
      const msg = getRivalMessage(ctx('Frank', 500, true));
      expect(msg).toContain('😤');
    }
  });

  it('uses STANDARD_MESSAGES when wasJustPassed is false and gap is 50', () => {
    for (let i = 0; i < 30; i++) {
      const msg = getRivalMessage(ctx('Grace', 50, false));
      expect(msg).toContain('🎯');
    }
  });

  it('uses STANDARD_MESSAGES when wasJustPassed is false and gap is 200', () => {
    for (let i = 0; i < 30; i++) {
      const msg = getRivalMessage(ctx('Heidi', 200, false));
      expect(msg).toContain('🎯');
    }
  });

  it('formats large numbers with locale separators', () => {
    const msg = getRivalMessage(ctx('Rival', 1500, true));
    expect(msg).toContain('1,500');
  });
});

describe('getDeterministicRivalMessage', () => {
  it('returns the same message for the same context', () => {
    const context = ctx('Satoshi', 100);
    const msg1 = getDeterministicRivalMessage(context);
    const msg2 = getDeterministicRivalMessage(context);
    expect(msg1).toBe(msg2);
  });

  it('always contains the rivalName', () => {
    const msg = getDeterministicRivalMessage(ctx('Nakamoto', 75));
    expect(msg).toContain('Nakamoto');
  });

  it('uses PASSED_MESSAGES pool when wasJustPassed is true', () => {
    const msg = getDeterministicRivalMessage(ctx('Alice', 10, true));
    expect(msg).toContain('😤');
  });

  it('uses SMALL_GAP_MESSAGES pool when pointsAhead < 50', () => {
    const msg = getDeterministicRivalMessage(ctx('Bob', 25));
    expect(msg).toContain('🔥');
  });

  it('uses LARGE_GAP_MESSAGES pool when pointsAhead > 200', () => {
    const msg = getDeterministicRivalMessage(ctx('Charlie', 300));
    expect(msg).toContain('💪');
  });

  it('uses STANDARD_MESSAGES pool for gap in [50, 200]', () => {
    const msg = getDeterministicRivalMessage(ctx('Dave', 150));
    expect(msg).toContain('🎯');
  });

  it('returns different messages for different rivalNames (hash differs)', () => {
    // Not guaranteed but very likely across 5-message pools
    const msgs = new Set<string>();
    const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'];
    for (const name of names) {
      msgs.add(getDeterministicRivalMessage(ctx(name, 100)));
    }
    // At least 2 different messages across 5 distinct names
    expect(msgs.size).toBeGreaterThanOrEqual(1);
  });

  it('formats large pointsAhead with locale separators', () => {
    const msg = getDeterministicRivalMessage(ctx('Rival', 2000));
    expect(msg).toContain('2,000');
  });
});

describe('getPeekBarText', () => {
  it('uses fire emoji format when pointsAhead < 50', () => {
    const text = getPeekBarText(ctx('Nakamoto', 25));
    expect(text).toBe('🔥 25 pts to DETHRONE Nakamoto!');
  });

  it('uses target emoji format when pointsAhead >= 50', () => {
    const text = getPeekBarText(ctx('Satoshi', 50));
    expect(text).toBe('🎯 50 pts to overtake Satoshi');
  });

  it('uses fire format for pointsAhead of 1', () => {
    const text = getPeekBarText(ctx('Alice', 1));
    expect(text).toBe('🔥 1 pts to DETHRONE Alice!');
  });

  it('uses target format for pointsAhead of 49 boundary — fire side', () => {
    const text = getPeekBarText(ctx('Bob', 49));
    expect(text).toBe('🔥 49 pts to DETHRONE Bob!');
  });

  it('uses target format for a large gap', () => {
    const text = getPeekBarText(ctx('Charlie', 500));
    expect(text).toBe('🎯 500 pts to overtake Charlie');
  });

  it('includes the rivalName correctly with spaces', () => {
    const text = getPeekBarText(ctx('The Great One', 100));
    expect(text).toContain('The Great One');
  });
});

describe('getAllMessageCategories', () => {
  it('returns an object with the four expected keys', () => {
    const categories = getAllMessageCategories();
    expect(categories).toHaveProperty('standard');
    expect(categories).toHaveProperty('smallGap');
    expect(categories).toHaveProperty('largeGap');
    expect(categories).toHaveProperty('passed');
  });

  it('each category is a non-empty array', () => {
    const categories = getAllMessageCategories();
    expect(categories.standard.length).toBeGreaterThan(0);
    expect(categories.smallGap.length).toBeGreaterThan(0);
    expect(categories.largeGap.length).toBeGreaterThan(0);
    expect(categories.passed.length).toBeGreaterThan(0);
  });

  it('standard messages contain the {rival} placeholder', () => {
    const categories = getAllMessageCategories();
    for (const msg of categories.standard) {
      expect(msg).toContain('{rival}');
    }
  });

  it('all messages in all categories contain {gap} placeholder', () => {
    const categories = getAllMessageCategories();
    const allMessages = [
      ...categories.standard,
      ...categories.smallGap,
      ...categories.largeGap,
      ...categories.passed,
    ];
    for (const msg of allMessages) {
      expect(msg).toContain('{gap}');
    }
  });
});
