// Battle Queue Panel — select an NFT from your collection and queue for battle.

import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';

interface OwnedNft {
  nftId: string;
  editionNumber: number;
  name: string;
  netScore: number;
}

interface BattleQueuePanelProps {
  onQueued?: () => void;
}

export function BattleQueuePanel({ onQueued }: BattleQueuePanelProps) {
  const { player } = useGame();
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNft, setSelectedNft] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [result, setResult] = useState<{ matched: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!player?.did) return;
    setLoading(true);
    fetch(`/api/game/collection?did=${player.did}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.nfts) {
          setNfts(data.nfts.filter((n: OwnedNft & { collection: string }) => n.collection === 'phase2'));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [player?.did]);

  const handleQueue = useCallback(async () => {
    if (!player || !selectedNft) return;
    const nft = nfts.find(n => n.nftId === selectedNft);
    if (!nft) return;

    setQueueing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/game/battle-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: player.did,
          nftId: nft.nftId,
          editionNumber: nft.editionNumber,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ matched: data.matched, message: data.message });
        setSelectedNft(null);
        onQueued?.();
      } else {
        setError(data.error || 'Failed to queue');
      }
    } catch {
      setError('Network error');
    } finally {
      setQueueing(false);
    }
  }, [player, selectedNft, nfts, onQueued]);

  if (loading) {
    return <div className="text-secondary text-sm p-4">Loading your NFTs...</div>;
  }

  if (nfts.length === 0) {
    return (
      <div className="card-static p-4 text-center">
        <p className="text-secondary text-sm">
          No Your Wojak NFTs found. Mint one in the{' '}
          <a href="/generator" style={{ color: 'var(--color-primary)' }}>Generator</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="font-semibold">Queue for Battle</h3>

      <select
        className="input"
        value={selectedNft || ''}
        onChange={(e) => setSelectedNft(e.target.value || null)}
      >
        <option value="">Select a Wojak...</option>
        {nfts.map(nft => (
          <option key={nft.nftId} value={nft.nftId}>
            {nft.name} #{nft.editionNumber} (score: {nft.netScore})
          </option>
        ))}
      </select>

      <button
        className="btn btn-primary"
        disabled={!selectedNft || queueing}
        onClick={handleQueue}
      >
        {queueing ? 'Queueing...' : 'Enter Battle Queue'}
      </button>

      {result && (
        <div className={`text-sm ${result.matched ? 'text-accent' : 'text-secondary'}`}>
          {result.message}
        </div>
      )}
      {error && (
        <div className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</div>
      )}
    </div>
  );
}
