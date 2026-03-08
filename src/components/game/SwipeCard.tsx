// Tinder-style swipe card for voting.
// Swipe right = glaze, swipe left = fade.
// Simple AnimatePresence-based exit animation.

import { motion, useMotionValue, useTransform, useMotionValueEvent, animate } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useState, useCallback, useRef, useEffect, useLayoutEffect, memo } from 'react';
import { safeStorage } from '@/utils/safeStorage';

const SWIPE_THRESHOLD = 100;

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%2312121a'%3E%3Crect width='200' height='200' rx='14'/%3E%3Ctext x='100' y='108' text-anchor='middle' fill='%23606070' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";
const MINTGARDEN_MAINNET_MEDIUM = (nftId: string) =>
  `https://assets.mainnet.mintgarden.io/thumbnails/medium/${nftId}.png`;

const STACK_CONFIGS = [
  { y: 0, scale: 1 },
  { y: 10, scale: 0.97 },
  { y: 20, scale: 0.94 },
] as const;

// Haptic patterns
const HAPTIC_LIGHT = { glaze: [5], fade: [8] } as const;

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

export interface SwipeCardProps {
  nftId: string;
  name: string;
  editionNumber: number;
  imageUrl: string;
  thumbnailUri?: string | null;
  onVote: (voteType: 1 | -1) => void;
  onExitComplete?: () => void;
  stackPosition?: 0 | 1 | 2;
  isFirst?: boolean;
  reducedMotion?: boolean;
  likes?: number;
  dislikes?: number;
  totalVotes?: number;
  // Exit direction passed from parent - triggers exit animation
  exitDirection?: 1 | -1 | null;
}

