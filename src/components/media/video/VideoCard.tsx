/**
 * Video Card Component
 *
 * Premium video thumbnail card with hover effects and play overlay.
 * Features thumbnail zoom, glow effects, and smooth transitions.
 */

import { memo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, Subtitles, AudioLines } from 'lucide-react';
import type { VideoItem } from '@/types/media';

interface VideoCardProps {
  video: VideoItem;
  onClick: () => void;
}

export const VideoCard = memo(function VideoCard({ video, onClick }: VideoCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className="group flex flex-col text-left overflow-hidden w-full h-full"
      style={{
        borderRadius: '16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-primary-10)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReducedMotion ? undefined : {
        y: -8,
        borderColor: 'var(--color-primary-40)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px var(--color-primary-20)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Thumbnail container */}
      <div className="relative aspect-video overflow-hidden">
        <motion.img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
          animate={prefersReducedMotion ? undefined : {
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/placeholder-video.jpg';
          }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, transparent 50%, var(--color-black-80) 100%)',
          }}
        />

        {/* Play overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(249, 115, 22, 0.9)',
            }}
            initial={{ scale: 0.8 }}
            animate={prefersReducedMotion ? undefined : {
              scale: isHovered ? 1 : 0.8,
              boxShadow: isHovered
                ? '0 0 30px rgba(249, 115, 22, 0.6)'
                : '0 0 0px rgba(249, 115, 22, 0)',
            }}
            transition={{ duration: 0.3 }}
          >
            <Play size={24} fill="white" color="white" style={{ marginLeft: 4 }} />
          </motion.div>
        </motion.div>

        {/* Accessibility badges */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {video.hasCaptions && (
            <div
              className="p-1 rounded"
              style={{
                background: 'var(--color-black-80)',
                color: 'white',
              }}
              title="Captions available"
            >
              <Subtitles size={12} />
            </div>
          )}
          {video.hasAudioDescription && (
            <div
              className="p-1 rounded"
              style={{
                background: 'var(--color-black-80)',
                color: 'white',
              }}
              title="Audio description available"
            >
              <AudioLines size={12} />
            </div>
          )}
        </div>
      </div>

      {/* Info section - fixed height for consistency */}
      <div className="p-3 flex-1 flex items-start">
        <h3
          className="text-sm font-semibold line-clamp-2 transition-colors duration-200 leading-tight"
          style={{
            color: isHovered ? '#F97316' : 'var(--color-text)',
            minHeight: '2.5em', // Ensures space for 2 lines
          }}
        >
          {video.title}
        </h3>
      </div>
    </motion.button>
  );
});

export default VideoCard;
