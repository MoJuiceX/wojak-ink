/**
 * Tooltip Component
 *
 * Behavior by input type:
 *   Desktop (hover: hover) — show on mouseenter, hide on mouseleave or click.
 *   Mobile (hover: none)   — show on long-press (~400ms hold), auto-dismiss after 1.5s.
 *                             Normal taps perform the button action without showing tooltip.
 *   Both                   — dismiss on scroll, touch elsewhere, or any click inside.
 *                             3s auto-dismiss safety net prevents permanently stuck state.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom';
}

export function Tooltip({ children, text, position = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reactively track whether the device supports hover
  const [hasHover, setHasHover] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(hover: hover)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    const onChange = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, []);

  // When visible: dismiss on any touch or scroll outside
  useEffect(() => {
    if (!isVisible) return;
    const dismiss = () => setIsVisible(false);
    window.addEventListener('touchstart', dismiss, { passive: true, capture: true });
    window.addEventListener('scroll', dismiss, { passive: true, capture: true });
    return () => {
      window.removeEventListener('touchstart', dismiss, { capture: true });
      window.removeEventListener('scroll', dismiss, { capture: true });
    };
  }, [isVisible]);

  const show = useCallback(() => {
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    setIsVisible(true);
    // Safety net: auto-dismiss after 3s no matter what
    autoDismissTimer.current = setTimeout(() => setIsVisible(false), 3000);
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
  }, []);

  const hideDelayed = useCallback(() => {
    autoDismissTimer.current = setTimeout(() => setIsVisible(false), 100);
  }, []);

  // Desktop: hover to show, leave or click to hide
  const hoverHandlers = hasHover
    ? { onMouseEnter: show, onMouseLeave: hideDelayed }
    : {};

  // Mobile: long-press (400ms hold) to show, auto-dismiss after 1.5s
  const touchHandlers = !hasHover
    ? {
        onTouchStart: () => {
          longPressTimer.current = setTimeout(() => {
            show();
            if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
            autoDismissTimer.current = setTimeout(() => setIsVisible(false), 1500);
          }, 400);
        },
        onTouchEnd: () => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        },
        onTouchMove: () => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        },
      }
    : {};

  return (
    <div
      className="relative inline-flex"
      {...hoverHandlers}
      {...touchHandlers}
      onClick={isVisible ? hide : undefined}
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
