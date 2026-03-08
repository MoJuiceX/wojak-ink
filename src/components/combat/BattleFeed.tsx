/**
 * BattleFeed — Global feed of recent completed battles.
 * Shows all battles site-wide, clickable to watch replays.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronDown } from 'lucide-react';
import { API_ENDPOINTS } from '@/services/constants';

interface BattleNft {
  id: string;
  edition: number;
  name: string;
  imageUri: string;
  scoreDelta?: number;
}

interface Battle {
  id: number;
  nftA: BattleNft;
  nftB: BattleNft;
  status: string;
  winner: string | null;
  startedAt: string;
  resolvedAt: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function BattleFeed() {
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  const fetchBattles = useCallback(async (currentOffset: number, append = false) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.gameBattleList}?status=history&limit=${limit}&offset=${currentOffset}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newBattles = data.battles ?? [];

      if (append) {
        setBattles(prev => [...prev, ...newBattles]);
      } else {
        setBattles(newBattles);
      }
      setHasMore(newBattles.length >= limit);
    } catch (err) {
      console.error('[BattleFeed] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBattles(0);
  }, [fetchBattles]);

  const loadMore = useCallback(() => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchBattles(newOffset, true);
  }, [offset, fetchBattles]);

  const handleBattleClick = useCallback((battleId: number) => {
    // Navigate to battle replay (could be a modal or separate page)
    navigate(`/fight-club/battle?replay=${battleId}`);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-static p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--color-white-8)' }} />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-32 rounded" style={{ background: 'var(--color-white-8)' }} />
                <div className="h-3 w-24 rounded" style={{ background: 'var(--color-white-5)' }} />
              </div>
              <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--color-white-8)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="card-static p-6 text-center">
        <p className="text-muted text-sm">No battles yet. Be the first to fight!</p>
      </div>
    );
  }

  return (
    <div className="battle-feed">
      {battles.map((battle) => {
        const isDraw = battle.status === 'draw';
        const winnerIsA = battle.winner === battle.nftA.id;
        const winnerIsB = !isDraw && !winnerIsA;

        return (
          <div
            key={battle.id}
            role="button"
            tabIndex={0}
            className="battle-row"
            onClick={() => handleBattleClick(battle.id)}
            onKeyDown={(e) => e.key === 'Enter' && handleBattleClick(battle.id)}
          >
            {/* Fighter A */}
            <div className="feed-fighter">
              <div className={`feed-fighter-avatar ${winnerIsA ? 'winner' : ''} ${winnerIsB ? 'loser' : ''}`}>
                <img
                  src={battle.nftA.imageUri}
                  alt={battle.nftA.name}
                  loading="lazy"
                />
              </div>
              <div className="feed-fighter-info">
                <div className="feed-fighter-name">{battle.nftA.name}</div>
                {battle.nftA.scoreDelta !== undefined && (
                  <div className={`feed-fighter-score ${battle.nftA.scoreDelta >= 0 ? 'positive' : 'negative'}`}>
                    {battle.nftA.scoreDelta >= 0 ? '+' : ''}{battle.nftA.scoreDelta}
                  </div>
                )}
              </div>
            </div>

            {/* VS badge */}
            <div className="feed-vs-badge">
              <span className={`feed-vs-text ${isDraw ? 'draw' : ''}`}>
                {isDraw ? 'DRAW' : 'VS'}
              </span>
              <span className="feed-time">{relativeTime(battle.resolvedAt)}</span>
            </div>

            {/* Fighter B */}
            <div className="feed-fighter right">
              <div className={`feed-fighter-avatar ${winnerIsB ? 'winner' : ''} ${winnerIsA ? 'loser' : ''}`}>
                <img
                  src={battle.nftB.imageUri}
                  alt={battle.nftB.name}
                  loading="lazy"
                />
              </div>
              <div className="feed-fighter-info">
                <div className="feed-fighter-name">{battle.nftB.name}</div>
                {battle.nftB.scoreDelta !== undefined && (
                  <div className={`feed-fighter-score ${battle.nftB.scoreDelta >= 0 ? 'positive' : 'negative'}`}>
                    {battle.nftB.scoreDelta >= 0 ? '+' : ''}{battle.nftB.scoreDelta}
                  </div>
                )}
              </div>
            </div>

            {/* Play icon */}
            <div className="feed-play-icon">
              <Play size={14} />
            </div>
          </div>
        );
      })}

      {/* Load more button */}
      {hasMore && (
        <button
          type="button"
          className="feed-load-more"
          onClick={loadMore}
        >
          <ChevronDown size={16} />
          Load More
        </button>
      )}
    </div>
  );
}

export default BattleFeed;
