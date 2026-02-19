import { describe, it, expect } from 'vitest';
import {
  PHYSICS,
  JUICE_CONFIG,
  DIFFICULTY_CONFIG,
  WEATHER_CONFIG,
  ENVIRONMENT_COLORS,
  GAME_PALETTE,
  WEATHER_SEQUENCES,
  CYCLE_DURATION_MS,
  DAY_DURATION_MS,
  NIGHT_DURATION_MS,
  BIRD_RADIUS,
  PIPE_WIDTH,
  PIPE_GAP,
  PIPE_SPACING,
  FLAPPY_ORANGE_CONFIG,
} from './config';

describe('PHYSICS constants', () => {
  it('GRAVITY is a positive number', () => {
    expect(PHYSICS.GRAVITY).toBeGreaterThan(0);
  });

  it('JUMP_VELOCITY is negative (upward)', () => {
    expect(PHYSICS.JUMP_VELOCITY).toBeLessThan(0);
  });

  it('MAX_FALL_SPEED is positive', () => {
    expect(PHYSICS.MAX_FALL_SPEED).toBeGreaterThan(0);
  });

  it('ROTATION_SPEED is positive', () => {
    expect(PHYSICS.ROTATION_SPEED).toBeGreaterThan(0);
  });

  it('MAX_FALL_SPEED is larger than JUMP_VELOCITY magnitude', () => {
    // Fall speed cap should be less than or comparable to jump speed
    expect(PHYSICS.MAX_FALL_SPEED).toBeGreaterThan(0);
    expect(Math.abs(PHYSICS.JUMP_VELOCITY)).toBeGreaterThan(PHYSICS.MAX_FALL_SPEED);
  });
});

describe('DIFFICULTY_CONFIG', () => {
  it('has the same number of tier thresholds as speed multipliers minus one', () => {
    expect(DIFFICULTY_CONFIG.SPEED_MULTIPLIERS.length).toBe(DIFFICULTY_CONFIG.TIER_THRESHOLDS.length + 1);
  });

  it('has the same number of gap sizes as speed multipliers', () => {
    expect(DIFFICULTY_CONFIG.GAP_SIZES.length).toBe(DIFFICULTY_CONFIG.SPEED_MULTIPLIERS.length);
  });

  it('tier thresholds are in ascending order', () => {
    const thresholds = [...DIFFICULTY_CONFIG.TIER_THRESHOLDS];
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });

  it('gap sizes decrease (harder game = smaller gap)', () => {
    const gaps = [...DIFFICULTY_CONFIG.GAP_SIZES];
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1]);
    }
  });

  it('speed multipliers increase (harder game = faster speed)', () => {
    const multipliers = [...DIFFICULTY_CONFIG.SPEED_MULTIPLIERS];
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1]);
    }
  });

  it('speed multipliers start at 1.0 (base speed)', () => {
    expect(DIFFICULTY_CONFIG.SPEED_MULTIPLIERS[0]).toBe(1.0);
  });

  it('moving pipe chances are non-decreasing across tiers', () => {
    const chances = [...DIFFICULTY_CONFIG.MOVING_PIPE_CHANCES];
    for (let i = 1; i < chances.length; i++) {
      expect(chances[i]).toBeGreaterThanOrEqual(chances[i - 1]);
    }
  });

  it('first tier has 0 moving pipe chance (no moving pipes initially)', () => {
    expect(DIFFICULTY_CONFIG.MOVING_PIPE_CHANCES[0]).toBe(0);
  });
});

describe('WEATHER_CONFIG', () => {
  it('MIN_WEATHER_DURATION is less than MAX_WEATHER_DURATION', () => {
    expect(WEATHER_CONFIG.MIN_WEATHER_DURATION).toBeLessThan(WEATHER_CONFIG.MAX_WEATHER_DURATION);
  });

  it('event chances sum to approximately 1.0', () => {
    const sum = Object.values(WEATHER_CONFIG.EVENT_CHANCES).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('MAX_SNOWFLAKES and MAX_RAIN_DROPS are positive integers', () => {
    expect(WEATHER_CONFIG.MAX_SNOWFLAKES).toBeGreaterThan(0);
    expect(WEATHER_CONFIG.MAX_RAIN_DROPS).toBeGreaterThan(0);
  });

  it('FOG_CHANCE is between 0 and 1', () => {
    expect(WEATHER_CONFIG.FOG_CHANCE).toBeGreaterThan(0);
    expect(WEATHER_CONFIG.FOG_CHANCE).toBeLessThan(1);
  });
});

describe('ENVIRONMENT_COLORS', () => {
  const phases = ['dawn', 'day', 'golden', 'sunset', 'dusk', 'night'] as const;

  it('has all expected time-of-day phases', () => {
    phases.forEach(phase => {
      expect(ENVIRONMENT_COLORS).toHaveProperty(phase);
    });
  });

  it('each phase has skyTop and skyBottom colors', () => {
    phases.forEach(phase => {
      expect(ENVIRONMENT_COLORS[phase]).toHaveProperty('skyTop');
      expect(ENVIRONMENT_COLORS[phase]).toHaveProperty('skyBottom');
    });
  });

  it('each phase has treeFoliage and ground colors', () => {
    phases.forEach(phase => {
      expect(ENVIRONMENT_COLORS[phase]).toHaveProperty('treeFoliage');
      expect(ENVIRONMENT_COLORS[phase]).toHaveProperty('ground');
    });
  });

  it('each phase has orangeFruit color', () => {
    phases.forEach(phase => {
      expect(ENVIRONMENT_COLORS[phase]).toHaveProperty('orangeFruit');
    });
  });

  it('sky colors are valid hex strings', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    phases.forEach(phase => {
      expect(ENVIRONMENT_COLORS[phase].skyTop).toMatch(hexRegex);
      expect(ENVIRONMENT_COLORS[phase].skyBottom).toMatch(hexRegex);
    });
  });

  it('night phase has darker sky than day phase', () => {
    // Night sky top should be darker (lower hex value) than day sky top
    const nightSky = parseInt(ENVIRONMENT_COLORS.night.skyTop.slice(1), 16);
    const daySky = parseInt(ENVIRONMENT_COLORS.day.skyTop.slice(1), 16);
    expect(nightSky).toBeLessThan(daySky);
  });
});

describe('GAME_PALETTE', () => {
  it('has at least 10 colors', () => {
    expect(GAME_PALETTE.length).toBeGreaterThanOrEqual(10);
  });

  it('all entries are valid hex colors', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    GAME_PALETTE.forEach(color => {
      expect(color).toMatch(hexRegex);
    });
  });

  it('has no duplicate colors', () => {
    const unique = new Set(GAME_PALETTE);
    expect(unique.size).toBe(GAME_PALETTE.length);
  });
});

