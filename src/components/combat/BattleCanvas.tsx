/**
 * BattleCanvas — canvas overlay for battle particle effects.
 * Renders attack particles via an imperative ref API (playAttack / clear).
 * Uses the `battle-canvas` CSS class (absolute, pointer-events:none, z-index:10).
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Particle, spawnAttack, spawnIntroFog, spawnVictoryConfetti } from '@/lib/combat/particles';
import type { SpawnAttackConfig } from '@/lib/combat/particles';

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_PARTICLES = 500;

// ── Public Ref API ──────────────────────────────────────────────────────────

export interface BattleCanvasRef {
  /** Spawn attack particles for a given config */
  playAttack(config: SpawnAttackConfig): void;
  /** Remove all particles immediately */
  clear(): void;
  /** Spawn intro fog across the arena (demo start) */
  playIntroFog(): void;
  /** Spawn victory confetti at winner position; side 'a' = left, 'b' = right */
  playVictory(side: 'a' | 'b'): void;
}

// ── Component ───────────────────────────────────────────────────────────────

export const BattleCanvas = forwardRef<BattleCanvasRef>(function BattleCanvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // ── Imperative API ──────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    playAttack(config: SpawnAttackConfig) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      let w = rect.width;
      let h = rect.height;
      const useFallback = w <= 0 || h <= 0;
      if (useFallback) {
        w = 400;
        h = 300;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      const pixelConfig: SpawnAttackConfig = {
        ...config,
        startX: config.startX * w,
        startY: config.startY * h,
        targetX: config.targetX * w,
        targetY: config.targetY * h,
      };

      const newParticles = spawnAttack(pixelConfig);
      const current = particlesRef.current;

      // Evict oldest when exceeding MAX_PARTICLES
      const total = current.length + newParticles.length;
      if (total > MAX_PARTICLES) {
        const excess = total - MAX_PARTICLES;
        current.splice(0, excess);
      }

      current.push(...newParticles);
    },

    clear() {
      particlesRef.current = [];
    },

    playIntroFog() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : canvas.getBoundingClientRect().width;
      const h = parent ? parent.clientHeight : canvas.getBoundingClientRect().height;
      if (w <= 0 || h <= 0) return;
      const totalBatches = 15;
      const delayMs = 50;
      for (let i = 0; i < totalBatches; i++) {
        setTimeout(() => {
          const current = particlesRef.current;
          const newParticles = spawnIntroFog(w, h, i, totalBatches);
          const total = current.length + newParticles.length;
          if (total > MAX_PARTICLES) current.splice(0, total - MAX_PARTICLES);
          current.push(...newParticles);
        }, i * delayMs);
      }
    },

    playVictory(side: 'a' | 'b') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : canvas.getBoundingClientRect().width;
      const h = parent ? parent.clientHeight : canvas.getBoundingClientRect().height;
      if (w <= 0 || h <= 0) return;
      const centerX = side === 'a' ? w * 0.25 : w * 0.75;
      const centerY = h * 0.55;
      const newParticles = spawnVictoryConfetti(centerX, centerY);
      const current = particlesRef.current;
      const total = current.length + newParticles.length;
      if (total > MAX_PARTICLES) current.splice(0, total - MAX_PARTICLES);
      current.push(...newParticles);
    },
  }));

  // ── Resize Observer ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      // Match ClawCombat: no DPR, 1:1 CSS pixel = canvas pixel for predictable coords
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const observer = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }
    resizeCanvas();

    return () => observer.disconnect();
  }, []);

  // ── Animation Loop ──────────────────────────────────────────────────

  const tick = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    // Calculate delta time
    const dt = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = time;

    const drawW = canvas.width;
    const drawH = canvas.height;
    if (drawW <= 0 || drawH <= 0) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.clearRect(0, 0, drawW, drawH);

    // Update and draw particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update(dt);
      if (p.alive) {
        p.draw(ctx);
      } else {
        // Remove dead particles by swapping with last
        particles[i] = particles[particles.length - 1];
        particles.pop();
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [tick]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <canvas
      ref={canvasRef}
      className="battle-canvas"
      aria-hidden="true"
    />
  );
});
