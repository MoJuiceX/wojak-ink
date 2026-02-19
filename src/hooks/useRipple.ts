/**
 * useRipple Hook
 *
 * Creates a material-design style ripple effect on click.
 * Works with any element that has position: relative and overflow: hidden.
 */

import { useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';

interface RippleOptions {
  /** Ripple color (default: var(--color-primary-30)) */
  color?: string;
  /** Duration in ms (default: 600) */
  duration?: number;
  /** Disable the effect */
  disabled?: boolean;
}

/**
 * Hook for adding ripple effects to interactive elements
 *
 * @example
 * ```tsx
 * const createRipple = useRipple();
 *
 * <button
 *   onClick={(e) => {
 *     createRipple(e);
 *     // ... other click handling
 *   }}
 *   style={{ position: 'relative', overflow: 'hidden' }}
 * >
 *   Click me
 * </button>
 * ```
 *
 * @example
 * ```tsx
 * // With custom color
 * const createRipple = useRipple({ color: 'rgba(234, 179, 8, 0.3)' });
 * ```
 */
export function useRipple(options: RippleOptions = {}) {
  const {
    color = 'var(--color-primary-30)',
    duration = 600,
    disabled = false,
  } = options;

  const prefersReducedMotion = useReducedMotion();

  const createRipple = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled || prefersReducedMotion) return;

      const button = e.currentTarget;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: ${color};
        border-radius: 50%;
        transform: scale(0);
        animation: ripple ${duration}ms ease-out;
        pointer-events: none;
        z-index: 1;
      `;

      button.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, duration);
    },
    [color, duration, disabled, prefersReducedMotion]
  );

  return createRipple;
}

/**
 * CSS keyframes for ripple animation
 * Add this to your CSS if not using animations.css:
 *
 * @keyframes ripple {
 *   to {
 *     transform: scale(4);
 *     opacity: 0;
 *   }
 * }
 */

/**
 * Higher-order component to add ripple effect
 *
 * @example
 * ```tsx
 * <RippleButton onClick={handleClick}>
 *   Click me
 * </RippleButton>
 * ```
 */
export default useRipple;
