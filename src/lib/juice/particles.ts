/**
 * Particle System Library
 * Reusable particle effects for game juice
 *
 * @example
 * import { createParticleSystem, spawnBurstParticles } from '@/lib/juice/particles';
 *
 * const particles = createParticleSystem({ maxParticles: 100 });
 * spawnBurstParticles(particles, x, y, 'explosion');
 */

// ============================================
// TYPES
// ============================================

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  gravity: number;
  friction: number;
  shrink: boolean;
}

export interface ParticleConfig {
  count: number;
  speed: { min: number; max: number };
  size: { min: number; max: number };
  life: { min: number; max: number };
  colors: string[];
  gravity?: number;
  friction?: number;
  shrink?: boolean;
  spread?: number; // 0-360 degrees
  direction?: number; // base angle in degrees
}

export interface ParticleSystem {
  particles: Particle[];
  maxParticles: number;
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export const PARTICLE_PRESETS: Record<string, ParticleConfig> = {
  // Flap wing burst
  wing: {
    count: 5,
    speed: { min: 1, max: 3 },
    size: { min: 3, max: 6 },
    life: { min: 200, max: 400 },
    colors: ['#FFB366', '#FF8C33', '#FFFFFF'],
    gravity: 0,
    friction: 0.98,
    shrink: true,
    spread: 60,
    direction: 180, // backward
  },

  // Death explosion
  explosion: {
    count: 30,
    speed: { min: 3, max: 7 },
    size: { min: 4, max: 10 },
    life: { min: 400, max: 800 },
    colors: ['#FF6B00', '#FF8C33', '#FFB366', '#FFFFFF'],
    gravity: 0.15,
    friction: 0.99,
    shrink: true,
    spread: 360,
    direction: 0,
  },

  // Pipe pass celebration
  pass: {
    count: 10,
    speed: { min: 2, max: 4 },
    size: { min: 4, max: 8 },
    life: { min: 300, max: 500 },
    colors: ['#FFD700', '#FFA500', '#FFFFFF'],
    gravity: -0.05, // float up
    friction: 0.97,
    shrink: true,
    spread: 90,
    direction: -90, // upward
  },

  // Fire trail
  fire: {
    count: 3,
    speed: { min: 0.5, max: 1.5 },
    size: { min: 6, max: 12 },
    life: { min: 150, max: 300 },
    colors: ['#FF4500', '#FF6B00', '#FFD700', '#FFFF00'],
    gravity: -0.1,
    friction: 0.95,
    shrink: true,
    spread: 30,
    direction: 180,
  },

  // Near-miss sparks
  nearMiss: {
    count: 8,
    speed: { min: 2, max: 5 },
    size: { min: 2, max: 5 },
    life: { min: 200, max: 400 },
    colors: ['#FFDD00', '#FFFFFF'],
    gravity: 0,
    friction: 0.96,
    shrink: true,
    spread: 360,
    direction: 0,
  },

  // Confetti (milestones)
  confetti: {
    count: 50,
    speed: { min: 3, max: 8 },
    size: { min: 6, max: 12 },
    life: { min: 1000, max: 2000 },
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
    gravity: 0.08,
    friction: 0.99,
    shrink: false,
    spread: 120,
    direction: -90,
  },

  // Touch ripple (subtle)
  ripple: {
    count: 1,
    speed: { min: 0, max: 0 },
    size: { min: 10, max: 10 },
    life: { min: 400, max: 400 },
    colors: ['var(--color-white-30)'],
    gravity: 0,
    friction: 1,
    shrink: false, // grows instead
    spread: 0,
    direction: 0,
  },
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Create a new particle system
 */
export const createParticleSystem = (options?: {
  maxParticles?: number;
}): ParticleSystem => ({
  particles: [],
  maxParticles: options?.maxParticles ?? 100,
});

/**
 * Generate a random value in range
 */
const randomInRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

/**
 * Generate unique ID
 */
const generateId = (): string =>
  `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Spawn burst of particles at position
 */
export const spawnBurstParticles = (
  system: ParticleSystem,
  x: number,
  y: number,
  preset: keyof typeof PARTICLE_PRESETS | ParticleConfig
): void => {
  const config = typeof preset === 'string' ? PARTICLE_PRESETS[preset] : preset;

  for (let i = 0; i < config.count; i++) {
    // Enforce max particles
    if (system.particles.length >= system.maxParticles) {
      system.particles.shift();
    }

    // Calculate angle with spread
    const baseAngle = ((config.direction ?? 0) * Math.PI) / 180;
    const spreadRad = ((config.spread ?? 360) * Math.PI) / 180;
    const angle = baseAngle + (Math.random() - 0.5) * spreadRad;

    const speed = randomInRange(config.speed.min, config.speed.max);
    const life = randomInRange(config.life.min, config.life.max);

    const particle: Particle = {
      id: generateId(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: randomInRange(config.size.min, config.size.max),
      alpha: 1,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      life,
      maxLife: life,
      gravity: config.gravity ?? 0,
      friction: config.friction ?? 1,
      shrink: config.shrink ?? true,
    };

    system.particles.push(particle);
  }
};

/**
 * Spawn continuous trail particles (call every frame)
 */
export const spawnTrailParticle = (
  system: ParticleSystem,
  x: number,
  y: number,
  preset: keyof typeof PARTICLE_PRESETS | ParticleConfig
): void => {
  const config = typeof preset === 'string' ? PARTICLE_PRESETS[preset] : preset;

  // Only spawn 1 particle per call for trails
  if (system.particles.length >= system.maxParticles) {
    system.particles.shift();
  }

  const baseAngle = ((config.direction ?? 0) * Math.PI) / 180;
  const spreadRad = ((config.spread ?? 360) * Math.PI) / 180;
  const angle = baseAngle + (Math.random() - 0.5) * spreadRad;

  const speed = randomInRange(config.speed.min, config.speed.max);
  const life = randomInRange(config.life.min, config.life.max);

  const particle: Particle = {
    id: generateId(),
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: randomInRange(config.size.min, config.size.max),
    alpha: 1,
    color: config.colors[Math.floor(Math.random() * config.colors.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
    life,
    maxLife: life,
    gravity: config.gravity ?? 0,
    friction: config.friction ?? 1,
    shrink: config.shrink ?? true,
  };

  system.particles.push(particle);
};

/**
 * Update all particles in system
 * Call this every frame with deltaTime in ms
 */
export const updateParticles = (
  system: ParticleSystem,
  deltaTime: number
): void => {
  for (let i = system.particles.length - 1; i >= 0; i--) {
    const p = system.particles[i];

    // Update physics
    p.vy += p.gravity * deltaTime;
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.x += p.vx * deltaTime * 0.06; // Normalize for ~60fps
    p.y += p.vy * deltaTime * 0.06;
    p.rotation += p.rotationSpeed * deltaTime * 0.06;

    // Update life
    p.life -= deltaTime;
    const lifeRatio = Math.max(0, p.life / p.maxLife);

    // Fade out
    p.alpha = lifeRatio;

    // Shrink (optional)
    if (p.shrink) {
      // Size is handled in render based on lifeRatio
    }

    // Remove dead particles
    if (p.life <= 0) {
      system.particles.splice(i, 1);
    }
  }
};

/**
 * Draw all particles
 */
export const drawParticles = (
  ctx: CanvasRenderingContext2D,
  system: ParticleSystem
): void => {
  system.particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    const size = p.shrink ? p.size * (p.life / p.maxLife) : p.size;

    ctx.fillStyle = p.color;
    ctx.fillRect(-size / 2, -size / 2, size, size);

    ctx.restore();
  });
};

/**
 * Draw particles as circles (softer look)
 */
export const drawParticlesCircle = (
  ctx: CanvasRenderingContext2D,
  system: ParticleSystem
): void => {
  system.particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.alpha;

    const size = p.shrink ? p.size * (p.life / p.maxLife) : p.size;

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
};

/**
 * Clear all particles
 */
export const clearParticles = (system: ParticleSystem): void => {
  system.particles.length = 0;
};

// ============================================
// SPECIAL EFFECTS
// ============================================

/**
 * Create expanding ring effect (for touch ripples)
 */
export interface RingEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  lineWidth: number;
}

export const createRingEffect = (
  x: number,
  y: number,
  options?: {
    maxRadius?: number;
    life?: number;
    color?: string;
    lineWidth?: number;
  }
): RingEffect => ({
  x,
  y,
  radius: 0,
  maxRadius: options?.maxRadius ?? 50,
  alpha: 1,
  life: options?.life ?? 400,
  maxLife: options?.life ?? 400,
  color: options?.color ?? 'rgba(255, 255, 255, 0.5)',
  lineWidth: options?.lineWidth ?? 2,
});

export const updateRingEffect = (ring: RingEffect, deltaTime: number): boolean => {
  ring.life -= deltaTime;
  const progress = 1 - ring.life / ring.maxLife;

  ring.radius = ring.maxRadius * progress;
  ring.alpha = 1 - progress;

  return ring.life > 0;
};

export const drawRingEffect = (
  ctx: CanvasRenderingContext2D,
  ring: RingEffect
): void => {
  ctx.save();
  ctx.globalAlpha = ring.alpha;
  ctx.strokeStyle = ring.color;
  ctx.lineWidth = ring.lineWidth;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};
