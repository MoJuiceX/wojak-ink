/**
 * Gesture Configurations
 *
 * Pre-configured whileHover, whileTap, whileFocus, whileDrag
 * for common interactive elements.
 */

import { SPRING } from './springs';

// ============================================
// BUTTON GESTURES
// ============================================

export const BUTTON_GESTURES = {
  // Standard button
  default: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: SPRING.snappy,
  },

  // Primary CTA buttons
  primary: {
    whileHover: { scale: 1.03, y: -1 },
    whileTap: { scale: 0.97 },
    transition: SPRING.snappy,
  },

  // Icon buttons
  icon: {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
    transition: SPRING.quick,
  },

  // Subtle hover
  subtle: {
    whileHover: { scale: 1.01 },
    whileTap: { scale: 0.99 },
    transition: SPRING.soft,
  },

  // No scale, just opacity
  ghost: {
    whileHover: { opacity: 0.8 },
    whileTap: { opacity: 0.6 },
    transition: { duration: 0.1 },
  },
} as const;

// ============================================
// CARD GESTURES
// ============================================

export const CARD_GESTURES = {
  // Standard lift effect
  lift: {
    whileHover: {
      y: -4,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
    },
    whileTap: {
      y: -2,
      scale: 0.99,
    },
    transition: SPRING.quick,
  },

  // With brand glow
  glow: {
    whileHover: {
      y: -4,
      boxShadow: '0 10px 30px var(--color-brand-glow)',
    },
    transition: SPRING.quick,
  },

  // Subtle for dense lists
  subtle: {
    whileHover: {
      y: -2,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    transition: SPRING.soft,
  },

  // Interactive tile
  tile: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: SPRING.snappy,
  },
} as const;

// ============================================
// LINK GESTURES
// ============================================

export const LINK_GESTURES = {
  default: {
    whileHover: { x: 2 },
    transition: SPRING.snappy,
  },

  underline: {
    whileHover: {
      color: 'var(--color-primary)',
    },
    transition: { duration: 0.15 },
  },
} as const;

// ============================================
// NAV GESTURES
// ============================================

export const NAV_GESTURES = {
  // Tab/nav item
  tab: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: SPRING.snappy,
  },

  // Icon nav
  icon: {
    whileHover: { scale: 1.1, y: -2 },
    whileTap: { scale: 0.95 },
    transition: SPRING.quick,
  },
} as const;

// ============================================
// DRAG CONFIGURATION
// ============================================

export const DRAG_CONFIG = {
  // Gallery swipe
  gallery: {
    drag: 'x' as const,
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.2,
    dragMomentum: true,
    dragTransition: {
      bounceStiffness: 300,
      bounceDamping: 30,
    },
  },

  // Draggable card
  card: {
    drag: true,
    dragConstraints: { left: -50, right: 50, top: -50, bottom: 50 },
    dragElastic: 0.1,
    dragMomentum: false,
  },

  // Bottom sheet
  sheet: {
    drag: 'y' as const,
    dragConstraints: { top: 0 },
    dragElastic: 0.3,
  },
} as const;

export type ButtonGesturePreset = keyof typeof BUTTON_GESTURES;
export type CardGesturePreset = keyof typeof CARD_GESTURES;
export type LinkGesturePreset = keyof typeof LINK_GESTURES;
export type NavGesturePreset = keyof typeof NAV_GESTURES;
export type DragConfigPreset = keyof typeof DRAG_CONFIG;
