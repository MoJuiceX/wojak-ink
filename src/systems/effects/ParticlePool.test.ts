// src/systems/effects/ParticlePool.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ParticlePool, particlePool } from './ParticlePool';

describe('ParticlePool', () => {
  let pool: ParticlePool;

  beforeEach(() => {
    pool = new ParticlePool(10);
  });

  describe('constructor', () => {
    it('initializes with the given max capacity', () => {
      const stats = pool.getStats();
      expect(stats.total).toBe(10);
    });

    it('starts with zero active particles', () => {
      const stats = pool.getStats();
      expect(stats.active).toBe(0);
    });

    it('starts with all particles available', () => {
      const stats = pool.getStats();
      expect(stats.available).toBe(10);
    });

    it('defaults to 200 particles when no arg given', () => {
      const defaultPool = new ParticlePool();
      expect(defaultPool.getStats().total).toBe(200);
    });
  });

  describe('acquire', () => {
    it('returns a particle object', () => {
      const p = pool.acquire();
      expect(p).not.toBeNull();
      expect(p).toHaveProperty('active', true);
    });

    it('marks acquired particle as active', () => {
      const p = pool.acquire()!;
      expect(p.active).toBe(true);
    });

    it('increments active count', () => {
      pool.acquire();
      pool.acquire();
      expect(pool.getStats().active).toBe(2);
    });

    it('returns null when pool is exhausted', () => {
      for (let i = 0; i < 10; i++) pool.acquire();
      const p = pool.acquire();
      expect(p).toBeNull();
    });

    it('decrements available count', () => {
      pool.acquire();
      expect(pool.getStats().available).toBe(9);
    });
  });

  describe('spawn', () => {
    it('returns a particle with given properties', () => {
      const p = pool.spawn({ x: 100, y: 200, color: '#ff0000' });
      expect(p).not.toBeNull();
      expect(p!.x).toBe(100);
      expect(p!.y).toBe(200);
      expect(p!.color).toBe('#ff0000');
    });

    it('uses defaults for unspecified properties', () => {
      const p = pool.spawn({})!;
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
      expect(p.color).toBe('#ffffff');
      expect(p.size).toBe(4);
    });

    it('sets maxLife from life when maxLife not provided', () => {
      const p = pool.spawn({ life: 2 })!;
      expect(p.maxLife).toBe(2);
    });

    it('returns null when pool is exhausted', () => {
      for (let i = 0; i < 10; i++) pool.spawn({});
      const p = pool.spawn({ x: 1 });
      expect(p).toBeNull();
    });

    it('marks spawned particle as active', () => {
      const p = pool.spawn({ x: 5, y: 5 })!;
      expect(p.active).toBe(true);
    });
  });

  describe('release', () => {
    it('marks particle as inactive', () => {
      const p = pool.acquire()!;
      pool.release(p);
      expect(p.active).toBe(false);
    });

    it('decrements active count', () => {
      const p = pool.acquire()!;
      pool.acquire();
      pool.release(p);
      expect(pool.getStats().active).toBe(1);
    });

    it('allows re-acquiring released particle', () => {
      const p = pool.acquire()!;
      pool.release(p);
      const p2 = pool.acquire();
      expect(p2).not.toBeNull();
      expect(p2!.active).toBe(true);
    });

    it('does not double-decrement if particle already inactive', () => {
      const p = pool.acquire()!;
      pool.release(p);
      pool.release(p); // second release
      expect(pool.getStats().active).toBe(0);
    });
  });

  describe('getActive', () => {
    it('returns empty array when none are active', () => {
      expect(pool.getActive()).toHaveLength(0);
    });

    it('returns only active particles', () => {
      pool.acquire();
      pool.acquire();
      const active = pool.getActive();
      expect(active).toHaveLength(2);
      expect(active.every(p => p.active)).toBe(true);
    });
  });

  describe('update', () => {
    it('moves particles based on velocity', () => {
      const p = pool.spawn({ x: 0, y: 0, vx: 5, vy: 3, life: 100, maxLife: 100 })!;
      pool.update(1);
      expect(p.x).toBe(5);
      expect(p.y).toBe(3);
    });

    it('applies gravity to vy', () => {
      const p = pool.spawn({ x: 0, y: 0, vy: 0, gravity: 9.8, life: 100, maxLife: 100 })!;
      pool.update(1);
      expect(p.vy).toBeCloseTo(9.8);
    });

    it('decreases life over time', () => {
      const p = pool.spawn({ life: 60, maxLife: 60 })!;
      pool.update(1);
      // deltaTime=1, life decreases by 1/60 per frame
      expect(p.life).toBeLessThan(60);
      expect(p.life).toBeGreaterThan(59);
    });

    it('releases particles when life reaches 0', () => {
      pool.spawn({ life: 0.5, maxLife: 1 });
      pool.update(60); // big delta = life goes to ~-0.5
      expect(pool.getStats().active).toBe(0);
    });

    it('returns count of expired particles', () => {
      pool.spawn({ life: 0.5, maxLife: 1 });
      pool.spawn({ life: 0.5, maxLife: 1 });
      const expired = pool.update(60);
      expect(expired).toBe(2);
    });

    it('updates alpha based on remaining life', () => {
      const p = pool.spawn({ life: 1, maxLife: 1 })!;
      pool.update(30); // life should become ~0.5
      expect(p.alpha).toBeGreaterThan(0);
      expect(p.alpha).toBeLessThanOrEqual(1);
    });

    it('applies rotation speed', () => {
      const p = pool.spawn({ rotation: 0, rotationSpeed: 45, life: 100, maxLife: 100 })!;
      pool.update(1);
      expect(p.rotation).toBeCloseTo(45);
    });
  });

  describe('clear', () => {
    it('deactivates all particles', () => {
      pool.acquire();
      pool.acquire();
      pool.clear();
      expect(pool.getStats().active).toBe(0);
    });

    it('makes all particles available again', () => {
      pool.acquire();
      pool.clear();
      expect(pool.getStats().available).toBe(10);
    });
  });

  describe('getStats', () => {
    it('total + available = total capacity when all released', () => {
      const stats = pool.getStats();
      expect(stats.active + stats.available).toBe(stats.total);
    });

    it('tracks correctly after acquire and release', () => {
      const p1 = pool.acquire()!;
      pool.acquire();
      pool.release(p1);
      const stats = pool.getStats();
      expect(stats.active).toBe(1);
      expect(stats.available).toBe(9);
      expect(stats.total).toBe(10);
    });
  });

  describe('shared particlePool instance', () => {
    it('is exported and is a ParticlePool', () => {
      expect(particlePool).toBeInstanceOf(ParticlePool);
    });

    it('has capacity of 200', () => {
      expect(particlePool.getStats().total).toBe(200);
    });
  });
});
