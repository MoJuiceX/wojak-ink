/**
 * Retry Card
 *
 * Error state component with retry functionality.
 * Used when data fails to load.
 */

import React, { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RetryCardProps {
  message?: string;
  onRetry: () => void;
  icon?: string;
  buttonText?: string;
}

export const RetryCard = memo<RetryCardProps>(({
  message = 'Failed to load',
  onRetry,
  icon = '😕',
  buttonText = 'Try Again',
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="retry-card"
      initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 40,
        background: 'var(--color-white-3)',
        borderRadius: 16,
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 48 }}>{icon}</span>
      <p style={{ color: 'var(--color-white-60)', margin: 0 }}>{message}</p>
      <motion.button
        onClick={onRetry}
        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #F97316, #EA580C)',
          border: 'none',
          borderRadius: 12,
          color: 'white',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 15px var(--color-primary-30)',
        }}
      >
        {buttonText}
      </motion.button>
    </motion.div>
  );
});

/**
 * Network Error
 *
 * Specialized error state for connection issues.
 */
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 40,
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ fontSize: 48 }}
      >
        📡
      </motion.div>
      <h3 style={{ color: 'white', margin: 0 }}>Connection Lost</h3>
      <p style={{ color: 'var(--color-white-60)', margin: 0 }}>
        Please check your internet connection
      </p>
      {onRetry && (
        <motion.button
          onClick={onRetry}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          style={{
            padding: '12px 24px',
            background: 'var(--color-white-10)',
            border: '1px solid var(--color-white-20)',
            borderRadius: 12,
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Retry
        </motion.button>
      )}
    </div>
  );
};

export default RetryCard;
