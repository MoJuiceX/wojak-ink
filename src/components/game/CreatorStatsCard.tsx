// Creator Stats Card — shows how a player's minted NFTs are performing.
import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

interface CreatorStats {
  mintedCount: number;
  scoredCount: number;
  totalLikes: number;
  totalDislikes: number;
  totalVotes: number;
  avgNetScore: number;
  topNft: {
    edition: number;
    name: string;
    netScore: number;
    totalVotes: number;
  } | null;
}

interface CreatorStatsCardProps {
  walletAddress: string;
}

export function CreatorStatsCard({ walletAddress }: CreatorStatsCardProps) {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/game/creator-stats?wallet=${walletAddress}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.success && data.hasStats) {
          setStats(data.stats);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [walletAddress]);

  if (loading || !stats) return null;

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Palette size={16} className="text-accent" />
        <span className="font-semibold" style={{ fontSize: 14 }}>Creator Stats</span>
      </div>

      <div className="grid grid-cols-2 gap-2" style={{ fontSize: 13 }}>
        <div className="flex flex-col">
          <span className="text-muted" style={{ fontSize: 11 }}>Minted</span>
          <span className="font-bold">{stats.mintedCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted" style={{ fontSize: 11 }}>Total Votes</span>
          <span className="font-bold">{stats.totalVotes}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted" style={{ fontSize: 11 }}>Avg Score</span>
          <span className="font-bold" style={{ color: stats.avgNetScore >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {stats.avgNetScore >= 0 ? '+' : ''}{stats.avgNetScore}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted" style={{ fontSize: 11 }}>Likes / Dislikes</span>
          <span>
            <span style={{ color: 'var(--color-success)' }}>{stats.totalLikes}</span>
            {' / '}
            <span style={{ color: 'var(--color-error)' }}>{stats.totalDislikes}</span>
          </span>
        </div>
      </div>

      {stats.topNft && (
        <div style={{ fontSize: 12 }} className="text-secondary">
          Top: <span className="text-accent">{stats.topNft.name}</span> ({stats.topNft.netScore >= 0 ? '+' : ''}{stats.topNft.netScore})
        </div>
      )}
    </div>
  );
}
