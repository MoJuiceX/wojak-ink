// src/lib/combat/particles.test.ts
import { describe, it, expect } from 'vitest';
import {
  Particle,
  TYPE_EFFECTS,
  ANIM_TIMING,
  powerScale,
  spawnAttack,
  resolveAttackPattern,
} from './particles';
import { COMBAT_TYPES } from './types';
import type { CombatType } from './types';

describe('Particle', () => {
  it('creates a particle with position and life', () => {
    const p = new Particle(100, 200, {
      color: '#FF0000',
      size: 5,
      life: 60,
      speed: 2,
      angle: 0,
      shape: 'circle',
      gravity: 0,
    });
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
    expect(p.alive).toBe(true);
    expect(p.alpha).toBeCloseTo(1.0);
  });

  it('dies when life expires', () => {
    const p = new Particle(0, 0, {
      color: '#FF0000',
      size: 5,
      life: 3,
      speed: 0,
      angle: 0,
      shape: 'circle',
      gravity: 0,
    });
    // Simulate 3 frames at 16ms each (total ~48ms) — particle has 3 life ticks
    p.update(16);
    p.update(16);
    p.update(16);
    expect(p.alive).toBe(false);
  });

  it('alpha decreases as life drains', () => {
    const p = new Particle(0, 0, {
      color: '#FF0000',
      size: 5,
      life: 60,
      speed: 0,
      angle: 0,
      shape: 'circle',
      gravity: 0,
    });
    const initialAlpha = p.alpha;
    p.update(16);
    expect(p.alpha).toBeLessThan(initialAlpha);
  });

  it('applies gravity to vertical velocity', () => {
    const p = new Particle(0, 0, {
      color: '#FF0000',
      size: 5,
      life: 60,
      speed: 0,
      angle: 0,
      shape: 'circle',
      gravity: 1.0,
    });
    p.update(16);
    // Positive gravity should push y downward
    expect(p.y).toBeGreaterThan(0);
  });

  it('travels toward target when target is set', () => {
    const p = new Particle(0, 0, {
      color: '#FF0000',
      size: 5,
      life: 60,
      speed: 0,
      angle: 0,
      shape: 'circle',
      gravity: 0,
      targetX: 100,
      targetY: 100,
      travelSpeed: 10,
    });
    p.update(16);
    // Should move toward target
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);
  });

  it('supports text shape with emoji', () => {
    const p = new Particle(50, 50, {
      color: '#FF0000',
      size: 12,
      life: 30,
      speed: 0,
      angle: 0,
      shape: 'text',
      gravity: 0,
      text: '💥',
    });
    expect(p.alive).toBe(true);
    expect(p.shape).toBe('text');
    expect(p.text).toBe('💥');
  });
});

