/**
 * GameLoader Component
 *
 * Consolidates lazy-loading logic for heavy game modules.
 * Uses React.lazy() with Suspense boundary and GameSkeleton fallback.
 * Enables code splitting for optimal initial bundle size.
 *
 * Usage:
 * <GameLoader
 *   component={GeneratorComponent}
 *   skeletonVariant="complex"
 * />
 *
 * Supported games for lazy-loading:
 * - Generator (169kB) → separate chunk
 * - BigPulp (98kB) → separate chunk
 * - BlockPuzzle, FlappyOrange, etc. → can be added as needed
 */

import type { ComponentType, ReactNode } from 'react';
import { Suspense } from 'react';
import { GameSkeleton } from '@/components/skeletons/GameSkeleton';

export type GameSkeletonVariant = 'simple' | 'complex' | 'arcade';

interface GameLoaderProps {
  /**
   * The game component to render (lazy-loaded).
   * Should be wrapped with React.lazy()
   */
  component: ComponentType<Record<string, unknown>>;

  /**
   * Skeleton variant to show during loading.
   * - 'simple': Small 2D games (BlockPuzzle, Flappy, etc.)
   * - 'complex': Multi-panel games (Generator, BigPulp)
   * - 'arcade': Full-screen arcade games
   */
  skeletonVariant?: GameSkeletonVariant;

  /**
   * Optional children as fallback (rarely needed).
   * If not provided, uses default GameSkeleton.
   */
  fallback?: ReactNode;

  /**
   * Props to pass to the game component
   */
  componentProps?: Record<string, unknown>;
}

/**
 * Wraps a lazy-loaded game component with error boundary and loading skeleton.
 * 
 * Example usage:
 * ```tsx
 * const Generator = lazy(() => import('./pages/Generator'));
 * 
 * <GameLoader
 *   component={Generator}
 *   skeletonVariant="complex"
 *   componentProps={{ initialGame: 'wojak' }}
 * />
 * ```
 */
export function GameLoader({
  component: GameComponent,
  skeletonVariant = 'simple',
  fallback,
  componentProps = {},
}: GameLoaderProps) {
  return (
    <Suspense fallback={fallback || <GameSkeleton variant={skeletonVariant} />}>
      <GameComponent {...componentProps} />
    </Suspense>
  );
}

/**
 * Usage Examples:
 * 
 * // In App.tsx (already done):
 * const Generator = lazy(() => import('./pages/Generator'));
 * const BigPulp = lazy(() => import('./pages/BigPulp'));
 * 
 * // In route:
 * <Suspense fallback={<GameSkeleton variant="complex" />}>
 *   <Generator />
 * </Suspense>
 */

export default GameLoader;
