# Voting Page UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Design doc:** `docs/plans/2026-02-17-voting-page-design.md`

**Goal:** Upgrade the existing skeleton voting page into a premium Tinder-style swipe experience with 3-column desktop layout, 3-card stack, progressive gate flow, post-round summary, and full accessibility.

**Architecture:** The backend APIs and basic components already exist (GameContext, SwipeCard, VotingFeed, PowerLevelDisplay, OnboardingChecklist). This plan upgrades each component to match the design spec, then wires them into a polished page layout. Pure frontend work — no backend changes.

**Tech Stack:** React, Framer Motion 12.x, Lucide React icons, existing spring/animation presets from `src/config/springs.ts` and `src/config/animations.ts`, existing toast system from `src/contexts/ToastContext.tsx`.

**Before starting:** Read `CLAUDE.md`, `.claude/instructions/PROMPT-PRINCIPLES.md`, `docs/plans/2026-02-17-voting-page-design.md`

---

## Existing Files to Modify

These files were created by the game implementation plan and need upgrading:

| File | Current State | Target State |
|------|--------------|-------------|
| `src/components/game/SwipeCard.tsx` | Basic drag, "LIKE"/"NOPE" text, emoji buttons | Border glow, ✓/✕ icons, SVG buttons, parallax, reduced motion |
| `src/components/game/VotingFeed.tsx` | Single card, 5 separate gate screens, no loading skeleton | 3-card stack, progressive gate checklist, skeleton, error, post-round |
| `src/pages/GameVoting.tsx` | Simple wrapper, no layout | 3-column desktop, mobile stats bar, side panels |
| `src/contexts/GameContext.tsx` | Basic state | Add undo, session tracking (likes/dislikes count), leaderboard fetch |
| `src/components/game/OnboardingChecklist.tsx` | Simple checklist | Progressive gate card with step descriptions + action buttons |
| `src/components/game/PowerLevelDisplay.tsx` | Dashboard card | Compact version for right side panel |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/components/game/CardStack.tsx` | 3-card stack manager (current + next + preloaded) |
| `src/components/game/GateChecklist.tsx` | Progressive onboarding gate (replaces 5 dead-end screens) |
| `src/components/game/MiniLeaderboard.tsx` | Left panel — top 10 Power Level |
| `src/components/game/StatsPanel.tsx` | Right panel — Power Level + votes progress + onboarding |
| `src/components/game/MobileStatsBar.tsx` | Mobile compact stats (2 segments) |
| `src/components/game/PostRoundSummary.tsx` | Session complete screen (10/10 votes) |
| `src/components/game/SkeletonCard.tsx` | Loading placeholder card |
| `src/components/game/VoteButtons.tsx` | SVG icon buttons + undo |

---

## Task 1: Upgrade SwipeCard to Design Spec

**Files:**
- Modify: `src/components/game/SwipeCard.tsx`
- Modify: `src/styles/theme.css` (add/update swipe card styles)

**Step 1: Rewrite SwipeCard.tsx**

Replace the entire file. The new version:
- Removes "LIKE"/"NOPE" text stamps
- Adds border glow feedback (green right, red left)
- Adds ✓/✕ icon reveal at center of image
- Adds background color tint (12% opacity green/red)
- Uses `dragDirectionLock` to prevent scroll conflicts
- Reduces rotation from ±15° to ±12°
- Adds shadow lift during drag
- Adds desktop parallax (image shifts 2-3px on hover)
- Adds image loading state (dominant color placeholder → fade in)
- Supports `prefers-reduced-motion` (no rotation, no parallax, fade instead of fly)
- Removes inline buttons (moved to separate VoteButtons component)

```tsx
import { motion, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { Check, X } from 'lucide-react';

interface SwipeCardProps {
  name: string;
  imageUri: string;
  editionNumber: number;
  onVote: (voteType: 1 | -1) => void;
  isActive?: boolean;
  style?: React.CSSProperties;
}

const SWIPE_THRESHOLD = 100;

export function SwipeCard({ name, imageUri, editionNumber, onVote, isActive = true, style }: SwipeCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], prefersReducedMotion ? [0, 0] : [-12, 12]);

  // Drag feedback transforms
  const likeGlowOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.5]);
  const dislikeGlowOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.5, 0]);
  const likeTintOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.12]);
  const dislikeTintOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.12, 0]);
  const likeIconOpacity = useTransform(x, [50, SWIPE_THRESHOLD], [0, 1]);
  const dislikeIconOpacity = useTransform(x, [-SWIPE_THRESHOLD, -50], [1, 0]);

  const [exiting, setExiting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Desktop parallax
  const cardRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isActive || prefersReducedMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setParallaxOffset({
      x: -((e.clientX - centerX) / rect.width) * 3,
      y: -((e.clientY - centerY) / rect.height) * 3,
    });
  }, [isActive, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setParallaxOffset({ x: 0, y: 0 });
  }, []);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      setExiting(true);
      const voteType = info.offset.x > 0 ? 1 : -1;
      if ('vibrate' in navigator) navigator.vibrate(10);
      setTimeout(() => onVote(voteType as 1 | -1), 200);
    }
  };

  // Trigger vote externally (from VoteButtons)
  const triggerVote = useCallback((voteType: 1 | -1) => {
    setExiting(true);
    if ('vibrate' in navigator) navigator.vibrate(5);
    setTimeout(() => onVote(voteType), 200);
  }, [onVote]);

  // Expose triggerVote via ref or callback — handled by parent

  return (
    <motion.div
      ref={cardRef}
      className="swipe-card"
      style={{ x, rotate, ...style }}
      drag={isActive ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragDirectionLock
      onDragEnd={handleDragEnd}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={exiting
        ? { x: x.get() > 0 ? 500 : -500, opacity: 0 }
        : {}
      }
      transition={exiting
        ? { duration: 0.2, ease: 'easeOut' }
        : undefined
      }
      aria-label={`${name}, edition ${editionNumber}`}
    >
      {/* Border glow — green right edge on like */}
      <motion.div
        className="swipe-glow swipe-glow-like"
        style={{ opacity: likeGlowOpacity }}
      />
      {/* Border glow — red left edge on dislike */}
      <motion.div
        className="swipe-glow swipe-glow-dislike"
        style={{ opacity: dislikeGlowOpacity }}
      />

      {/* Image with parallax + color tints */}
      <div className="swipe-card-image">
        {/* Green tint overlay */}
        <motion.div
          className="swipe-tint swipe-tint-like"
          style={{ opacity: likeTintOpacity }}
        />
        {/* Red tint overlay */}
        <motion.div
          className="swipe-tint swipe-tint-dislike"
          style={{ opacity: dislikeTintOpacity }}
        />

        {/* Check icon (like) */}
        <motion.div className="swipe-icon swipe-icon-like" style={{ opacity: likeIconOpacity }}>
          <Check size={48} strokeWidth={3} />
        </motion.div>
        {/* X icon (dislike) */}
        <motion.div className="swipe-icon swipe-icon-dislike" style={{ opacity: dislikeIconOpacity }}>
          <X size={48} strokeWidth={3} />
        </motion.div>

        {/* Image placeholder */}
        {!imageLoaded && (
          <div className="swipe-card-placeholder" />
        )}
        <img
          src={imageUri}
          alt={name}
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 200ms ease',
            transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
          }}
        />
      </div>

      {/* Info bar */}
      <div className="swipe-card-info">
        <span className="swipe-card-name">{name}</span>
        <span className="swipe-card-edition">#{editionNumber}</span>
      </div>
    </motion.div>
  );
}
```

**Step 2: Update theme.css swipe card styles**

Replace the existing `.swipe-card` styles in `src/styles/theme.css` with:

```css
/* ============================================================
   SWIPE CARD — Tinder-style voting card
   ============================================================ */
