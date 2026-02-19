/**
 * Design Token System - TypeScript Definitions
 *
 * Type-safe design tokens for use in React components.
 * Mirrors the CSS custom properties in tokens.css.
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  primary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  gold: {
    400: '#FACC15',
    500: '#EAB308',
    600: '#CA8A04',
  },
  success: {
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
  },
  error: {
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
  },
  warning: {
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  info: {
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
  },
} as const;

export const backgrounds = {
  primary: '#0D0D0D',
  secondary: '#1A1A1A',
  tertiary: '#262626',
  elevated: '#2D2D2D',
  overlay: {
    light: 'var(--color-white-5)',
    medium: 'var(--color-white-8)',
    heavy: 'rgba(255, 255, 255, 0.12)',
  },
  orange: {
    subtle: 'rgba(249, 115, 22, 0.05)',
    light: 'var(--color-primary-10)',
    medium: 'rgba(249, 115, 22, 0.15)',
    strong: 'rgba(249, 115, 22, 0.25)',
  },
} as const;

export const text = {
  primary: '#FFFFFF',
  secondary: 'rgba(255, 255, 255, 0.7)',
  tertiary: 'rgba(255, 255, 255, 0.5)',
  disabled: 'var(--color-white-30)',
  accent: colors.primary[500],
  gold: colors.gold[500],
} as const;

export const borders = {
  subtle: 'var(--color-white-8)',
  default: 'rgba(255, 255, 255, 0.12)',
  strong: 'var(--color-white-20)',
  accent: 'var(--color-primary-30)',
  accentStrong: 'rgba(249, 115, 22, 0.5)',
} as const;

// ============================================
// GLOW & SHADOW TOKENS
// ============================================

export const glows = {
  orange: {
    sm: '0 0 10px var(--color-primary-30)',
    md: '0 0 20px var(--color-primary-40)',
    lg: '0 0 40px rgba(249, 115, 22, 0.5)',
    xl: '0 0 60px rgba(249, 115, 22, 0.6)',
  },
  gold: {
    sm: '0 0 10px rgba(234, 179, 8, 0.3)',
    md: '0 0 20px rgba(234, 179, 8, 0.4)',
    lg: '0 0 40px rgba(234, 179, 8, 0.5)',
  },
  success: {
    sm: '0 0 10px var(--color-success-30)',
    md: '0 0 15px rgba(34, 197, 94, 0.4)',
  },
  error: {
    sm: '0 0 10px var(--color-error-30)',
    md: '0 0 15px rgba(239, 68, 68, 0.4)',
  },
  warning: {
    sm: '0 0 10px rgba(245, 158, 11, 0.3)',
    md: '0 0 15px rgba(245, 158, 11, 0.4)',
  },
} as const;

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px var(--color-black-50)',
  xl: '0 16px 48px var(--color-black-60)',
  card: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--color-white-5)',
  cardHover: `0 8px 30px var(--color-black-50), ${glows.orange.sm}`,
  modal: `0 25px 50px var(--color-black-60), ${glows.orange.md}`,
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

export const fonts = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export const fontSizes = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

// ============================================
// SPACING TOKENS
// ============================================

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

// ============================================
// BORDER RADIUS TOKENS
// ============================================

export const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

// ============================================
// ANIMATION TOKENS
// ============================================

export const durations = {
  instant: 50,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
  slowest: 1000,
} as const;

export const easings = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

// ============================================
// Z-INDEX TOKENS
// ============================================

export const zIndices = {
  behind: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  header: 30,
  sidebar: 40,
  overlay: 50,
  modal: 60,
  popover: 70,
  toast: 80,
  tooltip: 90,
  max: 9999,
} as const;

// ============================================
// BLUR TOKENS
// ============================================

export const blurs = {
  sm: '8px',
  md: '12px',
  lg: '20px',
  xl: '40px',
} as const;

// ============================================
// GRADIENT TOKENS
// ============================================

export const gradients = {
  page: `linear-gradient(180deg, ${backgrounds.primary} 0%, ${backgrounds.secondary} 100%)`,
  orange: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)`,
  orangeSoft: 'linear-gradient(135deg, var(--color-primary-20) 0%, rgba(234, 88, 12, 0.1) 100%)',
  gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  goldText: `linear-gradient(90deg, ${colors.primary[500]}, #FFD700, ${colors.primary[500]})`,
  shimmer: 'linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, var(--color-white-8) 50%, rgba(255, 255, 255, 0.03) 100%)',
  rarity: {
    common: 'linear-gradient(135deg, #6B7280, #4B5563)',
    rare: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    epic: 'linear-gradient(135deg, #A855F7, #7C3AED)',
    legendary: 'linear-gradient(135deg, #FFD700, #FFA500)',
  },
} as const;

// ============================================
// RARITY COLORS
// ============================================

export const rarityColors = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#FFD700',
  mythic: '#FF6B6B',
} as const;

// ============================================
// COMBINED EXPORT
// ============================================

export const tokens = {
  colors,
  backgrounds,
  text,
  borders,
  glows,
  shadows,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  spacing,
  radii,
  durations,
  easings,
  zIndices,
  blurs,
  gradients,
  rarityColors,
} as const;

export type Tokens = typeof tokens;

export default tokens;
