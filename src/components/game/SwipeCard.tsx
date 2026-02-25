// Tinder-style swipe card for voting.
// Swipe right = like, swipe left = dislike.
// Border glow + icon reveal feedback (no text stamps).
// Supports card stack positioning and first-card wiggle.

import { motion, useMotionValue, useTransform, useMotionValueEvent, useAnimationControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useState, useCallback, useRef, useEffect, useLayoutEffect, memo } from 'react';

// Haptic patterns for premium feedback
const HAPTIC_PATTERNS = {
  glaze: {
    light: [5],
    medium: [10, 30, 20],
    strong: [15, 25, 20, 25, 25], // Celebratory rising pattern
  },
  fade: {
    light: [8],
    medium: [15, 20, 10],
    strong: [20, 15, 15, 15, 10], // Sharp dismissive pattern
  },
} as const;

interface SwipeCardProps {
  nftId: string;
  name: string;
  editionNumber: number;
  imageUrl: string;
  /** MintGarden mainnet CDN (from image_hash). Prefer this when present for reliable load. */
  thumbnailUri?: string | null;
  onVote: (voteType: 1 | -1) => void;
  stackPosition?: 0 | 1 | 2;
  isFirst?: boolean;
  reducedMotion?: boolean;
  exitDirection?: 1 | -1 | null; // 1 = right (like), -1 = left (dislike)
  /** Called when exit animation completes (so parent can remove from feed immediately) */
  onExitComplete?: () => void;
  /** Voting stats for the footer context */
  likes?: number;
  dislikes?: number;
  totalVotes?: number;
}

const SWIPE_THRESHOLD = 100;
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%2312121a'%3E%3Crect width='200' height='200' rx='14'/%3E%3Ctext x='100' y='108' text-anchor='middle' fill='%23606070' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";
/** Working MintGarden CDN (mainnet); launcher-ID URL may 404 but we try as fallback */
const MINTGARDEN_MAINNET_MEDIUM = (nftId: string) =>
  `https://assets.mainnet.mintgarden.io/thumbnails/medium/${nftId}.png`;

