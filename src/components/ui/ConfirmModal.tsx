/**
 * Confirm Modal
 *
 * Confirmation dialog for destructive or important actions.
 * Supports danger, warning, and default variants.
 * Uses Portal to render at document.body level for correct positioning.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  icon?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const defaultIcons = {
    danger: '⚠️',
    warning: '🤔',
    default: '❓',
  };

  const displayIcon = icon || defaultIcons[variant];

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // Use Portal to render at document.body level for correct positioning
  // This ensures the modal is not affected by parent transforms
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={onClose}
        >
          {/* Modal — inside backdrop for flex centering */}
          <motion.div
            className={`confirm-modal confirm-modal-${variant} glass-strong`}
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.9 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.9 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : { type: 'spring', damping: 25, stiffness: 300 }
            }
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-message"
          >
            {/* Icon */}
            <span className="confirm-modal-icon">{displayIcon}</span>

            {/* Title */}
            <h3 id="confirm-modal-title" className="confirm-modal-title">
              {title}
            </h3>

            {/* Message */}
            <p id="confirm-modal-message" className="confirm-modal-message">
              {message}
            </p>

            {/* Actions */}
            <div className="confirm-modal-actions">
              <motion.button
                type="button"
                className="confirm-modal-btn confirm-modal-btn-secondary"
                onClick={onClose}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                {cancelText}
              </motion.button>
              <motion.button
                type="button"
                className={`confirm-modal-btn confirm-modal-btn-primary ${
                  variant === 'danger' ? 'confirm-modal-btn-danger' : ''
                }`}
                onClick={handleConfirm}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmModal;
