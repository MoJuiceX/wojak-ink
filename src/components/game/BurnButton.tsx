import { useState } from 'react';
import { useSageWallet } from '@/sage-wallet';
import { useGame } from '@/contexts/GameContext';
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
  const { getAuthHeaders } = useGame();
  const [showConfirm, setShowConfirm] = useState(false);
  const [burning, setBurning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBurn = async () => {
    if (!address) return;
    setBurning(true);

    try {
      // Step 1: Send NFT to burn address via WalletConnect
      await transferNFT(nftCoinId, BURN_ADDRESS);

      // Step 2: Record the burn in backend
      const headers = await getAuthHeaders();
      const res = await fetch('/api/game/burn', {
        method: 'POST',
        headers,
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
      setError('Burn failed. Your NFT was not destroyed.');
    } finally {
      setBurning(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-ghost text-sm text-error"
        onClick={() => { setShowConfirm(true); setError(null); }}
      >
        Burn
      </button>

      {error && (
        <span className="text-sm text-error" style={{ display: 'block', marginTop: 4 }}>{error}</span>
      )}
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
