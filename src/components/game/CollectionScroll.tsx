// Collection Scroll — horizontal scrollable row of player's Wojak NFTs.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface CollectionNft {
  nftId: string;
  editionNumber: number;
  name: string;
  netScore: number;
}

interface CollectionScrollProps {
  did: string;
}

export function CollectionScroll({ did }: CollectionScrollProps) {
  const [nfts, setNfts] = useState<CollectionNft[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-col gap-2">
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
      <div className="flex flex-col gap-2">
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
    <div className="flex flex-col gap-2">
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
          <div
            key={nft.nftId}
            className="flex flex-col items-center gap-1"
            style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
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
          </div>
        ))}
      </div>
    </div>
  );
}
