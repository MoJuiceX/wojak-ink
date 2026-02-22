/**
 * FightClubRankings Component (Voting-Only Mode)
 *
 * Two sub-tabs: Players | Wojaks
 * - Players: DID rankings by Player Score (top 10 eligible Wojak Vote Scores)
 * - Wojaks: Individual NFT rankings by Vote Score
 *
 * Uses /api/fight-club/vote-leaderboard (voting-only endpoints).
 * Battle does NOT affect rankings in this mode.
 */

import { useState } from 'react';
import { Trophy, Crown, Medal, User, ThumbsUp, ThumbsDown, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

type RankingTab = 'players' | 'wojaks';

// ── Voting-only interfaces (spec v2 contracts) ──────────────────────

interface VoteLeaderboardPlayerRow {
  rank: number;
  did: string;
  displayName: string;
  playerScore: number;
  eligibleWojakCount: number;
  totalWojakCount: number;
  bestWojakScore: number | null;
  bestWojakImage: string | null;
}

interface VoteLeaderboardWojakRow {
  rank: number | null;
  nftId: string;
  edition: number;
  imageUrl: string;
  ownerDid: string | null;
  ownerName: string | null;
  likes: number;
  dislikes: number;
  totalVotes: number;
  voteScore: number;
  likeRatio: number | null;
  isProvisional: boolean;
  provisionalVotesNeeded: number;
  countsTowardPlayer: boolean;
}

interface PlayersResponse {
  players: VoteLeaderboardPlayerRow[];
  yourRank: number | null;
  meta: { mode: string; provisionalMinVotes: number; playerTopN: number };
}

interface WojaksResponse {
  wojaks: VoteLeaderboardWojakRow[];
  total: number;
  sort: string;
  meta: { mode: string; provisionalMinVotes: number };
}

// ── Sorting ─────────────────────────────────────────────────────────

type SortOption = 'score' | 'glazed' | 'ratio' | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'score', label: 'Score', icon: '⭐' },
  { value: 'glazed', label: 'Most Glazed', icon: '👍' },
  { value: 'ratio', label: 'Ratio', icon: '📊' },
  { value: 'newest', label: 'Newest', icon: '🆕' },
];

const PAGE_SIZE = 50;

// ── Hooks ───────────────────────────────────────────────────────────

