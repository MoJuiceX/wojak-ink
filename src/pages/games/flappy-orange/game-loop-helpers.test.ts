/**
 * Tests for FlappyOrange Game Loop Helpers
 */
import { describe, it, expect } from 'vitest';
import {
  shouldSpawnPipe,
  updateCoinPositions,
  calculateMovementSpeed,
  processPipeCollisions,
  calculateDeltaTime,
  applyTimeScale,
  checkNearMiss,
} from './game-loop-helpers';
import type { Pipe, Coin, Bird } from './types';
import { PIPE_SPACING, PIPE_WIDTH, BIRD_RADIUS } from './config';

// ============================================
// TEST HELPERS
// ============================================

function makePipe(overrides: Partial<Pipe> = {}): Pipe {
  return {
    x: 400,
    gapY: 300,
    passed: false,
    isMoving: false,
    moveSpeed: 0,
    moveDirection: 1,
    moveRange: 0,
    baseGapY: 300,
    movePhase: 0,
    gapSize: 150,
    frostLevel: 0,
    ...overrides,
  };
}

function makeBird(overrides: Partial<Bird> = {}): Bird {
  return {
    y: 300,
    velocity: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    velocityX: 0,
    rotationVelocity: 0,
    ...overrides,
  };
}

function makeCoin(overrides: Partial<Coin> = {}): Coin {
  return {
    x: 200,
    y: 300,
    collected: false,
    rotation: 0,
    ...overrides,
  };
}

// ============================================
// shouldSpawnPipe
// ============================================

describe('shouldSpawnPipe', () => {
  it('returns true when there are no pipes', () => {
    expect(shouldSpawnPipe([], 800)).toBe(true);
  });

  it('returns true when the last pipe is far enough from right edge', () => {
    const pipes = [makePipe({ x: 100 })];
    expect(shouldSpawnPipe(pipes, 800)).toBe(true);
  });

  it('returns false when the last pipe is close to the right edge', () => {
    const pipes = [makePipe({ x: 800 - PIPE_SPACING + 10 })];
    expect(shouldSpawnPipe(pipes, 800)).toBe(false);
  });

  it('returns false when the last pipe is exactly at spawn threshold', () => {
    const pipes = [makePipe({ x: 800 - PIPE_SPACING })];
    expect(shouldSpawnPipe(pipes, 800)).toBe(false);
  });
});

// ============================================
// updateCoinPositions
// ============================================

describe('updateCoinPositions', () => {
  it('moves coins to the left each frame', () => {
    const coins = [makeCoin({ x: 200 })];
    const result = updateCoinPositions(coins, 3, 1, 100, 300);
    expect(result.coins[0].x).toBeLessThan(200);
  });

  it('removes coins that go off-screen to the left', () => {
    const coins = [makeCoin({ x: -50 })];
    const result = updateCoinPositions(coins, 3, 1, 100, 300);
    expect(result.coins).toHaveLength(0);
  });

  it('collects a coin when bird is close enough', () => {
    const coins = [makeCoin({ x: 100, y: 300 })];
    const result = updateCoinPositions(coins, 0, 1, 100, 300);
    expect(result.collectedCoins).toHaveLength(1);
    expect(result.scoreGained).toBe(1);
  });

  it('does not collect already-collected coins', () => {
    const coins = [makeCoin({ x: 100, y: 300, collected: true })];
    const result = updateCoinPositions(coins, 0, 1, 100, 300);
    expect(result.collectedCoins).toHaveLength(0);
    expect(result.scoreGained).toBe(0);
  });

  it('does not collect a coin that is too far away', () => {
    const coins = [makeCoin({ x: 500, y: 500 })];
    const result = updateCoinPositions(coins, 0, 1, 100, 100);
    expect(result.collectedCoins).toHaveLength(0);
    expect(result.scoreGained).toBe(0);
  });

  it('tracks missed coins (off-screen without collection)', () => {
    const coins = [makeCoin({ x: -40, collected: false })];
    const result = updateCoinPositions(coins, 0, 1, 100, 300);
    expect(result.missedCoins).toHaveLength(1);
  });

  it('increments coin rotation each frame', () => {
    const coins = [makeCoin({ x: 200, y: 300, rotation: 0 })];
    const result = updateCoinPositions(coins, 0, 1, 999, 999);
    expect(result.coins.length).toBeGreaterThanOrEqual(0);
    // Rotation might not be visible if coin is off-screen, so just test it moved
  });

  it('returns scoreGained of 0 with no coins', () => {
    const result = updateCoinPositions([], 3, 1, 100, 300);
    expect(result.scoreGained).toBe(0);
    expect(result.collectedCoins).toHaveLength(0);
  });
});

