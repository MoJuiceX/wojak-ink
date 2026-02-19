/**
 * Sound Settings Components
 *
 * UI components for controlling sound volume and mute state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { SoundManager } from './SoundManager';
import './audio.css';

/**
 * Full sound settings panel with sliders
 */
export const SoundSettings: React.FC = () => {
  const [volumes, setVolumes] = useState(SoundManager.getVolumes());

  // Sync state with SoundManager
  const refreshVolumes = useCallback(() => {
    setVolumes(SoundManager.getVolumes());
  }, []);

  useEffect(() => {
    queueMicrotask(() => refreshVolumes());
  }, [refreshVolumes]);

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    SoundManager.setMasterVolume(value);
    refreshVolumes();
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    SoundManager.setSfxVolume(value);
    refreshVolumes();
  };

  const handleUiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    SoundManager.setUiVolume(value);
    refreshVolumes();
  };

  const handleToggleMute = () => {
    SoundManager.toggleMute();
    refreshVolumes();
  };

  return (
    <div className="sound-settings">
      {/* Mute Toggle */}
      <div className="sound-setting-row">
        <div className="sound-setting-label">
          {volumes.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span>Sound Effects</span>
        </div>
        <div
          role="switch"
          aria-checked={!volumes.muted}
          aria-label={volumes.muted ? 'Enable sound' : 'Disable sound'}
          onClick={handleToggleMute}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '52px',
            height: '24px',
            borderRadius: '9999px',
            background: !volumes.muted ? 'var(--color-primary)' : 'var(--color-white-10)',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              fontSize: '9px',
              fontWeight: 600,
              lineHeight: 1,
              color: !volumes.muted ? 'var(--color-white-90)' : 'var(--color-white-40)',
              left: !volumes.muted ? '6px' : undefined,
              right: !volumes.muted ? undefined : '6px',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {!volumes.muted ? 'ON' : 'OFF'}
          </span>
          <div
            style={{
              position: 'absolute',
              width: '18px',
              height: '18px',
              top: '3px',
              borderRadius: '9999px',
              background: 'white',
              left: !volumes.muted ? '31px' : '3px',
              transition: 'left 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Volume sliders (only show when not muted) */}
      {!volumes.muted && (
        <>
          {/* Master Volume */}
          <div className="sound-setting-row">
            <div className="sound-setting-label">
              <Volume1 size={16} />
              <span>Master Volume</span>
            </div>
            <div className="sound-slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumes.master}
                onChange={handleMasterChange}
                className="sound-slider"
              />
              <span className="sound-slider-value">{Math.round(volumes.master * 100)}%</span>
            </div>
          </div>

          {/* SFX Volume */}
          <div className="sound-setting-row">
            <div className="sound-setting-label">
              <Volume1 size={16} />
              <span>Game Sounds</span>
            </div>
            <div className="sound-slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumes.sfx}
                onChange={handleSfxChange}
                className="sound-slider"
              />
              <span className="sound-slider-value">{Math.round(volumes.sfx * 100)}%</span>
            </div>
          </div>

          {/* UI Volume */}
          <div className="sound-setting-row">
            <div className="sound-setting-label">
              <Volume1 size={16} />
              <span>UI Sounds</span>
            </div>
            <div className="sound-slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumes.ui}
                onChange={handleUiChange}
                className="sound-slider"
              />
              <span className="sound-slider-value">{Math.round(volumes.ui * 100)}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Quick mute button for game UI
 */
interface MuteButtonProps {
  className?: string;
  size?: number;
}

export const MuteButton: React.FC<MuteButtonProps> = ({ className = '', size = 20 }) => {
  const [isMuted, setIsMuted] = useState(SoundManager.getMuted());

  const handleClick = () => {
    // Play button sound before muting
    if (!isMuted) {
      SoundManager.play('button-click');
    }
    const newMuted = SoundManager.toggleMute();
    setIsMuted(newMuted);
    // Play button sound after unmuting
    if (!newMuted) {
      SoundManager.play('button-click');
    }
  };

  return (
    <button
      className={`mute-button ${className}`}
      onClick={handleClick}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
};

/**
 * Inline mute toggle (icon only, no background)
 */
export const MuteToggle: React.FC<{ size?: number }> = ({ size = 20 }) => {
  const [isMuted, setIsMuted] = useState(SoundManager.getMuted());

  const handleClick = () => {
    const newMuted = SoundManager.toggleMute();
    setIsMuted(newMuted);
  };

  return (
    <button
      className="mute-toggle"
      onClick={handleClick}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
};

export default SoundSettings;