.swipe-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  box-shadow: var(--shadow-card);
}

.swipe-card:active {
  cursor: grabbing;
}

/* Image container */
.swipe-card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}

.swipe-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
}

/* Image loading placeholder */
.swipe-card-placeholder {
  position: absolute;
  inset: 0;
  background: var(--color-surface);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* Info bar below image */
.swipe-card-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
}

.swipe-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 8px;
}

.swipe-card-edition {
  font-size: 14px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* Border glow feedback */
.swipe-glow {
  position: absolute;
  inset: -1px;
  border-radius: var(--radius-lg);
  pointer-events: none;
  z-index: 5;
}

.swipe-glow-like {
  box-shadow: inset -4px 0 20px rgba(34, 197, 94, 0.5),
              4px 0 20px rgba(34, 197, 94, 0.3);
}

.swipe-glow-dislike {
  box-shadow: inset 4px 0 20px rgba(239, 68, 68, 0.5),
              -4px 0 20px rgba(239, 68, 68, 0.3);
}

/* Color tint overlays */
.swipe-tint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.swipe-tint-like {
  background: rgba(34, 197, 94, 1);
}

.swipe-tint-dislike {
  background: rgba(239, 68, 68, 1);
}

/* Center icons (✓ and ✕) */
.swipe-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  color: white;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}

/* Reduced motion overrides */
@media (prefers-reduced-motion: reduce) {
  .swipe-card-placeholder {
    animation: none;
    opacity: 0.4;
  }
}
```

**Step 3: Verify card renders**

Run: `npm run dev` and navigate to `/games/your-wojak`

Expected: Card displays with image, info bar, drag rotates ±12°, border glow on drag, ✓/✕ icons fade in past 50px drag.

**Step 4: Commit**

```bash
git add src/components/game/SwipeCard.tsx src/styles/theme.css
git commit -m "feat: upgrade SwipeCard to premium design spec

Border glow feedback (green right, red left)
Check/X icon reveal during drag (color-blind safe)
Background tint overlays (12% opacity)
Desktop parallax on hover (2-3px shift)
Image loading placeholder with pulse animation
dragDirectionLock prevents scroll conflicts
Reduced motion support (no rotation, no parallax)
Haptic feedback on swipe (navigator.vibrate)"
```

---

## Task 2: Create VoteButtons Component

**Files:**
- Create: `src/components/game/VoteButtons.tsx`

**Step 1: Create the component**

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, X, Undo2 } from 'lucide-react';
import { useEffect } from 'react';

interface VoteButtonsProps {
  onLike: () => void;
  onDislike: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

export function VoteButtons({ onLike, onDislike, onUndo, canUndo, disabled }: VoteButtonsProps) {
  const prefersReducedMotion = useReducedMotion();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); onLike(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); onDislike(); }
      if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if (canUndo) onUndo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onLike, onDislike, onUndo, canUndo, disabled]);

  const buttonSpring = prefersReducedMotion
    ? {}
    : { whileHover: { scale: 1.1 }, whileTap: { scale: 0.85 } };

  return (
    <div className="vote-buttons">
      {/* Undo button (above, centered) */}
      <motion.button
        className="vote-btn vote-btn-undo"
        onClick={onUndo}
        disabled={!canUndo || disabled}
        aria-label="Undo last vote"
        {...(canUndo ? buttonSpring : {})}
      >
        <Undo2 size={16} />
      </motion.button>

      {/* Main buttons row */}
      <div className="vote-buttons-row">
        <motion.button
          className="vote-btn vote-btn-dislike"
          onClick={onDislike}
          disabled={disabled}
          aria-label="Dislike this Wojak"
          {...buttonSpring}
        >
          <X size={24} strokeWidth={2.5} />
        </motion.button>

        <motion.button
          className="vote-btn vote-btn-like"
          onClick={onLike}
          disabled={disabled}
          aria-label="Like this Wojak"
          {...buttonSpring}
        >
          <Heart size={24} strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
```

