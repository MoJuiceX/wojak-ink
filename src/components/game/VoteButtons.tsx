// Circular vote buttons: dislike (X), like (heart).
// Keyboard shortcuts: ← dislike, → like (desktop only).

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

interface VoteButtonsProps {
  onLike: () => void;
  onDislike: () => void;
  disabled: boolean;
}

// SVG icons — 2px stroke, no fill

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
    </svg>
  );
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
    <div className="flex flex-col items-center gap-2">
      {/* Like / Dislike row */}
      <div className="flex items-center" style={{ gap: 40 }}>
        <motion.button
          className="vote-btn vote-btn-dislike"
          onClick={onDislike}
          disabled={disabled}
          aria-label="Dislike this Wojak"
          whileTap={tapAnimation}
        >
          <XIcon />
        </motion.button>

        <motion.button
          className="vote-btn vote-btn-like"
          onClick={onLike}
          disabled={disabled}
          aria-label="Like this Wojak"
          whileTap={tapAnimation}
        >
          <HeartIcon />
        </motion.button>
      </div>
    </div>
  );
}
