/**
 * FlappyOrange Game Configuration
 *
 * All game constants, physics, and configuration extracted
 * from the main component for maintainability.
 */

// ============================================
// PHYSICS CONSTANTS - Tuned for fun, forgiving gameplay
// ============================================
export const PHYSICS = {
  GRAVITY: 0.2,            // Very floaty for easy control
  JUMP_VELOCITY: -6,       // Gentle, controllable jump
  MAX_FALL_SPEED: 5,       // Slow fall for easy recovery
  ROTATION_SPEED: 0.04,    // Subtle rotation
} as const;

// ============================================
// JUICE CONSTANTS - Premium feel effects
// ============================================
export const JUICE_CONFIG = {
  // Particle limits (for mobile performance)
  MAX_WING_PARTICLES: 15,      // Max wing particles at once
  MAX_PASS_PARTICLES: 20,      // Max pass particles at once
  MAX_DEATH_PARTICLES: 15,     // Max death particles at once

  // Death sequence
  FREEZE_DURATION: 150,        // ms of freeze frame
  SLOW_MO_SCALE: 0.3,          // Time scale during death tumble
  SLOW_MO_DURATION: 400,       // ms of slow-mo
  TUMBLE_ROTATION_SPEED: 12,   // radians per second during tumble
  DEATH_KNOCKBACK_X: 3,        // Horizontal knockback on death
  DEATH_KNOCKBACK_Y: -4,       // Upward bounce on death
  IMPACT_FLASH_ALPHA: 0.6,     // White flash intensity
  IMPACT_FLASH_DURATION: 100,  // ms
  DEATH_PARTICLE_COUNT: 12,    // Number of particles on death (reduced for mobile)
  SCREEN_SHAKE_INTENSITY: 6,   // Shake magnitude
  SCREEN_SHAKE_DURATION: 200,  // ms

  // Flap deformation
  FLAP_SCALE_X: 0.85,
  FLAP_SCALE_Y: 1.3,
  FLAP_DURATION: 80,
  FLAP_RETURN_DURATION: 150,

  // Wing particles
  WING_PARTICLE_COUNT: 3,

  // Pass effects
  PASS_SCALE_FREQUENCIES: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25], // C major scale
  PASS_PARTICLE_COUNT: 5,
  SCREEN_PULSE_INTENSITY: 0.05,

  // Near-miss
  NEAR_MISS_THRESHOLD: 0.25,   // 25% of gap = near miss
  NEAR_MISS_BONUS: [1, 2, 3],  // Bonus points by intensity

  // Fire mode
  FIRE_THRESHOLD: 5,           // Pipes to activate fire
  FIRE_MULTIPLIER: 1.5,
} as const;

// ============================================
// WEATHER CONSTANTS - Dynamic weather system
// ============================================
export const WEATHER_CONFIG = {
  // Weather durations - longer, more natural pacing
  MIN_WEATHER_DURATION: 12000,  // 12 seconds min per weather phase
  MAX_WEATHER_DURATION: 20000,  // 20 seconds max per weather phase
  CLEAR_BUFFER_DURATION: 8000,  // 8 seconds of clear weather between events
  TRANSITION_DURATION: 4000,    // 4 second smooth transitions

  // Particle limits
  MAX_SNOWFLAKES: 60,
  MAX_RAIN_DROPS: 80,
  MAX_LEAVES: 40,  // More leaves
  MAX_BACKGROUND_BIRDS: 7,

  // Weather sequence probabilities (after clear buffer)
  // Higher chance of interesting weather after calm period
  EVENT_CHANCES: {
    rain: 0.25,      // 25% chance of rain sequence
    storm: 0.15,     // 15% chance of storm sequence (rain→storm→rain→clear)
    snow: 0.30,      // 30% chance of snow sequence
    leaves: 0.20,    // 20% chance of leaf fall (during golden/sunset)
    clear: 0.10,     // 10% stay clear longer
  },

  // Fog overlay probability
  FOG_CHANCE: 0.15,
  FOG_DURATION: { min: 15000, max: 30000 },

  // Wind settings
  MAX_WIND_SPEED: 3,
  WIND_CHANGE_RATE: 0.01,
  STORM_WIND_SPEED: 6,  // Stronger wind during storms

  // Snow settings
  SNOW_FALL_SPEED: { min: 0.8, max: 2 },
  SNOW_DRIFT_AMPLITUDE: 30,
  SNOW_SIZE: { min: 2, max: 5 },

  // Fog settings
  FOG_LAYERS: 3,
  FOG_MAX_OPACITY: 0.4,

  // Bird flock settings
  BIRD_SPAWN_INTERVAL: 20000,
  FLOCK_SIZE: { min: 3, max: 7 },
  BIRD_SPEED: { min: 1.5, max: 3 },

  // Leaf settings - more frequent during golden/sunset
  LEAF_COLORS: ['#FF6B00', '#FF8C33', '#FFD700', '#FF4500', '#8B4513'],
  LEAF_SPAWN_RATE: 0.04,  // Doubled leaf spawn rate
} as const;

// ============================================
// DIFFICULTY CONSTANTS - Casual progression
// ============================================
export const DIFFICULTY_CONFIG = {
  // Score thresholds for difficulty tiers (faster progression)
  TIER_THRESHOLDS: [5, 12, 20, 35, 50],

  // Gap sizes per tier (starts easy, gets tighter faster)
  GAP_SIZES: [220, 210, 200, 190, 185, 180],

  // Speed multipliers per tier (faster ramping)
  SPEED_MULTIPLIERS: [1.0, 1.12, 1.24, 1.36, 1.48, 1.6],

  // Moving pipe chances per tier (start earlier at tier 1)
  MOVING_PIPE_CHANCES: [0, 0.15, 0.30, 0.45, 0.55, 0.65],

  // Moving pipe settings
  MOVE_SPEED: { min: 0.4, max: 1.0 },
  MOVE_RANGE: { min: 35, max: 70 },
} as const;

