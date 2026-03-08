/**
 * DIDCollectionModal - Premium split-view modal showing a player's NFT collections.
 * Left side: Wojak Farmer's Plot (Farmers)
 * Right side: Your Wojaks (with vote scores)
 * Each side scrolls independently with sort controls.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { bech32m } from 'bech32';
import { getNftImageUrl } from '../../services/marketApi';
import { API_ENDPOINTS } from '@/services/constants';

interface CollectionNFT {
  nftId: string;
  editionNumber: number;
  collection: 'phase1' | 'phase2';
  imageUri: string | null;
  name: string;
  netScore: number;
  totalVotes: number;
  likes: number;
  dislikes: number;
}

interface CollectionResponse {
  success: boolean;
  nfts: CollectionNFT[];
  count: number;
}

interface DIDCollectionModalProps {
  did: string;
  displayName: string;
  onClose: () => void;
}

const PLOT_POWER = 20; // Power per Farmer's Plot

// Convert hex NFT ID to bech32 nft1... format
const hexToNftBech32 = (hexId: string): string => {
  try {
    const cleanHex = hexId.startsWith('0x') ? hexId.slice(2) : hexId;
    const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const words = bech32m.toWords(bytes);
    return bech32m.encode('nft', words);
  } catch {
    return hexId;
  }
};

// NFT image component - uses computed IPFS URL for Farmers, imageUri for Your Wojaks
interface NFTImageProps {
  collection: 'phase1' | 'phase2';
  editionNumber: number;
  imageUri: string | null;
  alt: string;
}

function NFTImage({ collection, editionNumber, imageUri, alt }: NFTImageProps) {
  const [failed, setFailed] = useState(false);

  // For Farmers (phase1): compute URL from edition number using same formula as gallery
  // For Your Wojaks (phase2): use imageUri resolved by the API (already HTTPS)
  const src = collection === 'phase1'
    ? (editionNumber != null ? getNftImageUrl(String(editionNumber)) : null)
    : imageUri;

  if (failed || !src) {
    return <div className="did-nft-placeholder">No image</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

// Skeleton loading placeholder that mirrors the real split layout
function SkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="did-collection-split">
      {(['left', 'right'] as const).map((side) => (
        <div key={side} className="did-collection-column">
          <div className="did-collection-column-header">
            <div className="did-skeleton-line" style={{ width: 80 }} />
            <div className="did-skeleton-line" style={{ width: 60 }} />
          </div>
          <div className="did-collection-grid">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="did-nft-skeleton" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DIDCollectionModal({ did, displayName, onClose }: DIDCollectionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Sort state
  const [farmerSort, setFarmerSort] = useState<'edition' | 'newest'>('edition');
  const [wojakSort, setWojakSort] = useState<'score' | 'votes' | 'edition'>('score');

  // Fetch collection data
  const { data, isLoading, error } = useQuery<CollectionResponse>({
    queryKey: ['did-collection', did],
    queryFn: async () => {
      const res = await fetch(`${API_ENDPOINTS.gameCollection}?did=${encodeURIComponent(did)}`);
      if (!res.ok) throw new Error('Failed to fetch collection');
      return res.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Focus trap + escape
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // Split NFTs by collection
  const farmers = data?.nfts.filter(n => n.collection === 'phase1') || [];
  const yourWojaks = data?.nfts.filter(n => n.collection === 'phase2') || [];

  // Sorted arrays
  const sortedFarmers = [...farmers].sort((a, b) =>
    farmerSort === 'newest' ? b.editionNumber - a.editionNumber : a.editionNumber - b.editionNumber
  );

  const sortedWojaks = [...yourWojaks].sort((a, b) => {
    if (wojakSort === 'score') return b.netScore - a.netScore;
    if (wojakSort === 'votes') return b.totalVotes - a.totalVotes;
    return a.editionNumber - b.editionNumber;
  });

  // Calculate power
  const farmerPower = farmers.length * PLOT_POWER;
  const wojakPower = yourWojaks.reduce((sum, w) => sum + w.netScore, 0);
  const totalPower = farmerPower + wojakPower;

  // MintGarden URL for individual NFT (needs bech32 format)
  const getNftUrl = (nftId: string) => {
    const bech32Id = nftId.startsWith('nft1') ? nftId : hexToNftBech32(nftId);
    return `https://mintgarden.io/nfts/${bech32Id}`;
  };

  // MintGarden profile URL
  const getProfileUrl = () => {
    const nameSlug = (displayName || 'anon').toLowerCase().replace(/[^a-z0-9]/g, '');
    const didId = did.startsWith('0x') ? did.slice(2) : did;
    return `https://mintgarden.io/profile/${nameSlug}-${didId}`;
  };

  return (
    <div
      ref={overlayRef}
      className="did-collection-overlay"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName}'s Collection`}
    >
      <div className="did-collection-modal">
        {/* Header */}
        <div className="did-collection-header">
          <div className="did-collection-title-row">
            <h2 className="did-collection-title">{displayName}'s Collection</h2>
            <button
              ref={closeRef}
              type="button"
              className="did-collection-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="did-collection-power">
            <span className="power-total-label">Total Power</span>
            <span className="power-total-value">{totalPower.toLocaleString()}</span>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonGrid count={9} />
        ) : error ? (
          <div className="did-collection-error">
            <Loader2 size={20} />
            <span>Failed to load collection</span>
          </div>
        ) : (
          <div className="did-collection-split">
            {/* Left: Farmers */}
            <div className="did-collection-column">
              <div className="did-collection-column-header">
                <div className="did-collection-column-header-row">
                  <h3 className="column-title">
                    <span className="column-title-text">Farmers</span>
                    <span className="column-count">{farmers.length}</span>
                  </h3>
                  <span className="column-power text-cyan">+{farmerPower} power</span>
                </div>
                <div className="did-collection-sort-tabs">
                  {([['edition', '#'], ['newest', 'Newest']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`did-collection-sort-tab ${farmerSort === key ? 'active' : ''}`}
                      onClick={() => setFarmerSort(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="did-collection-grid">
                {sortedFarmers.length === 0 ? (
                  <div className="did-collection-empty">
                    <span>No Farmers in this DID</span>
                  </div>
                ) : (
                  sortedFarmers.map((nft, index) => (
                    <a
                      key={nft.nftId}
                      href={getNftUrl(nft.nftId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="did-nft-card did-nft-card-farmer"
                      title={`Farmer ${nft.editionNumber != null ? `#${nft.editionNumber}` : ''} · +${PLOT_POWER} power`}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <div className="did-nft-image">
                        <NFTImage
                          collection="phase1"
                          editionNumber={nft.editionNumber}
                          imageUri={nft.imageUri}
                          alt={`Farmer #${nft.editionNumber}`}
                        />
                      </div>
                      <div className="did-nft-info-compact">
                        <span className="did-nft-edition">{nft.editionNumber != null ? `#${nft.editionNumber}` : 'NFT'}</span>
                        <span className="did-nft-power text-cyan">+{PLOT_POWER}</span>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="did-collection-divider" />

            {/* Right: Your Wojaks */}
            <div className="did-collection-column">
              <div className="did-collection-column-header">
                <div className="did-collection-column-header-row">
                  <h3 className="column-title">
                    <span className="column-title-text">Your Wojaks</span>
                    <span className="column-count">{yourWojaks.length}</span>
                  </h3>
                  <span className={`column-power ${wojakPower >= 0 ? 'text-success' : 'text-error'}`}>
                    {wojakPower >= 0 ? '+' : ''}{wojakPower} power
                  </span>
                </div>
                <div className="did-collection-sort-tabs">
                  {([['score', 'Score'], ['votes', 'Votes'], ['edition', '#']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`did-collection-sort-tab ${wojakSort === key ? 'active' : ''}`}
                      onClick={() => setWojakSort(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="did-collection-grid">
                {sortedWojaks.length === 0 ? (
                  <div className="did-collection-empty">
                    <span>No Your Wojaks in this DID</span>
                  </div>
                ) : (
                  sortedWojaks.map((nft, index) => (
                    <a
                      key={nft.nftId}
                      href={getNftUrl(nft.nftId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`did-nft-card did-nft-card-wojak ${nft.netScore > 0 ? 'score-positive' : nft.netScore < 0 ? 'score-negative' : ''}`}
                      title={`#${nft.editionNumber} · Score: ${nft.netScore > 0 ? '+' : ''}${nft.netScore} · ${nft.totalVotes} votes`}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <div className="did-nft-image">
                        <NFTImage
                          collection="phase2"
                          editionNumber={nft.editionNumber}
                          imageUri={nft.imageUri}
                          alt={`Your Wojak #${nft.editionNumber}`}
                        />
                        {nft.totalVotes > 0 && (
                          <div className={`did-nft-score-badge ${
                            nft.netScore > 0 ? 'positive' : nft.netScore < 0 ? 'negative' : 'neutral'
                          }`}>
                            {nft.netScore > 0 ? '+' : ''}{nft.netScore}
                          </div>
                        )}
                      </div>
                      <div className="did-nft-info-compact">
                        <span className="did-nft-edition">#{nft.editionNumber}</span>
                        <div className="did-nft-power-group">
                          <span className={`did-nft-power ${nft.netScore > 0 ? 'text-success' : nft.netScore < 0 ? 'text-error' : ''}`}>
                            {nft.netScore > 0 ? '+' : ''}{nft.netScore}
                          </span>
                          {nft.totalVotes > 0 && (
                            <span className="did-nft-votes">{nft.totalVotes}v</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="did-collection-footer">
          <a
            href={getProfileUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="did-collection-profile-link"
          >
            <ExternalLink size={14} />
            MintGarden
          </a>
        </div>
      </div>
    </div>
  );
}
