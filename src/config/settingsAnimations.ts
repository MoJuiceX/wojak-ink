/**
 * Settings Page Animations
 *
 * Framer Motion animation presets for the settings page components.
 */

import type { Variants } from 'framer-motion';

// ============ Timing Constants ============

export const THEME_TRANSITION_DURATION = 300;

const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

const smoothTransition = {
  duration: 0.2,
  ease: 'easeOut' as const,
};

// ============ Theme Card Animations ============

export const themeCardVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
  hover: {
    y: -2,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: smoothTransition,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
  selected: {
    scale: 1,
    transition: smoothTransition,
  },
};

export const themePreviewGlowVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const checkmarkVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: springTransition,
  },
};

// ============ Toggle Animations ============

export const toggleThumbVariants: Variants = {
  off: { x: 0 },
  on: { x: 16 },
};

export const toggleTrackVariants: Variants = {
  off: { backgroundColor: 'var(--color-elevated)' },
  on: { backgroundColor: 'var(--color-primary)' },
};

// ============ Volume Slider Animations ============

export const sliderThumbVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.1 },
  active: { scale: 0.95 },
};

// ============ Dropdown Animations ============

export const dropdownVariants: Variants = {
  closed: {
    opacity: 0,
    y: -8,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: smoothTransition,
  },
};

export const dropdownItemVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
};

// ============ Toast Animations ============

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// ============ Section Animations ============

export const sectionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export const settingsPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const settingsSectionVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

// ============ Link Card Animations ============

export const linkCardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
  hover: {
    y: -2,
    transition: smoothTransition,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// ============ Stagger Containers ============

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// ============ Reduced Motion Alternatives ============

export const reducedMotionVariants = {
  themeCard: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.1 } },
    hover: {},
    tap: {},
    selected: {},
  },
  toggle: {
    thumb: {
      off: { x: 0 },
      on: { x: 16, transition: { duration: 0.05 } },
    },
  },
  dropdown: {
    open: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.05 } },
    closed: { opacity: 0, y: 0, scale: 1, transition: { duration: 0.05 } },
  },
  toast: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.05 } },
    exit: { opacity: 0, transition: { duration: 0.05 } },
  },
};
