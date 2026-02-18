// src/lib/combat/particles.ts
// Canvas particle system for battle animations — ported from ClawCombat battle-particles.js
// Pure logic: particle class, attack patterns, type configs, timing constants

import type { CombatType, MoveCategory, MoveEffect } from './types';

// ── Particle Shapes ─────────────────────────────────────────────────────────

export type ParticleShape =
  | 'circle' | 'star' | 'square' | 'line' | 'leaf'
  | 'snowflake' | 'bolt' | 'ring' | 'bubble' | 'text';

// ── Attack Patterns ─────────────────────────────────────────────────────────

export type AttackPattern =
  | 'beam' | 'projectile' | 'arc' | 'slash' | 'charge'
  | 'wave' | 'swarm' | 'drain' | 'self_aura' | 'status_drift' | 'burst';

// ── Animation Timing Constants ──────────────────────────────────────────────
// Ported from ClawCombat battle-ui.js ANIM_TIMING

export const ANIM_TIMING = {
  phaseDelay: 800,
  turnGap: 1500,
  useMoveTelegraph: 600,
  travelTime: {
    beam: 700,
    slash: 350,
    arc: 900,
    charge: 400,
    wave: 800,
    projectile: 700,
    swarm: 900,
    drain: 800,
    status_drift: 700,
    self_aura: 700,
    burst: 500,
    default: 700,
  } as Record<string, number>,
  critFreeze: 200,
  damageDisplay: 600,
  hitRecover: 500,
  postDamage: 400,
  statusInflict: 800,
  healEffect: 800,
  missEffect: 700,
  statChange: 600,
  knockoutPause: 800,
  victoryDelay: 1000,
} as const;

// ── Type Effect Configs ─────────────────────────────────────────────────────
// 18 type visual configs with particle colors, flash color, shapes, gravity

export interface TypeEffect {
  colors: string[];
  flashColor: string;
  shapes: ParticleShape[];
  gravity: number;
}

