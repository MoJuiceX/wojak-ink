/**
 * Arcade Button Lights Component
 *
 * Renders arcade cabinet button glow effects using CSS animations.
 * Supports both new pattern-based API and legacy sequence API.
 *
 * @see src/config/arcade-light-patterns.ts for pattern definitions
 * @see src/components/ArcadeButtonLights.css for CSS implementations
 */

import { useEffect } from 'react';
import './ArcadeButtonLights.css';
import type { PatternName } from '@/config/arcade-light-patterns';
import { getPatternDuration, isLoopingPattern } from '@/config/arcade-light-patterns';

// ============================================
// LEGACY TYPES (for backward compatibility)
// ============================================

export type LightSequence =
  | 'off'
  | 'startup'
  | 'idle'
  | 'gameStart'
  | 'playing'
  | 'score'
  | 'pipePass'
  | 'coinCollect'
  | 'combo'
  | 'win'
  | 'highScore'
  | 'gameOver';

export type PlayingIntensity = 'very-low' | 'low' | 'medium' | 'high';
export type ScoreSize = 'small' | 'medium' | 'large';
export type PipePassTier = 'early' | 'warming' | 'heated' | 'intense';

export interface LightOptions {
  intensity?: PlayingIntensity;
  comboLevel?: number;
  scoreSize?: ScoreSize;
  pipePassTier?: PipePassTier;
  pipePassVariant?: number;
}

// ============================================
// COMPONENT PROPS
// ============================================

interface ArcadeButtonLightsProps {
  /** NEW: Pattern name from the pattern library */
  pattern?: PatternName | null;

  /** LEGACY: Sequence name (for backward compatibility) */
  sequence?: LightSequence;

  /** LEGACY: Options for sequence variants */
  options?: LightOptions;

  /** Callback when a non-looping sequence/pattern completes */
  onSequenceComplete?: () => void;

  /** Debug mode: show position markers */
  debug?: boolean;
}

// ============================================
// BUTTON POSITIONS
// ============================================

/**
 * Button positions as percentages of the 3840x2160 frame (arcade-frame_fin.png)
 * 
 * Coordinates measured from Photoshop on 2026-01-25:
 * @see docs/arcade-button-coordinates.md for full reference
 * 
 * Frame: 3840 x 2160 pixels
 * Screen area: left 25%, top 25%, width 50%, height 50%
 * 
 * Calculation: left% = X/3840*100, top% = Y/2160*100
 */
const BUTTON_POSITIONS = {
  // Bottom row (7 buttons) - below screen
  // All at Y ≈ 1742-1748px (≈80.7-80.9% top)
  bottom1: { left: 28.83, top: 80.93, color: '#3b82f6' },  // blue    - X:1107, Y:1748
  bottom2: { left: 35.96, top: 80.93, color: '#f97316' },  // orange  - X:1381, Y:1748
  bottom3: { left: 43.23, top: 80.79, color: '#3b82f6' },  // blue    - X:1660, Y:1745
  bottom4: { left: 50.29, top: 80.83, color: '#ec4899' },  // pink    - X:1931, Y:1746 (center)
  bottom5: { left: 57.27, top: 80.69, color: '#3b82f6' },  // blue    - X:2199, Y:1743
  bottom6: { left: 64.24, top: 80.74, color: '#ec4899' },  // pink    - X:2467, Y:1744
  bottom7: { left: 71.54, top: 80.65, color: '#22c55e' },  // green   - X:2747, Y:1742
  // Left side (1 button) - red button in left panel
  left1:   { left: 17.84, top: 53.43, color: '#ef4444' },  // red     - X:685,  Y:1154
  // Right side (5 buttons) - stacked vertically on right panel
  right1:  { left: 81.98, top: 26.02, color: '#ef4444' },  // red     - X:3148, Y:562  (top)
  right2:  { left: 81.88, top: 41.06, color: '#f97316' },  // orange  - X:3144, Y:887
  right3:  { left: 82.14, top: 55.00, color: '#f97316' },  // orange  - X:3154, Y:1188
  right4:  { left: 82.03, top: 69.81, color: '#3b82f6' },  // blue    - X:3150, Y:1508
  right5:  { left: 81.90, top: 81.16, color: '#22c55e' },  // green   - X:3145, Y:1753 (bottom)
} as const;

type ButtonKey = keyof typeof BUTTON_POSITIONS;

