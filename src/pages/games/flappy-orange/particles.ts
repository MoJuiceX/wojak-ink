/**
 * FlappyOrange Particle System
 *
 * Pure functions for creating and updating particles.
 * Extracted from FlappyOrange.tsx for better modularity and testability.
 */

import type { Particle } from './types';
import { JUICE_CONFIG, GAME_PALETTE } from './config';

// ============================================
// PARTICLE COLORS (use shared GAME_PALETTE - red, orange, yellow, green, blue)
// ============================================

/** Death burst: full colorful palette (no redundant oranges) */
const DEATH_COLORS = GAME_PALETTE;

/** Pass celebration: yellows, greens, blues, white */
const PASS_COLORS = ['#FFEB3B', '#FDD835', '#66BB6A', '#42A5F5', '#00ACC1', '#FFFFFF'];

// ============================================
// PARTICLE CREATION FUNCTIONS
// ============================================

/**
 * Create death particles that burst outward when the bird dies.
 * Particles explode radially with gravity applied.
 *
 * @param x - X position of the bird at death
 * @param y - Y position of the bird at death
 * @param count - Number of particles to spawn (defaults to JUICE_CONFIG.DEATH_PARTICLE_COUNT)
 * @returns Array of new death particles
 */
export function createDeathParticles(
  x: number,
  y: number,
  count: number = JUICE_CONFIG.DEATH_PARTICLE_COUNT
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 3 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 5,
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      color: DEATH_COLORS[Math.floor(Math.random() * DEATH_COLORS.length)],
      gravity: 0.15,
    });
  }

  return particles;
}

/**
 * Create wing particles that trail behind when the bird flaps.
 * Particles move backward from the bird's position.
 *
 * @param x - X position of the bird
 * @param y - Y position of the bird
 * @param count - Number of particles to spawn (defaults to JUICE_CONFIG.WING_PARTICLE_COUNT)
 * @returns Array of new wing particles
 */
export function createWingParticles(
  x: number,
  y: number,
  count: number = JUICE_CONFIG.WING_PARTICLE_COUNT
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * 0.8; // Backward direction
    const speed = 2 + Math.random() * 3;
    particles.push({
      x: x - 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      alpha: 0.8,
      rotation: 0,
      rotationSpeed: 0,
      color: `rgba(255, 140, 0, ${0.6 + Math.random() * 0.4})`,
    });
  }

  return particles;
}

/**
 * Create pass particles that celebrate when passing through a pipe.
 * Particles spread around the gap area with a slight upward bias.
 *
 * @param x - X position where the bird passed
 * @param gapY - Y position of the pipe gap center
 * @param gapSize - Size of the gap (for vertical spread calculation)
 * @param count - Number of particles to spawn (defaults to JUICE_CONFIG.PASS_PARTICLE_COUNT)
 * @returns Array of new pass particles
 */
export function createPassParticles(
  x: number,
  gapY: number,
  gapSize: number = 50, // Default spread
  count: number = JUICE_CONFIG.PASS_PARTICLE_COUNT
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    particles.push({
      x,
      y: gapY + (Math.random() - 0.5) * gapSize,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1, // Slight upward bias
      size: 2 + Math.random() * 4,
      alpha: 1,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: PASS_COLORS[Math.floor(Math.random() * PASS_COLORS.length)],
    });
  }

  return particles;
}

// ============================================
// PARTICLE UPDATE FUNCTION
// ============================================

/**
 * Update particles by applying physics and filtering out dead particles.
 * This is a pure function that returns a new filtered array.
 *
 * @param particles - Array of particles to update
 * @param deltaTime - Time elapsed since last frame (typically 1 for 60fps)
 * @returns New array with updated particles (dead particles filtered out)
 */
export function updateParticles(particles: Particle[], deltaTime: number): Particle[] {
  return particles.filter(p => {
    // Apply velocity
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;

    // Apply gravity if present
    if (p.gravity) {
      p.vy += p.gravity * deltaTime;
    }

    // Apply rotation
    p.rotation += p.rotationSpeed * deltaTime;

    // Fade out
    p.alpha -= 0.02 * deltaTime;

    // Keep particle if still visible
    return p.alpha > 0;
  });
}

// ============================================
// PARTICLE HELPER FUNCTIONS
// ============================================

/**
 * Add new particles to an existing array, respecting max limit.
 * Returns the combined array, capped at the specified maximum.
 *
 * @param existing - Existing particle array
 * @param newParticles - New particles to add
 * @param maxCount - Maximum number of particles allowed
 * @returns Combined array, capped at maxCount
 */
export function addParticles(
  existing: Particle[],
  newParticles: Particle[],
  maxCount: number
): Particle[] {
  const combined = [...existing, ...newParticles];
  if (combined.length > maxCount) {
    return combined.slice(-maxCount);
  }
  return combined;
}
