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

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, User, ThumbsUp, ThumbsDown, HelpCircle, Crown, Medal, ExternalLink, Grid3X3 } from 'lucide-react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/lib/clerkSafe';
import { Link } from 'react-router-dom';
import { RankingRulesModal } from './RankingRulesModal';
import { DIDCollectionModal } from './DIDCollectionModal';
import { SkeletonRanking } from '@/components/skeletons/SkeletonRanking';
import { SkeletonVoteCard } from '@/components/skeletons/SkeletonVoteCard';
import { InlineError } from '@/components/ui/InlineError';
import { useFightClubMyScore } from '@/hooks/useFightClubMyScore';
import { useLayout } from '@/hooks/useLayout';

type RankingTab = 'players' | 'wojaks';

// ── Voting-only interfaces (spec v2 contracts) ──────────────────────

interface VoteLeaderboardPlayerRow {
  rank: number | null;
  did: string;
  displayName: string;
  playerScore: number;
  // Collection counts
  plotCount: number;      // Wojak Farmer's Plot NFTs
  wojakCount: number;     // Your Wojak NFTs
  collectionBonus: number; // Collection bonus from other creators' Wojaks
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
}

interface PlayersResponse {
  players: VoteLeaderboardPlayerRow[];
  yourRank: number | null;
  meta: { mode: string; playerTopN: number };
}

interface WojaksResponse {
  wojaks: VoteLeaderboardWojakRow[];
  total: number;
  sort: string;
  meta: { mode: string };
}

// ── Sorting ─────────────────────────────────────────────────────────

