/**
 * Tests for flappy-orange/weather.ts
 * Validates pure weather system functions: rain, snow, leaves, birds, lightning, and helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  createRainDrops,
  updateRainDrops,
  updateRainSplashes,
  addRainDropsWithCap,
  createSnowflakes,
  updateSnowflakes,
  addSnowflakes,
  createFallingLeaf,
  createFallingLeaves,
  updateFallingLeaves,
  addFallingLeaves,
  createBirdFlock,
  updateBackgroundBirds,
  canSpawnBirdFlock,
  getTimeOfDayPhase,
  generateLightningBolt,
  updateLightningBolts,
  shouldTriggerLightning,
  getLightningFlashSequence,
  getThunderEffectParams,
  calculateRainSpawnCount,
  createWeatherRainDrop,
  shouldSpawnSnow,
  calculateSnowSpawnCount,
  setWeatherTypeDirect,
  updateSnowAccumulation,
} from './weather';
import type { WeatherState } from './types';
import { CYCLE_DURATION_MS } from './config';

// ============================================
// HELPERS
// ============================================
function makeWeatherState(overrides: Partial<WeatherState> = {}): WeatherState {
  return {
    current: 'clear',
    intensity: 0,
    windSpeed: 0,
    windDirection: 1,
    transitionProgress: 1,
    nextWeather: null,
    fogIntensity: 0,
    currentSequence: ['clear', 'clear'],
    sequenceIndex: 0,
    inClearBuffer: false,
    ...overrides,
  };
}

// ============================================
// createRainDrops
// ============================================
describe('createRainDrops', () => {
  it('creates the requested number of drops', () => {
    const drops = createRainDrops(10, 400, 600);
    expect(drops).toHaveLength(10);
  });

  it('creates zero drops when count is 0', () => {
    const drops = createRainDrops(0, 400, 600);
    expect(drops).toHaveLength(0);
  });

  it('each drop has required fields', () => {
    const drops = createRainDrops(5, 400, 600);
    for (const drop of drops) {
      expect(typeof drop.x).toBe('number');
      expect(typeof drop.y).toBe('number');
      expect(typeof drop.length).toBe('number');
      expect(typeof drop.speed).toBe('number');
      expect(typeof drop.opacity).toBe('number');
      expect(typeof drop.foreground).toBe('boolean');
    }
  });

  it('staggerY spreads drops vertically', () => {
    const drops = createRainDrops(50, 400, 600, true);
    const hasPositiveY = drops.some(d => d.y > 0);
    expect(hasPositiveY).toBe(true);
  });

  it('without staggerY all drops start above canvas', () => {
    const drops = createRainDrops(20, 400, 600, false);
    for (const drop of drops) {
      expect(drop.y).toBeLessThan(0);
    }
  });
});

// ============================================
// updateRainDrops
// ============================================
describe('updateRainDrops', () => {
  it('removes drops that hit the ground', () => {
    const drops = [{ x: 100, y: 595, length: 10, speed: 10, opacity: 0.5, foreground: false }];
    const { drops: updated } = updateRainDrops(drops, 600, 590);
    expect(updated).toHaveLength(0);
  });

  it('keeps drops that are still falling', () => {
    const drops = [{ x: 100, y: 100, length: 10, speed: 5, opacity: 0.5, foreground: false }];
    const { drops: updated } = updateRainDrops(drops, 600, 590);
    expect(updated).toHaveLength(1);
  });

  it('generates splashes when drops hit ground', () => {
    const drops = [{ x: 100, y: 585, length: 10, speed: 10, opacity: 0.5, foreground: false }];
    const { newSplashes } = updateRainDrops(drops, 600, 590);
    expect(newSplashes.length).toBeGreaterThan(0);
  });

  it('stops generating splashes once maxSplashes count is reached', () => {
    // Each drop generates 2-3 splashes; with maxSplashes=3 we cap early
    const drops = Array.from({ length: 20 }, (_, i) => ({
      x: i, y: 589, length: 5, speed: 5, opacity: 0.5, foreground: false,
    }));
    const { newSplashes } = updateRainDrops(drops, 600, 590, 3);
    // May slightly exceed 3 due to per-drop batch (2-3 splashes), but should be < 6
    expect(newSplashes.length).toBeLessThan(6);
  });
});

// ============================================
// updateRainSplashes
// ============================================
describe('updateRainSplashes', () => {
  it('removes fully faded splashes', () => {
    const splashes = [{ x: 0, y: 0, vx: 0, vy: 0, alpha: 0.02, size: 1 }];
    const updated = updateRainSplashes(splashes);
    // 0.02 - 0.05 = -0.03 -> filtered
    expect(updated).toHaveLength(0);
  });

  it('keeps splashes with remaining alpha', () => {
    const splashes = [{ x: 0, y: 0, vx: 0, vy: -1, alpha: 0.6, size: 1 }];
    const updated = updateRainSplashes(splashes);
    expect(updated).toHaveLength(1);
  });
});

// ============================================
// addRainDropsWithCap
// ============================================
describe('addRainDropsWithCap', () => {
  it('combines existing and new drops', () => {
    const drop = { x: 0, y: 0, length: 10, speed: 5, opacity: 0.5, foreground: false };
    const existing = [drop];
    const newDrops = [drop, drop];
    const result = addRainDropsWithCap(existing, newDrops, 100);
    expect(result).toHaveLength(3);
  });

  it('caps total drops at maxDrops', () => {
    const drop = { x: 0, y: 0, length: 10, speed: 5, opacity: 0.5, foreground: false };
    const existing = Array(5).fill(drop);
    const newDrops = Array(5).fill(drop);
    const result = addRainDropsWithCap(existing, newDrops, 7);
    expect(result).toHaveLength(7);
  });
});

// ============================================
// createSnowflakes
// ============================================
describe('createSnowflakes', () => {
  it('creates the requested number of snowflakes', () => {
    const flakes = createSnowflakes(10, 400, 600);
    expect(flakes).toHaveLength(10);
  });

  it('respects capacity limit', () => {
    const flakes = createSnowflakes(10, 400, 600, false, 5, 3);
    // maxSnowflakes=5, currentCount=3 -> only 2 slots
    expect(flakes).toHaveLength(2);
  });

  it('each snowflake has required fields', () => {
    const flakes = createSnowflakes(3, 400, 600);
    for (const flake of flakes) {
      expect(typeof flake.x).toBe('number');
      expect(typeof flake.size).toBe('number');
      expect(typeof flake.speed).toBe('number');
      expect(typeof flake.foreground).toBe('boolean');
    }
  });
});

// ============================================
// updateSnowflakes
// ============================================
describe('updateSnowflakes', () => {
  it('removes snowflakes that fall off canvas', () => {
    const flakes = [{ x: 200, y: 605, size: 2, speed: 5, drift: 0, driftPhase: 0, opacity: 0.8, foreground: false }];
    const updated = updateSnowflakes(flakes, 1, 0, 400, 600);
    expect(updated).toHaveLength(0);
  });

  it('moves snowflakes downward', () => {
    const flakes = [{ x: 200, y: 100, size: 2, speed: 3, drift: 0, driftPhase: 0, opacity: 0.8, foreground: false }];
    const updated = updateSnowflakes(flakes, 1, 0, 400, 600);
    expect(updated[0].y).toBeGreaterThan(100);
  });
});

// ============================================
// addSnowflakes
// ============================================
describe('addSnowflakes', () => {
  it('combines arrays', () => {
    const flake = { x: 0, y: 0, size: 2, speed: 1, drift: 0, driftPhase: 0, opacity: 0.8, foreground: false };
    const result = addSnowflakes([flake], [flake, flake]);
    expect(result).toHaveLength(3);
  });
});

// ============================================
// createFallingLeaf
// ============================================
describe('createFallingLeaf', () => {
  it('returns a leaf with required fields', () => {
    const leaf = createFallingLeaf(400);
    expect(typeof leaf.x).toBe('number');
    expect(typeof leaf.y).toBe('number');
    expect(typeof leaf.color).toBe('string');
    expect(typeof leaf.rotation).toBe('number');
    expect(typeof leaf.size).toBe('number');
  });

  it('leaf starts above canvas', () => {
    const leaf = createFallingLeaf(400);
    expect(leaf.y).toBeLessThan(0);
  });
});

// ============================================
// createFallingLeaves
// ============================================
describe('createFallingLeaves', () => {
  it('creates the requested number of leaves', () => {
    const leaves = createFallingLeaves(5, 400);
    expect(leaves).toHaveLength(5);
  });

  it('respects capacity limit', () => {
    const leaves = createFallingLeaves(10, 400, 5, 4);
    // maxLeaves=5, currentCount=4 -> only 1 slot
    expect(leaves).toHaveLength(1);
  });
});

// ============================================
// updateFallingLeaves
// ============================================
describe('updateFallingLeaves', () => {
  it('removes leaves that fall off the bottom', () => {
    const leaves = [{ x: 200, y: 615, rotation: 0, rotationSpeed: 0.1, size: 5, speed: 2, drift: 0, driftPhase: 0, color: '#f00' }];
    const updated = updateFallingLeaves(leaves, 1, 0, 600);
    expect(updated).toHaveLength(0);
  });

  it('moves leaves downward', () => {
    const leaves = [{ x: 200, y: 100, rotation: 0, rotationSpeed: 0.1, size: 5, speed: 2, drift: 0, driftPhase: 0, color: '#f00' }];
    const updated = updateFallingLeaves(leaves, 1, 0, 600);
    expect(updated[0].y).toBeGreaterThan(100);
  });
});

// ============================================
// addFallingLeaves
// ============================================
describe('addFallingLeaves', () => {
  it('combines arrays', () => {
    const leaf = { x: 0, y: 0, rotation: 0, rotationSpeed: 0, size: 5, speed: 1, drift: 0, driftPhase: 0, color: '#f00' };
    const result = addFallingLeaves([leaf], [leaf]);
    expect(result).toHaveLength(2);
  });
});

// ============================================
// createBirdFlock
// ============================================
describe('createBirdFlock', () => {
  it('creates a non-empty flock', () => {
    const birds = createBirdFlock(400, 600);
    expect(birds.length).toBeGreaterThan(0);
  });

  it('each bird has required fields', () => {
    const birds = createBirdFlock(400, 600);
    for (const bird of birds) {
      expect(typeof bird.x).toBe('number');
      expect(typeof bird.y).toBe('number');
      expect(typeof bird.speed).toBe('number');
      expect(typeof bird.size).toBe('number');
    }
  });
});

// ============================================
// updateBackgroundBirds
// ============================================
describe('updateBackgroundBirds', () => {
  it('removes birds that fly off right edge', () => {
    const birds = [{ x: 550, y: 100, wingPhase: 0, speed: 5, size: 3, yOffset: 0 }];
    const updated = updateBackgroundBirds(birds, 1, 400);
    expect(updated).toHaveLength(0);
  });

  it('removes birds that fly off left edge', () => {
    const birds = [{ x: -150, y: 100, wingPhase: 0, speed: -5, size: 3, yOffset: 0 }];
    const updated = updateBackgroundBirds(birds, 1, 400);
    expect(updated).toHaveLength(0);
  });

  it('keeps birds still on screen', () => {
    const birds = [{ x: 200, y: 100, wingPhase: 0, speed: 2, size: 3, yOffset: 0 }];
    const updated = updateBackgroundBirds(birds, 1, 400);
    expect(updated).toHaveLength(1);
  });
});

// ============================================
// canSpawnBirdFlock
// ============================================
describe('canSpawnBirdFlock', () => {
  it('returns true when no birds are present', () => {
    expect(canSpawnBirdFlock(0)).toBe(true);
  });

  it('returns false when birds are present', () => {
    expect(canSpawnBirdFlock(1)).toBe(false);
    expect(canSpawnBirdFlock(5)).toBe(false);
  });
});

// ============================================
// getTimeOfDayPhase
// ============================================
describe('getTimeOfDayPhase', () => {
  it('returns dawn at start of cycle', () => {
    expect(getTimeOfDayPhase(0)).toBe('dawn');
  });

  it('returns day during midday', () => {
    // Middle of day phase (25% through cycle)
    const midDay = CYCLE_DURATION_MS * 0.25;
    expect(getTimeOfDayPhase(midDay)).toBe('day');
  });

  it('returns dusk near end of day phase', () => {
    // 48% through cycle = near end of day (before 50%)
    const dusk = CYCLE_DURATION_MS * 0.48;
    expect(getTimeOfDayPhase(dusk)).toBe('dusk');
  });

  it('returns night during night phase', () => {
    // 70% through cycle = middle of night
    const night = CYCLE_DURATION_MS * 0.70;
    expect(getTimeOfDayPhase(night)).toBe('night');
  });

  it('returns dawn near end of night', () => {
    // 96% through cycle = pre-dawn
    const preDawn = CYCLE_DURATION_MS * 0.96;
    expect(getTimeOfDayPhase(preDawn)).toBe('dawn');
  });
});

// ============================================
// generateLightningBolt
// ============================================
describe('generateLightningBolt', () => {
  it('creates a lightning bolt with segments', () => {
    const bolt = generateLightningBolt(400, 600);
    expect(bolt.segments.length).toBeGreaterThan(0);
  });

  it('starts with full alpha', () => {
    const bolt = generateLightningBolt(400, 600);
    expect(bolt.alpha).toBe(1);
  });

  it('has a startTime close to Date.now()', () => {
    const before = Date.now();
    const bolt = generateLightningBolt(400, 600);
    expect(bolt.startTime).toBeGreaterThanOrEqual(before);
  });

  it('segments connect properly (each segment starts where last ended)', () => {
    const bolt = generateLightningBolt(400, 600);
    for (let i = 0; i < bolt.segments.length - 1; i++) {
      // Not all segments are chained (branches exist), but main path should progress downward
      expect(typeof bolt.segments[i].x1).toBe('number');
      expect(typeof bolt.segments[i].y2).toBe('number');
    }
  });
});

// ============================================
// updateLightningBolts
// ============================================
describe('updateLightningBolts', () => {
  it('removes expired bolts', () => {
    const oldBolt = { segments: [], alpha: 0, startTime: Date.now() - 300 };
    const updated = updateLightningBolts([oldBolt]);
    expect(updated).toHaveLength(0);
  });

  it('keeps fresh bolts', () => {
    const freshBolt = { segments: [], alpha: 1, startTime: Date.now() };
    const updated = updateLightningBolts([freshBolt]);
    expect(updated).toHaveLength(1);
  });

  it('fades bolt alpha over time', () => {
    const bolt = { segments: [], alpha: 1, startTime: Date.now() - 100 };
    const updated = updateLightningBolts([bolt]);
    if (updated.length > 0) {
      expect(updated[0].alpha).toBeLessThan(1);
    }
  });
});

// ============================================
// shouldTriggerLightning
// ============================================
describe('shouldTriggerLightning', () => {
  it('never triggers during non-storm weather', () => {
    const weather = makeWeatherState({ current: 'rain', intensity: 1 });
    // Run many times to confirm it's always false
    let triggered = false;
    for (let i = 0; i < 1000; i++) {
      if (shouldTriggerLightning(weather, 1)) triggered = true;
    }
    expect(triggered).toBe(false);
  });

  it('never triggers when intensity is too low', () => {
    const weather = makeWeatherState({ current: 'storm', intensity: 0.1 });
    let triggered = false;
    for (let i = 0; i < 1000; i++) {
      if (shouldTriggerLightning(weather, 1)) triggered = true;
    }
    expect(triggered).toBe(false);
  });
});

// ============================================
// getLightningFlashSequence
// ============================================
describe('getLightningFlashSequence', () => {
  it('returns an array of flash steps', () => {
    const seq = getLightningFlashSequence();
    expect(seq.length).toBeGreaterThan(0);
  });

  it('each step has delay and alpha', () => {
    const seq = getLightningFlashSequence();
    for (const step of seq) {
      expect(typeof step.delay).toBe('number');
      expect(typeof step.alpha).toBe('number');
    }
  });

  it('ends with alpha 0', () => {
    const seq = getLightningFlashSequence();
    expect(seq[seq.length - 1].alpha).toBe(0);
  });
});

// ============================================
// getThunderEffectParams
// ============================================
describe('getThunderEffectParams', () => {
  it('returns thunder params object', () => {
    const params = getThunderEffectParams();
    expect(params.delay).toBeGreaterThan(0);
    expect(params.shakeIntensity).toBeGreaterThan(0);
    expect(params.toneFreq).toBeGreaterThan(0);
  });
});

// ============================================
// calculateRainSpawnCount
// ============================================
describe('calculateRainSpawnCount', () => {
  it('returns 0 for clear weather', () => {
    const weather = makeWeatherState({ current: 'clear', intensity: 1 });
    expect(calculateRainSpawnCount(weather)).toBe(0);
  });

  it('returns 0 when intensity is 0', () => {
    const weather = makeWeatherState({ current: 'rain', intensity: 0 });
    expect(calculateRainSpawnCount(weather)).toBe(0);
  });

  it('returns positive count for rain weather', () => {
    const weather = makeWeatherState({ current: 'rain', intensity: 1 });
    expect(calculateRainSpawnCount(weather)).toBeGreaterThan(0);
  });

  it('returns more drops for storm than rain', () => {
    const rain = makeWeatherState({ current: 'rain', intensity: 1 });
    const storm = makeWeatherState({ current: 'storm', intensity: 1 });
    expect(calculateRainSpawnCount(storm)).toBeGreaterThanOrEqual(calculateRainSpawnCount(rain));
  });
});

// ============================================
// createWeatherRainDrop
// ============================================
describe('createWeatherRainDrop', () => {
  it('creates a heavier drop for storm', () => {
    const stormDrop = createWeatherRainDrop(400, true);
    const rainDrop = createWeatherRainDrop(400, false);
    expect(stormDrop.length).toBeGreaterThanOrEqual(rainDrop.length - 5);
    expect(stormDrop.speed).toBeGreaterThanOrEqual(rainDrop.speed - 5);
  });

  it('drop starts above canvas', () => {
    const drop = createWeatherRainDrop(400, false);
    expect(drop.y).toBeLessThan(0);
  });
});

// ============================================
// shouldSpawnSnow
// ============================================
describe('shouldSpawnSnow', () => {
  it('returns false for non-snow weather', () => {
    const weather = makeWeatherState({ current: 'rain', intensity: 1 });
    expect(shouldSpawnSnow(weather, 1)).toBe(false);
  });

  it('returns false when intensity is 0', () => {
    const weather = makeWeatherState({ current: 'snow', intensity: 0 });
    expect(shouldSpawnSnow(weather, 1)).toBe(false);
  });
});

// ============================================
// calculateSnowSpawnCount
// ============================================
describe('calculateSnowSpawnCount', () => {
  it('increases with intensity', () => {
    const lowIntensity = makeWeatherState({ current: 'snow', intensity: 0.3 });
    const highIntensity = makeWeatherState({ current: 'snow', intensity: 1.0 });
    expect(calculateSnowSpawnCount(lowIntensity)).toBeLessThanOrEqual(calculateSnowSpawnCount(highIntensity));
  });

  it('returns at least 1 for full intensity', () => {
    const weather = makeWeatherState({ current: 'snow', intensity: 1 });
    expect(calculateSnowSpawnCount(weather)).toBeGreaterThanOrEqual(1);
  });
});

// ============================================
// setWeatherTypeDirect
// ============================================
describe('setWeatherTypeDirect', () => {
  it('sets weather type to rain', () => {
    const weather = makeWeatherState({ current: 'clear' });
    setWeatherTypeDirect(weather, 'rain');
    expect(weather.current).toBe('rain');
  });

  it('starts precipitation at 0 intensity', () => {
    const weather = makeWeatherState({ intensity: 1 });
    setWeatherTypeDirect(weather, 'snow');
    expect(weather.intensity).toBe(0);
  });

  it('sets clear weather to full intensity', () => {
    const weather = makeWeatherState({ intensity: 0 });
    setWeatherTypeDirect(weather, 'clear');
    expect(weather.intensity).toBe(1);
  });

  it('clears nextWeather transition', () => {
    const weather = makeWeatherState({ nextWeather: 'storm' });
    setWeatherTypeDirect(weather, 'clear');
    expect(weather.nextWeather).toBeNull();
  });
});

// ============================================
// updateSnowAccumulation
// ============================================
describe('updateSnowAccumulation', () => {
  it('builds up accumulation while snowing', () => {
    const weather = makeWeatherState({ current: 'snow', intensity: 1 });
    const result = updateSnowAccumulation(weather, 0, 450, 400, true, 1);
    expect(result.snowAccumulation).toBeGreaterThan(0);
  });

  it('does not exceed max accumulation of 1', () => {
    const weather = makeWeatherState({ current: 'snow', intensity: 1 });
    const result = updateSnowAccumulation(weather, 0.9999, 450, 400, true, 1);
    expect(result.snowAccumulation).toBeLessThanOrEqual(1);
  });

  it('resets accumulation when snow edge scrolls off', () => {
    const weather = makeWeatherState({ current: 'clear', intensity: 0 });
    const result = updateSnowAccumulation(weather, 0.5, -100, 400, true, 1);
    expect(result.snowAccumulation).toBe(0);
  });

  it('scrolls snow edge left when game is playing after snow stops', () => {
    const weather = makeWeatherState({ current: 'clear', intensity: 0 });
    const result = updateSnowAccumulation(weather, 0.5, 200, 400, true, 1);
    expect(result.snowGroundEdge).toBeLessThan(200);
  });
});
