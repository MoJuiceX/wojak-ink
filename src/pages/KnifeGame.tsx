/**
 * Knife Game - Coming Soon Placeholder
 *
 * Split-screen layout with game info on left, media player on right.
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useGameNavigationGuard } from '@/hooks/useGameNavigationGuard';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { GameSEO } from '@/components/seo/GameSEO';
import './KnifeGame.css';

const AUDIO_URL = '/assets/Games/games_media/The New Knife Game Song - Rusty Cage.mp3';
const IMAGE_URL = '/assets/Games/games_media/Knife_Game.webp';

const KnifeGame: React.FC = () => {
  const isMobile = useIsMobile();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(75); // 1:15
  const audioRef = useRef<HTMLAudioElement>(null);
  const { settings } = useSettings();

  // Navigation guard - prevents accidental exits during gameplay
  const { showExitDialog, confirmExit, cancelExit } = useGameNavigationGuard({
    isPlaying: isPlaying,
  });

  // Mobile fullscreen mode - hide header during gameplay
  useEffect(() => {
    if (isMobile && isPlaying) {
      document.body.classList.add('game-fullscreen-mode');
    } else {
      document.body.classList.remove('game-fullscreen-mode');
    }
    return () => {
      document.body.classList.remove('game-fullscreen-mode');
    };
  }, [isMobile, isPlaying]);

  // Calculate volume from settings
  const musicEnabled = settings.audio.backgroundMusicEnabled;
  const volume = settings.audio.backgroundMusicVolume;

  // Sync volume with settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicEnabled ? volume : 0;
    }
  }, [volume, musicEnabled]);

  // Visibility change handling - pause audio when browser goes to background (mobile)
  const wasPlayingBeforeHiddenRef = useRef(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - remember if audio was playing and pause it
        wasPlayingBeforeHiddenRef.current = isPlaying;
        if (audioRef.current && isPlaying) {
          audioRef.current.pause();
        }
      } else {
        // Page became visible - resume audio if it was playing before
        if (wasPlayingBeforeHiddenRef.current && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setCurrentTime(audioRef.current.currentTime);
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      // Also update duration if not set yet
      if (duration === 0 && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleCanPlay = () => {
    if (audioRef.current && audioRef.current.duration > 0 && duration === 0) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="knife-page">
      <GameSEO
        gameName="Knife Game"
        gameSlug="knife"
        description="The classic knife game - test your nerve! Stab between your fingers as fast as you can without cutting yourself."
        genre="Arcade"
        difficulty="Hard"
      />
      <div className="knife-content">
        <div className="knife-area">
          <div className="game-menu-split">
            {/* Left side - Game Info */}
            <div className="menu-left">
              <div className="game-title">The Knife Game</div>
              <div className="game-emoji">🔪</div>
              <p className="game-desc">The classic knife game - stab between your fingers!</p>
              <p className="game-desc">Don't cut yourself!</p>
              <div className="coming-soon-badge">Coming Soon</div>
            </div>

            {/* Right side - Media Player */}
            <div className="menu-right">
              <div className="knife-player">
                <img
                  src={IMAGE_URL}
                  alt="The Knife Game"
                  className="player-artwork"
                />

                <div className="player-info">
                  <div className="player-track-name">The New Knife Game Song</div>
                  <div className="player-track-artist">Rusty Cage</div>
                </div>

                <button
                  className={`player-play-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={28} fill="white" />
                  ) : (
                    <Play size={28} fill="white" style={{ marginLeft: 3 }} />
                  )}
                </button>

                {/* Progress Bar */}
                <div className="player-progress-container" onClick={handleSeek}>
                  <div className="player-progress-bar">
                    <div
                      className="player-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="player-time">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            src={AUDIO_URL}
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onDurationChange={handleLoadedMetadata}
            onEnded={handleEnded}
          />

          {/* Exit Game Confirmation Dialog */}
          <ConfirmModal
            isOpen={showExitDialog}
            onClose={cancelExit}
            onConfirm={confirmExit}
            title="Leave Game?"
            message="Your progress will be lost. Are you sure you want to leave?"
            confirmText="Leave"
            cancelText="Stay"
            variant="warning"
            icon="🎮"
          />
        </div>
      </div>
    </div>
  );
};

export default KnifeGame;
