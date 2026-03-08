/**
 * Game Idle Screen
 *
 * Animated start screen for games with title, description,
 * controls hint, high score, and pulsing start button.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './GameIdleScreen.css';

interface GameIdleScreenProps {
  gameName: string;
  description?: string;
  controls?: string;
  highScore?: number;
  onStart: () => void;
  icon?: string;
}

export const GameIdleScreen: React.FC<GameIdleScreenProps> = ({
  gameName,
  description,
  controls = 'Tap to play',
  highScore = 0,
  onStart,
  icon = '🍊',
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="idle-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated background */}
      <div className="idle-bg">
        <div className="floating-emoji e1">{icon}</div>
        <div className="floating-emoji e2">🎮</div>
        <div className="floating-emoji e3">🏆</div>
      </div>

      <motion.div
        className="idle-content"
        initial={prefersReducedMotion ? {} : { y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Game title with glow */}
        <motion.h1
          className="idle-title"
          initial={prefersReducedMotion ? {} : { scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          {gameName}
        </motion.h1>

        {description && <p className="idle-desc">{description}</p>}

        {/* Controls hint */}
        <div className="idle-controls">
          <span className="control-icon">👆</span>
          <span>{controls}</span>
        </div>

        {/* High score display */}
        {highScore > 0 && (
          <div className="idle-high-score">
            <span>🏆</span> Best: {highScore.toLocaleString()}
          </div>
        )}

        {/* Start button */}
        <motion.button
          type="button"
          className="start-btn"
          onClick={onStart}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          animate={
            prefersReducedMotion
              ? {}
              : {
                  boxShadow: [
                    '0 0 20px var(--color-primary-40)',
                    '0 0 40px rgba(255, 107, 0, 0.6)',
                    '0 0 20px var(--color-primary-40)',
                  ],
                }
          }
          transition={{
            boxShadow: { duration: 1.5, repeat: Infinity },
          }}
        >
          TAP TO START
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default GameIdleScreen;
