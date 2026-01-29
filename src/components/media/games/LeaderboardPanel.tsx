/**
 * Leaderboard Panel Component
 *
 * Displays top scores across all games in the sidebar.
 * Fetches global #1 scores from server database.
 * Ordered by game popularity (votes).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Avatar } from '@/components/Avatar/Avatar';
import { GAME_NAMES, type GameId } from '@/types/leaderboard';

interface TopScore {
  gameId: GameId;
  gameName: string;
  playerName: string;
  userId: string;
  score: number;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source: 'default' | 'user' | 'wallet';
  };
  equipped: {
    frame: { name: string; emoji: string | null; css_class: string | null } | null;
    title: { name: string; emoji: string | null; css_class: string | null } | null;
    nameEffect: { name: string; emoji: string | null; css_class: string | null } | null;
  };
}

export function LeaderboardPanel() {
  const navigate = useNavigate();
  const [topScores, setTopScores] = useState<TopScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch top score per game from server (already ordered by popularity)
    const fetchTopScores = async () => {
      try {
        const response = await fetch('/api/leaderboard/top-per-game');
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();

        const scores: TopScore[] = (data.topScores || []).map((entry: any) => ({
          gameId: entry.gameId as GameId,
          gameName: GAME_NAMES[entry.gameId as GameId] || entry.gameId,
          playerName: entry.displayName || 'Player',
          userId: entry.userId,
          score: entry.score,
          avatar: {
            type: entry.avatar?.type || 'emoji',
            value: entry.avatar?.value || '🎮',
            source: entry.avatar?.source || 'default',
          },
          equipped: entry.equipped || { frame: null, title: null, nameEffect: null },
        }));

        // Already sorted by popularity from API
        setTopScores(scores.slice(0, 15));
      } catch (error) {
        console.error('Failed to fetch top scores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopScores();
  }, []);

  const handlePlayerClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

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
        <Trophy size={18} style={{ color: 'var(--color-brand-primary)' }} />
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Top Scores
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg animate-pulse"
                style={{ background: 'var(--color-border)' }}
              />
            ))}
          </div>
        ) : topScores.length === 0 ? (
          <div className="text-center py-8">
            <Trophy
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
              Play games to see top scores!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topScores.map((entry, index) => (
              <div
                key={entry.gameId}
                className="leaderboard-name-card flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer"
                style={{
                  border: '1px solid var(--color-border)',
                }}
                onClick={() => handlePlayerClick(entry.userId)}
              >
                {/* Player Avatar */}
                <Avatar
                  avatar={entry.avatar}
                  size="small"
                  showBorder={true}
                />

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p
                      className={`text-xs font-semibold truncate ${entry.equipped.nameEffect?.css_class || ''}`}
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {entry.playerName}
                    </p>
                    {/* Show equipped title emoji if any */}
                    {entry.equipped.title?.emoji && (
                      <span className="text-[10px]">{entry.equipped.title.emoji}</span>
                    )}
                  </div>
                  <p
                    className="text-[10px] truncate"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {entry.gameName}
                  </p>
                </div>

                {/* Score */}
                <span
                  className="text-xs font-bold flex-shrink-0"
                  style={{ color: 'var(--color-brand-primary)' }}
                >
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPanel;
