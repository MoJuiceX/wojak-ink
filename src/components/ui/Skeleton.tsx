/**
 * Skeleton Component
 *
 * Loading placeholder with shimmer animation.
 *
 * ACCESSIBILITY:
 * 1. Container: aria-busy="true" while loading
 * 2. Hidden text: "Loading..." for screen readers
 * 3. Respect prefers-reduced-motion
 */

import { memo } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { SkeletonVariant } from '@/types/microInteractions';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'shimmer' | 'pulse' | 'none';
}

export const Skeleton = memo(function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  animation = 'shimmer',
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();

  const borderRadius = {
    text: '4px',
    circular: '50%',
    rectangular: '0',
    rounded: '8px',
  }[variant];

  const defaultHeight = {
    text: '1em',
    circular: width || '40px',
    rectangular: '100px',
    rounded: '100px',
  }[variant];

  const effectiveAnimation = prefersReducedMotion ? 'none' : animation;

  const animationClass = {
    shimmer: 'skeleton-shimmer',
    pulse: 'skeleton-pulse',
    none: '',
  }[effectiveAnimation];

  return (
    <div
      className={`skeleton ${animationClass} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width || '100%',
        height: typeof height === 'number' ? `${height}px` : height || defaultHeight,
        borderRadius,
        background: 'var(--color-elevated)',
      }}
      aria-hidden="true"
    />
  );
});

// Preset skeleton patterns
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '70%' : '100%'}
          height="1em"
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton
        variant="circular"
        width={size}
        height={size}
        className={className}
      />
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <Skeleton variant="rectangular" height={200} />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" height="1.25em" width="80%" />
        <Skeleton variant="text" height="0.875em" width="60%" />
      </div>
    </div>
  );
}

// Container with loading announcement
interface SkeletonContainerProps {
  isLoading: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export function SkeletonContainer({
  isLoading,
  loadingMessage = 'Loading...',
  children,
  fallback,
}: SkeletonContainerProps) {
  return (
    <div aria-busy={isLoading} aria-live="polite">
      {isLoading ? (
        <>
          <span className="sr-only">{loadingMessage}</span>
          {fallback}
        </>
      ) : (
        children
      )}
    </div>
  );
}

export default Skeleton;
