/**
 * AchievementUnlockPopup Component
 *
 * Animated popup when achievement is unlocked.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Achievement } from '@/types/achievement';
import './Achievements.css';

interface AchievementUnlockPopupProps {
  achievement: Achievement | null;
  onClose: () => void;
  onClaim: () => void;
}

export function AchievementUnlockPopup({
  achievement,
  onClose,
  onClaim,
}: AchievementUnlockPopupProps) {
  if (!achievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="achievement-popup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="achievement-popup"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Achievement unlocked"
        >
          <button className="popup-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>

          <motion.div
            className="popup-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            {achievement.icon}
          </motion.div>

          <motion.h2
            className="popup-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Achievement Unlocked!
          </motion.h2>

          <motion.h3
            className="popup-name"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {achievement.name}
          </motion.h3>

          <motion.p
            className="popup-description"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {achievement.description}
          </motion.p>

          <motion.div
            className="popup-reward"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <span className="reward-label">Reward:</span>
            <span className="reward-values">
              {achievement.reward.oranges > 0 && (
                <span className="reward-oranges">
                  🍊 {achievement.reward.oranges}
                </span>
              )}
              {achievement.reward.gems > 0 && (
                <span className="reward-gems">
                  💎 {achievement.reward.gems}
                </span>
              )}
            </span>
          </motion.div>

          <motion.button
            className="popup-claim-button"
            onClick={onClaim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Claim Reward
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
