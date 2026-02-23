/**
 * GameSkeleton Component
 *
 * Loading skeleton for lazy-loaded game pages.
 * Matches game container structure to prevent layout shift.
 * Animated to provide visual feedback during load.
 */

import { motion } from 'framer-motion';

interface GameSkeletonProps {
  variant?: 'simple' | 'complex' | 'arcade';
}

function SkeletonBox({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-background) 50%, var(--color-surface) 75%)',
        backgroundSize: '200% 100%',
        ...style,
      }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/**
 * Simple game skeleton (2D games like Flappy, BlockPuzzle)
 */
function SimpleGameSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 px-4">
      {/* Game canvas area */}
      <SkeletonBox
        className="w-full max-w-md"
        style={{
          aspectRatio: '16/9',
          borderRadius: '16px',
        }}
      />

      {/* Controls/Score area */}
      <div className="w-full max-w-md space-y-3">
        <SkeletonBox className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBox key={i} className="h-10 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Complex game skeleton (3D/WebGL games, multi-panel UIs)
 */
function ComplexGameSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 h-full">
      {/* Main game area */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <SkeletonBox
          style={{
            aspectRatio: '16/9',
            borderRadius: '12px',
            height: '100%',
            minHeight: '400px',
          }}
        />
      </div>

      {/* Right panel (stats, character info, etc.) */}
      <div className="flex flex-col gap-4">
        {/* Header */}
        <SkeletonBox className="h-10 rounded-lg" />

        {/* Character/Info box */}
        <SkeletonBox className="h-48 rounded-lg" />

        {/* Stats section */}
        <div className="space-y-2">
          <SkeletonBox className="h-6 w-24 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-10 rounded" />
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 mt-auto">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonBox key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Arcade game skeleton (Game grid, leaderboard, effects)
 */
function ArcadeGameSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Header/Title */}
      <SkeletonBox className="h-8 w-40 rounded" />

      {/* Game area (full width) */}
      <SkeletonBox
        style={{
          aspectRatio: '4/3',
          borderRadius: '16px',
          width: '100%',
        }}
      />

      {/* Bottom section: Score, Leaderboard, etc. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score/Stats */}
        <div className="space-y-2">
          <SkeletonBox className="h-6 w-20 rounded" />
          <SkeletonBox className="h-12 rounded" />
        </div>

        {/* Quick stats */}
        <div className="space-y-2">
          <SkeletonBox className="h-6 w-20 rounded" />
          <SkeletonBox className="h-12 rounded" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBox key={i} className="h-10 rounded" />
        ))}
      </div>
    </div>
  );
}

/**
 * Game Skeleton Component
 *
 * Choose variant based on game type:
 * - 'simple': Small 2D games (BlockPuzzle, Flappy, etc.)
 * - 'complex': Multi-panel games (Generator, BigPulp, Combat)
 * - 'arcade': Full-screen arcade games
 */
export function GameSkeleton({ variant = 'simple' }: GameSkeletonProps) {
  const skeletonMap = {
    simple: SimpleGameSkeleton,
    complex: ComplexGameSkeleton,
    arcade: ArcadeGameSkeleton,
  };

  const SkeletonComponent = skeletonMap[variant] || SimpleGameSkeleton;

  return (
    <div className="min-h-screen w-full bg-var(--color-background) flex items-center justify-center">
      <SkeletonComponent />
    </div>
  );
}

export default GameSkeleton;
