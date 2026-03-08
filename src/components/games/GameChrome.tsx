/**
 * Game Chrome
 *
 * Unified top bar for all games with back button, title, pause, and sound controls.
 * Consistent styling and animations across all mini-games.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import './GameChrome.css';

interface GameChromeProps {
  gameName: string;
  onBack: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  score?: number;
  highScore?: number;
  showPause?: boolean;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export const GameChrome: React.FC<GameChromeProps> = ({
  gameName,
  onBack,
  soundEnabled,
  onToggleSound,
  score,
  highScore = 0,
  showPause = true,
  isPaused = false,
  onPause,
  onResume,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const handlePauseToggle = () => {
    if (isPaused && onResume) {
      onResume();
    } else if (!isPaused && onPause) {
      onPause();
    }
  };

  return (
    <>
      {/* Top bar */}
      <motion.div
        className="game-chrome-top"
        initial={prefersReducedMotion ? { opacity: 0 } : { y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Back button */}
        <motion.button
          type="button"
          className="chrome-btn"
          onClick={onBack}
          whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </motion.button>

        {/* Game title */}
        <div className="chrome-title">{gameName}</div>

        {/* Right controls */}
        <div className="chrome-controls">
          {showPause && (onPause || onResume) && (
            <motion.button
              type="button"
              className="chrome-btn"
              onClick={handlePauseToggle}
              whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </motion.button>
          )}

          <motion.button
            type="button"
            className="chrome-btn"
            onClick={onToggleSound}
            whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </motion.button>
        </div>
      </motion.div>

      {/* Score display */}
      {score !== undefined && (
        <motion.div
          className="game-chrome-score"
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
        >
          <div className="score-block current-score">
            <span className="score-label">Score</span>
            <motion.span
              className="score-value"
              key={score}
              initial={prefersReducedMotion ? {} : { scale: 1.5, color: '#F97316' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.2 }}
            >
              {score.toLocaleString()}
            </motion.span>
          </div>
          {highScore > 0 && (
            <div className="score-block high-score">
              <span className="score-label">Best</span>
              <span className="score-value">{highScore.toLocaleString()}</span>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
};

export default GameChrome;
