/**
 * FlappyOrange Scoring System
 *
 * Handles score milestones, leaderboard target tracking,
 * and celebration effects.
 */

import type { LeaderboardEntry } from '@/hooks/data/useLeaderboard';
import type { LeaderboardTarget } from './types';

// ============================================
// MILESTONE TYPES
// ============================================

export interface Milestone {
  score: number;
  callout: string;
  emoji: string;
  effects: MilestoneEffects;
}

export interface MilestoneEffects {
  shockwave: boolean;
  sparks: boolean;
  vignette: boolean;
  shake: boolean;
  confetti: boolean;
  perfectBonus: boolean;  // Play perfect bonus sound
  highScoreHaptic: boolean;
}

export interface SmallCelebration {
  score: number;
  callout: string;
}

// ============================================
// MILESTONE DEFINITIONS
// ============================================

// Special milestones at specific scores
const SPECIAL_MILESTONES: Record<number, Omit<Milestone, 'score'>> = {
  10: {
    callout: 'SUNSET MODE!',
    emoji: '🌅',
    effects: { shockwave: false, sparks: false, vignette: false, shake: false, confetti: false, perfectBonus: false, highScoreHaptic: false },
  },
  25: {
    callout: 'NIGHT FLIGHT!',
    emoji: '🌙',
    effects: { shockwave: true, sparks: true, vignette: true, shake: false, confetti: true, perfectBonus: true, highScoreHaptic: true },
  },
  50: {
    callout: 'STORM CHASER!',
    emoji: '⛈️',
    effects: { shockwave: true, sparks: true, vignette: true, shake: true, confetti: true, perfectBonus: true, highScoreHaptic: true },
  },
  75: {
    callout: 'LEGENDARY!',
    emoji: '🏆',
    effects: { shockwave: true, sparks: true, vignette: true, shake: true, confetti: true, perfectBonus: true, highScoreHaptic: true },
  },
  100: {
    callout: 'ORANGE GOD!',
    emoji: '👑',
    effects: { shockwave: true, sparks: true, vignette: true, shake: true, confetti: true, perfectBonus: true, highScoreHaptic: true },
  },
};

// Callouts for every-5 milestones
const EVERY_5_CALLOUTS = ['NICE!', 'SWEET!', 'AWESOME!', 'SMOOTH!', 'FLYING HIGH!'];

// Callouts for every-10 milestones
const EVERY_10_CALLOUTS = ['SKY HIGH!', 'ON FIRE!', 'UNSTOPPABLE!', 'SOARING!'];

// ============================================
// MILESTONE CHECKING
// ============================================

/**
 * Check if the score hits a special milestone.
 * Returns milestone info if reached, null otherwise.
 */
export function checkSpecialMilestone(score: number): Milestone | null {
  const milestone = SPECIAL_MILESTONES[score];
  if (milestone) {
    return {
      score,
      ...milestone,
    };
  }
  return null;
}

/**
 * Check if score is on a regular interval milestone (every 3, 5, or 10).
 * Returns celebration info with effects to trigger.
 */
export function checkIntervalMilestone(score: number): {
  type: 'small' | 'medium' | 'big' | null;
  callout: string | null;
  effects: Partial<MilestoneEffects>;
} {
  if (score <= 0) {
    return { type: null, callout: null, effects: {} };
  }

  // Every 10 - big celebration (check first to avoid overlap)
  if (score % 10 === 0) {
    const callout = EVERY_10_CALLOUTS[Math.floor(Math.random() * EVERY_10_CALLOUTS.length)];
    return {
      type: 'big',
      callout,
      effects: {
        shockwave: true,
        sparks: true,
        vignette: true,
        confetti: true,
        perfectBonus: true,
      },
    };
  }

  // Every 5 - medium celebration
  if (score % 5 === 0) {
    const callout = EVERY_5_CALLOUTS[Math.floor(Math.random() * EVERY_5_CALLOUTS.length)];
    return {
      type: 'medium',
      callout,
      effects: {
        shockwave: true,
        sparks: true,
      },
    };
  }

  // Every 3 - small celebration (but not on 5s)
  if (score % 3 === 0) {
    return {
      type: 'small',
      callout: null,
      effects: {
        shockwave: true,
      },
    };
  }

  return { type: null, callout: null, effects: {} };
}

/**
 * Get all effects that should trigger for a given score.
 * Combines special milestones with interval milestones.
 */
export function getScoreEffects(score: number): {
  milestone: Milestone | null;
  intervalType: 'small' | 'medium' | 'big' | null;
  callout: string | null;
  emoji: string | null;
  effects: Partial<MilestoneEffects>;
} {
  // Check special milestone first
  const special = checkSpecialMilestone(score);
  if (special) {
    return {
      milestone: special,
      intervalType: null,
      callout: special.callout,
      emoji: special.emoji,
      effects: special.effects,
    };
  }

  // Check interval milestones
  const interval = checkIntervalMilestone(score);
  return {
    milestone: null,
    intervalType: interval.type,
    callout: interval.callout,
    emoji: interval.type === 'medium' ? '🍊' : interval.type === 'big' ? '🔥' : null,
    effects: interval.effects,
  };
}

// ============================================
// LEADERBOARD TARGET TRACKING
// ============================================

