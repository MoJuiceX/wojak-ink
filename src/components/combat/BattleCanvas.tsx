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
import { Particle, spawnAttack } from '@/lib/combat/particles';
import type { SpawnAttackConfig } from '@/lib/combat/particles';

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_PARTICLES = 500;

// ── Public Ref API ──────────────────────────────────────────────────────────

export interface BattleCanvasRef {
  /** Spawn attack particles for a given config */
  playAttack(config: SpawnAttackConfig): void;
  /** Remove all particles immediately */
  clear(): void;
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
      const newParticles = spawnAttack(config);
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
  }));

  // ── Resize Observer ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
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

    // Clear canvas (use CSS dimensions, not buffer dimensions)
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

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
