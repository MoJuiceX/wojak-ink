/**
 * HEATMAP RAIN VISUALIZATION
 * Emojis rain down from the sky and pile up where users voted
 *
 * Uses generic targetId to work with any page (games, gallery, media, etc.)
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VotePosition {
  id: string;
  xPercent: number;
  yPercent: number;
  targetId: string;
}

interface HeatmapRainProps {
  votes: VotePosition[];
  type: 'donut' | 'poop';
  containerRef: React.RefObject<HTMLElement | null>;
  onComplete: () => void;
}

interface PiledEmoji {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
}

interface VoteRandomData {
  initialRotate: number;
  animateRotate: number;
  duration: number;
}

// Generate random data for all votes at once (called once per vote set)
function generateAllVoteRandomData(votes: VotePosition[]): Map<string, VoteRandomData> {
  const data = new Map<string, VoteRandomData>();
  votes.forEach(vote => {
    data.set(vote.id, {
      initialRotate: Math.random() * 360,
      animateRotate: Math.random() * 720 - 360,
      duration: 1.2 + Math.random() * 0.3,
    });
  });
  return data;
}

// Generate random rotation for piled emoji
function generatePiledRotation(): number {
  return (Math.random() - 0.5) * 20;
}

// Cluster nearby emojis for pile effect
function clusterVotes(votes: VotePosition[], threshold: number = 5): Map<string, VotePosition[]> {
  const clusters = new Map<string, VotePosition[]>();

  votes.forEach(vote => {
    const cellX = Math.floor(vote.xPercent / threshold);
    const cellY = Math.floor(vote.yPercent / threshold);
    const key = `${vote.targetId}-${cellX}-${cellY}`;

    const existing = clusters.get(key) || [];
    existing.push(vote);
    clusters.set(key, existing);
  });

  return clusters;
}

// Helper to calculate absolute position from percentages
function calculateAbsolutePosition(
  xPercent: number,
  yPercent: number,
  targetId: string,
  container: HTMLElement | null
): { x: number; y: number } {
  if (!container) return { x: 0, y: 0 };

  // Find the target element using data-vote-target attribute
  const targetElement = container.querySelector(`[data-vote-target="${targetId}"]`);
  if (!targetElement) {
    // Fallback to container
    const rect = container.getBoundingClientRect();
    return {
      x: rect.left + (xPercent / 100) * rect.width,
      y: rect.top + (yPercent / 100) * rect.height,
    };
  }

  const targetRect = targetElement.getBoundingClientRect();
  // Return the exact position where the user clicked
  return {
    x: targetRect.left + (xPercent / 100) * targetRect.width,
    y: targetRect.top + (yPercent / 100) * targetRect.height,
  };
}

export function HeatmapRain({ votes, type, containerRef, onComplete }: HeatmapRainProps) {
  const emoji = type === 'donut' ? '🍩' : '💩';
  const [fallingEmojis, setFallingEmojis] = useState<string[]>([]);
  const [piledEmojis, setPiledEmojis] = useState<PiledEmoji[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Cache computed positions to avoid accessing ref during render
  const [votePositions, setVotePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Cluster votes for pile stacking
  const clusters = useMemo(() => clusterVotes(votes), [votes]);

  // Generate random data for all votes once using useState lazy initializer
  // This runs outside the render cycle and only re-runs when votes identity changes
  const [voteRandomData] = useState(() => generateAllVoteRandomData(votes));

  // Compute positions in effect (not during render) to avoid ref access during render
  useEffect(() => {
    const container = containerRef.current;
    const positions = new Map<string, { x: number; y: number }>();
    votes.forEach(vote => {
      positions.set(vote.id, calculateAbsolutePosition(vote.xPercent, vote.yPercent, vote.targetId, container));
    });
    // Use queueMicrotask to avoid synchronous setState warning
    queueMicrotask(() => setVotePositions(positions));
  }, [votes, containerRef]);

  // Start the rain animation
  useEffect(() => {
    const ids = votes.map(v => v.id);
    ids.forEach((id, index) => {
      setTimeout(() => {
        setFallingEmojis(prev => [...prev, id]);
      }, index * 20);
    });

    const totalDuration = votes.length * 20 + 3000;
    const cleanupTimer = setTimeout(() => {
      setIsComplete(true);
      setTimeout(onComplete, 500);
    }, totalDuration + 5000);

    return () => clearTimeout(cleanupTimer);
  }, [votes, onComplete]);

  // Handle emoji landing - position exactly where user clicked
  const handleLand = (vote: VotePosition, clusterKey: string) => {
    const cluster = clusters.get(clusterKey) || [];
    const indexInCluster = cluster.findIndex(v => v.id === vote.id);
    const pos = votePositions.get(vote.id) || { x: 0, y: 0 };

    // Piled emoji size is 24px, so offset by 12px to center on click position
    const emojiHalfSize = 12;

    const rotation = generatePiledRotation();
    setPiledEmojis(prev => {
      const newEmoji: PiledEmoji = {
        id: vote.id,
        // Center exactly on click position - stack vertically for multiple votes in same spot
        x: pos.x - emojiHalfSize,
        y: pos.y - emojiHalfSize - indexInCluster * 8,
        scale: 0.55,
        rotation, // Slight rotation for visual interest
        zIndex: prev.length,
      };
      return [...prev, newEmoji];
    });

    setFallingEmojis(prev => prev.filter(id => id !== vote.id));
  };

  return (
    <>
      {/* Overlay - click to close */}
      <motion.div
        className="heatmap-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: isComplete ? 0 : 1 }}
        exit={{ opacity: 0 }}
        onClick={onComplete}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-black-50)',
          zIndex: 9000,
          pointerEvents: isComplete ? 'none' : 'auto',
          cursor: 'pointer',
        }}
      />

      {/* Falling emojis */}
      <AnimatePresence>
        {votes.map(vote => {
          if (!fallingEmojis.includes(vote.id)) return null;

          const cellX = Math.floor(vote.xPercent / 5);
          const cellY = Math.floor(vote.yPercent / 5);
          const clusterKey = `${vote.targetId}-${cellX}-${cellY}`;
          const endPos = votePositions.get(vote.id) || { x: 0, y: 0 };

          // Falling emoji size is 36px, center it on the click position
          const emojiHalfSize = 18;

          const randomData = voteRandomData.get(vote.id) || { initialRotate: 0, animateRotate: 0, duration: 1.2 };

          return (
            <motion.div
              key={vote.id}
              style={{
                position: 'fixed',
                fontSize: '36px',
                pointerEvents: 'none',
                zIndex: 9500,
                filter: 'drop-shadow(0 4px 8px var(--color-black-30))',
              }}
              initial={{
                // Start from exact x position, just above viewport for clean drop
                x: endPos.x - emojiHalfSize,
                y: -60,
                scale: 1.2,
                rotate: randomData.initialRotate,
                opacity: 1,
              }}
              animate={{
                // Land exactly at click position (centered)
                x: endPos.x - emojiHalfSize,
                y: endPos.y - emojiHalfSize,
                scale: [1.2, 1.1, 0.6],
                rotate: randomData.animateRotate,
                opacity: 1,
              }}
              transition={{
                duration: randomData.duration,
                ease: [0.25, 0.1, 0.25, 1],
                scale: {
                  times: [0, 0.9, 1],
                },
              }}
              onAnimationComplete={() => handleLand(vote, clusterKey)}
            >
              {emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Piled emojis (landed) - already positioned with centering in handleLand */}
      {piledEmojis.map(item => (
        <motion.div
          key={`piled-${item.id}`}
          style={{
            position: 'fixed',
            left: item.x,
            top: item.y,
            fontSize: '24px',
            pointerEvents: 'none',
            zIndex: 9100 + item.zIndex,
            filter: 'drop-shadow(0 2px 4px var(--color-black-20))',
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: item.scale,
            rotate: item.rotation,
            opacity: isComplete ? 0 : 1,
          }}
          transition={{
            type: 'spring',
            damping: 15,
            stiffness: 300,
            opacity: { duration: 0.5 },
          }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Close button - more prominent */}
      {!isComplete && (
        <motion.button
          className="heatmap-close-btn"
          onClick={onComplete}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9600,
            padding: '14px 32px',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, rgba(255, 100, 100, 0.9), rgba(200, 50, 50, 0.9))',
            border: '2px solid var(--color-white-30)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(255, 100, 100, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          whileHover={{ scale: 1.05, boxShadow: '0 6px 30px rgba(255, 100, 100, 0.6)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span>✕</span>
          <span>Tap to Close</span>
        </motion.button>
      )}

      {/* Hint text at bottom */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            position: 'fixed',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9600,
            padding: '10px 20px',
            borderRadius: '20px',
            background: 'var(--color-black-70)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            pointerEvents: 'none',
          }}
        >
          {emoji} {piledEmojis.length} votes shown
        </motion.div>
      )}
    </>
  );
}
