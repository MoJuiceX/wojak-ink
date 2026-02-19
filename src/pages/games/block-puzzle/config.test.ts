/**
 * Tests for block-puzzle/config.ts
 * Validates all exported constants and configuration objects.
 */

import { describe, it, expect } from 'vitest';
import {
  BLOCK_SHAPES,
  SHAPE_KEYS,
  BLOCK_COLORS,
  GRID_SIZE,
  FREEZE_DURATIONS,
  SHAKE_CONFIG,
  CLEAR_CALLOUTS,
  COMBO_SCALE_FREQUENCIES,
  COMBO_SOUND_CONFIG,
  LINE_CLEAR_SOUNDS,
  HAPTIC_PATTERNS,
  DANGER_THRESHOLDS,
  DANGER_HAPTIC_INTERVALS,
  STREAK_CONFIG,
  PERFECT_CLEAR_BONUS,
  MUSIC_PLAYLIST,
  SAD_IMAGES,
  BLOCK_PUZZLE_CONFIG,
} from './config';

// ============================================
// BLOCK SHAPES
// ============================================
describe('BLOCK_SHAPES', () => {
  it('contains single cell shape', () => {
    expect(BLOCK_SHAPES.single).toEqual([[1]]);
  });

  it('contains all horizontal line shapes', () => {
    expect(BLOCK_SHAPES.line2h).toEqual([[1, 1]]);
    expect(BLOCK_SHAPES.line3h).toEqual([[1, 1, 1]]);
    expect(BLOCK_SHAPES.line4h).toEqual([[1, 1, 1, 1]]);
    expect(BLOCK_SHAPES.line5h).toEqual([[1, 1, 1, 1, 1]]);
  });

  it('contains vertical line shapes', () => {
    expect(BLOCK_SHAPES.line2v).toEqual([[1], [1]]);
    expect(BLOCK_SHAPES.line3v).toEqual([[1], [1], [1]]);
    expect(BLOCK_SHAPES.line4v).toEqual([[1], [1], [1], [1]]);
  });

  it('contains 2x2 and 3x3 square shapes', () => {
    expect(BLOCK_SHAPES.square2).toEqual([[1, 1], [1, 1]]);
    expect(BLOCK_SHAPES.square2.length).toBe(2);
    expect(BLOCK_SHAPES.square3.length).toBe(3);
    expect(BLOCK_SHAPES.square3[0].length).toBe(3);
  });

  it('contains 4 L-shape variants', () => {
    expect(BLOCK_SHAPES.lShape1).toBeDefined();
    expect(BLOCK_SHAPES.lShape2).toBeDefined();
    expect(BLOCK_SHAPES.lShape3).toBeDefined();
    expect(BLOCK_SHAPES.lShape4).toBeDefined();
  });

  it('contains T shape and corner', () => {
    expect(BLOCK_SHAPES.tShape).toEqual([[1, 1, 1], [0, 1, 0]]);
    expect(BLOCK_SHAPES.corner).toEqual([[1, 1], [1, 0]]);
  });

  it('all shape values are 0 or 1', () => {
    for (const shape of Object.values(BLOCK_SHAPES)) {
      for (const row of shape) {
        for (const cell of row) {
          expect(cell === 0 || cell === 1).toBe(true);
        }
      }
    }
  });
});

describe('SHAPE_KEYS', () => {
  it('matches the keys of BLOCK_SHAPES', () => {
    expect(SHAPE_KEYS).toEqual(Object.keys(BLOCK_SHAPES));
  });

  it('has the correct number of shapes', () => {
    expect(SHAPE_KEYS.length).toBeGreaterThan(10);
  });
});

// ============================================
// BLOCK COLORS
// ============================================
describe('BLOCK_COLORS', () => {
  it('has 6 distinct colors', () => {
    expect(BLOCK_COLORS.length).toBe(6);
  });

  it('all entries are gradient strings', () => {
    for (const color of BLOCK_COLORS) {
      expect(color).toContain('linear-gradient');
    }
  });
});

// ============================================
// GRID
// ============================================
describe('GRID_SIZE', () => {
  it('is 8', () => {
    expect(GRID_SIZE).toBe(8);
  });
});

// ============================================
// FREEZE DURATIONS
// ============================================
describe('FREEZE_DURATIONS', () => {
  it('single line clears have no freeze', () => {
    expect(FREEZE_DURATIONS[1]).toBe(0);
  });

  it('freeze duration increases with lines cleared', () => {
    expect(FREEZE_DURATIONS[2]).toBeLessThan(FREEZE_DURATIONS[3]);
    expect(FREEZE_DURATIONS[3]).toBeLessThan(FREEZE_DURATIONS[4]);
  });

  it('has entries for 1-4 lines', () => {
    expect(FREEZE_DURATIONS[1]).toBeDefined();
    expect(FREEZE_DURATIONS[2]).toBeDefined();
    expect(FREEZE_DURATIONS[3]).toBeDefined();
    expect(FREEZE_DURATIONS[4]).toBeDefined();
  });
});

