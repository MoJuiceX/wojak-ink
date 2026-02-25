// Vote buttons: full-width pill buttons for Fade/Glaze.
// Keyboard shortcuts: ← fade, → glaze (desktop only).
// Buttons scale in response to swipe direction for visual connection.

import { motion } from 'framer-motion';
import { useEffect, useRef, memo } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

interface VoteButtonsProps {
  onLike: () => void;
  onDislike: () => void;
  disabled: boolean;
  feedbackType?: 'glaze' | 'fade' | null;
}

export const VoteButtons = memo(function VoteButtons({
  onLike,
  onDislike,
  disabled,
  feedbackType = null,
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

  // Enhanced tap feedback: scale + press down effect
  const tapAnimation = reducedMotion
    ? {}
    : {
        scale: 0.92,
        y: 2,
        transition: { duration: 0.08, ease: 'easeOut' as const }
      };

  return (
    <div className={`vote-buttons-row${feedbackType ? ` is-${feedbackType}` : ''}`}>
      <motion.button
        className={`btn vote-btn-pill vote-btn-fade${feedbackType === 'fade' ? ' recently-picked' : ''}`}
        onClick={onDislike}
        disabled={disabled}
        aria-label="Fade this Wojak"
        whileTap={tapAnimation}
      >
        <span className="vote-btn-label">🗑️ Fade</span>
      </motion.button>

      <motion.button
        className={`btn vote-btn-pill vote-btn-glaze${feedbackType === 'glaze' ? ' recently-picked' : ''}`}
        onClick={onLike}
        disabled={disabled}
        aria-label="Glaze this Wojak"
        whileTap={tapAnimation}
      >
        <span className="vote-btn-label">🍩 Glaze</span>
      </motion.button>
    </div>
  );
});
