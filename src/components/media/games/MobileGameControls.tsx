/**
 * Mobile Game Controls Component
 *
 * Shared controls for all games on mobile:
 * - Close button (X) - top right corner
 *
 * Design: Small, subtle, unobtrusive in the corner
 * Position: Fixed to top-right with safe-area insets for notched devices
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import './MobileGameControls.css';

interface MobileGameControlsProps {
  onClose: () => void;
}

export function MobileGameControls({ onClose }: MobileGameControlsProps) {
  return (
    <motion.div
      className="mobile-game-controls"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      <button
        type="button"
        className="mobile-game-btn mobile-game-btn-close"
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close game"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export default MobileGameControls;
