/**
 * Avatar Set Success Celebration
 *
 * Celebration modal shown when user successfully sets their NFT avatar.
 * Features confetti, animated avatar preview, and unlocked features list.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const loadConfetti = () => import('canvas-confetti').then(m => m.default);
import './AvatarSetSuccess.css';

interface NFT {
  id: string;
  name: string;
  imageUrl: string;
}

interface AvatarSetSuccessProps {
  isOpen: boolean;
  nft: NFT | null;
  onClose: () => void;
}

const UNLOCKED_FEATURES = [
  { icon: '✅', text: 'Leaderboard access unlocked' },
  { icon: '✅', text: 'Guild membership available' },
  { icon: '✅', text: 'Holder rewards activated' },
];

export const AvatarSetSuccess: React.FC<AvatarSetSuccessProps> = ({
  isOpen,
  nft,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen && nft) {
      loadConfetti().then(confetti => {
        const duration = 2000;
        const animationEnd = Date.now() + duration;
        const colors = ['#F97316', '#FFD700', '#FF6B00', '#FFA500'];

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
          });

          if (Date.now() < animationEnd) {
            requestAnimationFrame(frame);
          }
        };

        // Initial burst
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors,
        });

        frame();
      });
    }
  }, [isOpen, nft]);

  if (!nft) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="success-modal"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Avatar with glow effect */}
            <motion.div
              className="success-avatar"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            >
              <div className="avatar-glow-ring" />
              <img src={nft.imageUrl} alt={nft.name} />
              <div className="verified-badge">✓</div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Looking Good! 🔥
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              className="success-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Your <strong>{nft.name}</strong> is now your avatar
            </motion.p>

            {/* Unlocked features */}
            <motion.ul
              className="unlocked-features"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {UNLOCKED_FEATURES.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <span className="feature-icon">{feature.icon}</span>
                  {feature.text}
                </motion.li>
              ))}
            </motion.ul>

            {/* CTA Button */}
            <motion.button
              type="button"
              className="lets-go-btn"
              onClick={onClose}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Let's Go! 🚀
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AvatarSetSuccess;
