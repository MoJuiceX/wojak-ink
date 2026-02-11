/**
 * Lightbox Component
 *
 * Reusable centered lightbox/modal for the account page.
 * Matches NFT gallery desktop lightbox style.
 *
 * Features:
 * - Full accessibility (ARIA, focus trap, keyboard navigation)
 * - Mobile full-screen, desktop centered
 * - Framer Motion animations with reduced motion support
 * - Body scroll lock when open
 * - Escape key and click outside to close
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import './Lightbox.css';

export interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gallery';
  /** Element to return focus to when lightbox closes */
  triggerRef?: React.RefObject<HTMLElement>;
}

const SIZE_MAP = {
  sm: '480px',
  md: '600px',
  lg: '800px',
  xl: '1000px',
  /** Matches gallery NFT lightbox: 1100×680 */
  gallery: '1100px',
};

export function Lightbox({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  triggerRef,
}: LightboxProps) {
  const prefersReducedMotion = useReducedMotion();
  const lightboxRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the element that opened the lightbox
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus trap and return focus on close
  useEffect(() => {
    if (!isOpen) {
      // Return focus to trigger element or previous element
      const returnElement = triggerRef?.current || previousActiveElement.current;
      if (returnElement && typeof returnElement.focus === 'function') {
        // Small delay to ensure animation completes
        setTimeout(() => returnElement.focus(), 50);
      }
      return;
    }

    // Focus the lightbox when it opens
    if (lightboxRef.current) {
      lightboxRef.current.focus();
    }

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, triggerRef]);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap - Tab and Shift+Tab
      if (e.key === 'Tab' && lightboxRef.current) {
        const focusableElements = lightboxRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements);
        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [onClose]
  );

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const contentVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0 },
      };

  const transitionConfig = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: 'spring' as const, damping: 25, stiffness: 300 };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="lightbox-portal">
          {/* Backdrop */}
          <motion.div
            className="lightbox-overlay"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: prefersReducedMotion ? 0.1 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Content */}
          <motion.div
            ref={lightboxRef}
            className={`lightbox-content ${size === 'gallery' ? 'lightbox-gallery' : ''}`}
            style={{ '--lightbox-max-width': SIZE_MAP[size] } as React.CSSProperties}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitionConfig}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'lightbox-title' : undefined}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            {title && (
              <div className="lightbox-header">
                <h2 id="lightbox-title" className="lightbox-title">
                  {title}
                </h2>
                <button
                  type="button"
                  className="lightbox-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Close button if no title */}
            {!title && (
              <button
                type="button"
                className="lightbox-close lightbox-close--floating"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}

            {/* Body */}
            <div className="lightbox-body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Lightbox;