// Weather types (fog is a separate overlay that combines with others)
export type WeatherType = 'clear' | 'rain' | 'storm' | 'snow';

// Weather sequences - natural progressions that build up and wind down
export const WEATHER_SEQUENCES: Record<string, WeatherType[]> = {
  rain: ['clear', 'rain', 'rain', 'clear'],           // clear → rain builds → rain continues → fades to clear
  storm: ['clear', 'rain', 'storm', 'rain', 'clear'], // clear → rain → storm peak → rain → clear
  snow: ['clear', 'snow', 'snow', 'clear'],           // clear → snow builds → snow continues → fades to clear
  clear: ['clear', 'clear'],                          // Extended clear period
};

// ============================================
// ENVIRONMENT COLORS - Orange Grove day cycle
// Story: An orange escapes from the grove, flying through the day cycle
// ============================================
export const ENVIRONMENT_COLORS = {
  dawn: {
    // Early morning - pink/purple sunrise
    skyTop: '#FF9AA2',
    skyBottom: '#FFB7B2',
    treeFoliage: '#2D4A27',
    treeFoliageFar: '#4A6A43',
    treeTrunk: '#5D4037',
    clouds: '#FFDCDC',  // Hex for interpolation (opacity handled separately)
    ground: '#7B5914',
    grass: '#5A8A32',
    orangeFruit: '#E07800',
  },
  day: {
    // Bright midday sun
    skyTop: '#87CEEB',
    skyBottom: '#B0E0FF',
    treeFoliage: '#2D5A27',
    treeFoliageFar: '#4A7C43',
    treeTrunk: '#5D4037',
    clouds: '#FFFFFF',
    ground: '#8B6914',
    grass: '#7CB342',
    orangeFruit: '#FF8C00',
  },
  golden: {
    // Golden hour afternoon
    skyTop: '#FDB347',
    skyBottom: '#FFE4B5',
    treeFoliage: '#3D6A2D',
    treeFoliageFar: '#5A8A4A',
    treeTrunk: '#5A3A28',
    clouds: '#FFE6B4',
    ground: '#8B6B14',
    grass: '#8B9A23',
    orangeFruit: '#FF9500',
  },
  sunset: {
    // Orange/red sunset
    skyTop: '#FF6B35',
    skyBottom: '#FFB347',
    treeFoliage: '#3D5A3D',
    treeFoliageFar: '#5A7A5A',
    treeTrunk: '#4A3728',
    clouds: '#FFB482',
    ground: '#6B5014',
    grass: '#6B8E23',
    orangeFruit: '#CC6600',
  },
  dusk: {
    // Twilight purple
    skyTop: '#4A3A6A',
    skyBottom: '#7A5A8A',
    treeFoliage: '#2A3A2A',
    treeFoliageFar: '#3A4A3A',
    treeTrunk: '#3A2A20',
    clouds: '#9682AA',
    ground: '#3A3A4A',
    grass: '#3A5A3A',
    orangeFruit: '#AA5500',
  },
  night: {
    // Starry night
    skyTop: '#0D1B2A',
    skyBottom: '#1B263B',
    treeFoliage: '#1A2E1A',
    treeFoliageFar: '#2A3E2A',
    treeTrunk: '#2A1F1A',
    clouds: '#646478',
    ground: '#1a1a2e',
    grass: '#1A3A1A',
    orangeFruit: '#994400',
  },
} as const;

export type TimeOfDay = keyof typeof ENVIRONMENT_COLORS;

// ============================================
// TIMING CONSTANTS - Day/Night cycle
// ============================================
export const CYCLE_DURATION_MS = 120000;  // 120 seconds (2 min) for full day/night cycle
export const DAY_DURATION_MS = 60000;     // 60 seconds for sun arc
export const NIGHT_DURATION_MS = 60000;   // 60 seconds for moon arc

// ============================================
// GAME DIMENSIONS
// ============================================
export const BIRD_RADIUS = 14;    // Forgiving hitbox (was 16)
export const PIPE_WIDTH = 52;     // Slightly narrower pipes (was 55)
export const PIPE_GAP = 220;      // Very wide gap to fly through (was 200)
export const PIPE_SPACING = 320;  // Lots of time between pipes (was 280)

// ============================================
// PERFORMANCE FLAGS
// ============================================
export const PERFORMANCE_MODE = false;          // Full visuals
export const ULTRA_PERFORMANCE_MODE = false;    // Absolute minimal for debugging lag
export const LIGHT_EFFECTS_MODE = true;         // Sound + flap deformation only, no particles
export const BARE_BONES_MODE = false;           // Literally just rectangles
export const USE_MESSAGE_CHANNEL_LOOP = true;   // iOS Safari/WebKit (bypasses RAF throttling)
export const DEBUG_OVERLAY = false;             // Performance metrics overlay
export const DEBUG_WEATHER = false;             // Weather testing panel

// ============================================
// GAME ASSETS
// ============================================
export const SAD_IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/assets/Games/games_media/sad_runner_${i + 1}.webp`
);

// ============================================
// GAME METADATA
// ============================================
export const FLAPPY_ORANGE_CONFIG = {
  id: 'flappy-orange',
  name: 'Flappy Orange',
  description: 'An orange escapes from the grove, flying through a dynamic day/night cycle with weather effects.',
  leaderboardId: 'flappy-orange',
  colors: {
    primary: '#FF6B00',
    secondary: '#FF8C33',
    accent: '#FFD700',
  },
} as const;
