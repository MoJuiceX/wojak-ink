/**
 * FightClubRankings Component
 *
 * Two sub-tabs: Players | Wojaks
 * - Players: DID rankings by total Power
 * - Wojaks: Individual NFT rankings
 */

import { useState } from 'react';
import { Trophy, Crown, Medal, User, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

type RankingTab = 'players' | 'wojaks';

interface PlayerRanking {
  rank: number;
  did: string;
  displayName: string;
  wojakCount: number;
  totalPower: number;
  bestWojakPower: number;
  bestWojakImage?: string;
}

interface WojakRanking {
  rank: number;
  nftId: string;
  edition: number;
  imageUrl: string;
  combatType: string;
  powerScore: number;
  votePower: number;
  battlePower: number;
  likes: number;
  dislikes: number;
  wins: number;
  losses: number;
  draws: number;
  ownerName: string;
}

interface PowerLeaderboardResponse {
  players?: PlayerRanking[];
  wojaks?: WojakRanking[];
  yourRank?: number;
}

function usePowerLeaderboard(type: RankingTab) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['power-leaderboard', type],
    queryFn: async (): Promise<PowerLeaderboardResponse> => {
      const token = await getToken();
      const res = await fetch(`/api/combat/power-leaderboard?type=${type}&limit=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="rank-badge rank-1" title="1st Place">
        <Crown size={18} />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="rank-badge rank-2" title="2nd Place">
        <Medal size={16} />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="rank-badge rank-3" title="3rd Place">
        <Medal size={16} />
      </div>
    );
  }
  return (
    <div className="rank-badge rank-other">
      <span className="rank-number">#{rank}</span>
    </div>
  );
}

function PlayersTab({ currentUserDid }: { currentUserDid?: string | null }) {
  const { data, isLoading, error } = usePowerLeaderboard('players');

  if (isLoading) {
    return (
      <div className="rankings-content">
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-static p-3 flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full" style={{ background: 'var(--color-white-8)' }} />
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-3 w-24 rounded" style={{ background: 'var(--color-white-8)' }} />
                <div className="h-2 w-16 rounded" style={{ background: 'var(--color-white-5)' }} />
              </div>
              <div className="h-4 w-12 rounded" style={{ background: 'var(--color-white-8)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rankings-empty">
        <Trophy size={48} strokeWidth={1} className="text-muted" />
        <p>Couldn&apos;t load rankings</p>
        <span className="text-secondary text-sm">Check the connection and try again.</span>
      </div>
    );
  }

  if (!data?.players?.length) {
    return (
      <div className="rankings-empty">
        <Trophy size={48} strokeWidth={1} className="text-muted" />
        <p>No rankings yet</p>
        <span className="text-secondary text-sm">Be the first to earn Power!</span>
      </div>
    );
  }

  const players = data.players;
  const topThree = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="rankings-content">
      {/* Podium for top 3 */}
      <div className="rankings-podium">
        {topThree.map((player, idx) => (
          <div
            key={player.did}
            className={`podium-entry podium-${idx + 1}${player.did === currentUserDid ? ' podium-entry-you' : ''}`}
          >
            <RankBadge rank={player.rank} />
            <div className="podium-avatar">
              {player.bestWojakImage ? (
                <img
                  src={player.bestWojakImage}
                  alt={player.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <User size={24} />
              )}
            </div>
            <span className="podium-name">{player.displayName || 'Anon'}</span>
            <div className="podium-power">
              <Zap size={14} />
              <span>{player.totalPower.toLocaleString()}</span>
            </div>
            <span className="podium-count text-secondary text-xs">
              {player.wojakCount} Wojak{player.wojakCount !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Your position indicator */}
      {data.yourRank && data.yourRank > 3 && (
        <div className="your-rank-indicator">
          <span>Your rank: #{data.yourRank}</span>
        </div>
      )}

      {/* Rest of the list */}
      {rest.length > 0 && (
        <div className="rankings-list">
          {rest.map((player) => (
            <div key={player.did} className={`rankings-row${player.did === currentUserDid ? ' rankings-row-you' : ''}`}>
              <RankBadge rank={player.rank} />
              <div className="rankings-row-info">
                <span className="rankings-row-name">{player.displayName || 'Anon'}</span>
                <span className="text-secondary text-xs">
                  {player.wojakCount} Wojak{player.wojakCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="rankings-row-power">
                <Zap size={14} />
                <span>{player.totalPower.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type SortOption = 'power' | 'likes' | 'hot' | 'ratio' | 'battles' | 'newest';
type ViewMode = 'list' | 'grid';

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'power', label: 'Power', icon: '⚡' },
  { value: 'likes', label: 'Most Liked', icon: '👍' },
  { value: 'hot', label: 'Hot', icon: '🔥' },
  { value: 'ratio', label: 'Like Ratio', icon: '📊' },
  { value: 'battles', label: 'Battle Record', icon: '🗡' },
  { value: 'newest', label: 'Newest', icon: '🆕' },
];

const PAGE_SIZE = 30;

interface WojakLeaderboardResponse {
  wojaks: WojakRanking[];
  total: number;
}

function WojaksTab() {
  const { getToken } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('power');
  const [allWojaks, setAllWojaks] = useState<WojakRanking[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial load
  const { isLoading, error } = useQuery({
    queryKey: ['wojak-leaderboard', sortBy],
    queryFn: async (): Promise<WojakLeaderboardResponse> => {
      const token = await getToken();
      const res = await fetch(`/api/combat/power-leaderboard?type=wojaks&sort=${sortBy}&limit=${PAGE_SIZE}&offset=0`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: WojakLeaderboardResponse = await res.json();
      setAllWojaks(data.wojaks || []);
      setTotal(data.total || 0);
      setOffset(data.wojaks?.length || 0);
      return data;
    },
    staleTime: 30000,
    retry: 2,
  });

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/combat/power-leaderboard?type=wojaks&sort=${sortBy}&limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: WojakLeaderboardResponse = await res.json();
      setAllWojaks(prev => [...prev, ...(data.wojaks || [])]);
      setOffset(prev => prev + (data.wojaks?.length || 0));
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = offset < total;

  if (isLoading) {
    return (
      <div className="rankings-content">
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-static p-3 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-lg" style={{ background: 'var(--color-white-8)' }} />
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-3 w-20 rounded" style={{ background: 'var(--color-white-8)' }} />
                <div className="h-2 w-32 rounded" style={{ background: 'var(--color-white-5)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rankings-empty">
        <Trophy size={48} strokeWidth={1} className="text-muted" />
        <p>Couldn&apos;t load rankings</p>
        <span className="text-secondary text-sm">Check the connection and try again.</span>
      </div>
    );
  }

  if (!allWojaks.length) {
    return (
      <div className="rankings-empty">
        <Trophy size={48} strokeWidth={1} className="text-muted" />
        <p>No Wojak rankings yet</p>
        <span className="text-secondary text-sm">Battle and vote to earn Power!</span>
      </div>
    );
  }

  return (
    <div className="rankings-content">
      {/* Toolbar */}
      <div className="rankings-toolbar">
        <div className="rankings-sort">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`sort-chip${sortBy === opt.value ? ' active' : ''}`}
              onClick={() => setSortBy(opt.value)}
              title={opt.label}
            >
              <span className="sort-chip-icon">{opt.icon}</span>
              <span className="sort-chip-label">{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="rankings-view-toggle">
          <button
            type="button"
            className={`view-btn${viewMode === 'list' ? ' active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
          <button
            type="button"
            className={`view-btn${viewMode === 'grid' ? ' active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ▦
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="rankings-list wojak-rankings">
          {allWojaks.map((wojak, idx) => (
            <div
              key={wojak.nftId}
              className="rankings-row wojak-row wojak-row-animate"
              style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}
            >
              <RankBadge rank={wojak.rank} />
              <div className="wojak-row-image">
                <img
                  src={wojak.imageUrl}
                  alt={`Wojak #${wojak.edition}`}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    if (el.parentElement) {
                      el.parentElement.style.display = 'flex';
                      el.parentElement.style.alignItems = 'center';
                      el.parentElement.style.justifyContent = 'center';
                      el.parentElement.style.background = 'var(--color-white-5)';
                      el.parentElement.style.fontSize = '0.65rem';
                      el.parentElement.style.color = 'var(--color-text-secondary)';
                      el.parentElement.textContent = `#${wojak.edition}`;
                    }
                  }}
                />
              </div>
              <div className="wojak-row-info">
                <div className="wojak-row-header">
                  <span className="wojak-row-edition">#{wojak.edition}</span>
                  <span className={`badge badge-${wojak.combatType.toLowerCase()}`}>
                    {wojak.combatType}
                  </span>
                </div>
                <div className="wojak-row-stats flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className="text-success" title="Upvotes">↑ {wojak.likes}</span>
                  <span className="text-error" title="Downvotes">↓ {wojak.dislikes}</span>
                  <span className="text-secondary">{wojak.wins}W / {wojak.losses}L / {wojak.draws}D</span>
                </div>
                <span className="text-secondary text-xs">Owner: {wojak.ownerName || 'Anon'}</span>
              </div>
              <div className="wojak-row-power">
                <div className="power-total">
                  <Zap size={14} />
                  <span>{wojak.powerScore.toLocaleString()}</span>
                </div>
                <div className="power-breakdown text-xs text-secondary">
                  <span>Vote: {wojak.votePower > 0 ? '+' : ''}{wojak.votePower}</span>
                  <span>Battle: {wojak.battlePower > 0 ? '+' : ''}{wojak.battlePower}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="wojak-grid">
          {allWojaks.map((wojak, idx) => {
            const netVotes = wojak.likes - wojak.dislikes;
            const glowClass = wojak.powerScore >= 5 ? 'glow-gold' : wojak.powerScore >= 3 ? 'glow-silver' : '';
            return (
              <div
                key={wojak.nftId}
                className={`wojak-grid-card ${glowClass}`}
                style={{ animationDelay: `${Math.min(idx, 20) * 0.03}s` }}
                title={`#${wojak.edition} — ${wojak.combatType}\n↑${wojak.likes} ↓${wojak.dislikes}\nOwner: ${wojak.ownerName || 'Anon'}`}
              >
                <div className="grid-card-image">
                  <img
                    src={wojak.imageUrl}
                    alt={`Wojak #${wojak.edition}`}
                    loading="lazy"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      if (el.parentElement) {
                        el.parentElement.style.display = 'flex';
                        el.parentElement.style.alignItems = 'center';
                        el.parentElement.style.justifyContent = 'center';
                        el.parentElement.style.fontSize = '0.75rem';
                        el.parentElement.style.color = 'var(--color-text-secondary)';
                        el.parentElement.textContent = `#${wojak.edition}`;
                      }
                    }}
                  />
                  <span className="grid-card-rank">#{wojak.rank}</span>
                  <span className={`grid-card-type badge-${wojak.combatType.toLowerCase()}`} />
                </div>
                <div className="grid-card-footer">
                  <span className="grid-card-edition">#{wojak.edition}</span>
                  <div className="grid-card-votes">
                    <span className={netVotes > 0 ? 'text-success' : netVotes < 0 ? 'text-error' : 'text-secondary'}>
                      {netVotes > 0 ? '+' : ''}{netVotes}
                    </span>
                  </div>
                  <div className="grid-card-power">
                    <Zap size={12} />
                    <span>{wojak.powerScore}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      <div className="rankings-load-more">
        {hasMore ? (
          <button
            type="button"
            className="load-more-btn"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : `Load More (${allWojaks.length} of ${total})`}
          </button>
        ) : (
          <span className="text-secondary text-sm">
            All {total} Wojaks loaded ✓
          </span>
        )}
      </div>
    </div>
  );
}

interface FightClubRankingsProps {
  currentUserDid?: string | null;
}

export function FightClubRankings({ currentUserDid }: FightClubRankingsProps = {}) {
  const [activeTab, setActiveTab] = useState<RankingTab>('players');

  return (
    <div className="fight-club-rankings">
      {/* Sub-tabs */}
      <div className="rankings-tabs">
        <button
          type="button"
          className={`rankings-tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          <User size={16} />
          Players
        </button>
        <button
          type="button"
          className={`rankings-tab ${activeTab === 'wojaks' ? 'active' : ''}`}
          onClick={() => setActiveTab('wojaks')}
        >
          <Zap size={16} />
          Wojaks
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'players' ? <PlayersTab currentUserDid={currentUserDid} /> : <WojaksTab />}
    </div>
  );
}

export default FightClubRankings;