**Step 2: Add styles to theme.css**

```css
/* Vote buttons */
.vote-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vote-buttons-row {
  display: flex;
  align-items: center;
  gap: 40px;
}

.vote-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  transition: background 150ms ease, box-shadow 150ms ease;
}

.vote-btn-like,
.vote-btn-dislike {
  width: 56px;
  height: 56px;
}

.vote-btn-like {
  border: 2px solid var(--color-success);
  color: var(--color-success);
}

.vote-btn-like:hover {
  background: rgba(34, 197, 94, 0.1);
}

.vote-btn-like:active {
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
}

.vote-btn-dislike {
  border: 2px solid var(--color-error);
  color: var(--color-error);
}

.vote-btn-dislike:hover {
  background: rgba(239, 68, 68, 0.1);
}

.vote-btn-dislike:active {
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
}

.vote-btn-undo {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  opacity: 0.5;
}

.vote-btn-undo:not(:disabled) {
  opacity: 1;
  color: var(--color-text-secondary);
}

.vote-btn-undo:disabled {
  opacity: 0.2;
  pointer-events: none;
  cursor: default;
}

/* Mobile: larger buttons */
@media (max-width: 767px) {
  .vote-btn-like,
  .vote-btn-dislike {
    width: 64px;
    height: 64px;
  }
}

/* Desktop hover only */
@media (hover: hover) {
  .vote-btn-like:hover,
  .vote-btn-dislike:hover {
    transform: scale(1.1);
  }
}
```

**Step 3: Commit**

```bash
git add src/components/game/VoteButtons.tsx src/styles/theme.css
git commit -m "feat: add VoteButtons with SVG icons, undo, keyboard shortcuts

Lucide Heart/X icons (not emoji), 56px desktop / 64px mobile
Undo button: 36px, 1 per session, Z key shortcut
Keyboard: left/right arrows to vote, Z to undo
Green/red border + glow on active, disabled states"
```

---

## Task 3: Create CardStack Manager

**Files:**
- Create: `src/components/game/CardStack.tsx`

**Step 1: Create the 3-card stack component**

This component manages 3 cards: current (interactive), next (behind, scale 0.95), preloaded (behind, scale 0.90). It handles the transition animations when the current card exits.

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import { SwipeCard } from './SwipeCard';
import { springs } from '@/config/springs';

interface FeedItem {
  nftId: string;
  editionNumber: number;
  name: string;
  imageUri: string;
}

interface CardStackProps {
  items: FeedItem[];
  onVote: (nftId: string, editionNumber: number, voteType: 1 | -1) => void;
  onNeedMore: () => void;
  triggerVoteRef?: React.MutableRefObject<((voteType: 1 | -1) => void) | null>;
  isFirstVisit?: boolean;
}

