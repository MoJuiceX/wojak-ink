/**
 * Quick Access Bar
 *
 * Top navigation bar on landing page with quick links
 * to main sections of the app.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface QuickLink {
  label: string;
  icon: string;
  path: string;
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'Gallery', icon: '🖼️', path: '/gallery' },
  { label: 'BigPulp', icon: '🍊', path: '/bigpulp' },
  { label: 'Generator', icon: '🎨', path: '/generator' },
  { label: 'Games', icon: '🎮', path: '/games' },
];

export const QuickAccessBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="quick-access-bar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {QUICK_LINKS.map((link, index) => (
        <motion.button
          type="button"
          key={link.path}
          className="quick-access-btn"
          onClick={() => navigate(link.path)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + index * 0.1 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="quick-access-icon">{link.icon}</span>
          <span className="quick-access-label">{link.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};

export default QuickAccessBar;
