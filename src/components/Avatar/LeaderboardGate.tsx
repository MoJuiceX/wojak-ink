/**
 * Leaderboard Access Gate
 *
 * Shown to users without NFT avatar to explain requirements
 * for competing on the leaderboard.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Wallet, Image, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './LeaderboardGate.css';

interface LeaderboardGateProps {
  onConnectWallet: () => void;
}

const REQUIREMENTS = [
  { icon: Wallet, text: 'Connect your Chia wallet' },
  { icon: Image, text: 'Own a Wojak Farmers Plot NFT' },
  { icon: User, text: 'Set your NFT as your avatar' },
];

const BENEFITS = [
  { emoji: '🏆', text: 'Compete on game leaderboards' },
  { emoji: '🎁', text: 'Earn exclusive rewards' },
  { emoji: '⚔️', text: 'Join guilds with other holders' },
  { emoji: '💎', text: 'Access holder-only features' },
];

export const LeaderboardGate: React.FC<LeaderboardGateProps> = ({
  onConnectWallet,
}) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="leaderboard-gate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="gate-content">
        {/* Animated lock icon */}
        <motion.div
          className="lock-icon"
          animate={
            prefersReducedMotion
              ? {}
              : {
                  rotateY: [0, 10, -10, 0],
                  scale: [1, 1.05, 1],
                }
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          🔒
        </motion.div>

        <h2>Leaderboard Access Required</h2>
        <p>To compete on the leaderboard and earn rewards, you need to:</p>

        {/* Requirements */}
        <div className="requirements">
          {REQUIREMENTS.map((req, index) => {
            const IconComponent = req.icon;
            return (
              <motion.div
                key={index}
                className="requirement"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <span className="req-icon">
                  <IconComponent size={20} />
                </span>
                <span>{req.text}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits */}
        <div className="benefits">
          <h3>What you'll unlock:</h3>
          <ul>
            {BENEFITS.map((benefit, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                {benefit.emoji} {benefit.text}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* CTA buttons */}
        <div className="cta-buttons">
          <motion.button
            type="button"
            className="primary-btn"
            onClick={onConnectWallet}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Wallet size={18} />
            Connect Wallet
          </motion.button>
          <button
            type="button"
            className="secondary-link"
            onClick={() => navigate('/gallery')}
          >
            View the Collection →
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default LeaderboardGate;