export const TYPE_EFFECTS: Record<CombatType, TypeEffect> = {
  NEUTRAL: {
    colors: ['#D4D4A0', '#C8C878', '#B8B868'],
    flashColor: '#D4D4A0',
    shapes: ['circle', 'star'],
    gravity: 0,
  },
  FIRE: {
    colors: ['#FF6030', '#FF9040', '#FFD060', '#FF4020'],
    flashColor: '#FF9040',
    shapes: ['circle', 'star'],
    gravity: -0.3,
  },
  WATER: {
    colors: ['#4080F0', '#60A0FF', '#88C0FF', '#A0D4FF'],
    flashColor: '#88B0FF',
    shapes: ['circle', 'bubble'],
    gravity: 0.2,
  },
  ELECTRIC: {
    colors: ['#FFE030', '#FFF060', '#FFFF90', '#E0C020'],
    flashColor: '#FFEE60',
    shapes: ['bolt', 'star'],
    gravity: 0,
  },
  GRASS: {
    colors: ['#40B030', '#60D040', '#80E060', '#A0F080'],
    flashColor: '#A0E870',
    shapes: ['leaf', 'circle'],
    gravity: 0.1,
  },
  ICE: {
    colors: ['#80E0F0', '#A0F0FF', '#C0FFFF', '#60C0E0'],
    flashColor: '#C0F0F0',
    shapes: ['snowflake', 'circle'],
    gravity: 0.15,
  },
  MARTIAL: {
    colors: ['#E04038', '#FF5040', '#FF7060', '#C03028'],
    flashColor: '#FF5040',
    shapes: ['star', 'circle'],
    gravity: 0,
  },
  VENOM: {
    colors: ['#C060C0', '#D080D0', '#E0A0E0', '#A040A0'],
    flashColor: '#C060C0',
    shapes: ['bubble', 'circle'],
    gravity: 0.1,
  },
  EARTH: {
    colors: ['#D0A040', '#E0C060', '#B08030', '#C09030'],
    flashColor: '#F0D888',
    shapes: ['square', 'circle'],
    gravity: 0.4,
  },
  AIR: {
    colors: ['#C8B0FF', '#D8C8FF', '#E8E0FF', '#A890F0'],
    flashColor: '#C8B0FF',
    shapes: ['ring', 'circle'],
    gravity: -0.2,
  },
  PSYCHE: {
    colors: ['#FF78A8', '#FF90B8', '#FFA8C8', '#E060A0'],
    flashColor: '#FF78A8',
    shapes: ['ring', 'star'],
    gravity: -0.1,
  },
  INSECT: {
    colors: ['#B8C830', '#D0E040', '#C8D020', '#A0B020'],
    flashColor: '#C8D830',
    shapes: ['circle', 'star'],
    gravity: 0,
  },
  STONE: {
    colors: ['#C8A840', '#B89838', '#A08830', '#D8B850'],
    flashColor: '#D8C058',
    shapes: ['square', 'circle'],
    gravity: 0.5,
  },
  GHOST: {
    colors: ['#8068A8', '#9078B8', '#A090C8', '#706098'],
    flashColor: '#9078B8',
    shapes: ['ring', 'circle'],
    gravity: -0.15,
  },
  DRAGON: {
    colors: ['#8050F0', '#9068FF', '#7040E0', '#A080FF'],
    flashColor: '#9058FF',
    shapes: ['star', 'circle'],
    gravity: 0,
  },
  SHADOW: {
    colors: ['#806858', '#907868', '#685040', '#A08878'],
    flashColor: '#907868',
    shapes: ['circle', 'star'],
    gravity: 0,
  },
  METAL: {
    colors: ['#C0C0E0', '#D0D0F0', '#B0B0D0', '#E0E0FF'],
    flashColor: '#D8D8F0',
    shapes: ['square', 'star'],
    gravity: 0.3,
  },
  MYSTIC: {
    colors: ['#FFB0CC', '#FFC0D8', '#FF90BC', '#FFD0E0'],
    flashColor: '#FFB9CC',
    shapes: ['ring', 'star'],
    gravity: -0.1,
  },
};

// ── Power Scaling ───────────────────────────────────────────────────────────

export interface PowerScaleResult {
  particleCount: number;
  particleSize: number;
  shakeAmplitude: number;
  shakeDuration: number;
  travelSpeed: number;
  flashOpacity: number;
}

export function powerScale(power: number): PowerScaleResult {
  const p = Math.max(0, power);
  return {
    particleCount: 25 + (p / 120) * 100,
    particleSize: 0.8 + (p / 120) * 1.0,
    shakeAmplitude: p >= 80 ? 2 + (p - 80) / 10 : 0,
    shakeDuration: p >= 80 ? 100 + (p - 80) * 3 : 0,
    travelSpeed: 6 + (p / 120) * 4,
    flashOpacity: p >= 100 ? 0.15 + (p - 100) / 200 : 0,
  };
}

// ── Particle Config ─────────────────────────────────────────────────────────

export interface ParticleConfig {
  color: string;
  size: number;
  life: number;
  speed: number;
  angle: number;
  shape: ParticleShape;
  gravity: number;
  text?: string;
  targetX?: number;
  targetY?: number;
  travelSpeed?: number;
}

