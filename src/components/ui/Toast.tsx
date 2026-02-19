/**
 * Toast Component
 *
 * Premium toast notification display with animations, colored glows,
 * action buttons, and title/message support.
 */

import { memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import type { Toast, ToastType } from '@/types/settings';
import './Toast.css';

// Default icons for each toast type
const defaultIcons: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: '🍊',
  warning: '⚠️',
};

// Color configurations for glow effects
const toastColors: Record<ToastType, { border: string; glow: string }> = {
  success: {
    border: 'var(--color-success-40)',
    glow: 'var(--color-success-20)',
  },
  error: {
    border: 'var(--color-error-40)',
    glow: 'var(--color-error-20)',
  },
  info: {
    border: 'var(--color-primary-40)',
    glow: 'var(--color-primary-20)',
  },
  warning: {
    border: 'var(--color-warning-40)',
    glow: 'var(--color-warning-20)',
  },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const colors = toastColors[toast.type];
  const icon = toast.icon || defaultIcons[toast.type];

  return (
    <motion.div
      layout
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 100, scale: 0.9 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.15 }
          : { type: 'spring', damping: 25, stiffness: 300 }
      }
      className={`toast toast-${toast.type}`}
      style={{
        borderColor: colors.border,
        boxShadow: `0 10px 40px var(--color-black-50), 0 0 20px ${colors.glow}`,
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Icon */}
      <span className="toast-icon">{icon}</span>

      {/* Content */}
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className={`toast-message ${toast.title ? '' : 'toast-message-only'}`}>
          {toast.message}
        </div>
      </div>

      {/* Action button */}
      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}

      {/* Close button */}
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export const ToastContainer = memo(function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

export default ToastContainer;