/**
 * Find the next leaderboard target to beat.
 * Returns the lowest-ranked player whose score hasn't been beaten yet.
 */
export function calculateNextTarget(
  currentScore: number,
  leaderboard: LeaderboardEntry[] | null | undefined,
  beatenRanks: Set<number>
): LeaderboardTarget | null {
  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  // Find the lowest-ranked player whose score we haven't beaten yet
  // Leaderboard is sorted by rank (1 = highest score)
  for (let i = leaderboard.length - 1; i >= 0; i--) {
    const entry = leaderboard[i];
    if (entry.score > currentScore && !beatenRanks.has(entry.rank)) {
      return {
        rank: entry.rank,
        score: entry.score,
        name: entry.displayName,
      };
    }
  }

  return null;
}

/**
 * Check if we just beat someone on the leaderboard.
 * Returns the entry that was beaten, or null.
 */
export function checkLeaderboardBeat(
  newScore: number,
  leaderboard: LeaderboardEntry[] | null | undefined,
  beatenRanks: Set<number>
): LeaderboardEntry | null {
  if (!leaderboard || leaderboard.length === 0) {
    return null;
  }

  // Check all entries to see if we just beat someone.
  // Return the best (highest) rank we beat — iterate from rank 1 (index 0).
  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    if (newScore >= entry.score && !beatenRanks.has(entry.rank)) {
      return entry;
    }
  }

  return null;
}

// ============================================
// CELEBRATION MESSAGES
// ============================================

/**
 * Get the "took spot" celebration message for a beaten leaderboard entry.
 */
export function getTookSpotMessage(entry: LeaderboardEntry): string {
  return `You took ${entry.displayName}'s #${entry.rank} spot!`;
}

/**
 * Get the callout message for beating a leaderboard rank.
 */
export function getBeatenRankCallout(rank: number): string {
  return `🎯 #${rank} BEATEN!`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================
// HIGH SCORE HELPERS
// ============================================

/**
 * Check if a score is a new personal best.
 */
export function isNewPersonalBest(score: number, currentHighScore: number): boolean {
  return score > currentHighScore && score > 0;
}

/**
 * Get high score from local storage.
 */
export function getStoredHighScore(): number {
  return parseInt(localStorage.getItem('flappyOrangeHighScore') || '0', 10);
}

/**
 * Save high score to local storage.
 */
export function saveHighScore(score: number): void {
  localStorage.setItem('flappyOrangeHighScore', String(score));
}

// ============================================
// GAME OVER HELPERS
// ============================================

/**
 * Capture a screenshot from a canvas element.
 * Returns null if capture fails.
 */
export function captureGameScreenshot(canvas: HTMLCanvasElement | null): string | null {
  if (!canvas) return null;
  try {
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('[FlappyOrange] Failed to capture screenshot:', e);
    return null;
  }
}

/**
 * Handle score update and check for new personal best.
 * Returns whether it was a new high score.
 */
export function handleGameOverScore(
  finalScore: number,
  currentHighScore: number
): { isNewHighScore: boolean; newHighScore: number } {
  const isNew = isNewPersonalBest(finalScore, currentHighScore);
  if (isNew) {
    saveHighScore(finalScore);
    return { isNewHighScore: true, newHighScore: finalScore };
  }
  return { isNewHighScore: false, newHighScore: currentHighScore };
}

// ============================================
// SCORE PROCESSING (Combined helper)
// ============================================

export interface ScoreProcessResult {
  // Milestone info
  specialMilestone: Milestone | null;
  intervalType: 'small' | 'medium' | 'big' | null;
  callout: string | null;
  emoji: string | null;
  effects: Partial<MilestoneEffects>;

  // Leaderboard info
  beatenEntry: LeaderboardEntry | null;
  tookSpotMessage: string | null;
  beatenRankCallout: string | null;
  nextTarget: LeaderboardTarget | null;
}

/**
 * Process a new score and return all celebration/milestone info.
 * This is a convenience function that combines multiple checks.
 */
export function processScore(
  newScore: number,
  leaderboard: LeaderboardEntry[] | null | undefined,
  beatenRanks: Set<number>
): ScoreProcessResult {
  // Get milestone effects
  const scoreEffects = getScoreEffects(newScore);

  // Check leaderboard beat
  const beatenEntry = checkLeaderboardBeat(newScore, leaderboard, beatenRanks);
  const tookSpotMessage = beatenEntry ? getTookSpotMessage(beatenEntry) : null;
  const beatenRankCallout = beatenEntry ? getBeatenRankCallout(beatenEntry.rank) : null;

  // Calculate next target (after marking as beaten)
  const updatedBeatenRanks = beatenEntry
    ? new Set([...beatenRanks, beatenEntry.rank])
    : beatenRanks;
  const nextTarget = calculateNextTarget(newScore, leaderboard, updatedBeatenRanks);

  return {
    specialMilestone: scoreEffects.milestone,
    intervalType: scoreEffects.intervalType,
    callout: scoreEffects.callout,
    emoji: scoreEffects.emoji,
    effects: scoreEffects.effects,
    beatenEntry,
    tookSpotMessage,
    beatenRankCallout,
    nextTarget,
  };
}