// ── Particle Class ──────────────────────────────────────────────────────────

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape: ParticleShape;
  gravity: number;
  text: string;
  targetX: number | null;
  targetY: number | null;
  travelSpeed: number;
  /** Whether this particle is still approaching its target */
  private traveling: boolean;

  constructor(x: number, y: number, config: ParticleConfig) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(config.angle) * config.speed;
    this.vy = Math.sin(config.angle) * config.speed;
    this.color = config.color;
    this.size = config.size;
    this.life = config.life;
    this.maxLife = config.life;
    this.shape = config.shape;
    this.gravity = config.gravity;
    this.text = config.text ?? '';
    this.targetX = config.targetX ?? null;
    this.targetY = config.targetY ?? null;
    this.travelSpeed = config.travelSpeed ?? 0;
    this.traveling = this.targetX !== null && this.targetY !== null;
  }

  get alive(): boolean {
    return this.life > 0;
  }

  get alpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }

  update(dt: number): void {
    if (!this.alive) return;

    const step = dt / 16; // normalize to ~60fps frame

    if (this.traveling && this.targetX !== null && this.targetY !== null) {
      // Projectile travel — move toward target
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.travelSpeed * step * 2) {
        // Arrived at target — stop traveling, scatter
        this.x = this.targetX;
        this.y = this.targetY;
        this.traveling = false;
        // Give a small random scatter velocity on arrival
        const scatterAngle = Math.random() * Math.PI * 2;
        const scatterSpeed = 1 + Math.random() * 2;
        this.vx = Math.cos(scatterAngle) * scatterSpeed;
        this.vy = Math.sin(scatterAngle) * scatterSpeed;
      } else {
        // Move toward target
        const nx = dx / dist;
        const ny = dy / dist;
        this.x += nx * this.travelSpeed * step;
        this.y += ny * this.travelSpeed * step;
      }
    } else {
      // Standard physics — velocity + gravity + friction
      this.vy += this.gravity * step;
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.x += this.vx * step;
      this.y += this.vy * step;
    }

    this.life -= step;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    switch (this.shape) {
      case 'circle':
        this._drawCircle(ctx);
        break;
      case 'star':
        this._drawStar(ctx);
        break;
      case 'square':
        this._drawSquare(ctx);
        break;
      case 'line':
        this._drawLine(ctx);
        break;
      case 'leaf':
        this._drawLeaf(ctx);
        break;
      case 'snowflake':
        this._drawSnowflake(ctx);
        break;
      case 'bolt':
        this._drawBolt(ctx);
        break;
      case 'ring':
        this._drawRing(ctx);
        break;
      case 'bubble':
        this._drawBubble(ctx);
        break;
      case 'text':
        this._drawText(ctx);
        break;
    }

    ctx.restore();
  }

  // ── Shape Renderers ──────────────────────────────────────────────────

  private _drawCircle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawStar(ctx: CanvasRenderingContext2D): void {
    // 5-point star
    ctx.fillStyle = this.color;
    ctx.beginPath();
    const outerR = this.size;
    const innerR = this.size * 0.4;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const px = this.x + Math.cos(angle) * r;
      const py = this.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private _drawSquare(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    const half = this.size;
    ctx.fillRect(this.x - half, this.y - half, half * 2, half * 2);
  }

  private _drawLine(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.size * 0.4);
    const angle = Math.atan2(this.vy, this.vx);
    const len = this.size * 2;
    ctx.beginPath();
    ctx.moveTo(this.x - Math.cos(angle) * len, this.y - Math.sin(angle) * len);
    ctx.lineTo(this.x + Math.cos(angle) * len, this.y + Math.sin(angle) * len);
    ctx.stroke();
  }

  private _drawLeaf(ctx: CanvasRenderingContext2D): void {
    // Ellipse rotated by velocity angle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    const angle = Math.atan2(this.vy, this.vx);
    ctx.ellipse(this.x, this.y, this.size * 1.5, this.size * 0.6, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawSnowflake(ctx: CanvasRenderingContext2D): void {
    // 6 lines radiating from center
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.size * 0.3);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(angle) * this.size * 1.5,
        this.y + Math.sin(angle) * this.size * 1.5,
      );
      ctx.stroke();
    }
  }

  private _drawBolt(ctx: CanvasRenderingContext2D): void {
    // Zigzag line
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.size * 0.5);
    ctx.beginPath();
    const angle = Math.atan2(this.vy, this.vx);
    const perp = angle + Math.PI / 2;
    const segLen = this.size * 0.8;
    const zigAmp = this.size * 0.6;
    let px = this.x - Math.cos(angle) * this.size;
    let py = this.y - Math.sin(angle) * this.size;
    ctx.moveTo(px, py);
    for (let i = 0; i < 4; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      px += Math.cos(angle) * segLen + Math.cos(perp) * zigAmp * sign;
      py += Math.sin(angle) * segLen + Math.sin(perp) * zigAmp * sign;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  private _drawRing(ctx: CanvasRenderingContext2D): void {
    // Stroke circle (no fill)
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.size * 0.3);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.stroke();
  }

  private _drawBubble(ctx: CanvasRenderingContext2D): void {
    // Translucent circle with highlight
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha * 0.4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.globalAlpha = this.alpha * 0.8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      this.x - this.size * 0.3,
      this.y - this.size * 0.3,
      this.size * 0.25,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  private _drawText(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, this.y);
  }
}

