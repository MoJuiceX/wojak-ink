/**
 * GameHUD Component
 *
 * Universal premium glassmorphism HUD for all games.
 * Displays score, level, combo, lives, time, and custom stats.
 */

import React from 'react';
import './GameHUD.css';

interface CustomStat {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

interface GameHUDProps {
  score: number;
  level?: number;
  combo?: number;
  lives?: number;
  time?: number;
  progress?: { current: number; total: number };
  customStats?: CustomStat[];
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  accentColor?: string;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  level,
  combo,
  lives,
  time,
  progress,
  customStats,
  position = 'top',
  accentColor = '#ff6b00',
  compact = false,
}) => {
  return (
    <div className={`game-hud game-hud-${position} ${compact ? 'game-hud-compact' : ''}`}>
      {/* Level */}
      {level !== undefined && (
        <div className="hud-stat hud-stat-level">
          <span className="hud-stat-value" style={{ color: 'var(--color-gold-bright)' }}>
            {level}
          </span>
          <span className="hud-stat-label">LVL</span>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="hud-stat hud-stat-progress">
          <span className="hud-stat-value" style={{ color: accentColor }}>
            {progress.current}/{progress.total}
          </span>
          <span className="hud-stat-label">PROGRESS</span>
        </div>
      )}

      {/* Score - Always shown */}
      <div className="hud-stat hud-stat-score">
        <span className="hud-stat-value" style={{ color: 'var(--color-green-bright)' }}>
          {score.toLocaleString()}
        </span>
        <span className="hud-stat-label">SCORE</span>
      </div>

      {/* Combo */}
      {combo !== undefined && combo > 1 && (
        <div className="hud-stat hud-stat-combo">
          <span className="hud-stat-value" style={{ color: accentColor }}>
            {combo}x
          </span>
          <span className="hud-stat-label">COMBO</span>
        </div>
      )}

      {/* Lives */}
      {lives !== undefined && (
        <div className="hud-stat hud-stat-lives">
          <span className="hud-stat-value hud-stat-lives-hearts">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <span key={i} className="hud-heart">❤️</span>
            ))}
          </span>
          <span className="hud-stat-label">LIVES</span>
        </div>
      )}

      {/* Time */}
      {time !== undefined && (
        <div className="hud-stat hud-stat-time">
          <span className="hud-stat-value" style={{ color: 'var(--color-cyan-light)' }}>
            {formatTime(time)}
          </span>
          <span className="hud-stat-label">TIME</span>
        </div>
      )}

      {/* Custom Stats */}
      {customStats?.map((stat, index) => (
        <div key={index} className="hud-stat hud-stat-custom">
          <span className="hud-stat-value" style={{ color: stat.color || '#fff' }}>
            {stat.icon && <span className="hud-stat-icon">{stat.icon}</span>}
            {stat.value}
          </span>
          <span className="hud-stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
};

export default GameHUD;
