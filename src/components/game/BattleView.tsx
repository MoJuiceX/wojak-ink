import { useEffect, useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { BattleCard } from './BattleCard';

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

export function BattleView() {
  const { player, isVerified } = useGame();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

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

  useEffect(() => {
    if (isVerified) {
      loadBattles();
    }
  }, [isVerified, loadBattles]);

  const handleVote = async (battleId: number, votedFor: 'a' | 'b') => {
    if (!player) return;
    const res = await fetch('/api/game/battle-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterDid: player.did, battleId, votedFor }),
    });
    const data = await res.json();
    if (data.success) {
      // Update local state
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-secondary">Loading battles...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Queue info */}
      <div className="card-static p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Battle Queue</h3>
          <p className="text-xs text-secondary">
            {queueSize === 0
              ? 'No NFTs waiting. Queue yours to start a battle!'
              : `${queueSize} NFT${queueSize > 1 ? 's' : ''} waiting for a match`}
          </p>
        </div>
      </div>

      {/* Active battles */}
      {battles.length === 0 ? (
        <div className="card-static p-8 flex flex-col items-center gap-4">
          <h2 className="text-xl font-bold">No Active Battles</h2>
          <p className="text-secondary text-center">
            Queue one of your Wojaks from the dashboard to start a battle!
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
    </div>
  );
}
