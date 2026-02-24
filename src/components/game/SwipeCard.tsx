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
  // Debug: Log every render with key props
  console.log('[SWIPE] Render', { nftId: nftId.slice(0, 8), stackPosition, exitDirection, hasOnExitComplete: !!onExitComplete });
  const voteScore = likes - dislikes;
  const x = useMotionValue(0);
  const [swipeExiting, setSwipeExiting] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [shouldWiggle, setShouldWiggle] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fallbackStepRef = useRef(0);
  const exitCompleteFired = useRef(false);
  const primaryUrl = thumbnailUri || imageUrl;
  const secondaryUrl = thumbnailUri ? imageUrl : null;
  const tertiaryUrl = MINTGARDEN_MAINNET_MEDIUM(nftId);

  // Exiting can be triggered by swipe gesture OR parent setting exitDirection
  const exiting = swipeExiting || (exitDirection !== null && stackPosition === 0);
  const isInteractive = stackPosition === 0 && !exiting;
  const config = STACK_CONFIGS[stackPosition];

  // Debug logging for exit state changes
  if (stackPosition === 0 && exitDirection !== null) {
    console.log('[SWIPE] Card exiting', { nftId, exitDirection, exiting, swipeExiting, stackPosition });
  }

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
      setSwipeExiting(true);
      const voteType: 1 | -1 = info.offset.x > 0 ? 1 : -1;
      // Fire vote immediately, don't wait for animation
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

  // Exit direction: from swipe gesture, button click, or default right
  const exitX = exitDirection ? exitDirection * 520 : (x.get() >= 0 ? 520 : -520);
  // Glaze = card stays vivid (opacity 0.92); fade = card dissolves (opacity 0)
  const exitOpacity = exitDirection === 1 ? 0.92 : 0;

  // Snappy exit; only transform + opacity (GPU-friendly)
  const exitTransition = reducedMotion
    ? { duration: 0.12 }
    : { duration: 0.26, ease: [0.22, 0.0, 0.15, 1] as const };
  const promoteTransition = { type: 'spring' as const, stiffness: 320, damping: 30 };

  const handleExitCompleteCallback = useCallback(() => {
    console.log('[SWIPE] handleExitCompleteCallback called', { nftId, exitCompleteFired: exitCompleteFired.current, hasOnExitComplete: !!onExitComplete });
    if (exitCompleteFired.current) {
      console.log('[SWIPE] Already fired, skipping');
      return;
    }
    exitCompleteFired.current = true;
    console.log('[SWIPE] Calling onExitComplete');
    onExitComplete?.();
  }, [onExitComplete, nftId]);

  return (
    <motion.div
      ref={cardRef}
      className={`vote-card ${shouldWiggle ? 'vote-card-wiggle' : ''} ${stackPosition === 0 ? 'vote-card-entrance' : ''}`}
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
        willChange: exiting ? 'transform, opacity' : undefined,
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
      onAnimationComplete={
        exiting && stackPosition === 0 && onExitComplete ? handleExitCompleteCallback : undefined
      }
      initial={stackPosition === 0 ? { opacity: 0, y: 20, scale: 0.96 } : false}
      animate={
        exiting
          ? reducedMotion
            ? { opacity: 0 }
            : { x: exitX, opacity: exitOpacity, rotate: exitX > 0 ? 12 : -12 }
          : { scale: config.scale, y: config.y, opacity: config.opacity }
      }
      exit={
        reducedMotion
          ? { opacity: 0 }
          : { x: exitX, opacity: exitOpacity, rotate: exitX > 0 ? 12 : -12 }
      }
      transition={
        exiting
          ? exitTransition
          : stackPosition === 0
            ? { duration: 0.45, ease: [0.23, 1, 0.32, 1] as const }
            : promoteTransition
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

      {/* Image: prefer thumbnailUri (MintGarden mainnet CDN), then IPFS, then mainnet launcher URL, then placeholder */}
      <div className="vote-card-image">
        {/* Brief glaze/fade tint on exit — opacity only for smooth 60fps */}
        {exiting && stackPosition === 0 && exitDirection && !reducedMotion && (
          <motion.div
            className="vote-card-exit-overlay"
            aria-hidden
            style={{
              background: exitDirection === 1
                ? 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(34, 197, 94, 0.35), transparent 65%)'
                : 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(30, 30, 40, 0.6), transparent 65%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.2, times: [0, 0.35, 1], ease: 'easeOut' }}
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
}
