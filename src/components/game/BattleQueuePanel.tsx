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
  const [result, setResult] = useState<{ matched: boolean; message: string } | null>(null);

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

  const handleQueue = useCallback(async (nft: OwnedNft): Promise<{ success: boolean; error?: string }> => {
    if (!player) return { success: false, error: 'Not logged in' };

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/game/battle-queue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          did: player.did,
          nftId: nft.nftId,
          editionNumber: nft.editionNumber,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ matched: data.matched, message: data.message });
        onQueued?.();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to queue' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [player, onQueued, getAuthHeaders]);

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

      <button
        className="btn btn-primary"
        onClick={() => { setResult(null); setPickerOpen(true); }}
      >
        Select a Wojak...
      </button>

      {result && (
        <div className={`text-sm ${result.matched ? 'text-accent' : 'text-secondary'}`}>
          {result.message}
        </div>
      )}

      <BattleNftPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onQueue={handleQueue}
        nfts={availableNfts}
        loading={loading}
      />
    </div>
  );
}
