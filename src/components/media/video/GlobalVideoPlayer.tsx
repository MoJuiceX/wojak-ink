/**
 * Global Video Player Component
 *
 * Persistent video player that stays visible across all pages.
 * Auto-minimizes when dragged near screen edges.
 * When minimized: snaps to edges, circular progress around button.
 * When expanded: free positioning, progress bar at bottom.
 * Auto-plays next video with smooth crossfade transition.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { useMedia } from '@/contexts/MediaContext';
import { useSettings } from '@/contexts/SettingsContext';

const PLAYER_WIDTH = 320;
const PLAYER_HEIGHT = 200;
const MINIMIZED_SIZE = 64;
const EDGE_MARGIN = 12;
const TOP_OFFSET = 68;
const MINIMIZE_THRESHOLD = 0.3; // Minimize when 30% is outside screen

type EdgePosition = 'left' | 'right' | 'top' | 'bottom';

export function GlobalVideoPlayer() {
  const { videoPlayer, pauseVideo, nextVideo } = useMedia();
  const { currentVideo, queue } = videoPlayer;
  const { settings } = useSettings();


  // Calculate video volume from settings (videos use background music volume setting)
  const videoEnabled = settings.audio.backgroundMusicEnabled;
  const videoVolume = settings.audio.backgroundMusicVolume;

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video volume with settings
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoEnabled ? videoVolume : 0;
    }
  }, [videoVolume, videoEnabled]);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentEdge, setCurrentEdge] = useState<EdgePosition>('left');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const x = useMotionValue(16);
  const y = useMotionValue(100);

  // Calculate snap position for minimized button based on edge
  const getSnapPosition = useCallback((targetEdge: EdgePosition, alongPosition: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    switch (targetEdge) {
      case 'left':
        return {
          x: EDGE_MARGIN,
          y: Math.max(TOP_OFFSET, Math.min(alongPosition, h - MINIMIZED_SIZE - EDGE_MARGIN)),
        };
      case 'right':
        return {
          x: w - MINIMIZED_SIZE - EDGE_MARGIN,
          y: Math.max(TOP_OFFSET, Math.min(alongPosition, h - MINIMIZED_SIZE - EDGE_MARGIN)),
        };
      case 'top':
        return {
          x: Math.max(EDGE_MARGIN, Math.min(alongPosition, w - MINIMIZED_SIZE - EDGE_MARGIN)),
          y: TOP_OFFSET,
        };
      case 'bottom':
        return {
          x: Math.max(EDGE_MARGIN, Math.min(alongPosition, w - MINIMIZED_SIZE - EDGE_MARGIN)),
          y: h - MINIMIZED_SIZE - EDGE_MARGIN,
        };
    }
  }, []);

  // Determine closest edge from a position
  const getClosestEdge = useCallback((posX: number, posY: number): EdgePosition => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const distLeft = posX;
    const distRight = w - posX - MINIMIZED_SIZE;
    const distTop = posY - TOP_OFFSET;
    const distBottom = h - posY - MINIMIZED_SIZE;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft) return 'left';
    if (minDist === distRight) return 'right';
    if (minDist === distTop) return 'top';
    return 'bottom';
  }, []);

  // Track if this is the first video (to set initial position) vs auto-play next
  const isFirstVideoRef = useRef(true);

  // Auto-play when video changes - preserve minimize state for auto-play next
  useEffect(() => {
    if (!currentVideo) return;

    // Reset progress for new video
    setProgress(0);

    // Only reset position on first video, not on auto-play next
    if (isFirstVideoRef.current) {
      isFirstVideoRef.current = false;
      x.set(16);
      y.set(100);
    }

    // Auto-play the video
    const video = videoRef.current;
    if (video) {
      const playVideo = () => {
        video.play().catch(console.error);
      };

      // If video is already ready, play immediately
      if (video.readyState >= 3) {
        video.currentTime = 0;
        playVideo();
      } else {
        // Wait for video to be ready
        const handleCanPlay = () => {
          playVideo();
          video.removeEventListener('canplay', handleCanPlay);
        };
        video.addEventListener('canplay', handleCanPlay);
        return () => video.removeEventListener('canplay', handleCanPlay);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id]);

  // Track play state and progress from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onTimeUpdate = () => {
      if (video.duration > 0) {
        setProgress(video.currentTime / video.duration);
      }
    };

    const onEnded = () => {
      // Immediately go to next video in queue for seamless playback
      if (queue.length > 1) {
        nextVideo();
      } else {
        setIsPlaying(false);
        pauseVideo();
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);

    setIsPlaying(!video.paused);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [pauseVideo, currentVideo, queue.length, nextVideo]);

  // Ensure video continues playing after minimize/maximize transition
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const timer = setTimeout(() => {
      if (isPlaying && video.paused) {
        video.play().catch(console.error);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isMinimized, isPlaying]);

  const togglePlayStop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, []);


  // Ensure video keeps playing during drag and track drag state
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDrag = useCallback(() => {
    const video = videoRef.current;
    if (video && isPlaying && video.paused) {
      video.play().catch(() => {});
    }

    // When minimized, constrain to edges in real-time
    if (isMinimized) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const currentX = x.get();
      const currentY = y.get();

      // Find nearest edge and snap to it
      const newEdge = getClosestEdge(currentX, currentY);

      // Get the position along the edge
      const alongPosition = (newEdge === 'left' || newEdge === 'right') ? currentY : currentX;
      const snapPos = getSnapPosition(newEdge, alongPosition);

      // Only update the coordinate that should be fixed (the edge side)
      if (newEdge === 'left' || newEdge === 'right') {
        x.set(snapPos.x);
        // Constrain Y within bounds
        const constrainedY = Math.max(TOP_OFFSET, Math.min(currentY, h - MINIMIZED_SIZE - EDGE_MARGIN));
        y.set(constrainedY);
      } else {
        y.set(snapPos.y);
        // Constrain X within bounds
        const constrainedX = Math.max(EDGE_MARGIN, Math.min(currentX, w - MINIMIZED_SIZE - EDGE_MARGIN));
        x.set(constrainedX);
      }

      setCurrentEdge(newEdge);
    }
  }, [isPlaying, isMinimized, x, y, getClosestEdge, getSnapPosition]);

  const handleDragEnd = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Get the actual current position (framer-motion updates x/y during drag)
    const finalX = x.get();
    const finalY = y.get();

    // Ensure video keeps playing after drag ends
    const video = videoRef.current;
    if (video && isPlaying && video.paused) {
      video.play().catch(() => {});
    }

    // Reset drag flag after a short delay (to prevent click from firing)
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);

    if (isMinimized) {
      // When minimized, snap to current edge position
      const alongPosition = (currentEdge === 'left' || currentEdge === 'right') ? finalY : finalX;
      const snapPos = getSnapPosition(currentEdge, alongPosition);

      x.set(snapPos.x);
      y.set(snapPos.y);
    } else {
      // Calculate how many pixels are outside each edge
      const outsideLeft = finalX < 0 ? Math.abs(finalX) : 0;
      const outsideRight = (finalX + PLAYER_WIDTH) > w ? (finalX + PLAYER_WIDTH) - w : 0;
      const outsideTop = finalY < TOP_OFFSET ? TOP_OFFSET - finalY : 0;
      const outsideBottom = (finalY + PLAYER_HEIGHT) > h ? (finalY + PLAYER_HEIGHT) - h : 0;

      // Calculate percentage outside (only count if actually outside screen)
      const percentOutsideLeft = outsideLeft / PLAYER_WIDTH;
      const percentOutsideRight = outsideRight / PLAYER_WIDTH;
      const percentOutsideTop = outsideTop / PLAYER_HEIGHT;
      const percentOutsideBottom = outsideBottom / PLAYER_HEIGHT;

      // Check if 30%+ is outside on any side
      const shouldMinimize =
        percentOutsideLeft >= MINIMIZE_THRESHOLD ||
        percentOutsideRight >= MINIMIZE_THRESHOLD ||
        percentOutsideTop >= MINIMIZE_THRESHOLD ||
        percentOutsideBottom >= MINIMIZE_THRESHOLD;

      if (shouldMinimize) {
        // Minimize and snap to the edge where it went outside
        setIsMinimized(true);
        const newEdge = getClosestEdge(finalX, finalY);
        setCurrentEdge(newEdge);
        const alongPosition = (newEdge === 'left' || newEdge === 'right') ? finalY : finalX;
        const snapPos = getSnapPosition(newEdge, alongPosition);

        x.set(snapPos.x);
        y.set(snapPos.y);
      } else {
        // Stay expanded - keep it where user dropped it (within screen bounds)
        const safeX = Math.max(0, Math.min(finalX, w - PLAYER_WIDTH));
        const safeY = Math.max(TOP_OFFSET, Math.min(finalY, h - PLAYER_HEIGHT));

        x.set(safeX);
        y.set(safeY);
      }
    }
  }, [isMinimized, currentEdge, isPlaying, x, y, getClosestEdge, getSnapPosition]);

  // Special click handler for minimized button - waits to see if it's a double-click
  const handleMinimizedClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    // Ignore clicks that happened during/right after drag
    if (isDraggingRef.current) return;

    if (clickTimeoutRef.current) {
      // Second click came quickly - it's a double-click, expand the player
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setIsMinimized(false);
      x.set(Math.max(EDGE_MARGIN, (window.innerWidth - PLAYER_WIDTH) / 2));
      y.set(100);
    } else {
      // First click - wait to see if another click comes
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        // No second click came - it's a single click, toggle play/pause
        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play().catch(console.error);
          } else {
            video.pause();
          }
        }
      }, 250); // 250ms window for double-click
    }
  }, [x, y]);

  if (!currentVideo) return null;

  const width = isMinimized ? MINIMIZED_SIZE : PLAYER_WIDTH;
  const height = isMinimized ? MINIMIZED_SIZE : PLAYER_HEIGHT;

  // Circular progress for minimized state
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <motion.div
      className="fixed z-50"
      style={{ x, y, width, height }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={{ width, height, borderRadius: isMinimized ? 32 : 12 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          borderRadius: isMinimized ? 32 : 12,
          opacity: isMinimized ? 0 : 1,
          pointerEvents: 'none',
        }}
        src={currentVideo.videoUrl}
        poster={currentVideo.thumbnailUrl}
        playsInline
        preload="auto"
      />

      {isMinimized ? (
        /* Minimized: Play/Stop button with circular progress - all visuals have pointerEvents none */
        <motion.div
          className="relative w-full h-full cursor-grab active:cursor-grabbing"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={handleMinimizedClick}
        >
          {/* All visual content - pointer events disabled so drag works */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Circular progress SVG */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 64 64"
            >
              {/* Background circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--color-white-20)"
                strokeWidth="4"
              />
              {/* Progress circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
              />
            </svg>

            {/* Play/Pause visual */}
            <div
              className="absolute inset-1 rounded-full flex items-center justify-center"
              style={{
                background: isPlaying
                  ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
                  : 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                boxShadow: isPlaying
                  ? '0 0 20px rgba(255, 68, 68, 0.5), 0 4px 20px rgba(0,0,0,0.4)'
                  : '0 0 20px var(--color-primary-50), 0 4px 20px var(--color-black-40)',
              }}
            >
              {isPlaying ? (
                <Pause size={24} fill="white" color="white" />
              ) : (
                <Play size={24} fill="white" color="white" style={{ marginLeft: 3 }} />
              )}
            </div>
          </div>

          {/* Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs pointer-events-none"
                style={{
                  top: MINIMIZED_SIZE + 8,
                  background: 'var(--color-black-90)',
                  color: 'white',
                }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                Double tap to expand
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* Expanded: Full player with progress bar */
        <motion.div
          className="w-full h-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid var(--color-primary-30)',
            boxShadow: '0 0 40px var(--color-primary-20), 0 25px 50px var(--color-black-50)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Video area with hover-to-show controls */}
          <div
            className="relative h-full"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Clickable overlay for play/pause */}
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={togglePlayStop}
            />

            {/* Play/Pause button - only visible on hover */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-full flex items-center justify-center pointer-events-auto cursor-pointer"
                    style={{
                      background: 'rgba(249, 115, 22, 0.9)',
                      boxShadow: '0 0 30px rgba(249, 115, 22, 0.6)',
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlayStop}
                  >
                    {isPlaying ? (
                      <Pause size={28} fill="white" color="white" />
                    ) : (
                      <Play size={28} fill="white" color="white" style={{ marginLeft: 3 }} />
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar at very bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: 'var(--color-white-20)' }}
          >
            <motion.div
              className="h-full"
              style={{
                background: 'var(--color-primary)',
                width: `${progress * 100}%`,
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default GlobalVideoPlayer;
