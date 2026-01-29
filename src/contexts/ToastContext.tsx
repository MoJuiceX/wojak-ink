/* eslint-disable react-refresh/only-export-components */
/**
 * Toast Context
 *
 * Global toast notification system with auto-dismiss and accessibility.
 * Supports titles, custom icons, action buttons, and type-based styling.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { Toast, ToastType, ToastContextValue, ToastOptions } from '@/types/settings';

const DEFAULT_DURATION = 5000;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const duration = options?.duration ?? DEFAULT_DURATION;

      const newToast: Toast = {
        id,
        type,
        message,
        title: options?.title,
        icon: options?.icon,
        duration,
        action: options?.action,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, options?: ToastOptions) => showToast('success', message, options),
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => showToast('error', message, options),
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) => showToast('warning', message, options),
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => showToast('info', message, options),
    [showToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showToast,
      dismissToast,
      success,
      error,
      warning,
      info,
    }),
    [toasts, showToast, dismissToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error(
      'useToast must be used within a ToastProvider. ' +
        'Wrap your app in <ToastProvider> to use this hook.'
    );
  }

  return context;
}

export default ToastProvider;
