/**
 * Voting Panel - Toggle buttons for selecting donut or poop flick mode
 * Desktop: Vertical layout, integrated below stats panel
 * Mobile: Fixed horizontal bar at bottom
 */

import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FlickModeToggle.css';

interface FlickModeToggleProps {
  activeMode: 'donut' | 'poop' | null;
  onModeChange: (mode: 'donut' | 'poop' | null) => void;
  donutBalance: number;
  poopBalance?: number;
  onShowHeatmap: (type: 'donut' | 'poop') => void;
  isHeatmapActive: boolean;
  isHeatmapLoading: boolean;
  isDesktop?: boolean;
  isSignedIn?: boolean;
  onSignInClick?: () => void;
}

// Floating animation for idle buttons
const floatAnimation = {
  y: [0, -4, 0],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

// Sparkle particles component
function SparkleParticles() {
  const particles = [
    { x: -20, y: -15, delay: 0, size: 4 },
    { x: 20, y: -18, delay: 0.2, size: 3 },
    { x: -25, y: 5, delay: 0.4, size: 3 },
    { x: 22, y: 8, delay: 0.6, size: 4 },
    { x: -8, y: -25, delay: 0.1, size: 3 },
    { x: 12, y: 22, delay: 0.3, size: 3 },
    { x: -18, y: 18, delay: 0.5, size: 4 },
    { x: 0, y: -28, delay: 0.7, size: 3 },
  ];

  return (
    <div className="sparkle-particles">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="sparkle-particle"
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: p.size,
            height: p.size,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.2, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export const FlickModeToggle = forwardRef<HTMLDivElement, FlickModeToggleProps>(
  ({ activeMode, onModeChange, donutBalance, poopBalance = 0, onShowHeatmap, isHeatmapActive, isHeatmapLoading, isDesktop = false, isSignedIn = false, onSignInClick }, ref) => {
    const handleToggle = (mode: 'donut' | 'poop') => {
      if (!isSignedIn) return;
      if (activeMode === mode) {
        onModeChange(null);
      } else {
        onModeChange(mode);
      }
    };

    const handleHeatmapToggle = () => {
      if (activeMode) {
        onShowHeatmap(activeMode);
      }
    };

    const isDonutSelected = activeMode === 'donut';
    const isPoopSelected = activeMode === 'poop';
    const hasSelection = activeMode !== null;

    // Show sign-in prompt if not logged in
    if (!isSignedIn) {
      return (
        <div ref={ref} className={`voting-panel ${isDesktop ? 'desktop' : 'mobile'}`}>
          <div className="voting-panel-header">
            <span className="voting-title">Fade or Glaze</span>
          </div>
          <div className="voting-signin-prompt">
            <div className="voting-signin-emojis">🍩 💩</div>
            <p className="voting-signin-text">Sign in to vote on games!</p>
            <motion.button
              type="button"
              className="voting-signin-btn"
              onClick={onSignInClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="voting-signin-btn-text">
                <span>Sign in with</span>
                <span>Google or X</span>
              </span>
            </motion.button>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={`voting-panel ${isDesktop ? 'desktop' : 'mobile'}`}>
        {/* Header */}
        <div className="voting-panel-header">
          <span className="voting-title">Fade or Glaze</span>
        </div>

        {/* Emoji buttons row */}
        <div className="voting-buttons-row">
          {/* Donut button (like) */}
          <motion.button
            type="button"
            className={`vote-btn ${isDonutSelected ? 'selected' : ''} ${hasSelection && !isDonutSelected ? 'inactive' : ''}`}
            onClick={() => handleToggle('donut')}
            animate={!hasSelection ? floatAnimation : {}}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Flick donuts (like)"
            aria-pressed={isDonutSelected}
          >
            <span className="vote-emoji">🍩</span>
            <span className="vote-count">{donutBalance}</span>
            <AnimatePresence>
              {isDonutSelected && (
                <>
                  <motion.div
                    className="vote-glow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <SparkleParticles />
                </>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Poop button (dislike) */}
          <motion.button
            type="button"
            className={`vote-btn ${isPoopSelected ? 'selected' : ''} ${hasSelection && !isPoopSelected ? 'inactive' : ''}`}
            onClick={() => handleToggle('poop')}
            animate={!hasSelection ? floatAnimation : {}}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Flick poop (dislike)"
            aria-pressed={isPoopSelected}
          >
            <span className="vote-emoji">💩</span>
            <span className="vote-count">{poopBalance}</span>
            <AnimatePresence>
              {isPoopSelected && (
                <>
                  <motion.div
                    className="vote-glow poop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <SparkleParticles />
                </>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* View All Votes toggle */}
        <div className="voting-heatmap-section">
          <motion.button
            type="button"
            className={`heatmap-toggle ${isHeatmapActive ? 'active' : ''} ${!hasSelection ? 'disabled' : ''}`}
            onClick={handleHeatmapToggle}
            disabled={!hasSelection || isHeatmapLoading}
            whileHover={hasSelection ? { scale: 1.02 } : undefined}
            whileTap={hasSelection ? { scale: 0.98 } : undefined}
            title={hasSelection ? `View all ${activeMode} votes` : 'Select an emoji first'}
          >
            <span className="heatmap-toggle-icon">👁️</span>
            <span className="heatmap-toggle-text">
              {isHeatmapActive ? 'Hide Votes' : 'View All Votes'}
            </span>
            {hasSelection && (
              <span className="heatmap-toggle-emoji">
                {activeMode === 'donut' ? '🍩' : '💩'}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    );
  }
);

FlickModeToggle.displayName = 'FlickModeToggle';
