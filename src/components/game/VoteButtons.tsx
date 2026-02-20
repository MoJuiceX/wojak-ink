// Vote buttons: full-width pill buttons for Pass/Like.
// Keyboard shortcuts: ← dislike, → like (desktop only).

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

  const tapAnimation = reducedMotion ? {} : { scale: 0.85 };

  return (
    <div className="vote-buttons-row">
      <motion.button
        className="btn btn-secondary vote-btn-pill"
        onClick={onDislike}
        disabled={disabled}
        aria-label="Pass on this Wojak"
        whileTap={tapAnimation}
      >
        👎 Pass
      </motion.button>

      <motion.button
        className="btn btn-primary vote-btn-pill"
        onClick={onLike}
        disabled={disabled}
        aria-label="Like this Wojak"
        whileTap={tapAnimation}
      >
        ❤️ Like
      </motion.button>
    </div>
  );
}
