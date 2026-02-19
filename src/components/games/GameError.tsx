/**
 * Game Error Component
 *
 * Error state shown when a game fails to load or crashes.
 * Provides retry and back to games options.
 */

import { motion } from 'framer-motion';
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GameErrorProps {
  error?: Error | string;
  gameName?: string;
  onRetry?: () => void;
}

export function GameError({ error, gameName, onRetry }: GameErrorProps) {
  const navigate = useNavigate();

  const errorMessage = typeof error === 'string'
    ? error
    : error?.message || 'Failed to load game';

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleBack = () => {
    navigate('/games');
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 p-6"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      }}
    >
      <motion.div
        className="max-w-sm w-full text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
      >
        {/* Error Icon */}
        <motion.div
          className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--color-error-10)',
            border: '1px solid var(--color-error-30)',
          }}
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AlertCircle size={48} style={{ color: '#ef4444' }} />
        </motion.div>

        {/* Error Title */}
        <h2
          className="text-2xl font-bold mb-3 text-primary"
        >
          {gameName ? `${gameName} Error` : 'Game Error'}
        </h2>

        {/* Error Message */}
        <p
          className="text-sm mb-8 text-secondary"
        >
          {errorMessage}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <motion.button
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold"
            style={{
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              color: '#fff',
              boxShadow: '0 4px 20px var(--color-primary-30)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={20} />
            Try Again
          </motion.button>

          <motion.button
            onClick={handleBack}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium text-primary"
            style={{
              background: 'var(--color-white-10)',
              border: '1px solid var(--color-white-20)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={20} />
            Back to Games
          </motion.button>
        </div>

        {/* Technical details for dev */}
        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <details
            className="mt-6 text-left"
            style={{
              background: 'var(--color-black-30)',
              borderRadius: 8,
              padding: 12,
            }}
          >
            <summary
              className="cursor-pointer text-xs font-medium mb-2 text-tertiary"
            >
              Technical Details
            </summary>
            <pre
              className="text-xs overflow-auto max-h-40"
              style={{ color: '#ef4444' }}
            >
              {error.stack}
            </pre>
          </details>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Game Error Boundary
 *
 * Wraps game components to catch errors and show GameError UI.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface GameErrorBoundaryProps {
  children: ReactNode;
  gameName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface GameErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  constructor(props: GameErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<GameErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GameErrorBoundary] Game crashed:', error);
    console.error('[GameErrorBoundary] Component stack:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <GameError
          error={this.state.error || undefined}
          gameName={this.props.gameName}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default GameError;