const ALL_BUTTONS: ButtonKey[] = [
  'bottom1', 'bottom2', 'bottom3', 'bottom4', 'bottom5', 'bottom6', 'bottom7',
  'left1',
  'right1', 'right2', 'right3', 'right4', 'right5',
];

// ============================================
// COMPONENT
// ============================================

export function ArcadeButtonLights({
  pattern,
  sequence = 'off',
  options = {},
  onSequenceComplete,
  debug = false
}: ArcadeButtonLightsProps) {

  // Debug info removed

  // Handle completion callbacks for non-looping patterns/sequences
  useEffect(() => {
    // If pattern is provided, use pattern-based completion
    if (pattern) {
      if (isLoopingPattern(pattern)) {
        return; // Looping patterns don't complete
      }

      const duration = getPatternDuration(pattern);
      if (onSequenceComplete && duration) {
        const timer = setTimeout(onSequenceComplete, duration);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Legacy sequence-based completion
    if (sequence === 'off' || sequence === 'idle' || sequence === 'playing' || sequence === 'combo') {
      return; // Infinite sequences don't complete
    }

    // Transient sequences handled by context
    if (sequence === 'pipePass' || sequence === 'coinCollect' || sequence === 'score') {
      return;
    }

    const durations: Partial<Record<LightSequence, number>> = {
      startup: 1500,
      gameStart: 800,
      win: 2000,
      highScore: 4000,
      gameOver: 1500,
    };

    const duration = durations[sequence];
    if (onSequenceComplete && duration) {
      const timer = setTimeout(onSequenceComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [pattern, sequence, onSequenceComplete]);

  // Don't render when off and no pattern
  if (!pattern && sequence === 'off') {
    return null;
  }

  // Build CSS class
  const getCssClass = (): string => {
    // NEW: Pattern-based class (preferred)
    if (pattern) {
      return `pattern-${pattern}`;
    }

    // LEGACY: Sequence-based class
    // Playing sequence with intensity modifier
    if (sequence === 'playing' && options.intensity) {
      return `arcade-lights-playing-${options.intensity}`;
    }

    // Score sequence with size modifier
    if (sequence === 'score' && options.scoreSize) {
      return `arcade-lights-score-${options.scoreSize}`;
    }

    // Pipe pass sequence with tier and variant
    if (sequence === 'pipePass') {
      const tier = options.pipePassTier || 'early';
      const variant = options.pipePassVariant ?? 0;
      return `arcade-lights-pipePass-${tier}-${variant}`;
    }

    // Coin collect
    if (sequence === 'coinCollect') {
      return 'arcade-lights-coinCollect';
    }

    // Combo sequence with level-based tier
    if (sequence === 'combo' && options.comboLevel) {
      if (options.comboLevel >= 10) return 'arcade-lights-combo-max';
      if (options.comboLevel >= 8) return 'arcade-lights-combo-high';
      if (options.comboLevel >= 5) return 'arcade-lights-combo-mid';
      return 'arcade-lights-combo-low';
    }

    // Default: just the sequence name
    return `arcade-lights-${sequence}`;
  };

  return (
    <div className={`arcade-button-lights ${getCssClass()}`}>
      {/* Title glow overlay */}
      <img
        src="/img/Arcade_overlays/title_glow.png"
        alt=""
        className="arcade-title-glow"
        aria-hidden="true"
        draggable={false}
      />

      {/* Button glow elements */}
      {/* Positions are set via CSS classes (arcade-glow-bottom1, etc.) for reliability */}
      {/* Only color is passed as inline style */}
      {ALL_BUTTONS.map((key, index) => {
        const pos = BUTTON_POSITIONS[key];
        return (
          <div
            key={key}
            className={`arcade-glow arcade-glow-${key}`}
            style={{
              '--glow-color': pos.color,
              '--delay-index': index,
            } as React.CSSProperties}
          />
        );
      })}

      {/* Debug markers - show exact positions */}
      {debug && ALL_BUTTONS.map((key) => {
        const pos = BUTTON_POSITIONS[key];
        return (
          <div
            key={`debug-${key}`}
            style={{
              position: 'absolute',
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '20px',
              backgroundColor: 'lime',
              border: '2px solid black',
              borderRadius: '50%',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 'bold',
              color: 'black',
            }}
            title={`${key}: ${pos.left}%, ${pos.top}%`}
          >
            {key.replace('bottom', 'B').replace('left', 'L').replace('right', 'R')}
          </div>
        );
      })}
    </div>
  );
}

// Re-export pattern type for convenience
export type { PatternName };

export default ArcadeButtonLights;