type SortOption = 'score' | 'glazed' | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string; tooltip: string }[] = [
  { value: 'score', label: 'Top', tooltip: 'Best vote score (Glazes − Fades)' },
  { value: 'glazed', label: 'Glazed', tooltip: 'Most Glazes (upvotes)' },
  { value: 'newest', label: 'New', tooltip: 'Most recently minted' },
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
  if (rank === null) return <span className="rank-badge">—</span>;
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
  const { isMobile } = useLayout();

  if (!scoreData?.registered) return null;

  const { ranked, rank, playerScore, totalWojakCount, pointsToNextRank, nextRank } = scoreData;

  if (isMobile) {
    // Mobile: single compact row — #rank · power · wojaks
    return (
      <div className="your-position-card your-position-compact">
        <span className="your-position-rank-inline">
          {ranked ? `#${rank}` : '—'}
        </span>
        <span className="your-position-divider">·</span>
        <span className="your-position-score-inline">
          ⚡ {playerScore.toLocaleString()}
        </span>
        <span className="your-position-divider">·</span>
        <span className="your-position-meta-inline">
          {totalWojakCount} Wojak{totalWojakCount !== 1 ? 's' : ''}
        </span>
        {ranked && pointsToNextRank !== null && nextRank !== null && (
          <>
            <span className="your-position-divider">·</span>
            <span className="your-position-next-inline">
              {pointsToNextRank} to #{nextRank}
            </span>
          </>
        )}
      </div>
    );
  }

  // Desktop: original layout
  return (
    <div className="your-position-card">
      <div className="your-position-rank">
        {ranked ? `#${rank}` : '—'}
      </div>
      <div className="your-position-info">
        <span className="your-position-label">Your Power Level</span>
        <span className="your-position-score">
          {playerScore.toLocaleString()}
        </span>
        <span className="your-position-meta">
          {totalWojakCount} Wojaks
          {ranked && pointsToNextRank !== null && nextRank !== null && (
            <> · {pointsToNextRank} to #{nextRank}</>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Players Tab ─────────────────────────────────────────────────────

function PlayersTab({ currentUserDid }: { currentUserDid?: string | null }) {
  const { data, isLoading, error } = useVoteLeaderboard('players');
  const { isMobile } = useLayout();
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const flipTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [selectedPlayer, setSelectedPlayer] = useState<{ did: string; name: string } | null>(null);

  // Preload player avatar images once data arrives
  useEffect(() => {
    if (data?.players) {
      data.players.slice(0, 15).forEach(p => {
        if (p.bestWojakImage) {
          const img = new Image();
          img.src = p.bestWojakImage;
        }
      });
    }
  }, [data]);

  // Clear all timers on unmount
  useEffect(() => {
    const timers = flipTimers.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const toggleFlip = useCallback((did: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      const wasFlipped = next.has(did);

      // Clear any existing timer for this card
      const existingTimer = flipTimers.current.get(did);
      if (existingTimer) {
        clearTimeout(existingTimer);
        flipTimers.current.delete(did);
      }

      if (wasFlipped) {
        // Flip back
        next.delete(did);
      } else {
        // Flip to back, set auto-flip timer (8 seconds)
        next.add(did);
        const timer = setTimeout(() => {
          setFlippedCards(current => {
            const updated = new Set(current);
            updated.delete(did);
            return updated;
          });
          flipTimers.current.delete(did);
        }, 8000);
        flipTimers.current.set(did, timer);
      }
      return next;
    });
  }, []);

  const getMintGardenUrl = (did: string, name: string) => {
    // MintGarden profile URL format: /profile/{name-slug}-{did-id}
    const nameSlug = (name || 'anon').toLowerCase().replace(/[^a-z0-9]/g, '');
    // DID may have 0x prefix, strip it for the URL
    const didId = did.startsWith('0x') ? did.slice(2) : did;
    return `https://mintgarden.io/profile/${nameSlug}-${didId}`;
  };

  if (isLoading) {
    return (
      <div className="rankings-content">
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonRanking key={i} delay={i * 0.05} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rankings-empty">
        <InlineError
          error={error}
          compact
        />
      </div>
    );
  }

  if (!data?.players?.length) {
    return (
      <div className="rankings-content">
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Trophy size={32} style={{ color: 'var(--color-text-muted)', marginBottom: 12 }} />
          <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>No ranked players yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
            Players need Your Wojaks in their DID to rank.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            Add Your Wojaks to your DID to get started!
          </p>
          <Link to="/fight-club/vote" className="rankings-go-vote">Go Vote</Link>
        </div>
      </div>
    );
  }

  const players = data.players;
  // Filter to players with Wojaks, then RE-RANK them 1, 2, 3... (no gaps)
  const rankedPlayers = players
    .filter((p) => p.totalWojakCount > 0)
    .map((p, idx) => ({ ...p, rank: idx + 1 })); // Re-assign continuous ranks

  // Mobile: top 3 in showcase (trophy mode), Desktop: top 10
  const showcaseCount = isMobile ? 3 : 10;
  const showTopShowcase = rankedPlayers.length >= 3;
  const topShowcase = showTopShowcase ? rankedPlayers.slice(0, showcaseCount) : [];
  const rankedList = showTopShowcase ? rankedPlayers.slice(showcaseCount) : rankedPlayers;

  // Card height varies by rank. Mobile: taller to fit names (195→165). Desktop: (220→175).
  const getCardHeight = (rank: number) => {
    const maxHeight = isMobile ? 195 : 220;
    const minHeight = isMobile ? 165 : 175;
    const steps = isMobile ? 2 : 9; // 3 cards on mobile, 10 on desktop
    const step = (maxHeight - minHeight) / steps;
    return Math.round(maxHeight - (rank - 1) * step);
  };

  // Colors for ranks
  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'var(--color-text-muted)';
  };

  const getRankGlow = (rank: number) => {
    if (rank === 1) return '0 0 20px rgba(255, 215, 0, 0.4)';
    if (rank === 2) return '0 0 15px rgba(192, 192, 192, 0.3)';
    if (rank === 3) return '0 0 12px rgba(205, 127, 50, 0.3)';
    return 'none';
  };

  return (
    <div className="rankings-content">
      {/* Your Position */}
      <YourPositionCard />

      {/* Top Showcase - flippable cards (top 3 on mobile, top 10 on desktop) */}
      {showTopShowcase && (
        <div className="top-ten-showcase">
          {topShowcase.map((player) => {
            const rank = player.rank || 1;
            const cardHeight = getCardHeight(rank);
            const rankColor = getRankColor(rank);
            const glow = getRankGlow(rank);
            const isYou = player.did === currentUserDid;
            const isTop3 = rank <= 3;
            const isFlipped = flippedCards.has(player.did);

            return (
              <div
                key={player.did}
                className={`top-ten-card-container${isFlipped ? ' flipped' : ''}`}
                style={{ height: cardHeight }}
                onClick={() => toggleFlip(player.did)}
              >
                {/* Front face */}
                <div
                  className={`top-ten-card top-ten-card-front${isYou ? ' top-ten-card-you' : ''}${isTop3 ? ' top-ten-card-premium' : ''}`}
                  style={{
                    boxShadow: glow,
                    borderColor: isTop3 ? rankColor : undefined,
                  }}
                >
                  <div className="top-ten-rank" style={{ color: rankColor }}>
                    {rank === 1 && <Crown size={isMobile ? 14 : 18} style={{ marginBottom: 2 }} />}
                    {rank === 2 && <Medal size={isMobile ? 12 : 16} style={{ marginBottom: 2 }} />}
                    {rank === 3 && <Medal size={isMobile ? 12 : 16} style={{ marginBottom: 2 }} />}
                    #{rank}
                  </div>
                  <div
                    className="top-ten-avatar"
                    style={{ borderColor: isTop3 ? rankColor : undefined }}
                  >
                    {player.bestWojakImage ? (
                      <img
                        src={player.bestWojakImage}
                        alt={player.displayName}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <User size={24} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </div>
                  <span className="top-ten-name">{player.displayName || 'Anon'}</span>
                  <div className="top-ten-power" style={{ color: isTop3 ? rankColor : undefined }}>
                    {player.playerScore.toLocaleString()}
                  </div>
                </div>

                {/* Back face - collection breakdown */}
                <div
                  className={`top-ten-card top-ten-card-back${isYou ? ' top-ten-card-you' : ''}${isTop3 ? ' top-ten-card-premium' : ''}`}
                  style={{
                    boxShadow: glow,
                    borderColor: isTop3 ? rankColor : undefined,
                  }}
                >
                  <span className="top-ten-back-name">{player.displayName || 'Anon'}</span>
                  <div className="top-ten-back-stats">
                    <div className="back-stat">
                      <span className="back-stat-value collection-plot">{player.plotCount || 0}</span>
                      <span className="back-stat-label">Farmers</span>
                    </div>
                    <div className="back-stat">
                      <span className="back-stat-value collection-wojak">{player.wojakCount || 0}</span>
                      <span className="back-stat-label">Your Wojaks</span>
                    </div>
                    {(player.collectionBonus ?? 0) > 0 && (
                      <div className="back-stat">
                        <span className="back-stat-value text-accent">+{player.collectionBonus}</span>
                        <span className="back-stat-label">Bonus</span>
                      </div>
                    )}
                  </div>
                  <div className="top-ten-back-actions">
                    <button
                      type="button"
                      className="top-ten-back-icon"
                      title="View Collection"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlayer({ did: player.did, name: player.displayName || 'Anon' });
                      }}
                    >
                      <Grid3X3 size={isMobile ? 18 : 14} />
                    </button>
                    <a
                      href={getMintGardenUrl(player.did, player.displayName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="top-ten-back-icon"
                      title="View on MintGarden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={isMobile ? 18 : 14} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranked list */}
      {rankedList.length > 0 && (
        <div className="rankings-section-card">
          {!isMobile && (
            <div className="rankings-section-header rankings-section-header-compact">
              <h3 className="rankings-section-title">All Players</h3>
              <span className="rankings-section-count">{rankedPlayers.length}</span>
            </div>
          )}
          <div className="rankings-list">
            {rankedList.map((player) => (
              <div
                key={player.did}
                className={`rankings-row${player.did === currentUserDid ? ' rankings-row-you' : ''}`}
                onClick={() => isMobile && setSelectedPlayer({ did: player.did, name: player.displayName || 'Anon' })}
              >
                <RankBadge rank={player.rank} />
                <div className="rankings-row-avatar">
                  {player.bestWojakImage ? (
                    <img
                      src={player.bestWojakImage}
                      alt={player.displayName}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <User size={18} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>
                <div className="rankings-row-info">
                  <span className="rankings-row-name">{player.displayName || 'Anon'}</span>
                  <span className="collection-counts">
                    <span className="collection-plot">{player.plotCount || 0} Farmers</span>
                    <span className="collection-divider">·</span>
                    <span className="collection-wojak">{player.wojakCount || 0} Wojaks</span>
                    {(player.collectionBonus ?? 0) > 0 && (
                      <>
                        <span className="collection-divider">·</span>
                        <span className="text-accent">+{player.collectionBonus} bonus</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="rankings-row-power">
                  <span className="power-value">{player.playerScore.toLocaleString()}</span>
                  <span className="power-label">Power</span>
                </div>
                <div className="rankings-row-actions">
                  <button
                    type="button"
                    className="rankings-action-icon"
                    title="View Collection"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlayer({ did: player.did, name: player.displayName || 'Anon' }); }}
                  >
                    <Grid3X3 size={16} />
                  </button>
                  <a
                    href={getMintGardenUrl(player.did, player.displayName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rankings-action-icon"
                    title="View on MintGarden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unranked players - verified but no Wojaks in DID */}
      {players.filter((p) => p.totalWojakCount === 0).length > 0 && (
        <div className="rankings-section-card" style={{ opacity: 0.7 }}>
          <div className="rankings-section-header">
            <div>
              <h3 className="rankings-section-title">Not Ranked</h3>
              <p className="rankings-section-subtitle">
                Add Your Wojaks to your DID to get ranked
              </p>
            </div>
            <span className="rankings-section-count">
              {players.filter((p) => p.totalWojakCount === 0).length} players
            </span>
          </div>
          <div className="rankings-list">
            {players.filter((p) => p.totalWojakCount === 0).slice(0, 10).map((player) => (
              <div
                key={player.did}
                className={`rankings-row${player.did === currentUserDid ? ' rankings-row-you' : ''}`}
                onClick={() => isMobile && setSelectedPlayer({ did: player.did, name: player.displayName || 'Anon' })}
              >
                <span className="rank-badge">—</span>
                <div className="rankings-row-avatar">
                  {player.bestWojakImage ? (
                    <img
                      src={player.bestWojakImage}
                      alt={player.displayName}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <User size={18} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>
                <div className="rankings-row-info">
                  <span className="rankings-row-name">{player.displayName || 'Anon'}</span>
                  <span className="text-secondary text-xs">
                    No Wojaks in DID
                  </span>
                </div>
                <div className="rankings-row-power">
                  <span className="power-value" style={{ color: 'var(--color-text-muted)' }}>0</span>
                  <span className="power-label">Power</span>
                </div>
                <div className="rankings-row-actions">
                  <button
                    type="button"
                    className="rankings-action-icon"
                    title="View Collection"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlayer({ did: player.did, name: player.displayName || 'Anon' }); }}
                  >
                    <Grid3X3 size={16} />
                  </button>
                  <a
                    href={getMintGardenUrl(player.did, player.displayName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rankings-action-icon"
                    title="View on MintGarden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DID Collection Modal */}
      {selectedPlayer && (
        <DIDCollectionModal
          did={selectedPlayer.did}
          displayName={selectedPlayer.name}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

// ── Wojaks Tab ──────────────────────────────────────────────────────

type ViewMode = 'list' | 'grid';

function WojaksTab() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { isMobile } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [extraWojaks, setExtraWojaks] = useState<VoteLeaderboardWojakRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset pagination when sort changes
  useEffect(() => {
    setExtraWojaks([]);
  }, [sortBy]);

  // Shared fetch function for both the main query and prefetching
  const fetchWojaks = useCallback(async (sort: SortOption): Promise<WojaksResponse> => {
    const token = await getToken();
    const params = new URLSearchParams({
      type: 'wojaks',
      sort,
      limit: String(PAGE_SIZE),
      offset: '0',
    });
    const res = await fetch(`/api/fight-club/vote-leaderboard?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  }, [getToken]);

  // Prefetch all sort variants on mount — switching sorts is instant
  useEffect(() => {
    for (const opt of SORT_OPTIONS) {
      if (opt.value !== sortBy) {
        queryClient.prefetchQuery({
          queryKey: ['wojak-vote-leaderboard', opt.value],
          queryFn: () => fetchWojaks(opt.value),
          staleTime: 30000,
        });
      }
    }
  // Only prefetch on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load — data comes from query, NOT from side-effect state
  // keepPreviousData shows the old sort's data while the new sort loads (no flash)
  const { data: queryData, isLoading, isFetching, error } = useQuery({
    queryKey: ['wojak-vote-leaderboard', sortBy],
    queryFn: async (): Promise<WojaksResponse> => {
      const data = await fetchWojaks(sortBy);
      setTotal(data.total || 0);
      // Preload images for the first 10 results
      (data.wojaks || []).slice(0, 10).forEach(w => {
        if (w.imageUrl) {
          const img = new Image();
          img.src = w.imageUrl;
        }
      });
      return data;
    },
    staleTime: 30000,
    retry: 2,
    placeholderData: keepPreviousData,
  });

  // Derive displayed wojaks from query data + any extra pages loaded
  const firstPage = queryData?.wojaks || [];
  const allWojaks = extraWojaks.length > 0 ? [...firstPage, ...extraWojaks] : firstPage;
  const offset = allWojaks.length;

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
      setExtraWojaks(prev => [...prev, ...(data.wojaks || [])]);
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
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonVoteCard key={i} delay={i * 0.08} compact />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rankings-empty">
        <InlineError
          error={error}
          compact
        />
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
      {/* Toolbar — single row: sort chips + view toggle */}
      <div className="rankings-toolbar rankings-toolbar-inline">
        <div className="rankings-sort">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`sort-chip${sortBy === opt.value ? ' active' : ''}`}
              onClick={() => setSortBy(opt.value)}
              title={opt.tooltip}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="rankings-view-toggle">
          <button
            type="button"
            className={`view-btn${viewMode === 'list' ? ' active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
            aria-label="List view"
          >
            ☰
          </button>
          <button
            type="button"
            className={`view-btn${viewMode === 'grid' ? ' active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            ▦
          </button>
        </div>
      </div>

      {/* List View — subtle dim while switching sorts */}
      {viewMode === 'list' && (
        <div className="rankings-list wojak-rankings" style={isFetching ? { opacity: 0.6, transition: 'opacity 0.15s' } : { opacity: 1, transition: 'opacity 0.15s' }}>
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
                {isMobile ? (
                  /* Mobile: compact single-line layout */
                  <>
                    <div className="wojak-row-title">
                      <span className="wojak-row-edition">#{wojak.edition}</span>
                      <span className="wojak-row-owner-dot">·</span>
                      <span className="wojak-row-owner">{wojak.ownerName || 'Anon'}</span>
                    </div>
                    <span className="wojak-row-votes-compact">
                      <span className="text-success">{wojak.likes}</span>
                      <span className="text-muted">/</span>
                      <span className="text-error">{wojak.dislikes}</span>
                    </span>
                  </>
                ) : (
                  /* Desktop: full layout */
                  <>
                    <div className="wojak-row-header">
                      <div className="wojak-row-title">
                        <span className="wojak-row-edition">#{wojak.edition}</span>
                        <span className="wojak-row-owner">Owner: {wojak.ownerName || 'Anon'}</span>
                      </div>
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
                  </>
                )}
              </div>
              <div className="wojak-row-power">
                <div className="power-total">
                  <span style={{ fontWeight: 700, fontSize: isMobile ? '0.95rem' : '1rem' }}>
                    {wojak.voteScore > 0 ? '+' : ''}{wojak.voteScore}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid View — subtle dim while switching sorts */}
      {viewMode === 'grid' && (
        <div className="wojak-grid" style={isFetching ? { opacity: 0.6, transition: 'opacity 0.15s' } : { opacity: 1, transition: 'opacity 0.15s' }}>
          {allWojaks.map((wojak, idx) => {
            const glowClass = wojak.voteScore >= 5 ? 'glow-gold' : wojak.voteScore >= 3 ? 'glow-silver' : '';
            return (
              <div
                key={wojak.nftId}
                className={`wojak-grid-card ${glowClass}`}
                style={{ animationDelay: `${Math.min(idx, 20) * 0.03}s` }}
                title={`#${wojak.edition}\nGlazes: ${wojak.likes} · Fades: ${wojak.dislikes}\nVote Score: ${wojak.voteScore}\nOwner: ${wojak.ownerName || 'Anon'}`}
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
  const { isMobile } = useLayout();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // Prefetch the OTHER tab's data so switching is instant
  useEffect(() => {
    const otherType = activeTab === 'players' ? 'wojaks' : 'players';
    const prefetchFn = async () => {
      const token = await getToken();
      const params = new URLSearchParams({ type: otherType, limit: String(PAGE_SIZE), offset: '0' });
      if (otherType === 'wojaks') params.set('sort', 'score');
      const res = await fetch(`/api/fight-club/vote-leaderboard?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Preload top images
      const items = otherType === 'wojaks' ? data.wojaks : data.players;
      (items || []).slice(0, 10).forEach((item: Record<string, unknown>) => {
        const url = (item.imageUrl || item.bestWojakImage) as string | null;
        if (url) { const img = new Image(); img.src = url; }
      });
      return data;
    };

    if (otherType === 'wojaks') {
      queryClient.prefetchQuery({
        queryKey: ['wojak-vote-leaderboard', 'score'],
        queryFn: prefetchFn,
        staleTime: 30000,
      });
    } else {
      queryClient.prefetchQuery({
        queryKey: ['vote-leaderboard', 'players', undefined],
        queryFn: prefetchFn,
        staleTime: 30000,
      });
    }
  }, [activeTab, queryClient, getToken]);

  return (
    <div className="fight-club-rankings">
      {/* Rankings header block — hidden on mobile (redundant with tab) */}
      {!isMobile && (
        <div className="rankings-header-block">
          <div className="rankings-header-text">
            <h2 className="rankings-header-title">
              <Trophy size={22} style={{ color: 'var(--color-gold-bright)', marginRight: 8, verticalAlign: -3 }} />
              Fight Club Rankings
            </h2>
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
      )}

      {/* Sub-tabs + rules icon (mobile) */}
      <div className="rankings-tabs-row">
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
        {isMobile && (
          <button
            type="button"
            className="rankings-rules-icon"
            onClick={() => setShowRules(true)}
            title="Rules"
          >
            <HelpCircle size={16} />
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'players' ? <PlayersTab currentUserDid={currentUserDid} /> : <WojaksTab />}

      {showRules && <RankingRulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

export default FightClubRankings;
