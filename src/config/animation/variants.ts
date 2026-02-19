/**
 * Animation Variants
 *
 * Pre-configured Framer Motion variants with proper exit states.
 * All variants include hidden, visible, and exit states.
 */

import type { Variants } from 'framer-motion';
import { DURATION, toSeconds } from './durations';
import { SPRING } from './springs';
import { EASING } from '../easings';

// ============================================
// FADE VARIANTS
// ============================================

export const FADE_IN: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: toSeconds(DURATION.normal),
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: toSeconds(DURATION.fast),
      ease: EASING.easeIn,
    },
  },
};

export const FADE_IN_DELAY: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: {
      duration: toSeconds(DURATION.normal),
      ease: EASING.easeOut,
      delay,
    },
  }),
  exit: { opacity: 0 },
};

// ============================================
// SLIDE VARIANTS
// ============================================

export const SLIDE_UP: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      y: SPRING.quick,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: toSeconds(DURATION.fast),
    },
  },
};

export const SLIDE_DOWN: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      y: SPRING.quick,
    },
  },
  exit: { opacity: 0, y: 10 },
};

export const SLIDE_LEFT: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      x: SPRING.quick,
    },
  },
  exit: { opacity: 0, x: -20 },
};

export const SLIDE_RIGHT: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      x: SPRING.quick,
    },
  },
  exit: { opacity: 0, x: 20 },
};

// ============================================
// SCALE VARIANTS
// ============================================

export const SCALE_IN: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      scale: SPRING.balanced,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: toSeconds(DURATION.fast),
    },
  },
};

export const SCALE_IN_BOUNCE: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      scale: SPRING.bouncy,
    },
  },
  exit: { opacity: 0, scale: 0.9 },
};

export const POP_IN: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: toSeconds(DURATION.fast) },
      scale: SPRING.elastic,
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: toSeconds(DURATION.micro) },
  },
};

// ============================================
// STAGGER CONTAINERS
// ============================================

export const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const STAGGER_CONTAINER_SLOW: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      y: SPRING.quick,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: toSeconds(DURATION.fast) },
  },
};

// ============================================
// MODAL/OVERLAY VARIANTS
// ============================================

export const MODAL_BACKDROP: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: toSeconds(DURATION.normal) },
  },
  exit: {
    opacity: 0,
    transition: { duration: toSeconds(DURATION.fast) },
  },
};

export const MODAL_CONTENT: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      scale: SPRING.balanced,
      y: SPRING.balanced,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 10,
    transition: { duration: toSeconds(DURATION.fast) },
  },
};

export const DRAWER_LEFT: Variants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: SPRING.balanced,
  },
  exit: {
    x: '-100%',
    transition: { duration: toSeconds(DURATION.normal) },
  },
};

export const DRAWER_RIGHT: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: SPRING.balanced,
  },
  exit: {
    x: '100%',
    transition: { duration: toSeconds(DURATION.normal) },
  },
};

export const DRAWER_BOTTOM: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: SPRING.balanced,
  },
  exit: {
    y: '100%',
    transition: { duration: toSeconds(DURATION.normal) },
  },
};

// ============================================
// TOAST VARIANTS
// ============================================

export const TOAST_SLIDE: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      opacity: { duration: toSeconds(DURATION.normal) },
      x: SPRING.snappy,
      scale: SPRING.snappy,
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.9,
    transition: { duration: toSeconds(DURATION.fast) },
  },
};

// ============================================
// SPECIAL EFFECTS
// ============================================

export const GLOW_PULSE = (
  color: string = 'var(--color-primary)'
) => ({
  animate: {
    boxShadow: [
      `0 0 10px color-mix(in srgb, ${color} 30%, transparent)`,
      `0 0 25px color-mix(in srgb, ${color} 60%, transparent)`,
      `0 0 10px color-mix(in srgb, ${color} 30%, transparent)`,
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
});

export const BREATHE: Variants = {
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const SHIMMER: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};
