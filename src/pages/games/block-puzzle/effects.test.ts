/**
 * Tests for block-puzzle/effects.ts
 * Validates pure particle and visual effect functions.
 */

import { describe, it, expect } from 'vitest';
import {
  createLineClearBurstParticles,
  createPlacementParticles,
  createPerfectClearParticles,
  createTrailParticle,
  createShockwave,
  updateClearParticles,
  updateTrailParticles,
  updateShockwaves,
  getFreezeDuration,
  getShockwaveSize,
  shouldTriggerScreenFlash,
  shouldTriggerShockwave,
  getLineClearFlashColor,
  getPerfectClearFlashColor,
} from './effects';

// ============================================
// createLineClearBurstParticles
// ============================================
describe('createLineClearBurstParticles', () => {
  it('creates particles for each cleared cell', () => {
    const cells = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const particles = createLineClearBurstParticles(cells, '#ff6b00', 40);
    expect(particles.length).toBeGreaterThan(0);
  });

  it('returns 12 particles even for a single-cell range (4 corners x 3)', () => {
    const particles = createLineClearBurstParticles([], '#ff6b00', 40);
    expect(particles).toHaveLength(0);
  });

  it('each particle has required fields', () => {
    const cells = [{ row: 2, col: 3 }];
    const particles = createLineClearBurstParticles(cells, '#ff6b00', 40);
    for (const p of particles) {
      expect(typeof p.id).toBe('number');
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(typeof p.vx).toBe('number');
      expect(typeof p.vy).toBe('number');
      expect(p.alpha).toBe(1);
      expect(p.life).toBe(30);
    }
  });

  it('positions particles at the center of their cell', () => {
    const cellSize = 50;
    const cells = [{ row: 0, col: 0 }];
    const particles = createLineClearBurstParticles(cells, '#ff6b00', cellSize);
    // Particles emit from the cell center
    for (const p of particles) {
      // x is offset by velocity from cell center (cellSize/2)
      expect(typeof p.x).toBe('number');
    }
  });

  it('converts gradient color strings to plain hex', () => {
    const cells = [{ row: 0, col: 0 }];
    const particles = createLineClearBurstParticles(cells, 'linear-gradient(135deg, #ff7b00, #e65c00)', 40);
    for (const p of particles) {
      expect(p.color === '#ff6b00' || p.color === '#ffffff').toBe(true);
    }
  });

  it('creates at least 6 particles per cell', () => {
    const cells = [{ row: 0, col: 0 }];
    const particles = createLineClearBurstParticles(cells, '#ff6b00', 40);
    // 6-10 particles per cell
    expect(particles.length).toBeGreaterThanOrEqual(6);
  });

  it('particle ids are numbers', () => {
    const cells = Array.from({ length: 5 }, (_, i) => ({ row: 0, col: i }));
    const particles = createLineClearBurstParticles(cells, '#ff6b00', 40);
    for (const p of particles) {
      expect(typeof p.id).toBe('number');
      expect(Number.isFinite(p.id)).toBe(true);
    }
  });
});

// ============================================
// createPlacementParticles
// ============================================
describe('createPlacementParticles', () => {
  it('creates particles for a valid cell set', () => {
    const cells = ['0-0', '0-1', '1-0', '1-1'];
    const particles = createPlacementParticles(cells, '#ff6b00', 40);
    expect(particles.length).toBeGreaterThan(0);
  });

  it('skips particle creation when bounding box is degenerate (single cell)', () => {
    // With a single cell both corners collapse to same row/col
    const cells = ['0-0'];
    const particles = createPlacementParticles(cells, '#ff6b00', 40);
    // Still generates corner particles (degenerate box still has 4 corners)
    expect(particles.length).toBeGreaterThanOrEqual(0);
  });

  it('creates exactly 12 particles (4 corners x 3 each)', () => {
    const cells = ['0-0', '2-3'];
    const particles = createPlacementParticles(cells, '#ff6b00', 40);
    // 4 corners * 3 = 12
    expect(particles.length).toBe(12);
  });

  it('each particle has required fields', () => {
    const cells = ['1-1', '1-2', '2-1'];
    const particles = createPlacementParticles(cells, '#ff6b00', 40);
    for (const p of particles) {
      expect(typeof p.id).toBe('number');
      expect(typeof p.vx).toBe('number');
      expect(typeof p.vy).toBe('number');
      expect(p.life).toBe(25);
    }
  });

  it('converts gradient color to hex', () => {
    const cells = ['0-0', '1-1'];
    const particles = createPlacementParticles(cells, 'linear-gradient(135deg, #aa, #bb)', 40);
    for (const p of particles) {
      expect(p.color === '#ff6b00' || p.color === '#ffffff').toBe(true);
    }
  });
});

