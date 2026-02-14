/**
 * Videos Grid Component
 *
 * Responsive grid of video cards with category filter.
 * Features staggered entry animation and glowing filter tabs.
 */

import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { Video, Film } from 'lucide-react';
import type { VideoItem } from '@/types/media';
import { VideoCard } from './VideoCard';

interface VideosGridProps {
  videos: VideoItem[];
  onVideoSelect: (video: VideoItem) => void;
  isLoading?: boolean;
}

// Staggered grid animation variants
const videoGridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const videoCardContainerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
  },
};

function VideoCardSkeleton() {
  return (
    <div
      className="overflow-hidden animate-pulse h-full flex flex-col"
      style={{
        borderRadius: '16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="aspect-video"
        style={{ background: 'var(--color-border)' }}
      />
      <div className="p-3 flex-1 flex items-start">
        <div
          className="h-4 rounded"
          style={{
            background: 'var(--color-border)',
            width: '80%',
            minHeight: '2.5em',
          }}
        />
      </div>
    </div>
  );
}

export function VideosGrid({
  videos,
  onVideoSelect,
  isLoading = false,
}: VideosGridProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="space-y-6">
      {/* Section Header with glow */}
      <div className="flex items-center gap-3">
        <Video
          size={24}
          style={{
            color: '#F97316',
            filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.5))',
          }}
        />
        <h2
          className="text-xl font-bold relative"
          style={{ color: 'var(--color-text)' }}
        >
          Music Videos
          {/* Underline glow */}
          <span
            className="absolute left-0 -bottom-1"
            style={{
              width: 40,
              height: 2,
              background: 'linear-gradient(90deg, #F97316, transparent)',
            }}
          />
        </h2>
      </div>

      {/* Videos grid with staggered animation */}
      {isLoading ? (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          style={{ gap: 16 }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            style={{ gap: 16 }}
            variants={prefersReducedMotion ? undefined : videoGridVariants}
            initial="hidden"
            animate="visible"
          >
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                className="h-full"
                variants={prefersReducedMotion ? undefined : videoCardContainerVariants}
                custom={index}
              >
                <VideoCard
                  video={video}
                  onClick={() => onVideoSelect(video)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Empty state with animation */}
      {!isLoading && videos.length === 0 && (
        <motion.div
          className="p-12 rounded-2xl text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            animate={prefersReducedMotion ? undefined : {
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-5xl mb-4"
          >
            <Film
              size={48}
              className="mx-auto"
              style={{ color: 'rgba(249, 115, 22, 0.5)' }}
            />
          </motion.div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            No videos yet
          </h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Check back soon for new content!
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default VideosGrid;
