/**
 * NFTPicker Component
 *
 * Displays user's owned Wojak Farmers Plot NFTs for avatar selection.
 */

import { useState, useEffect } from 'react';
import { useSageWallet } from '@/sage-wallet';
import { getNftImageUrl } from '@/services/constants';
import { Loader2 } from 'lucide-react';
import './AvatarPicker.css';

const WOJAK_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const MINTGARDEN_COLLECTION_URL = 'https://mintgarden.io/collections/wojak-farmers-plot-col1kfy44w3nlkqq8z3j8z9mhc3nw9pzwvlsmhsyhc0z6a7luvzukfsufegk5';

export interface NFT {
  id: string;
  name: string;
  imageUrl: string;
  launcherId: string;
}

interface NFTPickerProps {
  selectedNftId?: string;
  onSelect: (nft: NFT) => void;
}

export function NFTPicker({ selectedNftId, onSelect }: NFTPickerProps) {
  const { address: walletAddress, getNFTs, status } = useSageWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNfts() {
      if (!walletAddress || status !== 'connected') {
        setNfts([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const mintGardenNfts = await getNFTs(WOJAK_COLLECTION_ID);

        const mappedNfts: NFT[] = mintGardenNfts.map(nft => {
          const match = nft.name?.match(/#(\d+)/);
          const editionNumber = match ? match[1].padStart(4, '0') : '0000';

          return {
            id: editionNumber,
            name: nft.name || `Wojak #${editionNumber}`,
            imageUrl: getNftImageUrl(editionNumber),
            launcherId: nft.encoded_id,
          };
        });

        mappedNfts.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        setNfts(mappedNfts);
      } catch (err) {
        console.error('[NFTPicker] Failed to fetch NFTs:', err);
        setError('Failed to load NFTs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchNfts();
  }, [walletAddress, status, getNFTs]);

  if (status !== 'connected' || !walletAddress) {
    return (
      <div className="nft-picker-locked">
        <span className="lock-icon">🔒</span>
        <p>Connect your Sage Wallet to use NFT avatars</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="nft-picker-loading" role="status" aria-label="Loading NFTs">
        <Loader2 className="spin" size={32} aria-hidden="true" />
        <p>Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nft-picker-error">
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="nft-picker-empty">
        <span className="empty-icon">🖼️</span>
        <p>No Wojak Farmers Plot NFTs found</p>
        <a
          href={MINTGARDEN_COLLECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mint-link"
        >
          Get one on MintGarden
        </a>
      </div>
    );
  }

  return (
    <div className="nft-picker">
      <p className="nft-picker-hint">
        Select an NFT as your avatar ({nfts.length} owned)
      </p>
      <div className="nft-grid">
        {nfts.map((nft) => (
          <button
            key={nft.id}
            type="button"
            className={`nft-option ${selectedNftId === nft.id ? 'selected' : ''}`}
            onClick={() => {
              onSelect(nft);
            }}
          >
            <img
              src={nft.imageUrl}
              alt={nft.name}
              loading="lazy"
            />
            <span className="nft-id">#{nft.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default NFTPicker;
