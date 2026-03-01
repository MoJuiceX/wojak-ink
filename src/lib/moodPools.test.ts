import { describe, it, expect } from 'vitest';
import { MOOD_POOLS, MOOD_COMBOS, type MoodPool } from './moodPools';
import { MOOD_TAGS } from './moodMap';

const MAX_NAME_LENGTH = 15;

describe('MOOD_POOLS', () => {
  it('has a pool for every mood tag', () => {
    for (const tag of MOOD_TAGS) {
      expect(MOOD_POOLS[tag]).toBeDefined();
    }
  });

  it('has exactly 16 pools', () => {
    expect(Object.keys(MOOD_POOLS)).toHaveLength(16);
  });

  for (const tag of MOOD_TAGS) {
    describe(`pool "${tag}"`, () => {
      const pool: MoodPool = MOOD_POOLS[tag];

      it('has >= 15 adjectives', () => {
        expect(pool.adjectives.length).toBeGreaterThanOrEqual(15);
      });

      it('has >= 15 nouns', () => {
        expect(pool.nouns.length).toBeGreaterThanOrEqual(15);
      });

      it('has >= 8 titles', () => {
        expect(pool.titles.length).toBeGreaterThanOrEqual(8);
      });

      it('has >= 20 fullNames', () => {
        expect(pool.fullNames.length).toBeGreaterThanOrEqual(20);
      });

      it('has a non-empty hint', () => {
        expect(pool.hint.length).toBeGreaterThan(0);
      });

      it('every fullName is <= 15 chars', () => {
        for (const name of pool.fullNames) {
          expect(
            name.length,
            `fullName "${name}" is ${name.length} chars`,
          ).toBeLessThanOrEqual(MAX_NAME_LENGTH);
        }
      });

      it('every adj + " " + noun combination is <= 15 chars', () => {
        const violations: string[] = [];
        for (const adj of pool.adjectives) {
          for (const noun of pool.nouns) {
            const combo = `${adj} ${noun}`;
            if (combo.length > MAX_NAME_LENGTH) {
              violations.push(`"${combo}" (${combo.length} chars)`);
            }
          }
        }
        expect(violations).toEqual([]);
      });

      it('every title + " " + noun combination is <= 15 chars', () => {
        const violations: string[] = [];
        for (const title of pool.titles) {
          for (const noun of pool.nouns) {
            const combo = `${title} ${noun}`;
            if (combo.length > MAX_NAME_LENGTH) {
              violations.push(`"${combo}" (${combo.length} chars)`);
            }
          }
        }
        expect(violations).toEqual([]);
      });
    });
  }
});

describe('MOOD_COMBOS', () => {
  it('has at least 40 combo entries', () => {
    let count = 0;
    for (const outer of Object.values(MOOD_COMBOS)) {
      if (outer) {
        count += Object.keys(outer).length;
      }
    }
    expect(count).toBeGreaterThanOrEqual(40);
  });

  it('every combo has >= 4 bonus names', () => {
    for (const [primary, inner] of Object.entries(MOOD_COMBOS)) {
      if (!inner) continue;
      for (const [secondary, names] of Object.entries(inner)) {
        expect(
          names!.length,
          `${primary}+${secondary} has only ${names!.length} names`,
        ).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('every combo bonus name is <= 15 chars', () => {
    const violations: string[] = [];
    for (const [primary, inner] of Object.entries(MOOD_COMBOS)) {
      if (!inner) continue;
      for (const [secondary, names] of Object.entries(inner)) {
        for (const name of names!) {
          if (name.length > MAX_NAME_LENGTH) {
            violations.push(
              `${primary}+${secondary}: "${name}" (${name.length} chars)`,
            );
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('all combo keys are valid MoodTag values', () => {
    const validTags = new Set<string>(MOOD_TAGS);
    for (const [primary, inner] of Object.entries(MOOD_COMBOS)) {
      expect(validTags.has(primary)).toBe(true);
      if (!inner) continue;
      for (const secondary of Object.keys(inner)) {
        expect(validTags.has(secondary)).toBe(true);
      }
    }
  });
});
