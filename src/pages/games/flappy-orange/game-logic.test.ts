/**
 * Tests for flappy-orange/game-logic.ts
 * Validates pure game logic functions for difficulty, collision, pipe generation, and bird physics.
 */

import { describe, it, expect } from 'vitest';
import {
  getDifficultyTier,
  getCurrentGapSize,
  getSpeedMultiplier,
  getMovingPipeChance,
  checkCollision,
  generatePipe,
  updateBirdPhysics,
  applyJump,
  createInitialBird,
  updateMovingPipe,
  calculatePipeSpeed,
} from './game-logic';
import { PHYSICS, DIFFICULTY_CONFIG, BIRD_RADIUS, PIPE_WIDTH } from './config';
import type { Bird, Pipe } from './types';

// ============================================
// DIFFICULTY TIER
// ============================================
describe('getDifficultyTier', () => {
  it('returns tier 0 at score 0', () => {
    expect(getDifficultyTier(0)).toBe(0);
  });

  it('returns correct tier at each threshold boundary', () => {
    const thresholds = DIFFICULTY_CONFIG.TIER_THRESHOLDS;
    // Just below first threshold = tier 0
    expect(getDifficultyTier(thresholds[0] - 1)).toBe(0);
    // At first threshold = tier 1
    expect(getDifficultyTier(thresholds[0])).toBe(1);
  });

  it('returns max tier beyond all thresholds', () => {
    expect(getDifficultyTier(1000)).toBe(DIFFICULTY_CONFIG.TIER_THRESHOLDS.length);
  });

  it('increases monotonically with score', () => {
    const tiers = [0, 5, 12, 20, 35, 50, 100].map(getDifficultyTier);
    for (let i = 0; i < tiers.length - 1; i++) {
      expect(tiers[i]).toBeLessThanOrEqual(tiers[i + 1]);
    }
  });
});

// ============================================
// GAP SIZE
// ============================================
describe('getCurrentGapSize', () => {
  it('returns largest gap at score 0 (easiest)', () => {
    const gap = getCurrentGapSize(0);
    expect(gap).toBe(DIFFICULTY_CONFIG.GAP_SIZES[0]);
  });

  it('returns smaller gap at higher scores', () => {
    const easyGap = getCurrentGapSize(0);
    const hardGap = getCurrentGapSize(1000);
    expect(hardGap).toBeLessThanOrEqual(easyGap);
  });

  it('returns the last gap size beyond max difficulty', () => {
    const lastGap = DIFFICULTY_CONFIG.GAP_SIZES[DIFFICULTY_CONFIG.GAP_SIZES.length - 1];
    expect(getCurrentGapSize(10000)).toBe(lastGap);
  });
});

