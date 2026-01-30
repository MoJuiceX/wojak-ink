/**
 * Games Configuration
 *
 * Mini-games data for the Media Hub.
 */

import type { MiniGame } from '@/types/media';

export const MINI_GAMES: MiniGame[] = [
  // ============================================
  // ACTIVE GAMES (not disabled) - shown first
  // ============================================
  {
    id: 'orange-stack',
    name: 'Brick by Brick',
    emoji: '🧱',
    description: 'Stack bricks as high as you can without toppling!',
    shortDescription: 'Tap to stack bricks! Complete 10 levels to win!',
    status: 'available',
    route: '/media/games/stack',
    accentColor: '#f59e0b',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '3-10 min',
    accessibilityFeatures: {
      keyboardPlayable: true,
      screenReaderSupport: true,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Tap to drop the swinging block onto the stack' },
      { step: 2, text: 'Perfect alignment = +50 bonus points' },
      { step: 3, text: 'Drop faster for speed bonus (up to +30)' },
      { step: 4, text: 'Each wall bounce = -1 point penalty' },
      { step: 5, text: 'Build combos for score multipliers!' },
    ],
    controls: [],
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    emoji: '🧠',
    description: 'Match pairs of Wojak traits in this memory game!',
    shortDescription: 'Match Wojak NFTs! Survive as many rounds as you can!',
    status: 'available',
    route: '/media/games/memory',
    accentColor: '#8b5cf6',
    hasHighScores: true,
    difficulty: 'easy',
    estimatedPlayTime: '2-5 min',
    accessibilityFeatures: {
      keyboardPlayable: true,
      screenReaderSupport: true,
      colorBlindMode: true,
      reducedMotionSupport: true,
      audioDescriptions: true,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Flip the cards' },
    ],
    controls: [],
  },
  {
    id: 'flappy-orange',
    name: 'Flappy Orange',
    emoji: '🍊',
    description: 'Tap to fly through pipes! How far can you go?',
    shortDescription: 'Tap to fly! Pass pipes for points!',
    status: 'available',
    route: '/media/games/flappy-orange',
    accentColor: '#14b8a6',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '1-5 min',
    accessibilityFeatures: {
      keyboardPlayable: true,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Tap or press Space to make the orange jump' },
      { step: 2, text: 'Navigate through the gaps in the pipes' },
      { step: 3, text: 'Each pipe passed = 1 point' },
      { step: 4, text: 'Don\'t hit pipes, ground, or ceiling!' },
      { step: 5, text: 'Environment changes at 10, 25, and 50 pipes' },
    ],
    controls: [
      { input: 'Tap / Click / Space', action: 'Jump' },
    ],
  },
  {
    id: 'wojak-runner',
    name: 'Wojak Runner',
    emoji: '🏃',
    description: 'Help Wojak run and jump through obstacles!',
    shortDescription: 'Swipe left/right to dodge! Collect 🍊 oranges for points.',
    status: 'available',
    route: '/media/games/runner',
    accentColor: '#22c55e',
    hasHighScores: true,
    difficulty: 'hard',
    estimatedPlayTime: 'Endless',
    accessibilityFeatures: {
      keyboardPlayable: true,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Swipe to change lanes' },
      { step: 2, text: 'Collect 🍊 for points' },
      { step: 3, text: 'Avoid 🐫 and 🐻' },
      { step: 4, text: 'Chain combos for bonus!' },
    ],
    controls: [
      { input: '👆 Swipe', action: 'Change lane' },
      { input: '⌨️ Arrows', action: 'Change lane' },
    ],
  },
  {
    id: 'color-reaction',
    name: 'Color Reaction',
    emoji: '🎨',
    description: 'Tap when fruit AND color match! Test your reaction time.',
    shortDescription: 'Tap when both match! 3 lives. Build streaks for bonus.',
    status: 'available',
    route: '/media/games/color-reaction',
    accentColor: '#06b6d4',
    hasHighScores: true,
    difficulty: 'easy',
    estimatedPlayTime: '1-5 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: false,
      reducedMotionSupport: true,
      audioDescriptions: true,
      pauseAnytime: false,
    },
    instructions: [
      { step: 1, text: 'Watch the TARGET fruit and color' },
      { step: 2, text: 'Tap when BOTH match YOUR fruit and color!' },
      { step: 3, text: 'Faster reaction = more points' },
      { step: 4, text: '3 lives — wrong tap or miss costs 1' },
      { step: 5, text: 'Build streaks for bonus points!' },
    ],
    controls: [
      { input: 'Tap / Click', action: 'React when both match' },
    ],
  },
  {
    id: 'merge-2048',
    name: 'Wojak Merge',
    emoji: '👨‍🌾',
    description: 'Merge Wojak NFTs from Phunky to the legendary Namekian!',
    shortDescription: 'Merge NFTs from Phunky to Namekian!',
    status: 'available',
    route: '/media/games/merge-2048',
    accentColor: '#10b981',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '5-15 min',
    accessibilityFeatures: {
      keyboardPlayable: true,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: true,
      audioDescriptions: false,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Swipe or use arrow keys to slide all NFT tiles' },
      { step: 2, text: 'Matching badge tiles merge into the next rarer badge' },
      { step: 3, text: 'Reach the legendary Namekian (only 7 exist!) to win' },
      { step: 4, text: 'Game ends when no moves are left' },
    ],
    controls: [
      { input: 'Swipe / Arrow Keys', action: 'Move tiles' },
    ],
  },
  {
    id: 'block-puzzle',
    name: 'Block Puzzle',
    emoji: '🧩',
    description: 'Drag and drop blocks to clear rows and columns!',
    shortDescription: 'Drag blocks onto the grid. Clear full rows or columns!',
    status: 'available',
    route: '/media/games/block-puzzle',
    accentColor: '#a855f7',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '5-15 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: true,
      audioDescriptions: true,
      pauseAnytime: false,
    },
    instructions: [
      { step: 1, text: 'Drag pieces from the rack to the grid' },
      { step: 2, text: 'Fill entire rows or columns to clear them' },
      { step: 3, text: 'Clear multiple lines for combo bonuses!' },
      { step: 4, text: 'Game ends when no pieces can be placed' },
    ],
    controls: [
      { input: 'Drag & Drop', action: 'Place pieces on grid' },
    ],
  },

  // ============================================
  // DISABLED GAMES (Coming Soon) - shown last
  // ============================================
  {
    id: 'orange-pong',
    name: 'Orange Pong',
    emoji: '🏓',
    description: 'Classic Pong with an orange twist!',
    shortDescription: 'Move your paddle to hit the orange! First to 5 wins.',
    status: 'available',
    disabled: true,
    route: '/media/games/pong',
    accentColor: '#ec4899',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '5-15 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Play against the AI!' },
      { step: 2, text: 'Move your paddle to hit the 🍊 orange' },
      { step: 3, text: "Don't let it pass your side" },
      { step: 4, text: 'First to 5 wins the match' },
      { step: 5, text: 'Build streaks for bonus points: 1→2→4' },
    ],
    controls: [
      { input: 'Mouse / Touch', action: 'Move paddle up/down' },
    ],
  },
  {
    id: 'orange-juggle',
    name: 'Juggle an Orange',
    emoji: '🦧',
    description: 'Juggle oranges with your orangutan! Avoid the camels!',
    shortDescription: 'Juggle oranges! Avoid camels!',
    status: 'available',
    disabled: true,
    route: '/media/games/juggle',
    accentColor: '#f97316',
    hasHighScores: true,
    difficulty: 'easy',
    estimatedPlayTime: '3-15 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Keep 🍊 oranges bouncing' },
      { step: 2, text: 'Avoid 🐫 camels - they\'ll kill you!' },
      { step: 3, text: '🍌 Bananas make you faster' },
      { step: 4, text: '🥃 Rum will make you drunk' },
      { step: 5, text: 'Pro tip: 🍌 bananas sober you up!' },
    ],
    controls: [],
  },
  {
    id: 'knife-game',
    name: 'The Knife Game',
    emoji: '🔪',
    description: 'Stab between your fingers as fast as you can!',
    shortDescription: 'Stab between your fingers as fast as you can!',
    status: 'available',
    disabled: true,
    route: '/media/games/knife',
    accentColor: '#ef4444',
    hasHighScores: false,
    difficulty: 'hard',
    estimatedPlayTime: '1-5 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: false,
      pauseAnytime: false,
    },
    instructions: [
      { step: 1, text: 'Stab between your fingers as fast as you can' },
      { step: 2, text: 'Don\'t hit your fingers!' },
      { step: 3, text: 'Sing along to the song!' },
    ],
    controls: [],
  },
  {
    id: 'orange-wordle',
    name: 'Orange Wordle',
    emoji: '🔤',
    description: 'Guess the 5-letter word in 6 tries!',
    shortDescription: 'Guess the 5-letter word in 6 tries!',
    status: 'available',
    disabled: true,
    route: '/media/games/wordle',
    accentColor: '#3b82f6',
    hasHighScores: true,
    difficulty: 'easy',
    estimatedPlayTime: '2-5 min',
    accessibilityFeatures: {
      keyboardPlayable: true,
      screenReaderSupport: true,
      colorBlindMode: true,
      reducedMotionSupport: true,
      audioDescriptions: false,
      pauseAnytime: true,
    },
    instructions: [
      { step: 1, text: 'Guess the 5-letter word in 6 tries' },
      { step: 2, text: '🟧 Orange = correct letter, correct spot' },
      { step: 3, text: '🟨 Yellow = correct letter, wrong spot' },
      { step: 4, text: '⬛ Gray = letter not in word' },
    ],
    controls: [
      { input: 'Keyboard / Tap', action: 'Type letters' },
      { input: 'Enter', action: 'Submit guess' },
      { input: 'Backspace', action: 'Delete letter' },
    ],
  },
  {
    id: 'citrus-drop',
    name: 'Citrus Drop',
    emoji: '🍊',
    description: 'Drop and merge fruits to create bigger citrus! A Suika-style physics puzzle.',
    shortDescription: 'Drop fruits! Match to merge! How big can you go?',
    status: 'available',
    disabled: true,
    route: '/media/games/citrus-drop',
    accentColor: '#f472b6',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '3-10 min',
    accessibilityFeatures: {
      keyboardPlayable: true,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: false,
    },
    instructions: [
      { step: 1, text: 'Move to position your fruit' },
      { step: 2, text: 'Tap or click to drop' },
      { step: 3, text: 'Matching fruits merge into bigger ones!' },
      { step: 4, text: 'Don\'t let fruits stay above the line!' },
      { step: 5, text: 'Create a MELON for the ultimate combo!' },
    ],
    controls: [
      { input: 'Mouse / Touch', action: 'Position fruit' },
      { input: 'Click / Tap / Space', action: 'Drop fruit' },
      { input: 'Arrow Keys', action: 'Fine position control' },
    ],
  },
  {
    id: 'orange-snake',
    name: 'Orange Snake',
    emoji: '🐍',
    description: 'Grow your snake by eating food! A smooth Slither.io-style game.',
    shortDescription: 'Eat food to grow! Avoid other snakes!',
    status: 'available',
    disabled: true,
    route: '/media/games/orange-snake',
    accentColor: '#84cc16',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '3-10 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: false,
    },
    instructions: [
      { step: 1, text: 'Move your finger or mouse to guide the snake' },
      { step: 2, text: 'Eat glowing food to grow longer' },
      { step: 3, text: 'Avoid hitting walls, yourself, or other snakes' },
      { step: 4, text: 'When snakes die, they become food!' },
      { step: 5, text: 'Reach milestones for bonus effects!' },
    ],
    controls: [
      { input: 'Mouse / Touch', action: 'Guide snake direction' },
    ],
  },
  {
    id: 'brick-breaker',
    name: 'Brick Breaker',
    emoji: '🧱',
    description: 'Classic breakout game with powerups and level progression!',
    shortDescription: 'Break bricks! Collect powerups! Beat all levels!',
    status: 'available',
    disabled: true,
    route: '/media/games/brick-breaker',
    accentColor: '#d946ef',
    hasHighScores: true,
    difficulty: 'medium',
    estimatedPlayTime: '5-15 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: false,
    },
    instructions: [
      { step: 1, text: 'Move your paddle to bounce the ball' },
      { step: 2, text: 'Break all the bricks to advance' },
      { step: 3, text: 'Catch powerups for special abilities' },
      { step: 4, text: 'Don\'t let the ball fall below your paddle!' },
      { step: 5, text: 'Clear 10 levels then face endless mode!' },
    ],
    controls: [
      { input: 'Mouse / Touch', action: 'Move paddle left/right' },
    ],
  },
  {
    id: 'wojak-whack',
    name: 'Wojak Whack',
    emoji: '🔨',
    description: 'Whack-a-Mole with Wojaks! Tap them as they pop up!',
    shortDescription: 'Tap Wojaks as they pop up! 60 seconds!',
    status: 'available',
    disabled: true,
    route: '/media/games/wojak-whack',
    accentColor: '#fb923c',
    hasHighScores: true,
    difficulty: 'easy',
    estimatedPlayTime: '1-2 min',
    accessibilityFeatures: {
      keyboardPlayable: false,
      screenReaderSupport: false,
      colorBlindMode: true,
      reducedMotionSupport: false,
      audioDescriptions: true,
      pauseAnytime: false,
    },
    instructions: [
      { step: 1, text: 'Tap Wojaks as they pop up from holes' },
      { step: 2, text: 'Regular Wojak = +10 points' },
      { step: 3, text: 'Happy Wojak = +25, Golden = +50!' },
      { step: 4, text: 'Avoid the Scammer (-30 points)!' },
      { step: 5, text: 'Build combos for bonus effects!' },
    ],
    controls: [
      { input: 'Tap / Click', action: 'Whack the Wojak' },
    ],
  },
];

