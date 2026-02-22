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
import { Trophy, User, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { RankingRulesModal } from './RankingRulesModal';
import { useFightClubMyScore, getTierColor } from '@/hooks/useFightClubMyScore';

type RankingTab = 'players' | 'wojaks';

// ── Voting-only interfaces (spec v2 contracts) ──────────────────────

interface VoteLeaderboardPlayerRow {
  rank: number | null;
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

interface LegacyCommunityPlayerRow {
  rank: number;
  did: string;
  displayName: string | null;
  wojakCount?: number;
}

interface LegacyCommunityPlayersResponse {
  players?: LegacyCommunityPlayerRow[];
}

interface WojaksResponse {
  wojaks: VoteLeaderboardWojakRow[];
  total: number;
  sort: string;
  meta: { mode: string; provisionalMinVotes: number };
}

// ── Sorting ─────────────────────────────────────────────────────────

type SortOption = 'score' | 'glazed' | 'ratio' | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string; icon: string; tooltip: string }[] = [
  { value: 'score', label: 'Score', icon: '⭐', tooltip: 'Glazes − Fades' },
  { value: 'glazed', label: 'Most Glazed', icon: '👍', tooltip: 'Highest total Glazes' },
  { value: 'ratio', label: 'Ratio', icon: '📊', tooltip: 'Glaze ratio (best after enough votes)' },
  { value: 'newest', label: 'Newest', icon: '🆕', tooltip: 'Most recently minted' },
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

function useCommunityPlayersFallback(enabled = true) {
  return useQuery({
    queryKey: ['combat-power-community-players-fallback'],
    queryFn: async (): Promise<LegacyCommunityPlayersResponse> => {
      const res = await fetch('/api/combat/power-leaderboard?type=players&limit=30');
      if (!res.ok) throw new Error('Failed to fetch community players');
      return res.json();
    },
    enabled,
    staleTime: 60000,
    retry: 1,
  });
}

// ── Rank Badge ──────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="rank-badge rank-provisional">—</span>;
  if (rank === 1)
    return <span className="rank-badge rank-1" style={{ color: '#FFD700', fontWeight: 'bold' }}>#1</span>;
  if (rank === 2)
    return <span className="rank-badge rank-2" style={{ color: '#C0C0C0', fontWeight: 'bold' }}>#2</span>;
  if (rank === 3)
    return <span className="rank-badge rank-3" style={{ color: '#cd7f32', fontWeight: 'bold' }}>#3</span>;
  return <span className="rank-badge">#{rank}</span>;
}

// ── Your Position Card ──────────────────────────────────────────────

function YourPositionCard() {
  const { data: scoreData } = useFightClubMyScore();

  if (!scoreData?.registered) return null;

  const { ranked, rank, playerScore, tier, eligibleWojakCount, totalWojakCount, pointsToNextRank, nextRank } = scoreData;
  const tierColor = getTierColor(tier);

  return (
    <div className="your-position-card">
      <div className="your-position-rank">
        {ranked ? `#${rank}` : '—'}
      </div>
      <div className="your-position-info">
        <span className="your-position-label">Your Position</span>
        <span className="your-position-score">
          {playerScore.toLocaleString()} <span style={{ color: tierColor, fontSize: '0.75rem' }}>{tier}</span>
        </span>
        <span className="your-position-meta">
          {eligibleWojakCount} eligible · {totalWojakCount} total Wojaks
          {ranked && pointsToNextRank !== null && nextRank !== null && (
            <> · {pointsToNextRank} pts to #{nextRank}</>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Players Tab ─────────────────────────────────────────────────────

function PlayersTab({ currentUserDid }: { currentUserDid?: string | null }) {
  const { data, isLoading, error } = useVoteLeaderboard('players');
  const { data: communityData } = useCommunityPlayersFallback(!isLoading && !error);

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
    const minVotes = data?.meta?.provisionalMinVotes ?? 3;
    return (
      <div className="rankings-content">
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Trophy size={32} style={{ color: 'var(--color-text-muted)', marginBottom: 12 }} />
          <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>No ranked players yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
            Wojaks need {minVotes} votes to count toward Player Score.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            Glaze some Wojaks to get the leaderboard going!
          </p>
          <Link to="/fight-club/vote" className="rankings-go-vote">Go Vote</Link>
        </div>
      </div>
    );
  }

  const players = data.players;
  const provisionalMinVotes = data.meta?.provisionalMinVotes ?? 3;
  const rankedPlayers = players.filter((p) => p.eligibleWojakCount > 0);
  const waitingPlayers = players.filter((p) => p.eligibleWojakCount === 0);
  const showPodium = rankedPlayers.length >= 3;
  const podiumIds = new Set(showPodium ? rankedPlayers.slice(0, 3).map((p) => p.did) : []);
  const topThree = showPodium ? rankedPlayers.slice(0, 3) : [];
  const rankedList = showPodium ? rankedPlayers.filter((p) => !podiumIds.has(p.did)) : rankedPlayers;
  const rankedDidSet = new Set(players.map((p) => p.did));
  const communityPlayers = (communityData?.players || [])
    .filter((p) => p.did && !rankedDidSet.has(p.did))
    .slice(0, 12);

  return (
    <div className="rankings-content">
      {/* Your Position */}
      <YourPositionCard />

      {/* Podium for top 3 ranked players (skip when list is too small/sparse) */}
      {showPodium && (
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
      )}

      {/* Your position indicator */}
      {showPodium && data.yourRank && data.yourRank > 3 && (
        <div className="your-rank-indicator">
          <span>Your rank: #{data.yourRank}</span>
        </div>
      )}

      {/* Ranked list */}
      {rankedList.length > 0 && (
        <div className="rankings-section-card">
          <div className="rankings-section-header">
            <div>
              <h3 className="rankings-section-title">Ranked Players</h3>
              <p className="rankings-section-subtitle">
                Player Score = top {data.meta?.playerTopN ?? 10} eligible Wojak scores in DID
              </p>
            </div>
            <span className="rankings-section-count">{rankedPlayers.length} ranked</span>
          </div>
          <div className="rankings-list">
            {rankedList.map((player) => (
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
        </div>
      )}

      {/* Verified but not ranked (from same endpoint) */}
      {waitingPlayers.length > 0 && (
        <div className="community-players-card">
          <div className="community-players-header">
            <div>
              <h3 className="community-players-title">Verified Players (Waiting to Rank)</h3>
              <p className="community-players-subtitle">
                These DIDs are verified and in Fight Club. They need Wojaks in DID with at least {provisionalMinVotes} votes before they enter the ranked leaderboard.
              </p>
            </div>
            <span className="community-players-count">{waitingPlayers.length} in queue</span>
          </div>
          <div className="community-players-list">
            {waitingPlayers.slice(0, 16).map((player) => (
              <div key={player.did} className={`community-player-row${player.did === currentUserDid ? ' community-player-row-you' : ''}`}>
                <div className="community-player-rank">—</div>
                <div className="community-player-main">
                  <span className="community-player-name">{player.displayName || `${player.did.slice(0, 12)}...`}</span>
                  <span className="community-player-meta">
                    {player.totalWojakCount} total Wojaks in DID · Needs ranked Wojaks
                  </span>
                </div>
                <span className="community-player-status">Vote activity needed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community fallback (legacy endpoint) only when new endpoint is still sparse */}
      {communityPlayers.length > 0 && waitingPlayers.length < 6 && (
        <div className="community-players-card">
          <div className="community-players-header">
            <div>
              <h3 className="community-players-title">Verified Players (Not Ranked Yet)</h3>
              <p className="community-players-subtitle">
                These players are verified, but need Wojaks in DID with enough votes to enter the Player Score leaderboard.
              </p>
            </div>
            <span className="community-players-count">{communityPlayers.length} shown</span>
          </div>
          <div className="community-players-list">
            {communityPlayers.map((player) => (
              <div key={player.did} className="community-player-row">
                <div className="community-player-rank">#{player.rank}</div>
                <div className="community-player-main">
                  <span className="community-player-name">{player.displayName || `${player.did.slice(0, 12)}...`}</span>
                  <span className="community-player-meta">
                    Verified DID{typeof player.wojakCount === 'number' ? ` · ${player.wojakCount} Wojaks tracked` : ''}
                  </span>
                </div>
                <span className="community-player-status">Waiting for ranked Wojaks</span>
              </div>
            ))}
          </div>
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
      {/* Toolbar */}
      <div className="rankings-toolbar">
        <div className="rankings-sort">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`sort-chip${sortBy === opt.value ? ' active' : ''}`}
              onClick={() => setSortBy(opt.value)}
              title={opt.tooltip}
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
                  <div className="wojak-row-title">
                    <span className="wojak-row-edition">#{wojak.edition}</span>
                    <span className="wojak-row-owner">Owner: {wojak.ownerName || 'Anon'}</span>
                  </div>
                  <span className="wojak-row-status">
                    {wojak.isProvisional ? `Needs ${wojak.provisionalVotesNeeded} more` : 'Ranked'}
                  </span>
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
                  <span className="text-secondary" title="Total votes">
                    {wojak.totalVotes} votes
                  </span>
                </div>
              </div>
              <div className="wojak-row-power">
                <div className="power-total">
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {wojak.voteScore > 0 ? '+' : ''}{wojak.voteScore}
                  </span>
                </div>
                {wojak.isProvisional && (
                  <span className="wojak-row-power-note text-secondary text-xs">
                    Not ranked yet
                  </span>
                )}
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
                </div>
                <div className="grid-card-footer">
                  <span className="grid-card-edition">#{wojak.edition}</span>
                  <div className="grid-card-votes">
                    <span className={wojak.voteScore > 0 ? 'text-success' : wojak.voteScore < 0 ? 'text-error' : 'text-secondary'}>
                      {wojak.voteScore > 0 ? '+' : ''}{wojak.voteScore}
                    </span>
                  </div>
                  {wojak.isProvisional && <span className="grid-card-status">New</span>}
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
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="fight-club-rankings">
      {/* Rankings header block */}
      <div className="rankings-header-block">
        <div className="rankings-header-text">
          <h2 className="rankings-header-title">Fight Club Rankings</h2>
          <span className="rankings-header-subtitle">Voting-only season. Battle is demo-only for now.</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/fight-club/vote" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.9rem' }}>Go Vote</Link>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowRules(true)}
          >
            <HelpCircle size={14} />
            Rules
          </button>
        </div>
      </div>

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

      {showRules && <RankingRulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

export default FightClubRankings;
