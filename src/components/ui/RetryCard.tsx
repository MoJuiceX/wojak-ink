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
    >
      <span style={{ fontSize: 48 }}>{icon}</span>
      <p>{message}</p>
      <motion.button
        type="button"
        className="btn btn-primary"
        onClick={onRetry}
        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
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
    <div className="network-error">
      <motion.div
        animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ fontSize: 48 }}
      >
        📡
      </motion.div>
      <h3 className="text-primary" style={{ margin: 0 }}>Connection Lost</h3>
      <p className="text-secondary" style={{ margin: 0 }}>
        Please check your internet connection
      </p>
      {onRetry && (
        <motion.button
          type="button"
          className="btn btn-secondary mt-2"
          onClick={onRetry}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        >
          Retry
        </motion.button>
      )}
    </div>
  );
};

export default RetryCard;