// ============================================
// SHAKE CONFIG
// ============================================
describe('SHAKE_CONFIG', () => {
  it('has entries for 1-4 lines', () => {
    for (let i = 1; i <= 4; i++) {
      expect(SHAKE_CONFIG[i]).toBeDefined();
      expect(SHAKE_CONFIG[i].intensity).toBeGreaterThan(0);
      expect(SHAKE_CONFIG[i].duration).toBeGreaterThan(0);
    }
  });

  it('intensity increases with more lines', () => {
    expect(SHAKE_CONFIG[1].intensity).toBeLessThan(SHAKE_CONFIG[2].intensity);
    expect(SHAKE_CONFIG[2].intensity).toBeLessThan(SHAKE_CONFIG[3].intensity);
    expect(SHAKE_CONFIG[3].intensity).toBeLessThan(SHAKE_CONFIG[4].intensity);
  });

  it('duration increases with more lines', () => {
    expect(SHAKE_CONFIG[1].duration).toBeLessThan(SHAKE_CONFIG[2].duration);
    expect(SHAKE_CONFIG[2].duration).toBeLessThan(SHAKE_CONFIG[3].duration);
    expect(SHAKE_CONFIG[3].duration).toBeLessThan(SHAKE_CONFIG[4].duration);
  });
});

// ============================================
// CLEAR CALLOUTS
// ============================================
describe('CLEAR_CALLOUTS', () => {
  it('starts at 2 (no callout for single)', () => {
    expect(CLEAR_CALLOUTS[1]).toBeUndefined();
    expect(CLEAR_CALLOUTS[2]).toBe('DOUBLE!');
  });

  it('has callouts for 2-5 lines', () => {
    expect(CLEAR_CALLOUTS[3]).toBe('TRIPLE!');
    expect(CLEAR_CALLOUTS[4]).toBe('QUAD CLEAR!');
    expect(CLEAR_CALLOUTS[5]).toBe('MEGA CLEAR!');
  });
});

// ============================================
// COMBO SCALE FREQUENCIES
// ============================================
describe('COMBO_SCALE_FREQUENCIES', () => {
  it('has 5 frequencies for 5 combo levels', () => {
    expect(COMBO_SCALE_FREQUENCIES.length).toBe(5);
  });

  it('frequencies are in ascending order (C major scale)', () => {
    for (let i = 0; i < COMBO_SCALE_FREQUENCIES.length - 1; i++) {
      expect(COMBO_SCALE_FREQUENCIES[i]).toBeLessThan(COMBO_SCALE_FREQUENCIES[i + 1]);
    }
  });
});

// ============================================
// COMBO SOUND CONFIG
// ============================================
describe('COMBO_SOUND_CONFIG', () => {
  it('has configs for combos 1-5', () => {
    for (let i = 1; i <= 5; i++) {
      expect(COMBO_SOUND_CONFIG[i]).toBeDefined();
    }
  });

  it('volume increases with combo level', () => {
    expect(COMBO_SOUND_CONFIG[1].volume).toBeLessThan(COMBO_SOUND_CONFIG[5].volume);
  });

  it('higher combos have more layers', () => {
    expect(COMBO_SOUND_CONFIG[1].layers).toBe(1);
    expect(COMBO_SOUND_CONFIG[5].layers).toBe(3);
  });
});

// ============================================
// LINE CLEAR SOUNDS
// ============================================
describe('LINE_CLEAR_SOUNDS', () => {
  it('has configs for 1-4 lines', () => {
    for (let i = 1; i <= 4; i++) {
      expect(LINE_CLEAR_SOUNDS[i]).toBeDefined();
    }
  });

  it('pitch and volume increase with more lines', () => {
    expect(LINE_CLEAR_SOUNDS[1].pitch).toBeLessThan(LINE_CLEAR_SOUNDS[4].pitch);
    expect(LINE_CLEAR_SOUNDS[1].volume).toBeLessThan(LINE_CLEAR_SOUNDS[4].volume);
  });
});

