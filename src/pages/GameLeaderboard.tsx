// Game Leaderboard — Players and Top Wojaks tabs with podium + list.
import { useState, useEffect, useCallback } from 'react';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { GamePodium } from '@/components/game/GamePodium';
import { GameLeaderboardList } from '@/components/game/GameLeaderboardList';
import { GamePositionBar } from '@/components/game/GamePositionBar';
import PageTransition from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

type TabMode = 'players' | 'wojaks';

interface PlayerEntry {
  rank: number;
  did: string;
  powerLevel: number;
  topNft?: { nftId: string; editionNumber: number } | null;
}

interface WojakEntry {
  rank: number;
  nftId: string;
  editionNumber: number;
  name: string;
  netScore: number;
  likes: number;
  dislikes: number;
  totalVotes: number;
  ownerDid?: string | null;
}

function LeaderboardContent() {
  const { player, isRegistered } = useGame();
  const [tab, setTab] = useState<TabMode>('players');


  // Players state
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [playersTotal, setPlayersTotal] = useState(0);
  const [playersHasMore, setPlayersHasMore] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersError, setPlayersError] = useState(false);

  // Wojaks state
  const [wojaks, setWojaks] = useState<WojakEntry[]>([]);
  const [wojaksTotal, setWojaksTotal] = useState(0);
  const [wojaksHasMore, setWojaksHasMore] = useState(false);
  const [wojaksLoading, setWojaksLoading] = useState(false);
  const [wojaksError, setWojaksError] = useState(false);

  const fetchPlayers = useCallback(async (offset = 0) => {
    setPlayersLoading(true);
    setPlayersError(false);
    try {
      const res = await fetch(`/api/game/leaderboard?limit=50&offset=${offset}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setPlayers(prev => offset === 0 ? data.entries : [...prev, ...data.entries]);
        setPlayersTotal(data.pagination?.total ?? 0);
        setPlayersHasMore(data.pagination?.hasMore ?? false);
      }
    } catch {
      if (offset === 0) setPlayersError(true);
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  const fetchWojaks = useCallback(async (offset = 0) => {
    setWojaksLoading(true);
    setWojaksError(false);
    try {
      const res = await fetch(`/api/game/top-wojaks?limit=50&offset=${offset}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setWojaks(prev => offset === 0 ? data.wojaks : [...prev, ...data.wojaks]);
        setWojaksTotal(data.total ?? 0);
        setWojaksHasMore(offset + 50 < (data.total ?? 0));
      }
    } catch {
      if (offset === 0) setWojaksError(true);
    } finally {
      setWojaksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers(0);
  }, [fetchPlayers]);

  useEffect(() => {
    if (tab === 'wojaks' && wojaks.length === 0 && !wojaksLoading) {
      fetchWojaks(0);
    }
  }, [tab, wojaks.length, wojaksLoading, fetchWojaks]);

  // Derive player position
  const playerPosition = isRegistered && player
    ? (() => {
        const entry = players.find(p => p.did === player.did);
        if (!entry) return null;
        const idx = players.indexOf(entry);
        const prev = idx > 0 ? players[idx - 1] : null;
        return {
          rank: entry.rank,
          powerLevel: entry.powerLevel,
          pointsToNext: prev ? prev.powerLevel - entry.powerLevel : undefined,
          nextRank: prev ? prev.rank : undefined,
        };
      })()
    : null;

  // Derive best wojak position
  const wojakPosition = isRegistered && player
    ? (() => {
        const owned = wojaks.filter(w => w.ownerDid === player.did);
        if (owned.length === 0) return null;
        const best = owned[0];
        return {
          rank: best.rank,
          nftId: best.nftId,
          name: best.name,
          netScore: best.netScore,
        };
      })()
    : null;

  const error = tab === 'players' ? playersError : wojaksError;
  const loading = tab === 'players' ? playersLoading : wojaksLoading;
  const currentEntries = tab === 'players' ? players : wojaks;

  const podiumEntries = currentEntries.slice(0, 3).map(e => ({
    rank: (e as PlayerEntry | WojakEntry).rank,
    did: 'did' in e ? (e as PlayerEntry).did : (e as WojakEntry).ownerDid || undefined,
    name: 'name' in e ? (e as WojakEntry).name : undefined,
    nftId: tab === 'players'
      ? (e as PlayerEntry).topNft?.nftId
      : (e as WojakEntry).nftId,
    editionNumber: tab === 'players'
      ? (e as PlayerEntry).topNft?.editionNumber
      : (e as WojakEntry).editionNumber,
    powerLevel: 'powerLevel' in e ? (e as PlayerEntry).powerLevel : undefined,
    netScore: 'netScore' in e ? (e as WojakEntry).netScore : undefined,
  }));

  const listPlayerEntries = tab === 'players' ? players.filter(p => p.rank > 3) : undefined;
  const listWojakEntries = tab === 'wojaks' ? wojaks.filter(w => w.rank > 3) : undefined;

  return (
    <div className="flex flex-col" style={{ maxWidth: 720, margin: '0 auto', padding: 16, paddingBottom: 80 }}>
      {/* Tab Bar */}
      <div className="flex justify-center" style={{ marginBottom: 20 }}>
        <button
          onClick={() => setTab('players')}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 500,
            color: tab === 'players' ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: tab === 'players' ? '2px solid var(--color-primary)' : '2px solid transparent',
            background: 'none',
            border: 'none',
            borderBottomStyle: 'solid',
            borderBottomWidth: 2,
            borderBottomColor: tab === 'players' ? 'var(--color-primary)' : 'transparent',
            cursor: 'pointer',
          }}
        >
          Players
        </button>
        <button
          onClick={() => setTab('wojaks')}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 500,
            color: tab === 'wojaks' ? 'var(--color-text)' : 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            borderBottomStyle: 'solid',
            borderBottomWidth: 2,
            borderBottomColor: tab === 'wojaks' ? 'var(--color-primary)' : 'transparent',
            cursor: 'pointer',
          }}
        >
          Top Wojaks
        </button>
      </div>

      {/* Error state */}
      {error && !loading && currentEntries.length === 0 && (
        <div className="card-static p-8 flex flex-col items-center gap-3">
          <AlertCircle size={24} className="text-error" />
          <span style={{ fontSize: 14 }}>Couldn't load leaderboard</span>
          <button
            className="btn btn-primary"
            onClick={() => tab === 'players' ? fetchPlayers(0) : fetchWojaks(0)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!error && (
        <>
          {/* Podium */}
          {!loading && (
            <div style={{ marginBottom: 16 }}>
              <GamePodium entries={podiumEntries} mode={tab} />
            </div>
          )}

          {/* Loading podium skeleton */}
          {loading && currentEntries.length === 0 && (
            <div className="flex items-end justify-center gap-3" style={{ marginBottom: 16 }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="skeleton" style={{ width: i === 1 ? 120 : 100, height: i === 1 ? 160 : 130, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          )}

          {/* List */}
          <GameLeaderboardList
            mode={tab}
            playerEntries={listPlayerEntries}
            wojakEntries={listWojakEntries}
            currentDid={player?.did}
            total={tab === 'players' ? playersTotal : wojaksTotal}
            hasMore={tab === 'players' ? playersHasMore : wojaksHasMore}
            loading={loading}
            onLoadMore={() => {
              if (tab === 'players') fetchPlayers(players.length);
              else fetchWojaks(wojaks.length);
            }}
          />

          {/* Empty state */}
          {!loading && currentEntries.length === 0 && !error && (
            <div className="flex flex-col items-center gap-3 p-8">
              <span className="text-muted" style={{ fontSize: 14 }}>
                {tab === 'players' ? 'Be the first on the leaderboard' : 'No votes cast yet'}
              </span>
              <Link to="/swipe" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
                Start Playing
              </Link>
            </div>
          )}
        </>
      )}

      {/* Sticky position bar */}
      <GamePositionBar
        mode={tab}
        isRegistered={isRegistered}
        playerPosition={playerPosition}
        wojakPosition={wojakPosition}
      />
    </div>
  );
}

export default function GameLeaderboard() {
  return (
    <GameProvider>
      <PageSEO
        title="Wojak Swipe Leaderboard"
        description="Top players and most popular Wojaks ranked by community votes"
        path="/swipe/leaderboard"
      />
      <PageTransition>
        <LeaderboardContent />
      </PageTransition>
    </GameProvider>
  );
}
