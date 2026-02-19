/**
 * Focus Styles Configuration
 *
 * WCAG 2.4.7 compliant focus visibility rules.
 *
 * RULES:
 * 1. Use :focus-visible (not :focus) for keyboard-only focus
 * 2. Focus indicator must have 3:1 contrast ratio
 * 3. Never remove focus styles entirely
 */

export const FOCUS_STYLES = {
  // Default focus ring (orange glow)
  default: {
    outline: '2px solid var(--color-primary)',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(255, 107, 0, 0.2)',
  },

  // For dark backgrounds
  onDark: {
    outline: '2px solid #ff8c00',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(255, 140, 0, 0.3)',
  },

  // For light backgrounds
  onLight: {
    outline: '2px solid #e65100',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(230, 81, 0, 0.2)',
  },

  // Inset focus (for inputs)
  inset: {
    outline: 'none',
    boxShadow: 'inset 0 0 0 2px var(--color-primary)',
  },

  // Skip link focus
  skipLink: {
    outline: '3px solid var(--color-primary)',
    outlineOffset: '0',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    padding: '8px 16px',
  },
} as const;

// CSS class strings for common focus patterns
export const FOCUS_CLASSES = {
  // Standard focus-visible ring
  ring: `
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-[var(--color-primary)]
    focus-visible:ring-offset-2
    focus-visible:ring-offset-[var(--color-bg)]
  `.trim().replace(/\s+/g, ' '),

  // Inset focus for inputs
  inset: `
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-inset
    focus-visible:ring-[var(--color-primary)]
  `.trim().replace(/\s+/g, ' '),

  // No visible focus (use sparingly)
  none: 'focus:outline-none',
} as const;