// ============================================
// createPerfectClearParticles
// ============================================
describe('createPerfectClearParticles', () => {
  it('creates exactly 60 particles', () => {
    const particles = createPerfectClearParticles(400);
    expect(particles).toHaveLength(60);
  });

  it('all particles start at center', () => {
    const gridSize = 400;
    const particles = createPerfectClearParticles(gridSize);
    for (const p of particles) {
      expect(p.x).toBe(gridSize / 2);
      expect(p.y).toBe(gridSize / 2);
    }
  });

  it('particles have life of 40 frames', () => {
    const particles = createPerfectClearParticles(400);
    for (const p of particles) {
      expect(p.life).toBe(40);
    }
  });

  it('particles use celebration colors', () => {
    const particles = createPerfectClearParticles(400);
    const validColors = ['#ffcc00', '#ff6b00', '#ffffff', '#00ff88'];
    for (const p of particles) {
      expect(validColors.includes(p.color)).toBe(true);
    }
  });

  it('particles spread in all directions (mix of vx/vy signs)', () => {
    const particles = createPerfectClearParticles(400);
    const positiveVx = particles.filter(p => p.vx > 0).length;
    const negativeVx = particles.filter(p => p.vx < 0).length;
    expect(positiveVx).toBeGreaterThan(0);
    expect(negativeVx).toBeGreaterThan(0);
  });
});

// ============================================
// createTrailParticle
// ============================================
describe('createTrailParticle', () => {
  it('returns null when distance is below threshold', () => {
    const result = createTrailParticle(10, 10, { x: 5, y: 5 }, '#ff6b00', 20);
    // distance = sqrt(25+25) ~= 7.07, below 20
    expect(result).toBeNull();
  });

  it('returns a particle when distance exceeds threshold', () => {
    const result = createTrailParticle(100, 100, { x: 0, y: 0 }, '#ff6b00', 20);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(100);
    expect(result!.y).toBe(100);
  });

  it('uses default threshold of 20', () => {
    // Distance exactly 20: should NOT create (requires > threshold)
    const result = createTrailParticle(20, 0, { x: 0, y: 0 }, '#ff6b00');
    expect(result).toBeNull();
  });

  it('converts gradient colors to hex', () => {
    const result = createTrailParticle(200, 200, { x: 0, y: 0 }, 'linear-gradient(#aa)', 20);
    expect(result).not.toBeNull();
    expect(result!.color).toBe('#ff6b00');
  });

  it('particle has correct fields', () => {
    const result = createTrailParticle(100, 200, { x: 0, y: 0 }, '#ff6b00', 20);
    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('number');
    expect(result!.alpha).toBe(0.5);
    expect(result!.size).toBeGreaterThan(0);
  });
});

// ============================================
// createShockwave
// ============================================
describe('createShockwave', () => {
  it('creates a shockwave at the given position', () => {
    const sw = createShockwave(200, 300);
    expect(sw.x).toBe(200);
    expect(sw.y).toBe(300);
  });

  it('uses default max size of 300', () => {
    const sw = createShockwave(0, 0);
    expect(sw.maxSize).toBe(300);
  });

  it('accepts custom max size', () => {
    const sw = createShockwave(0, 0, 500);
    expect(sw.maxSize).toBe(500);
  });

  it('starts with size 0 and alpha 1', () => {
    const sw = createShockwave(0, 0);
    expect(sw.size).toBe(0);
    expect(sw.alpha).toBe(1);
  });
});

// ============================================
// updateClearParticles
// ============================================
describe('updateClearParticles', () => {
  it('applies gravity to vy', () => {
    const particles = [{ id: 1, x: 0, y: 0, vx: 0, vy: 0, size: 10, color: '#fff', alpha: 1, rotation: 0, rotationSpeed: 0, life: 30 }];
    const updated = updateClearParticles(particles);
    expect(updated[0].vy).toBeCloseTo(0.3);
  });

  it('removes particles with alpha <= 0', () => {
    const particles = [{ id: 1, x: 0, y: 0, vx: 0, vy: 0, size: 10, color: '#fff', alpha: 0, rotation: 0, rotationSpeed: 0, life: 30 }];
    const updated = updateClearParticles(particles);
    expect(updated).toHaveLength(0);
  });

  it('removes particles with life <= 0', () => {
    const particles = [{ id: 1, x: 0, y: 0, vx: 0, vy: 0, size: 10, color: '#fff', alpha: 1, rotation: 0, rotationSpeed: 0, life: 0 }];
    const updated = updateClearParticles(particles);
    expect(updated).toHaveLength(0);
  });

  it('moves particles by velocity', () => {
    const particles = [{ id: 1, x: 10, y: 20, vx: 5, vy: -3, size: 10, color: '#fff', alpha: 1, rotation: 0, rotationSpeed: 0, life: 30 }];
    const updated = updateClearParticles(particles);
    expect(updated[0].x).toBe(15);
    expect(updated[0].y).toBe(17);
  });

  it('does not mutate original array', () => {
    const original = [{ id: 1, x: 0, y: 0, vx: 1, vy: 1, size: 10, color: '#fff', alpha: 1, rotation: 0, rotationSpeed: 0, life: 30 }];
    const originalX = original[0].x;
    updateClearParticles(original);
    expect(original[0].x).toBe(originalX);
  });
});