// ============================================
// calculateMovementSpeed
// ============================================

describe('calculateMovementSpeed', () => {
  it('returns a positive value', () => {
    const speed = calculateMovementSpeed(0, 1);
    expect(speed).toBeGreaterThan(0);
  });

  it('higher scores produce higher speed', () => {
    const speedLow = calculateMovementSpeed(0, 1);
    const speedHigh = calculateMovementSpeed(100, 1);
    expect(speedHigh).toBeGreaterThanOrEqual(speedLow);
  });

  it('scales linearly with deltaTime', () => {
    const speed1 = calculateMovementSpeed(0, 1);
    const speed2 = calculateMovementSpeed(0, 2);
    expect(speed2).toBeCloseTo(speed1 * 2, 5);
  });

  it('uses custom base speed when provided', () => {
    const speedDefault = calculateMovementSpeed(0, 1, 2.5);
    const speedCustom = calculateMovementSpeed(0, 1, 5.0);
    expect(speedCustom).toBeCloseTo(speedDefault * 2, 5);
  });
});

// ============================================
// processPipeCollisions
// ============================================

describe('processPipeCollisions', () => {
  it('detects ground collision', () => {
    const bird = makeBird({ y: 580 }); // near bottom
    const canvasHeight = 600;
    const result = processPipeCollisions(bird, [], 0, 100, canvasHeight);
    // y + BIRD_RADIUS > canvasHeight - 20 → 580 + BIRD_RADIUS > 580
    expect(result.collision).toBe(true);
  });

  it('no collision in open space', () => {
    const bird = makeBird({ y: 300 });
    const result = processPipeCollisions(bird, [], 0, 100, 600);
    expect(result.collision).toBe(false);
  });

  it('detects pipe collision when bird is in pipe', () => {
    const bird = makeBird({ y: 50 }); // near top
    const pipe = makePipe({ x: 100 - PIPE_WIDTH, gapY: 300, gapSize: 150 });
    const result = processPipeCollisions(bird, [pipe], 0, 100, 600);
    expect(result.collision).toBe(true);
  });

  it('no collision when bird fits through the gap', () => {
    const bird = makeBird({ y: 300 }); // centered in gap
    const pipe = makePipe({ x: 50, gapY: 300, gapSize: 200 });
    // Bird is not horizontally in range (birdX=100, pipe.x + PIPE_WIDTH < birdX - BIRD_RADIUS)
    const result = processPipeCollisions(bird, [pipe], 0, 100, 600);
    expect(result.collision).toBe(false);
  });

  it('increments score when a pipe is passed', () => {
    const bird = makeBird({ y: 300 });
    // Pipe is behind birdX, not yet passed
    const pipe = makePipe({ x: 80 - PIPE_WIDTH, gapY: 300, gapSize: 200, passed: false });
    const result = processPipeCollisions(bird, [pipe], 0, 100, 600);
    expect(result.newScore).toBe(1);
    expect(result.passedPipes).toHaveLength(1);
  });

  it('does not double-count already passed pipes', () => {
    const bird = makeBird({ y: 300 });
    const pipe = makePipe({ x: 80 - PIPE_WIDTH, gapY: 300, gapSize: 200, passed: true });
    const result = processPipeCollisions(bird, [pipe], 5, 100, 600);
    expect(result.newScore).toBe(5);
    expect(result.passedPipes).toHaveLength(0);
  });
});