// ── Spawn Attack Config ─────────────────────────────────────────────────────

export interface SpawnAttackConfig {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  type: CombatType;
  power: number;
  pattern: AttackPattern;
}

// ── Utility ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ── Attack Pattern Spawners ─────────────────────────────────────────────────

function spawnBeam(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount);
  const dx = cfg.targetX - cfg.startX;
  const dy = cfg.targetY - cfg.startY;
  const baseAngle = Math.atan2(dy, dx);

  for (let i = 0; i < count; i++) {
    const t = i / count; // 0..1 along path
    const spread = randRange(-8, 8);
    const perp = baseAngle + Math.PI / 2;
    particles.push(new Particle(
      cfg.startX + dx * t + Math.cos(perp) * spread,
      cfg.startY + dy * t + Math.sin(perp) * spread,
      {
        color: pick(fx.colors),
        size: randRange(2, 5) * scale.particleSize,
        life: randRange(20, 40),
        speed: randRange(0.5, 2),
        angle: baseAngle + randRange(-0.3, 0.3),
        shape: pick(fx.shapes),
        gravity: fx.gravity,
      },
    ));
  }
  return particles;
}

function spawnProjectile(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount * 0.6);
  const clusterCount = Math.max(3, Math.floor(count / 5));

  // Core cluster — travels to target
  for (let i = 0; i < clusterCount; i++) {
    particles.push(new Particle(
      cfg.startX + randRange(-6, 6),
      cfg.startY + randRange(-6, 6),
      {
        color: pick(fx.colors),
        size: randRange(3, 6) * scale.particleSize,
        life: randRange(40, 60),
        speed: 0,
        angle: 0,
        shape: pick(fx.shapes),
        gravity: 0, // gravity applied after arrival
        targetX: cfg.targetX + randRange(-10, 10),
        targetY: cfg.targetY + randRange(-10, 10),
        travelSpeed: scale.travelSpeed,
      },
    ));
  }

  // Trail particles
  for (let i = 0; i < count - clusterCount; i++) {
    const t = i / (count - clusterCount);
    const dx = cfg.targetX - cfg.startX;
    const dy = cfg.targetY - cfg.startY;
    particles.push(new Particle(
      cfg.startX + dx * t * 0.3,
      cfg.startY + dy * t * 0.3,
      {
        color: pick(fx.colors),
        size: randRange(1, 3) * scale.particleSize,
        life: randRange(15, 25),
        speed: randRange(0.3, 1),
        angle: Math.atan2(dy, dx) + randRange(-0.5, 0.5),
        shape: pick(fx.shapes),
        gravity: fx.gravity,
      },
    ));
  }
  return particles;
}

