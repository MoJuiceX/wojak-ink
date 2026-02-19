import { describe, it, expect, vi } from 'vitest';
import {
  PARTICLE_PRESETS,
  createParticleSystem,
  spawnBurstParticles,
  spawnTrailParticle,
  updateParticles,
  drawParticles,
  drawParticlesCircle,
  clearParticles,
  createRingEffect,
  updateRingEffect,
  drawRingEffect,
} from './particles';

// ============================================
// Helpers
// ============================================

function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
}

// ============================================
// PARTICLE_PRESETS
// ============================================

describe('PARTICLE_PRESETS', () => {
  it('has expected preset keys', () => {
    expect(PARTICLE_PRESETS.wing).toBeDefined();
    expect(PARTICLE_PRESETS.explosion).toBeDefined();
    expect(PARTICLE_PRESETS.pass).toBeDefined();
    expect(PARTICLE_PRESETS.fire).toBeDefined();
    expect(PARTICLE_PRESETS.nearMiss).toBeDefined();
    expect(PARTICLE_PRESETS.confetti).toBeDefined();
    expect(PARTICLE_PRESETS.ripple).toBeDefined();
  });

  it('each preset has required fields', () => {
    for (const config of Object.values(PARTICLE_PRESETS)) {
      expect(config.count).toBeGreaterThan(0);
      expect(config.speed).toBeDefined();
      expect(config.speed.min).toBeLessThanOrEqual(config.speed.max);
      expect(config.size).toBeDefined();
      expect(config.life).toBeDefined();
      expect(Array.isArray(config.colors)).toBe(true);
      expect(config.colors.length).toBeGreaterThan(0);
    }
  });

  it('explosion has more particles than wing', () => {
    expect(PARTICLE_PRESETS.explosion.count).toBeGreaterThan(
      PARTICLE_PRESETS.wing.count
    );
  });

  it('confetti has more particles than fire', () => {
    expect(PARTICLE_PRESETS.confetti.count).toBeGreaterThan(
      PARTICLE_PRESETS.fire.count
    );
  });

  it('confetti has long life', () => {
    expect(PARTICLE_PRESETS.confetti.life.min).toBeGreaterThan(500);
  });

  it('wing preset has shrink=true', () => {
    expect(PARTICLE_PRESETS.wing.shrink).toBe(true);
  });
});

// ============================================
// createParticleSystem
// ============================================

describe('createParticleSystem', () => {
  it('creates system with empty particles array', () => {
    const system = createParticleSystem();
    expect(system.particles).toHaveLength(0);
  });

  it('defaults to maxParticles=100', () => {
    const system = createParticleSystem();
    expect(system.maxParticles).toBe(100);
  });

  it('accepts custom maxParticles', () => {
    const system = createParticleSystem({ maxParticles: 50 });
    expect(system.maxParticles).toBe(50);
  });
});

// ============================================
// spawnBurstParticles
// ============================================

describe('spawnBurstParticles', () => {
  it('spawns particles equal to preset count', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 100, 200, 'explosion');
    expect(system.particles).toHaveLength(PARTICLE_PRESETS.explosion.count);
  });

  it('particles have unique ids', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'explosion');
    const ids = system.particles.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('particles start at spawn position', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 50, 75, 'wing');
    for (const p of system.particles) {
      expect(p.x).toBe(50);
      expect(p.y).toBe(75);
    }
  });

  it('particles have alpha=1 initially', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'wing');
    for (const p of system.particles) {
      expect(p.alpha).toBe(1);
    }
  });

  it('enforces maxParticles by removing oldest', () => {
    const system = createParticleSystem({ maxParticles: 5 });
    spawnBurstParticles(system, 0, 0, 'explosion');
    expect(system.particles.length).toBeLessThanOrEqual(system.maxParticles);
  });

  it('works with a custom ParticleConfig object', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    const customConfig = {
      count: 3,
      speed: { min: 1, max: 2 },
      size: { min: 5, max: 10 },
      life: { min: 200, max: 400 },
      colors: ['#FF0000'],
      spread: 360,
    };
    spawnBurstParticles(system, 0, 0, customConfig);
    expect(system.particles).toHaveLength(3);
  });

  it('particles are colored from the preset colors array', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'wing');
    for (const p of system.particles) {
      expect(PARTICLE_PRESETS.wing.colors).toContain(p.color);
    }
  });

  it('particle life is within preset life range', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'wing');
    for (const p of system.particles) {
      expect(p.maxLife).toBeGreaterThanOrEqual(PARTICLE_PRESETS.wing.life.min);
      expect(p.maxLife).toBeLessThanOrEqual(PARTICLE_PRESETS.wing.life.max);
    }
  });
});

// ============================================
// spawnTrailParticle
// ============================================

describe('spawnTrailParticle', () => {
  it('adds exactly one particle per call', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnTrailParticle(system, 50, 50, 'fire');
    expect(system.particles).toHaveLength(1);
    spawnTrailParticle(system, 50, 50, 'fire');
    expect(system.particles).toHaveLength(2);
  });

  it('particle is placed at the given position', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnTrailParticle(system, 123, 456, 'fire');
    expect(system.particles[0].x).toBe(123);
    expect(system.particles[0].y).toBe(456);
  });

  it('respects maxParticles by removing oldest when full', () => {
    const system = createParticleSystem({ maxParticles: 2 });
    spawnTrailParticle(system, 0, 0, 'fire');
    spawnTrailParticle(system, 1, 1, 'fire');
    spawnTrailParticle(system, 2, 2, 'fire');
    expect(system.particles.length).toBeLessThanOrEqual(2);
  });
});

// ============================================
// updateParticles
// ============================================

