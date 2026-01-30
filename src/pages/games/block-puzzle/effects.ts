/**
 * BlockPuzzle Visual Effects & Particle System
 *
 * Pure functions that create and return particle/effect data
 * for visual feedback. These don't mutate state directly -
 * they return data that the component uses to update state.
 */

import type { ClearParticle, TrailParticle, Shockwave } from './types';

// ============================================
// UNIQUE ID GENERATOR
// Prevents duplicate React keys by combining timestamp with counter
// ============================================
let particleIdCounter = 0;

function generateUniqueId(): number {
  // Combine timestamp with incrementing counter for guaranteed uniqueness
  // Counter wraps at 10000 to prevent overflow while still being unique enough
  particleIdCounter = (particleIdCounter + 1) % 10000;
  return Date.now() * 10000 + particleIdCounter;
}

// ============================================
// PARTICLE CREATION FUNCTIONS
// ============================================

/**
 * Creates particles for line clear burst effect.
 * Returns an array of particles that explode outward from cleared cells.
 *
 * @param cells - Array of cleared cell coordinates
 * @param color - Base color for particles (gradient colors are converted)
 * @param cellSize - Size of each grid cell in pixels
 * @returns Array of ClearParticle objects
 */
export function createLineClearBurstParticles(
  cells: { row: number; col: number }[],
  color: string,
  cellSize: number
): ClearParticle[] {
  const particles: ClearParticle[] = [];
  const baseColor = color.includes('gradient') ? '#ff6b00' : color;

  cells.forEach((cell, _cellIndex) => {
    const cellX = cell.col * cellSize + cellSize / 2;
    const cellY = cell.row * cellSize + cellSize / 2;

    // 6-10 particles per cell
    const particleCount = 6 + Math.floor(Math.random() * 5);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 6;

      particles.push({
        id: generateUniqueId(),
        x: cellX,
        y: cellY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Bias upward
        size: 4 + Math.random() * 6,
        color: i % 4 === 0 ? '#ffffff' : baseColor, // Some white sparkles
        alpha: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
        life: 30, // ~500ms at 60fps
      });
    }
  });

  return particles;
}

/**
 * Creates corner impact particles when a piece is placed.
 * Particles emit from the corners of the placed piece's bounding box.
 *
 * @param placedCells - Array of "row-col" cell keys that were placed
 * @param color - Base color for particles
 * @param cellSize - Size of each grid cell in pixels
 * @returns Array of ClearParticle objects
 */
export function createPlacementParticles(
  placedCells: string[],
  color: string,
  cellSize: number
): ClearParticle[] {
  const particles: ClearParticle[] = [];
  const baseColor = color.includes('gradient') ? '#ff6b00' : color;

  // Parse cell coordinates
  const cellCoords = placedCells.map(key => {
    const [r, c] = key.split('-').map(Number);
    return { row: r, col: c };
  });

  // Get bounding box corners
  const minRow = Math.min(...cellCoords.map(c => c.row));
  const maxRow = Math.max(...cellCoords.map(c => c.row));
  const minCol = Math.min(...cellCoords.map(c => c.col));
  const maxCol = Math.max(...cellCoords.map(c => c.col));

  // Create particles at corners with outward angles
  const corners = [
    { row: minRow, col: minCol, angle: Math.PI * 1.25 },  // Top-left
    { row: minRow, col: maxCol, angle: Math.PI * 1.75 },  // Top-right
    { row: maxRow, col: minCol, angle: Math.PI * 0.75 },  // Bottom-left
    { row: maxRow, col: maxCol, angle: Math.PI * 0.25 },  // Bottom-right
  ];

  corners.forEach((corner, _cornerIdx) => {
    const x = corner.col * cellSize + cellSize / 2;
    const y = corner.row * cellSize + cellSize / 2;

    // 3 particles per corner
    for (let i = 0; i < 3; i++) {
      const angle = corner.angle + (Math.random() - 0.5) * 0.8;
      const speed = 2 + Math.random() * 2;

      particles.push({
        id: generateUniqueId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: i === 0 ? '#ffffff' : baseColor,
        alpha: 0.8,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        life: 25, // ~400ms at 60fps
      });
    }
  });

  return particles;
}

/**
 * Creates a massive particle explosion for perfect clear celebration.
 * Particles burst outward from the center in all directions.
 *
 * @param gridSize - Total grid size in pixels (width = height)
 * @returns Array of ClearParticle objects
 */
export function createPerfectClearParticles(gridSize: number): ClearParticle[] {
  const particles: ClearParticle[] = [];
  const centerX = gridSize / 2;
  const centerY = gridSize / 2;
  const colors = ['#ffcc00', '#ff6b00', '#ffffff', '#00ff88'];

  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.3;
    const speed = 4 + Math.random() * 6;

    particles.push({
      id: generateUniqueId(),
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      life: 40, // ~660ms at 60fps
    });
  }

  return particles;
}