describe('WEATHER_SEQUENCES', () => {
  it('has rain, storm, snow, and clear sequences', () => {
    expect(WEATHER_SEQUENCES).toHaveProperty('rain');
    expect(WEATHER_SEQUENCES).toHaveProperty('storm');
    expect(WEATHER_SEQUENCES).toHaveProperty('snow');
    expect(WEATHER_SEQUENCES).toHaveProperty('clear');
  });

  it('each sequence starts and ends with clear', () => {
    ['rain', 'storm', 'snow'].forEach(key => {
      const seq = WEATHER_SEQUENCES[key];
      expect(seq[0]).toBe('clear');
      expect(seq[seq.length - 1]).toBe('clear');
    });
  });

  it('storm sequence contains storm phase', () => {
    expect(WEATHER_SEQUENCES.storm).toContain('storm');
  });
});

describe('Timing constants', () => {
  it('CYCLE_DURATION_MS equals DAY_DURATION_MS + NIGHT_DURATION_MS', () => {
    expect(CYCLE_DURATION_MS).toBe(DAY_DURATION_MS + NIGHT_DURATION_MS);
  });

  it('day and night durations are equal', () => {
    expect(DAY_DURATION_MS).toBe(NIGHT_DURATION_MS);
  });

  it('full cycle is 2 minutes', () => {
    expect(CYCLE_DURATION_MS).toBe(120000);
  });
});

describe('Game dimensions', () => {
  it('BIRD_RADIUS is a reasonable value', () => {
    expect(BIRD_RADIUS).toBeGreaterThan(5);
    expect(BIRD_RADIUS).toBeLessThan(50);
  });

  it('PIPE_GAP is larger than 2x BIRD_RADIUS (bird can fit through)', () => {
    expect(PIPE_GAP).toBeGreaterThan(BIRD_RADIUS * 2);
  });

  it('PIPE_SPACING is greater than PIPE_WIDTH', () => {
    expect(PIPE_SPACING).toBeGreaterThan(PIPE_WIDTH);
  });
});

describe('FLAPPY_ORANGE_CONFIG metadata', () => {
  it('has required properties', () => {
    expect(FLAPPY_ORANGE_CONFIG).toHaveProperty('id');
    expect(FLAPPY_ORANGE_CONFIG).toHaveProperty('name');
    expect(FLAPPY_ORANGE_CONFIG).toHaveProperty('leaderboardId');
    expect(FLAPPY_ORANGE_CONFIG).toHaveProperty('colors');
  });

  it('primary color is the brand orange', () => {
    expect(FLAPPY_ORANGE_CONFIG.colors.primary).toBe('#FF6B00');
  });

  it('leaderboardId matches the game id', () => {
    expect(FLAPPY_ORANGE_CONFIG.leaderboardId).toBe(FLAPPY_ORANGE_CONFIG.id);
  });
});

describe('JUICE_CONFIG', () => {
  it('SLOW_MO_SCALE is between 0 and 1', () => {
    expect(JUICE_CONFIG.SLOW_MO_SCALE).toBeGreaterThan(0);
    expect(JUICE_CONFIG.SLOW_MO_SCALE).toBeLessThan(1);
  });

  it('NEAR_MISS_THRESHOLD is between 0 and 1', () => {
    expect(JUICE_CONFIG.NEAR_MISS_THRESHOLD).toBeGreaterThan(0);
    expect(JUICE_CONFIG.NEAR_MISS_THRESHOLD).toBeLessThan(1);
  });

  it('FIRE_THRESHOLD is a positive integer', () => {
    expect(JUICE_CONFIG.FIRE_THRESHOLD).toBeGreaterThan(0);
    expect(Number.isInteger(JUICE_CONFIG.FIRE_THRESHOLD)).toBe(true);
  });

  it('FLAP_SCALE_X is less than 1 (squish on flap)', () => {
    expect(JUICE_CONFIG.FLAP_SCALE_X).toBeLessThan(1);
  });

  it('FLAP_SCALE_Y is greater than 1 (stretch on flap)', () => {
    expect(JUICE_CONFIG.FLAP_SCALE_Y).toBeGreaterThan(1);
  });
});
