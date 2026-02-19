/**
 * Error State Component
 *
 * Displays error message with retry option.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeInUpVariants, buttonVariants } from '@/config/hoverEffects';
import type { ErrorType } from '@/types/microInteractions';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  retryable?: boolean;
  onRetry?: () => void;
  showHomeLink?: boolean;
  className?: string;
}

const ERROR_CONFIGS: Record<
  ErrorType,
  { icon: string; title: string; message: string; retryable: boolean }
> = {
  network: {
    icon: '🌐',
    title: 'Connection problem',
    message: "We couldn't connect to the server. Please check your connection.",
    retryable: true,
  },
  notFound: {
    icon: '🔍',
    title: 'Not found',
    message: "We couldn't find what you're looking for.",
    retryable: false,
  },
  serverError: {
    icon: '⚠️',
    title: 'Something went wrong',
    message: "We're having trouble on our end. Please try again later.",
    retryable: true,
  },
  validation: {
    icon: '📝',
    title: 'Invalid input',
    message: 'Please check your input and try again.',
    retryable: false,
  },
  timeout: {
    icon: '⏱️',
    title: 'Request timed out',
    message: 'The request took too long. Please try again.',
    retryable: true,
  },
  imageLoad: {
    icon: '🖼️',
    title: 'Image failed to load',
    message: 'The image could not be loaded.',
    retryable: true,
  },
};

export function ErrorState({
  type = 'serverError',
  title,
  message,
  retryable,
  onRetry,
  showHomeLink = true,
  className = '',
}: ErrorStateProps) {
  const prefersReducedMotion = useReducedMotion();
  const config = ERROR_CONFIGS[type];

  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const isRetryable = retryable ?? config.retryable;

  return (
    <motion.div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      variants={prefersReducedMotion ? undefined : fadeInUpVariants}
      initial="initial"
      animate="animate"
      role="alert"
    >
      <div className="text-5xl mb-4" aria-hidden="true">
        {config.icon}
      </div>

      <h3 className="text-lg font-semibold mb-2 text-primary">
        {displayTitle}
      </h3>

      <p className="text-sm max-w-sm mb-6 text-muted">
        {displayMessage}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isRetryable && onRetry && (
          <motion.button
            type="button"
            onClick={onRetry}
            className="btn btn-primary flex items-center gap-2 text-sm"
            variants={prefersReducedMotion ? undefined : buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <RefreshCw size={16} />
            Try again
          </motion.button>
        )}

        {showHomeLink && type === 'notFound' && (
          <Link
            to="/"
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <Home size={16} />
            Go home
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// Inline error message
export function ErrorInline({
  message,
  className = '',
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-sm text-error ${className}`}
      role="alert"
    >
      <AlertTriangle size={14} />
      <span>{message}</span>
    </div>
  );
}

// Error boundary fallback
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary?: () => void;
}) {
  return (
    <ErrorState
      type="serverError"
      title="Something went wrong"
      message={error.message || 'An unexpected error occurred.'}
      retryable={!!resetErrorBoundary}
      onRetry={resetErrorBoundary}
    />
  );
}

export default ErrorState;
