/**
 * Knife Game - Coming Soon (Migrated to Shared Systems)
 */
import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { GameShell } from '@/systems/game-ui';
import { KNIFE_GAME_CONFIG, AUDIO_URL, IMAGE_URL } from './config';
import './KnifeGame.game.css';

const KnifeGameContent: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(75);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { settings } = useSettings();

  const musicEnabled = settings.audio.backgroundMusicEnabled;
  const volume = settings.audio.backgroundMusicVolume;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicEnabled ? volume : 0;
    }
  }, [volume, musicEnabled]);

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
      <div className="knife-content">
        <div className="knife-area">
          <div className="game-menu-split">
            <div className="menu-left">
              <div className="game-title">The Knife Game</div>
              <div className="game-emoji">🔪</div>
              <p className="game-desc">The classic knife game - stab between your fingers!</p>
              <p className="game-desc">Don't cut yourself!</p>
              <div className="coming-soon-badge">Coming Soon</div>
            </div>

            <div className="menu-right">
              <div className="knife-player">
                <img src={IMAGE_URL} alt="The Knife Game" className="player-artwork" />

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

                <div className="player-progress-container" onClick={handleSeek}>
                  <div className="player-progress-bar">
                    <div className="player-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="player-time">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={AUDIO_URL}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          />
        </div>
      </div>
    </div>
  );
};

const KnifeGame: React.FC = () => (
  <GameShell gameId={KNIFE_GAME_CONFIG.id}>
    <KnifeGameContent />
  </GameShell>
);

export default KnifeGame;
