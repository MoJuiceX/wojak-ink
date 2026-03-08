/**
 * Inline Error Component
 *
 * Display errors with retry button and optional fallback visibility.
 * Features:
 * - Retry button with exponential backoff
 * - Collapsible error details
 * - IPFS fallback visibility
 * - Smooth animations
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCw, ChevronDown, ExternalLink } from 'lucide-react';
import './InlineError.css';

interface InlineErrorProps {
  error: Error | string;
  onRetry?: () => Promise<void> | void;
  fallbackUrl?: string;
  fallbackLabel?: string;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Exponential backoff for retries
 */
function getBackoffDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 10000);
}

export const InlineError: React.FC<InlineErrorProps> = ({
  error,
  onRetry,
  fallbackUrl,
  fallbackLabel = 'View on IPFS',
  compact = false,
  showDetails: initialShowDetails = false,
}) => {
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(initialShowDetails);

  const errorMessage =
    error instanceof Error ? error.message : String(error);

  const handleRetry = useCallback(async () => {
    if (!onRetry || retrying) return;

    setRetrying(true);

    try {
      // Exponential backoff
      const delay = getBackoffDelay(retryCount);
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      await onRetry();
      setRetryCount(0);
    } catch {
      setRetryCount((c) => c + 1);
    } finally {
      setRetrying(false);
    }
  }, [onRetry, retrying, retryCount]);

  if (compact) {
    return (
      <div className="inline-error-compact">
        <AlertCircle size={16} />
        <span>{errorMessage}</span>
        {onRetry && (
          <button
            type="button"
            className="inline-error-retry-mini"
            onClick={handleRetry}
            disabled={retrying}
            aria-label="Retry"
          >
            <RotateCw size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="inline-error"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="inline-error-header">
        <div className="inline-error-icon-title">
          <AlertCircle size={20} className="inline-error-icon" />
          <div>
            <h4 className="inline-error-title">Error</h4>
            {retryCount > 0 && (
              <p className="inline-error-retry-info">
                Retry attempt {retryCount}
                {retryCount >= 3 && ' - Consider using fallback'}
              </p>
            )}
          </div>
        </div>

        {(showDetails || fallbackUrl) && (
          <button
            type="button"
            className="inline-error-toggle"
            onClick={() => setShowDetails(!showDetails)}
            aria-label="Toggle details"
          >
            <ChevronDown
              size={18}
              style={{
                transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        )}
      </div>

      {/* Message */}
      <p className="inline-error-message">{errorMessage}</p>

      {/* Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="inline-error-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <pre className="inline-error-stacktrace">
              {error instanceof Error && error.stack
                ? error.stack
                : errorMessage}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="inline-error-actions">
        {onRetry && (
          <button
            type="button"
            className="inline-error-retry"
            onClick={handleRetry}
            disabled={retrying}
          >
            <RotateCw size={16} />
            <span>{retrying ? 'Retrying...' : 'Retry'}</span>
          </button>
        )}

        {fallbackUrl && (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-error-fallback"
          >
            <ExternalLink size={16} />
            <span>{fallbackLabel}</span>
          </a>
        )}

        {retryCount > 0 && (
          <span className="inline-error-backoff-info">
            Exponential backoff in effect
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default InlineError;
