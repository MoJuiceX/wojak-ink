// Vote buttons: full-width pill buttons for Fade/Glaze.
// Keyboard shortcuts: ← fade, → glaze (desktop only).

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

interface VoteButtonsProps {
  onLike: () => void;
  onDislike: () => void;
  disabled: boolean;
}

export function VoteButtons({
  onLike,
  onDislike,
  disabled,
}: VoteButtonsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const supportsHover = useRef(false);

  useEffect(() => {
    supportsHover.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  // Keyboard shortcuts (desktop only)
  useEffect(() => {
    if (!supportsHover.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || disabled) return;
      // Don't capture if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          onLike();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onDislike();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onLike, onDislike]);

  const tapAnimation = reducedMotion
    ? {}
    : { scale: 0.96, transition: { duration: 0.06, ease: 'easeOut' as const } };

  return (
    <div className="vote-buttons-row">
      <motion.button
        className="btn btn-secondary vote-btn-pill"
        onClick={onDislike}
        disabled={disabled}
        aria-label="Fade this Wojak"
        whileTap={tapAnimation}
      >
        🗑️ Fade
      </motion.button>

      <motion.button
        className="btn btn-secondary vote-btn-pill"
        onClick={onLike}
        disabled={disabled}
        aria-label="Glaze this Wojak"
        whileTap={tapAnimation}
      >
        🍩 Glaze
      </motion.button>
    </div>
  );
}
