/**
 * Gallery Skeleton Component
 *
 * Loading skeleton for the gallery page.
 * Shows character grid and NFT grid placeholders.
 */

import { motion } from 'framer-motion';

export function GallerySkeleton() {
  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--color-bg, #0a0a0a)' }}>
      {/* Character Type Grid Skeleton */}
      <div className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={`char-${i}`}
              className="aspect-square rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%)',
                border: '1px solid rgba(249, 115, 22, 0.1)',
              }}
              animate={{
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </div>

      {/* NFT Grid Skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div
            key={`nft-${i}`}
            className="aspect-square rounded-lg"
            style={{
              background: 'rgba(249, 115, 22, 0.05)',
              border: '1px solid rgba(249, 115, 22, 0.1)',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.05,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Leaderboard Skeleton
 */
export function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--color-bg, #0a0a0a)' }}>
      {/* Header skeleton */}
      <div
        className="h-12 w-48 rounded-lg mb-6"
        style={{ background: 'rgba(249, 115, 22, 0.1)' }}
      />

      {/* Game tabs skeleton */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-24 rounded-lg flex-shrink-0"
            style={{ background: 'rgba(249, 115, 22, 0.1)' }}
          />
        ))}
      </div>

      {/* Rankings skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-16 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%)',
              border: '1px solid rgba(249, 115, 22, 0.1)',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Generic Page Skeleton
 */
export function PageSkeleton() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg, #0a0a0a)' }}
    >
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Loading spinner */}
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-full"
          style={{
            border: '3px solid rgba(249, 115, 22, 0.2)',
            borderTopColor: '#F97316',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p style={{ color: 'var(--color-text-muted, #6b7280)' }}>Loading...</p>
      </motion.div>
    </div>
  );
}

export default GallerySkeleton;