export function CardStack({ items, onVote, onNeedMore, triggerVoteRef, isFirstVisit }: CardStackProps) {
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const preloadedImages = useRef(new Set<string>());

  // Preload next 3 images
  useEffect(() => {
    for (let i = currentIndex; i < Math.min(currentIndex + 3, items.length); i++) {
      const uri = items[i]?.imageUri;
      if (uri && !preloadedImages.current.has(uri)) {
        const img = new Image();
        img.src = uri;
        preloadedImages.current.add(uri);
      }
    }
  }, [currentIndex, items]);

  // Request more items when running low
  useEffect(() => {
    if (items.length - currentIndex <= 2) {
      onNeedMore();
    }
  }, [currentIndex, items.length, onNeedMore]);

  const handleVote = useCallback((voteType: 1 | -1) => {
    const item = items[currentIndex];
    if (!item) return;
    onVote(item.nftId, item.editionNumber, voteType);
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, items, onVote]);

  // Expose vote trigger for external buttons
  useEffect(() => {
    if (triggerVoteRef) {
      triggerVoteRef.current = handleVote;
    }
  }, [handleVote, triggerVoteRef]);

  const current = items[currentIndex];
  const next = items[currentIndex + 1];
  const preloaded = items[currentIndex + 2];

  if (!current) return null;

  // Card stack positions
  const stackPositions = [
    { zIndex: 3, scale: 1, y: 0, opacity: 1 },          // current
    { zIndex: 2, scale: 0.95, y: 8, opacity: 0.7 },     // next
    { zIndex: 1, scale: 0.90, y: 16, opacity: 0.4 },    // preloaded
  ];

  return (
    <div
      className="card-stack"
      role="application"
      aria-label="Vote on Wojak NFTs. Swipe right to like, left to dislike."
    >
      {/* Preloaded card (back) */}
      {preloaded && (
        <motion.div
          key={`preloaded-${preloaded.nftId}`}
          className="card-stack-item"
          style={{ zIndex: stackPositions[2].zIndex }}
          animate={{
            scale: stackPositions[2].scale,
            y: stackPositions[2].y,
            opacity: stackPositions[2].opacity,
          }}
          transition={springs.defaultSpring}
          aria-hidden="true"
        >
          <SwipeCard
            name={preloaded.name}
            imageUri={preloaded.imageUri}
            editionNumber={preloaded.editionNumber}
            onVote={() => {}}
            isActive={false}
          />
        </motion.div>
      )}

      {/* Next card (middle) */}
      {next && (
        <motion.div
          key={`next-${next.nftId}`}
          className="card-stack-item"
          style={{ zIndex: stackPositions[1].zIndex }}
          animate={{
            scale: stackPositions[1].scale,
            y: stackPositions[1].y,
            opacity: stackPositions[1].opacity,
          }}
          transition={springs.defaultSpring}
          aria-hidden="true"
        >
          <SwipeCard
            name={next.name}
            imageUri={next.imageUri}
            editionNumber={next.editionNumber}
            onVote={() => {}}
            isActive={false}
          />
        </motion.div>
      )}

      {/* Current card (front, interactive) */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`current-${current.nftId}`}
          className="card-stack-item"
          style={{ zIndex: stackPositions[0].zIndex }}
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, y: 8, opacity: 0.7 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : undefined}
          transition={springs.defaultSpring}
          // First-visit wiggle
          {...(isFirstVisit && currentIndex === 0 && !prefersReducedMotion ? {
            animate: {
              scale: 1, y: 0, opacity: 1,
              x: [0, 20, -20, 10, -10, 0],
            },
            transition: {
              x: { duration: 0.8, ease: 'easeInOut', delay: 0.5 },
              default: springs.defaultSpring,
            },
          } : {})}
        >
          <SwipeCard
            name={current.name}
            imageUri={current.imageUri}
            editionNumber={current.editionNumber}
            onVote={handleVote}
            isActive={true}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Add card-stack CSS to theme.css**

```css
/* Card stack container */
.card-stack {
  position: relative;
  width: 100%;
  max-width: 380px;
  aspect-ratio: auto;
}

.card-stack-item {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-stack-item:last-child {
  position: relative;
  pointer-events: auto;
}
```

**Step 3: Commit**

```bash
git add src/components/game/CardStack.tsx src/styles/theme.css
git commit -m "feat: add 3-card stack with spring transitions and image preloading

3 cards in DOM: current (interactive) + next + preloaded
Spring transitions when current exits, stack shifts up
Image preloading for next 3 cards via new Image()
First-visit wiggle hint (translateX animation)
Reduced motion: fade transitions instead of springs"
```

---

## Task 4: Create GateChecklist (Progressive Onboarding)

**Files:**
- Create: `src/components/game/GateChecklist.tsx`

**Step 1: Create the component**

This replaces the 5 separate dead-end screens with a single progressive checklist card.

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';

interface GateStep {
  key: string;
  label: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  isComplete: boolean;
}

interface GateChecklistProps {
  isWalletConnected: boolean;
  hasDid: boolean;
  onConnectWallet: () => void;
}

export function GateChecklist({ isWalletConnected, hasDid, onConnectWallet }: GateChecklistProps) {
  const { player, isVerified, verifyPhase1 } = useGame();

  const steps: GateStep[] = [
    {
      key: 'wallet',
      label: 'Connect wallet',
      description: 'Connect your Sage wallet to get started.',
      actionLabel: 'Connect',
      onAction: onConnectWallet,
      isComplete: isWalletConnected,
    },
    {
      key: 'did',
      label: 'Create a DID',
      description: 'Set up a DID (Decentralized Identity) in Sage under Settings.',
      actionLabel: 'Learn How',
      actionHref: 'https://docs.sagewalletio/guides/did',
      isComplete: hasDid,
    },
    {
      key: 'phase1',
      label: 'Get a Wojak Farmers Plot NFT',
      description: 'You need at least 1 Wojak Farmers Plot NFT assigned to your DID.',
      actionLabel: 'Browse on MintGarden',
      actionHref: 'https://mintgarden.io/collections/col1z0ef7w5n4vq9qkue67y8jns89re570npt0s4wwtcmpv3lxsmjq4yqs9ser0h',
      isComplete: !!isVerified,
    },
    {
      key: 'ready',
      label: 'Start voting',
      description: '',
      isComplete: false, // Auto-completes when above 3 are done
    },
  ];

  // Find current step (first incomplete)
  const currentStepIndex = steps.findIndex(s => !s.isComplete);

  return (
    <div className="card-static p-8 flex flex-col items-center gap-6" style={{ maxWidth: 380, width: '100%' }}>
      <div className="text-center flex flex-col gap-2">
        <span style={{ fontSize: 48 }}>🗳️</span>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Your Wojak</h2>
        <p className="text-secondary" style={{ fontSize: 14 }}>
          Complete these steps to start voting.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIndex;
          const isFuture = i > currentStepIndex;

          return (
            <motion.div
              key={step.key}
              className="flex flex-col gap-2"
              initial={false}
              animate={{ opacity: isFuture ? 0.4 : 1 }}
            >
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <span style={{
                  fontSize: 16,
                  color: step.isComplete
                    ? 'var(--color-success)'
                    : isCurrent
                      ? 'var(--color-text)'
                      : 'var(--color-text-muted)',
                }}>
                  {step.isComplete ? '✅' : isCurrent ? '☐' : '○'}
                </span>
                {/* Step label */}
                <span style={{
                  fontSize: 14,
                  fontWeight: isCurrent ? 600 : 400,
                  color: step.isComplete
                    ? 'var(--color-text-muted)'
                    : isCurrent
                      ? 'var(--color-text)'
                      : 'var(--color-text-muted)',
                  textDecoration: step.isComplete ? 'line-through' : 'none',
                }}>
                  {step.label}
                </span>
              </div>

              {/* Description + action (only for current step) */}
              <AnimatePresence>
                {isCurrent && step.description && (
                  <motion.div
                    className="flex flex-col gap-2 ml-7"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <p className="text-secondary" style={{ fontSize: 13 }}>
                      {step.description}
                    </p>
                    {step.actionLabel && (
                      step.actionHref ? (
                        <a
                          href={step.actionHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost"
                          style={{ fontSize: 13, width: 'fit-content' }}
                        >
                          {step.actionLabel} →
                        </a>
                      ) : step.onAction ? (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 13, width: 'fit-content' }}
                          onClick={step.onAction}
                        >
                          {step.actionLabel}
                        </button>
                      ) : null
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/game/GateChecklist.tsx
git commit -m "feat: add progressive gate checklist for voting onboarding

Single card replaces 5 dead-end screens
Steps: wallet → DID → Phase 1 NFT → start voting
Current step shows description + action button
Completed steps grayed with checkmark, future steps dimmed
Animated step transitions (expand/collapse)"
```

---

## Task 5: Create Side Panel Components

**Files:**
- Create: `src/components/game/MiniLeaderboard.tsx`
- Create: `src/components/game/StatsPanel.tsx`
- Create: `src/components/game/MobileStatsBar.tsx`

**Step 1: Create MiniLeaderboard**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface LeaderboardEntry {
  rank: number;
  did: string;
  walletAddress: string;
  powerLevel: number;
}

function getTierEmoji(level: number, rank: number): string {
  if (rank > 3) return '';
  if (level >= 9000) return '🔥';
  if (level >= 5000) return '⚡';
  return '';
}

export function MiniLeaderboard({ playerDid }: { playerDid?: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [playerLevel, setPlayerLevel] = useState<number>(0);

  useEffect(() => {
    fetch('/api/game/leaderboard?limit=10')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setEntries(data.entries);
          // Find player's rank
          const playerEntry = data.entries.find((e: LeaderboardEntry) => e.did === playerDid);
          if (playerEntry) {
            setPlayerRank(playerEntry.rank);
            setPlayerLevel(playerEntry.powerLevel);
          }
        }
      });
  }, [playerDid]);

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="panel-header">⚡ POWER LEVEL</h3>

      <div className="flex flex-col gap-2">
        {entries.map(entry => (
          <div key={entry.rank} className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-muted" style={{ fontSize: 14, width: 24 }}>{entry.rank}</span>
              <span style={{ fontSize: 14 }}>{getTierEmoji(entry.powerLevel, entry.rank)}</span>
              <span className="font-bold" style={{ fontSize: 16, flex: 1, textAlign: 'right' }}>
                {entry.powerLevel.toLocaleString()}
              </span>
            </div>
            <span
              className="text-secondary"
              style={{ fontSize: 13, paddingLeft: 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {entry.walletAddress.slice(0, 10)}...
            </span>
          </div>
        ))}
      </div>

      {/* Player's rank (always shown) */}
      {playerDid && (
        <>
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 600 }}>You</span>
              <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                {playerRank ? `#${playerRank}` : '—'}
              </span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right' }}>
              {playerLevel.toLocaleString()}
            </span>
          </div>
        </>
      )}

      <Link
        to="/leaderboard"
        className="text-muted"
        style={{ fontSize: 12, textAlign: 'center' }}
      >
        View Full →
      </Link>
    </div>
  );
}
```

**Step 2: Create StatsPanel**

```tsx
import { useGame } from '@/contexts/GameContext';
import { OnboardingChecklist } from './OnboardingChecklist';
import { Link } from 'react-router-dom';

function getTier(level: number) {
  if (level >= 9000) return { label: "IT'S OVER 9,000!", class: 'tier-legend' };
  if (level >= 5000) return { label: 'Top Tier', class: 'tier-top' };
  if (level >= 2000) return { label: 'Serious', class: 'tier-serious' };
  if (level >= 500) return { label: 'Active', class: 'tier-active' };
  if (level >= 100) return { label: 'Casual', class: 'tier-casual' };
  return { label: 'New Player', class: 'tier-casual' };
}

export function StatsPanel() {
  const { player } = useGame();

  if (!player) return null;

  const tier = getTier(player.powerLevel);
  const votesUsed = player.votesToday;
  const votesTotal = 10;
  const fillPercent = (votesUsed / votesTotal) * 100;

  return (
    <div className="card-static p-4 flex flex-col gap-4">
      <h3 className="panel-header">YOUR GAME</h3>

      {/* Power Level */}
      <div className="flex flex-col items-center gap-1">
        <span style={{ fontSize: 24, fontWeight: 700 }}>
          {player.powerLevel.toLocaleString()}
        </span>
        <div className={`power-level-badge ${tier.class}`}>
          ⚡ {tier.label}
        </div>
        <span className="text-muted" style={{ fontSize: 13 }}>
          Power Level
        </span>
      </div>

      {/* Votes progress */}
      <div className="flex flex-col gap-2">
        <span className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Votes Today
        </span>
        <div style={{
          height: 6,
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${fillPercent}%`,
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 200ms ease',
          }} />
        </div>
        <span className="text-secondary" style={{ fontSize: 13 }}>
          {player.votesRemaining}/{votesTotal} remaining
        </span>
      </div>

      {/* Onboarding (auto-hides when complete) */}
      {player.onboarding && (
        <OnboardingChecklist milestones={player.onboarding} />
      )}

      <Link
        to="/games/your-wojak/dashboard"
        className="text-muted"
        style={{ fontSize: 12, textAlign: 'center' }}
      >
        Dashboard →
      </Link>
    </div>
  );
}
```

**Step 3: Create MobileStatsBar**

```tsx
import { useGame } from '@/contexts/GameContext';
import { Link } from 'react-router-dom';

function getTierColor(level: number): string {
  if (level >= 9000) return 'var(--color-gold)';
  if (level >= 5000) return 'var(--color-purple)';
  if (level >= 2000) return 'var(--color-cyan)';
  if (level >= 500) return 'var(--color-success)';
  return 'var(--color-text-secondary)';
}

function getTierLabel(level: number): string {
  if (level >= 9000) return 'Legend';
  if (level >= 5000) return 'Top Tier';
  if (level >= 2000) return 'Serious';
  if (level >= 500) return 'Active';
  if (level >= 100) return 'Casual';
  return 'New';
}

export function MobileStatsBar() {
  const { player } = useGame();

  if (!player) return null;

  return (
    <Link
      to="/games/your-wojak/dashboard"
      className="mobile-stats-bar"
    >
      <div className="mobile-stats-segment">
        <span className="mobile-stats-value" style={{ color: getTierColor(player.powerLevel) }}>
          ⚡ {player.powerLevel.toLocaleString()}
        </span>
        <span className="mobile-stats-label">{getTierLabel(player.powerLevel)}</span>
      </div>
      <div className="mobile-stats-divider" />
      <div className="mobile-stats-segment">
        <span className="mobile-stats-value">
          🗳️ {player.votesRemaining}/10
        </span>
        <span className="mobile-stats-label">votes left</span>
      </div>
    </Link>
  );
}
```

**Step 4: Add panel/bar styles to theme.css**

```css
/* Panel header */
.panel-header {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-muted);
  font-weight: 600;
}

/* Mobile stats bar */
.mobile-stats-bar {
  display: flex;
  align-items: center;
  height: 44px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  text-decoration: none;
}

.mobile-stats-segment {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.mobile-stats-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.mobile-stats-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.mobile-stats-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}
```

**Step 5: Commit**

```bash
git add src/components/game/MiniLeaderboard.tsx src/components/game/StatsPanel.tsx src/components/game/MobileStatsBar.tsx src/styles/theme.css
git commit -m "feat: add side panels and mobile stats bar

MiniLeaderboard: top 10 Power Level, player rank pinned at bottom
StatsPanel: Power Level + tier badge, votes progress bar, onboarding
MobileStatsBar: 2-segment compact bar (44px) for mobile layout"
```

---

## Task 6: Create PostRoundSummary and SkeletonCard

**Files:**
- Create: `src/components/game/PostRoundSummary.tsx`
- Create: `src/components/game/SkeletonCard.tsx`

**Step 1: Create PostRoundSummary**

```tsx
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { springs } from '@/config/springs';
import { Heart, X } from 'lucide-react';

interface PostRoundSummaryProps {
  likesCount: number;
  dislikesCount: number;
  powerLevel: number;
  powerLevelDelta: number;
}

export function PostRoundSummary({ likesCount, dislikesCount, powerLevel, powerLevelDelta }: PostRoundSummaryProps) {
  return (
    <motion.div
      className="card-static p-8 flex flex-col items-center gap-5"
      style={{ maxWidth: 380, width: '100%' }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springs.defaultSpring}
    >
      <div className="text-center flex flex-col gap-1">
        <span style={{ fontSize: 36 }}>🗳️</span>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Session Complete</h2>
        <p className="text-secondary" style={{ fontSize: 14 }}>
          You voted on {likesCount + dislikesCount} Wojaks
        </p>
      </div>

      <div className="flex items-center gap-6" style={{ fontSize: 16 }}>
        <span className="flex items-center gap-2" style={{ color: 'var(--color-success)' }}>
          <Heart size={18} /> {likesCount} liked
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>·</span>
        <span className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
          <X size={18} /> {dislikesCount} disliked
        </span>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', width: '100%' }} />

      <div className="text-center">
        <span style={{ fontSize: 18, fontWeight: 700 }}>
          ⚡ Power Level: {powerLevel.toLocaleString()}
        </span>
        {powerLevelDelta !== 0 && (
          <span style={{
            fontSize: 14,
            color: powerLevelDelta > 0 ? 'var(--color-success)' : 'var(--color-error)',
            marginLeft: 8,
          }}>
            {powerLevelDelta > 0 ? '+' : ''}{powerLevelDelta}
          </span>
        )}
      </div>

      <p className="text-secondary" style={{ fontSize: 14 }}>
        Come back tomorrow for 10 more votes.
      </p>

      <div className="flex flex-col gap-3 w-full">
        <Link to="/leaderboard" className="btn btn-primary w-full text-center">
          View Leaderboard
        </Link>
        <Link to="/games/your-wojak/dashboard" className="btn btn-secondary w-full text-center">
          Go to Dashboard
        </Link>
      </div>
    </motion.div>
  );
}
```

**Step 2: Create SkeletonCard**

```tsx
export function SkeletonCard() {
  return (
    <div className="card-static" style={{ maxWidth: 380, width: '100%', overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ aspectRatio: '1', background: 'var(--color-surface)' }}>
        <div className="swipe-card-placeholder" style={{ position: 'relative', width: '100%', height: '100%' }} />
      </div>
      <div className="flex items-center justify-between p-4" style={{ height: 48 }}>
        <div style={{ width: '60%', height: 16, borderRadius: 4, background: 'var(--color-surface)' }}>
          <div className="swipe-card-placeholder" style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 4 }} />
        </div>
        <div style={{ width: 40, height: 14, borderRadius: 4, background: 'var(--color-surface)' }}>
          <div className="swipe-card-placeholder" style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/game/PostRoundSummary.tsx src/components/game/SkeletonCard.tsx
git commit -m "feat: add post-round summary and skeleton loading card

PostRoundSummary: shows after 10/10 votes with like/dislike counts,
Power Level delta, and CTAs to leaderboard/dashboard
SkeletonCard: pulsing placeholder matching card dimensions"
```

---

## Task 7: Upgrade GameContext for Session Tracking and Undo

**Files:**
- Modify: `src/contexts/GameContext.tsx`

**Step 1: Add session tracking, undo support, and leaderboard fetch**

Add to the GameContextType interface:
```typescript
// Add these fields:
sessionLikes: number;
sessionDislikes: number;
previousPowerLevel: number;
lastVote: { nftId: string; editionNumber: number; voteType: 1 | -1 } | null;
undoUsed: boolean;
undoVote: () => Promise<boolean>;
fetchLeaderboard: () => Promise<LeaderboardEntry[]>;
```

Add session tracking state in the provider. When `castVote` succeeds, increment `sessionLikes` or `sessionDislikes`. Store the last vote for undo. Track `previousPowerLevel` on first load for delta calculation in PostRoundSummary.

**Step 2: Commit**

```bash
git add src/contexts/GameContext.tsx
git commit -m "feat: add session tracking, undo, and leaderboard to GameContext

Track sessionLikes/sessionDislikes for post-round summary
Store lastVote for undo (1 per session)
Track previousPowerLevel for delta display
Add fetchLeaderboard for side panel"
```

---

## Task 8: Rewrite VotingFeed as Full Page Layout

**Files:**
- Rewrite: `src/components/game/VotingFeed.tsx`
- Rewrite: `src/pages/GameVoting.tsx`

**Step 1: Rewrite GameVoting.tsx as the full 3-column layout page**

The page becomes the layout orchestrator:
- Checks all gate conditions
- Shows GateChecklist if not ready
- Shows 3-column layout with CardStack + side panels if ready
- Shows PostRoundSummary when votes exhausted
- Shows SkeletonCard during loading
- Shows error state on API failure

```tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { CardStack } from '@/components/game/CardStack';
import { VoteButtons } from '@/components/game/VoteButtons';
import { GateChecklist } from '@/components/game/GateChecklist';
import { MiniLeaderboard } from '@/components/game/MiniLeaderboard';
import { StatsPanel } from '@/components/game/StatsPanel';
import { MobileStatsBar } from '@/components/game/MobileStatsBar';
import { PostRoundSummary } from '@/components/game/PostRoundSummary';
import { SkeletonCard } from '@/components/game/SkeletonCard';

function VotingPageContent() {
  const {
    player, isRegistered, isVerified, feed, feedLoading,
    loadFeed, castVote, sessionLikes, sessionDislikes,
    previousPowerLevel, lastVote, undoUsed, undoVote,
  } = useGame();

  const [showInstructions, setShowInstructions] = useState(() => {
    return !localStorage.getItem('wojak_vote_instructions_seen');
  });
  const [isFirstVisit] = useState(() => {
    return !localStorage.getItem('wojak_vote_welcome_seen');
  });
  const [voteCount, setVoteCount] = useState(0);

  const triggerVoteRef = useRef<((voteType: 1 | -1) => void) | null>(null);

  // Hide instructions after 3 votes
  useEffect(() => {
    if (voteCount >= 3 && showInstructions) {
      setShowInstructions(false);
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => localStorage.setItem('wojak_vote_instructions_seen', 'true'));
      } else {
        localStorage.setItem('wojak_vote_instructions_seen', 'true');
      }
    }
  }, [voteCount, showInstructions]);

  // Mark first visit
  useEffect(() => {
    if (isFirstVisit) {
      localStorage.setItem('wojak_vote_welcome_seen', 'true');
    }
  }, [isFirstVisit]);

  const handleVote = useCallback((nftId: string, editionNumber: number, voteType: 1 | -1) => {
    castVote(nftId, editionNumber, voteType);
    setVoteCount(prev => prev + 1);
  }, [castVote]);

  // Determine page state
  const isGated = !isRegistered || !isVerified;
  const isVotesExhausted = player && player.votesRemaining <= 0;
  const hasFeed = feed.length > 0;

  return (
    <div className="voting-page">
      {/* Mobile stats bar */}
      <div className="voting-page-mobile-bar">
        <MobileStatsBar />
      </div>

      <div className="voting-page-layout">
        {/* Left panel — Leaderboard (desktop) */}
        <div className="voting-page-left">
          <MiniLeaderboard playerDid={player?.did} />
        </div>

        {/* Center — Card area */}
        <div className="voting-page-center">
          {isGated ? (
            <GateChecklist
              isWalletConnected={isRegistered}
              hasDid={!!player}
              onConnectWallet={() => {/* trigger wallet connect */}}
            />
          ) : isVotesExhausted ? (
            <PostRoundSummary
              likesCount={sessionLikes}
              dislikesCount={sessionDislikes}
              powerLevel={player!.powerLevel}
              powerLevelDelta={player!.powerLevel - previousPowerLevel}
            />
          ) : feedLoading && !hasFeed ? (
            <SkeletonCard />
          ) : hasFeed ? (
            <>
              <CardStack
                items={feed}
                onVote={handleVote}
                onNeedMore={loadFeed}
                triggerVoteRef={triggerVoteRef}
                isFirstVisit={isFirstVisit}
              />
              <div style={{ marginTop: 16 }}>
                <VoteButtons
                  onLike={() => triggerVoteRef.current?.(1)}
                  onDislike={() => triggerVoteRef.current?.(-1)}
                  onUndo={undoVote}
                  canUndo={!!lastVote && !undoUsed}
                />
              </div>
              {showInstructions && (
                <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 12, transition: 'opacity 500ms ease' }}>
                  Swipe right to like · Swipe left to dislike
                </p>
              )}
            </>
          ) : (
            <div className="card-static p-8 flex flex-col items-center gap-4" style={{ maxWidth: 380 }}>
              <span style={{ fontSize: 48 }}>✨</span>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>All Caught Up!</h2>
              <p className="text-secondary" style={{ fontSize: 14 }}>
                You've seen every available Wojak. Check back after new mints drop!
              </p>
            </div>
          )}
        </div>

        {/* Right panel — Stats (desktop) */}
        <div className="voting-page-right">
          <StatsPanel />
        </div>
      </div>
    </div>
  );
}

export default function GameVoting() {
  return (
    <GameProvider>
      <VotingPageContent />
    </GameProvider>
  );
}
```

**Step 2: Add page layout styles to theme.css**

```css
/* Voting page layout */
.voting-page {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 16px;
}

.voting-page-mobile-bar {
  display: block;
}

.voting-page-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
}

.voting-page-left,
.voting-page-right {
  display: none;
}

.voting-page-center {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Desktop: 3-column */
@media (min-width: 768px) {
  .voting-page {
    padding: 0 32px;
  }

  .voting-page-mobile-bar {
    display: none;
  }

  .voting-page-layout {
    display: grid;
    grid-template-columns: 220px 1fr 220px;
    gap: 20px;
    align-items: start;
    padding: 24px 0;
  }

  .voting-page-left,
  .voting-page-right {
    display: block;
    position: sticky;
    top: 80px;
  }

  .voting-page-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}
```

**Step 3: Delete the old VotingFeed.tsx**

The VotingFeed component is no longer needed — its responsibilities are now split across CardStack, GateChecklist, and the page layout. Delete `src/components/game/VotingFeed.tsx` or keep it as a thin re-export if other pages reference it.

**Step 4: Commit**

```bash
git add src/pages/GameVoting.tsx src/styles/theme.css
git rm src/components/game/VotingFeed.tsx 2>/dev/null; true
git add -A src/components/game/VotingFeed.tsx
git commit -m "feat: rewrite voting page with 3-column layout

Desktop: leaderboard | card stack + buttons | stats panel (1000px max)
Mobile: compact stats bar + full-width card
Orchestrates: gate checklist, card stack, post-round summary,
skeleton loading, error state, empty state
Instructions auto-hide after 3 votes, first-visit wiggle"
```

---

## Task 9: Milestone Toast Integration

**Files:**
- Modify: `src/contexts/GameContext.tsx` — trigger toast on milestone completion

**Step 1: Use the existing toast system**

Import and use the existing toast system from `src/contexts/ToastContext.tsx`:

```typescript
import { useToast } from '@/contexts/ToastContext';

// In GameProvider:
const { showToast } = useToast();

// After first vote onboarding milestone triggers:
if (isFirstVote) {
  showToast('success', 'First Vote! +2 credits', {
    title: '🎯 Milestone',
    icon: '🎯',
  });
}
```

Add similar toasts for other milestones (first mint, Phase 1 verified, first battle) when the corresponding state changes.

**Step 2: Commit**

```bash
git add src/contexts/GameContext.tsx
git commit -m "feat: add milestone toast notifications

Uses existing toast system for onboarding milestones
Shows credit reward amount on completion
Non-blocking — appears above card area"
```

---

## Task 10: Final Polish and Verify

**Step 1: Run dev server and full walkthrough**

Run: `npm run dev`, navigate to `/games/your-wojak`

Verify:
1. **Gate flow:** Without wallet → shows progressive checklist
2. **Desktop layout:** 3 columns at ≥768px, side panels sticky
3. **Mobile layout:** Stats bar at top, card nearly full-width
4. **Card stack:** 3 cards visible, springs on transition
5. **Swipe:** Drag rotates ±12°, green/red glow + ✓/✕ icons
6. **Buttons:** Heart/X SVG icons, keyboard arrows work
7. **Undo:** Works once per session, Z key shortcut
8. **First visit:** Card wiggles, instruction text shows
9. **After 3 votes:** Instruction text fades
10. **After 10 votes:** Post-round summary with like/dislike counts
11. **Empty feed:** "All Caught Up" state
12. **Loading:** Skeleton card with pulse
13. **Reduced motion:** Cards fade instead of fly, no rotation

**Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: No type errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "polish: verify voting page full flow

Desktop 3-column, mobile responsive, all states tested,
accessibility verified, reduced motion supported"
```

---

## Summary

| Task | Component | Type |
|------|-----------|------|
| 1 | SwipeCard upgrade | Rewrite |
| 2 | VoteButtons (new) | Create |
| 3 | CardStack (new) | Create |
| 4 | GateChecklist (new) | Create |
| 5 | Side panels + mobile bar | Create (3 files) |
| 6 | PostRoundSummary + SkeletonCard | Create (2 files) |
| 7 | GameContext upgrade | Modify |
| 8 | GameVoting page rewrite | Rewrite |
| 9 | Milestone toasts | Modify |
| 10 | Final polish + verify | Verify |

**Total: 10 tasks, ~10 new/modified files, pure frontend.**
