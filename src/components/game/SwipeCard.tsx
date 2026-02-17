// Tinder-style swipe card for voting.
// Swipe right = like, swipe left = dislike.
// Border glow + icon reveal feedback (no text stamps).
// Supports card stack positioning and first-card wiggle.

import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useState, useCallback, useRef, useEffect } from 'react';

interface SwipeCardProps {
  nftId: string;
  name: string;
  editionNumber: number;
  imageUrl: string;
  onVote: (voteType: 1 | -1) => void;
  stackPosition?: 0 | 1 | 2;
  isFirst?: boolean;
  reducedMotion?: boolean;
}

const SWIPE_THRESHOLD = 100;

// Stack positions: current, next, preloaded
const STACK_CONFIGS = [
  { scale: 1, y: 0, opacity: 1 },
  { scale: 0.95, y: 8, opacity: 0.7 },
  { scale: 0.90, y: 16, opacity: 0.4 },
] as const;

// Inline SVG icons for drag feedback
function CheckSvg() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <polyline points="12,24 20,34 36,16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossSvg() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <line x1="14" y1="14" x2="34" y2="34" strokeLinecap="round" />
      <line x1="34" y1="14" x2="14" y2="34" strokeLinecap="round" />
    </svg>
  );
}

export function SwipeCard({
  name,
  editionNumber,
  imageUrl,
  onVote,
  stackPosition = 0,
  isFirst = false,
  reducedMotion = false,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const [exiting, setExiting] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [shouldWiggle, setShouldWiggle] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isInteractive = stackPosition === 0 && !exiting;
  const config = STACK_CONFIGS[stackPosition];

  // Rotation on drag (reduced from +-15 to +-12 for subtlety)
  const rotate = useTransform(x, [-200, 200], reducedMotion ? [0, 0] : [-12, 12]);

  // Right glow opacity (like)
  const glowRightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.5]);
  // Left glow opacity (dislike)
  const glowLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.5, 0]);

  // Background tint opacity
  const tintLikeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.12]);
  const tintDislikeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.12, 0]);

  // Icon reveal: only past half-threshold
  const checkOpacity = useTransform(x, [50, SWIPE_THRESHOLD], [0, 1]);
  const crossOpacity = useTransform(x, [-SWIPE_THRESHOLD, -50], [1, 0]);

  // Shadow lift during drag
  const dragShadow = useTransform(
    x,
    [-200, 0, 200],
    [
      '0 8px 30px rgba(0,0,0,0.4)',
      'var(--shadow-card)',
      '0 8px 30px rgba(0,0,0,0.4)',
    ]
  );

  // Parallax state (desktop only)
  const [imageTransform, setImageTransform] = useState('translate(0, 0) scale(1)');
  const supportsHover = useRef(false);

  useEffect(() => {
    supportsHover.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  // First-card wiggle
  useEffect(() => {
    if (isFirst && !reducedMotion && stackPosition === 0) {
      try {
        if (!localStorage.getItem('wojak_vote_first_visit')) {
          setShouldWiggle(true);
        }
      } catch {
        // localStorage unavailable
      }
    }
  }, [isFirst, reducedMotion, stackPosition]);

  const handleWiggleEnd = useCallback(() => {
    setShouldWiggle(false);
    try {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => localStorage.setItem('wojak_vote_first_visit', '1'));
      } else {
        localStorage.setItem('wojak_vote_first_visit', '1');
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!supportsHover.current || reducedMotion || stackPosition !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Shift image 2-3px opposite to mouse
    const dx = -((e.clientX - centerX) / rect.width) * 3;
    const dy = -((e.clientY - centerY) / rect.height) * 3;
    setImageTransform(`translate(${dx}px, ${dy}px) scale(1)`);
  }, [reducedMotion, stackPosition]);

  const handleMouseLeave = useCallback(() => {
    setImageTransform('translate(0, 0) scale(1)');
  }, []);

  const handleDragStart = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.willChange = 'transform';
    }
    if (!reducedMotion && supportsHover.current) {
      setImageTransform('translate(0, 0) scale(1.02)');
    }
  }, [reducedMotion]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (cardRef.current) {
      cardRef.current.style.willChange = 'auto';
    }
    setImageTransform('translate(0, 0) scale(1)');

    if (Math.abs(info.offset.x) >= SWIPE_THRESHOLD) {
      setExiting(true);
      const voteType: 1 | -1 = info.offset.x > 0 ? 1 : -1;
      // Fire vote immediately, don't wait for animation
      onVote(voteType);
    }
  }, [onVote]);

  // Programmatic vote (from button/keyboard)
  const triggerVote = useCallback((voteType: 1 | -1) => {
    setExiting(true);
    onVote(voteType);
  }, [onVote]);

  // Expose triggerVote for parent to call via ref
  // (Parent will use button callbacks instead, so this is internal)
  void triggerVote; // used by parent via onVote callback pattern

  const exitX = x.get() >= 0 ? 500 : -500;

  return (
    <motion.div
      ref={cardRef}
      className={`vote-card ${shouldWiggle ? 'vote-card-wiggle' : ''}`}
      style={{
        x: isInteractive ? x : undefined,
        rotate: isInteractive ? rotate : undefined,
        boxShadow: isInteractive ? dragShadow : undefined,
        position: stackPosition > 0 ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3 - stackPosition,
        pointerEvents: isInteractive ? 'auto' : 'none',
      }}
      drag={isInteractive ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragDirectionLock
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseMove={isInteractive ? handleMouseMove : undefined}
      onMouseLeave={isInteractive ? handleMouseLeave : undefined}
      onAnimationEnd={shouldWiggle ? handleWiggleEnd : undefined}
      initial={false}
      animate={
        exiting
          ? reducedMotion
            ? { opacity: 0 }
            : { x: exitX, opacity: 0, rotate: exitX > 0 ? 15 : -15 }
          : { scale: config.scale, y: config.y, opacity: config.opacity }
      }
      transition={
        exiting
          ? { duration: 0.2, ease: 'easeOut' }
          : { type: 'spring', stiffness: 200, damping: 20 }
      }
      aria-hidden={stackPosition > 0 ? true : undefined}
    >
      {/* Glow overlays */}
      {isInteractive && (
        <>
          <motion.div className="vote-card-glow-right" style={{ '--glow-opacity': glowRightOpacity } as React.CSSProperties} />
          <motion.div className="vote-card-glow-left" style={{ '--glow-opacity': glowLeftOpacity } as React.CSSProperties} />
        </>
      )}

      {/* Image */}
      <div className="vote-card-image">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={`Your Wojak #${editionNumber}: ${name}`}
          draggable={false}
          loading="eager"
          onLoad={() => setImgLoaded(true)}
          style={{
            opacity: imgLoaded ? 1 : 0,
            transform: isInteractive ? imageTransform : undefined,
            transition: 'transform 100ms ease',
          }}
        />

        {/* Color tint overlay */}
        {isInteractive && (
          <>
            <motion.div
              className="vote-card-tint"
              style={{ background: 'rgba(34, 197, 94, 1)', opacity: tintLikeOpacity }}
            />
            <motion.div
              className="vote-card-tint"
              style={{ background: 'rgba(239, 68, 68, 1)', opacity: tintDislikeOpacity }}
            />
          </>
        )}

        {/* Icon overlays */}
        {isInteractive && (
          <>
            <motion.div className="vote-card-icon-overlay" style={{ opacity: checkOpacity }}>
              <CheckSvg />
            </motion.div>
            <motion.div className="vote-card-icon-overlay" style={{ opacity: crossOpacity }}>
              <CrossSvg />
            </motion.div>
          </>
        )}
      </div>

      {/* Info bar */}
      <div className="vote-card-info">
        <span className="vote-card-info-name">{name}</span>
        <span className="vote-card-info-edition">#{editionNumber}</span>
      </div>
    </motion.div>
  );
}

// Re-export nftId-to-image-URL helper
export function getNftImageUrl(nftId: string): string {
  return `https://assets.mintgarden.io/thumbnails/medium/${nftId}.png`;
}
