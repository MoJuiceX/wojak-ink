/**
 * BigPulp Animation Configurations
 *
 * Animation presets for the BigPulp Intelligence system.
 */

import type { Transition, Variants } from 'framer-motion';

// ============ Typing Animation ============

export const TYPING_CONFIG = {
  baseSpeed: 30, // ms per character
  variation: 10, // +/- ms random variation
  punctuationPause: 150, // ms after . , ! ?
  cursorBlinkInterval: 500, // ms
  postTypingCursorDuration: 500, // ms before cursor disappears
  messageDelay: 2000, // ms between queued messages
  initialDelay: 500, // ms before starting to type
} as const;

// ============ Tab Transitions ============

export const TAB_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

export const tabContentVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, delay: 0.1 },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.15 },
  },
};

// ============ BigPulp Character ============

export const characterIdleVariants: Variants = {
  idle: {
    y: [0, -4, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const characterHeadChangeVariants: Variants = {
  initial: { scale: 1 },
  change: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.3 },
  },
};

// ============ Speech Bubble ============

export const speechBubbleVariants: Variants = {
  initial: { opacity: 0, scale: 0.8, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: -5 },
};

export const speechBubbleTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

// ============ Badge Animations ============

export const badgeVariants: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
};

export const badgeTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 25,
};

export const BADGE_STAGGER = 0.05; // seconds between each badge

export const badgeContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: BADGE_STAGGER,
    },
  },
};

// ============ Heat Map ============

export const heatMapCellVariants: Variants = {
  initial: { scale: 1, zIndex: 1 },
  hover: {
    scale: 1.15,
    zIndex: 10,
    transition: { duration: 0.15 },
  },
  tap: {
    scale: 0.95,
  },
};

// ============ Accordion ============

export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
  },
  expanded: {
    height: 'auto',
    opacity: 1,
  },
};

export const accordionTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut',
};

export const accordionArrowVariants: Variants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 180 },
};

// ============ NFT Preview Card ============

export const previewCardVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

export const rarityProgressVariants: Variants = {
  initial: { scaleX: 0 },
  animate: {
    scaleX: 1,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

// ============ Search Input ============

export const searchInputVariants: Variants = {
  idle: {
    boxShadow: '0 0 0 0 rgba(255, 107, 0, 0)',
  },
  focused: {
    boxShadow: '0 0 0 3px rgba(255, 107, 0, 0.2)',
  },
  error: {
    x: [-4, 4, -4, 4, 0],
    transition: { duration: 0.3 },
  },
};

export const diceSpinVariants: Variants = {
  idle: { rotate: 0 },
  spinning: {
    rotate: 360,
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Dice roll animation - squiggle then pop back (like Generator)
export const diceRollVariants: Variants = {
  idle: { scale: 1, rotate: 0 },
  rolling: {
    scale: [1, 1.4, 1.3, 1.5, 1.2, 1],
    rotate: [0, -20, 25, -15, 20, -10, 0],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
    },
  },
};

// ============ Stats Cards ============

export const statsCardVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  hover: {
    y: -2,
    transition: { duration: 0.15 },
  },
};

export const statsContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// ============ Table Row ============

export const tableRowVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.15 },
  },
  expanded: {
    backgroundColor: 'var(--color-surface-hover)',
  },
};

export const tableRowExpandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2 },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3 },
  },
};

// ============ Reduced Motion Alternatives ============

export const REDUCED_MOTION_VARIANTS = {
  tabContent: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  },
  character: {
    idle: {}, // No animation
  },
  heatMapCell: {
    initial: { scale: 1 },
    hover: { scale: 1 }, // No scale
    tap: { scale: 1 },
  },
  speechBubble: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
} as const;

// ============ Timing Constants ============

export const ANIMATION_TIMING = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  emphasis: 0.5,
} as const;
