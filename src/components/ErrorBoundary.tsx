/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the whole app.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/gallery';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'var(--color-bg, #0a0a0a)' }}
        >
          <div
            className="max-w-md w-full p-8 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            {/* Error Icon */}
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <AlertTriangle size={40} style={{ color: '#ef4444' }} />
            </div>

            {/* Error Title */}
            <h1
              className="text-2xl font-bold mb-3"
              style={{ color: 'var(--color-text, #fff)' }}
            >
              Something went wrong
            </h1>

            {/* Error Message */}
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--color-text-secondary, #9ca3af)' }}
            >
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {/* Error Details (collapsed) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details
                className="mb-6 text-left"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <summary
                  className="cursor-pointer text-xs font-medium mb-2"
                  style={{ color: 'var(--color-text-tertiary, #6b7280)' }}
                >
                  Technical Details
                </summary>
                <pre
                  className="text-xs overflow-auto max-h-40"
                  style={{ color: '#ef4444' }}
                >
                  {this.state.error?.stack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#fff',
                }}
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--color-text, #fff)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <Home size={18} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
