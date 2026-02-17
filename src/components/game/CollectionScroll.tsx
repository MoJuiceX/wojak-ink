// Collection Scroll — horizontal scrollable row of player's Wojak NFTs with detail modal.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { BurnButton } from './BurnButton';
import { useSageWallet } from '@/sage-wallet';
import { useGame } from '@/contexts/GameContext';
import { calculateBurnCredits } from '@/lib/burnCredits';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%2312121a'%3E%3Crect width='200' height='200' rx='14'/%3E%3Ctext x='100' y='108' text-anchor='middle' fill='%23606070' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";

interface CollectionNft {
  nftId: string;
  editionNumber: number;
  name: string;
  likes: number;
  dislikes: number;
  netScore: number;
  totalVotes: number;
}

interface CollectionScrollProps {
  did: string;
}

function NftDetailModal({ nft, onClose, onBurned }: { nft: CollectionNft; onClose: () => void; onBurned: () => void }) {
  const { player, refreshPowerLevel } = useGame();
  const { getNFTCoinId } = useSageWallet();
  const estimatedCredits = calculateBurnCredits(nft.likes, nft.dislikes);
  const [coinId, setCoinId] = useState<string | null>(null);
  const [loadingCoinId, setLoadingCoinId] = useState(false);
  const [coinIdError, setCoinIdError] = useState<string | null>(null);

  const fetchCoinId = useCallback(async () => {
    setLoadingCoinId(true);
    setCoinIdError(null);
    try {
      const resolved = await getNFTCoinId(nft.nftId);
      setCoinId(resolved);
    } catch {
      setCoinIdError('Could not fetch NFT coin ID from wallet. Is your wallet open?');
    } finally {
      setLoadingCoinId(false);
    }
  }, [nft.nftId, getNFTCoinId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="card-static p-5 max-w-sm w-full flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ fontSize: 16 }}>{nft.name}</h3>
          <button className="btn btn-ghost" style={{ padding: 4, minWidth: 'auto' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <img
          src={`https://assets.mintgarden.io/thumbnails/medium/${nft.nftId}.png`}
          alt={nft.name}
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
          style={{
            width: 200,
            height: 200,
            borderRadius: 'var(--radius-lg)',
            objectFit: 'cover',
            alignSelf: 'center',
          }}
        />

        <div className="flex flex-col gap-2" style={{ fontSize: 13 }}>
          <div className="flex justify-between">
            <span className="text-secondary">Edition</span>
            <span>#{nft.editionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Likes</span>
            <span style={{ color: 'var(--color-success)' }}>{nft.likes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Dislikes</span>
            <span style={{ color: 'var(--color-error)' }}>{nft.dislikes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Net Score</span>
            <span className="font-bold">{nft.netScore >= 0 ? '+' : ''}{nft.netScore}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Total Votes</span>
            <span>{nft.totalVotes}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/swipe/battles" className="btn btn-primary flex-1 text-center" style={{ fontSize: 13 }}>
            Enter Battle
          </Link>
          {coinId ? (
            <BurnButton
              nftId={nft.nftId}
              nftCoinId={coinId}
              editionNumber={nft.editionNumber}
              nftName={nft.name}
              likes={nft.likes}
              dislikes={nft.dislikes}
              estimatedCredits={estimatedCredits}
              burnerDid={player?.did}
              onBurned={() => { onClose(); refreshPowerLevel(); onBurned(); }}
            />
          ) : (
            <button
              className="btn btn-ghost text-sm"
              style={{ color: 'var(--color-error)' }}
              disabled={loadingCoinId}
              onClick={fetchCoinId}
            >
              {loadingCoinId ? 'Loading...' : 'Burn'}
            </button>
          )}
        </div>
        {coinIdError && (
          <span className="text-sm" style={{ color: 'var(--color-error)' }}>{coinIdError}</span>
        )}
      </div>
    </div>
  );
}

export function CollectionScroll({ did }: CollectionScrollProps) {
  const [nfts, setNfts] = useState<CollectionNft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState<CollectionNft | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/game/collection?did=${did}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.success) setNfts(data.nfts);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [did, refreshKey]);

  if (loading) {
    return (
      <div id="collection-section" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-secondary" style={{ fontSize: 14, fontWeight: 500 }}>Your Collection</span>
        </div>
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
          ))}
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div id="collection-section" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-secondary" style={{ fontSize: 14, fontWeight: 500 }}>Your Collection</span>
        </div>
        <div className="flex items-center justify-center" style={{ height: 96 }}>
          <div className="flex flex-col items-center gap-2">
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="text-muted" style={{ fontSize: 11, textAlign: 'center', padding: 4 }}>No Wojaks yet</span>
            </div>
            <Link to="/generator" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
              Mint Your First
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="collection-section" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-secondary" style={{ fontSize: 14, fontWeight: 500 }}>Your Collection</span>
        <span className="badge">{nfts.length}</span>
      </div>
      <div
        className="flex gap-3 hide-scrollbar"
        style={{
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {nfts.map(nft => (
          <button
            key={nft.nftId}
            className="flex flex-col items-center gap-1"
            style={{ flexShrink: 0, scrollSnapAlign: 'start', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => setSelectedNft(nft)}
          >
            <img
              src={`https://assets.mintgarden.io/thumbnails/medium/${nft.nftId}.png`}
              alt={nft.name}
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 'var(--radius-md)',
                objectFit: 'cover',
              }}
              loading="lazy"
            />
            <span className="text-muted" style={{ fontSize: 11 }}>
              {nft.netScore >= 0 ? '+' : ''}{nft.netScore}
            </span>
          </button>
        ))}
      </div>

      {selectedNft && (
        <NftDetailModal nft={selectedNft} onClose={() => setSelectedNft(null)} onBurned={() => setRefreshKey(k => k + 1)} />
      )}
    </div>
  );
}
