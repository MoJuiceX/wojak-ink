// Tinder-style swipe card for voting.
// Swipe right = like, swipe left = dislike.
// Uses framer-motion for drag gestures.

import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { useState } from 'react';

interface SwipeCardProps {
  name: string;
  imageUri: string;
  editionNumber: number;
  onVote: (voteType: 1 | -1) => void;
}

const SWIPE_THRESHOLD = 100; // px to trigger a vote

export function SwipeCard({ name, imageUri, editionNumber, onVote }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const dislikeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const [exiting, setExiting] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      setExiting(true);
      const voteType = info.offset.x > 0 ? 1 : -1;
      // Animate off screen then vote
      setTimeout(() => onVote(voteType as 1 | -1), 200);
    }
  };

  return (
    <motion.div
      className="swipe-card"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      animate={exiting ? { x: x.get() > 0 ? 500 : -500, opacity: 0 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Like indicator */}
      <motion.div
        className="swipe-indicator swipe-like"
        style={{ opacity: likeOpacity }}
      >
        LIKE
      </motion.div>

      {/* Dislike indicator */}
      <motion.div
        className="swipe-indicator swipe-dislike"
        style={{ opacity: dislikeOpacity }}
      >
        NOPE
      </motion.div>

      {/* NFT Image */}
      <div className="swipe-card-image">
        <img src={imageUri} alt={name} draggable={false} />
      </div>

      {/* Name */}
      <div className="swipe-card-info">
        <h3>{name}</h3>
        <span className="text-secondary">#{editionNumber}</span>
      </div>

      {/* Tap buttons for desktop */}
      <div className="swipe-card-buttons">
        <button
          className="btn btn-ghost swipe-btn-dislike"
          onClick={() => { setExiting(true); setTimeout(() => onVote(-1), 200); }}
        >
          Nope
        </button>
        <button
          className="btn btn-ghost swipe-btn-like"
          onClick={() => { setExiting(true); setTimeout(() => onVote(1), 200); }}
        >
          Like
        </button>
      </div>
    </motion.div>
  );
}
