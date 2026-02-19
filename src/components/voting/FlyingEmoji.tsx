/**
 * Animated emoji that flies from toggle button to target with smooth parabolic arc
 * 
 * Physics-based animation:
 * - X: Linear motion (constant horizontal velocity)
 * - Y: Parabolic arc (ease-out up, ease-in down for gravity)
 * - Supports rapid-fire multi-throw via unique id
 * - Subtle motion trail for speed effect
 */

import { motion } from 'framer-motion';

interface FlyingEmojiProps {
  id: string;
  type: 'donut' | 'poop';
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onComplete: (id: string) => void;
}

// Trail ghost configuration
const TRAIL_GHOSTS = [
  { delay: 0.03, opacity: 0.4, scale: 0.85 },
  { delay: 0.06, opacity: 0.25, scale: 0.7 },
  { delay: 0.09, opacity: 0.12, scale: 0.55 },
];

export function FlyingEmoji({ id, type, startPosition, endPosition, onComplete }: FlyingEmojiProps) {
  const emoji = type === 'donut' ? '🍩' : '💩';

  // Calculate arc parameters
  const distance = Math.sqrt(
    Math.pow(endPosition.x - startPosition.x, 2) +
    Math.pow(endPosition.y - startPosition.y, 2)
  );
  
  // Arc height scales with distance, clamped for reasonable bounds
  const arcHeight = Math.min(200, Math.max(60, distance * 0.4));
  
  // Peak Y is above both start and end points
  const baseY = Math.min(startPosition.y, endPosition.y);
  const peakY = baseY - arcHeight;

  // Center offset for 42px emoji
  const offset = 21;

  // Duration scales slightly with distance for natural feel (0.3s - 0.45s range)
  const duration = Math.min(0.45, Math.max(0.3, distance / 800));

  // Shared animation config
  const getAnimationProps = (ghostDelay = 0, ghostScale = 1) => ({
    initial: {
      x: startPosition.x - offset,
      y: startPosition.y - offset,
      scale: 0.5 * ghostScale,
      rotate: 0,
    },
    animate: {
      x: endPosition.x - offset,
      y: [startPosition.y - offset, peakY - offset, endPosition.y - offset],
      scale: [0.5 * ghostScale, 1.2 * ghostScale, 1 * ghostScale],
      rotate: 360,
    },
    transition: {
      duration,
      delay: ghostDelay,
      x: { ease: 'linear' },
      y: {
        times: [0, 0.4, 1],
        ease: ['easeOut', 'easeIn'],
      },
      scale: {
        times: [0, 0.25, 1],
        ease: ['easeOut', 'easeInOut'],
      },
      rotate: { ease: 'linear' },
    },
  });

  return (
    <>
      {/* Motion trail ghosts - render behind main emoji */}
      {TRAIL_GHOSTS.map((ghost, index) => (
        <motion.div
          key={`trail-${index}`}
          style={{
            position: 'fixed',
            fontSize: '42px',
            pointerEvents: 'none',
            zIndex: 9997,
            opacity: ghost.opacity,
            filter: 'blur(1px)',
          }}
          {...getAnimationProps(ghost.delay, ghost.scale)}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Main emoji */}
      <motion.div
        className="flying-emoji"
        style={{
          position: 'fixed',
          fontSize: '42px',
          pointerEvents: 'none',
          zIndex: 9998,
          filter: 'drop-shadow(0 4px 8px var(--color-black-40))',
          willChange: 'transform',
        }}
        initial={{
          x: startPosition.x - offset,
          y: startPosition.y - offset,
          scale: 0.5,
          opacity: 1,
          rotate: 0,
        }}
        animate={{
          x: endPosition.x - offset,
          y: [startPosition.y - offset, peakY - offset, endPosition.y - offset],
          scale: [0.5, 1.2, 1],
          opacity: 1,
          rotate: 360,
        }}
        transition={{
          duration,
          x: { ease: 'linear' },
          y: {
            times: [0, 0.4, 1],
            ease: ['easeOut', 'easeIn'],
          },
          scale: {
            times: [0, 0.25, 1],
            ease: ['easeOut', 'easeInOut'],
          },
          rotate: { ease: 'linear' },
        }}
        onAnimationComplete={() => onComplete(id)}
      >
        {emoji}
      </motion.div>
    </>
  );
}