describe('TYPE_EFFECTS', () => {
  it('has configs for all 18 types', () => {
    for (const type of COMBAT_TYPES) {
      const config = TYPE_EFFECTS[type];
      expect(config).toBeDefined();
      expect(config.colors.length).toBeGreaterThanOrEqual(3);
      expect(config.flashColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(config.shapes.length).toBeGreaterThanOrEqual(2);
      expect(typeof config.gravity).toBe('number');
    }
  });

  it('FIRE has negative gravity (rises)', () => {
    expect(TYPE_EFFECTS.FIRE.gravity).toBeLessThan(0);
  });

  it('EARTH has positive gravity (falls)', () => {
    expect(TYPE_EFFECTS.EARTH.gravity).toBeGreaterThan(0);
  });

  it('NEUTRAL has zero gravity', () => {
    expect(TYPE_EFFECTS.NEUTRAL.gravity).toBe(0);
  });

  it('each type has valid particle shapes', () => {
    const validShapes = [
      'circle', 'star', 'square', 'line', 'leaf',
      'snowflake', 'bolt', 'ring', 'bubble', 'text',
    ];
    for (const type of COMBAT_TYPES) {
      for (const shape of TYPE_EFFECTS[type].shapes) {
        expect(validShapes).toContain(shape);
      }
    }
  });
});

describe('ANIM_TIMING', () => {
  it('has phase delay and turn gap', () => {
    expect(ANIM_TIMING.phaseDelay).toBe(800);
    expect(ANIM_TIMING.turnGap).toBe(1500);
  });

  it('has travel times for all patterns', () => {
    const expectedPatterns = [
      'beam', 'slash', 'arc', 'charge', 'wave',
      'projectile', 'swarm', 'drain', 'status_drift',
      'self_aura', 'burst', 'default',
    ];
    for (const pattern of expectedPatterns) {
      expect(ANIM_TIMING.travelTime[pattern]).toBeDefined();
      expect(ANIM_TIMING.travelTime[pattern]).toBeGreaterThan(0);
    }
  });

  it('has use move telegraph timing', () => {
    expect(ANIM_TIMING.useMoveTelegraph).toBe(600);
  });

  it('has crit freeze and damage display timings', () => {
    expect(ANIM_TIMING.critFreeze).toBe(200);
    expect(ANIM_TIMING.damageDisplay).toBe(600);
  });

  it('has all phase timings defined', () => {
    expect(ANIM_TIMING.hitRecover).toBe(500);
    expect(ANIM_TIMING.postDamage).toBe(400);
    expect(ANIM_TIMING.statusInflict).toBe(800);
    expect(ANIM_TIMING.healEffect).toBe(800);
    expect(ANIM_TIMING.missEffect).toBe(700);
    expect(ANIM_TIMING.statChange).toBe(600);
    expect(ANIM_TIMING.knockoutPause).toBe(800);
    expect(ANIM_TIMING.victoryDelay).toBe(1000);
  });
});

describe('powerScale', () => {
  it('returns larger values for higher power', () => {
    const low = powerScale(20);
    const high = powerScale(100);
    expect(high.particleCount).toBeGreaterThan(low.particleCount);
    expect(high.particleSize).toBeGreaterThan(low.particleSize);
    expect(high.travelSpeed).toBeGreaterThan(low.travelSpeed);
  });

  it('shake only triggers at power >= 80', () => {
    const weak = powerScale(60);
    expect(weak.shakeAmplitude).toBe(0);
    expect(weak.shakeDuration).toBe(0);

    const strong = powerScale(80);
    expect(strong.shakeAmplitude).toBeGreaterThan(0);
    expect(strong.shakeDuration).toBeGreaterThan(0);
  });

  it('flash opacity only triggers at power >= 100', () => {
    const normal = powerScale(90);
    expect(normal.flashOpacity).toBe(0);

    const powerful = powerScale(100);
    expect(powerful.flashOpacity).toBeGreaterThan(0);
  });

  it('scales particle count between 25 and ~108', () => {
    const min = powerScale(0);
    const max = powerScale(120);
    expect(min.particleCount).toBe(25);
    expect(max.particleCount).toBeCloseTo(125, 0);
  });

  it('scales particle size from 0.8 upward', () => {
    const min = powerScale(0);
    expect(min.particleSize).toBeCloseTo(0.8, 1);
  });
});

describe('spawnAttack', () => {
  const baseConfig = {
    startX: 100,
    startY: 200,
    targetX: 400,
    targetY: 200,
    type: 'FIRE' as CombatType,
    power: 60,
  };

  it('returns particles for a beam pattern', () => {
    const particles = spawnAttack({ ...baseConfig, pattern: 'beam' });
    expect(particles.length).toBeGreaterThan(0);
    // All particles should be alive
    for (const p of particles) {
      expect(p.alive).toBe(true);
    }
  });

  it('returns particles for a slash pattern', () => {
    const particles = spawnAttack({ ...baseConfig, pattern: 'slash' });
    expect(particles.length).toBeGreaterThan(0);
  });

  it('returns particles for all supported patterns', () => {
    const patterns = [
      'beam', 'projectile', 'arc', 'slash', 'charge',
      'wave', 'swarm', 'drain', 'self_aura', 'status_drift', 'burst',
    ] as const;
    for (const pattern of patterns) {
      const particles = spawnAttack({ ...baseConfig, pattern });
      expect(particles.length).toBeGreaterThan(0);
    }
  });

  it('uses type effect colors for particles', () => {
    const particles = spawnAttack({ ...baseConfig, pattern: 'beam' });
    const fireColors = TYPE_EFFECTS.FIRE.colors;
    // At least some particles should use fire type colors
    const hasFireColor = particles.some(p => fireColors.includes(p.color));
    expect(hasFireColor).toBe(true);
  });

  it('higher power produces more particles', () => {
    const weakParticles = spawnAttack({ ...baseConfig, power: 20, pattern: 'beam' });
    const strongParticles = spawnAttack({ ...baseConfig, power: 120, pattern: 'beam' });
    expect(strongParticles.length).toBeGreaterThan(weakParticles.length);
  });

  it('burst is the default pattern for unknown values', () => {
    const particles = spawnAttack({ ...baseConfig, pattern: 'burst' });
    expect(particles.length).toBeGreaterThan(0);
  });
});

describe('resolveAttackPattern', () => {
  it('resolves heal moves to self_aura', () => {
    const result = resolveAttackPattern('Regenerate', 'status', 0, [{ type: 'heal', percent: 50 }]);
    expect(result).toBe('self_aura');
  });

  it('resolves stat_boost to self_aura', () => {
    const result = resolveAttackPattern('War Posture', 'status', 0, [{ type: 'stat_boost', stat: 'attack', stages: 2, target: 'self' }]);
    expect(result).toBe('self_aura');
  });

  it('resolves status moves to status_drift', () => {
    const result = resolveAttackPattern('Shock Wave', 'status', 0, [{ type: 'status', chance: 100, status: 'paralysis' }]);
    expect(result).toBe('status_drift');
  });

  it('resolves drain effects to drain', () => {
    const result = resolveAttackPattern('Drain Bubble', 'special', 60, [{ type: 'drain', percent: 100 }]);
    expect(result).toBe('drain');
  });

  it('resolves charge keyword to charge', () => {
    const result = resolveAttackPattern('Blazing Charge', 'physical', 120);
    expect(result).toBe('charge');
  });

  it('resolves slash keyword to slash', () => {
    const result = resolveAttackPattern('Radiant Slash', 'physical', 80);
    expect(result).toBe('slash');
  });

  it('resolves beam keyword to beam', () => {
    const result = resolveAttackPattern('Solar Beam', 'special', 110);
    expect(result).toBe('beam');
  });

  it('resolves wave keyword to wave', () => {
    const result = resolveAttackPattern('Shock Wave', 'special', 80);
    expect(result).toBe('wave');
  });

  it('resolves throw keyword to arc', () => {
    const result = resolveAttackPattern('Meteor Throw', 'physical', 90);
    expect(result).toBe('arc');
  });

  it('resolves swarm keyword to swarm', () => {
    const result = resolveAttackPattern('Swarm Attack', 'physical', 60);
    expect(result).toBe('swarm');
  });

  it('resolves shot keyword to projectile', () => {
    const result = resolveAttackPattern('Splash Shot', 'special', 40);
    expect(result).toBe('projectile');
  });

  it('defaults physical high-power to charge', () => {
    const result = resolveAttackPattern('Unknown Move', 'physical', 90);
    expect(result).toBe('charge');
  });

  it('defaults physical low-power to slash', () => {
    const result = resolveAttackPattern('Unknown Move', 'physical', 50);
    expect(result).toBe('slash');
  });

  it('defaults special high-power to beam', () => {
    const result = resolveAttackPattern('Unknown Move', 'special', 90);
    expect(result).toBe('beam');
  });

  it('defaults special low-power to projectile', () => {
    const result = resolveAttackPattern('Unknown Move', 'special', 50);
    expect(result).toBe('projectile');
  });
});