describe('updateParticles', () => {
  it('removes dead particles after their life expires', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'wing');
    const initialCount = system.particles.length;
    expect(initialCount).toBeGreaterThan(0);
    updateParticles(system, 1000);
    expect(system.particles.length).toBe(0);
  });

  it('moves particles (position changes after update)', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 100, 100, 'explosion');
    const initialPositions = system.particles.map((p) => ({ x: p.x, y: p.y }));

    updateParticles(system, 16);

    const moved = system.particles.some(
      (p, i) =>
        i < initialPositions.length &&
        (p.x !== initialPositions[i].x || p.y !== initialPositions[i].y)
    );
    expect(moved).toBe(true);
  });

  it('decreases particle life by deltaTime', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'wing');
    const initialLife = system.particles[0].life;
    updateParticles(system, 50);
    const particle = system.particles[0];
    if (particle) {
      expect(particle.life).toBeLessThan(initialLife);
    }
  });

  it('handles empty particle system without errors', () => {
    const system = createParticleSystem();
    expect(() => updateParticles(system, 16)).not.toThrow();
  });
});

// ============================================
// drawParticles
// ============================================

describe('drawParticles', () => {
  it('calls ctx.save and ctx.restore for each particle', () => {
    const ctx = makeCtx();
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'wing');
    const count = system.particles.length;
    drawParticles(ctx, system);
    expect(ctx.save).toHaveBeenCalledTimes(count);
    expect(ctx.restore).toHaveBeenCalledTimes(count);
  });

  it('calls ctx.fillRect for each particle', () => {
    const ctx = makeCtx();
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'wing');
    const count = system.particles.length;
    drawParticles(ctx, system);
    expect(ctx.fillRect).toHaveBeenCalledTimes(count);
  });

  it('does nothing for empty system', () => {
    const ctx = makeCtx();
    const system = createParticleSystem();
    drawParticles(ctx, system);
    expect(ctx.save).not.toHaveBeenCalled();
  });
});

// ============================================
// drawParticlesCircle
// ============================================

describe('drawParticlesCircle', () => {
  it('calls ctx.arc for each particle', () => {
    const ctx = makeCtx();
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'nearMiss');
    const count = system.particles.length;
    drawParticlesCircle(ctx, system);
    expect(ctx.arc).toHaveBeenCalledTimes(count);
    expect(ctx.fill).toHaveBeenCalledTimes(count);
  });

  it('does nothing for empty system', () => {
    const ctx = makeCtx();
    const system = createParticleSystem();
    drawParticlesCircle(ctx, system);
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});

// ============================================
// clearParticles
// ============================================

describe('clearParticles', () => {
  it('empties the particles array', () => {
    const system = createParticleSystem({ maxParticles: 200 });
    spawnBurstParticles(system, 0, 0, 'explosion');
    expect(system.particles.length).toBeGreaterThan(0);
    clearParticles(system);
    expect(system.particles).toHaveLength(0);
  });

  it('does nothing on already-empty system', () => {
    const system = createParticleSystem();
    expect(() => clearParticles(system)).not.toThrow();
    expect(system.particles).toHaveLength(0);
  });
});

// ============================================
// RING EFFECT
// ============================================

describe('createRingEffect', () => {
  it('creates ring at given position', () => {
    const ring = createRingEffect(100, 200);
    expect(ring.x).toBe(100);
    expect(ring.y).toBe(200);
  });

  it('starts with radius=0', () => {
    const ring = createRingEffect(0, 0);
    expect(ring.radius).toBe(0);
  });

  it('defaults maxRadius to 50', () => {
    const ring = createRingEffect(0, 0);
    expect(ring.maxRadius).toBe(50);
  });

  it('starts with alpha=1', () => {
    const ring = createRingEffect(0, 0);
    expect(ring.alpha).toBe(1);
  });

  it('accepts custom options', () => {
    const ring = createRingEffect(0, 0, {
      maxRadius: 100,
      life: 600,
      color: '#FF0000',
      lineWidth: 3,
    });
    expect(ring.maxRadius).toBe(100);
    expect(ring.life).toBe(600);
    expect(ring.color).toBe('#FF0000');
    expect(ring.lineWidth).toBe(3);
  });
});

describe('updateRingEffect', () => {
  it('returns true while still alive', () => {
    const ring = createRingEffect(0, 0, { life: 400 });
    expect(updateRingEffect(ring, 100)).toBe(true);
  });

  it('returns false when life expires', () => {
    const ring = createRingEffect(0, 0, { life: 400 });
    expect(updateRingEffect(ring, 500)).toBe(false);
  });

  it('radius grows toward maxRadius as life decreases', () => {
    const ring = createRingEffect(0, 0, { maxRadius: 50, life: 400 });
    updateRingEffect(ring, 200);
    expect(ring.radius).toBeCloseTo(25, 0);
  });

  it('alpha decreases as ring expands', () => {
    const ring = createRingEffect(0, 0, { life: 400 });
    updateRingEffect(ring, 200);
    expect(ring.alpha).toBeLessThan(1);
    expect(ring.alpha).toBeGreaterThan(0);
  });
});

describe('drawRingEffect', () => {
  it('calls ctx.arc to draw the ring', () => {
    const ctx = makeCtx();
    const ring = createRingEffect(50, 75, { maxRadius: 30, life: 400 });
    updateRingEffect(ring, 100);
    drawRingEffect(ctx, ring);
    expect(ctx.arc).toHaveBeenCalledOnce();
  });

  it('calls ctx.save and ctx.restore', () => {
    const ctx = makeCtx();
    const ring = createRingEffect(0, 0);
    updateRingEffect(ring, 100);
    drawRingEffect(ctx, ring);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });
});