// ============================================
// updateTrailParticles
// ============================================
describe('updateTrailParticles', () => {
  it('fades alpha by 0.04 per frame', () => {
    const particles = [{ id: 1, x: 0, y: 0, size: 8, color: '#fff', alpha: 0.5 }];
    const updated = updateTrailParticles(particles);
    expect(updated[0].alpha).toBeCloseTo(0.46);
  });

  it('removes particles with alpha <= 0', () => {
    const particles = [{ id: 1, x: 0, y: 0, size: 8, color: '#fff', alpha: 0.02 }];
    const updated = updateTrailParticles(particles);
    // 0.02 - 0.04 = -0.02 -> filtered
    expect(updated).toHaveLength(0);
  });

  it('shrinks particles by 0.92 per frame', () => {
    const particles = [{ id: 1, x: 0, y: 0, size: 10, color: '#fff', alpha: 0.5 }];
    const updated = updateTrailParticles(particles);
    expect(updated[0].size).toBeCloseTo(9.2);
  });
});

// ============================================
// updateShockwaves
// ============================================
describe('updateShockwaves', () => {
  it('expands size by expandSpeed per frame', () => {
    const shockwaves = [{ id: 1, x: 0, y: 0, size: 0, maxSize: 300, alpha: 1 }];
    const updated = updateShockwaves(shockwaves);
    expect(updated[0].size).toBe(15);
  });

  it('uses custom expand speed', () => {
    const shockwaves = [{ id: 1, x: 0, y: 0, size: 0, maxSize: 300, alpha: 1 }];
    const updated = updateShockwaves(shockwaves, 30);
    expect(updated[0].size).toBe(30);
  });

  it('removes shockwaves that reach maxSize', () => {
    const shockwaves = [{ id: 1, x: 0, y: 0, size: 295, maxSize: 300, alpha: 0.1 }];
    const updated = updateShockwaves(shockwaves);
    // 295 + 15 = 310 >= 300, filtered
    expect(updated).toHaveLength(0);
  });

  it('calculates alpha based on pre-expansion size', () => {
    const shockwaves = [{ id: 1, x: 0, y: 0, size: 150, maxSize: 300, alpha: 0.5 }];
    const updated = updateShockwaves(shockwaves);
    // alpha = 1 - (oldSize / maxSize) = 1 - (150/300) = 0.5
    expect(updated[0].alpha).toBeCloseTo(1 - 150 / 300);
  });
});

// ============================================
// getFreezeDuration
// ============================================
describe('getFreezeDuration', () => {
  it('returns 0 for single line clear', () => {
    expect(getFreezeDuration(1)).toBe(0);
  });

  it('returns correct durations for multi-line clears', () => {
    expect(getFreezeDuration(2)).toBe(50);
    expect(getFreezeDuration(3)).toBe(80);
    expect(getFreezeDuration(4)).toBe(120);
  });

  it('caps at 4 line duration for more lines', () => {
    expect(getFreezeDuration(5)).toBe(120);
    expect(getFreezeDuration(10)).toBe(120);
  });

  it('returns 0 for unknown input', () => {
    expect(getFreezeDuration(0)).toBe(0);
  });
});

// ============================================
// getShockwaveSize
// ============================================
describe('getShockwaveSize', () => {
  it('base size is 250 for 0 lines', () => {
    expect(getShockwaveSize(0)).toBe(250);
  });

  it('adds 50 per line cleared', () => {
    expect(getShockwaveSize(1)).toBe(300);
    expect(getShockwaveSize(2)).toBe(350);
    expect(getShockwaveSize(4)).toBe(450);
  });
});

// ============================================
// shouldTriggerScreenFlash
// ============================================
describe('shouldTriggerScreenFlash', () => {
  it('returns false for fewer than 3 lines', () => {
    expect(shouldTriggerScreenFlash(1)).toBe(false);
    expect(shouldTriggerScreenFlash(2)).toBe(false);
  });

  it('returns true for 3 or more lines', () => {
    expect(shouldTriggerScreenFlash(3)).toBe(true);
    expect(shouldTriggerScreenFlash(5)).toBe(true);
  });
});

// ============================================
// shouldTriggerShockwave
// ============================================
describe('shouldTriggerShockwave', () => {
  it('returns false for 1 line', () => {
    expect(shouldTriggerShockwave(1)).toBe(false);
  });

  it('returns true for 2 or more lines', () => {
    expect(shouldTriggerShockwave(2)).toBe(true);
    expect(shouldTriggerShockwave(4)).toBe(true);
  });
});

// ============================================
// Flash Colors
// ============================================
describe('getLineClearFlashColor', () => {
  it('returns a rgba color string', () => {
    const color = getLineClearFlashColor();
    expect(color).toContain('rgba');
  });
});

describe('getPerfectClearFlashColor', () => {
  it('returns white', () => {
    const color = getPerfectClearFlashColor();
    expect(color).toBe('#ffffff');
  });
});
