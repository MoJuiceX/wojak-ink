// Mini leaderboard panel — desktop left column.
// Top 10 by power level with tier emojis, "You" pinned at bottom.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { API_ENDPOINTS } from '@/services/constants';

interface LeaderboardEntry {
  rank: number;
  did: string;
  walletAddress?: string;
  powerLevel: number;
  totalVotesCast: number;
}

function getTierEmoji(level: number): string {
  if (level >= 9000) return '\uD83D\uDD25'; // fire
  if (level >= 5000) return '\u26A1'; // lightning
  return '';
}

function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}

export function MiniLeaderboard() {
  const { player } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_ENDPOINTS.gameLeaderboard}?limit=10`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setEntries(data.entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Find current player's rank
  const playerEntry = player
    ? entries.find(e => e.did === player.did)
    : null;
  const playerRank = playerEntry?.rank;

  return (
    <div className="card-static p-4 flex flex-col gap-2">
      {/* Header */}
      <div className="text-xs text-muted" style={{ letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        Power Level
      </div>

      {/* Rows */}
      {loading ? (
        // Skeleton rows
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2" style={{ height: 36 }}>
            <div className="vote-card-skeleton-bar" style={{ width: 20, height: 12 }} />
            <div className="vote-card-skeleton-bar" style={{ width: '60%', height: 12 }} />
          </div>
        ))
      ) : entries.length === 0 ? (
        <p className="text-muted text-xs">No players yet</p>
      ) : (
        entries.map(entry => {
          const emoji = getTierEmoji(entry.powerLevel);
          const isYou = player && entry.did === player.did;
          return (
            <div key={entry.did} className="flex flex-col" style={{ gap: 1 }}>
              <div className="flex items-center gap-2">
                <span className="text-muted" style={{ fontSize: 14, width: 20, textAlign: 'right', flexShrink: 0 }}>
                  {entry.rank}
                </span>
                {emoji && <span style={{ fontSize: 12 }}>{emoji}</span>}
                <span className="font-bold" style={{ fontSize: 16 }}>
                  {entry.powerLevel.toLocaleString()}
                </span>
              </div>
              <span
                className="text-secondary"
                style={{
                  fontSize: 13,
                  paddingLeft: 28,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isYou ? 'var(--color-primary)' : undefined,
                }}
              >
                {isYou ? 'You' : (entry.walletAddress ? truncateWallet(entry.walletAddress) : entry.did ? truncateWallet(entry.did) : 'Unknown')}
              </span>
            </div>
          );
        })
      )}

      {/* "You" row (pinned, if not in top 10) */}
      {player && !playerEntry && (
        <>
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
          <div className="flex flex-col" style={{ gap: 1 }}>
            <div className="flex items-center gap-2">
              <span className="text-muted" style={{ fontSize: 14, width: 20, textAlign: 'right', flexShrink: 0 }}>
                {playerRank ?? '---'}
              </span>
              <span className="font-bold" style={{ fontSize: 16 }}>
                {player.powerLevel.toLocaleString()}
              </span>
            </div>
            <span className="text-accent" style={{ fontSize: 13, paddingLeft: 28 }}>
              You
            </span>
          </div>
        </>
      )}

      {/* View Full link */}
      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, paddingTop: 8 }}>
        <Link
          to="/fight-club/rankings"
          className="text-muted"
          style={{ fontSize: 12, transition: 'color 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = '')}
        >
          View Full &rarr;
        </Link>
      </div>
    </div>
  );
}