// Stack: all cards same scale, just offset to show stack effect
// No scale change on promotion = no "growing" animation
const STACK_CONFIGS = [
  { scale: 1, y: 0, opacity: 1 },
  { scale: 1, y: 8, opacity: 1 },
  { scale: 1, y: 16, opacity: 1 },
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

export const SwipeCard = memo(function SwipeCard({
  nftId,
  name,
  editionNumber,
  imageUrl,
  thumbnailUri,
  onVote,
  stackPosition = 0,
  isFirst = false,
  reducedMotion = false,
  exitDirection = null,
  onExitComplete,
  likes = 0,
  dislikes = 0,
  totalVotes = 0,
}: SwipeCardProps) {
  const voteScore = likes - dislikes;
  const x = useMotionValue(0);
  const [swipeExiting, setSwipeExiting] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [shouldWiggle, setShouldWiggle] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fallbackStepRef = useRef(0);
  const exitCompleteFired = useRef(false);
  const thresholdHapticFired = useRef(false);
  const exitVelocityRef = useRef(0);
  const controls = useAnimationControls();
  const hasStartedExit = useRef(false);
  const primaryUrl = thumbnailUri || imageUrl;
  const secondaryUrl = thumbnailUri ? imageUrl : null;
  const tertiaryUrl = MINTGARDEN_MAINNET_MEDIUM(nftId);

  // Exiting can be triggered by swipe gesture OR parent setting exitDirection
  const exiting = swipeExiting || (exitDirection !== null && stackPosition === 0);
  const isInteractive = stackPosition === 0 && !exiting;
  const exitSign = exitDirection || (x.get() >= 0 ? 1 : -1);

  // Trigger exit animation imperatively (useLayoutEffect for immediate start, no frame delay)
  useLayoutEffect(() => {
    if (exiting && !hasStartedExit.current) {
      hasStartedExit.current = true;
      controls.start({
        x: exitSign * 700,
        rotate: exitSign * 12,
        transition: { duration: 0.4, ease: 'easeOut' }
      });
    }
  }, [exiting, controls, exitSign]);


  const config = STACK_CONFIGS[stackPosition];


  // Subtle rotation on drag
  const rotate = useTransform(x, [-200, 200], [-8, 8]);

  // Right glow opacity (like) - exponential curve for dramatic reveal
  const glowRightOpacity = useTransform(
    x,
    [0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD * 0.7, SWIPE_THRESHOLD],
    [0, 0.1, 0.35, 0.65]
  );
  // Left glow opacity (dislike)
  const glowLeftOpacity = useTransform(
    x,
    [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.7, -SWIPE_THRESHOLD * 0.3, 0],
    [0.65, 0.35, 0.1, 0]
  );

  // Background tint opacity - stronger tint for clearer feedback
  const tintLikeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.18]);
  const tintDislikeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.18, 0]);

  // Icon reveal with scale - icons "pop" into view
  const checkOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const checkScale = useTransform(x, [40, SWIPE_THRESHOLD], [0.5, 1]);
  const crossOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const crossScale = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0.5]);

  // Shadow stays consistent
  const dragShadow = 'var(--shadow-card)';

  // Parallax state (desktop only)
  const [imageTransform, setImageTransform] = useState('translate(0, 0) scale(1)');
  const supportsHover = useRef(false);

  useEffect(() => {
    supportsHover.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  // Premium haptics on threshold crossing
  useMotionValueEvent(x, 'change', (latest) => {
    const absX = Math.abs(latest);
    if (absX >= SWIPE_THRESHOLD && !thresholdHapticFired.current) {
      thresholdHapticFired.current = true;
      if (typeof navigator?.vibrate === 'function') {
        const pattern = latest > 0 ? HAPTIC_PATTERNS.glaze.light : HAPTIC_PATTERNS.fade.light;
        navigator.vibrate(pattern);
      }
    }
    // Reset when returning below 50% of threshold
    if (absX < SWIPE_THRESHOLD * 0.5) {
      thresholdHapticFired.current = false;
    }
  });

  // First-card wiggle (defer setState to avoid set-state-in-effect lint)
  useEffect(() => {
    if (isFirst && !reducedMotion && stackPosition === 0) {
      try {
        if (!localStorage.getItem('wojak_vote_first_visit')) {
          const id = setTimeout(() => setShouldWiggle(true), 0);
          return () => clearTimeout(id);
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
      // Capture velocity for spring exit (swipe momentum)
      exitVelocityRef.current = info.velocity.x;
      setSwipeExiting(true);
      const voteType: 1 | -1 = info.offset.x > 0 ? 1 : -1;

      // Strong haptic on confirmed vote
      if (typeof navigator?.vibrate === 'function') {
        const pattern = voteType === 1 ? HAPTIC_PATTERNS.glaze.strong : HAPTIC_PATTERNS.fade.strong;
        navigator.vibrate(pattern);
      }

      onVote(voteType);
    }
  }, [onVote]);

  // Programmatic vote (from button/keyboard)
  const triggerVote = useCallback((voteType: 1 | -1) => {
    setSwipeExiting(true);
    onVote(voteType);
  }, [onVote]);

  // Expose triggerVote for parent to call via ref
  // (Parent will use button callbacks instead, so this is internal)
  void triggerVote; // used by parent via onVote callback pattern

  // Transition for stack promotion
  const promoteTransition = { duration: 0.25, ease: 'easeOut' as const };

  const handleExitCompleteCallback = useCallback(() => {
    if (exitCompleteFired.current) return;
    exitCompleteFired.current = true;
    // Double rAF ensures the final animation frame is painted before we signal completion
    // This prevents race conditions where removeFromFeed happens before visual exit is done
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onExitComplete?.();
      });
    });
  }, [onExitComplete]);

  return (
    <motion.div
      ref={cardRef}
      className={`vote-card ${shouldWiggle ? 'vote-card-wiggle' : ''}`}
      style={{
        x: isInteractive ? x : undefined,
        rotate: isInteractive ? rotate : undefined,
        boxShadow: isInteractive ? dragShadow : undefined,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3 - stackPosition,
        pointerEvents: isInteractive ? 'auto' : 'none',
        willChange: exiting ? 'transform' : undefined,
      }}
      drag={isInteractive ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      dragTransition={{ bounceStiffness: 500, bounceDamping: 25 }}
      dragDirectionLock
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseMove={isInteractive ? handleMouseMove : undefined}
      onMouseLeave={isInteractive ? handleMouseLeave : undefined}
      onAnimationEnd={shouldWiggle ? handleWiggleEnd : undefined}
      onAnimationComplete={
        exiting && stackPosition === 0 && onExitComplete ? handleExitCompleteCallback : undefined
      }
      initial={false}
      animate={exiting ? controls : { y: config.y, opacity: config.opacity }}
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      transition={promoteTransition}
      aria-hidden={stackPosition > 0 ? true : undefined}
    >
      {/* Glow overlays */}
      {isInteractive && (
        <>
          <motion.div className="vote-card-glow-right" style={{ '--glow-opacity': glowRightOpacity } as React.CSSProperties} />
          <motion.div className="vote-card-glow-left" style={{ '--glow-opacity': glowLeftOpacity } as React.CSSProperties} />
        </>
      )}

      {/* Image: prefer thumbnailUri (MintGarden mainnet CDN), then IPFS, then mainnet launcher URL, then placeholder */}
      <div className="vote-card-image">
        {/* Exit overlay: smooth color pulse */}
        {exiting && stackPosition === 0 && exitDirection && !reducedMotion && (
          <motion.div
            className="vote-card-exit-overlay"
            aria-hidden
            style={{
              background: exitDirection === 1
                ? 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(34, 197, 94, 0.45), rgba(34, 197, 94, 0.15) 50%, transparent 75%)'
                : 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(50, 50, 60, 0.5), rgba(35, 35, 45, 0.2) 50%, transparent 75%)',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: [0, 0.7, 0.3],
              scale: [0.95, 1.05, 1.1],
            }}
            transition={{
              duration: 0.35,
              ease: [0.25, 0.1, 0.25, 1], // Smooth ease
            }}
          />
        )}
        <img
          ref={imageRef}
          src={primaryUrl}
          alt={`Your Wojak #${editionNumber}: ${name}`}
          draggable={false}
          loading="eager"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            const step = fallbackStepRef.current;
            if (step === 0 && secondaryUrl) {
              fallbackStepRef.current = 1;
              el.src = secondaryUrl;
            } else if (step <= 1) {
              fallbackStepRef.current = 2;
              el.src = tertiaryUrl;
            } else {
              el.src = FALLBACK_IMG;
            }
            setImgLoaded(true);
          }}
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

        {/* Icon overlays with scale - icons "pop" into view */}
        {isInteractive && (
          <>
            <motion.div className="vote-card-icon-overlay" style={{ opacity: checkOpacity, scale: checkScale }}>
              <CheckSvg />
            </motion.div>
            <motion.div className="vote-card-icon-overlay" style={{ opacity: crossOpacity, scale: crossScale }}>
              <CrossSvg />
            </motion.div>
          </>
        )}
      </div>

      {/* Info bar — compact voting context */}
      <div className="vote-card-info">
        <div className="vote-card-info-main">
          <div className="vote-card-info-top">
            <div className="vote-card-info-titleline">
              <span className="vote-card-info-edition">#{editionNumber}</span>
              <span className="vote-card-info-separator" aria-hidden>&middot;</span>
              <span className="vote-card-info-name">{name}</span>
            </div>
          </div>
          <div className="vote-card-info-stats" aria-label={`Score ${voteScore}. ${totalVotes} votes.`}>
            <span className="vote-card-stat vote-card-stat-chip">
              <span className="vote-card-stat-label">Score</span>
              <span className={voteScore > 0 ? 'text-success' : voteScore < 0 ? 'text-error' : 'text-secondary'}>
                {voteScore > 0 ? '+' : ''}{voteScore}
              </span>
            </span>
            <span className="vote-card-stat vote-card-stat-chip">
              <span className="vote-card-stat-label">Votes</span>
              <span className="text-secondary">{totalVotes}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