export const SwipeCard = memo(function SwipeCard({
  nftId,
  name,
  editionNumber,
  imageUrl,
  thumbnailUri,
  onVote,
  onExitComplete,
  stackPosition = 0,
  isFirst = false,
  reducedMotion = false,
  likes = 0,
  dislikes = 0,
  totalVotes = 0,
  exitDirection = null,
}: SwipeCardProps) {
  // Motion values for drag
  const x = useMotionValue(0);
  const rotation = useMotionValue(0);
  const opacity = useMotionValue(1);
  const rotateFromDrag = useTransform(x, [-200, 200], [-8, 8]);

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);
  const fallbackStepRef = useRef(0);
  const thresholdHapticFired = useRef(false);
  const supportsHover = useRef(false);

  // Ref for onExitComplete to avoid dependency changes triggering re-runs
  const onExitCompleteRef = useRef(onExitComplete);
  useEffect(() => {
    onExitCompleteRef.current = onExitComplete;
  }, [onExitComplete]);

  // Sync rotation with drag when not exiting
  useMotionValueEvent(rotateFromDrag, 'change', (latest) => {
    if (exitDirection === null) {
      rotation.set(latest);
    }
  });

  // Handle exit animation with proper cleanup
  // Use useLayoutEffect to ensure resets happen before paint
  useLayoutEffect(() => {
    let cancelled = false;

    if (exitDirection !== null) {
      // Start exit animations
      const xAnim = animate(x, exitDirection * 450, {
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      });
      const rotAnim = animate(rotation, exitDirection * 18, {
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      });
      const opacAnim = animate(opacity, 0, {
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      });

      // Use fixed timeout for completion - more predictable than promise
      const timer = setTimeout(() => {
        if (!cancelled) {
          onExitCompleteRef.current?.();
        }
      }, 370); // Slightly longer than animation (350ms + buffer)

      // Cleanup
      return () => {
        cancelled = true;
        clearTimeout(timer);
        xAnim.stop();
        rotAnim.stop();
        opacAnim.stop();
      };
    } else {
      // Reset instantly when not exiting
      x.set(0);
      rotation.set(0);
      opacity.set(1);
    }
  }, [exitDirection, stackPosition, x, rotation, opacity]);

  // State
  const [imgLoaded, setImgLoaded] = useState(false);
  const [shouldWiggle, setShouldWiggle] = useState(false);
  const [imageTransform, setImageTransform] = useState('translate(0, 0) scale(1)');

  // Derived
  const voteScore = likes - dislikes;
  const isInteractive = stackPosition === 0 && exitDirection === null;
  const config = STACK_CONFIGS[stackPosition];
  const primaryUrl = thumbnailUri || imageUrl;
  const secondaryUrl = thumbnailUri ? imageUrl : null;
  const tertiaryUrl = MINTGARDEN_MAINNET_MEDIUM(nftId);

  // Glow/tint transforms based on drag position
  const glowRightOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD * 0.7, SWIPE_THRESHOLD], [0, 0.1, 0.35, 0.65]);
  const glowLeftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.7, -SWIPE_THRESHOLD * 0.3, 0], [0.65, 0.35, 0.1, 0]);
  const tintLikeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.18]);
  const tintDislikeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.18, 0]);
  const checkOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const checkScale = useTransform(x, [40, SWIPE_THRESHOLD], [0.5, 1]);
  const crossOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const crossScale = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0.5]);

  // Detect hover support
  useEffect(() => {
    supportsHover.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  // Haptic on threshold crossing during drag
  useMotionValueEvent(x, 'change', (latest) => {
    const absX = Math.abs(latest);
    if (absX >= SWIPE_THRESHOLD && !thresholdHapticFired.current) {
      thresholdHapticFired.current = true;
      if (typeof navigator?.vibrate === 'function') {
        navigator.vibrate(latest > 0 ? HAPTIC_LIGHT.glaze : HAPTIC_LIGHT.fade);
      }
    }
    if (absX < SWIPE_THRESHOLD * 0.5) {
      thresholdHapticFired.current = false;
    }
  });

  // First-card wiggle animation
  useEffect(() => {
    if (isFirst && !reducedMotion && stackPosition === 0) {
      if (!safeStorage.getItem('wojak_vote_first_visit')) {
        const id = setTimeout(() => setShouldWiggle(true), 0);
        return () => clearTimeout(id);
      }
    }
  }, [isFirst, reducedMotion, stackPosition]);

  const handleWiggleEnd = useCallback(() => {
    setShouldWiggle(false);
    safeStorage.setItem('wojak_vote_first_visit', '1');
  }, []);

  // Drag handlers
  const handleDragStart = useCallback(() => {
    if (cardRef.current) cardRef.current.style.willChange = 'transform';
    if (!reducedMotion && supportsHover.current) {
      setImageTransform('translate(0, 0) scale(1.02)');
    }
  }, [reducedMotion]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (cardRef.current) cardRef.current.style.willChange = 'auto';
    setImageTransform('translate(0, 0) scale(1)');

    if (Math.abs(info.offset.x) >= SWIPE_THRESHOLD) {
      const voteType: 1 | -1 = info.offset.x > 0 ? 1 : -1;
      onVote(voteType);
    }
  }, [onVote]);

  // Mouse parallax (desktop)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!supportsHover.current || reducedMotion || stackPosition !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = -((e.clientX - rect.left - rect.width / 2) / rect.width) * 3;
    const dy = -((e.clientY - rect.top - rect.height / 2) / rect.height) * 3;
    setImageTransform(`translate(${dx}px, ${dy}px) scale(1)`);
  }, [reducedMotion, stackPosition]);

  const handleMouseLeave = useCallback(() => {
    setImageTransform('translate(0, 0) scale(1)');
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={`vote-card ${shouldWiggle ? 'vote-card-wiggle' : ''}`}
      style={{
        x,
        rotate: rotation,
        opacity,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: exitDirection !== null ? 10 : 3 - stackPosition,
        pointerEvents: isInteractive ? 'auto' : 'none',
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
      initial={false}
      animate={{
        y: config.y,
        scale: config.scale,
      }}
      transition={{
        duration: 0.25,
        ease: [0.22, 1, 0.36, 1],
      }}
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
        {/* Exit overlay */}
        {exitDirection !== null && stackPosition === 0 && !reducedMotion && (
          <motion.div
            className="vote-card-exit-overlay"
            aria-hidden
            style={{
              background: exitDirection === 1
                ? 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(34, 197, 94, 0.45), rgba(34, 197, 94, 0.15) 50%, transparent 75%)'
                : 'radial-gradient(ellipse 85% 75% at 50% 50%, rgba(50, 50, 60, 0.5), rgba(35, 35, 45, 0.2) 50%, transparent 75%)',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: [0, 0.7, 0.3], scale: [0.95, 1.05, 1.1] }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
        )}
        <img
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
            transform: isInteractive ? imageTransform : 'translate(0, 0) scale(1)',
            transition: 'opacity 150ms ease, transform 100ms ease',
          }}
        />

        {/* Color tint overlay */}
        {isInteractive && (
          <>
            <motion.div className="vote-card-tint" style={{ background: 'rgba(34, 197, 94, 1)', opacity: tintLikeOpacity }} />
            <motion.div className="vote-card-tint" style={{ background: 'rgba(239, 68, 68, 1)', opacity: tintDislikeOpacity }} />
          </>
        )}

        {/* Icon overlays */}
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

      {/* Info bar */}
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
