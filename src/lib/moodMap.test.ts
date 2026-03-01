import { describe, it, expect } from 'vitest';
import {
  MOOD_TAGS,
  TIER_WEIGHTS,
  TRAIT_MOODS,
  resolveMoods,
} from './moodMap';

describe('MOOD_TAGS', () => {
  it('has exactly 16 mood tags', () => {
    expect(MOOD_TAGS).toHaveLength(16);
  });

  it('includes all expected mood tags', () => {
    const expected = [
      'aggressive', 'rebellious', 'degen', 'chill', 'goofy', 'elite',
      'dark', 'mystical', 'warrior', 'cosmic', 'wholesome', 'nerdy',
      'chaotic', 'spooky', 'party', 'grinder',
    ];
    for (const tag of expected) {
      expect(MOOD_TAGS).toContain(tag);
    }
  });
});

describe('TRAIT_MOODS', () => {
  it('maps GFY Right to rebellious and aggressive', () => {
    expect(TRAIT_MOODS['GFY Right']).toEqual(['rebellious', 'aggressive']);
  });

  it('maps Beer Hat to party and rebellious', () => {
    expect(TRAIT_MOODS['Beer Hat']).toEqual(['party', 'rebellious']);
  });

  it('maps Suit to elite and grinder', () => {
    expect(TRAIT_MOODS['Suit']).toEqual(['elite', 'grinder']);
  });

  it('maps Tee to chill and degen', () => {
    expect(TRAIT_MOODS['Tee']).toEqual(['chill', 'degen']);
  });

  it('maps Laser Eyes to aggressive, cosmic, and degen (3 tags)', () => {
    expect(TRAIT_MOODS['Laser Eyes']).toEqual(['aggressive', 'cosmic', 'degen']);
  });

  it('every mapped trait has 1-3 valid mood tags', () => {
    for (const [, tags] of Object.entries(TRAIT_MOODS)) {
      expect(tags.length).toBeGreaterThanOrEqual(1);
      expect(tags.length).toBeLessThanOrEqual(3);
      for (const tag of tags) {
        expect(MOOD_TAGS).toContain(tag);
      }
    }
  });
});

describe('TIER_WEIGHTS', () => {
  it('has correct weights for all categories', () => {
    expect(TIER_WEIGHTS['Clothes']).toBe(3);
    expect(TIER_WEIGHTS['Extras']).toBe(3);
    expect(TIER_WEIGHTS['Head']).toBe(2);
    expect(TIER_WEIGHTS['Face Wear']).toBe(2);
    expect(TIER_WEIGHTS['Face']).toBe(2);
    expect(TIER_WEIGHTS['Mouth']).toBe(1);
    expect(TIER_WEIGHTS['Background']).toBe(1);
  });
});

describe('resolveMoods', () => {
  it('returns rebellious primary and aggressive secondary for middle-finger+beer-hat+tee+screaming', () => {
    const traits = [
      { trait_type: 'Extras', value: 'GFY Right' },
      { trait_type: 'Head', value: 'Beer Hat' },
      { trait_type: 'Clothes', value: 'Tee' },
      { trait_type: 'Mouth', value: 'Screaming' },
    ];
    const result = resolveMoods(traits);
    expect(result.primary).toBe('rebellious');
    expect(result.secondary).toBe('aggressive');
  });

  it('returns chill/degen defaults for empty traits', () => {
    const result = resolveMoods([]);
    expect(result.primary).toBe('chill');
    expect(result.secondary).toBe('degen');
  });

  it('returns valid moods for unknown traits', () => {
    const result = resolveMoods([
      { trait_type: 'Clothes', value: 'Unknown Outfit' },
    ]);
    expect(MOOD_TAGS).toContain(result.primary);
    expect(MOOD_TAGS).toContain(result.secondary);
  });

  it('never returns same mood for primary and secondary', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Suit' },
      { trait_type: 'Head', value: 'Crown' },
      { trait_type: 'Mouth', value: 'Cohiba' },
      { trait_type: 'Face Wear', value: 'Alpha Shades' },
      { trait_type: 'Background', value: 'NYSE Pump' },
    ];
    const result = resolveMoods(traits);
    expect(result.primary).not.toBe(result.secondary);
  });

  it('tier weights make Clothes x3 outweigh Mouth x1', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Suit' },
      { trait_type: 'Mouth', value: 'Screaming' },
    ];
    const result = resolveMoods(traits);
    expect(result.primary).toBe('elite');
  });

  it('handles comma-separated Extras', () => {
    const traits = [
      { trait_type: 'Extras', value: 'GFY Right, Diamond' },
    ];
    const result = resolveMoods(traits);
    expect(result.scores['rebellious']).toBe(3);
    expect(result.scores['aggressive']).toBe(3);
    expect(result.scores['elite']).toBe(3);
    expect(result.scores['degen']).toBe(3);
  });

  it('returns scores for all 16 mood tags', () => {
    const result = resolveMoods([
      { trait_type: 'Clothes', value: 'Tee' },
    ]);
    expect(Object.keys(result.scores)).toHaveLength(16);
    for (const tag of MOOD_TAGS) {
      expect(typeof result.scores[tag]).toBe('number');
    }
  });

  it('returns a valid MoodResult shape', () => {
    const result = resolveMoods([
      { trait_type: 'Face', value: 'Classic' },
    ]);
    expect(result).toHaveProperty('primary');
    expect(result).toHaveProperty('secondary');
    expect(result).toHaveProperty('scores');
    expect(MOOD_TAGS).toContain(result.primary);
    expect(MOOD_TAGS).toContain(result.secondary);
  });
});