/**
 * Creates a trail particle for drag effects.
 * Only creates a particle if the movement distance exceeds the threshold.
 *
 * @param x - Current x position
 * @param y - Current y position
 * @param lastPos - Previous position { x, y }
 * @param color - Base color for particle
 * @param distanceThreshold - Minimum distance to create a particle (default 20)
 * @returns TrailParticle or null if distance threshold not met
 */
export function createTrailParticle(
  x: number,
  y: number,
  lastPos: { x: number; y: number },
  color: string,
  distanceThreshold = 20
): TrailParticle | null {
  const dx = x - lastPos.x;
  const dy = y - lastPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= distanceThreshold) {
    return null;
  }

  const baseColor = color.includes('gradient') ? '#ff6b00' : color;

  return {
    id: generateUniqueId(),
    x,
    y,
    size: 6 + Math.random() * 4,
    color: baseColor,
    alpha: 0.5,
  };
}

// ============================================
// SHOCKWAVE CREATION
// ============================================

/**
 * Creates a shockwave effect at the specified position.
 *
 * @param x - Center x position
 * @param y - Center y position
 * @param maxSize - Maximum size the shockwave will expand to
 * @returns Shockwave object
 */
export function createShockwave(
  x: number,
  y: number,
  maxSize = 300
): Shockwave {
  return {
    id: generateUniqueId(),
    x,
    y,
    size: 0,
    maxSize,
    alpha: 1,
  };
}

// ============================================
// PARTICLE ANIMATION HELPERS
// ============================================

/**
 * Updates clear particles for one animation frame.
 * Applies gravity, movement, fade, rotation, and shrinking.
 *
 * @param particles - Current array of particles
 * @returns Updated array of particles (filtered for alpha > 0)
 */
export function updateClearParticles(particles: ClearParticle[]): ClearParticle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.3, // gravity
      alpha: p.alpha - 0.035, // Faster fade
      rotation: p.rotation + p.rotationSpeed,
      size: p.size * 0.97, // Shrink faster
      life: p.life - 1,
    }))
    .filter(p => p.alpha > 0 && p.life > 0);
}

/**
 * Updates trail particles for one animation frame.
 * Applies fade and shrinking.
 *
 * @param particles - Current array of trail particles
 * @returns Updated array of particles (filtered for alpha > 0)
 */
export function updateTrailParticles(particles: TrailParticle[]): TrailParticle[] {
  return particles
    .map(p => ({
      ...p,
      alpha: p.alpha - 0.04,
      size: p.size * 0.92,
    }))
    .filter(p => p.alpha > 0);
}

/**
 * Updates shockwaves for one animation frame.
 * Expands size and fades alpha.
 *
 * @param shockwaves - Current array of shockwaves
 * @param expandSpeed - Pixels to expand per frame (default 15)
 * @returns Updated array of shockwaves (filtered for size < maxSize)
 */
export function updateShockwaves(
  shockwaves: Shockwave[],
  expandSpeed = 15
): Shockwave[] {
  return shockwaves
    .map(s => ({
      ...s,
      size: s.size + expandSpeed,
      alpha: 1 - (s.size / s.maxSize),
    }))
    .filter(s => s.size < s.maxSize);
}

// ============================================
// EFFECT CONFIGURATION HELPERS
// ============================================

/**
 * Gets the freeze frame duration based on lines cleared.
 *
 * @param linesCleared - Number of lines cleared
 * @returns Duration in milliseconds (0 for single line)
 */
export function getFreezeDuration(linesCleared: number): number {
  const durations: Record<number, number> = {
    1: 0,
    2: 50,
    3: 80,
    4: 120,
  };
  return durations[Math.min(linesCleared, 4)] || 0;
}

/**
 * Gets the shockwave max size based on lines cleared.
 *
 * @param linesCleared - Number of lines cleared
 * @returns Max size in pixels
 */
export function getShockwaveSize(linesCleared: number): number {
  return 250 + linesCleared * 50;
}

/**
 * Determines if a screen flash should be triggered.
 *
 * @param linesCleared - Number of lines cleared
 * @returns true if 3+ lines cleared
 */
export function shouldTriggerScreenFlash(linesCleared: number): boolean {
  return linesCleared >= 3;
}

/**
 * Determines if a shockwave should be triggered.
 *
 * @param linesCleared - Number of lines cleared
 * @returns true if 2+ lines cleared
 */
export function shouldTriggerShockwave(linesCleared: number): boolean {
  return linesCleared >= 2;
}

/**
 * Gets the screen flash color for line clears.
 *
 * @returns RGBA color string
 */
export function getLineClearFlashColor(): string {
  return 'rgba(255, 200, 0, 0.4)';
}

/**
 * Gets the screen flash color for perfect clear.
 *
 * @returns Color string
 */
export function getPerfectClearFlashColor(): string {
  return '#ffffff';
}
