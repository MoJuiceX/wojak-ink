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

import { Suspense, ComponentType, ReactNode } from 'react';
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
 * Pre-configured loaders for specific games.
 * Use these for consistency and type safety.
 */

/**
 * Generator loader
 * Large bundle (169kB), complex UI with layers and customization
 */
export function GeneratorLoader(props?: Record<string, unknown>) {
  const Generator = React.lazy(() =>
    import('@/pages/Generator').then(m => ({
      default: m.default,
    }))
  );

  return (
    <GameLoader
      component={Generator}
      skeletonVariant="complex"
      componentProps={props}
    />
  );
}

/**
 * BigPulp loader
 * Medium-large bundle (98kB), AI chat + character system
 */
export function BigPulpLoader(props?: Record<string, unknown>) {
  const BigPulp = React.lazy(() =>
    import('@/pages/BigPulp').then(m => ({
      default: m.default,
    }))
  );

  return (
    <GameLoader
      component={BigPulp}
      skeletonVariant="complex"
      componentProps={props}
    />
  );
}

/**
 * BlockPuzzle loader
 * Medium bundle, 2D puzzle game
 */
export function BlockPuzzleLoader(props?: Record<string, unknown>) {
  const BlockPuzzle = React.lazy(() =>
    import('@/pages/games/block-puzzle').then(m => ({
      default: m.default,
    }))
  );

  return (
    <GameLoader
      component={BlockPuzzle}
      skeletonVariant="simple"
      componentProps={props}
    />
  );
}

/**
 * FlappyOrange loader
 * Medium bundle, arcade 2D game
 */
export function FlappyOrangeLoader(props?: Record<string, unknown>) {
  const FlappyOrange = React.lazy(() =>
    import('@/pages/games/flappy-orange').then(m => ({
      default: m.default,
    }))
  );

  return (
    <GameLoader
      component={FlappyOrange}
      skeletonVariant="arcade"
      componentProps={props}
    />
  );
}

// Import React for lazy()
import * as React from 'react';

export default GameLoader;
