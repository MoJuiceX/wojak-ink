/**
 * Floating Video Player Component
 *
 * Draggable video player with custom controls.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import { PLAYER_SIZES } from '@/types/media';
import { floatingPlayerVariants, playerControlsVariants } from '@/config/mediaAnimations';
import { formatDuration } from '@/utils/mockMediaData';

export function FloatingVideoPlayer() {
  const {
    videoPlayer,
    pauseVideo,
    closeVideoPlayer,
    setVideoVolume,
    seekVideo,
    togglePictureInPicture,
    setVideoPosition,
    toggleVideoMinimize,
  } = useMedia();

  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { currentVideo, isPlaying, currentTime, duration, volume, isMuted, position, size, isMinimized } =
    videoPlayer;

  const playerSize = PLAYER_SIZES[size];
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  // Reset hasStarted and isPaused when video changes
  useEffect(() => {
    queueMicrotask(() => {
      setHasStarted(false);
      setIsPaused(true);
    });
  }, [currentVideo?.id]);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying || isDragging) return;

    const hideControls = () => {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    hideControls();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isDragging, showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const handlePlayPause = () => {
    const video = localVideoRef.current;
    if (!video) {
      console.error('Video element not found');
      return;
    }

    if (video.paused) {
      // Start or resume playback
      video.play()
        .then(() => {
          setHasStarted(true);
          setIsPaused(false);
        })
        .catch((err) => {
          console.error('Play failed:', err);
        });
    } else {
      video.pause();
      setIsPaused(true);
      pauseVideo();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoVolume(parseFloat(e.target.value));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekVideo(parseFloat(e.target.value));
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { point: { x: number; y: number } }
  ) => {
    setIsDragging(false);
    setVideoPosition({
      x: info.point.x - playerSize.width / 2,
      y: info.point.y - playerSize.height / 2,
    });
  };

  if (!currentVideo) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="fixed z-50 rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: isMinimized ? 280 : playerSize.width,
          height: isMinimized ? 48 : playerSize.height + 80,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          left: position.x,
          top: position.y,
        }}
        variants={prefersReducedMotion ? undefined : floatingPlayerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        drag={!isMinimized}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setShowControls(true)}
      >
        {/* Video element */}
        {!isMinimized && (
          <div className="relative" style={{ height: playerSize.height }}>
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              src={currentVideo.videoUrl}
              poster={currentVideo.thumbnailUrl}
              playsInline
              preload="auto"
              onTimeUpdate={(e) => {
                const video = e.target as HTMLVideoElement;
                seekVideo(video.currentTime);
              }}
              onLoadedMetadata={(e) => {
                const video = e.target as HTMLVideoElement;
                video.volume = volume;
              }}
              onEnded={() => {
                pauseVideo();
                setHasStarted(false);
                setIsPaused(true);
              }}
              onCanPlay={() => {
              }}
              onError={(e) => {
                console.error('Video error:', e);
              }}
            />

            {/* Play/Pause overlay */}
            <AnimatePresence>
              {(showControls || !hasStarted) && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  style={{ background: !hasStarted ? 'var(--color-black-50)' : 'var(--color-black-30)' }}
                  variants={prefersReducedMotion ? undefined : playerControlsVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  onClick={handlePlayPause}
                >
                  <button
                    type="button"
                    className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
                    aria-label={!hasStarted ? 'Play video' : 'Pause'}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {!hasStarted || isPaused ? (
                        <Play size={32} fill="white" color="white" />
                      ) : (
                        <Pause size={32} fill="white" color="white" />
                      )}
                    </div>
                    {!hasStarted && (
                      <span className="text-white text-sm font-medium">Tap to play</span>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Controls bar */}
        <div
          className="p-2 space-y-2"
          style={{ background: 'var(--color-surface)' }}
        >
          {/* Title (minimized mode) */}
          {isMinimized && (
            <div className="flex items-center gap-2 px-2">
              <button
                type="button"
                className="p-1.5 rounded-lg transition-colors text-primary"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="flex-1 text-sm truncate text-primary">
                {currentVideo.title}
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs tabular-nums text-muted">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-primary) ${(currentTime / (duration || 1)) * 100}%, var(--color-border) ${(currentTime / (duration || 1)) * 100}%)`,
              }}
              aria-label="Video progress"
            />
            <span className="text-xs tabular-nums text-muted">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Control buttons */}
          {!isMinimized && (
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-1.5 rounded-lg transition-colors text-secondary"
                  aria-label="Previous"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                  }}
                  onClick={handlePlayPause}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg transition-colors text-secondary"
                  aria-label="Next"
                >
                  <SkipForward size={16} />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Volume */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg transition-colors text-secondary"
                    onClick={() => setVideoVolume(isMuted ? 0.8 : 0)}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={16} />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-primary) ${(isMuted ? 0 : volume) * 100}%, var(--color-border) ${(isMuted ? 0 : volume) * 100}%)`,
                    }}
                    aria-label="Volume"
                  />
                </div>

                {/* PiP button */}
                <button
                  type="button"
                  className="p-1.5 rounded-lg transition-colors text-secondary"
                  onClick={togglePictureInPicture}
                  aria-label="Picture in Picture"
                >
                  <PictureInPicture size={16} />
                </button>

                {/* Minimize button */}
                <button
                  type="button"
                  className="p-1.5 rounded-lg transition-colors text-secondary"
                  onClick={toggleVideoMinimize}
                  aria-label={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize size={16} /> : <Minimize size={16} />}
                </button>

                {/* Close button */}
                <button
                  type="button"
                  className="p-1.5 rounded-lg transition-colors text-secondary"
                  onClick={closeVideoPlayer}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Minimized controls */}
          {isMinimized && (
            <div className="flex items-center justify-end gap-1 px-2">
              <button
                type="button"
                className="p-1.5 rounded-lg transition-colors text-secondary"
                onClick={toggleVideoMinimize}
                aria-label="Expand"
              >
                <Maximize size={14} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg transition-colors text-secondary"
                onClick={closeVideoPlayer}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FloatingVideoPlayer;
