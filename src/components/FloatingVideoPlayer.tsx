import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import './FloatingVideoPlayer.css';

interface FloatingVideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoEnded?: () => void;
  platform: 'local' | 'youtube';
  videoSrc: string;
  nextVideoSrc?: string;
  title?: string;
  isBackgroundMusicEnabled?: boolean;
}

// Crossfade duration in seconds - how long before end to start fading
const CROSSFADE_DURATION = 4;

const FloatingVideoPlayer: React.FC<FloatingVideoPlayerProps> = ({
  isOpen,
  onClose,
  onVideoEnded,
  platform,
  videoSrc,
  nextVideoSrc,
  isBackgroundMusicEnabled = true,
}) => {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [crossfadeOpacity, setCrossfadeOpacity] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);

  // Track if we're currently fading
  const isFadingRef = useRef(false);
  const fadeAnimationRef = useRef<number | null>(null);

  // Perform smooth fade out and transition
  const performFadeTransition = useCallback(() => {
    if (!videoRef.current || isFadingRef.current) return;

    isFadingRef.current = true;
    const video = videoRef.current;
    const nextVideo = nextVideoRef.current;

    // Start playing next video silently for preload
    if (nextVideo && nextVideoSrc) {
      nextVideo.volume = 0;
      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => {});
    }

    const startTime = Date.now();
    const fadeDuration = CROSSFADE_DURATION * 1000;
    const startVolume = video.volume || 1;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);

      // Smooth ease-out curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      // Fade out current video
      const currentVolume = startVolume * (1 - easeProgress);
      try {
        video.volume = Math.max(0, currentVolume);
      } catch {
        // iOS volume control fallback
      }

      // Fade in next video audio
      if (nextVideo) {
        try {
          nextVideo.volume = easeProgress;
        } catch { /* iOS fallback */ }
      }

      // Visual crossfade
      setCrossfadeOpacity(1 - easeProgress);

      if (progress < 1) {
        fadeAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // Transition complete
        video.pause();
        isFadingRef.current = false;
        fadeAnimationRef.current = null;
        setCrossfadeOpacity(1);

        // Switch to next video
        if (onVideoEnded) {
          onVideoEnded();
        }
      }
    };

    fadeAnimationRef.current = requestAnimationFrame(animate);
  }, [nextVideoSrc, onVideoEnded]);

  // Handle timeupdate to detect crossfade point
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || isFadingRef.current) return;

    const video = videoRef.current;
    const timeRemaining = video.duration - video.currentTime;

    // Start fade when CROSSFADE_DURATION seconds remain
    // Only if video is long enough (at least 2x the fade duration)
    if (timeRemaining <= CROSSFADE_DURATION &&
        timeRemaining > 0 &&
        video.duration > CROSSFADE_DURATION * 2 &&
        nextVideoSrc) {
      performFadeTransition();
    }
  }, [nextVideoSrc, performFadeTransition]);

  // Preload next video
  useEffect(() => {
    if (nextVideoSrc && nextVideoRef.current) {
      nextVideoRef.current.src = nextVideoSrc;
      nextVideoRef.current.load();
    }
  }, [nextVideoSrc]);

  // Reset fade state when video source changes
  useEffect(() => {
    isFadingRef.current = false;
    // Defer state update to avoid synchronous setState in effect
    const timer = setTimeout(() => setCrossfadeOpacity(1), 0);
    if (fadeAnimationRef.current) {
      cancelAnimationFrame(fadeAnimationRef.current);
      fadeAnimationRef.current = null;
    }
    // Reset volume for new video
    if (videoRef.current) {
      try {
        videoRef.current.volume = 1;
      } catch { /* iOS fallback */ }
    }
    return () => clearTimeout(timer);
  }, [videoSrc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
      }
    };
  }, []);

  // Reset state and autoplay when opening
  useEffect(() => {
    if (isOpen && videoSrc) {
      queueMicrotask(() => {
        setPosition({ x: 20, y: 100 });
        setIsMinimized(false);
        setIsPlaying(false);
        setHasMoved(false);
      });

      // Only autoplay if background music is enabled
      if (platform === 'local' && isBackgroundMusicEnabled) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.volume = 1;
            videoRef.current.play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                // Autoplay blocked, try muted
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  videoRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => setIsPlaying(false));
                }
              });
          }
        }, 100);
      }
    }
  }, [isOpen, videoSrc, platform, isBackgroundMusicEnabled]);

  // Pause video when background music is disabled
  useEffect(() => {
    if (!isBackgroundMusicEnabled && isPlaying && videoRef.current) {
      videoRef.current.pause();
      queueMicrotask(() => setIsPlaying(false));
    }
  }, [isBackgroundMusicEnabled, isPlaying]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else if (isBackgroundMusicEnabled) {
        // Only allow play if background music is enabled
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Play failed
          });
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.close-x')) return;

    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    setIsDragging(true);
    setHasMoved(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragRef.current.startX;
    const deltaY = touch.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasMoved(true);
    }

    const newX = dragRef.current.startPosX + deltaX;
    const newY = dragRef.current.startPosY + deltaY;

    const playerWidth = isMinimized ? 50 : 260;
    const playerHeight = isMinimized ? 70 : 180;
    const tabBarHeight = 100; // Keep player above tab bar (includes safe area inset)
    const maxX = window.innerWidth - playerWidth;
    const maxY = window.innerHeight - playerHeight - tabBarHeight;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(50, Math.min(newY, maxY))
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.close-x')) return;

    if (!dragRef.current) {
      if (!hasMoved) {
        togglePlayPause();
      }
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - dragRef.current.startX;
    const deltaY = touch.clientY - dragRef.current.startY;
    const totalMovement = Math.abs(deltaX) + Math.abs(deltaY);

    if (totalMovement < 15 && !isMinimized && !hasMoved) {
      e.preventDefault();
      togglePlayPause();
    } else if (!isMinimized && Math.abs(deltaX) > 80) {
      const tabBarHeight = 100;
      const maxY = window.innerHeight - 70 - tabBarHeight; // 70 is minimized height
      if (deltaX < 0) {
        setIsMinimized(true);
        setPosition(prev => ({ x: 0, y: Math.min(prev.y, maxY) }));
      } else {
        setIsMinimized(true);
        setPosition(prev => ({ x: window.innerWidth - 50, y: Math.min(prev.y, maxY) }));
      }
    }

    setIsDragging(false);
    dragRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    setIsDragging(true);
    setHasMoved(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!dragRef.current) return;

        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;

        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          setHasMoved(true);
        }

        const newX = dragRef.current.startPosX + deltaX;
        const newY = dragRef.current.startPosY + deltaY;

        const playerWidth = isMinimized ? 50 : 260;
        const playerHeight = isMinimized ? 70 : 180;
        const tabBarHeight = 100; // Keep player above tab bar
        const maxX = window.innerWidth - playerWidth;
        const maxY = window.innerHeight - playerHeight - tabBarHeight;

        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(50, Math.min(newY, maxY))
        });
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        if (dragRef.current) {
          const deltaX = e.clientX - dragRef.current.startX;
          const deltaY = e.clientY - dragRef.current.startY;
          const totalMovement = Math.abs(deltaX) + Math.abs(deltaY);

          if (totalMovement < 10 && !isMinimized) {
            togglePlayPause();
          }
        }
        setIsDragging(false);
        dragRef.current = null;
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, isMinimized, isPlaying]);

  const handleExpand = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsMinimized(false);
    const centerX = Math.max(20, (window.innerWidth - 260) / 2);
    setPosition(prev => ({ ...prev, x: centerX }));
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (fadeAnimationRef.current) {
      cancelAnimationFrame(fadeAnimationRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isOnRightSide = position.x > window.innerWidth / 2;
  const isFading = crossfadeOpacity < 1;

  return (
    <div
      ref={containerRef}
      className={`floating-video-player ${isMinimized ? 'minimized' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div
        className="video-wrapper"
        style={{ display: isMinimized ? 'none' : 'block' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {platform === 'youtube' ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoSrc}?autoplay=1&playsinline=1&mute=0&enablejsapi=1`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        ) : (
          <>
            {/* Next video (behind, for crossfade) */}
            {nextVideoSrc && (
              <video
                ref={nextVideoRef}
                playsInline
                className="crossfade-video"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}
            {/* Current video (on top) */}
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => {
                if (!isFadingRef.current && onVideoEnded) {
                  onVideoEnded();
                }
              }}
              style={{
                position: 'relative',
                zIndex: 2,
                opacity: crossfadeOpacity,
              }}
            />
          </>
        )}
        <button className="close-x" onClick={handleClose}>×</button>
        {!isPlaying && !isFading && (
          <div className="play-indicator">▶</div>
        )}
      </div>

      {isMinimized && (
        <div
          className="minimized-player"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => {
            if (!hasMoved) {
              handleExpand(e);
            }
            setIsDragging(false);
            dragRef.current = null;
          }}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (!hasMoved) {
              handleExpand(e);
            }
          }}
        >
          {isOnRightSide ? <ChevronLeft className="expand-icon" size={20} /> : <ChevronRight className="expand-icon" size={20} />}
          <div className="mini-title">{isPlaying ? '▶' : '⏸'}</div>
        </div>
      )}
    </div>
  );
};

export default FloatingVideoPlayer;
