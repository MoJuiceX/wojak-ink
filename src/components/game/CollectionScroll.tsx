// Collection Scroll — horizontal scrollable row of player's Wojak NFTs with detail modal.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

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

function NftDetailModal({ nft, onClose }: { nft: CollectionNft; onClose: () => void }) {
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
          <Link to="/your-wojak/battles" className="btn btn-primary flex-1 text-center" style={{ fontSize: 13 }}>
            Enter Battle
          </Link>
          <button
            className="btn btn-ghost flex-1"
            style={{ fontSize: 13, color: 'var(--color-error)' }}
            onClick={onClose}
          >
            Burn
          </button>
        </div>
      </div>
    </div>
  );
}

export function CollectionScroll({ did }: CollectionScrollProps) {
  const [nfts, setNfts] = useState<CollectionNft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState<CollectionNft | null>(null);

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
  }, [did]);

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
        <NftDetailModal nft={selectedNft} onClose={() => setSelectedNft(null)} />
      )}
    </div>
  );
}
