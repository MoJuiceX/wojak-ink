/**
 * Pause Menu
 *
 * In-game pause overlay with resume, restart, and exit options.
 */

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, RotateCcw, LogOut } from 'lucide-react';
import './PauseMenu.css';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  gameName?: string;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onRestart,
  onExit,
  gameName,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pause-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-menu-title"
        >
          <motion.div
            className="pause-menu"
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="pause-header">
              <h2 id="pause-menu-title">Paused</h2>
              {gameName && <span className="pause-game-name">{gameName}</span>}
            </div>

            <div className="pause-buttons">
              <motion.button
                type="button"
                className="pause-btn resume"
                onClick={onResume}
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              >
                <Play size={20} />
                <span>Resume</span>
              </motion.button>

              <motion.button
                type="button"
                className="pause-btn restart"
                onClick={onRestart}
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              >
                <RotateCcw size={20} />
                <span>Restart</span>
              </motion.button>

              <motion.button
                type="button"
                className="pause-btn exit"
                onClick={onExit}
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              >
                <LogOut size={20} />
                <span>Exit</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PauseMenu;
