/**
 * Toast Container Component
 *
 * Renders toast notifications with animations.
 * Use this at the root of your app.
 *
 * @example
 * function App() {
 *   return (
 *     <>
 *       <Router>...</Router>
 *       <ToastContainer />
 *     </>
 *   );
 * }
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { toastService, type Toast } from '@/services/toastService';
import './ToastContainer.css';

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const Icon = TOAST_ICONS[toast.type];

  return (
    <motion.div
      key={toast.id}
      className={`toast toast-${toast.type}`}
      initial={{ opacity: 0, x: 400, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 400, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <div className="toast-content">
        <Icon className="toast-icon" size={20} />

        <div className="toast-message-wrapper">
          <p className="toast-message">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          className="toast-close"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress bar for auto-dismiss */}
      {(toast.duration ?? 0) > 0 && (
        <motion.div
          className="toast-progress"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{
            duration: (toast.duration ?? 5000) / 1000,
            ease: 'linear',
          }}
        />
      )}
    </motion.div>
  );
};

/**
 * Toast Container - Render at app root
 */
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe((event) => {
      if (event.type === 'dismiss') {
        // Dismissal event
        setToasts((prev) =>
          prev.filter((t) => t.id !== event.toast.id)
        );
      } else {
        // New toast
        setToasts((prev) => [...prev, event.toast]);
      }
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    toastService.dismiss(id);
  };

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={handleDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
