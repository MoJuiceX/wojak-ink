/**
 * Loading Spinner Component
 *
 * Animated spinner for loading states.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  size = 24,
  className = '',
  label = 'Loading',
}: LoadingSpinnerProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <motion.div
        animate={prefersReducedMotion ? {} : { rotate: 360 }}
        transition={
          prefersReducedMotion
            ? {}
            : {
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }
        }
      >
        <Loader2
          size={size}
          className="text-accent"
        />
      </motion.div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Inline spinner with text
export function LoadingInline({
  text = 'Loading...',
  className = '',
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
    >
      <LoadingSpinner size={16} />
      <span className="text-muted">{text}</span>
    </div>
  );
}

// Full page loading overlay
export function LoadingOverlay({
  message = 'Loading...',
}: {
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size={48} />
      <p className="mt-4 text-sm text-muted">
        {message}
      </p>
    </div>
  );
}

// Bouncing dots loader
export function LoadingDots({
  size = 8,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'var(--color-primary)',
  };

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={dotStyle}
          animate={
            prefersReducedMotion
              ? { opacity: [0.4, 1, 0.4] }
              : { y: [0, -8, 0] }
          }
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default LoadingSpinner;