function useVoteLeaderboard(type: 'players', sort?: SortOption): { data: PlayersResponse | undefined; isLoading: boolean; error: Error | null };
function useVoteLeaderboard(type: 'wojaks', sort?: SortOption): { data: WojaksResponse | undefined; isLoading: boolean; error: Error | null };
function useVoteLeaderboard(type: RankingTab, sort?: SortOption) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['vote-leaderboard', type, sort],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({ type, limit: String(PAGE_SIZE), offset: '0' });
      if (type === 'wojaks' && sort) params.set('sort', sort);
      const res = await fetch(`/api/fight-club/vote-leaderboard?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    staleTime: 30000,
    retry: 2,
  });
}

// ── Rank Badge ──────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="rank-badge rank-provisional">—</span>;
  if (rank === 1)
    return <span className="rank-badge rank-1"><Crown size={16} /></span>;
  if (rank === 2)
    return <span className="rank-badge rank-2"><Medal size={16} /></span>;
  if (rank === 3)
    return <span className="rank-badge rank-3"><Medal size={16} /></span>;
  return <span className="rank-badge">#{rank}</span>;
}

// ── Provisional Badge ───────────────────────────────────────────────

function ProvisionalBadge({ votesNeeded }: { votesNeeded: number }) {
  return (
    <span
      className="provisional-badge"
      title={`Needs ${votesNeeded} more vote${votesNeeded !== 1 ? 's' : ''} to count toward Player Score`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.65rem',
        padding: '1px 6px',
        borderRadius: 8,
        background: 'var(--color-warning, #f59e0b)',
        color: '#000',
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      Provisional · {votesNeeded} more
    </span>
  );
}

// ── How Ranking Works ───────────────────────────────────────────────

function HowRankingWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: 'var(--color-text-secondary)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        <HelpCircle size={14} />
        <span>How Ranking Works</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div
          className="card-static"
          style={{ padding: '10px 12px', fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}
        >
          <p style={{ margin: 0 }}>
            <strong>Wojaks</strong> are ranked by <strong>Vote Score</strong> (Glazes − Fades).
          </p>
          <p style={{ margin: '6px 0 0' }}>
            <strong>Players</strong> are ranked by their <strong>Player Score</strong> — the sum of their top 10 Wojak Vote Scores.
          </p>
          <p style={{ margin: '6px 0 0' }}>
            A Wojak needs <strong>5 votes</strong> before it counts toward your Player Score. Until then it&apos;s marked <em>Provisional</em>.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Players Tab ─────────────────────────────────────────────────────

function PlayersTab({ currentUserDid }: { currentUserDid?: string | null }) {
  const { data, isLoading, error } = useVoteLeaderboard('players');

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
        <p>No ranked players yet</p>
        <span className="text-secondary text-sm">Glaze some Wojaks to climb the ranks!</span>
      </div>
    );
  }

  const players = data.players;
  const topThree = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="rankings-content">
      <HowRankingWorks />

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
              <span style={{ fontWeight: 700 }}>{player.playerScore.toLocaleString()}</span>
            </div>
            <span className="podium-count text-secondary text-xs">
              {player.eligibleWojakCount} eligible · {player.totalWojakCount} total
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
                  {player.eligibleWojakCount} eligible · {player.totalWojakCount} total Wojaks
                </span>
              </div>
              <div className="rankings-row-power">
                <span style={{ fontWeight: 700 }}>{player.playerScore.toLocaleString()}</span>
                <span className="text-secondary text-xs">Player Score</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Wojaks Tab ──────────────────────────────────────────────────────

type ViewMode = 'list' | 'grid';

function WojaksTab() {
  const { getToken } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [allWojaks, setAllWojaks] = useState<VoteLeaderboardWojakRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial load
  const { isLoading, error } = useQuery({
    queryKey: ['wojak-vote-leaderboard', sortBy],
    queryFn: async (): Promise<WojaksResponse> => {
      const token = await getToken();
      const params = new URLSearchParams({
        type: 'wojaks',
        sort: sortBy,
        limit: String(PAGE_SIZE),
        offset: '0',
      });
      const res = await fetch(`/api/fight-club/vote-leaderboard?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: WojaksResponse = await res.json();
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
      const params = new URLSearchParams({
        type: 'wojaks',
        sort: sortBy,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const res = await fetch(`/api/fight-club/vote-leaderboard?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: WojaksResponse = await res.json();
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
        <span className="text-secondary text-sm">Vote on Wojaks to see them ranked!</span>
      </div>
    );
  }

  return (
    <div className="rankings-content">
      <HowRankingWorks />

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
              className={`rankings-row wojak-row wojak-row-animate${wojak.isProvisional ? ' vojak-provisional' : ''}`}
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
                  {wojak.isProvisional && (
                    <ProvisionalBadge votesNeeded={wojak.provisionalVotesNeeded} />
                  )}
                </div>
                <div className="wojak-row-stats flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className="text-success" title="Glazes (upvotes)">
                    <ThumbsUp size={11} style={{ display: 'inline', marginRight: 2, verticalAlign: -1 }} />
                    {wojak.likes}
                  </span>
                  <span className="text-error" title="Fades (downvotes)">
                    <ThumbsDown size={11} style={{ display: 'inline', marginRight: 2, verticalAlign: -1 }} />
                    {wojak.dislikes}
                  </span>
                  {wojak.likeRatio !== null && (
                    <span className="text-secondary" title="Like ratio">
                      {Math.round(wojak.likeRatio * 100)}%
                    </span>
                  )}
                </div>
                <span className="text-secondary text-xs">Owner: {wojak.ownerName || 'Anon'}</span>
              </div>
              <div className="wojak-row-power">
                <div className="power-total">
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {wojak.voteScore > 0 ? '+' : ''}{wojak.voteScore}
                  </span>
                </div>
                <span className="text-secondary text-xs">Vote Score</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="wojak-grid">
          {allWojaks.map((wojak, idx) => {
            const glowClass = wojak.voteScore >= 5 ? 'glow-gold' : wojak.voteScore >= 3 ? 'glow-silver' : '';
            return (
              <div
                key={wojak.nftId}
                className={`wojak-grid-card ${glowClass}${wojak.isProvisional ? ' grid-provisional' : ''}`}
                style={{ animationDelay: `${Math.min(idx, 20) * 0.03}s` }}
                title={`#${wojak.edition}\nGlazes: ${wojak.likes} · Fades: ${wojak.dislikes}\nVote Score: ${wojak.voteScore}\nOwner: ${wojak.ownerName || 'Anon'}${wojak.isProvisional ? '\n⚠ Provisional' : ''}`}
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
                  {wojak.rank !== null && <span className="grid-card-rank">#{wojak.rank}</span>}
                  {wojak.isProvisional && (
                    <span className="grid-card-provisional" style={{
                      position: 'absolute', top: 4, right: 4,
                      fontSize: '0.55rem', background: 'var(--color-warning, #f59e0b)',
                      color: '#000', padding: '1px 4px', borderRadius: 4, fontWeight: 700,
                    }}>P</span>
                  )}
                </div>
                <div className="grid-card-footer">
                  <span className="grid-card-edition">#{wojak.edition}</span>
                  <div className="grid-card-votes">
                    <span className={wojak.voteScore > 0 ? 'text-success' : wojak.voteScore < 0 ? 'text-error' : 'text-secondary'}>
                      {wojak.voteScore > 0 ? '+' : ''}{wojak.voteScore}
                    </span>
                  </div>
                  <div className="grid-card-power" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>VS</span>
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

// ── Main Component ──────────────────────────────────────────────────

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
          <ThumbsUp size={16} />
          Wojaks
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'players' ? <PlayersTab currentUserDid={currentUserDid} /> : <WojaksTab />}
    </div>
  );
}

export default FightClubRankings;
