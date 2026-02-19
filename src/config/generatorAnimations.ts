/**
 * Generator Animation Configuration
 *
 * Framer Motion animation presets for the Wojak generator.
 */

import type { Variants, Transition } from 'framer-motion';

// ============ Shared Transitions ============

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const smoothTransition: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeOut',
};

export const fastTransition: Transition = {
  type: 'tween',
  duration: 0.15,
  ease: 'easeOut',
};

// ============ Trait Card Animations ============

export const traitCardVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: fastTransition,
  },
  hover: {
    scale: 1.03,
    transition: fastTransition,
  },
  tap: {
    scale: 0.97,
    transition: fastTransition,
  },
  selected: {
    scale: 1,
    boxShadow: '0 0 0 2px var(--color-primary)',
  },
  blocked: {
    opacity: 0.4,
    filter: 'grayscale(1)',
  },
};

// Stagger children for grid layout - enhanced with spring animation
export const traitGridVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

// Individual trait card stagger animation
export const traitCardStaggerVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: {
      duration: 0.15,
    },
  },
};

// ============ Layer Tab Animations ============

export const layerTabVariants: Variants = {
  initial: {
    opacity: 0.6,
  },
  animate: {
    opacity: 1,
  },
  hover: {
    scale: 1.02,
  },
  tap: {
    scale: 0.98,
  },
  active: {
    opacity: 1,
  },
  inactive: {
    opacity: 0.6,
  },
  blocked: {
    opacity: 0.3,
    filter: 'grayscale(1)',
  },
};

// Tab indicator animation
export const tabIndicatorVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

// ============ Preview Canvas Animations ============

export const previewCanvasVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: smoothTransition,
  },
  loading: {
    opacity: 0.5,
  },
  ready: {
    opacity: 1,
  },
};

// Layer fade animation for canvas compositing
export const layerFadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// ============ Randomize Animation ============

export const randomizeFlashVariants: Variants = {
  initial: {
    scale: 1,
    rotate: 0,
  },
  animate: {
    scale: [1, 1.1, 1],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};

export const randomizeButtonVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  spinning: {
    rotate: 360,
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

// ============ Sticky Preview Animations ============

export const stickyPreviewVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.9,
    transition: fastTransition,
  },
};

// ============ Modal Animations ============

export const modalBackdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    opacity: 0,
    transition: smoothTransition,
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: fastTransition,
  },
};

// ============ Favorites Animations ============

export const favoriteCardVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: fastTransition,
  },
  hover: {
    scale: 1.02,
    transition: fastTransition,
  },
  tap: {
    scale: 0.98,
    transition: fastTransition,
  },
};

export const favoriteGridVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

// Heart animation for save button
export const heartVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.9 },
  saved: {
    scale: [1, 1.3, 1],
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

// ============ Export Panel Animations ============

export const exportPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    height: 0,
  },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: {
        duration: 0.3,
        ease: 'easeOut',
      },
      opacity: {
        duration: 0.2,
        delay: 0.1,
      },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: {
        duration: 0.2,
        ease: 'easeIn',
      },
      opacity: {
        duration: 0.1,
      },
    },
  },
};

export const exportOptionVariants: Variants = {
  initial: {
    opacity: 0,
    x: -10,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
  selected: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
  },
};

// ============ Action Button Animations ============

export const actionButtonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: fastTransition,
  },
  tap: {
    scale: 0.95,
    transition: fastTransition,
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
  },
};

// Undo/Redo button animations
export const historyButtonVariants: Variants = {
  initial: { scale: 1, opacity: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.9 },
  disabled: { opacity: 0.3, scale: 1 },
};

// ============ Tooltip Animations ============

export const tooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 5,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: fastTransition,
  },
  exit: {
    opacity: 0,
    y: 5,
    scale: 0.95,
    transition: fastTransition,
  },
};

// ============ Mouth Subtype Tab Animations ============

export const mouthSubtypeVariants: Variants = {
  initial: {
    opacity: 0.6,
  },
  animate: {
    opacity: 1,
  },
  hover: {
    backgroundColor: 'var(--color-surface)',
  },
  active: {
    opacity: 1,
    backgroundColor: 'var(--color-primary)',
    color: 'white',
  },
  inactive: {
    opacity: 0.6,
  },
};

// ============ Blocked Layer Overlay ============

export const blockedOverlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: smoothTransition,
  },
  exit: {
    opacity: 0,
    transition: smoothTransition,
  },
};

// ============ Loading States ============

export const skeletonPulseVariants: Variants = {
  initial: {
    opacity: 0.4,
  },
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============ Page Transition ============

export const generatorPageVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};