function spawnArc(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount * 0.8);
  const dx = cfg.targetX - cfg.startX;
  const dy = cfg.targetY - cfg.startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    // Parabolic arc: y offset = -height * 4*t*(1-t)
    const arcHeight = dist * 0.4;
    const px = cfg.startX + dx * t;
    const py = cfg.startY + dy * t - arcHeight * 4 * t * (1 - t);

    particles.push(new Particle(
      px + randRange(-4, 4),
      py + randRange(-4, 4),
      {
        color: pick(fx.colors),
        size: randRange(2, 5) * scale.particleSize,
        life: randRange(20, 35),
        speed: randRange(0.3, 1.5),
        angle: Math.atan2(dy, dx) + randRange(-0.4, 0.4),
        shape: pick(fx.shapes),
        gravity: fx.gravity + 0.2, // extra gravity for arc trail
      },
    ));
  }
  return particles;
}

function spawnSlash(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount);
  const lineCount = Math.floor(count * 0.5);
  const burstCount = count - lineCount;

  // Line particles at target — diagonal slash
  for (let i = 0; i < lineCount; i++) {
    const t = (i / lineCount) - 0.5; // -0.5..0.5
    const slashLen = 40 * scale.particleSize;
    particles.push(new Particle(
      cfg.targetX + t * slashLen,
      cfg.targetY - t * slashLen * 0.6,
      {
        color: pick(fx.colors),
        size: randRange(2, 4) * scale.particleSize,
        life: randRange(10, 20),
        speed: randRange(1, 3),
        angle: Math.PI * -0.25 + randRange(-0.3, 0.3),
        shape: 'line',
        gravity: fx.gravity,
      },
    ));
  }

  // Impact burst at target
  for (let i = 0; i < burstCount; i++) {
    const angle = (Math.PI * 2 * i) / burstCount + randRange(-0.2, 0.2);
    particles.push(new Particle(
      cfg.targetX + randRange(-6, 6),
      cfg.targetY + randRange(-6, 6),
      {
        color: pick(fx.colors),
        size: randRange(2, 5) * scale.particleSize,
        life: randRange(15, 30),
        speed: randRange(1, 4),
        angle,
        shape: pick(fx.shapes),
        gravity: fx.gravity,
      },
    ));
  }
  return particles;
}

function spawnCharge(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount);
  const trailCount = Math.floor(count * 0.6);
  const burstCount = count - trailCount;
  const dx = cfg.targetX - cfg.startX;
  const dy = cfg.targetY - cfg.startY;
  const baseAngle = Math.atan2(dy, dx);

  // Trail from start to target
  for (let i = 0; i < trailCount; i++) {
    const t = i / trailCount;
    particles.push(new Particle(
      cfg.startX + dx * t + randRange(-5, 5),
      cfg.startY + dy * t + randRange(-5, 5),
      {
        color: pick(fx.colors),
        size: randRange(2, 4) * scale.particleSize,
        life: randRange(15, 25),
        speed: randRange(0.5, 2),
        angle: baseAngle + Math.PI + randRange(-0.5, 0.5), // trail behind
        shape: pick(fx.shapes),
        gravity: fx.gravity,
      },
    ));
  }

  // Impact burst at target
  for (let i = 0; i < burstCount; i++) {
    const angle = (Math.PI * 2 * i) / burstCount + randRange(-0.2, 0.2);
    particles.push(new Particle(
      cfg.targetX + randRange(-8, 8),
      cfg.targetY + randRange(-8, 8),
      {
        color: pick(fx.colors),
        size: randRange(3, 6) * scale.particleSize,
        life: randRange(20, 35),
        speed: randRange(2, 5),
        angle,
        shape: pick(fx.shapes),
        gravity: fx.gravity,
      },
    ));
  }
  return particles;
}

