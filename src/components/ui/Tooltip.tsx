/**
 * Tooltip Component
 *
 * Simple tooltip that appears on hover/tap.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom';
}

export function Tooltip({ children, text, position = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const handleTouchStart = () => {
    showTooltip();
    // Auto-hide after 1.5s on mobile
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 1500);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={handleTouchStart}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-50"
            style={{
              [position === 'top' ? 'bottom' : 'top']: '100%',
              marginTop: position === 'bottom' ? '8px' : undefined,
              marginBottom: position === 'top' ? '8px' : undefined,
            }}
            initial={{ opacity: 0, y: position === 'bottom' ? -4 : 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? -4 : 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div
              className="px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap text-primary"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 4px 12px var(--color-black-30)',
              }}
            >
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Tooltip;
