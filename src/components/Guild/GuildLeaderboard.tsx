/**
 * Guild Leaderboard Component
 *
 * Displays guild rankings with weekly/all-time views.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useGuild } from '../../contexts/GuildContext';
import { GuildBannerDisplay } from './GuildCard';
import type { GuildLeaderboardEntry } from '../../types/guild';
import './Guild.css';

interface GuildLeaderboardProps {
  myGuildId?: string;
}

export function GuildLeaderboard({ myGuildId }: GuildLeaderboardProps) {
  const { fetchGuildLeaderboard } = useGuild();
  const [timeframe, setTimeframe] = useState<'weekly' | 'all-time'>('weekly');
  const [entries, setEntries] = useState<GuildLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchGuildLeaderboard(timeframe);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load guild leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchGuildLeaderboard, timeframe]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const formatScore = (score: number): string => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toLocaleString();
  };

  return (
    <div className="guild-leaderboard">
      <div className="timeframe-selector">
        <button
          type="button"
          className={`timeframe-tab ${timeframe === 'weekly' ? 'active' : ''}`}
          onClick={() => setTimeframe('weekly')}
        >
          This Week
        </button>
        <button
          type="button"
          className={`timeframe-tab ${timeframe === 'all-time' ? 'active' : ''}`}
          onClick={() => setTimeframe('all-time')}
        >
          All Time
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state" role="status" aria-label="Loading">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="guild-leaderboard-list">
          {entries.map((entry) => (
            <div
              key={entry.guild.id}
              className={`guild-leaderboard-row ${entry.guild.id === myGuildId ? 'is-my-guild' : ''}`}
            >
              <span className="guild-rank">{getRankDisplay(entry.rank)}</span>

              <GuildBannerDisplay banner={entry.guild.banner} size="small" />

              <div className="guild-info">
                <span className="guild-name-tag">
                  <span className="tag">[{entry.guild.tag}]</span>
                  <span className="name">{entry.guild.name}</span>
                </span>
                <span className="guild-meta">
                  Lv.{entry.guild.level} • {entry.memberCount} members
                </span>
              </div>

              <div className="guild-score">
                <span className="score-value">
                  {formatScore(timeframe === 'weekly' ? entry.weeklyScore : entry.totalScore)}
                </span>
                <span className="score-label">pts</span>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">🏆</span>
              <p>No guild rankings yet for this period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GuildLeaderboard;