function spawnWave(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount);
  const pulseCount = 3;
  const perPulse = Math.floor(count / pulseCount);
  const dx = cfg.targetX - cfg.startX;
  const dy = cfg.targetY - cfg.startY;
  const baseAngle = Math.atan2(dy, dx);

  for (let pulse = 0; pulse < pulseCount; pulse++) {
    const pulseOffset = pulse / pulseCount;
    for (let i = 0; i < perPulse; i++) {
      const spreadAngle = baseAngle + randRange(-0.6, 0.6);
      particles.push(new Particle(
        cfg.startX + dx * pulseOffset * 0.3 + randRange(-4, 4),
        cfg.startY + dy * pulseOffset * 0.3 + randRange(-4, 4),
        {
          color: pick(fx.colors),
          size: randRange(2, 5) * scale.particleSize,
          life: randRange(25, 40) - pulse * 5,
          speed: randRange(2, 5) + pulse * 0.5,
          angle: spreadAngle,
          shape: pick(fx.shapes),
          gravity: fx.gravity,
        },
      ));
    }
  }
  return particles;
}

function spawnSwarm(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount);
  const waves = 4;
  const perWave = Math.floor(count / waves);
  const dx = cfg.targetX - cfg.startX;
  const dy = cfg.targetY - cfg.startY;

  for (let w = 0; w < waves; w++) {
    for (let i = 0; i < perWave; i++) {
      const t = w / waves;
      particles.push(new Particle(
        cfg.startX + dx * t * 0.5 + randRange(-15, 15),
        cfg.startY + dy * t * 0.5 + randRange(-15, 15),
        {
          color: pick(fx.colors),
          size: randRange(1.5, 4) * scale.particleSize,
          life: randRange(30, 50),
          speed: 0,
          angle: 0,
          shape: pick(fx.shapes),
          gravity: fx.gravity * 0.5,
          targetX: cfg.targetX + randRange(-20, 20),
          targetY: cfg.targetY + randRange(-20, 20),
          travelSpeed: scale.travelSpeed * randRange(0.6, 1.2),
        },
      ));
    }
  }
  return particles;
}

function spawnDrain(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount * 0.7);
  const gatherCount = Math.floor(count * 0.5);
  const drainCount = count - gatherCount;

  // Gather particles at target
  for (let i = 0; i < gatherCount; i++) {
    const angle = (Math.PI * 2 * i) / gatherCount;
    const radius = randRange(20, 50);
    particles.push(new Particle(
      cfg.targetX + Math.cos(angle) * radius,
      cfg.targetY + Math.sin(angle) * radius,
      {
        color: pick(fx.colors),
        size: randRange(2, 4) * scale.particleSize,
        life: randRange(30, 45),
        speed: 0,
        angle: 0,
        shape: pick(fx.shapes),
        gravity: 0,
        targetX: cfg.targetX,
        targetY: cfg.targetY,
        travelSpeed: scale.travelSpeed * 0.5,
      },
    ));
  }

  // Drain back to start
  for (let i = 0; i < drainCount; i++) {
    particles.push(new Particle(
      cfg.targetX + randRange(-8, 8),
      cfg.targetY + randRange(-8, 8),
      {
        color: pick(fx.colors),
        size: randRange(2, 5) * scale.particleSize,
        life: randRange(35, 55),
        speed: 0,
        angle: 0,
        shape: pick(fx.shapes),
        gravity: 0,
        targetX: cfg.startX + randRange(-6, 6),
        targetY: cfg.startY + randRange(-6, 6),
        travelSpeed: scale.travelSpeed * 0.7,
      },
    ));
  }
  return particles;
}

function spawnSelfAura(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount * 0.6);

  // Buff particles around caster (startX/Y)
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + randRange(-0.2, 0.2);
    const radius = randRange(5, 30);
    particles.push(new Particle(
      cfg.startX + Math.cos(angle) * radius,
      cfg.startY + Math.sin(angle) * radius,
      {
        color: pick(fx.colors),
        size: randRange(2, 5) * scale.particleSize,
        life: randRange(30, 50),
        speed: randRange(0.3, 1.5),
        angle: angle - Math.PI / 2, // swirl upward
        shape: pick(fx.shapes),
        gravity: -0.2, // float up
      },
    ));
  }
  return particles;
}

