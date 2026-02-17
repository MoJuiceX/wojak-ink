import { useEffect, useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { BattleCard } from './BattleCard';
import { BattleQueuePanel } from './BattleQueuePanel';

interface BattleNft {
  id: string;
  edition: number;
  ownerDid: string;
  name: string;
  votes: number;
}

interface Battle {
  id: number;
  nftA: BattleNft;
  nftB: BattleNft;
  status: string;
  winner: string | null;
  startedAt: string;
  endsAt: string;
  resolvedAt: string | null;
  hasVoted: boolean;
}

type Tab = 'active' | 'history';

export function BattleView() {
  const { player, isVerified } = useGame();
  const [tab, setTab] = useState<Tab>('active');
  const [battles, setBattles] = useState<Battle[]>([]);
  const [historyBattles, setHistoryBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  const loadBattles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'active', limit: '20' });
      if (player?.did) params.set('voterDid', player.did);
      const res = await fetch(`/api/game/battle-list?${params}`);
      const data = await res.json();
      if (data.success) {
        setBattles(data.battles);
        setQueueSize(data.queueSize ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [player?.did]);

  const loadHistory = useCallback(async (offset: number, append: boolean) => {
    try {
      const params = new URLSearchParams({ status: 'history', limit: '10', offset: String(offset) });
      const res = await fetch(`/api/game/battle-list?${params}`);
      const data = await res.json();
      if (data.success) {
        const newBattles = data.battles as Battle[];
        setHistoryBattles(prev => append ? [...prev, ...newBattles] : newBattles);
        setHistoryHasMore(newBattles.length === 10);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (isVerified) {
      loadBattles();
    }
  }, [isVerified, loadBattles]);

  useEffect(() => {
    if (tab === 'history' && historyBattles.length === 0 && isVerified) {
      setHistoryLoading(true);
      loadHistory(0, false).finally(() => setHistoryLoading(false));
    }
  }, [tab, isVerified, historyBattles.length, loadHistory]);

  const handleVote = async (battleId: number, votedFor: 'a' | 'b') => {
    if (!player) return;
    const res = await fetch('/api/game/battle-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterDid: player.did, battleId, votedFor }),
    });
    const data = await res.json();
    if (data.success) {
      setBattles(prev => prev.map(b => {
        if (b.id !== battleId) return b;
        return {
          ...b,
          hasVoted: true,
          nftA: { ...b.nftA, votes: data.votesA },
          nftB: { ...b.nftB, votes: data.votesB },
        };
      }));
    }
  };

  const handleLoadMoreHistory = async () => {
    setHistoryLoadingMore(true);
    await loadHistory(historyBattles.length, true);
    setHistoryLoadingMore(false);
  };

  if (!player) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Connect Your Wallet</h2>
        <p className="text-secondary">Connect your Sage wallet with a DID to view battles.</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Phase 1 NFT Required</h2>
        <p className="text-secondary">
          You need at least 1 Wojak Farmers Plot NFT assigned to your DID to participate.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          className={`btn ${tab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('active')}
        >
          Active
        </button>
        <button
          className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {tab === 'active' && (
        <>
          <BattleQueuePanel onQueued={loadBattles} />

          {queueSize > 0 && (
            <div className="text-xs text-secondary px-1">
              {queueSize} NFT{queueSize > 1 ? 's' : ''} waiting for a match
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-secondary">Loading battles...</div>
            </div>
          ) : battles.length === 0 ? (
            <div className="card-static p-8 flex flex-col items-center gap-4">
              <h2 className="text-xl font-bold">No Active Battles</h2>
              <p className="text-secondary text-center">
                Queue one of your Wojaks to start a battle!
              </p>
            </div>
          ) : (
            battles.map(battle => (
              <BattleCard
                key={battle.id}
                battleId={battle.id}
                nftA={battle.nftA}
                nftB={battle.nftB}
                endsAt={battle.endsAt}
                status={battle.status}
                winner={battle.winner}
                hasVoted={battle.hasVoted}
                onVote={handleVote}
              />
            ))
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {historyLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-secondary">Loading history...</div>
            </div>
          ) : historyBattles.length === 0 ? (
            <div className="card-static p-8 flex flex-col items-center gap-4">
              <h2 className="text-xl font-bold">No Battle History</h2>
              <p className="text-secondary text-center">
                Completed and drawn battles will appear here.
              </p>
            </div>
          ) : (
            <>
              {historyBattles.map(battle => (
                <BattleCard
                  key={battle.id}
                  battleId={battle.id}
                  nftA={battle.nftA}
                  nftB={battle.nftB}
                  endsAt={battle.endsAt}
                  status={battle.status}
                  winner={battle.winner}
                  hasVoted={true}
                  resolvedAt={battle.resolvedAt}
                />
              ))}
              {historyHasMore && (
                <button
                  className="btn btn-secondary"
                  onClick={handleLoadMoreHistory}
                  disabled={historyLoadingMore}
                >
                  {historyLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
