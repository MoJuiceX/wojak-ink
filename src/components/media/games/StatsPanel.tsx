/**
 * Stats Panel Component
 *
 * Displays user's personal gaming statistics in the sidebar.
 * Fetches user scores from server database.
 * Shows tooltip on hover with next rank info.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Gamepad2, Trophy, TrendingUp } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { GAME_NAMES, type GameId } from '@/types/leaderboard';

// Check if Clerk is configured
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface NextRankInfo {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  pointsNeeded: number;
}

interface GameScore {
  gameId: GameId;
  gameName: string;
  highScore: number;
  rank: number | null;
  nextRank: NextRankInfo | null;
}

export function StatsPanel() {
  const [gameScores, setGameScores] = useState<GameScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredGame, setHoveredGame] = useState<GameId | null>(null);

  // Always call hooks unconditionally (rules of hooks)
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { userId: null };
  const userId = authResult.userId;

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) {
        setGameScores([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/scores/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();

        const scores: GameScore[] = (data.scores || []).map((s: { gameId: string; highScore: number; rank: number; nextRank?: number | null }) => ({
          gameId: s.gameId as GameId,
          gameName: GAME_NAMES[s.gameId as GameId] || s.gameId,
          highScore: s.highScore,
          rank: s.rank,
          nextRank: s.nextRank || null,
        }));

        // Sort by high score descending
        scores.sort((a, b) => b.highScore - a.highScore);

        setGameScores(scores);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setGameScores([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  return (
    <div
      className="h-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(10, 10, 10, 0.98)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <BarChart3 size={18} style={{ color: 'var(--color-brand-primary)' }} />
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your High Scores
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg animate-pulse"
                style={{ background: 'var(--color-border)' }}
              />
            ))}
          </div>
        ) : !userId ? (
          <div className="text-center py-8">
            <Gamepad2
              size={32}
              className="mx-auto mb-2 opacity-30"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Sign in to track scores
            </p>
          </div>
        ) : gameScores.length === 0 ? (
          <div className="text-center py-8">
            <Gamepad2
              size={32}
              className="mx-auto mb-2 opacity-30"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No scores yet
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Play games to see your high scores!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {gameScores.map((game, index) => (
              <motion.div
                key={game.gameId}
                className="relative px-3 py-2 rounded-lg"
                style={{
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseEnter={() => setHoveredGame(game.gameId)}
                onMouseLeave={() => setHoveredGame(null)}
              >
                <div className="flex items-center gap-2">
                  {/* Game info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {game.gameName}
                    </p>
                    {game.rank && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Trophy size={10} style={{ color: '#ffd700' }} />
                        <span
                          className="text-[10px]"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          Rank #{game.rank}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <span
                    className="text-sm font-bold cursor-help"
                    style={{ color: 'var(--color-brand-primary)' }}
                    title={game.nextRank ? `Beat ${game.nextRank.displayName} (${game.nextRank.score.toLocaleString()}) - need ${game.nextRank.pointsNeeded.toLocaleString()} more points` : 'You are #1!'}
                  >
                    {game.highScore.toLocaleString()}
                  </span>
                </div>

                {/* Tooltip on hover */}
                {hoveredGame === game.gameId && game.nextRank && (
                  <motion.div
                    className="absolute left-0 right-0 top-full mt-1 z-10 px-3 py-2 rounded-lg"
                    style={{
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={12} style={{ color: '#22c55e' }} />
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        To reach #{game.nextRank.rank}:
                      </span>
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span className="font-semibold">{game.nextRank.displayName}</span>
                      <span className="mx-1">has</span>
                      <span className="font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                        {game.nextRank.score.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="text-[10px] mt-1"
                      style={{ color: '#22c55e' }}
                    >
                      Need <span className="font-bold">+{game.nextRank.pointsNeeded.toLocaleString()}</span> points to beat
                    </div>
                  </motion.div>
                )}

                {/* #1 indicator */}
                {hoveredGame === game.gameId && !game.nextRank && game.rank === 1 && (
                  <motion.div
                    className="absolute left-0 right-0 top-full mt-1 z-10 px-3 py-2 rounded-lg text-center"
                    style={{
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid #ffd700',
                      boxShadow: '0 4px 12px rgba(255,215,0,0.2)',
                    }}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="text-[10px] font-semibold" style={{ color: '#ffd700' }}>
                      👑 You're #1!
                    </span>
                  </motion.div>
                )}
              </motion.div>
            ))}

            {/* Games discovered progress */}
            <div
              className="mt-3 px-3 py-2 rounded-lg"
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className="text-[10px] uppercase tracking-wide mb-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Games Played: {gameScores.length} / 15
              </p>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--color-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(gameScores.length / 15) * 100}%`,
                    background: 'var(--color-brand-primary)',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsPanel;