function spawnStatusDrift(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount * 0.4);
  const dx = cfg.targetX - cfg.startX;
  const dy = cfg.targetY - cfg.startY;
  const baseAngle = Math.atan2(dy, dx);

  // Floating particles drifting toward opponent
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(
      cfg.startX + randRange(-10, 10),
      cfg.startY + randRange(-10, 10),
      {
        color: pick(fx.colors),
        size: randRange(2, 5) * scale.particleSize,
        life: randRange(40, 60),
        speed: randRange(1, 3),
        angle: baseAngle + randRange(-0.3, 0.3),
        shape: pick(fx.shapes),
        gravity: fx.gravity * 0.3,
      },
    ));
  }
  return particles;
}

function spawnBurst(cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult): Particle[] {
  const particles: Particle[] = [];
  const count = Math.floor(scale.particleCount);

  // Simple radial burst at target
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + randRange(-0.15, 0.15);
    particles.push(new Particle(
      cfg.targetX + randRange(-4, 4),
      cfg.targetY + randRange(-4, 4),
      {
        color: pick(fx.colors),
        size: randRange(2, 6) * scale.particleSize,
        life: randRange(20, 40),
        speed: randRange(1, 5),
        angle,
        shape: pick(fx.shapes),
        gravity: fx.gravity,
      },
    ));
  }
  return particles;
}

// ── Pattern Dispatch ────────────────────────────────────────────────────────

const PATTERN_SPAWNERS: Record<AttackPattern, (cfg: SpawnAttackConfig, fx: TypeEffect, scale: PowerScaleResult) => Particle[]> = {
  beam: spawnBeam,
  projectile: spawnProjectile,
  arc: spawnArc,
  slash: spawnSlash,
  charge: spawnCharge,
  wave: spawnWave,
  swarm: spawnSwarm,
  drain: spawnDrain,
  self_aura: spawnSelfAura,
  status_drift: spawnStatusDrift,
  burst: spawnBurst,
};

export function spawnAttack(config: SpawnAttackConfig): Particle[] {
  const fx = TYPE_EFFECTS[config.type] ?? TYPE_EFFECTS.NEUTRAL;
  const scale = powerScale(config.power);
  const spawner = PATTERN_SPAWNERS[config.pattern] ?? PATTERN_SPAWNERS.burst;
  return spawner(config, fx, scale);
}

// ── Pattern Resolution ──────────────────────────────────────────────────────
// Determines which attack pattern to use based on move name, category, power, and effects.

export function resolveAttackPattern(
  moveName: string,
  category: MoveCategory | string,
  power: number,
  effects?: MoveEffect[],
): AttackPattern {
  const nameLower = moveName.toLowerCase();

  // Status moves — check effects first
  if (category === 'status' && effects?.length) {
    const hasHeal = effects.some(e => e.type === 'heal');
    const hasStatBoost = effects.some(e => e.type === 'stat_boost' && e.target === 'self');
    if (hasHeal || hasStatBoost) return 'self_aura';
    // Other status (inflict status on opponent)
    return 'status_drift';
  }

  // Drain effects on damaging moves
  if (effects?.some(e => e.type === 'drain')) return 'drain';

  // Keyword matching on move name
  const keywords: [RegExp, AttackPattern][] = [
    [/charge|rush|tackle/, 'charge'],
    [/slash|strike|punch|claw/, 'slash'],
    [/beam|ray|cannon/, 'beam'],
    [/wave|pulse/, 'wave'],
    [/throw|meteor/, 'arc'],
    [/swarm|hive/, 'swarm'],
    [/shot|ball/, 'projectile'],
  ];

  for (const [pattern, result] of keywords) {
    if (pattern.test(nameLower)) return result;
  }

  // Default by category and power
  if (category === 'physical') {
    return power >= 70 ? 'charge' : 'slash';
  }
  if (category === 'special') {
    return power >= 70 ? 'beam' : 'projectile';
  }

  return 'burst';
}