// ============================================
// HAPTIC PATTERNS
// ============================================
describe('HAPTIC_PATTERNS', () => {
  it('contains essential haptic patterns', () => {
    expect(HAPTIC_PATTERNS.dragStart).toBeDefined();
    expect(HAPTIC_PATTERNS.snapLock).toBeDefined();
    expect(HAPTIC_PATTERNS.lineClear1).toBeDefined();
    expect(HAPTIC_PATTERNS.perfectClear).toBeDefined();
  });

  it('all patterns are non-empty number arrays', () => {
    for (const pattern of Object.values(HAPTIC_PATTERNS)) {
      expect(Array.isArray(pattern)).toBe(true);
      expect(pattern.length).toBeGreaterThan(0);
      for (const val of pattern) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('perfect clear has the most complex pattern', () => {
    expect(HAPTIC_PATTERNS.perfectClear.length).toBeGreaterThan(HAPTIC_PATTERNS.dragStart.length);
  });
});

// ============================================
// DANGER THRESHOLDS
// ============================================
describe('DANGER_THRESHOLDS', () => {
  it('thresholds are in ascending order', () => {
    expect(DANGER_THRESHOLDS.safe).toBeLessThan(DANGER_THRESHOLDS.warning);
    expect(DANGER_THRESHOLDS.warning).toBeLessThan(DANGER_THRESHOLDS.critical);
    expect(DANGER_THRESHOLDS.critical).toBeLessThan(DANGER_THRESHOLDS.imminent);
  });

  it('safe threshold is below 0.6', () => {
    expect(DANGER_THRESHOLDS.safe).toBeLessThan(0.6);
  });

  it('imminent threshold is below 1.0', () => {
    expect(DANGER_THRESHOLDS.imminent).toBeLessThan(1.0);
  });
});

// ============================================
// DANGER HAPTIC INTERVALS
// ============================================
describe('DANGER_HAPTIC_INTERVALS', () => {
  it('safe has no haptic (0)', () => {
    expect(DANGER_HAPTIC_INTERVALS.safe).toBe(0);
  });

  it('intervals get shorter as danger increases', () => {
    expect(DANGER_HAPTIC_INTERVALS.warning).toBeGreaterThan(DANGER_HAPTIC_INTERVALS.critical);
    expect(DANGER_HAPTIC_INTERVALS.critical).toBeGreaterThan(DANGER_HAPTIC_INTERVALS.imminent);
  });
});

// ============================================
// STREAK CONFIG
// ============================================
describe('STREAK_CONFIG', () => {
  it('fire threshold is 3', () => {
    expect(STREAK_CONFIG.fireThreshold).toBe(3);
  });

  it('multipliers start at 1 and cap at 3', () => {
    expect(STREAK_CONFIG.multipliers[0]).toBe(1);
    expect(STREAK_CONFIG.multipliers[STREAK_CONFIG.multipliers.length - 1]).toBe(3);
  });

  it('multipliers are in ascending order', () => {
    for (let i = 0; i < STREAK_CONFIG.multipliers.length - 1; i++) {
      expect(STREAK_CONFIG.multipliers[i]).toBeLessThanOrEqual(STREAK_CONFIG.multipliers[i + 1]);
    }
  });
});

// ============================================
// PERFECT CLEAR BONUS
// ============================================
describe('PERFECT_CLEAR_BONUS', () => {
  it('is a positive integer', () => {
    expect(PERFECT_CLEAR_BONUS).toBeGreaterThan(0);
    expect(Number.isInteger(PERFECT_CLEAR_BONUS)).toBe(true);
  });

  it('is a large bonus (5000)', () => {
    expect(PERFECT_CLEAR_BONUS).toBe(5000);
  });
});

// ============================================
// MUSIC PLAYLIST
// ============================================
describe('MUSIC_PLAYLIST', () => {
  it('has at least one track', () => {
    expect(MUSIC_PLAYLIST.length).toBeGreaterThan(0);
  });

  it('each track has src and name', () => {
    for (const track of MUSIC_PLAYLIST) {
      expect(track.src).toBeDefined();
      expect(track.name).toBeDefined();
      expect(track.src).toContain('.mp3');
    }
  });
});

// ============================================
// SAD IMAGES
// ============================================
describe('SAD_IMAGES', () => {
  it('generates 19 image paths', () => {
    expect(SAD_IMAGES.length).toBe(19);
  });

  it('all paths are strings ending in .webp', () => {
    for (const path of SAD_IMAGES) {
      expect(typeof path).toBe('string');
      expect(path).toContain('.webp');
    }
  });

  it('paths are numbered 1 through 19', () => {
    expect(SAD_IMAGES[0]).toContain('sad_runner_1.webp');
    expect(SAD_IMAGES[18]).toContain('sad_runner_19.webp');
  });
});

// ============================================
// BLOCK PUZZLE CONFIG
// ============================================
describe('BLOCK_PUZZLE_CONFIG', () => {
  it('has correct game id', () => {
    expect(BLOCK_PUZZLE_CONFIG.id).toBe('block-puzzle');
  });

  it('has a name', () => {
    expect(BLOCK_PUZZLE_CONFIG.name).toBeTruthy();
  });

  it('has leaderboard id matching game id', () => {
    expect(BLOCK_PUZZLE_CONFIG.leaderboardId).toBe('block-puzzle');
  });

  it('has color values', () => {
    expect(BLOCK_PUZZLE_CONFIG.colors.primary).toMatch(/^#/);
    expect(BLOCK_PUZZLE_CONFIG.colors.secondary).toMatch(/^#/);
    expect(BLOCK_PUZZLE_CONFIG.colors.accent).toMatch(/^#/);
  });

  it('has a description', () => {
    expect(typeof BLOCK_PUZZLE_CONFIG.description).toBe('string');
    expect(BLOCK_PUZZLE_CONFIG.description.length).toBeGreaterThan(0);
  });
});