// Accessibility icons mapping
export const ACCESSIBILITY_ICONS: Record<keyof MiniGame['accessibilityFeatures'], { icon: string; label: string }> = {
  keyboardPlayable: { icon: '⌨️', label: 'Keyboard playable' },
  screenReaderSupport: { icon: '♿', label: 'Screen reader support' },
  colorBlindMode: { icon: '🎨', label: 'Color blind mode' },
  reducedMotionSupport: { icon: '🔄', label: 'Reduced motion support' },
  audioDescriptions: { icon: '🔊', label: 'Audio descriptions' },
  pauseAnytime: { icon: '⏸️', label: 'Pause anytime' },
};

// Difficulty colors
export const DIFFICULTY_COLORS: Record<NonNullable<MiniGame['difficulty']>, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

// Get game by ID
export function getGameById(id: string): MiniGame | undefined {
  return MINI_GAMES.find((game) => game.id === id);
}

// Get available games
export function getAvailableGames(): MiniGame[] {
  return MINI_GAMES.filter((game) => game.status === 'available');
}

// Get coming soon games
export function getComingSoonGames(): MiniGame[] {
  return MINI_GAMES.filter((game) => game.status === 'coming-soon');
}

/**
 * Position-based color system for game ranking
 *
 * Colors indicate ranking: green (best) → yellow (middle) → red (worst)
 * Based on position in grid, not individual game properties.
 */
