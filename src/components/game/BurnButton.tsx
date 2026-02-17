import { useState } from 'react';
import { useSageWallet } from '@/sage-wallet';
import { BurnConfirmDialog } from './BurnConfirmDialog';

const BURN_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy';

interface BurnButtonProps {
  nftId: string;
  nftCoinId: string;
  editionNumber: number;
  nftName: string;
  likes: number;
  dislikes: number;
  estimatedCredits: number;
  burnerDid?: string;
  onBurned?: (credits: number) => void;
}

export function BurnButton({
  nftId, nftCoinId, editionNumber, nftName,
  likes, dislikes, estimatedCredits, burnerDid, onBurned,
}: BurnButtonProps) {
  const { address, transferNFT } = useSageWallet();
  const [showConfirm, setShowConfirm] = useState(false);
  const [burning, setBurning] = useState(false);

  const handleBurn = async () => {
    if (!address) return;
    setBurning(true);

    try {
      // Step 1: Send NFT to burn address via WalletConnect
      await transferNFT(nftCoinId, BURN_ADDRESS);

      // Step 2: Record the burn in backend
      const res = await fetch('/api/game/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nftId,
          editionNumber,
          burnerDid: burnerDid || '',
          burnerWallet: address,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onBurned?.(data.creditsEarned);
      }
    } catch (err) {
      console.error('Burn failed:', err);
    } finally {
      setBurning(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-ghost text-sm"
        style={{ color: 'var(--color-error)' }}
        onClick={() => setShowConfirm(true)}
      >
        Burn
      </button>

      {showConfirm && (
        <BurnConfirmDialog
          nftName={nftName}
          editionNumber={editionNumber}
          likes={likes}
          dislikes={dislikes}
          estimatedCredits={estimatedCredits}
          onConfirm={handleBurn}
          onCancel={() => setShowConfirm(false)}
          burning={burning}
        />
      )}
    </>
  );
}
