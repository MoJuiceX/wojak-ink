/**
 * PageSkeleton Component
 *
 * Loading skeleton for lazy-loaded pages.
 * Matches page structure to prevent layout shift.
 */

import { motion } from 'framer-motion';
import { useLayout } from '@/hooks/useLayout';

interface PageSkeletonProps {
  type?: 'gallery' | 'treasury' | 'bigpulp' | 'generator' | 'media' | 'settings' | 'detail';
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
        background: 'var(--color-surface)',
        ...style,
      }}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

function GallerySkeleton() {
  return (
    <div style={{ padding: '3vw' }}>
      {/* Character type cards skeleton - matches initial Gallery view */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        }}
      >
        {/* 14 character types */}
        {Array.from({ length: 14 }).map((_, i) => (
          <SkeletonBox
            key={i}
            style={{
              aspectRatio: '3/4',
              borderRadius: '12px',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TreasurySkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <SkeletonBox className="h-8 w-32" />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-24" />
        ))}
      </div>

      {/* Token list */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

function BigPulpSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <SkeletonBox className="h-8 w-40" />

      {/* AI Chat area */}
      <SkeletonBox className="h-64 md:h-96" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

function GeneratorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <SkeletonBox className="h-8 w-36" />

      {/* Preview */}
      <div className="flex justify-center">
        <SkeletonBox className="w-64 h-64 md:w-80 md:h-80" />
      </div>

      {/* Layer selectors */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBox className="h-10 w-24" />
            <SkeletonBox className="h-10 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <SkeletonBox className="h-8 w-32" />

      {/* Featured */}
      <SkeletonBox className="h-48 md:h-64" />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <SkeletonBox className="h-8 w-28" />

      {/* Settings sections */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <SkeletonBox className="h-10 w-24" />

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <SkeletonBox className="aspect-square" />

        {/* Details */}
        <div className="space-y-4">
          <SkeletonBox className="h-10 w-3/4" />
          <SkeletonBox className="h-6 w-1/2" />
          <SkeletonBox className="h-32" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const skeletonMap = {
  gallery: GallerySkeleton,
  treasury: TreasurySkeleton,
  bigpulp: BigPulpSkeleton,
  generator: GeneratorSkeleton,
  media: MediaSkeleton,
  settings: SettingsSkeleton,
  detail: DetailSkeleton,
};

export function PageSkeleton({ type = 'gallery' }: PageSkeletonProps) {
  const { contentPadding } = useLayout();
  const SkeletonComponent = skeletonMap[type];

  return (
    <div
      className="min-h-full"
      style={{
        padding: contentPadding,
      }}
    >
      <SkeletonComponent />
    </div>
  );
}

export default PageSkeleton;
