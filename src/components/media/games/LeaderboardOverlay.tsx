/**
 * Leaderboard Overlay Component
 *
 * Slide-in panel showing top 10 scores for a game.
 * Accessed from the game intro screen.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { Avatar } from '@/components/Avatar/Avatar';
import type { GameId } from '@/config/query/queryKeys';

interface LeaderboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  accentColor: string;
}

export function LeaderboardOverlay({
  isOpen,
  onClose,
  gameId,
  accentColor,
}: LeaderboardOverlayProps) {
  const { leaderboard, isLoading } = useLeaderboard(gameId as GameId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="leaderboard-overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel - slides in from right */}
          <motion.div
            className="leaderboard-overlay-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="leaderboard-overlay-header">
              <div className="leaderboard-overlay-title">
                <Trophy size={20} style={{ color: accentColor }} />
                <span>Leaderboard</span>
              </div>
              <button type="button" className="leaderboard-overlay-close" onClick={onClose} aria-label="Close leaderboard">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="leaderboard-overlay-content">
              {isLoading ? (
                <div className="leaderboard-loading">Loading...</div>
              ) : leaderboard.length === 0 ? (
                <div className="leaderboard-empty">No scores yet. Be the first!</div>
              ) : (
                <div className="leaderboard-list">
                  {Array.from({ length: 10 }, (_, index) => {
                    const entry = leaderboard[index];
                    const isTopThree = index < 3;
                    return (
                      <div
                        key={index}
                        className={`leaderboard-entry ${isTopThree ? 'top-three' : ''}`}
                        style={isTopThree ? { borderColor: accentColor } : undefined}
                      >
                        <span className="leaderboard-rank">#{index + 1}</span>
                        {entry ? (
                          <Avatar
                            avatar={entry.avatar || { type: 'emoji', value: '🎮', source: 'default' }}
                            size="small"
                            showBadge={false}
                          />
                        ) : (
                          <div className="leaderboard-avatar-placeholder" />
                        )}
                        <span className={`leaderboard-name ${entry?.equipped?.nameEffect?.css_class || ''}`}>
                          {entry?.displayName || '---'}
                        </span>
                        <span className="leaderboard-score">
                          {entry?.score ?? '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default LeaderboardOverlay;
