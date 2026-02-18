// Battle Queue Panel — select an NFT from your collection and queue for battle.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { BattleNftPickerModal } from './BattleNftPickerModal';

interface OwnedNft {
  nftId: string;
  editionNumber: number;
  name: string;
  imageUri: string;
  likes: number;
  dislikes: number;
  netScore: number;
  battleCount: number;
  battleWins: number;
}

interface BattleQueuePanelProps {
  onQueued?: () => void;
  queuedNftIds?: string[];
}

export function BattleQueuePanel({ onQueued, queuedNftIds = [] }: BattleQueuePanelProps) {
  const { player, getAuthHeaders } = useGame();
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedNft, setSelectedNft] = useState<OwnedNft | null>(null);
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

    setQueueing(true);
    setError(null);
    setResult(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/game/battle-queue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          did: player.did,
          nftId: selectedNft.nftId,
          editionNumber: selectedNft.editionNumber,
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
  }, [player, selectedNft, onQueued, getAuthHeaders]);

  if (loading) {
    return <div className="text-secondary text-sm p-4">Loading your NFTs...</div>;
  }

  if (nfts.length === 0) {
    return (
      <div className="card-static p-4 text-center">
        <p className="text-secondary text-sm">
          No Your Wojak NFTs found. Mint one in the{' '}
          <Link to="/generator" style={{ color: 'var(--color-primary)' }}>Generator</Link>.
        </p>
      </div>
    );
  }

  const availableNfts = nfts.filter(nft => !queuedNftIds.includes(nft.nftId));

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <h3 className="font-semibold">Queue for Battle</h3>

      {selectedNft ? (
        <div className="flex items-center gap-3 p-2" style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
          {selectedNft.imageUri ? (
            <img
              src={selectedNft.imageUri}
              alt={selectedNft.name}
              style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
            />
          ) : (
            <div
              className="flex items-center justify-center text-muted"
              style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}
            >
              ?
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{selectedNft.name}</div>
            <div className="text-xs text-secondary">Score: {selectedNft.netScore}</div>
          </div>
          <button
            className="btn btn-ghost text-xs"
            onClick={() => setPickerOpen(true)}
          >
            Change
          </button>
        </div>
      ) : (
        <button
          className="btn btn-secondary"
          onClick={() => setPickerOpen(true)}
        >
          Select a Wojak...
        </button>
      )}

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

      <BattleNftPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(nft) => {
          setSelectedNft(nft);
          setResult(null);
          setError(null);
        }}
        nfts={availableNfts}
        loading={loading}
      />
    </div>
  );
}
