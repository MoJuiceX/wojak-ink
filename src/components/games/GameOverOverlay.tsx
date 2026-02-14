/**
 * Game Over Overlay
 *
 * Enhanced game over screen with animated stats, high score celebration,
 * and glassmorphism styling.
 */

import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
const loadConfetti = () => import('canvas-confetti').then(m => m.default);
import { Share2, RotateCcw, LogOut } from 'lucide-react';
import './GameOverOverlay.css';

interface GameStats {
  [key: string]: string | number;
}

interface GameOverOverlayProps {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  stats?: GameStats;
  onPlayAgain: () => void;
  onExit: () => void;
  onShare?: () => void;
  gameId: string;
  gameName: string;
  sadImage?: string;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  score,
  highScore,
  isNewHighScore,
  stats,
  onPlayAgain,
  onExit,
  onShare,
  sadImage,
}) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isNewHighScore && !prefersReducedMotion) {
      loadConfetti().then(confetti => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F97316', '#FFD700', '#FF6B00', '#EA580C'],
        });
      });
    }
  }, [isNewHighScore, prefersReducedMotion]);

  const cardVariants = {
    hidden: { scale: 0.8, y: 50, opacity: 0 },
    visible: {
      scale: 1,
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
    },
  };

  const reducedCardVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      className="game-over-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="game-over-card"
        variants={prefersReducedMotion ? reducedCardVariants : cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="go-header">
          {isNewHighScore ? (
            <motion.div
              className="new-record-banner"
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <span className="trophy">🏆</span>
              <span>New High Score!</span>
            </motion.div>
          ) : (
            <h2 className="go-title">Game Over</h2>
          )}
        </div>

        {/* Sad image or emoji */}
        <motion.div
          className="go-image"
          initial={prefersReducedMotion ? {} : { rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {sadImage ? (
            <img src={sadImage} alt="Game Over" />
          ) : (
            <span className="go-emoji">{isNewHighScore ? '🎉' : '😵'}</span>
          )}
        </motion.div>

        {/* Score display */}
        <motion.div
          className="go-score"
          initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="go-score-value">{score.toLocaleString()}</span>
          <span className="go-score-label">Final Score</span>
        </motion.div>

        {/* Stats */}
        {stats && Object.keys(stats).length > 0 && (
          <motion.div
            className="go-stats"
            initial={prefersReducedMotion ? {} : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Object.entries(stats).map(([key, value], index) => (
              <motion.div
                key={key}
                className="go-stat"
                initial={prefersReducedMotion ? {} : { x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <span className="stat-value">{value}</span>
                <span className="stat-label">{key}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Best score comparison */}
        <div className="go-best">
          <span>Best: {highScore.toLocaleString()}</span>
        </div>

        {/* Action buttons */}
        <div className="go-actions">
          <motion.button
            className="go-play-again"
            onClick={onPlayAgain}
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          >
            <RotateCcw size={18} />
            <span>Play Again</span>
          </motion.button>

          <motion.button
            className="go-exit"
            onClick={onExit}
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          >
            <LogOut size={18} />
          </motion.button>
        </div>

        {/* Share button */}
        {onShare && (
          <motion.button
            className="go-share"
            onClick={onShare}
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          >
            <Share2 size={16} />
            <span>Share Score</span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default GameOverOverlay;