const RANK_COLORS = [
  '#22c55e', // 0: Green (best)
  '#4ade80', // 1: Light green
  '#84cc16', // 2: Lime
  '#a3e635', // 3: Yellow-green
  '#bef264', // 4: Light lime
  '#d9f99d', // 5: Pale lime
  '#fde047', // 6: Yellow
  '#facc15', // 7: Gold
  '#eab308', // 8: Amber
  '#f59e0b', // 9: Orange-amber
  '#f97316', // 10: Orange
  '#fb923c', // 11: Light orange
  '#f87171', // 12: Light red
  '#ef4444', // 13: Red
  '#dc2626', // 14: Deep red (worst)
];

/**
 * Get hover color based on position in the grid
 * Top-left (index 0) = green (best)
 * Bottom-right (last index) = red (worst)
 */
export function getRankColor(index: number, total: number): string {
  if (total <= 1) return RANK_COLORS[0];

  // Map index to color array position
  const colorIndex = Math.round((index / (total - 1)) * (RANK_COLORS.length - 1));
  return RANK_COLORS[Math.min(colorIndex, RANK_COLORS.length - 1)];
}

/**
 * Rank badge configuration for top performers
 */
export type RankBadge = {
  emoji: string;
  label: string;
  color: string;
} | null;

/**
 * Complete rank-based visual effects
 * All values interpolate based on position (best to worst)
 */
