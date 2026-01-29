/**
 * GameEffects Component
 *
 * Renders all visual effects for games.
 * Add this component inside your game container.
 */

import React, { useState } from 'react';
import type { GameEffectsState } from './useGameEffects';
import './GameEffects.css';

// Pre-generate confetti styles to avoid Math.random during render
const CONFETTI_COLORS = ['#ff6b00', '#ffd700', '#00ff88', '#00bfff', '#a855f7', '#ff0080'];

interface ConfettiPieceStyle {
  x: string;
  delay: string;
  color: string;
}

function generateConfettiStyles(count: number): ConfettiPieceStyle[] {
  return Array.from({ length: count }, () => ({
    x: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));
}

interface GameEffectsProps {
  /** Effects state from useGameEffects hook */
  effects: GameEffectsState;
  /** Accent color for effects (default: orange) */
  accentColor?: string;
}

export const GameEffects: React.FC<GameEffectsProps> = ({
  effects,
  accentColor = '#ff6b00',
}) => {
  // Pre-generate confetti styles on first render to avoid Math.random during render
  const [confettiStyles] = useState<ConfettiPieceStyle[]>(() => generateConfettiStyles(50));

  return (
    <div className="game-effects-container">
      {/* Shockwave - Expanding ring on impact */}
      {effects.showShockwave && (
        <div
          className="effect-shockwave"
          style={{
            left: '50%',
            top: '50%',
            borderColor: effects.shockwaveColor || accentColor,
            transform: `translate(-50%, -50%) scale(${effects.shockwaveScale || 1})`,
          }}
        />
      )}

      {/* Impact Sparks - Flying particles */}
      {effects.showImpactSparks && (
        <div
          className="effect-sparks"
          style={{
            left: '50%',
            top: '50%',
            color: effects.sparksColor || accentColor,
          }}
        >
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="spark"
              style={{
                '--spark-angle': `${i * 45}deg`,
                color: effects.sparksColor || accentColor,
              } as React.CSSProperties}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      {/* Vignette Pulse - Edge darkening flash */}
      {effects.showVignette && (
        <div
          className="effect-vignette"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, ${effects.vignetteColor || accentColor}4D 100%)`,
          }}
        />
      )}

      {/* Floating Emojis - Rise up and fade */}
      {effects.floatingEmojis.map((emoji) => (
        <div key={emoji.id} className="effect-floating-emoji" style={{ left: `${emoji.x}%` }}>
          {emoji.emoji}
        </div>
      ))}

      {/* Epic Callout Text - "UNSTOPPABLE!", "LEGENDARY!", etc. */}
      {effects.epicCallout && <div className="effect-epic-callout">{effects.epicCallout}</div>}

      {/* Confetti Explosion */}
      {effects.showConfetti && (
        <div className="effect-confetti-container">
          {confettiStyles.map((style, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={
                {
                  '--confetti-x': style.x,
                  '--confetti-delay': style.delay,
                  '--confetti-color': style.color,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* Score Popups - Flying +/- points */}
      {effects.scorePopups.map((popup) => (
        <div
          key={popup.id}
          className={`effect-score-popup ${popup.prefix ? 'with-prefix' : ''}`}
          style={{
            left: `${popup.x}%`,
            top: `${popup.y}%`,
            color: popup.color || '#ffd700',
          }}
        >
          {popup.prefix && <span className="score-popup-prefix">{popup.prefix}</span>}
          <span className="score-popup-value">{popup.prefix ? '' : '+'}{popup.score}</span>
        </div>
      ))}

      {/* Combo Display - Escalating combo counter */}
      {effects.combo > 1 && (
        <div className={`effect-combo combo-level-${Math.min(effects.combo, 10)}`}>
          <span className="combo-number">{effects.combo}</span>
          <span className="combo-label">COMBO</span>
          {effects.combo >= 5 && <span className="combo-fire">🔥</span>}
          {effects.combo >= 8 && <span className="combo-stars">⭐</span>}
        </div>
      )}
    </div>
  );
};

export default GameEffects;
