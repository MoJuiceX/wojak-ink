/**
 * Tests for flappy-orange/particles.ts
 * Validates pure particle creation and update functions.
 */

import { describe, it, expect } from 'vitest';
import {
  createDeathParticles,
  createWingParticles,
  createPassParticles,
  updateParticles,
  addParticles,
} from './particles';
import { JUICE_CONFIG } from './config';
import type { Particle } from './types';

// ============================================
// HELPERS
// ============================================

function makeParticle(overrides: Partial<Particle> = {}): Particle {
  return {
    x: 100,
    y: 100,
    vx: 1,
    vy: -1,
    size: 4,
    alpha: 1,
    rotation: 0,
    rotationSpeed: 0.1,
    color: '#ff6b00',
    ...overrides,
  };
}

// ============================================
// createDeathParticles
// ============================================

describe('createDeathParticles', () => {
  it('creates the default number of particles from config', () => {
    const particles = createDeathParticles(100, 200);
    expect(particles).toHaveLength(JUICE_CONFIG.DEATH_PARTICLE_COUNT);
  });

  it('accepts a custom count', () => {
    const particles = createDeathParticles(100, 200, 5);
    expect(particles).toHaveLength(5);
  });

  it('each particle starts with alpha = 1', () => {
    const particles = createDeathParticles(50, 50);
    particles.forEach(p => expect(p.alpha).toBe(1));
  });

  it('each particle has a gravity value', () => {
    const particles = createDeathParticles(50, 50);
    particles.forEach(p => expect(p.gravity).toBeDefined());
  });

  it('particles radiate outward from spawn position', () => {
    const particles = createDeathParticles(100, 100);
    // At least some particles should have non-zero vx or vy
    const moving = particles.filter(p => p.vx !== 0 || p.vy !== 0);
    expect(moving.length).toBeGreaterThan(0);
  });

  it('particle positions start at x, y spawn point', () => {
    const particles = createDeathParticles(300, 400);
    particles.forEach(p => {
      expect(p.x).toBe(300);
      expect(p.y).toBe(400);
    });
  });

  it('each particle has a positive size', () => {
    const particles = createDeathParticles(50, 50);
    particles.forEach(p => expect(p.size).toBeGreaterThan(0));
  });

  it('each particle has a non-empty color string', () => {
    const particles = createDeathParticles(50, 50);
    particles.forEach(p => {
      expect(typeof p.color).toBe('string');
      expect(p.color.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// createWingParticles
// ============================================

describe('createWingParticles', () => {
  it('creates the default number of wing particles from config', () => {
    const particles = createWingParticles(100, 200);
    expect(particles).toHaveLength(JUICE_CONFIG.WING_PARTICLE_COUNT);
  });

  it('accepts a custom count', () => {
    const particles = createWingParticles(100, 200, 7);
    expect(particles).toHaveLength(7);
  });

  it('wing particles appear to the left of the bird (x - 10)', () => {
    const particles = createWingParticles(100, 200);
    particles.forEach(p => expect(p.x).toBeLessThan(100));
  });

  it('wing particles start with alpha 0.8', () => {
    const particles = createWingParticles(100, 200);
    particles.forEach(p => expect(p.alpha).toBe(0.8));
  });

  it('each particle has a positive size', () => {
    const particles = createWingParticles(50, 50);
    particles.forEach(p => expect(p.size).toBeGreaterThan(0));
  });

  it('creates no gravity property (undefined or missing)', () => {
    const particles = createWingParticles(50, 50);
    particles.forEach(p => expect(p.gravity).toBeUndefined());
  });
});

// ============================================
// createPassParticles
// ============================================

describe('createPassParticles', () => {
  it('creates the default number of pass particles from config', () => {
    const particles = createPassParticles(200, 300);
    expect(particles).toHaveLength(JUICE_CONFIG.PASS_PARTICLE_COUNT);
  });

  it('accepts a custom count', () => {
    const particles = createPassParticles(200, 300, 50, 10);
    expect(particles).toHaveLength(10);
  });

  it('each particle starts at x position', () => {
    const particles = createPassParticles(200, 300);
    particles.forEach(p => expect(p.x).toBe(200));
  });

  it('each particle starts with alpha = 1', () => {
    const particles = createPassParticles(200, 300);
    particles.forEach(p => expect(p.alpha).toBe(1));
  });

  it('particle y positions are spread around gapY', () => {
    const gapY = 300;
    const gapSize = 100;
    const particles = createPassParticles(200, gapY, gapSize, 50);
    const ys = particles.map(p => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // With 50 particles, spread should span at least some range
    expect(maxY - minY).toBeGreaterThan(0);
    // All y values within gapSize/2 of gapY
    ys.forEach(y => {
      expect(y).toBeGreaterThanOrEqual(gapY - gapSize / 2);
      expect(y).toBeLessThanOrEqual(gapY + gapSize / 2);
    });
  });

  it('each particle has positive size', () => {
    const particles = createPassParticles(200, 300);
    particles.forEach(p => expect(p.size).toBeGreaterThan(0));
  });
});

// ============================================
// updateParticles
// ============================================

describe('updateParticles', () => {
  it('removes particles with alpha <= 0 after many updates', () => {
    // A particle with very low alpha that will fade out after 1 update
    const p = makeParticle({ alpha: 0.01 });
    const result = updateParticles([p], 1);
    expect(result).toHaveLength(0);
  });

  it('keeps particles with alpha > 0', () => {
    const p = makeParticle({ alpha: 1 });
    const result = updateParticles([p], 1);
    expect(result.length).toBeGreaterThan(0);
  });

  it('updates particle position by velocity * deltaTime', () => {
    const p = makeParticle({ x: 100, y: 100, vx: 2, vy: 3, alpha: 1, gravity: undefined });
    // Call once and check position moved
    const result = updateParticles([p], 1);
    if (result.length > 0) {
      // vx=2 => x += 2 per frame
      expect(result[0].x).toBe(102);
    }
  });

  it('applies gravity to vy when present', () => {
    const p = makeParticle({ vy: 0, gravity: 0.5, alpha: 1 });
    const originalVy = p.vy;
    updateParticles([p], 1);
    // Since updateParticles mutates p in place before filtering
    expect(p.vy).toBeGreaterThan(originalVy);
  });

  it('filters out all particles if all alpha values fade to 0', () => {
    const particles = Array.from({ length: 5 }, () => makeParticle({ alpha: 0.01 }));
    const result = updateParticles(particles, 1);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(updateParticles([], 1)).toHaveLength(0);
  });

  it('applies rotationSpeed to rotation', () => {
    const p = makeParticle({ rotation: 0, rotationSpeed: 0.5, alpha: 1 });
    updateParticles([p], 1);
    expect(p.rotation).toBeCloseTo(0.5);
  });
});

// ============================================
// addParticles
// ============================================

describe('addParticles', () => {
  it('combines existing and new particles', () => {
    const existing = [makeParticle()];
    const newP = [makeParticle(), makeParticle()];
    const result = addParticles(existing, newP, 100);
    expect(result).toHaveLength(3);
  });

  it('caps result at maxCount', () => {
    const existing = Array.from({ length: 8 }, () => makeParticle());
    const newP = Array.from({ length: 5 }, () => makeParticle());
    const result = addParticles(existing, newP, 10);
    expect(result).toHaveLength(10);
  });

  it('keeps the most recent particles when capping (slices from end)', () => {
    const existing = [makeParticle({ x: 1 })];
    const newP = [makeParticle({ x: 2 }), makeParticle({ x: 3 })];
    // maxCount=2 => combined is [x:1, x:2, x:3] => slice(-2) => [x:2, x:3]
    const result = addParticles(existing, newP, 2);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBe(2);
    expect(result[1].x).toBe(3);
  });

  it('returns combined array without trimming when under maxCount', () => {
    const existing = [makeParticle({ x: 1 })];
    const newP = [makeParticle({ x: 2 })];
    const result = addParticles(existing, newP, 50);
    expect(result).toHaveLength(2);
  });

  it('handles empty existing array', () => {
    const newP = [makeParticle(), makeParticle()];
    const result = addParticles([], newP, 10);
    expect(result).toHaveLength(2);
  });

  it('handles empty new particles array', () => {
    const existing = [makeParticle()];
    const result = addParticles(existing, [], 10);
    expect(result).toHaveLength(1);
  });

  it('handles both arrays empty', () => {
    const result = addParticles([], [], 10);
    expect(result).toHaveLength(0);
  });
});