// ============================================
// SPEED MULTIPLIER
// ============================================
describe('getSpeedMultiplier', () => {
  it('returns 1.0 at score 0', () => {
    expect(getSpeedMultiplier(0)).toBe(DIFFICULTY_CONFIG.SPEED_MULTIPLIERS[0]);
  });

  it('increases with difficulty', () => {
    const low = getSpeedMultiplier(0);
    const high = getSpeedMultiplier(1000);
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

// ============================================
// MOVING PIPE CHANCE
// ============================================
describe('getMovingPipeChance', () => {
  it('returns 0 at score 0 (no moving pipes early on)', () => {
    expect(getMovingPipeChance(0)).toBe(0);
  });

  it('increases with score', () => {
    const low = getMovingPipeChance(0);
    const high = getMovingPipeChance(1000);
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

// ============================================
// COLLISION DETECTION
// ============================================
describe('checkCollision', () => {
  const canvasHeight = 500;
  const birdX = 100;

  const baseBird: Bird = {
    y: 200,
    velocity: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    velocityX: 0,
    rotationVelocity: 0,
  };

  it('detects ground collision', () => {
    const groundBird = { ...baseBird, y: canvasHeight - 10 };
    expect(checkCollision(groundBird, [], canvasHeight, birdX)).toBe(true);
  });

  it('no collision in open sky with no pipes', () => {
    expect(checkCollision(baseBird, [], canvasHeight, birdX)).toBe(false);
  });

  it('detects pipe collision when bird is outside gap', () => {
    const pipe: Pipe = {
      x: birdX - PIPE_WIDTH / 2,
      gapY: 200,
      passed: false,
      isMoving: false,
      moveSpeed: 0,
      moveDirection: 1,
      moveRange: 0,
      baseGapY: 200,
      movePhase: 0,
      gapSize: 100,
      frostLevel: 0,
    };
    // Bird is above the gap
    const highBird = { ...baseBird, y: 50 };
    expect(checkCollision(highBird, [pipe], canvasHeight, birdX)).toBe(true);
  });

  it('no collision when bird is inside the gap', () => {
    const pipe: Pipe = {
      x: birdX - PIPE_WIDTH / 2,
      gapY: 200,
      passed: false,
      isMoving: false,
      moveSpeed: 0,
      moveDirection: 1,
      moveRange: 0,
      baseGapY: 200,
      movePhase: 0,
      gapSize: 200,
      frostLevel: 0,
    };
    // Bird is centered in the gap
    expect(checkCollision(baseBird, [pipe], canvasHeight, birdX)).toBe(false);
  });

  it('no collision when pipe is far to the right', () => {
    const farPipe: Pipe = {
      x: birdX + 500,
      gapY: 200,
      passed: false,
      isMoving: false,
      moveSpeed: 0,
      moveDirection: 1,
      moveRange: 0,
      baseGapY: 200,
      movePhase: 0,
      gapSize: 50,
      frostLevel: 0,
    };
    expect(checkCollision(baseBird, [farPipe], canvasHeight, birdX)).toBe(false);
  });
});

// ============================================
// PIPE GENERATION
// ============================================
describe('generatePipe', () => {
  const canvasWidth = 400;
  const canvasHeight = 600;

  it('generates a pipe with required fields', () => {
    const pipe = generatePipe(canvasWidth, canvasHeight, 0);
    expect(pipe.x).toBeDefined();
    expect(pipe.gapY).toBeDefined();
    expect(typeof pipe.isMoving).toBe('boolean');
    expect(pipe.gapSize).toBeGreaterThan(0);
    expect(pipe.passed).toBe(false);
  });

  it('first pipe starts further right', () => {
    const firstPipe = generatePipe(canvasWidth, canvasHeight, 0, true);
    const normalPipe = generatePipe(canvasWidth, canvasHeight, 0, false);
    expect(firstPipe.x).toBeGreaterThan(normalPipe.x);
  });

  it('gapY is within valid canvas bounds', () => {
    for (let i = 0; i < 20; i++) {
      const pipe = generatePipe(canvasWidth, canvasHeight, 0);
      expect(pipe.gapY).toBeGreaterThan(0);
      expect(pipe.gapY).toBeLessThan(canvasHeight);
    }
  });

  it('first pipe is never moving', () => {
    for (let i = 0; i < 10; i++) {
      const pipe = generatePipe(canvasWidth, canvasHeight, 100, true);
      expect(pipe.isMoving).toBe(false);
    }
  });

  it('records frost level', () => {
    const pipe = generatePipe(canvasWidth, canvasHeight, 0, false, 0.5);
    expect(pipe.frostLevel).toBe(0.5);
  });

  it('gap size decreases with difficulty', () => {
    const easyPipe = generatePipe(canvasWidth, canvasHeight, 0);
    const hardPipe = generatePipe(canvasWidth, canvasHeight, 1000);
    expect(hardPipe.gapSize).toBeLessThanOrEqual(easyPipe.gapSize);
  });
});

// ============================================
// BIRD PHYSICS
// ============================================
describe('updateBirdPhysics', () => {
  const baseBird: Bird = {
    y: 200,
    velocity: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    velocityX: 0,
    rotationVelocity: 0,
  };

  it('applies gravity to velocity', () => {
    const updated = updateBirdPhysics(baseBird);
    expect(updated.velocity).toBeCloseTo(PHYSICS.GRAVITY);
  });

  it('does not mutate the original bird', () => {
    const originalY = baseBird.y;
    updateBirdPhysics(baseBird);
    expect(baseBird.y).toBe(originalY);
  });

  it('caps velocity at MAX_FALL_SPEED', () => {
    const fastBird = { ...baseBird, velocity: PHYSICS.MAX_FALL_SPEED + 10 };
    const updated = updateBirdPhysics(fastBird);
    expect(updated.velocity).toBe(PHYSICS.MAX_FALL_SPEED);
  });

  it('moves bird downward with positive velocity', () => {
    const fallingBird = { ...baseBird, velocity: 2 };
    const updated = updateBirdPhysics(fallingBird);
    expect(updated.y).toBeGreaterThan(baseBird.y);
  });

  it('clamps bird to ceiling when not dying', () => {
    const ceilingBird = { ...baseBird, y: 5, velocity: -10 };
    const updated = updateBirdPhysics(ceilingBird, 1, false);
    expect(updated.y).toBeGreaterThanOrEqual(BIRD_RADIUS + 10);
    expect(updated.velocity).toBe(0);
  });

  it('allows bird to go above ceiling when dying', () => {
    const dyingBird = { ...baseBird, y: 5, velocity: -10 };
    const updated = updateBirdPhysics(dyingBird, 1, true);
    // No ceiling clamping during death
    expect(updated.y).toBeLessThan(BIRD_RADIUS + 10);
  });
});

// ============================================
// APPLY JUMP
// ============================================
describe('applyJump', () => {
  it('sets velocity to JUMP_VELOCITY', () => {
    const bird: Bird = { y: 200, velocity: 3, rotation: 0, scaleX: 1, scaleY: 1, velocityX: 0, rotationVelocity: 0 };
    const jumped = applyJump(bird);
    expect(jumped.velocity).toBe(PHYSICS.JUMP_VELOCITY);
  });

  it('does not mutate original bird', () => {
    const bird: Bird = { y: 200, velocity: 3, rotation: 0, scaleX: 1, scaleY: 1, velocityX: 0, rotationVelocity: 0 };
    applyJump(bird);
    expect(bird.velocity).toBe(3);
  });

  it('preserves other bird properties', () => {
    const bird: Bird = { y: 250, velocity: 3, rotation: 0.5, scaleX: 1.2, scaleY: 0.9, velocityX: 1, rotationVelocity: 0 };
    const jumped = applyJump(bird);
    expect(jumped.y).toBe(250);
    expect(jumped.rotation).toBe(0.5);
  });
});

// ============================================
// CREATE INITIAL BIRD
// ============================================
describe('createInitialBird', () => {
  it('creates a bird at the specified y position', () => {
    const bird = createInitialBird(300);
    expect(bird.y).toBe(300);
  });

  it('creates a bird with zero velocity', () => {
    const bird = createInitialBird(200);
    expect(bird.velocity).toBe(0);
    expect(bird.velocityX).toBe(0);
    expect(bird.rotationVelocity).toBe(0);
  });

  it('creates a bird with normal scale', () => {
    const bird = createInitialBird(200);
    expect(bird.scaleX).toBe(1);
    expect(bird.scaleY).toBe(1);
  });

  it('creates a bird with zero rotation', () => {
    const bird = createInitialBird(200);
    expect(bird.rotation).toBe(0);
  });
});

// ============================================
// UPDATE MOVING PIPE
// ============================================
describe('updateMovingPipe', () => {
  const canvasHeight = 600;

  const movingPipe: Pipe = {
    x: 200,
    gapY: 300,
    passed: false,
    isMoving: true,
    moveSpeed: 1,
    moveDirection: 1,
    moveRange: 50,
    baseGapY: 300,
    movePhase: 0,
    gapSize: 200,
    frostLevel: 0,
  };

  it('returns same gapY for non-moving pipes', () => {
    const staticPipe = { ...movingPipe, isMoving: false };
    const result = updateMovingPipe(staticPipe, 1, canvasHeight, 0);
    expect(result).toBe(staticPipe.gapY);
  });

  it('returns a number within canvas bounds for moving pipes', () => {
    const result = updateMovingPipe(movingPipe, 1, canvasHeight, 0);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(canvasHeight);
  });
});

// ============================================
// CALCULATE PIPE SPEED
// ============================================
describe('calculatePipeSpeed', () => {
  it('returns base speed at score 0', () => {
    const baseSpeed = 2.5;
    const speed = calculatePipeSpeed(0, baseSpeed);
    expect(speed).toBeCloseTo(baseSpeed * DIFFICULTY_CONFIG.SPEED_MULTIPLIERS[0]);
  });

  it('increases speed with higher score', () => {
    const slowSpeed = calculatePipeSpeed(0);
    const fastSpeed = calculatePipeSpeed(1000);
    expect(fastSpeed).toBeGreaterThanOrEqual(slowSpeed);
  });

  it('uses default base speed of 2.5', () => {
    const speed = calculatePipeSpeed(0);
    expect(speed).toBeGreaterThan(0);
  });
});
