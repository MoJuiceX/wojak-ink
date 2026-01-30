/**
 * BlockPuzzle Game Types
 *
 * All TypeScript interfaces and types for the BlockPuzzle game.
 */

import type { DangerLevel } from './config';

// ============================================
// GAME STATE
// ============================================
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

// ============================================
// GRID TYPES
// ============================================
export interface GridCell {
  filled: boolean;
  color: string | null;
  blockId: string | null;
}

export type Grid = GridCell[][];

// ============================================
// PIECE TYPES
// ============================================
export interface DraggablePiece {
  id: string;
  shape: number[][];
  color: string;
}

// ============================================
// STREAK STATE
// ============================================
export interface StreakState {
  count: number;  // Consecutive clears (0 = no streak)
}

// ============================================
// PARTICLE TYPES
// ============================================

// Line clear burst particles
export interface ClearParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number; // Frames remaining — hard cutoff to guarantee cleanup
}

// Shockwave effect
export interface Shockwave {
  id: number;
  x: number;
  y: number;
  size: number;
  maxSize: number;
  alpha: number;
}

// Trail particle for drag effects
export interface TrailParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}

// ============================================
// MUSIC TYPES
// ============================================
export interface MusicTrack {
  src: string;
  name: string;
}

// ============================================
// UI STATE TYPES
// ============================================
export interface FloatingScore {
  id: string;
  value: string;
  x: number;
  y: number;
}

export interface ShakeConfig {
  intensity: number;
  duration: number;
  rotation: number;
}

// ============================================
// DANGER STATE HELPERS
// ============================================
export type { DangerLevel };
