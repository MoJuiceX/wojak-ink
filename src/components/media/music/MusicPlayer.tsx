/**
 * Music Player Component
 *
 * Premium background music player with equalizer animation.
 * Features shimmer effect, animated play/pause, and glowing UI.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Music, Play, Pause } from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import type { MusicTrack } from '@/types/media';

interface MusicPlayerProps {
  tracks: MusicTrack[];
  defaultExpanded?: boolean;
  isLoading?: boolean;
}

// Equalizer bar component
function Equalizer({ isPlaying }: { isPlaying: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const barHeights = [8, 16, 12, 18, 10];
  const delays = [0, 0.1, 0.2, 0.15, 0.05];

  return (
    <div className="flex items-end gap-0.5 h-5">
      {barHeights.map((height, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-sm"
          style={{
            background: '#F97316',
            height: isPlaying ? height : 4,
          }}
          animate={isPlaying && !prefersReducedMotion ? {
            scaleY: [0.5, 1, 0.5],
          } : {
            scaleY: 1,
          }}
          transition={isPlaying ? {
            duration: 0.5,
            repeat: Infinity,
            delay: delays[i],
            ease: 'easeInOut',
          } : {
            duration: 0.2,
          }}
        />
      ))}
    </div>
  );
}

export function MusicPlayer({ tracks }: MusicPlayerProps) {
  const prefersReducedMotion = useReducedMotion();
  const {
    musicPlayer,
    playTrack,
    pauseMusic,
    resumeMusic,
    setPlaylist,
  } = useMedia();

  const { currentTrack, isPlaying } = musicPlayer;

  // Initialize playlist if empty - must be in useEffect to avoid setState during render
  useEffect(() => {
    if (musicPlayer.playlist.length === 0 && tracks.length > 0) {
      setPlaylist(tracks);
    }
  }, [musicPlayer.playlist.length, tracks, setPlaylist]);

  const handleToggle = () => {
    if (isPlaying) {
      pauseMusic();
    } else if (currentTrack) {
      resumeMusic();
    } else if (tracks.length > 0) {
      playTrack(tracks[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <Music
          size={24}
          style={{
            color: '#F97316',
            filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.5))',
          }}
        />
        <h2
          className="text-xl font-bold relative text-primary"
        >
          Background Music
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

      {/* Music Player Container */}
      <motion.div
        className={`relative flex items-center gap-5 p-5 overflow-hidden ${isPlaying ? 'playing' : ''}`}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(249, 115, 22, 0.2)',
          borderRadius: '20px',
        }}
      >
        {/* Animated shimmer background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(249, 115, 22, 0.1) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
          }}
          animate={isPlaying && !prefersReducedMotion ? {
            backgroundPosition: ['-200% 0%', '200% 0%'],
          } : {
            opacity: 0,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Music icon with pulse animation */}
        <motion.div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'rgba(249, 115, 22, 0.2)',
          }}
          animate={isPlaying && !prefersReducedMotion ? {
            scale: [1, 1.05, 1],
          } : {
            scale: 1,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Music size={24} style={{ color: '#F97316' }} />
        </motion.div>

        {/* Track info and equalizer */}
        <div className="flex-1 flex items-center gap-4">
          <div>
            <span
              className="font-medium block text-primary"
            >
              {currentTrack?.title || 'Wojak Vibes'}
            </span>
            {currentTrack?.artist && (
              <span
                className="text-sm text-muted"
              >
                {currentTrack.artist}
              </span>
            )}
          </div>
          <Equalizer isPlaying={isPlaying} />
        </div>

        {/* Play/Pause button with animation */}
        <motion.button
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isPlaying ? 'var(--color-error)' : '#F97316',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={handleToggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: isPlaying
              ? '0 0 20px rgba(239, 68, 68, 0.5)'
              : '0 0 20px rgba(249, 115, 22, 0.5)',
          }}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isPlaying ? 'pause' : 'play'}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {isPlaying ? (
                <Pause size={20} fill="white" />
              ) : (
                <Play size={20} fill="white" style={{ marginLeft: 2 }} />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </div>
  );
}

export default MusicPlayer;