export interface RankEffects {
  color: string;
  glowRadius: number;      // 24px (best) → 6px (worst)
  glowOpacity: number;     // 0.5 (best) → 0.15 (worst)
  hoverScale: number;      // 1.03 (best) → 1.00 (worst)
  borderWidth: number;     // 2px (best) → 1px (worst)
  backgroundTint: number;  // 0.08 (best) → 0 (worst)
  badge: RankBadge;
}

/**
 * Get all rank-based visual effects for a game position
 */
export function getRankEffects(index: number, total: number): RankEffects {
  if (total <= 1) {
    return {
      color: RANK_COLORS[0],
      glowRadius: 24,
      glowOpacity: 0.5,
      hoverScale: 1.03,
      borderWidth: 2,
      backgroundTint: 0.08,
      badge: { emoji: '🥇', label: '1st', color: '#ffd700' },
    };
  }

  // Normalized position: 0 (best) to 1 (worst)
  const t = index / (total - 1);

  // Get color
  const colorIndex = Math.round(t * (RANK_COLORS.length - 1));
  const color = RANK_COLORS[Math.min(colorIndex, RANK_COLORS.length - 1)];

  // Interpolate effects (best → worst)
  const glowRadius = 24 - t * 18;        // 24 → 6
  const glowOpacity = 0.5 - t * 0.35;    // 0.5 → 0.15
  const hoverScale = 1.03 - t * 0.03;    // 1.03 → 1.00
  const borderWidth = 2 - t * 1;         // 2 → 1
  const backgroundTint = 0.08 - t * 0.08; // 0.08 → 0

  // Badges for top 3
  let badge: RankBadge = null;
  if (index === 0) {
    badge = { emoji: '🥇', label: '1st', color: '#ffd700' };
  } else if (index === 1) {
    badge = { emoji: '🥈', label: '2nd', color: '#c0c0c0' };
  } else if (index === 2) {
    badge = { emoji: '🥉', label: '3rd', color: '#cd7f32' };
  }

  return {
    color,
    glowRadius,
    glowOpacity,
    hoverScale,
    borderWidth,
    backgroundTint,
    badge,
  };
}