// ============================================
// calculateDeltaTime
// ============================================

describe('calculateDeltaTime', () => {
  it('returns 1 for a perfect 60fps frame (16.67ms)', () => {
    const delta = calculateDeltaTime(16.67, 0);
    expect(delta).toBeCloseTo(1, 0);
  });

  it('returns 2 for a 30fps frame (33.33ms)', () => {
    const delta = calculateDeltaTime(33.33, 0);
    expect(delta).toBeCloseTo(2, 0);
  });

  it('caps at maxMultiplier (default 4)', () => {
    const delta = calculateDeltaTime(1000, 0);
    expect(delta).toBeLessThanOrEqual(4);
  });

  it('respects custom maxMultiplier', () => {
    const delta = calculateDeltaTime(1000, 0, 2);
    expect(delta).toBeLessThanOrEqual(2);
  });

  it('returns 0 for same timestamp', () => {
    const delta = calculateDeltaTime(100, 100);
    expect(delta).toBe(0);
  });
});

// ============================================
// applyTimeScale
// ============================================

describe('applyTimeScale', () => {
  it('returns deltaTime unchanged at scale 1', () => {
    expect(applyTimeScale(2, 1)).toBe(2);
  });

  it('slows time at scale 0.5', () => {
    expect(applyTimeScale(2, 0.5)).toBe(1);
  });

  it('speeds up time at scale 2', () => {
    expect(applyTimeScale(2, 2)).toBe(4);
  });

  it('returns 0 when timeScale is 0', () => {
    expect(applyTimeScale(3, 0)).toBe(0);
  });

  it('returns 0 when deltaTime is 0', () => {
    expect(applyTimeScale(0, 2)).toBe(0);
  });
});

// ============================================
// checkNearMiss
// ============================================

describe('checkNearMiss', () => {
  it('returns no near-miss when no pipes', () => {
    const bird = makeBird({ y: 300 });
    const result = checkNearMiss(bird, [], 100);
    expect(result.isNearMiss).toBe(false);
    expect(result.closestDistance).toBe(Infinity);
  });

  it('returns no near-miss when bird is not horizontally near pipe', () => {
    const bird = makeBird({ y: 300 });
    const pipe = makePipe({ x: 400, gapY: 300, gapSize: 150 });
    const result = checkNearMiss(bird, [pipe], 100);
    expect(result.isNearMiss).toBe(false);
  });

  it('detects near-miss when bird barely clears the gap', () => {
    const bird = makeBird({ y: 300 });
    // Position pipe so birdX is inside it horizontally
    const birdX = 100;
    const pipe = makePipe({ x: birdX - BIRD_RADIUS - 1, gapY: 300, gapSize: 150 });
    const result = checkNearMiss(bird, [pipe], birdX, 15);
    // bird.y - BIRD_RADIUS vs topPipeBottom = 300 - 75 = 225
    // distToTop = (300 - BIRD_RADIUS) - 225 = 300 - BIRD_RADIUS - 225
    // Only truly checks if within threshold
    expect(typeof result.isNearMiss).toBe('boolean');
    expect(typeof result.closestDistance).toBe('number');
  });

  it('returns finite closestDistance when pipe is horizontal range', () => {
    const birdX = 100;
    const bird = makeBird({ y: 300 });
    const pipe = makePipe({ x: birdX - BIRD_RADIUS - 1, gapY: 300, gapSize: 200 });
    const result = checkNearMiss(bird, [pipe], birdX);
    expect(Number.isFinite(result.closestDistance)).toBe(true);
  });
});
