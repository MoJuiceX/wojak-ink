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
      <div className="rank-badge rank-gold">
        <Crown size={16} />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="rank-badge rank-silver">
        <Medal size={16} />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="rank-badge rank-bronze">
        <Trophy size={16} />
      </div>
    );
  }
  return <span className="rank-number">#{rank}</span>;
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
              <User size={24} />
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

function WojaksTab() {
  const { data, isLoading, error } = usePowerLeaderboard('wojaks');

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

  if (!data?.wojaks?.length) {
    return (
      <div className="rankings-empty">
        <Trophy size={48} strokeWidth={1} className="text-muted" />
        <p>No Wojak rankings yet</p>
        <span className="text-secondary text-sm">Battle and vote to earn Power!</span>
      </div>
    );
  }

  const wojaks = data.wojaks;

  return (
    <div className="rankings-content">
      <div className="rankings-list wojak-rankings">
        {wojaks.map((wojak) => (
          <div key={wojak.nftId} className="rankings-row wojak-row">
            <RankBadge rank={wojak.rank} />
            <div className="wojak-row-image">
              <img
                src={wojak.imageUrl || `https://assets.mainnet.mintgarden.io/thumbnails/medium/${wojak.nftId}.png`}
                alt={`Wojak #${wojak.edition}`}
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  const fallback = `https://assets.mainnet.mintgarden.io/thumbnails/medium/${wojak.nftId}.png`;
                  if (el.src !== fallback) el.src = fallback;
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
